import type { Labels } from "../types.js";

export interface ArtifactRecord {
  /** Realpath. */
  path: string;
  labels: Labels;
  /** Content hash recorded after the write lands (tool_result_persist). */
  hash?: string;
  sessionKey: string;
  updatedAt: number;
  /** Content changed outside the agent; label kept until `/guard trust` (§5.11). */
  stale?: boolean;
}

/**
 * An exec in a tainted session: files under `cwd` modified while it ran inherit `labels` (§5.4).
 * Times are wall clock, like file mtimes. `end` is set when the exec's result comes back; a window
 * that never closes (background commands, lost results) counts as open for EXEC_WINDOW_OPEN_MS.
 */
export interface ExecWindow {
  sessionKey: string;
  cwd: string;
  start: number;
  labels: Labels;
  callId?: string;
  end?: number;
}

/** A memory line added by a labeled session (§5.11, entry-level labels). Clean lines aren't stored. */
export interface MemoryEntryRecord {
  /** sha256 of the normalized line (normalizeMemoryLine). */
  hash: string;
  /** The normalized line, for matching partial lines such as search snippets. */
  text: string;
  labels: Labels;
  /** The memory file it was written to (realpath). */
  file: string;
  sessionKey: string;
  updatedAt: number;
}

/** Persistent label storage (§5.11). */
export interface ProvenanceStore {
  getArtifact(path: string): ArtifactRecord | undefined;
  putArtifact(rec: ArtifactRecord): void;
  artifacts(): Iterable<ArtifactRecord>;
  addExecWindow(w: ExecWindow): void;
  execWindows(): readonly ExecWindow[];
  /** Ends the window an exec call opened. */
  closeExecWindow(callId: string, end: number): void;
  getMemoryEntry(hash: string): MemoryEntryRecord | undefined;
  putMemoryEntry(rec: MemoryEntryRecord): void;
  memoryEntries(): Iterable<MemoryEntryRecord>;
}

export class MemoryStore implements ProvenanceStore {
  private readonly arts = new Map<string, ArtifactRecord>();
  private readonly windows: ExecWindow[] = [];
  private readonly entries = new Map<string, MemoryEntryRecord>();

  getArtifact(path: string): ArtifactRecord | undefined {
    return this.arts.get(path);
  }

  putArtifact(rec: ArtifactRecord): void {
    this.arts.set(rec.path, rec);
  }

  artifacts(): Iterable<ArtifactRecord> {
    return this.arts.values();
  }

  addExecWindow(w: ExecWindow): void {
    this.windows.push(w);
  }

  execWindows(): readonly ExecWindow[] {
    return this.windows;
  }

  closeExecWindow(callId: string, end: number): void {
    for (const w of this.windows) if (w.callId === callId && w.end === undefined) w.end = end;
  }

  getMemoryEntry(hash: string): MemoryEntryRecord | undefined {
    return this.entries.get(hash);
  }

  putMemoryEntry(rec: MemoryEntryRecord): void {
    this.entries.set(rec.hash, rec);
  }

  memoryEntries(): Iterable<MemoryEntryRecord> {
    return this.entries.values();
  }
}
