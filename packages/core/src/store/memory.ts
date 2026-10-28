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

/** An exec in a tainted session: files under `cwd` modified after `start` inherit `labels` (§5.4). */
export interface ExecWindow {
  sessionKey: string;
  cwd: string;
  start: number;
  labels: Labels;
}

/** Persistent label storage (§5.11). The backend (node:sqlite or JSONL) is chosen in Phase 0. */
export interface ProvenanceStore {
  getArtifact(path: string): ArtifactRecord | undefined;
  putArtifact(rec: ArtifactRecord): void;
  artifacts(): Iterable<ArtifactRecord>;
  addExecWindow(w: ExecWindow): void;
  execWindows(): readonly ExecWindow[];
}

export class MemoryStore implements ProvenanceStore {
  private readonly arts = new Map<string, ArtifactRecord>();
  private readonly windows: ExecWindow[] = [];

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
}
