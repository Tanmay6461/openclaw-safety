// Turns one Phase 0 run's logs into a markdown report. Usage: node analyze.mjs <runDir>
import fs from "node:fs";

const run = process.argv[2];
const read = (f) =>
  fs.existsSync(f)
    ? fs
        .readFileSync(f, "utf8")
        .split("\n")
        .filter(Boolean)
        .flatMap((l) => {
          try {
            return [JSON.parse(l)];
          } catch {
            return [];
          }
        })
    : [];

const probe = read(`${run}/probe.jsonl`);
const mock = read(`${run}/mock.jsonl`);
const steps = read(`${run}/steps.jsonl`);
const chats = mock.filter((m) => m.kind === "chat");
const out = [];
const p = (s = "") => out.push(s);
const cell = (v) => (v === undefined || v === null || v === "" ? "—" : String(typeof v === "object" ? JSON.stringify(v) : v).replaceAll("|", "\\|"));
const stepAt = (t) => steps.find((s) => t >= s.start && t <= s.end + 2000)?.step ?? "(between steps)";
// OpenClaw strips non-alphanumerics from tool call ids before sending them to the provider.
const wireId = (id) => String(id ?? "").replace(/[^A-Za-z0-9]/g, "");
const ev = (e) => e.event ?? {};
const ctx = (e) => e.ctx ?? {};

p("# Phase 0 runtime report");
p(`Run: \`${run}\` · probe events: ${probe.length} · model calls: ${chats.length}`);

p("\n## Steps");
p("| Step | Exit | Seconds |\n|---|---|---|");
for (const s of steps) p(`| ${s.step} | ${s.exit} | ${((s.end - s.start) / 1000).toFixed(1)} |`);

p("\n## Hooks that fired");
const counts = {};
for (const e of probe) counts[e.hook] = (counts[e.hook] ?? 0) + 1;
p(Object.entries(counts).sort().map(([h, n]) => `\`${h}\` ×${n}`).join(", ") || "none");

