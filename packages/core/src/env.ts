import { AttestedValues } from "./session.js";
import { BALANCED, type Preset } from "./policy/presets.js";
import { MemoryStore, type ProvenanceStore } from "./store/memory.js";
import type { ToolSpec } from "./types.js";
import { PathMatcher } from "./util.js";

/**
 * Everything the engine needs from the host and config. The OpenClaw adapter builds one per
 * gateway; tests build one with `createEnv`.
 */
export interface GuardEnv {
  preset: Preset;
  now: () => number;
  home: string;
  cwd: string;
  /** Local secret for HMACs (audit log, private tokens). */
  hmacKey: string;
  registry: (tool: string) => ToolSpec | undefined;
  /** Normalized owner identities (emails, E.164 phones, @handles, channel ids). Always valid destinations. */
  ownerIdentities: ReadonlySet<string>;
  /** Values attested outside any session: config allowlists and learned rules. */
  staticAttested: AttestedValues;
  /** `trusted.domains`: the only way to trust every URL on a host (§5.6). */
  trustedDomains: readonly string[];
  /** Normalized URL prefixes from `allow-always` rules. */
  urlPrefixRules: readonly string[];
  /** argv prefixes from `trusted.commandPrefixes` and rules. */
  commandPrefixRules: readonly (readonly string[])[];
  protectedPaths: PathMatcher;
  untrustedPaths: PathMatcher;
  privatePaths: PathMatcher;
  /** Memory files; memory tool results inherit their labels until entry-level labels land (Phase 3). */
  memoryPaths: PathMatcher;
  privateSources: ReadonlySet<"email" | "memory">;
  linkFollowLimit: { max: number; windowMs: number };
  /**
   * Hosts where a browser session acts as the owner (messaging and webmail web clients). Navigating
   * there is a hard sink: ask if clean, block if tainted (§5.9).
   */
  sensitiveHosts: readonly string[];
  store: ProvenanceStore;
  resolveLinks?: boolean;
  /** File modification time in epoch ms, for exec windows (§5.4). */
  mtime?: (absPath: string) => number | undefined;
  defaultCallingCode?: string;
  stripPlusTag?: boolean;
}

/**
 * Provisional protected paths (§5.12). The OpenClaw-specific entries get confirmed against the
 * docs in Phase 0; the agent's own workspace must stay writable.
 */
export const DEFAULT_PROTECTED_PATHS: readonly string[] = [
  "~/.openclaw/openclaw.json",
  "~/.openclaw/*.json",
  "~/.openclaw/extensions/**",
  "~/.openclaw/plugins/**",
  "~/.openclaw/skills/**",
  "~/.openclaw/hooks/**",
  "~/.openclaw/credentials/**",
  "~/.openclaw/provenance-guard/**",
  "~/.ssh/**",
  "~/.gitconfig",
  "~/.npmrc",
  "~/.bashrc",
  "~/.bash_profile",
  "~/.bash_login",
  "~/.profile",
  "~/.zshrc",
  "~/.zshenv",
  "~/.zprofile",
  "~/.zlogin",
  "~/.config/fish/**",
  "~/.config/systemd/**",
  "~/Library/LaunchAgents/**",
  "/Library/LaunchAgents/**",
  "/Library/LaunchDaemons/**",
  "/etc/systemd/**",
  "/etc/cron*",
  "/etc/cron*/**",
  "/etc/sudoers",
  "/etc/sudoers.d/**",
  "/var/spool/cron/**",
];

export const DEFAULT_UNTRUSTED_PATHS: readonly string[] = ["~/Downloads/**", "/tmp/**", "/private/tmp/**"];

export const DEFAULT_SENSITIVE_HOSTS: readonly string[] = [
  "web.whatsapp.com",
  "web.telegram.org",
  "messages.google.com",
  "app.slack.com",
  "teams.microsoft.com",
  "mail.google.com",
  "outlook.live.com",
  "outlook.office.com",
];

export interface EnvOptions extends Partial<Omit<GuardEnv, "protectedPaths" | "untrustedPaths" | "privatePaths" | "memoryPaths">> {
  home: string;
  hmacKey: string;
  protectedPaths?: readonly string[];
  untrustedPaths?: readonly string[];
  privatePaths?: readonly string[];
  memoryPaths?: readonly string[];
}

export function createEnv(opts: EnvOptions): GuardEnv {
  const { home } = opts;
  return {
    preset: opts.preset ?? BALANCED,
    now: opts.now ?? Date.now,
    home,
    cwd: opts.cwd ?? home,
    hmacKey: opts.hmacKey,
    registry: opts.registry ?? (() => undefined),
    ownerIdentities: opts.ownerIdentities ?? new Set(),
    staticAttested: opts.staticAttested ?? new AttestedValues(),
    trustedDomains: opts.trustedDomains ?? [],
    urlPrefixRules: opts.urlPrefixRules ?? [],
    commandPrefixRules: opts.commandPrefixRules ?? [],
    protectedPaths: new PathMatcher(opts.protectedPaths ?? DEFAULT_PROTECTED_PATHS, home),
    untrustedPaths: new PathMatcher(opts.untrustedPaths ?? DEFAULT_UNTRUSTED_PATHS, home),
    privatePaths: new PathMatcher(opts.privatePaths ?? [], home),
    memoryPaths: new PathMatcher(opts.memoryPaths ?? [], home),
    privateSources: opts.privateSources ?? new Set(["email", "memory"]),
    linkFollowLimit: opts.linkFollowLimit ?? { max: 5, windowMs: 10 * 60 * 1000 },
    sensitiveHosts: opts.sensitiveHosts ?? DEFAULT_SENSITIVE_HOSTS,
    store: opts.store ?? new MemoryStore(),
    ...(opts.resolveLinks !== undefined && { resolveLinks: opts.resolveLinks }),
    ...(opts.mtime && { mtime: opts.mtime }),
    ...(opts.defaultCallingCode && { defaultCallingCode: opts.defaultCallingCode }),
    ...(opts.stripPlusTag !== undefined && { stripPlusTag: opts.stripPlusTag }),
  };
}

export function pathContext(env: GuardEnv, cwd = env.cwd) {
  return { home: env.home, cwd, ...(env.resolveLinks !== undefined && { resolveLinks: env.resolveLinks }) };
}
