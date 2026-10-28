// Summarizes one Phase 0 channel run (driver.jsonl + probe.jsonl + mock.jsonl) as markdown.
// Usage: node analyze-channel.mjs <runDir>
import fs from "node:fs";

const run = process.argv[2];
const read = (f) =>
  fs.existsSync(f)
    ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } })
    : [];
const probe = read(`${run}/probe.jsonl`);
const driver = read(`${run}/driver.jsonl`);
const mock = read(`${run}/mock.jsonl`).filter((m) => m.kind === "chat");
const out = [];
const p = (s = "") => out.push(s);
const j = (v) => (v === undefined ? "—" : JSON.stringify(v)).replaceAll("|", "\\|");

// Test windows: from a test's "start" to the next test's "start".
const starts = driver.filter((d) => d.step === "start");
const windows = starts.map((s, i) => ({ test: s.test, from: s.t, to: starts[i + 1]?.t ?? Infinity }));
const testAt = (t) => windows.find((w) => t >= w.from && t < w.to)?.test ?? "(setup)";

p(`# Phase 0 channel report`);
p(`Run: \`${run}\` · probe events: ${probe.length} · model calls: ${mock.length}`);

p("\n## Driver steps");
p("| Test | Step | Note |\n|---|---|---|");
for (const d of driver) if (d.step !== "start" && d.step !== "inbound") p(`| ${d.test ?? ""} | ${d.step} | ${String(d.note ?? "").replaceAll("|", "\\|").slice(0, 200)} |`);

p("\n## message_received (event, ctx)");
p("| Test | event.from | event.metadata/sender | ctx |\n|---|---|---|---|");
for (const e of probe.filter((e) => e.hook === "message_received")) {
  const ev = e.event ?? {};
  p(`| ${testAt(e.t)} | ${j(ev.from)} | ${j({ senderId: ev.senderId ?? ev.metadata?.senderId, senderName: ev.metadata?.senderName, provider: ev.metadata?.provider, surface: ev.metadata?.surface, chatType: ev.metadata?.chatType ?? ev.metadata?.ChatType })} | ${j(e.ctx).slice(0, 300)} |`);
}

p("\n## before_agent_run");
p("| Test | sessionKey | trigger | senderIsOwner | inputProvenance | channel / sender |\n|---|---|---|---|---|---|");
for (const e of probe.filter((e) => e.hook === "before_agent_run")) {
  p(`| ${testAt(e.t)} | ${j(e.ctx?.sessionKey)} | ${j(e.ctx?.trigger)} | ${j(e.event?.senderIsOwner)} | ${j(e.ctx?.inputProvenance)} | ${j({ ch: e.ctx?.channelId ?? e.ctx?.messageProvider, sender: e.ctx?.senderId ?? e.event?.senderId })} |`);
}

p("\n## before_tool_call requester");
p("| Test | sessionKey | tool | params | ctx.requester |\n|---|---|---|---|---|");
for (const e of probe.filter((e) => e.hook === "before_tool_call")) {
  p(`| ${testAt(e.t)} | ${j(e.ctx?.sessionKey)} | ${j(e.event?.toolName)} | ${j(e.event?.params).slice(0, 140)} | ${j(e.ctx?.requester)} |`);
}

p("\n## Commands, approvals");
for (const e of probe.filter((e) => e.hook.startsWith("__command") || e.hook.startsWith("__approval"))) {
  const { t, seq, ctx, ...rest } = e;
  p(`- ${testAt(t)}: \`${e.hook}\` ${j(rest).slice(0, 400)}${ctx ? ` ctx=${j({ senderId: ctx.senderId, channel: ctx.channel, isAuthorizedSender: ctx.isAuthorizedSender, senderIsOwner: ctx.senderIsOwner, gatewayClientScopes: ctx.gatewayClientScopes, sessionKey: ctx.sessionKey, from: ctx.from, to: ctx.to })}` : ""}`);
}

p("\n## after_tool_call");
p("| Test | sessionKey | tool | params | error |\n|---|---|---|---|---|");
for (const e of probe.filter((e) => e.hook === "after_tool_call")) {
  p(`| ${testAt(e.t)} | ${j(e.ctx?.sessionKey)} | ${j(e.event?.toolName)} | ${j(e.event?.params).slice(0, 140)} | ${j(e.event?.error).slice(0, 160)} |`);
}

p("\n## Hook counts");
const counts = {};
for (const e of probe) counts[e.hook] = (counts[e.hook] ?? 0) + 1;
p(Object.entries(counts).sort().map(([h, n]) => `\`${h}\` ×${n}`).join(", "));

console.log(out.join("\n"));