// Tool hook coverage: every executed tool call should have passed through before_tool_call.
p("\n## Tool hook coverage");
p("| Step | Tool | Call id | before_tool_call | Error | Params seen by after_tool_call |\n|---|---|---|---|---|---|");
const befores = new Map(probe.filter((e) => e.hook === "before_tool_call").map((e) => [ev(e).toolCallId, e]));
let uncovered = 0;
for (const a of probe.filter((e) => e.hook === "after_tool_call")) {
  const id = ev(a).toolCallId;
  const b = befores.get(id);
  const err = ev(a).error ? String(ev(a).error).slice(0, 80) : "";
  if (!b && !err) uncovered++;
  p(`| ${stepAt(a.t)} | ${cell(ev(a).toolName)} | ${cell(id)} | ${b ? `yes (as \`${ev(b).toolName}\`)` : "**no**"} | ${cell(err)} | ${cell(JSON.stringify(ev(a).params).slice(0, 120))} |`);
}
p(`\n**Executed without before_tool_call (no error):** ${uncovered}${uncovered ? " ← bypass" : ""}`);

// Q1: ordering of tool_result_persist relative to the next model call that carries the result.
p("\n## Q1: `tool_result_persist` before the next model call");
p("| Step | Tool | Call id | Persisted at | Next model call with this result | Gap (ms) | Model saw persisted copy |\n|---|---|---|---|---|---|---|");
let late = 0;
let seenStamp = 0;
const persists = probe.filter((e) => e.hook === "tool_result_persist");
for (const e of persists) {
  const id = ev(e).toolCallId ?? ctx(e).toolCallId;
  const chat = chats.find((c) => c.toolResults?.some((r) => r.toolCallId === wireId(id) || r.toolCallId === id));
  const stamped = Boolean(e.marker && chat?.toolResults?.some((r) => r.markers.includes(e.marker)));
  if (stamped) seenStamp++;
  if (chat && chat.ts < e.t) late++;
  p(`| ${stepAt(e.t)} | ${cell(ev(e).toolName ?? ctx(e).toolName)} | ${cell(id)} | ${e.t} | ${chat ? `#${chat.seq}` : "none (run ended)"} | ${chat ? chat.ts - e.t : "—"} | ${chat ? (stamped ? "yes" : "no") : "—"} |`);
}
p(`\n**Verdict:** ${persists.length === 0 ? "no tool_result_persist events" : late === 0 ? "PASS: tool_result_persist always ran before the next model call" : `FAIL: ${late} result(s) reached the model before persisting`}. Persisted copy shown to the model in-run: ${seenStamp}/${persists.length}.`);

// Q2: identity and trigger per session.
p("\n## Q2: identity and trigger");
const bySession = new Map();
const row = (key) => {
  if (!bySession.has(key)) bySession.set(key, { steps: new Set(), triggers: new Set(), owner: new Set(), provenance: new Set(), jobIds: new Set(), requesters: new Set() });
  return bySession.get(key);
};
for (const e of probe) {
  const key = ctx(e).sessionKey ?? "(no sessionKey)";
  if (e.hook === "before_agent_run" || e.hook === "agent_turn_prepare") {
    const r = row(key);
    r.steps.add(stepAt(e.t));
    if (ctx(e).trigger !== undefined) r.triggers.add(ctx(e).trigger);
    if (ctx(e).jobId !== undefined) r.jobIds.add(ctx(e).jobId);
    if (ctx(e).inputProvenance !== undefined) r.provenance.add(JSON.stringify(ctx(e).inputProvenance));
    if (e.hook === "before_agent_run") r.owner.add(String(ev(e).senderIsOwner));
  }
  if (e.hook === "before_tool_call") {
    const r = row(key);
    r.steps.add(stepAt(e.t));
    r.requesters.add(JSON.stringify(ctx(e).requester ?? null));
  }
}
p("| sessionKey | Steps | trigger | before_agent_run senderIsOwner | inputProvenance | jobId | before_tool_call requester |\n|---|---|---|---|---|---|---|");
for (const [k, r] of bySession) {
  const j = (s) => (s.size ? [...s].join("; ") : "");
  p(`| ${cell(k)} | ${cell(j(r.steps))} | ${cell(j(r.triggers))} | ${cell(j(r.owner))} | ${cell(j(r.provenance))} | ${cell(j(r.jobIds))} | ${cell(j(r.requesters))} |`);
}

// Q6: param race between a high-priority and a low-priority before_tool_call handler.
p("\n## Q6: whose `params` win");
const high = probe.find((e) => e.hook === "before_tool_call:race-high");
const low = probe.find((e) => e.hook === "before_tool_call:race-low");
const execs = probe.filter((e) => e.hook === "after_tool_call" && ev(e).toolName === "exec").map((e) => ev(e).params?.command);
p(`- High-priority handler ran: ${Boolean(high)}; saw \`${cell(high?.sawParams?.command)}\``);
p(`- Low-priority handler ran: ${Boolean(low)}; saw \`${cell(low?.sawParams?.command)}\``);
p(`- exec commands reported by after_tool_call: ${execs.map((c) => `\`${c}\``).join(", ") || "none"}`);
const won = execs.includes("echo from-low-priority") ? "low (runs last): PASS for the Guard's plan" : execs.includes("echo from-high-priority") ? "high: the Guard's plan needs rework" : "undetermined";
p(`- **Winner:** ${won}`);

p("\n## Model requests");
const first = chats[0];
p(`- First request: stream=${first?.stream}, tools offered (${first?.toolsOffered?.length ?? 0}): ${(first?.toolsOffered ?? []).join(", ")}`);
p(`- Scenarios seen: ${[...new Set(chats.map((c) => `${c.scenario}${c.requestedScenario ? "" : " (default)"}`))].join(", ")}`);
const unhandled = mock.filter((m) => m.kind === "unhandled" || m.kind === "error");
p(`- Unhandled or failed mock routes: ${unhandled.map((u) => `${u.method ?? ""} ${u.path} ${u.error ?? ""}`).join("; ") || "none"}`);
const schemas = mock.find((m) => m.kind === "toolSchemas");
if (schemas) {
  p("\n### Meta-tool schemas");
  for (const t of schemas.tools) p(`- \`${t.name}\`: ${cell(JSON.stringify(t.parameters)).slice(0, 600)}`);
}

console.log(out.join("\n"));
