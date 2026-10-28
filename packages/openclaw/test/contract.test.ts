import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadRegistry } from "../src/index.js";

// Registry contract against the tool schemas a live OpenClaw Gateway sent (phase0/contract). Regenerate
// the fixture with phase0/contract/make-fixture.mjs after a contract run on a new OpenClaw version.
interface Fixture {
  openclawVersion: string;
  runs: string[];
  tools: Record<string, { leafPaths: string[]; enums: Record<string, (string | number | boolean)[]> }>;
}
const fixture = JSON.parse(readFileSync(new URL("./fixtures/openclaw-tools-contract.json", import.meta.url), "utf8")) as Fixture;
const raw = JSON.parse(readFileSync(new URL("../src/registry/openclaw-tools.json", import.meta.url), "utf8")) as {
  aliases: Record<string, string>;
  tools: Record<string, { args?: Record<string, string>; actionParam?: string; actions?: Record<string, { args?: Record<string, string> }> }>;
};
const registry = loadRegistry();

const covers = (regPath: string, leaf: string) => leaf === regPath || leaf.startsWith(`${regPath}.`) || leaf.startsWith(`${regPath}[]`);

// Params the registry keeps although these runs didn't see them: the message schema depends on the
// configured channels (Discord, Telegram, Slack, WhatsApp weren't configured), and Codex-native tools
// reach before_tool_call under OpenClaw names with their own params (phase0/source-notes-v2.md Q2, Q4).
const KNOWN_UNSEEN: Record<string, ReadonlySet<string>> = {
  message: new Set(["to", "filePath", "path", "fileUrl", "chatJid"]),
  exec: new Set(["cmd"]), // Codex exec_command
  apply_patch: new Set(["patch"]), // Codex Write/Edit
};

describe(`registry contract (OpenClaw ${fixture.openclawVersion}, runs ${fixture.runs.join(", ")})`, () => {
  const names = Object.keys(fixture.tools);

  it.each(names)("%s has a registry entry", (name) => {
    expect(registry.lookup(name), `${name} would get an inferred spec`).toBeDefined();
  });

  it.each(names)("%s: every schema parameter has a role", (name) => {
    const spec = raw.tools[raw.aliases[name] ?? name]!;
    const paths = [...Object.keys(spec.args ?? {}), ...Object.values(spec.actions ?? {}).flatMap((o) => Object.keys(o.args ?? {}))];
    const unmapped = fixture.tools[name]!.leafPaths.filter((leaf) => leaf !== spec.actionParam && !paths.some((p) => covers(p, leaf)));
    expect(unmapped).toEqual([]);
  });

  it.each(names)("%s: every action value is listed", (name) => {
    const spec = raw.tools[raw.aliases[name] ?? name]!;
    const values = spec.actionParam ? (fixture.tools[name]!.enums[spec.actionParam] ?? []) : [];
    const missing = values.map(String).filter((a) => !(a in (spec.actions ?? {})));
    expect(missing).toEqual([]);
  });

  it.each(names)("%s: no stale registry parameters", (name) => {
    const spec = raw.tools[raw.aliases[name] ?? name]!;
    const leaves = fixture.tools[name]!.leafPaths;
    const stale = Object.keys(spec.args ?? {})
      .filter((p) => !p.startsWith("__"))
      .filter((p) => !KNOWN_UNSEEN[name]?.has(p))
      .filter((p) => !leaves.some((leaf) => covers(p, leaf) || p.startsWith(`${leaf}.`) || p.startsWith(`${leaf}[]`)));
    expect(stale).toEqual([]);
  });
});
