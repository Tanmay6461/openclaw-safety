#!/usr/bin/env node
// Writes the registry contract fixture from a contract run's schemas.json: per tool, the leaf parameter
// paths and top-level enum values, plus the OpenClaw version. Merges into an existing fixture so tools
// only offered in some configurations (channels, plugins) stay covered.
// Usage: node make-fixture.mjs <schemas.json> <fixture.json> <openclawVersion> <runLabel>
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const [schemasPath, fixturePath, version, label] = process.argv.slice(2);
const { manifest } = JSON.parse(readFileSync(schemasPath, "utf8"));
const fx = existsSync(fixturePath) ? JSON.parse(readFileSync(fixturePath, "utf8")) : { openclawVersion: version, runs: [], tools: {} };
fx.openclawVersion = version;
fx.runs = [...new Set([...(fx.runs ?? []), label])];
for (const [name, m] of Object.entries(manifest)) {
  const prev = fx.tools[name] ?? { leafPaths: [], enums: {} };
  const enums = { ...prev.enums };
  for (const [k, v] of Object.entries(m.enums ?? {})) enums[k] = [...new Set([...(enums[k] ?? []), ...v])].sort();
  if (m.actionKey && m.actions?.length) enums[m.actionKey] = [...new Set([...(enums[m.actionKey] ?? []), ...m.actions])].sort();
  fx.tools[name] = { leafPaths: [...new Set([...prev.leafPaths, ...m.leafPaths])].sort(), enums };
}
fx.tools = Object.fromEntries(Object.entries(fx.tools).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(fixturePath, `${JSON.stringify(fx, null, 2)}\n`);
console.log(`fixture: ${Object.keys(fx.tools).length} tool(s) from ${fx.runs.join(", ")}`);
