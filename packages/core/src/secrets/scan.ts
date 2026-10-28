import type { SessionState } from "../session.js";
import { hmac, shannonEntropy } from "../util.js";

/** Known credential formats. Matches are redacted and count as secret-scan hits (§5.10). */
export const SECRET_FORMATS: readonly { name: string; re: RegExp }[] = [
  { name: "private key", re: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/g },
  { name: "AWS access key", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { name: "GitHub token", re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/g },
  { name: "Anthropic API key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  { name: "OpenAI API key", re: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}/g },
  { name: "Slack token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { name: "Stripe key", re: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}/g },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: "JWT", re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
];

export function findSecretFormats(text: string): string[] {
  return SECRET_FORMATS.filter(({ re }) => new RegExp(re.source).test(text)).map((f) => f.name);
}

/**
 * Candidate tokens: split twice, once keeping `/ . + _ -` (base64, paths) and once on anything
 * non-alphanumeric except `_ -`, so a token embedded in a URL or `KEY=value` is still found.
 */
export function candidateTokens(text: string): string[] {
  const out = new Set<string>();
  for (const t of text.split(/[^A-Za-z0-9_\-+/.]+/)) out.add(t);
  for (const t of text.split(/[^A-Za-z0-9_-]+/)) out.add(t);
  return [...out].filter(isHighEntropyToken);
}

/** ≥ 16 chars, letters and digits, ≥ 3 bits per char: API keys, passwords, canaries, ids. */
export function isHighEntropyToken(t: string): boolean {
  return t.length >= 16 && t.length <= 512 && /[A-Za-z]/.test(t) && /\d/.test(t) && shannonEntropy(t) >= 3;
}

export function rememberPrivateTokens(session: SessionState, text: string, key: string): number {
  const before = session.privateTokens.size;
  for (const t of candidateTokens(text)) session.privateTokens.add(hmac(key, t));
  return session.privateTokens.size - before;
}

export function containsPrivateToken(text: string, session: SessionState, key: string): boolean {
  if (session.privateTokens.size === 0) return false;
  return candidateTokens(text).some((t) => session.privateTokens.has(hmac(key, t)));
}

export interface ScanResult {
  matched: boolean;
  /** Human-readable, e.g. "looks like it contains a GitHub token". */
  reasons: string[];
}

/**
 * Secret scan for content leaving to a non-owner destination. Pending or unscannable private
 * reads count as matches: until the content has been checked, assume the worst (§5.2).
 */
export function scanSecrets(text: string, session: SessionState, key: string): ScanResult {
  const reasons = findSecretFormats(text).map((n) => `looks like it contains a ${n}`);
  if (containsPrivateToken(text, session, key)) reasons.push("contains a value read from a private source");
  if (session.unscannedPrivate) reasons.push("may contain private data from a read the guard couldn't inspect");
  if (session.pendingCount > 0) reasons.push("may contain data from a read the guard hasn't checked yet");
  return { matched: reasons.length > 0, reasons };
}

export function redactSecrets(text: string, session: SessionState, key: string): string {
  let out = text;
  for (const { re } of SECRET_FORMATS) out = out.replace(new RegExp(re.source, "g"), "[REDACTED]");
  if (session.privateTokens.size > 0) {
    for (const t of candidateTokens(out)) {
      if (session.privateTokens.has(hmac(key, t))) out = out.split(t).join("[REDACTED]");
    }
  }
  return out;
}
