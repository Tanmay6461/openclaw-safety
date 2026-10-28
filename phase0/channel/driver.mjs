// Phase 0 channel-test driver. Runs inside the container next to the Gateway, the QA bus, and the mock.
// Injects qa-channel inbound messages as alice (owner) and bob (non-owner), waits on the probe log and the
// bus, and writes one JSONL line per test step to $RUN/driver.jsonl.
// Usage: node driver.mjs <runDir> <busUrl> <testsCsv>
import { execFile } from "node:child_process";
import fs from "node:fs";

const [run, bus, testsCsv = "all"] = process.argv.slice(2);
const OC = process.env.OC ?? "/pg/oc/node_modules/.bin/openclaw";
const only = new Set(testsCsv.split(","));
const want = (t) => only.has("all") || only.has(t) || only.has(t.split("-")[0]);
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

async function send(test, sender, conversation, text) {
  const r = await post("/v1/inbound/message", { conversation, senderId: sender, senderName: sender, text });
  out({ test, step: "inbound", sender, conversation, text, messageId: r.message?.id });
  return r.message;
}

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
      for (const cmd of ["/guard status", "/guardauth status"]) {
        const test = `b-${cmd.slice(1).split(" ")[0]}-${sender}-${conv.kind}`;
        const t0 = Date.now();
        await send(test, sender, conv, cmd);
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
    await send(test, "alice", DM("alice"), `/approve ${id} allow-once`);
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
    await send(test, "bob", DM("bob"), `/approve ${id} allow-once`);
    const r = await recordResolution(test, t1, 15000);
    out({ test, step: "bob-replies", replies: (await outbound(t1)).map((m) => ({ to: m.conversation?.id, text: m.text })) });
    if (!r) {
      const t2 = Date.now();
      await send(test, "alice", DM("alice"), `/approve ${id} deny`);
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
    await send(test, "bob", GROUP, `/approve ${id} allow-once`);
    const r = await recordResolution(test, t1, 15000);
    out({ test, step: "bob-replies", replies: (await outbound(t1)).map((m) => ({ to: m.conversation?.id, text: m.text })) });
    if (!r) {
      const t2 = Date.now();
      await send(test, "alice", GROUP, `/approve ${id} deny`);
      await recordResolution(test, t2, 15000);
    }
    await agentEnd(t0);
    await dumpBus(test);
  },

  // (c3) the agent itself sends "/approve <id>" into the owner's DM with the message tool. The sending run
  // is a separate session (the requesting run is blocked on the approval): a CLI turn and bob's DM turn.
  async "c3-self-cli"() {
    const test = "c3-self-cli";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "Approval probe. [scenario:approve-low]");
    const id = await approvalPrompt(test, t0);
    if (!id) return;
    const t1 = Date.now();
    await cli(test, ["agent", "--agent", "main", "--session-key", "pg-self-approve", "--message", `Self approve. [scenario:message-approve] APPROVAL_ID=${id} TARGET=dm:alice`, "--json", "--timeout", "120"]);
    const r = await recordResolution(test, t1, 10000);
    out({ test, step: "echo-outbound", messages: (await outbound(t1)).map((m) => ({ to: m.conversation?.id, senderId: m.senderId, text: m.text })) });
    if (!r) {
      const t2 = Date.now();
      await send(test, "alice", DM("alice"), `/approve ${id} deny`);
      await recordResolution(test, t2, 15000);
    }
    await agentEnd(t0);
    await dumpBus(test);
  },
  async "c3-self-bob"() {
    const test = "c3-self-bob";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "Approval probe. [scenario:approve-low]");
    const id = await approvalPrompt(test, t0);
    if (!id) return;
    const t1 = Date.now();
    await send(test, "bob", DM("bob"), `Relay. [scenario:message-approve] APPROVAL_ID=${id} TARGET=dm:alice`);
    await agentEnd(t1, "bob");
    const r = await recordResolution(test, t1, 10000);
    out({ test, step: "echo-outbound", messages: (await outbound(t1)).map((m) => ({ to: m.conversation?.id, senderId: m.senderId, text: m.text })) });
    if (!r) {
      const t2 = Date.now();
      await send(test, "alice", DM("alice"), `/approve ${id} deny`);
      await recordResolution(test, t2, 15000);
    }
    await agentEnd(t0);
    await dumpBus(test);
  },
  // (c3b) the same message tool echo, but sending "/guard status" into alice's DM.
  async "c3-guard-echo"() {
    const test = "c3-guard-echo";
    const t0 = Date.now();
    await cli(test, ["agent", "--agent", "main", "--session-key", "pg-self-guard", "--message", "Echo guard. [scenario:message-guard] TARGET=dm:alice", "--json", "--timeout", "120"]);
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
    await cli(test, ["agent", "--agent", "main", "--session-key", "pg-self-exec", "--message", `Self approve via exec. [scenario:exec-approve] APPROVAL_ID=${id}`, "--json", "--timeout", "120"]);
    const r = await recordResolution(test, t1, 10000);
    if (!r) {
      const t2 = Date.now();
      await send(test, "alice", DM("alice"), `/approve ${id} deny`);
      await recordResolution(test, t2, 15000);
    }
    await agentEnd(t0);
    await dumpBus(test);
  },
  // (c5) another handler's requireApproval (high priority, with params) vs the low-priority params rewrite.
  async "c5-race"() {
    const test = "c5-race";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "Approval race. [scenario:approve-race]");
    const id = await approvalPrompt(test, t0);
    if (!id) return;
    const t1 = Date.now();
    await send(test, "alice", DM("alice"), `/approve ${id} allow-once`);
    await recordResolution(test, t1, 20000);
    await agentEnd(t0);
    const after = probeSince(t0, (e) => e.hook === "after_tool_call" && e.event?.toolName === "exec").map((e) => e.event?.params?.command);
    out({ test, step: "exec-params", note: `ran=${JSON.stringify(after)}`, ran: after });
  },

  // (d) sub-agent and sessions_send identity.
  async "d-spawn"() {
    const test = "d-spawn";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "Spawn probe. [scenario:spawn-exec]");
    await agentEnd(t0, "subagent", 120000);
    await sleep(8000);
    out({ test, step: "done" });
  },
  async "d-send"() {
    const test = "d-send";
    const t0 = Date.now();
    await send(test, "alice", DM("alice"), "sessions_send probe. [scenario:send-exec] TARGET_SESSION=agent:main:qa-channel:direct:bob");
    await agentEnd(t0, "alice", 120000);
    await sleep(15000);
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
