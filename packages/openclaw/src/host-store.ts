import { createHash } from "node:crypto";
import { readFileSync, renameSync } from "node:fs";
import type { ArtifactRecord, ExecWindow, MemoryEntryRecord, SessionSnapshot } from "@provenance-guard/core";
import type { GuardRule, GuardRuntimeState, GuardStore } from "./store.js";

/**
 * The subset of OpenClaw's plugin keyed store the Guard uses (`api.runtime.state.openKeyedStore`,
 * docs/plugins/sdk-runtime/state-and-system.md). Plugin-scoped SQLite; JSON values up to 1 MiB;
 * keys up to 512 bytes.
 */
export interface HostKeyedStore<T> {
  register(key: string, value: T): Promise<unknown>;
  lookup(key: string): Promise<T | undefined>;
  delete?(key: string): Promise<unknown>;
  entries(): Promise<readonly { key: string; value: T }[] | readonly [string, T][]>;
  /** Paged lexical range read; the docs' way to read a growing retained store. */
  entriesInKeyRange?(range: { keyStartInclusive: string; keyEndExclusive: string; limit: number; order?: "asc" | "desc" }): Promise<
    readonly { key: string; value: T }[] | readonly [string, T][]
  >;
}

export type OpenKeyedStore = <T>(opts: { namespace: string; retention?: "retained"; maxEntries?: number }) => HostKeyedStore<T>;

const MAX_EXEC_WINDOWS = 500;
const MAX_SESSIONS = 5000;

interface Meta {
  rules: GuardRule[];
  state: GuardRuntimeState;
  execWindows: ExecWindow[];
}

/** Artifact paths can exceed the key limit, so artifacts are keyed by a hash of the path. */
const artifactKey = (p: string) => createHash("sha256").update(p).digest("hex");
/** Session keys are short in practice; hash the rare long one. */
const sessionKey = (k: string) => (Buffer.byteLength(k) <= 400 ? k : `h:${artifactKey(k)}`);

function pairs<T>(rows: readonly { key: string; value: T }[] | readonly [string, T][]): [string, T][] {
  return rows.map((r) => (Array.isArray(r) ? (r as [string, T]) : [(r as { key: string }).key, (r as { value: T }).value]));
}

/**
 * GuardStore on OpenClaw's keyed store (plan §6). Reads and writes stay synchronous against memory,
 * which tool_result_persist requires; changes are written behind, in order, to three namespaces.
 * `ready` settles once stored data is loaded; before_tool_call awaits it, so no decision is made
 * without persisted labels and rules. Data written before loading finishes wins over loaded data.
 * An existing store.json is imported once and renamed to store.json.imported.
 */
export class KeyedGuardStore implements GuardStore {
  private readonly arts = new Map<string, ArtifactRecord>();
  private readonly sessions = new Map<string, SessionSnapshot>();
  private readonly entries = new Map<string, MemoryEntryRecord>();
  private meta: Meta = { rules: [], state: {}, execWindows: [] };
  private readonly dirtyArts = new Set<string>();
  private readonly dirtySessions = new Set<string>();
  private readonly dirtyEntries = new Set<string>();
  private dirtyMeta = false;
  private metaTouched = false;
  private scheduled = false;
  private chain: Promise<void> = Promise.resolve();
  private readonly artStore: HostKeyedStore<ArtifactRecord>;
  private readonly sessionStore: HostKeyedStore<SessionSnapshot>;
  private readonly metaStore: HostKeyedStore<Meta>;
  private readonly memoryStore: HostKeyedStore<MemoryEntryRecord>;
  readonly ready: Promise<void>;
  /** The last write or load error, for /guard status. */
  lastError: string | null = null;
  /** What the startup load found, per namespace (audited by the Guard). */
  loaded = { artifacts: 0, sessions: 0, memoryEntries: 0, meta: false, errors: [] as string[], probe: {} as Record<string, Record<string, number | string>> };

  constructor(open: OpenKeyedStore, legacyFile?: string) {
    this.artStore = open<ArtifactRecord>({ namespace: "pg-artifacts", retention: "retained" });
    this.sessionStore = open<SessionSnapshot>({ namespace: "pg-sessions", maxEntries: MAX_SESSIONS });
    this.metaStore = open<Meta>({ namespace: "pg-meta", retention: "retained" });
    // Retained: an evicted entry would silently drop a taint label.
    this.memoryStore = open<MemoryEntryRecord>({ namespace: "pg-memory", retention: "retained" });
    this.ready = this.load(legacyFile).catch((err: unknown) => {
      this.lastError = `load: ${String(err)}`;
    });
  }

