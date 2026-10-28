#!/usr/bin/env node
// Contract report for one sweep run. No dependencies; reads the Guard registry JSON directly.
// Usage: node analyze-contract.mjs <runDir> <registry.json> > report.md   (also writes <runDir>/contract-summary.json)
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const [run, registryPath] = process.argv.slice(2);
if (!run || !registryPath) {
  console.error("usage: analyze-contract.mjs <runDir> <registry.json>");
  process.exit(2);
}
const jsonl = (f) => (existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const reg = JSON.parse(readFileSync(registryPath, "utf8"));
const { tools: schemas, manifest, unparsed } = JSON.parse(readFileSync(`${run}/schemas.json`, "utf8"));
const calls = JSON.parse(readFileSync(`${run}/calls.json`, "utf8"));
const sentinel = jsonl(`${run}/contract.jsonl`).filter((r) => r.hook === "before_tool_call");
const audit = jsonl(`${run}/guard-state/audit.jsonl`);
const steps = jsonl(`${run}/steps.jsonl`);

const canonical = (n) => reg.aliases?.[n] ?? n;
const specOf = (n) => reg.tools[canonical(n)];
const META = new Set(["tool_call", "tool_search", "tool_describe"]);

// ---- static coverage --------------------------------------------------------------------------
function covers(regPath, leaf) {
  return leaf === regPath || leaf.startsWith(`${regPath}.`) || leaf.startsWith(`${regPath}[]`);
}
const coverage = [];
for (const name of Object.keys(manifest).sort()) {
  const m = manifest[name];
  const spec = specOf(name);
  if (!spec) {
    coverage.push({ name, status: "missing", leafPaths: m.leafPaths, actions: m.actions });
    continue;
  }
  const regArgs = new Map(Object.entries(spec.args ?? {}));
  for (const o of Object.values(spec.actions ?? {})) for (const [p, r] of Object.entries(o.args ?? {})) if (!regArgs.has(p)) regArgs.set(p, r);
  const actionKey = spec.actionParam ?? m.actionKey;
  const unmapped = [];
  for (const leaf of m.leafPaths) {
    if (leaf === actionKey) continue;
    if ([...regArgs.keys()].some((p) => covers(p, leaf))) continue;
    unmapped.push({ leaf, fallback: spec.otherArgs ? `otherArgs:${spec.otherArgs}` : "IGNORED" });
  }
  const stale = [...regArgs.keys()].filter((p) => !p.startsWith("__")).filter((p) => !m.leafPaths.some((leaf) => covers(p, leaf) || p.startsWith(`${leaf}.`) || p.startsWith(`${leaf}[]`)));
  const regActions = Object.keys(spec.actions ?? {});
  // Compare against the param the registry selects actions with (enums from gen-calls; older dumps only have `actions`).
  const selector = spec.actionParam ?? m.actionKey;
  const schemaActions = (selector && m.enums?.[selector]) ?? (selector === m.actionKey ? (m.actions ?? []) : []);
  const missingActions = schemaActions.filter((a) => !regActions.includes(a)).map((a) => ({ action: a, fallback: spec.category }));
  const staleActions = regActions.filter((a) => !schemaActions.includes(a));
  coverage.push({ name, canonical: canonical(name), status: "known", category: spec.category, unmapped, stale, missingActions, staleActions, actionKey: m.actionKey, regActionParam: spec.actionParam ?? null });
}
const unswept = Object.keys(reg.tools).filter((n) => !manifest[n] && !Object.entries(reg.aliases ?? {}).some(([a, t]) => t === n && manifest[a]));

// ---- runtime: sweep calls vs hook events vs Guard decisions -------------------------------------
// The mock logs which calls it emitted (seq, step, from, pass); OpenClaw's outer call id is
// call_<seq>_<k>, and an inner call through tool_call is tool_call:<outer>:<tool>:<n>. A Guard
// block or ask ends the hook chain, so the Guard audit (not the sentinel) is the record of truth.
const mock = jsonl(`${run}/mock.jsonl`);
const decisions = audit.filter((a) => a.verdict !== undefined && a.tool !== "tool_call");
const sentinelById = new Map(sentinel.filter((r) => !r.pass).map((r) => [r.toolCallId, r]));
const resultById = new Map(mock.filter((r) => r.kind === "toolResult").map((r) => [r.toolCallId, r.text]));
const emitted = new Map(); // `${pass}:${index}` -> outer call id
for (const r of mock) {
  if (r.kind !== "chat" || r.mode !== "sweep" || !r.emitted?.length) continue;
  r.emitted.forEach((_e, k) => emitted.set(`${r.pass}:${(r.from ?? 0) + r.step * (r.batch ?? 6) + k}`, `call_${r.seq}_${k}`));
}
const runtime = calls.map((c, i) => {
  const row = { i, label: c.label, tool: c.tool, action: c.action };
  for (const pass of ["clean", "tainted"]) {
    const outer = emitted.get(`${pass}:${i}`);
    if (!outer) {
      row[pass] = { fired: false, note: "not emitted" };
      continue;
    }
    const a = decisions.find((d) => d.callId === outer || d.callId?.startsWith(`tool_call:${outer}:`));
    if (!a) {
      row[pass] = { fired: false, note: (resultById.get(outer) ?? "no tool result").replace(/\s+/g, " ").slice(0, 160) };
      continue;
    }
    const ev = sentinelById.get(a.callId);
    const sent = c.name === "tool_call" ? c.arguments.args : c.arguments;
    const keysOk = ev ? JSON.stringify(Object.keys(sent).sort()) === JSON.stringify([...(ev.paramKeys ?? [])].sort()) : null;
    row[pass] = { fired: true, toolName: a.tool, keysOk, verdict: a.verdict, action: a.action, hardSink: a.hardSink, tainted: a.tainted, private: a.private, reason: a.reasons?.[0] };
  }
  return row;
});
const errors = audit.filter((a) => a.kind === "error");

// ---- report -----------------------------------------------------------------------------------
const L = [];
const fired = (p) => runtime.filter((r) => r[p]?.fired).length;
L.push(`# Contract sweep: ${run}`, "");
L.push(`- Tools with schemas: ${Object.keys(manifest).length} (${Object.values(manifest).filter((m) => m.direct).length} direct); unparsed describe results: ${unparsed.length}`);
L.push(`- Sweep calls: ${calls.length}; fired before_tool_call: clean ${fired("clean")}, tainted ${fired("tainted")}`);
L.push(`- Guard audit records: ${audit.length}; Guard errors: ${errors.length}`);
L.push(`- Steps: ${steps.map((s) => `${s.step}=${s.exit}`).join(" ")}`, "");

L.push("## Registry coverage", "");
const missing = coverage.filter((c) => c.status === "missing");
L.push(`**Tools with no registry entry (Guard infers a spec):** ${missing.length ? missing.map((c) => `\`${c.name}\``).join(", ") : "none"}`, "");
L.push("| Tool | Category | Unmapped params | Stale registry params | Actions not in registry (fallback) | Registry actions not in schema |", "|---|---|---|---|---|---|");
for (const c of coverage.filter((x) => x.status === "known")) {
  if (!c.unmapped.length && !c.stale.length && !c.missingActions.length && !c.staleActions.length) continue;
  L.push(`| \`${c.name}\`${c.canonical !== c.name ? ` (→${c.canonical})` : ""} | ${c.category} | ${c.unmapped.map((u) => `${u.leaf} (${u.fallback})`).join(", ") || "-"} | ${c.stale.join(", ") || "-"} | ${c.missingActions.map((a) => `${a.action}`).join(", ") || "-"} | ${c.staleActions.join(", ") || "-"} |`);
}
const clean = coverage.filter((x) => x.status === "known" && !x.unmapped.length && !x.stale.length && !x.missingActions.length && !x.staleActions.length);
L.push("", `Fully consistent: ${clean.map((c) => `\`${c.name}\``).join(", ") || "none"}`, "");
L.push(`Registry tools not offered in this install: ${unswept.map((n) => `\`${n}\``).join(", ") || "none"}`, "");

L.push("## Runtime", "");
const notFired = runtime.filter((r) => !r.clean?.fired || !r.tainted?.fired);
L.push(`**Not seen by the Guard (clean or tainted):** ${notFired.length || "none"}`, "");
for (const r of notFired) L.push(`- \`${r.label}\`: ${(r.clean?.fired ? "" : `clean: ${r.clean?.note}`) || `tainted: ${r.tainted?.note}`}`);
L.push("");
const badKeys = runtime.filter((r) => r.clean?.keysOk === false || r.tainted?.keysOk === false);
L.push(`**Params changed on the way to the hook:** ${badKeys.length ? badKeys.map((r) => `\`${r.label}\``).join(", ") : "none"}`, "");
const sideAllowed = runtime.filter((r) => r.tainted?.fired && r.tainted.verdict === "allow" && (specOf(r.tool)?.actions?.[r.action]?.category ?? specOf(r.tool)?.category ?? "unknown") !== "read_only");
L.push(`**Side-effecting calls allowed in the tainted+private session (review):** ${sideAllowed.length}`, "");
for (const r of sideAllowed) L.push(`- \`${r.label}\`: ${r.tainted.reason ?? ""}`);
L.push("", "| # | Call | Clean | Tainted+private |", "|---|---|---|---|");
for (const r of runtime) {
  const f = (x) => (!x?.fired ? "not seen" : `${x.verdict}${x.hardSink ? " (hard sink)" : ""}${x.keysOk === false ? " ⚠ keys" : ""}${x.tainted === false && x.private === false ? "" : ` [${x.tainted ? "T" : ""}${x.private ? "P" : ""}]`}`);
  L.push(`| ${r.i} | \`${r.label}\` | ${f(r.clean)} | ${f(r.tainted)} |`);
}
if (errors.length) {
  L.push("", "## Guard errors", "");
  for (const e of errors.slice(0, 30)) L.push(`- ${e.tool}: ${String(e.error).slice(0, 200)}`);
}
if (unparsed.length) {
  L.push("", "## Unparsed tool_describe results", "");
  for (const u of unparsed) L.push(`- \`${u.askedId}\`: ${u.text.replace(/\n/g, " ").slice(0, 160)}`);
}
console.log(L.join("\n"));
writeFileSync(`${run}/contract-summary.json`, JSON.stringify({ coverage, runtime, unswept, errors: errors.length }, null, 2));
