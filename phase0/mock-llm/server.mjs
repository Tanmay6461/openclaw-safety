#!/usr/bin/env node
// Deterministic OpenAI-compatible mock LLM (and mock web server) for Phase 0 runtime tests.
// No dependencies. The scenario comes from a "[scenario:<name>]" marker in the last user message;
// the step is how many assistant turns have happened since that message.
import { createHash } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 18080);
const HOST = process.env.MOCK_HOST ?? "127.0.0.1";
const LOG = process.env.MOCK_LOG ?? "mock-llm.jsonl";
const SCENARIOS = JSON.parse(
  readFileSync(process.env.MOCK_SCENARIOS ?? new URL("./scenarios.json", import.meta.url), "utf8"),
);
const BASE = `http://${HOST}:${PORT}`;
// tool_result_persist markers stamped by the probe plugin (phase0/probe-plugin).
const PERSIST_MARKER = /\[\[persist:[A-Za-z0-9_-]+\]\]/g;

let seq = 0;
let loggedSchemas = false;
// Meta-tools that front OpenClaw's compact tool surface; their schemas are logged once.
const META_TOOLS = new Set(["tool_search", "tool_describe", "tool_call", "sessions_yield"]);

function log(rec) {
  appendFileSync(LOG, `${JSON.stringify({ ts: Date.now(), ...rec })}\n`);
}

function textOf(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((p) => (typeof p === "string" ? p : (p?.text ?? ""))).join("");
  return "";
}

function substitute(value) {
  if (typeof value === "string") return value.replaceAll("{{MOCK_URL}}", BASE);
  if (Array.isArray(value)) return value.map(substitute);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v)]));
  return value;
}

/** Picks the reply for a chat-completions request. */
function plan(messages) {
  // Anchor on the last user message that names a scenario: OpenClaw can append runtime notices as
  // extra user messages, which must not reset the step count.
  let lastUser = -1;
  let lastMarked = -1;
  messages.forEach((m, i) => {
    if (m.role !== "user") return;
    lastUser = i;
    if (/\[scenario:[\w.-]+\]/.test(textOf(m.content))) lastMarked = i;
  });
  if (lastMarked >= 0) lastUser = lastMarked;
  const userText = lastUser >= 0 ? textOf(messages[lastUser].content) : "";
  const requested = /\[scenario:([\w.-]+)\]/.exec(userText)?.[1];
  const name = requested && SCENARIOS[requested] ? requested : "default";
  const after = messages.slice(lastUser + 1);
  const step = after.filter((m) => m.role === "assistant").length;
  const steps = SCENARIOS[name].steps;
  const reply = steps[step] ?? { content: `[mock] scenario ${name} finished after ${steps.length} step(s)` };
  const toolResults = after
    .filter((m) => m.role === "tool")
    .map((m) => {
      const t = textOf(m.content);
      return { toolCallId: m.tool_call_id, length: t.length, markers: t.match(PERSIST_MARKER) ?? [] };
    });
  return { name, requested: requested ?? null, step, reply: substitute(reply), toolResults };
}

function completion(id, model, reply) {
  const toolCalls = (reply.tool_calls ?? []).map((c, i) => ({
    id: `call_${id}_${i}`,
    type: "function",
    function: { name: c.name, arguments: JSON.stringify(c.arguments ?? {}) },
  }));
  const message = { role: "assistant", content: reply.content ?? null };
  if (toolCalls.length > 0) message.tool_calls = toolCalls;
  return { message, finish: toolCalls.length > 0 ? "tool_calls" : "stop", toolCalls };
}

function sendStream(res, id, model, { message, finish, toolCalls }, includeUsage) {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
  const created = Math.floor(Date.now() / 1000);
  const chunk = (delta, finishReason = null, extra = {}) =>
    res.write(
      `data: ${JSON.stringify({ id: `chatcmpl-${id}`, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta, finish_reason: finishReason }], ...extra })}\n\n`,
    );
  chunk({ role: "assistant", content: "" });
  if (message.content) chunk({ content: message.content });
  toolCalls.forEach((c, index) => {
    chunk({ tool_calls: [{ index, id: c.id, type: "function", function: { name: c.function.name, arguments: "" } }] });
    chunk({ tool_calls: [{ index, function: { arguments: c.function.arguments } }] });
  });
  chunk({}, finish);
  if (includeUsage) {
    res.write(
      `data: ${JSON.stringify({ id: `chatcmpl-${id}`, object: "chat.completion.chunk", created, model, choices: [], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } })}\n\n`,
    );
  }
  res.end("data: [DONE]\n\n");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const parts = [];
    req.on("data", (c) => parts.push(c));
    req.on("end", () => resolve(Buffer.concat(parts).toString("utf8")));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", BASE);
  try {
    if (req.method === "GET" && url.pathname === "/health") return void res.end("ok");
    if (req.method === "GET" && /^\/(v1\/)?models$/.test(url.pathname)) {
      res.setHeader("content-type", "application/json");
      return void res.end(JSON.stringify({ object: "list", data: [{ id: "mock", object: "model", owned_by: "phase0" }] }));
    }
    if (req.method === "GET" && url.pathname.startsWith("/web/")) {
      const page = SCENARIOS.__web?.[url.pathname.slice(5)];
      log({ kind: "web", path: url.pathname, query: url.search, found: Boolean(page) });
      res.writeHead(page ? 200 : 404, { "content-type": "text/html; charset=utf-8" });
      return void res.end(substitute(page ?? "<p>not found</p>"));
    }
    if (req.method === "POST" && /^\/(v1\/)?chat\/completions$/.test(url.pathname)) {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      const id = ++seq;
      const messages = Array.isArray(body.messages) ? body.messages : [];
      if (!loggedSchemas && Array.isArray(body.tools)) {
        loggedSchemas = true;
        log({ kind: "toolSchemas", tools: body.tools.filter((t) => META_TOOLS.has(t.function?.name)).map((t) => t.function) });
      }
      const p = plan(messages);
      const out = completion(id, body.model ?? "mock", p.reply);
      log({
        kind: "chat",
        seq: id,
        model: body.model,
        stream: Boolean(body.stream),
        scenario: p.name,
        requestedScenario: p.requested,
        step: p.step,
        messageCount: messages.length,
        roles: messages.map((m) => m.role).join(","),
        toolsOffered: (body.tools ?? []).map((t) => t.function?.name).filter(Boolean),
        toolResults: p.toolResults,
        replyTools: out.toolCalls.map((c) => c.function.name),
        bodySha: createHash("sha256").update(raw).digest("hex").slice(0, 12),
      });
      if (body.stream) return sendStream(res, id, body.model ?? "mock", out, body.stream_options?.include_usage === true);
      res.setHeader("content-type", "application/json");
      return void res.end(
        JSON.stringify({
          id: `chatcmpl-${id}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: body.model ?? "mock",
          choices: [{ index: 0, message: out.message, finish_reason: out.finish }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      );
    }
    log({ kind: "unhandled", method: req.method, path: url.pathname });
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: `mock: no route for ${req.method} ${url.pathname}` } }));
  } catch (err) {
    log({ kind: "error", path: url.pathname, error: String(err) });
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: String(err) } }));
  }
});

server.listen(PORT, HOST, () => console.log(`mock-llm listening on ${BASE} (scenarios: ${Object.keys(SCENARIOS).filter((k) => !k.startsWith("__")).join(", ")})`));
