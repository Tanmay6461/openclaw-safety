import { extractUrls } from "../attest/harvest.js";
import { normalizeUrl } from "../attest/normalize.js";
import type { GuardEnv } from "../env.js";
import { containsPrivateToken } from "../secrets/scan.js";
import type { SessionState } from "../session.js";
import type { SourceKind, SourceRef } from "../types.js";
import { collectStrings } from "../util.js";

/**
 * Sources whose URLs can count as link-following (§5.6): inbound messages and results from web,
 * search, email, and browser tools. Exec output, files, memory, skill output, and inter-session
 * messages are excluded because the agent can write or influence them.
 */
export const LINK_ELIGIBLE: ReadonlySet<SourceKind> = new Set([
  "owner_forwarded",
  "external_sender",
  "web",
  "email",
  "hook",
]);

/**
 * Tokens from a request's arguments that, if they reappear in a returned URL, mean the URL may
 * just echo what the agent sent. Ordinary lowercase words under 16 chars are ignored so search
 * results that repeat query words still count.
 */
export function echoTokens(requestParams: unknown): string[] {
  const out = new Set<string>();
  for (const s of collectStrings(requestParams)) {
    for (const t of s.split(/[^A-Za-z0-9]+/)) {
      if (t.length < 8) continue;
      if (/\d/.test(t) || /[A-Z]/.test(t.slice(1)) || t.length >= 16) out.add(t.toLowerCase());
    }
  }
  return [...out];
}

function echoes(url: string, tokens: readonly string[]): boolean {
  if (tokens.length === 0) return false;
  let tail: string;
  try {
    const u = new URL(url);
    tail = decodeURIComponent(`${u.hostname}${u.pathname}${u.search}`).toLowerCase();
  } catch {
    tail = url.toLowerCase();
  }
  return tokens.some((t) => tail.includes(t));
}

/** Records eligible URLs seen verbatim in content. Returns how many new URLs were recorded. */
export function recordSeenUrls(
  session: SessionState,
  content: string,
  source: SourceRef,
  requestParams: unknown,
  env: GuardEnv,
): number {
  if (!LINK_ELIGIBLE.has(source.kind)) return 0;
  const tokens = echoTokens(requestParams);
  let n = 0;
  for (const raw of extractUrls(content)) {
    const url = normalizeUrl(raw);
    if (url === null || session.seenUrls.has(url)) continue;
    if (echoes(url, tokens)) continue;
    if (containsPrivateToken(url, session, env.hmacKey)) continue;
    session.seenUrls.set(url, source);
    n++;
  }
  return n;
}
