import type { Labels, PrivateCategory, SourceRef, Trigger } from "./types.js";

export type AttestKind = "email" | "phone" | "handle" | "url" | "path" | "command" | "string";
export type AttestOrigin = "owner" | "allowlist" | "rule" | "identity";

export interface Attestation {
  origin: AttestOrigin;
  /** Message id, config key, or rule id the value came from. */
  ref: string;
  at: number;
}

/** Normalized trusted values, keyed by kind. The first attestation of a value wins. */
export class AttestedValues {
  private readonly map = new Map<string, Attestation>();

  private static key(kind: AttestKind, value: string): string {
    return `${kind}\u0000${value}`;
  }

  add(kind: AttestKind, value: string, att: Attestation): void {
    const k = AttestedValues.key(kind, value);
    if (!this.map.has(k)) this.map.set(k, att);
  }

  get(kind: AttestKind, value: string): Attestation | undefined {
    return this.map.get(AttestedValues.key(kind, value));
  }

  get size(): number {
    return this.map.size;
  }

  toJSON(): [string, Attestation][] {
    return [...this.map];
  }

  load(entries: [string, Attestation][]): void {
    for (const [k, v] of entries) if (!this.map.has(k)) this.map.set(k, v);
  }
}

/** A tool call whose result content hasn't been labeled yet (plan §5.2, label timing). */
export interface PendingInfo {
  /** The result comes from a private source, so its tokens feed the secret scan. */
  privateSource: boolean;
}

export interface SessionInit {
  sessionKey: string;
  trigger: Trigger;
  agentId?: string;
  parentSessionKey?: string;
}

export interface SessionSnapshot extends SessionInit {
  untrusted: SourceRef[];
  privateData: PrivateCategory[];
  privateTokens: string[];
  attested: [string, Attestation][];
  seenUrls: [string, SourceRef][];
  degraded: boolean;
  unscannedPrivate: boolean;
}

const RATE_STATE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Per-session provenance state. Labels (untrusted sources, private categories, degraded)
 * only ever grow; there is no API to remove them.
 */
export class SessionState {
  readonly sessionKey: string;
  /**
   * Who started the current run. Labels belong to the session, but one session can host runs with
   * different triggers (owner turns and heartbeats in `agent:main:main`), so adapters set this per run.
   */
  trigger: Trigger;
  readonly agentId: string | undefined;
  readonly parentSessionKey: string | undefined;
  readonly attested = new AttestedValues();
  readonly seenUrls = new Map<string, SourceRef>();
  /** HMACs of high-entropy tokens read from private sources (§5.10). */
  readonly privateTokens = new Set<string>();

  private readonly untrustedMap = new Map<string, SourceRef>();
  private readonly privateSet = new Set<PrivateCategory>();
  private readonly pending = new Map<string, PendingInfo>();
  private degradedFlag = false;
  private unscannedFlag = false;
  private readonly prompts: number[] = [];
  private readonly follows: { domain: string; at: number }[] = [];
  private readonly blocks = new Map<string, number>();

  constructor(init: SessionInit) {
    this.sessionKey = init.sessionKey;
    this.trigger = init.trigger;
    this.agentId = init.agentId;
    this.parentSessionKey = init.parentSessionKey;
  }

  get untrusted(): SourceRef[] {
    return [...this.untrustedMap.values()];
  }

  get privateData(): PrivateCategory[] {
    return [...this.privateSet];
  }

  /** A handler failed or overran this session (§5.12). */
  get degraded(): boolean {
    return this.degradedFlag;
  }

  /** A private read happened whose content can never be scanned (e.g. Codex-native records). */
  get unscannedPrivate(): boolean {
    return this.unscannedFlag;
  }

  get tainted(): boolean {
    return this.untrustedMap.size > 0 || this.degradedFlag;
  }

  get holdsPrivate(): boolean {
    return this.privateSet.size > 0 || this.degradedFlag;
  }

  addUntrusted(ref: SourceRef): void {
    const k = `${ref.kind}\u0000${ref.id}`;
    const prev = this.untrustedMap.get(k);
    // Dedupe by kind + id; keep the most recent time so explanations say "2 min ago".
    if (!prev || ref.at > prev.at) this.untrustedMap.set(k, ref);
  }

  addPrivate(cat: PrivateCategory): void {
    this.privateSet.add(cat);
  }

  addLabels(labels: Labels): void {
    for (const r of labels.untrusted) this.addUntrusted(r);
    for (const c of labels.privateData) this.addPrivate(c);
  }

  /** Snapshot of the labels an artifact written now would inherit. */
  labels(): Labels {
    return { untrusted: this.untrusted, privateData: this.privateData };
  }

  markDegraded(): void {
    this.degradedFlag = true;
  }

  markUnscannedPrivate(): void {
    this.unscannedFlag = true;
  }

  addPending(callId: string, info: PendingInfo): void {
    this.pending.set(callId, info);
  }

  takePending(callId: string): PendingInfo | undefined {
    const p = this.pending.get(callId);
    this.pending.delete(callId);
    return p;
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  pendingIds(): string[] {
    return [...this.pending.keys()];
  }

  recordPrompt(at: number): void {
    prune(this.prompts, (t) => t, at);
    this.prompts.push(at);
  }

  promptCount(since: number): number {
    return this.prompts.filter((t) => t >= since).length;
  }

  recordLinkFollow(domain: string, at: number): void {
    prune(this.follows, (f) => f.at, at);
    this.follows.push({ domain, at });
  }

  linkFollowCount(domain: string, since: number): number {
    return this.follows.filter((f) => f.domain === domain && f.at >= since).length;
  }

  /** Counts identical blocked calls so retry loops can be stopped (§5.8). */
  recordBlock(key: string): number {
    const n = (this.blocks.get(key) ?? 0) + 1;
    this.blocks.set(key, n);
    return n;
  }

  toJSON(): SessionSnapshot {
    const snap: SessionSnapshot = {
      sessionKey: this.sessionKey,
      trigger: this.trigger,
      untrusted: this.untrusted,
      privateData: this.privateData,
      privateTokens: [...this.privateTokens],
      attested: this.attested.toJSON(),
      seenUrls: [...this.seenUrls],
      degraded: this.degradedFlag,
      unscannedPrivate: this.unscannedFlag,
    };
    if (this.agentId !== undefined) snap.agentId = this.agentId;
    if (this.parentSessionKey !== undefined) snap.parentSessionKey = this.parentSessionKey;
    return snap;
  }

  static fromJSON(snap: SessionSnapshot): SessionState {
    const s = new SessionState(snap);
    s.addLabels(snap);
    for (const t of snap.privateTokens) s.privateTokens.add(t);
    s.attested.load(snap.attested);
    for (const [u, r] of snap.seenUrls) s.seenUrls.set(u, r);
    if (snap.degraded) s.markDegraded();
    if (snap.unscannedPrivate) s.markUnscannedPrivate();
    return s;
  }
}

function prune<T>(items: T[], at: (item: T) => number, now: number): void {
  while (items.length > 0 && at(items[0]!) < now - RATE_STATE_TTL_MS) items.shift();
}

export function mergeLabels(a: Labels, b: Labels): Labels {
  const s = new SessionState({ sessionKey: "", trigger: "unknown" });
  s.addLabels(a);
  s.addLabels(b);
  return s.labels();
}

export function labelsEmpty(l: Labels): boolean {
  return l.untrusted.length === 0 && l.privateData.length === 0;
}
