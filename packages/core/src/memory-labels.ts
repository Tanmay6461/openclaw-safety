import { createHash } from "node:crypto";
import type { GuardEnv } from "./env.js";
import type { MemoryEntryRecord } from "./store/memory.js";
import type { Labels } from "./types.js";

/**
 * Entry-level memory labels (§5.11). A memory file is auto-loaded into later sessions, so a
 * file-level label from one tainted write would taint every session after it. Instead, the lines a
 * labeled session adds are labeled one by one, and a later read (or the bootstrap load) picks up
 * labels only for the labeled lines its content actually contains. Only labeled lines are stored.
 */

/** Lines shorter than this, once normalized, are structure (bullets, rules), not entries. */
const MIN_LINE = 3;
/** A partial line (a search snippet) must be at least this long to match a stored entry. */
const MIN_PARTIAL = 20;
const MAX_ENTRY = 2000;

/** Case- and whitespace-insensitive, without list, heading, or quote markers. */
export function normalizeMemoryLine(line: string): string {
  return line
    .trim()
    .replace(/^(?:[-*+]|\d+[.)]|#{1,6}|>)\s+/, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .slice(0, MAX_ENTRY);
}

export function memoryLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(normalizeMemoryLine)
    .filter((l) => l.length >= MIN_LINE);
}

export const memoryLineHash = (line: string): string => createHash("sha256").update(line).digest("hex");

/** apply_patch's format (`*** Begin Patch`) or a unified diff. */
export function looksLikePatch(text: string): boolean {
  return /^\*\*\* Begin Patch/m.test(text) || /^(?:@@ |\+\+\+ )/m.test(text);
}

/** Lines a patch adds (`+` lines, not `+++` headers). */
export function patchAddedLines(patch: string): string[] {
  return patch
    .split(/\r?\n/)
    .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
    .map((l) => l.slice(1));
}

/**
 * Records the lines a write adds to a memory file, labeled with the writing session's labels.
 * `written` is the new text (write content, edit newText, or a patch's added lines); lines the file
 * already held before the write keep whatever labels they had. Returns how many lines it labeled.
 */
export function recordMemoryWrite(abs: string, written: readonly string[], labels: Labels, sessionKey: string, env: GuardEnv, at: number): number {
  if (labels.untrusted.length === 0 && labels.privateData.length === 0) return 0;
  const before = new Set(memoryLines(env.readText?.(abs) ?? ""));
  let n = 0;
  for (const line of new Set(written.flatMap(memoryLines))) {
    if (before.has(line)) continue;
    const hash = memoryLineHash(line);
    const prev = env.store.getMemoryEntry(hash);
    const merged: Labels = prev
      ? { untrusted: [...prev.labels.untrusted, ...labels.untrusted], privateData: [...new Set([...prev.labels.privateData, ...labels.privateData])] }
      : labels;
    env.store.putMemoryEntry({ hash, text: line, labels: merged, file: abs, sessionKey, updatedAt: at });
    n++;
  }
  return n;
}

/**
 * Tool results can carry memory text inside JSON (search hits): match the raw text, the unescaped
 * text, and each quoted string on its own line, so a snippet is compared as a snippet.
 */
function contentViews(content: string): string[] {
  const unescaped = content.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  const views = new Set([content, unescaped]);
  if (unescaped.includes('"')) views.add(unescaped.replace(/"/g, "\n"));
  return [...views];
}

/**
 * Labels of the stored memory entries that `content` contains: an exact line match, or a long
 * enough partial line on either side (a snippet cut short, or a line with a prefix added).
 * Over-matching only adds labels, which is the safe direction.
 */
export function memoryLabelsIn(content: string, env: GuardEnv): MemoryEntryRecord[] {
  const entries = [...env.store.memoryEntries()];
  if (entries.length === 0 || content === "") return [];
  const hits = new Map<string, MemoryEntryRecord>();
  for (const view of contentViews(content)) {
    for (const line of memoryLines(view)) {
      const exact = env.store.getMemoryEntry(memoryLineHash(line));
      if (exact) {
        hits.set(exact.hash, exact);
        continue;
      }
      // Snippets mark where they were cut with an ellipsis.
      const part = line.replace(/^(?:…|\.{3})\s*/, "").replace(/\s*(?:…|\.{3})$/, "");
      for (const e of entries) {
        if (hits.has(e.hash)) continue;
        if ((part.length >= MIN_PARTIAL && e.text.includes(part)) || (e.text.length >= MIN_PARTIAL && line.includes(e.text))) hits.set(e.hash, e);
      }
    }
  }
  return [...hits.values()];
}
