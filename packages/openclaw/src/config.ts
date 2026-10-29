// Plugin config (`plugins.entries.provenance-guard.config`, plan §4.7). Hand-validated to keep
// runtime dependencies at zero beyond core; unknown keys and bad values are reported, not fatal.

export type GuardMode = "shadow" | "enforce" | "off";

export interface GuardConfig {
  mode: GuardMode;
  preset: "balanced" | "strict";
  /** Budget for one before_tool_call decision (§5.12). */
  deadlineMs: number;
  approvalTimeoutSec: number;
  trusted: { recipients: string[]; domains: string[]; commandPrefixes: string[] };
  untrustedPaths: string[];
  /** "email", "memory", or "files:<glob>". */
  privateSources: string[];
  /** Extra protected paths on top of the defaults. */
  protectedPaths: string[];
  failMode: { other: "ask" | "allow" | "block" };
  /**
   * How the owner confirms an ask (channel results §c). "approval" uses OpenClaw's plugin
   * approvals; "command" blocks with a code the owner confirms with `/guard allow <code>`, which
   * only the owner can run. "auto" picks "approval" only when the host config makes plugin
   * approvals owner-only and visible (see `/guard doctor`).
   */
  confirm: "auto" | "approval" | "command";
  /**
   * Codex's hosted web_search runs on OpenAI's side and its results reach the model without any
   * OpenClaw hook (phase0/codex-results.md). "assume_on" treats every run on the Codex runtime as
   * having read untrusted web content; "off" is for owners who turned that search off in Codex.
   */
  codexWebSearch: "assume_on" | "off";
  /** Overrides for where the Guard keeps its store, audit log, and HMAC key. */
  stateDir?: string;
  auditPath?: string;
}

export const DEFAULT_CONFIG: GuardConfig = {
  mode: "shadow",
  preset: "balanced",
  deadlineMs: 200,
  approvalTimeoutSec: 600,
  trusted: { recipients: [], domains: [], commandPrefixes: [] },
  untrustedPaths: [],
  privateSources: ["email", "memory"],
  protectedPaths: [],
  failMode: { other: "ask" },
  confirm: "auto",
  codexWebSearch: "assume_on",
};

const KNOWN = new Set([
  "mode", "preset", "deadlineMs", "approvalTimeoutSec", "trusted", "untrustedPaths", "privateSources",
  "protectedPaths", "failMode", "confirm", "codexWebSearch", "stateDir", "auditPath", "secretScan", "extractor",
]);

function strings(v: unknown, where: string, errors: string[]): string[] {
  if (v === undefined) return [];
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v;
  errors.push(`${where}: expected an array of strings`);
  return [];
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T, where: string, errors: string[]): T {
  if (v === undefined) return fallback;
  if (typeof v === "string" && (allowed as readonly string[]).includes(v)) return v as T;
  errors.push(`${where}: expected one of ${allowed.join(", ")}`);
  return fallback;
}

function positiveInt(v: unknown, fallback: number, max: number, where: string, errors: string[]): number {
  if (v === undefined) return fallback;
  if (typeof v === "number" && Number.isInteger(v) && v > 0 && v <= max) return v;
  errors.push(`${where}: expected an integer between 1 and ${max}`);
  return fallback;
}

export function parseConfig(raw: unknown): { config: GuardConfig; errors: string[] } {
  const errors: string[] = [];
  const r = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  if (raw !== undefined && r !== raw) errors.push("config: expected an object");
  for (const k of Object.keys(r)) if (!KNOWN.has(k)) errors.push(`config.${k}: unknown key`);

  const trusted = (r.trusted ?? {}) as Record<string, unknown>;
  const failMode = (r.failMode ?? {}) as Record<string, unknown>;
  const config: GuardConfig = {
    mode: oneOf(r.mode, ["shadow", "enforce", "off"] as const, DEFAULT_CONFIG.mode, "mode", errors),
    preset: oneOf(r.preset, ["balanced", "strict"] as const, DEFAULT_CONFIG.preset, "preset", errors),
    deadlineMs: positiveInt(r.deadlineMs, DEFAULT_CONFIG.deadlineMs, 10_000, "deadlineMs", errors),
    approvalTimeoutSec: positiveInt(r.approvalTimeoutSec, DEFAULT_CONFIG.approvalTimeoutSec, 600, "approvalTimeoutSec", errors),
    trusted: {
      recipients: strings(trusted.recipients, "trusted.recipients", errors),
      domains: strings(trusted.domains, "trusted.domains", errors),
      commandPrefixes: strings(trusted.commandPrefixes, "trusted.commandPrefixes", errors),
    },
    untrustedPaths: strings(r.untrustedPaths, "untrustedPaths", errors),
    privateSources: r.privateSources === undefined ? DEFAULT_CONFIG.privateSources : strings(r.privateSources, "privateSources", errors),
    protectedPaths: strings(r.protectedPaths, "protectedPaths", errors),
    failMode: { other: oneOf(failMode.other, ["ask", "allow", "block"] as const, DEFAULT_CONFIG.failMode.other, "failMode.other", errors) },
    confirm: oneOf(r.confirm, ["auto", "approval", "command"] as const, DEFAULT_CONFIG.confirm, "confirm", errors),
    codexWebSearch: oneOf(r.codexWebSearch, ["assume_on", "off"] as const, DEFAULT_CONFIG.codexWebSearch, "codexWebSearch", errors),
  };
  if (typeof r.stateDir === "string") config.stateDir = r.stateDir;
  if (typeof r.auditPath === "string") config.auditPath = r.auditPath;
  return { config, errors };
}
