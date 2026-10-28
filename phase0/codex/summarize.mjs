// Short Markdown summary of one Codex probe run. Usage: node summarize.mjs <runDir>
// Reads steps.jsonl, probe.jsonl (pg-probe), mock.jsonl (mock-responses.mjs), out/*.txt and the workspace.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const run = process.argv[2];
if (!run) {
  console.error("usage: summarize.mjs <runDir>");
  process.exit(2);
}

const jsonl = (file) =>
  existsSync(file)
    ? readFileSync(file, "utf8").split("\n").filter(Boolean).flatMap((line) => {
        try {
          return [JSON.parse(line)];
        } catch {
          return [];
        }
      })
    : [];
const short = (v, max = 300) => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s && s.length > max ? `${s.slice(0, max)}…[+${s.length - max}]` : (s ?? "");
};
const cell = (v, max) => short(v, max).replaceAll("|", "\\|").replaceAll("\n", "\\n");
const readOut = (name) => {
  const f = path.join(run, "out", `${name}.txt`);
  return existsSync(f) ? readFileSync(f, "utf8") : "";
};
const parseLooseJson = (t) => {
  const i = t.indexOf("{");
  if (i < 0) return undefined;
  try {
    return JSON.parse(t.slice(i));
  } catch {
    return undefined;
  }
};
/** Collects [path, value] pairs whose key matches re, depth-limited. */
function findKeys(obj, re, prefix = "", out = [], depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 8 || out.length > 20) return out;
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (re.test(k) && (typeof v !== "object" || v === null)) out.push([p, v]);
    else findKeys(v, re, p, out, depth + 1);
  }
  return out;
}

const lines = [`# Codex probe: ${path.basename(run)}`, ""];

lines.push("## Steps", "", "| step | exit | seconds |", "|---|---|---|");
for (const s of jsonl(path.join(run, "steps.jsonl"))) lines.push(`| ${s.step} | ${s.exit} | ${((s.end - s.start) / 1000).toFixed(1)} |`);
lines.push("");

const inspect = parseLooseJson(readOut("plugin-inspect-codex"));
lines.push("## Codex plugin", "");
if (inspect) {
  for (const [k, v] of findKeys(inspect, /^(id|origin|status|source|rootDir|packageName|version|enabled|error|agentHarnessIds|reason)$/i).slice(0, 16)) {
    lines.push(`- ${k}: ${cell(v, 200)}`);
  }
} else {
  lines.push("- plugin inspect output not JSON; see out/plugin-inspect-codex.txt");
}
const gwLog = existsSync(path.join(run, "gateway.log")) ? readFileSync(path.join(run, "gateway.log"), "utf8") : "";
const codexLogLines = gwLog.split("\n").filter((l) => /codex|harness|native compaction|app-server/i.test(l) && /(error|warn|fail|refus|reject)/i.test(l));
if (codexLogLines.length) {
  lines.push("", "Gateway log lines mentioning Codex errors (first 10):", "", "```");
  lines.push(...codexLogLines.slice(0, 10).map((l) => short(l, 400)));
  lines.push("```");
}
lines.push("");

