/**
 * Preset knobs, one per row of the §5.7 table that differs between presets. Rows that are the
 * same everywhere (read-only allow, clean owner sessions allow, writes allow + label, installs
 * from tainted sessions block, sessions_* allow + propagate) are hard-coded in decide().
 * Relaxed ships in v0.2.
 */
export interface Preset {
  name: "balanced" | "strict";
  /** Unattested destination, tainted session. */
  unattestedDestinationTainted: "ask" | "block";
  /** Attested non-owner destination, tainted and private: "scan" runs the secret scan, "ask" always asks. */
  attestedNonOwnerTaintedPrivate: "scan" | "ask";
  /** What a secret-scan hit does. */
  secretMatch: "ask" | "redact";
  /** Constructed URL, tainted and private. */
  constructedUrlTaintedPrivate: "ask" | "block";
  /** Constructed URL, tainted only. */
  constructedUrlTaintedOnly: "allow" | "ask_if_suspicious" | "ask";
  /** Constructed-looking URL on an allowlisted shared-hosting domain, tainted and private. */
  sharedHostingTaintedPrivate: "allow" | "ask_if_suspicious" | "ask";
  /** Link-following URL. */
  linkFollowing: "allow" | "allow_rate_limited_if_private" | "ask_if_private";
  /** Exec with an unattested command, tainted session. */
  execUnattestedTainted: "ask" | "block";
  /** Sensitive exec in an autonomous run. */
  sensitiveExecAutonomous: "ask" | "block";
  /** Cron creation (including scheduling through exec), tainted session. */
  cronTainted: "ask" | "block";
  /** Config, policy, or protected-path writes: "standard" asks if clean and blocks if tainted. */
  protectedWrite: "standard" | "strict";
  /**
   * Reading local data (files, memory, mail, other sessions) in a run a non-owner started. The
   * run's reply goes to them, and no tool call carries a reply, so the read itself is the check.
   */
  localReadForNonOwner: "allow" | "block";
}

export const BALANCED: Preset = {
  name: "balanced",
  unattestedDestinationTainted: "ask",
  attestedNonOwnerTaintedPrivate: "scan",
  secretMatch: "ask",
  constructedUrlTaintedPrivate: "ask",
  constructedUrlTaintedOnly: "ask_if_suspicious",
  sharedHostingTaintedPrivate: "ask_if_suspicious",
  linkFollowing: "allow_rate_limited_if_private",
  execUnattestedTainted: "ask",
  sensitiveExecAutonomous: "ask",
  cronTainted: "ask",
  protectedWrite: "standard",
  localReadForNonOwner: "block",
};

export const STRICT: Preset = {
  name: "strict",
  unattestedDestinationTainted: "block",
  attestedNonOwnerTaintedPrivate: "ask",
  secretMatch: "ask",
  constructedUrlTaintedPrivate: "block",
  constructedUrlTaintedOnly: "ask",
  sharedHostingTaintedPrivate: "ask",
  linkFollowing: "ask_if_private",
  execUnattestedTainted: "block",
  sensitiveExecAutonomous: "block",
  cronTainted: "block",
  protectedWrite: "strict",
  localReadForNonOwner: "block",
};

export const PRESETS = { balanced: BALANCED, strict: STRICT } as const;
