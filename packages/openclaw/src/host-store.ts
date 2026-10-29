import { createHash } from "node:crypto";
import { readFileSync, renameSync } from "node:fs";
import type { ArtifactRecord, ExecWindow, SessionSnapshot } from "@provenance-guard/core";
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
  private meta: Meta = { rules: [], state: {}, execWindows: [] };
  private readonly dirtyArts = new Set<string>();
  private readonly dirtySessions = new Set<string>();
  private dirtyMeta = false;
  private metaTouched = false;
  private scheduled = false;
  private chain: Promise<void> = Promise.resolve();
  private readonly artStore: HostKeyedStore<ArtifactRecord>;
  private readonly sessionStore: HostKeyedStore<SessionSnapshot>;
  private readonly metaStore: HostKeyedStore<Meta>;
  readonly ready: Promise<void>;
  /** The last write or load error, for /guard status. */
  lastError: string | null = null;

  constructor(open: OpenKeyedStore, legacyFile?: string) {
    this.artStore = open<ArtifactRecord>({ namespace: "pg-artifacts", retention: "retained" });
    this.sessionStore = open<SessionSnapshot>({ namespace: "pg-sessions", maxEntries: MAX_SESSIONS });
    this.metaStore = open<Meta>({ namespace: "pg-meta", retention: "retained" });
    this.ready = this.load(legacyFile).catch((err: unknown) => {
      this.lastError = `load: ${String(err)}`;
    });
  }

  private async load(legacyFile?: string): Promise<void> {
    const [arts, sessions, meta] = await Promise.all([this.artStore.entries(), this.sessionStore.entries(), this.metaStore.lookup("meta")]);
    for (const [, a] of pairs(arts)) if (!this.arts.has(a.path)) this.arts.set(a.path, a);
    for (const [, s] of pairs(sessions)) if (!this.sessions.has(s.sessionKey)) this.sessions.set(s.sessionKey, s);
    if (meta && !this.metaTouched) this.meta = { rules: meta.rules ?? [], state: meta.state ?? {}, execWindows: meta.execWindows ?? [] };
    if (legacyFile && pairs(arts).length === 0 && !meta) this.importLegacy(legacyFile);
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
    const meta = this.dirtyMeta ? structuredClone(this.meta) : null;
    this.dirtyArts.clear();
    this.dirtySessions.clear();
    this.dirtyMeta = false;
    if (arts.length === 0 && sessions.length === 0 && !meta) return;
    this.chain = this.chain
      .then(async () => {
        for (const a of arts) await this.artStore.register(artifactKey(a.path), a);
        for (const s of sessions) await this.sessionStore.register(sessionKey(s.sessionKey), s);
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
