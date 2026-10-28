// Phase 0 channel-test driver. Runs inside the container next to the Gateway, the QA bus, and the mock.
// Injects qa-channel inbound messages as alice (owner) and bob (non-owner), waits on the probe log and the
// bus, and writes one JSONL line per test step to $RUN/driver.jsonl.
// Usage: node driver.mjs <runDir> <busUrl> <testsCsv>
import { execFile } from "node:child_process";
import fs from "node:fs";

const [run, bus, testsCsv = "all"] = process.argv.slice(2);
const OC = process.env.OC ?? "/pg/oc/node_modules/.bin/openclaw";
const only = new Set(testsCsv.split(","));
const selected = (t) => only.has("all") || only.has(t) || only.has(t.split("-")[0]);
// The slash-session warm-up runs whenever an approval test (c*, e*) is selected.
const approvalTests = [...only].some((t) => /^[ce]\d/.test(t)) || only.has("all");
const want = (t) => (t === "w-slash" ? approvalTests : selected(t));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = (rec) => {
  fs.appendFileSync(`${run}/driver.jsonl`, `${JSON.stringify({ t: Date.now(), ...rec })}\n`);
  console.log(`[driver] ${rec.test ?? ""} ${rec.step ?? ""} ${rec.note ?? ""}`.trim());
};

const readJsonl = (f) =>
  fs.existsSync(f)
    ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } })
    : [];
const probe = () => readJsonl(`${run}/probe.jsonl`);

async function post(path, body) {
  const res = await fetch(`${bus}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} ${res.status} ${JSON.stringify(json)}`);
  return json;
}
const state = async () => (await fetch(`${bus}/v1/state`)).json();

const DM = (who) => ({ id: who, kind: "direct" });
const GROUP = { id: "lab", kind: "group", title: "Lab group" };

async function send(test, sender, conversation, text, nativeCommand) {
  const r = await post("/v1/inbound/message", { conversation, senderId: sender, senderName: sender, text, ...(nativeCommand ? { nativeCommand } : {}) });
  out({ test, step: "inbound", sender, conversation, text, nativeCommand, messageId: r.message?.id });
  return r.message;
}

// qa-channel handles plain-text inbound through one global queue that waits for each dispatch, so a text
// "/approve" sits behind the run that is blocked on the approval (seen in run ch-base2). Native commands
// skip that queue, as in the repo's own qa/scenarios/channels/system-agent-chat-approval.yaml.
const approve = (test, sender, conversation, id, decision = "allow-once") =>
  send(test, sender, conversation, `/approve ${id} ${decision}`, { name: "approve" });

/** Waits until fn() returns a truthy value, or the timeout passes (then returns undefined). */
async function until(fn, timeoutMs = 60000, every = 500) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await sleep(every);
  }
  return undefined;
}

/** Outbound bus messages after a given time, optionally matching text. */
async function outbound(sinceTs, re) {
  const s = await state();
  return (s.messages ?? []).filter((m) => m.direction === "outbound" && (m.timestamp ?? 0) >= sinceTs && (!re || re.test(m.text ?? "")));
}

const probeSince = (t0, pred) => probe().filter((e) => e.t >= t0 && pred(e));

