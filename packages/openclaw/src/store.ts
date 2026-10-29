import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ArtifactRecord, ExecWindow, MemoryEntryRecord, ProvenanceStore, SessionSnapshot } from "@provenance-guard/core";
import type { GuardMode } from "./config.js";

/** A learned `allow-always` rule (§4.5): one value, one kind of action. */
export interface GuardRule {
  id: string;
  kind: "email" | "phone" | "handle" | "string" | "url" | "command";
  value: string;
  tool: string;
  createdAt: number;
}

export interface GuardRuntimeState {
  mode?: GuardMode;
  preset?: "balanced" | "strict";
  pausedUntil?: number;
}

export interface GuardStore extends ProvenanceStore {
  getSession(key: string): SessionSnapshot | undefined;
  putSession(snap: SessionSnapshot): void;
  rules(): GuardRule[];
  setRules(rules: GuardRule[]): void;
  runtimeState(): GuardRuntimeState;
  setRuntimeState(s: GuardRuntimeState): void;
  /** Write pending changes now. */
  flush(): void;
}

interface FileShape {
  version: 1;
  artifacts: ArtifactRecord[];
  execWindows: ExecWindow[];
  memoryEntries?: MemoryEntryRecord[];
  sessions: SessionSnapshot[];
  rules: GuardRule[];
  state: GuardRuntimeState;
}

const MAX_EXEC_WINDOWS = 500;

/**
 * In-memory store with an atomic JSON snapshot on disk. Reads and writes are synchronous, which
 * tool_result_persist requires; disk writes are batched to the next tick. The plan's target backend
 * is the host's keyed store (§6), which can replace this once its API is confirmed at runtime.
 */
export class FileBackedStore implements GuardStore {
  private readonly arts = new Map<string, ArtifactRecord>();
  private windows: ExecWindow[] = [];
  private readonly entries = new Map<string, MemoryEntryRecord>();
  private readonly sessions = new Map<string, SessionSnapshot>();
  private ruleList: GuardRule[] = [];
  private state: GuardRuntimeState = {};
  private scheduled = false;

  constructor(private readonly file: string | null) {
    if (file === null) return;
    try {
      const d = JSON.parse(readFileSync(file, "utf8")) as Partial<FileShape>;
      for (const a of d.artifacts ?? []) this.arts.set(a.path, a);
      this.windows = d.execWindows ?? [];
      for (const e of d.memoryEntries ?? []) this.entries.set(e.hash, e);
      for (const s of d.sessions ?? []) this.sessions.set(s.sessionKey, s);
      this.ruleList = d.rules ?? [];
      this.state = d.state ?? {};
    } catch {
      // First run, or an unreadable file: start empty rather than refuse to load.
    }
  }

  getArtifact(p: string): ArtifactRecord | undefined {
    return this.arts.get(p);
  }
  putArtifact(rec: ArtifactRecord): void {
    this.arts.set(rec.path, rec);
    this.schedule();
  }
  artifacts(): Iterable<ArtifactRecord> {
    return this.arts.values();
  }
  addExecWindow(w: ExecWindow): void {
    this.windows.push(w);
    if (this.windows.length > MAX_EXEC_WINDOWS) this.windows.splice(0, this.windows.length - MAX_EXEC_WINDOWS);
    this.schedule();
  }
  execWindows(): readonly ExecWindow[] {
    return this.windows;
  }
  closeExecWindow(callId: string, end: number): void {
    for (const w of this.windows) if (w.callId === callId && w.end === undefined) w.end = end;
    this.schedule();
  }
  getMemoryEntry(hash: string): MemoryEntryRecord | undefined {
    return this.entries.get(hash);
  }
  putMemoryEntry(rec: MemoryEntryRecord): void {
    this.entries.set(rec.hash, rec);
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
    this.schedule();
  }
  rules(): GuardRule[] {
    return [...this.ruleList];
  }
  setRules(rules: GuardRule[]): void {
    this.ruleList = [...rules];
    this.schedule();
  }
  runtimeState(): GuardRuntimeState {
    return { ...this.state };
  }
  setRuntimeState(s: GuardRuntimeState): void {
    this.state = { ...s };
    this.schedule();
  }

  private schedule(): void {
    if (this.file === null || this.scheduled) return;
    this.scheduled = true;
    setImmediate(() => this.flush()).unref?.();
  }

  flush(): void {
    this.scheduled = false;
    if (this.file === null) return;
    const data: FileShape = {
      version: 1,
      artifacts: [...this.arts.values()],
      execWindows: this.windows,
      memoryEntries: [...this.entries.values()],
      sessions: [...this.sessions.values()],
      rules: this.ruleList,
      state: this.state,
    };
    mkdirSync(path.dirname(this.file), { recursive: true, mode: 0o700 });
    const tmp = `${this.file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(data), { mode: 0o600 });
    renameSync(tmp, this.file);
  }
}