  /**
   * Every row of a namespace. entries() first; if it fails or returns nothing, paged key ranges over
   * `range` (artifact keys are hex hashes, so "0".."g"). guard-persist-2 showed a retained namespace
   * returning no rows for an open-ended ("" to U+10FFFF) range. Counts per method go to `probe`.
   */
  private async readAll<T>(store: HostKeyedStore<T>, probe: Record<string, number | string>, range: [string, string] = ["0", "g"]): Promise<[string, T][]> {
    let rows: [string, T][] = [];
    try {
      rows = pairs(await store.entries());
      probe.entries = rows.length;
    } catch (err) {
      probe.entries = `error: ${String(err).slice(0, 120)}`;
    }
    if (rows.length > 0 || !store.entriesInKeyRange) return rows;
    const out: [string, T][] = [];
    let start = range[0];
    for (;;) {
      const page = pairs(await store.entriesInKeyRange({ keyStartInclusive: start, keyEndExclusive: range[1], limit: 1000, order: "asc" }));
      out.push(...page);
      if (page.length < 1000) break;
      start = `${page[page.length - 1]![0]}\u0000`;
    }
    probe.range = out.length;
    return out;
  }

  /**
   * Retries while the plugin state database can't be opened (seen right after a Gateway restart and in
   * CLI processes, guard-persist-3), for up to ~2 s; before_tool_call's 5 s timeout still bounds it.
   */
  private async load(legacyFile?: string): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      this.loaded.errors = [];
      await this.loadOnce(legacyFile);
      (this.loaded as { attempts?: number }).attempts = attempt;
      // A clean retry clears an earlier attempt's error, so /guard status doesn't report it (tg-2).
      if (this.loaded.errors.length === 0 && this.lastError?.startsWith("load")) this.lastError = null;
      const retryable = this.loaded.errors.some((e) => /Failed to open the plugin state database/.test(e));
      if (!retryable || attempt >= 8) return;
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  private async loadOnce(legacyFile?: string): Promise<void> {
    // Each namespace loads on its own, so one failure can't empty the others.
    const guarded = async <T>(name: string, fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await fn();
      } catch (err) {
        this.loaded.errors.push(`${name}: ${String(err)}`);
        this.lastError = `load ${name}: ${String(err)}`;
        return undefined;
      }
    };
    const [arts, sessions, meta, entries] = await Promise.all([
      guarded("pg-artifacts", () => this.readAll(this.artStore, (this.loaded.probe.artifacts = {}))),
      guarded("pg-sessions", () => this.readAll(this.sessionStore, (this.loaded.probe.sessions = {}), ["", "\u{10FFFF}"])),
      guarded("pg-meta", () => this.metaStore.lookup("meta")),
      // Entry keys are sha256 hex, so the artifacts' hex range fits.
      guarded("pg-memory", () => this.readAll(this.memoryStore, (this.loaded.probe.memory = {}))),
    ]);
    for (const [, a] of arts ?? []) if (!this.arts.has(a.path)) this.arts.set(a.path, a);
    for (const [, s] of sessions ?? []) if (!this.sessions.has(s.sessionKey)) this.sessions.set(s.sessionKey, s);
    for (const [, e] of entries ?? []) if (!this.entries.has(e.hash)) this.entries.set(e.hash, e);
    if (meta && !this.metaTouched) this.meta = { rules: meta.rules ?? [], state: meta.state ?? {}, execWindows: meta.execWindows ?? [] };
    this.loaded.artifacts = arts?.length ?? 0;
    this.loaded.sessions = sessions?.length ?? 0;
    this.loaded.memoryEntries = entries?.length ?? 0;
    this.loaded.meta = Boolean(meta);
    if (legacyFile && arts !== undefined && arts.length === 0 && meta === undefined && this.loaded.errors.length === 0) this.importLegacy(legacyFile);
  }

  private importLegacy(file: string): void {
    let d: Partial<{ artifacts: ArtifactRecord[]; execWindows: ExecWindow[]; sessions: SessionSnapshot[]; rules: GuardRule[]; state: GuardRuntimeState }>;
    try {
      d = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      return;
    }
    for (const a of d.artifacts ?? []) if (!this.arts.has(a.path)) this.putArtifact(a);
    for (const s of d.sessions ?? []) if (!this.sessions.has(s.sessionKey)) this.putSession(s);
    if (!this.metaTouched) {
      this.meta = { rules: d.rules ?? [], state: d.state ?? {}, execWindows: d.execWindows ?? [] };
      this.dirtyMeta = true;
      this.schedule();
    }
    try {
      renameSync(file, `${file}.imported`);
    } catch {
      // Read-only or already moved: the keyed store is authoritative from now on either way.
    }
  }

  getArtifact(p: string): ArtifactRecord | undefined {
    return this.arts.get(p);
  }
  putArtifact(rec: ArtifactRecord): void {
    this.arts.set(rec.path, rec);
    this.dirtyArts.add(rec.path);
    this.schedule();
  }
  artifacts(): Iterable<ArtifactRecord> {
    return this.arts.values();
  }
  addExecWindow(w: ExecWindow): void {
    this.meta.execWindows.push(w);
    if (this.meta.execWindows.length > MAX_EXEC_WINDOWS) this.meta.execWindows.splice(0, this.meta.execWindows.length - MAX_EXEC_WINDOWS);
    this.touchMeta();
  }
  execWindows(): readonly ExecWindow[] {
    return this.meta.execWindows;
  }
  closeExecWindow(callId: string, end: number): void {
    let changed = false;
    for (const w of this.meta.execWindows) {
      if (w.callId === callId && w.end === undefined) {
        w.end = end;
        changed = true;
      }
    }
    if (changed) this.touchMeta();
  }
  getMemoryEntry(hash: string): MemoryEntryRecord | undefined {
    return this.entries.get(hash);
  }
  putMemoryEntry(rec: MemoryEntryRecord): void {
    this.entries.set(rec.hash, rec);
    this.dirtyEntries.add(rec.hash);
    this.schedule();
  }
  memoryEntries(): Iterable<MemoryEntryRecord> {
    return this.entries.values();
  }
  getSession(key: string): SessionSnapshot | undefined {
    return this.sessions.get(key);
  }
  putSession(snap: SessionSnapshot): void {
    this.sessions.set(snap.sessionKey, snap);
    this.dirtySessions.add(snap.sessionKey);
    this.schedule();
  }
  rules(): GuardRule[] {
    return [...this.meta.rules];
  }
  setRules(rules: GuardRule[]): void {
    this.meta.rules = [...rules];
    this.touchMeta();
  }
  runtimeState(): GuardRuntimeState {
    return { ...this.meta.state };
  }
  setRuntimeState(s: GuardRuntimeState): void {
    this.meta.state = { ...s };
    this.touchMeta();
  }

  private touchMeta(): void {
    this.metaTouched = true;
    this.dirtyMeta = true;
    this.schedule();
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    setImmediate(() => this.flush()).unref?.();
  }

  /** Queues pending writes; `idle()` resolves when they've reached the host store. */
  flush(): void {
    this.scheduled = false;
    const arts = [...this.dirtyArts].map((p) => this.arts.get(p)!).filter(Boolean);
    const sessions = [...this.dirtySessions].map((k) => this.sessions.get(k)!).filter(Boolean);
    const entries = [...this.dirtyEntries].map((h) => this.entries.get(h)!).filter(Boolean);
    const meta = this.dirtyMeta ? structuredClone(this.meta) : null;
    this.dirtyArts.clear();
    this.dirtySessions.clear();
    this.dirtyEntries.clear();
    this.dirtyMeta = false;
    if (arts.length === 0 && sessions.length === 0 && entries.length === 0 && !meta) return;
    this.chain = this.chain
      .then(async () => {
        for (const a of arts) await this.artStore.register(artifactKey(a.path), a);
        for (const s of sessions) await this.sessionStore.register(sessionKey(s.sessionKey), s);
        for (const e of entries) await this.memoryStore.register(e.hash, e);
        if (meta) await this.metaStore.register("meta", meta);
      })
      .catch((err: unknown) => {
        this.lastError = `write: ${String(err)}`;
      });
  }

  idle(): Promise<void> {
    return this.chain;
  }
}