/** The Provenance Guard's audit log (guard variants only). */
const guardAudit = () => {
  try {
    return fs.readFileSync(`${run}/guard-state/audit.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
};

/** Waits for an agent_end at or after t0 (optionally for a session key substring). */
const agentEnd = (t0, keyPart, timeoutMs = 90000) =>
  until(() => probeSince(t0, (e) => e.hook === "agent_end" && (!keyPart || String(e.ctx?.sessionKey ?? "").includes(keyPart)))[0], timeoutMs);

function cli(test, args, timeoutMs = 200000) {
  return new Promise((resolve) => {
    execFile(OC, args, { timeout: timeoutMs, maxBuffer: 1 << 24 }, (err, stdout, stderr) => {
      out({ test, step: "cli", args, exit: err?.code ?? 0, stdout: String(stdout).slice(-1500), stderr: String(stderr).slice(-1500) });
      resolve({ err, stdout, stderr });
    });
  });
}

/** Waits for the approval prompt that the Gateway posts to the chat, and returns its id. */
async function approvalPrompt(test, t0, timeoutMs = 60000) {
  const req = await until(() => probeSince(t0, (e) => e.hook === "__approval_request")[0], timeoutMs);
  const msg = await until(async () => (await outbound(t0, /plugin:[\w-]+|\/approve/i))[0], timeoutMs);
  const id = /\/approve\s+(\S+)/.exec(msg?.text ?? "")?.[1] ?? /(plugin:[\w:-]+)/.exec(msg?.text ?? "")?.[1];
  out({ test, step: "approval-prompt", note: id ? `id=${id}` : "NO PROMPT", approvalRequested: Boolean(req), id, prompt: msg ?? null });
  return id;
}

const resolutionSince = (t0) => probeSince(t0, (e) => e.hook === "__approval_resolution");

async function recordResolution(test, t0, waitMs) {
  const r = await until(() => resolutionSince(t0)[0], waitMs);
  out({ test, step: "resolution", note: r ? `decision=${r.decision}` : `none within ${waitMs}ms`, resolution: r ?? null });
  return r;
}

async function dumpBus(test) {
  fs.writeFileSync(`${run}/bus-state.${test}.json`, JSON.stringify(await state(), null, 2));
}

const tests = {
  // Warm-up for the approval tests. A sender's first native command creates their slash session
  // (agent:main:qa-channel:slash:<sender>); creating a session bumps the Gateway access revision,
  // which fails any pending approval closed ("Approval requester authority changed"). So open
  // both slash sessions before an approval is pending. /guardauth because the probe and the Guard
  // both register /guard in the guard variant.
  async "w-slash"() {
    for (const sender of ["alice", "bob"]) {
      const test = `w-slash-${sender}`;
      const t0 = Date.now();
      await send(test, sender, DM(sender), "/guardauth warmup", { name: "guardauth" });
      await sleep(4000);
      out({ test, step: "result", note: `replies=${(await outbound(t0)).length}` });
    }
  },

  // (a) owner vs non-owner tool calls in DMs and in a group.
  async "a-dm-alice"() {
    const t0 = Date.now();
    await send("a-dm-alice", "alice", DM("alice"), "Owner DM probe. [scenario:persist-order]");
    out({ test: "a-dm-alice", step: "agent_end", note: (await agentEnd(t0)) ? "ok" : "TIMEOUT" });
  },
  async "a-dm-bob"() {
    const t0 = Date.now();
    await send("a-dm-bob", "bob", DM("bob"), "Non-owner DM probe. [scenario:persist-order]");
    out({ test: "a-dm-bob", step: "agent_end", note: (await agentEnd(t0)) ? "ok" : "TIMEOUT" });
  },
  async "a-group-alice"() {
    const t0 = Date.now();
    await send("a-group-alice", "alice", GROUP, "@openclaw Owner group probe. [scenario:persist-order]");
    out({ test: "a-group-alice", step: "agent_end", note: (await agentEnd(t0)) ? "ok" : "TIMEOUT" });
  },
  async "a-group-bob"() {
    const t0 = Date.now();
    await send("a-group-bob", "bob", GROUP, "@openclaw Non-owner group probe. [scenario:persist-order]");
    out({ test: "a-group-bob", step: "agent_end", note: (await agentEnd(t0)) ? "ok" : "TIMEOUT" });
  },

  // (b) /guard (requiredScopes operator.admin) and /guardauth (requireAuth only) from each sender.
  async b() {
    for (const [sender, conv] of [["alice", DM("alice")], ["bob", DM("bob")], ["bob", GROUP], ["alice", GROUP]]) {
      for (const [cmd, native] of [["/guard status"], ["/guardauth status"], ["/guard status", true]]) {
        const name = cmd.slice(1).split(" ")[0];
        const test = `b-${name}${native ? "-native" : ""}-${sender}-${conv.kind}`;
        const t0 = Date.now();
        await send(test, sender, conv, cmd, native ? { name } : undefined);
        await sleep(6000);
        const cmds = probeSince(t0, (e) => e.hook === "__command");
        const replies = await outbound(t0);
        const ran = probeSince(t0, (e) => e.hook === "before_agent_run");
        out({ test, step: "result", note: `handler=${cmds.length > 0} replies=${replies.length} agentRun=${ran.length > 0}`, handlerRan: cmds.length > 0, command: cmds[0] ?? null, replies: replies.map((m) => m.text), agentRun: ran.length > 0 });
      }
    }
  },

  // (c1) owner approves in the same DM.
  async "c1-owner"() {
    const test = "c1-owner";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "Approval probe. [scenario:approve-low]");
    const id = await approvalPrompt(test, t0);
    if (!id) return;
    const t1 = Date.now();
    await approve(test, "alice", DM("alice"), id, "allow-once");
    await recordResolution(test, t1, 20000);
    out({ test, step: "agent_end", note: (await agentEnd(t0)) ? "ok" : "TIMEOUT", replies: (await outbound(t1)).map((m) => m.text) });
    await dumpBus(test);
  },

  // (c2) non-owner tries to approve, from his own DM and from a shared group; the owner then denies.
  async "c2-bob-dm"() {
    const test = "c2-bob-dm";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "Approval probe. [scenario:approve-low]");
    const id = await approvalPrompt(test, t0);
    if (!id) return;
    const t1 = Date.now();
    await approve(test, "bob", DM("bob"), id, "allow-once");
    const r = await recordResolution(test, t1, 15000);
    out({ test, step: "bob-replies", replies: (await outbound(t1)).map((m) => ({ to: m.conversation?.id, text: m.text })) });
    if (!r) {
      const t2 = Date.now();
      await approve(test, "alice", DM("alice"), id, "deny");
      await recordResolution(test, t2, 15000);
    }
    await agentEnd(t0);
    await dumpBus(test);
  },
  async "c2-bob-group"() {
    const test = "c2-bob-group";
    const t0 = Date.now();
    await send(test, "alice", GROUP, "@openclaw Group approval probe. [scenario:approve-low]");
    const id = await approvalPrompt(test, t0);
    if (!id) return;
    const t1 = Date.now();
    await approve(test, "bob", GROUP, id, "allow-once");
    const r = await recordResolution(test, t1, 15000);
    out({ test, step: "bob-replies", replies: (await outbound(t1)).map((m) => ({ to: m.conversation?.id, text: m.text })) });
    if (!r) {
      const t2 = Date.now();
      await approve(test, "alice", GROUP, id, "deny");
      await recordResolution(test, t2, 15000);
    }
    await agentEnd(t0);
    await dumpBus(test);
  },

  // (c3) the agent itself sends "/approve <id>" into the owner's DM with the message tool. The sending run
  // is a separate session (the requesting run is blocked on the approval): a Gateway CLI turn.
  async "c3-self-cli"() {
    const test = "c3-self-cli";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "Approval probe. [scenario:approve-low]");
    const id = await approvalPrompt(test, t0);
    if (!id) return;
    const t1 = Date.now();
    await cli(test, ["agent", "--agent", "main", "--session-key", "pg-self-approve", "--message", `Self approve. [scenario:message-approve-meta] APPROVAL_ID=${id} TARGET=dm:alice`, "--json", "--timeout", "120"]);
    const r = await recordResolution(test, t1, 10000);
    out({ test, step: "echo-outbound", messages: (await outbound(t1)).map((m) => ({ to: m.conversation?.id, senderId: m.senderId, text: m.text })) });
    if (!r) {
      const t2 = Date.now();
      await approve(test, "alice", DM("alice"), id, "deny");
      await recordResolution(test, t2, 15000);
    }
    await agentEnd(t0);
    await dumpBus(test);
  },
  // (A bob-DM relay variant is not possible on qa-channel: bob's text DM would wait in the same global
  // inbound queue as alice's blocked run, so it would only run after the approval expired.)
  // (c3b) the same message tool echo, but sending "/guard status" into alice's DM.
  async "c3-guard-echo"() {
    const test = "c3-guard-echo";
    const t0 = Date.now();
    await cli(test, ["agent", "--agent", "main", "--session-key", "pg-self-guard", "--message", "Echo guard. [scenario:message-guard-meta] TARGET=dm:alice", "--json", "--timeout", "120"]);
    await sleep(5000);
    const cmds = probeSince(t0, (e) => e.hook === "__command");
    out({ test, step: "result", note: `handler=${cmds.length > 0}`, command: cmds[0] ?? null, messages: (await outbound(t0)).map((m) => ({ to: m.conversation?.id, text: m.text })) });
  },
  // (c4) the agent resolves its own pending approval through exec + the Gateway CLI (token from env).
  async "c4-exec-cli"() {
    const test = "c4-exec-cli";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "Approval probe. [scenario:approve-low]");
    const id = await approvalPrompt(test, t0);
    if (!id) return;
    const t1 = Date.now();
    await cli(test, ["agent", "--agent", "main", "--session-key", "pg-self-exec", "--message", `Self approve via exec. [scenario:exec-approve] APPROVAL_ID=${id} CONFIG=${process.env.OPENCLAW_CONFIG_PATH} PORT=${process.env.OPENCLAW_GATEWAY_PORT}`, "--json", "--timeout", "120"]);
    const r = await recordResolution(test, t1, 10000);
    if (!r) {
      const t2 = Date.now();
      await approve(test, "alice", DM("alice"), id, "deny");
      await recordResolution(test, t2, 15000);
    }
    await agentEnd(t0);
    await dumpBus(test);
  },
  // (c4b) as c4, with `openclaw approvals resolve` (requests operator.admin, which sees every approval).
  async "c4b-approvals-cli"() {
    const test = "c4b-approvals-cli";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "Approval probe. [scenario:approve-low]");
    const id = await approvalPrompt(test, t0);
    if (!id) return;
    const t1 = Date.now();
    await cli(test, ["agent", "--agent", "main", "--session-key", "pg-self-exec-cli", "--message", `Self approve via exec. [scenario:exec-approve-cli] APPROVAL_ID=${id} CONFIG=${process.env.OPENCLAW_CONFIG_PATH} PORT=${process.env.OPENCLAW_GATEWAY_PORT}`, "--json", "--timeout", "120"]);
    const r = await recordResolution(test, t1, 10000);
    if (!r) {
      const t2 = Date.now();
      await approve(test, "alice", DM("alice"), id, "deny");
      await recordResolution(test, t2, 15000);
    }
    await agentEnd(t0);
    await dumpBus(test);
  },
  // (c4c) control: the operator (driver, outside any agent run) resolves with `openclaw approvals resolve`.
  async "c4c-operator-cli"() {
    const test = "c4c-operator-cli";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "Approval probe. [scenario:approve-low]");
    const id = await approvalPrompt(test, t0);
    if (!id) return;
    const t1 = Date.now();
    await cli(test, ["approvals", "resolve", id, "allow-once", "--url", `ws://127.0.0.1:${process.env.OPENCLAW_GATEWAY_PORT}`, "--token", process.env.OPENCLAW_GATEWAY_TOKEN]);
    await recordResolution(test, t1, 15000);
    await agentEnd(t0);
    const ran = probeSince(t0, (e) => e.hook === "tool_result_persist" && String(e.ctx?.sessionKey).includes("dm:alice")).map((e) => e.event?.message?.content?.[0]?.text);
    out({ test, step: "tool-result", ran });
  },
  // (c4d) control: an unrelated Gateway CLI agent turn while the approval is pending, then the owner approves.
  async "c4d-cli-turn"() {
    const test = "c4d-cli-turn";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "Approval probe. [scenario:approve-low]");
    const id = await approvalPrompt(test, t0);
    if (!id) return;
    await cli(test, ["agent", "--agent", "main", "--session-key", "pg-unrelated", "--message", "Unrelated. [scenario:default]", "--json", "--timeout", "120"]);
    const t1 = Date.now();
    const early = resolutionSince(t0)[0];
    out({ test, step: "after-cli-turn", note: early ? `already ${early.decision}` : "still pending", resolution: early ?? null });
    if (!early) {
      await approve(test, "alice", DM("alice"), id, "allow-once");
      await recordResolution(test, t1, 15000);
    }
    await agentEnd(t0);
    const ran = probeSince(t0, (e) => e.hook === "tool_result_persist" && String(e.ctx?.sessionKey).includes("dm:alice")).map((e) => e.event?.message?.content?.[0]?.text);
    out({ test, step: "tool-result", ran });
  },

  // (c4e) as c4b, but the self-approving exec runs in an isolated cron job (no `openclaw agent` CLI turn,
  // which by itself breaks a pending approval wait; see c4d).
  async "c4e-cron-exec"() {
    const test = "c4e-cron-exec";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "Approval probe. [scenario:approve-low]");
    const id = await approvalPrompt(test, t0);
    if (!id) return;
    const t1 = Date.now();
    const add = await cli(test, ["cron", "add", "pg self approve", "--agent", "main", "--every", "1h", "--session", "isolated", "--message", `Cron self approve. [scenario:exec-approve-cli] APPROVAL_ID=${id} CONFIG=${process.env.OPENCLAW_CONFIG_PATH} PORT=${process.env.OPENCLAW_GATEWAY_PORT}`, "--no-deliver", "--json"]);
    let job = "";
    try { const t = String(add.stdout); job = JSON.parse(t.slice(t.indexOf("{"))).id ?? ""; } catch {}
    out({ test, step: "cron-job", note: job || "NO JOB" });
    if (job) await cli(test, ["cron", "run", job, "--wait", "--wait-timeout", "120s", "--poll-interval", "1s"]);
    const r = await recordResolution(test, t1, 20000);
    if (!r) {
      const t2 = Date.now();
      await approve(test, "alice", DM("alice"), id, "deny");
      await recordResolution(test, t2, 15000);
    }
    await agentEnd(t0);
    const ran = probeSince(t0, (e) => e.hook === "tool_result_persist").map((e) => ({ s: e.ctx?.sessionKey, text: String(e.event?.message?.content?.[0]?.text).slice(0, 300) }));
    out({ test, step: "tool-result", ran, messages: (await outbound(t0)).map((m) => m.text) });
  },

  // (c4f) the same run asks for approval on one exec and, in a parallel exec, lists pending approvals and
  // resolves them with `openclaw approvals resolve` (no other agent run is started).
  async "c4f-same-run"() {
    const test = "c4f-same-run";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), `Parallel self approve. [scenario:self-approve-parallel] CONFIG=${process.env.OPENCLAW_CONFIG_PATH} PORT=${process.env.OPENCLAW_GATEWAY_PORT}`);
    const r = await recordResolution(test, t0, 60000);
    await agentEnd(t0, "dm:alice", 120000);
    const ran = probeSince(t0, (e) => e.hook === "tool_result_persist").map((e) => String(e.event?.message?.content?.[0]?.text).slice(0, 400));
    out({ test, step: "tool-result", note: r ? `decision=${r.decision}` : "no resolution", ran, messages: (await outbound(t0)).map((m) => m.text) });
  },

  // (c4g) the run first starts a background exec that waits, lists pending approvals and resolves them;
  // its next tool call asks for approval. No other agent run starts before the resolution.
  async "c4g-background"() {
    const test = "c4g-background";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), `Background self approve. [scenario:self-approve-background] CONFIG=${process.env.OPENCLAW_CONFIG_PATH} PORT=${process.env.OPENCLAW_GATEWAY_PORT}`);
    const r = await recordResolution(test, t0, 60000);
    await agentEnd(t0, "dm:alice", 120000);
    await sleep(5000);
    const ran = probeSince(t0, (e) => e.hook === "tool_result_persist").map((e) => String(e.event?.message?.content?.[0]?.text).slice(0, 400));
    out({ test, step: "tool-result", note: r ? `decision=${r.decision}` : "no resolution", ran, messages: (await outbound(t0)).map((m) => m.text) });
  },

  // (c5) another handler's requireApproval (high priority, with params) vs the low-priority params rewrite.
  async "c5-race"() {
    const test = "c5-race";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "Approval race. [scenario:approve-race]");
    const id = await approvalPrompt(test, t0);
    if (!id) return;
    const t1 = Date.now();
    await approve(test, "alice", DM("alice"), id, "allow-once");
    await recordResolution(test, t1, 20000);
    await agentEnd(t0);
    const after = probeSince(t0, (e) => e.hook === "after_tool_call" && e.event?.toolName === "exec").map((e) => e.event?.params?.command);
    out({ test, step: "exec-params", note: `ran=${JSON.stringify(after)}`, ran: after });
  },

  // (c6) both handlers ask for the same call: which prompt is shown, whose onResolution fires.
  async "c6-both"() {
    const test = "c6-both";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "Double approval. [scenario:approve-both]");
    const id = await approvalPrompt(test, t0);
    if (!id) return;
    const t1 = Date.now();
    await approve(test, "alice", DM("alice"), id, "allow-once");
    await recordResolution(test, t1, 20000);
    await agentEnd(t0);
    await sleep(3000);
    out({ test, step: "summary", requests: probeSince(t0, (e) => e.hook === "__approval_request").map((e) => e.where), resolutions: probeSince(t0, (e) => e.hook === "__approval_resolution").map((e) => `${e.where}:${e.decision}`), prompts: (await outbound(t0, /approve/i)).map((m) => m.text) });
  },

  // (e1) Guard ask plus host exec approval (plan §13 item 8). A tainted, unattested exec: under the
  // legacy tools.exec.ask "always" the Guard defers to the host prompt (expect 1 prompt); under
  // tools.exec.mode "ask" both ask (expect 2: the Guard's plugin approval, then the host's on-miss).
  // Every prompt is approved by alice.
  async "e1-double"() {
    const test = "e1-double";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "Double prompt probe. [scenario:double-prompt]");
    const seen = new Set();
    const prompts = [];
    const end = Date.now() + 180000;
    while (Date.now() < end) {
      for (const m of await outbound(t0, /approval required|\/approve /i)) {
        const id = /\/approve\s+(\S+)/.exec(m.text ?? "")?.[1];
        if (!id || seen.has(id)) continue;
        seen.add(id);
        prompts.push({ id, text: (m.text ?? "").slice(0, 400) });
        out({ test, step: "prompt", note: id });
        await approve(test, "alice", DM("alice"), id, "allow-once");
      }
      if (probeSince(t0, (e) => e.hook === "agent_end" && String(e.ctx?.sessionKey ?? "").includes("dm:alice"))[0]) break;
      await sleep(700);
    }
    await sleep(2000);
    const results = probeSince(t0, (e) => e.hook === "tool_result_persist").map((e) => String(e.event?.message?.content?.[0]?.text ?? "").slice(0, 200));
    const guard = guardAudit().filter((a) => a.ts >= t0).map((a) => ({ kind: a.kind ?? "decision", tool: a.tool, verdict: a.verdict, action: a.action, reason: a.reasons?.[0] }));
    out({ test, step: "summary", note: `prompts=${prompts.length} ran=${results.some((r) => r.includes("pg-double-prompt"))}`, prompts, results, guard });
  },

  // (r1) approval-emoji reactions through the message tool, with the Guard loaded: 👍 on the bot's own
  // message (block), 👍 on alice's inbound message (ack, allow), 🎉 on the bot's message (allow), 👍 with
  // no message id (allow: OpenClaw reacts to the current inbound message), 👍 with fromMe (block).
  async "r1-react"() {
    const test = "r1-react";
    let t0 = Date.now();
    const inMsg = await send(test, "alice", DM("alice"), "Hello there. [scenario:default]");
    await agentEnd(t0, "dm:alice");
    await sleep(1500);
    const bot = (await outbound(t0)).at(-1);
    t0 = Date.now();
    await send(test, "alice", DM("alice"), `React probe. [scenario:react-test] BOT=${bot?.id} IN=${inMsg?.id}`);
    await agentEnd(t0, "dm:alice", 120000);
    await sleep(2000);
    const decisions = guardAudit()
      .filter((a) => a.ts >= t0 && a.tool === "message")
      .map((a) => ({ callId: a.callId, verdict: a.verdict, action: a.action, reason: a.reasons?.[0] }));
    const received = probeSince(t0 - 60000, (e) => e.hook === "message_received").map((e) => e.event?.messageId ?? e.ctx?.messageId);
    await dumpBus(test);
    out({ test, step: "summary", note: decisions.map((d) => d.verdict).join(","), botId: bot?.id, inId: inMsg?.id, received, decisions });
  },

  // (d) sub-agent and sessions_send identity.
  async "d-spawn"() {
    const test = "d-spawn";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "Spawn probe. [scenario:spawn-exec-meta]");
    await agentEnd(t0, "subagent", 120000);
    await sleep(8000);
    out({ test, step: "done" });
  },
  async "d-send"() {
    const test = "d-send";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "sessions_send probe. [scenario:send-exec-meta] TARGET_SESSION=agent:main:qa-channel:direct:dm:bob");
    await agentEnd(t0, "dm:bob", 120000);
    await sleep(5000);
    out({ test, step: "done" });
  },
};

for (const [name, fn] of Object.entries(tests)) {
  if (!want(name)) continue;
  out({ test: name, step: "start" });
  try {
    await fn();
  } catch (err) {
    out({ test: name, step: "error", note: String(err?.stack ?? err) });
  }
  await sleep(2000);
}
fs.writeFileSync(`${run}/bus-state.final.json`, JSON.stringify(await state(), null, 2));
out({ step: "driver-done" });
