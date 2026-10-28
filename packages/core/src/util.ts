import { createHmac } from "node:crypto";

/** Shannon entropy in bits per character. */
export function shannonEntropy(s: string): number {
  const chars = [...s];
  if (chars.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const ch of chars) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let h = 0;
  for (const c of counts.values()) {
    const p = c / chars.length;
    h -= p * Math.log2(p);
  }
  return h;
}

/** Keyed hash, so low-entropy values (phone numbers, short secrets) can't be brute-forced from logs. */
export function hmac(key: string | Uint8Array, value: string): string {
  return createHmac("sha256", key).update(value).digest("hex").slice(0, 32);
}

/** Every string inside a JSON-like value. Numbers are included as strings. */
export function collectStrings(value: unknown, out: string[] = [], depth = 0): string[] {
  if (depth > 8) return out;
  if (typeof value === "string") out.push(value);
  else if (typeof value === "number" || typeof value === "bigint") out.push(String(value));
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, out, depth + 1);
  else if (value !== null && typeof value === "object") {
    for (const v of Object.values(value)) collectStrings(v, out, depth + 1);
  }
  return out;
}

function splitSegment(seg: string): { key: string; each: boolean } {
  return seg.endsWith("[]") ? { key: seg.slice(0, -2), each: true } : { key: seg, each: false };
}

/** Values at a spec path (`"request.url"`, `"edits[].newText"`). Missing steps yield nothing. */
export function valuesAtPath(obj: unknown, path: string): unknown[] {
  let cur: unknown[] = [obj];
  for (const seg of path.split(".")) {
    const { key, each } = splitSegment(seg);
    const next: unknown[] = [];
    for (const c of cur) {
      if (c === null || typeof c !== "object" || Array.isArray(c)) continue;
      const v = (c as Record<string, unknown>)[key];
      if (v === undefined) continue;
      if (!each) next.push(v);
      else if (Array.isArray(v)) next.push(...v);
    }
    cur = next;
  }
  return cur;
}

/**
 * Copy of `obj` with every string leaf at or under `path` replaced by `fn` (a path that ends at an
 * object covers everything inside it). Only the touched branch is copied.
 */
export function mapStringsAtPath(
  obj: Record<string, unknown>,
  path: string,
  fn: (s: string) => string,
): Record<string, unknown> {
  const deep = (node: unknown, depth: number): unknown => {
    if (typeof node === "string") return fn(node);
    if (depth > 8 || node === null || typeof node !== "object") return node;
    if (Array.isArray(node)) return node.map((x) => deep(x, depth + 1));
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, deep(v, depth + 1)]));
  };
  const mapAt = (node: unknown, segs: string[]): unknown => {
    if (segs.length === 0) return deep(node, 0);
    if (node === null || typeof node !== "object" || Array.isArray(node)) return node;
    const { key, each } = splitSegment(segs[0]!);
    const rec = node as Record<string, unknown>;
    if (!(key in rec)) return node;
    const v = rec[key];
    const rest = segs.slice(1);
    const nv = each ? (Array.isArray(v) ? v.map((x) => mapAt(x, rest)) : v) : mapAt(v, rest);
    return nv === v ? node : { ...rec, [key]: nv };
  };
  return mapAt(obj, path.split(".")) as Record<string, unknown>;
}

// Control, zero-width, line/paragraph separator, and bidi override characters.
const INVISIBLE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u2069\uFEFF]/g;

/** Safe one-line preview of untrusted text for approval prompts and logs. */
export function sanitizePreview(s: string, max = 120): string {
  const clean = s.replace(INVISIBLE, " ").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * Glob to anchored RegExp. `*` and `?` stay within a path segment; `**` crosses segments;
 * a trailing `/**` also matches the directory itself.
 */
export function globToRegExp(glob: string): RegExp {
  let re = "";
  let i = 0;
  while (i < glob.length) {
    if (glob.startsWith("/**", i) && i + 3 === glob.length) {
      re += "(?:/.*)?";
      i += 3;
    } else if (glob.startsWith("**/", i)) {
      re += "(?:.*/)?";
      i += 3;
    } else if (glob.startsWith("**", i)) {
      re += ".*";
      i += 2;
    } else {
      const ch = glob[i]!;
      if (ch === "*") re += "[^/]*";
      else if (ch === "?") re += "[^/]";
      else re += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      i++;
    }
  }
  return new RegExp(`^${re}$`);
}

export function expandHome(p: string, home: string): string {
  if (p === "~") return home;
  if (p.startsWith("~/")) return home + p.slice(1);
  if (p.startsWith("$HOME/")) return home + p.slice(5);
  return p;
}

/** Matches absolute paths against globs (with `~` expanded). */
export class PathMatcher {
  private readonly res: RegExp[];
  constructor(patterns: readonly string[], home: string) {
    this.res = patterns.map((p) => globToRegExp(expandHome(p, home)));
  }
  matches(absPath: string): boolean {
    return this.res.some((r) => r.test(absPath));
  }
}