const mock = jsonl(path.join(run, "mock.jsonl"));
const requests = mock.filter((r) => r.kind === "request");
const replies = mock.filter((r) => r.kind === "reply");
lines.push(
  "## Mock (Responses API)",
  "",
  `- requests: ${requests.length} (http), websocket upgrades refused: ${mock.filter((r) => r.kind === "ws-upgrade-refused").length}, other: ${mock
    .filter((r) => !["request", "reply", "ws-upgrade-refused"].includes(r.kind))
    .map((r) => `${r.kind} ${r.method ?? ""} ${r.url ?? ""}`.trim())
    .join("; ") || "none"}`,
);
const withTools = requests.find((r) => Array.isArray(r.toolNames) && r.toolNames.length > 0);
if (withTools) {
  lines.push(`- tools offered to the model (req ${withTools.req}, ${withTools.toolNames.length}):`);
  for (const t of withTools.toolNames) {
    lines.push(`  - \`${t.namespace ? `${t.namespace}.` : ""}${t.name}\` (${t.type}${t.format ? `, ${t.format}` : ""})${t.params ? ` params: ${t.params.join(", ")}` : ""}`);
  }
}
lines.push("", "| req | scenario | step | child | reply |", "|---|---|---|---|---|");
for (const r of replies) lines.push(`| ${r.req} | ${r.scenario} | ${r.step} | ${r.child} | ${cell(r.reply, 220)} |`);
const outputs = replies.flatMap((r) => r.priorOutputs ?? []).filter((o, i, all) => all.findIndex((x) => x.call_id === o.call_id) === i);
if (outputs.length) {
  lines.push("", "Tool outputs Codex sent back:", "");
  for (const o of outputs) lines.push(`- ${o.type} ${o.call_id}: ${cell(o.output, 300)}`);
}
lines.push("");

const probe = jsonl(path.join(run, "probe.jsonl"));
const btc = probe.filter((r) => r.hook === "before_tool_call");
lines.push("## before_tool_call (pg-probe)", "", "| seq | toolName | params | toolCallId | sessionKey | cwd |", "|---|---|---|---|---|---|");
for (const r of btc) {
  const e = r.event ?? {};
  const c = r.ctx ?? {};
  lines.push(`| ${r.seq} | \`${e.toolName}\` | ${cell(e.params, 260)} | ${cell(e.toolCallId, 40)} | ${cell(c.sessionKey, 40)} | ${cell(c.cwd ?? c.workspaceDir, 60)} |`);
}
if (btc.length === 0) lines.push("| - | (none recorded) | | | | |");
const extraKeys = [...new Set(btc.flatMap((r) => Object.keys(r.event ?? {})))];
const ctxKeys = [...new Set(btc.flatMap((r) => Object.keys(r.ctx ?? {})))];
if (btc.length) lines.push("", `event keys: ${extraKeys.join(", ")}`, `ctx keys: ${ctxKeys.join(", ")}`);
const atc = probe.filter((r) => r.hook === "after_tool_call");
if (atc.length) {
  lines.push("", "after_tool_call:", "");
  for (const r of atc) lines.push(`- \`${r.event?.toolName}\` params ${cell(r.event?.params, 160)} result ${cell(r.event?.result ?? r.event?.error, 200)}`);
}
lines.push("");

lines.push("## Agent results", "");
for (const sc of ["default", "codex-shell", "codex-patch", "codex-spawn"]) {
  const t = readOut(sc);
  if (!t) continue;
  const j = parseLooseJson(t);
  const runtime = j ? findKeys(j, /harness|runtime|provider|model$/i).slice(0, 6) : [];
  const texts = j ? findKeys(j, /^(text|reply|finalText|message)$/i).slice(0, 2) : [];
  lines.push(`- ${sc}: ${runtime.map(([k, v]) => `${k}=${cell(v, 60)}`).join(", ") || "(no runtime keys)"}; ${texts.map(([k, v]) => `${k}=${cell(v, 120)}`).join(", ") || cell(t, 200)}`);
}
lines.push("");

const ws = path.join(run, "state", "workspace");
const patched = path.join(ws, "pg-codex.txt");
lines.push("## Workspace", "", `- pg-codex.txt: ${existsSync(patched) ? JSON.stringify(readFileSync(patched, "utf8")) : "missing"}`);
const guardDir = path.join(run, "guard-state");
if (existsSync(guardDir)) {
  for (const f of readdirSync(guardDir)) {
    const p = path.join(guardDir, f);
    if (statSync(p).isFile()) lines.push(`- guard-state/${f}: ${statSync(p).size} bytes`);
  }
}
console.log(lines.join("\n"));
