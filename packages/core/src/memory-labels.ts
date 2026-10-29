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

/** Alphanumeric runs of 4+ characters: the words an entry is indexed by. */
const words = (text: string): string[] => text.match(/[\p{L}\p{N}]{4,}/gu) ?? [];

interface EntryIndex {
  size: number;
  /** Word -> entries containing it. */
  byWord: Map<string, Set<string>>;
  /** Word -> entries whose rarest inner word it is (each entry under exactly one word). */
  byAnchor: Map<string, string[]>;
  /** Entries with fewer than 3 indexed words: an inner word may be missing, so always scanned. */
  scanned: string[];
}

const indexes = new WeakMap<object, EntryIndex>();

/** The word of `ws` (inner words, unless there are fewer than 3) with the fewest entries. */
function rarest(ws: readonly string[], byWord: Map<string, Set<string>>): string | undefined {
  const inner = ws.length >= 3 ? ws.slice(1, -1) : ws;
  let best: string | undefined;
  for (const w of inner) if (best === undefined || (byWord.get(w)?.size ?? 0) < (byWord.get(best)?.size ?? 0)) best = w;
  return best;
}

/**
 * Word indexes over the stored entries, rebuilt when entries are added. An entry's hash is the hash
 * of its text, so the text behind a hash never changes, and labels are read fresh at match time.
 */
function indexFor(env: GuardEnv): EntryIndex {
  const entries = [...env.store.memoryEntries()];
  const cached = indexes.get(env.store);
  if (cached && cached.size === entries.length) return cached;
  const byWord = new Map<string, Set<string>>();
  const scanned: string[] = [];
  const entryWords = new Map<string, string[]>();
  for (const e of entries) {
    const ws = words(e.text);
    entryWords.set(e.hash, ws);
    if (new Set(ws).size < 3) scanned.push(e.hash);
    for (const w of ws) {
      let set = byWord.get(w);
      if (!set) byWord.set(w, (set = new Set()));
      set.add(e.hash);
    }
  }
  const byAnchor = new Map<string, string[]>();
  for (const [hash, ws] of entryWords) {
    const a = rarest(ws, byWord);
    if (a === undefined) continue;
    const list = byAnchor.get(a);
    if (list) list.push(hash);
    else byAnchor.set(a, [hash]);
  }
  const index = { size: entries.length, byWord, byAnchor, scanned };
  indexes.set(env.store, index);
  return index;
}

/**
 * Labels of the stored memory entries that `content` contains: an exact line match, or a long
 * enough partial line on either side (a snippet cut short, or a line with a prefix added).
 * Over-matching only adds labels, which is the safe direction.
 *
 * Partial matches are checked only against a few candidates, and find the same entries as checking
 * all of them. A snippet's inner words are whole words of its entry, so the entries holding the
 * snippet's rarest inner word include it. An entry inside a longer line keeps its inner words whole,
 * so its anchor (its own rarest inner word) is one of the line's words. Lines and entries with fewer
 * than 3 words (all of them possibly cut) are compared with everything.
 */
export function memoryLabelsIn(content: string, env: GuardEnv): MemoryEntryRecord[] {
  if (content === "") return [];
  const index = indexFor(env);
  if (index.size === 0) return [];
  const hits = new Map<string, MemoryEntryRecord>();
  const check = (hash: string, line: string, part: string) => {
    if (hits.has(hash)) return;
    const e = env.store.getMemoryEntry(hash);
    if (e && ((part.length >= MIN_PARTIAL && e.text.includes(part)) || (e.text.length >= MIN_PARTIAL && line.includes(e.text)))) hits.set(hash, e);
  };
  for (const view of contentViews(content)) {
    for (const line of memoryLines(view)) {
      const exact = env.store.getMemoryEntry(memoryLineHash(line));
      if (exact) {
        hits.set(exact.hash, exact);
        continue;
      }
      if (line.length < MIN_PARTIAL) continue; // too short to be or hold a matchable entry
      // Snippets mark where they were cut with an ellipsis.
      const part = line.replace(/^(?:…|\.{3})\s*/, "").replace(/\s*(?:…|\.{3})$/, "");
      const lineWords = words(part);
      if (lineWords.length < 3) {
        for (const e of env.store.memoryEntries()) check(e.hash, line, part);
        continue;
      }
      const key = rarest(lineWords, index.byWord);
      for (const h of (key && index.byWord.get(key)) || []) check(h, line, part);
      for (const w of words(line)) for (const h of index.byAnchor.get(w) ?? []) check(h, line, part);
      for (const h of index.scanned) check(h, line, part);
    }
  }
  return [...hits.values()];
}
