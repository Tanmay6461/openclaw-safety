import { lookupAttested } from "../attest/lookup.js";
import { hostMatches, normalizeUrl, registrableDomain } from "../attest/normalize.js";
import type { GuardEnv } from "../env.js";
import { containsPrivateToken } from "../secrets/scan.js";
import type { AttestOrigin, SessionState } from "../session.js";
import { shannonEntropy } from "../util.js";
import { isSharedHosting } from "./shared-hosting.js";

export type EgressClass = "attested" | "link_following" | "constructed";

export interface EgressResult {
  cls: EgressClass;
  /** Normalized URL, or null if it didn't parse as http(s). */
  url: string | null;
  host: string | null;
  /** Registrable domain, for link-following rate limits. */
  domain: string | null;
  via?: AttestOrigin | "domain_allowlist" | "url_rule";
  sharedHosting: boolean;
  /** Query string, high-entropy path segment, or high-entropy subdomain label. */
  suspicious: boolean;
  carriesPrivateToken: boolean;
}

/**
 * Egress URL classes (§5.6). A URL carrying a private token is never link-following, wherever
 * it was seen: that's the general fix for laundering a constructed URL through content.
 */
export function classifyEgressUrl(raw: string, session: SessionState, env: GuardEnv): EgressResult {
  const url = normalizeUrl(raw);
  if (url === null) {
    return {
      cls: "constructed", url: null, host: null, domain: null,
      sharedHosting: false, suspicious: true, carriesPrivateToken: containsPrivateToken(raw, session, env.hmacKey),
    };
  }
  const u = new URL(url);
  const host = u.hostname;
  const base = {
    url,
    host,
    domain: registrableDomain(host),
    sharedHosting: isSharedHosting(host),
    suspicious: isSuspicious(u),
    carriesPrivateToken: containsPrivateToken(safeDecode(url), session, env.hmacKey),
  };

  const exact = lookupAttested("url", url, session, env);
  if (exact) return { ...base, cls: "attested", via: exact.origin };
  if (env.urlPrefixRules.some((p) => urlHasPrefix(url, p))) return { ...base, cls: "attested", via: "url_rule" };
  if (env.trustedDomains.some((d) => hostMatches(host, d))) return { ...base, cls: "attested", via: "domain_allowlist" };
  if (session.seenUrls.has(url) && !base.carriesPrivateToken) return { ...base, cls: "link_following" };
  return { ...base, cls: "constructed" };
}

/** Prefix match that only breaks at a path boundary. */
export function urlHasPrefix(url: string, prefix: string): boolean {
  if (!url.startsWith(prefix)) return false;
  if (url.length === prefix.length || prefix.endsWith("/")) return true;
  return "/?#".includes(url[prefix.length]!);
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function isSuspicious(u: URL): boolean {
  if (u.search.length > 1) return true;
  const segments = u.pathname.split("/").map(safeDecode);
  if (segments.some(isHighEntropySegment)) return true;
  return u.hostname.split(".").some(isHighEntropySegment);
}

/**
 * High entropy after ruling out ordinary slugs ("best-cookies-2024"). Long hex runs count;
 * otherwise it needs two of lowercase/uppercase/digits and ≥ 3.5 bits per character.
 */
export function isHighEntropySegment(seg: string): boolean {
  if (seg.length < 16) return false;
  const parts = seg.split(/[-_.~]+/).filter((p) => p !== "");
  if (parts.every((p) => /^[a-z]{1,15}$/.test(p) || /^\d{1,4}$/.test(p))) return false;
  if (/^[0-9a-f]{20,}$/i.test(seg)) return true;
  const classes = [/[a-z]/, /[A-Z]/, /\d/].filter((r) => r.test(seg)).length;
  return classes >= 2 && shannonEntropy(seg) >= 3.5;
}
