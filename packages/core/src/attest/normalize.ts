import { realpathSync } from "node:fs";
import path from "node:path";
import { domainToASCII, fileURLToPath } from "node:url";
import { parse as parseDomain } from "tldts";

export interface EmailOptions {
  stripPlusTag?: boolean;
}

/** Lowercased, trimmed, IDN domain in punycode. Returns null if it isn't an email address. */
export function normalizeEmail(raw: string, opts: EmailOptions = {}): string | null {
  let s = raw.trim();
  if (/^mailto:/i.test(s)) s = s.slice(7);
  const at = s.lastIndexOf("@");
  if (at <= 0 || at === s.length - 1) return null;
  let local = s.slice(0, at).toLowerCase();
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return null;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return null;
  if (opts.stripPlusTag) local = local.split("+")[0] ?? "";
  if (local === "") return null;
  const domain = domainToASCII(s.slice(at + 1).replace(/\.$/, "").toLowerCase());
  if (!domain || !domain.includes(".") || !/^[a-z0-9.-]+$/.test(domain)) return null;
  return `${local}@${domain}`;
}

export interface PhoneOptions {
  /** Calling code (e.g. "1") for numbers written without a leading + or 00. */
  defaultCallingCode?: string;
}

/** E.164 (`+` and 7–15 digits). Returns null for anything else. */
export function normalizePhone(raw: string, opts: PhoneOptions = {}): string | null {
  const s = raw.trim().replace(/^tel:/i, "");
  if (!/^\+?[0-9][0-9\s().-]*$/.test(s)) return null;
  let digits = s.replace(/[^0-9+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (!digits.startsWith("+")) {
    if (!opts.defaultCallingCode) return null;
    digits = `+${opts.defaultCallingCode}${digits.replace(/^0+/, "")}`;
  }
  const n = digits.slice(1);
  if (!/^[1-9][0-9]{6,14}$/.test(n)) return null;
  return `+${n}`;
}

/** `@name`, lowercased. */
export function normalizeHandle(raw: string): string | null {
  const m = /^@?([A-Za-z0-9_](?:[A-Za-z0-9_.]{0,62}[A-Za-z0-9_])?)$/.exec(raw.trim());
  return m ? `@${m[1]!.toLowerCase()}` : null;
}

/** Quoted strings and code spans: trimmed, whitespace collapsed, lowercased. */
export function normalizeLoose(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, " ").toLowerCase();
  return s === "" ? null : s;
}

/**
 * WHATWG parse (lowercases scheme and host, punycodes IDNs, drops default ports, resolves dot
 * segments), plus: strip a trailing dot from the host and decode percent-encoded unreserved
 * characters. Only http(s). Fragments are kept, since page scripts can read them.
 */
export function normalizeUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!u.hostname) return null;
  if (u.hostname.endsWith(".")) u.hostname = u.hostname.slice(0, -1);
  const p = decodeUnreserved(u.pathname);
  if (p !== u.pathname) u.pathname = p;
  const q = decodeUnreserved(u.search);
  if (q !== u.search) u.search = q;
  return u.href;
}

function decodeUnreserved(s: string): string {
  return s.replace(/%([0-9a-fA-F]{2})/g, (_m, hex: string) => {
    const ch = String.fromCharCode(parseInt(hex, 16));
    return /[A-Za-z0-9\-._~]/.test(ch) ? ch : `%${hex.toUpperCase()}`;
  });
}

/** Registrable domain (eTLD+1, private PSL entries included), the IP itself, or the bare host. */
export function registrableDomain(host: string): string {
  const r = parseDomain(host, { allowPrivateDomains: true });
  if (r.isIp && r.hostname) return r.hostname;
  return r.domain ?? r.hostname ?? host;
}

/** True if `host` is `domain` or a subdomain of it. */
export function hostMatches(host: string, domain: string): boolean {
  const d = domain.trim().toLowerCase().replace(/^\*\./, "").replace(/\.$/, "");
  const h = host.toLowerCase();
  return d !== "" && (h === d || h.endsWith(`.${d}`));
}

export interface PathContext {
  home: string;
  cwd: string;
  /** Resolve symlinks (default true). Tests turn this off. */
  resolveLinks?: boolean;
}

/** Expand `~`, resolve against cwd, and resolve symlinks of the deepest existing ancestor. */
export function normalizePath(raw: string, ctx: PathContext): string {
  let p = raw.trim();
  if (p.startsWith("file://")) {
    try {
      p = fileURLToPath(p);
    } catch {
      // leave as is
    }
  }
  if (p === "~") p = ctx.home;
  else if (p.startsWith("~/")) p = path.join(ctx.home, p.slice(2));
  else if (p.startsWith("$HOME/")) p = path.join(ctx.home, p.slice(6));
  p = path.resolve(ctx.cwd, p);
  return ctx.resolveLinks === false ? p : realpathBestEffort(p);
}

export function realpathBestEffort(abs: string): string {
  const tail: string[] = [];
  let cur = abs;
  for (;;) {
    try {
      const real = realpathSync.native(cur);
      return tail.length > 0 ? path.join(real, ...tail.reverse()) : real;
    } catch {
      const parent = path.dirname(cur);
      if (parent === cur) return abs;
      tail.push(path.basename(cur));
      cur = parent;
    }
  }
}
