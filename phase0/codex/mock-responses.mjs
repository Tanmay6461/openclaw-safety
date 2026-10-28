#!/usr/bin/env node
// Deterministic OpenAI Responses API mock for the Codex app-server (Codex 0.160.0), no dependencies.
// Event shapes follow OpenClaw's QA mock (extensions/qa-lab/src/providers/mock-openai/mock-openai-stream.ts)
// and Codex's own parser (codex-rs/codex-api/src/sse/responses.rs). See NOTES.md §4.
//
// Routes: POST /v1/responses (SSE when body.stream === true, else JSON), GET /v1/models, GET /health,
// POST /v1/embeddings (OpenClaw memory search, pointed here by write-config.mjs).
// WebSocket upgrades on /v1/responses get HTTP 426, which makes Codex switch the session to HTTP
// at once (codex-rs/core/src/client.rs:1919-1923, 645-665).
//
// The scenario comes from a "[scenario:<name>]" marker in the latest marked user input. The step is
// the number of function_call_output / custom_tool_call_output items after that input.
//
// Env: MOCK_PORT (18081), MOCK_HOST (127.0.0.1), MOCK_LOG (mock-responses.jsonl), MOCK_MODELS (gpt-5.6-luna).
// One-off: node mock-responses.mjs --write-catalog <path>  writes the Codex model catalog
// (model_catalog_json) and exits.
import { createHash } from "node:crypto";
import { appendFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import zlib from "node:zlib";

const PORT = Number(process.env.MOCK_PORT ?? 18081);
const HOST = process.env.MOCK_HOST ?? "127.0.0.1";
const LOG = process.env.MOCK_LOG ?? "mock-responses.jsonl";
const MODEL_IDS = (process.env.MOCK_MODELS ?? "gpt-5.6-luna").split(",").map((s) => s.trim()).filter(Boolean);

const SHELL_COMMAND = "echo pg-codex-shell";
const PATCH_FILE = "pg-codex.txt";
const PATCH = ["*** Begin Patch", `*** Add File: ${PATCH_FILE}`, "+pg-codex-patch", "*** End Patch", ""].join("\n");
const CHILD_MARKER = "[pg-child]";
const CHILD_MESSAGE = `${CHILD_MARKER} Reply exactly PG-CODEX-CHILD. Do not call tools.`;
// Codex native shell tools, most specific first. Never "exec": in Codex code mode that is the
// JavaScript runner (codex-rs/code-mode-protocol/src/lib.rs:52).
const SHELL_TOOL_NAMES = ["exec_command", "shell_command", "shell", "local_shell"];
const OUTPUT_TYPES = new Set(["function_call_output", "custom_tool_call_output", "local_shell_call_output", "tool_search_output"]);

/** Codex model metadata: the QA catalog (extensions/qa-lab/src/providers/shared/mock-model-config.ts:126-162). */
function codexModelInfos() {
  return MODEL_IDS.map((slug, priority) => ({
    slug,
    display_name: slug,
    description: "Phase 0 mock OpenAI coding model",
    default_reasoning_level: "medium",
    supported_reasoning_levels: [
      { effort: "low", description: "Fast mock reasoning" },
      { effort: "medium", description: "Balanced mock reasoning" },
      { effort: "high", description: "Thorough mock reasoning" },
      { effort: "xhigh", description: "Extra-thorough mock reasoning" },
    ],
    shell_type: "shell_command",
    visibility: "list",
    supported_in_api: true,
    priority,
    availability_nux: null,
    upgrade: null,
    base_instructions: "You are Codex, a coding agent based on GPT-5.",
    include_skills_usage_instructions: false,
    supports_reasoning_summary_parameter: true,
    default_reasoning_summary: "none",
    support_verbosity: true,
    default_verbosity: "low",
    apply_patch_tool_type: "freeform",
    web_search_tool_type: "text_and_image",
    truncation_policy: { mode: "tokens", limit: 10_000 },
    supports_parallel_tool_calls: true,
    supports_image_detail_original: true,
    context_window: 128_000,
    max_context_window: 128_000,
    effective_context_window_percent: 95,
    experimental_supported_tools: [],
    input_modalities: ["text", "image"],
    supports_search_tool: true,
    tool_mode: "direct",
  }));
}

if (process.argv[2] === "--write-catalog") {
  const out = process.argv[3];
  if (!out) {
    console.error("usage: mock-responses.mjs --write-catalog <path>");
    process.exit(2);
  }
  writeFileSync(out, `${JSON.stringify({ models: codexModelInfos() }, null, 2)}\n`, { mode: 0o600 });
  console.log(`catalog: ${out}`);
  process.exit(0);
}

let seq = 0;
const nextId = (prefix) => `${prefix}_pg_${++seq}`;

function log(rec) {
  appendFileSync(LOG, `${JSON.stringify({ ts: Date.now(), ...rec })}\n`);
}

function redactHeaders(headers) {
  const out = { ...headers };
  for (const k of ["authorization", "cookie", "x-api-key"]) if (out[k]) out[k] = "[redacted]";
  return out;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const parts = [];
    req.on("data", (c) => parts.push(c));
    req.on("end", () => resolve(Buffer.concat(parts)));
    req.on("error", reject);
  });
}

/** Undoes Content-Encoding (Codex can compress request bodies). zstd needs Node >= 22.15. */
function decode(buf, encoding) {
  const enc = String(encoding ?? "").toLowerCase().trim();
  if (!enc || enc === "identity") return buf;
  if (enc === "gzip") return zlib.gunzipSync(buf);
  if (enc === "deflate") return zlib.inflateSync(buf);
  if (enc === "br") return zlib.brotliDecompressSync(buf);
  if (enc === "zstd" && typeof zlib.zstdDecompressSync === "function") return zlib.zstdDecompressSync(buf);
  throw new Error(`unsupported content-encoding: ${enc}`);
}

function writeJson(res, status, value) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(value));
}

// ---- request analysis ------------------------------------------------------------------------

/** Flattens body.tools, opening namespace tools (Responses "namespace" type, multi_agent_v1, responses-lite). */
function listTools(body) {
  const out = [];
  for (const tool of Array.isArray(body?.tools) ? body.tools : []) {
    if (tool?.type === "namespace" && Array.isArray(tool.tools)) {
      for (const child of tool.tools) out.push({ tool: child, namespace: tool.name });
    } else if (tool) {
      out.push({ tool });
    }
  }
  return out;
}

function toolLabel({ tool, namespace }) {
  return {
    name: tool.name ?? tool.type,
    type: tool.type,
    ...(namespace ? { namespace } : {}),
    ...(tool.parameters?.properties ? { params: Object.keys(tool.parameters.properties) } : {}),
    ...(tool.format?.type ? { format: tool.format.type } : {}),
  };
}

function textOf(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((p) => (typeof p === "string" ? p : (p?.text ?? ""))).join("");
  return "";
}

function isUserMessage(item) {
  return item && item.role === "user" && (item.type === undefined || item.type === "message");
}

function analyze(input) {
  let marked = -1;
  let scenario = "default";
  let childAt = -1;
  input.forEach((item, i) => {
    if (!isUserMessage(item)) return;
    const text = textOf(item.content);
    const all = [...text.matchAll(/\[scenario:([\w.-]+)\]/g)];
    if (all.length > 0) {
      marked = i;
      scenario = all.at(-1)[1];
    }
    if (text.includes(CHILD_MARKER)) childAt = i;
  });
  const after = marked >= 0 ? input.slice(marked + 1) : input;
  const outputs = after.filter((item) => OUTPUT_TYPES.has(item?.type));
  return {
    scenario,
    markedIndex: marked,
    step: outputs.length,
    child: childAt >= 0 && childAt > marked,
    outputs: outputs.map((o) => ({ type: o.type, call_id: o.call_id, output: truncate(o.output, 600) })),
  };
}

function truncate(value, max) {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s && s.length > max ? `${s.slice(0, max)}…[+${s.length - max}]` : s;
}

// ---- replies ---------------------------------------------------------------------------------

const text = (t) => ({ kind: "text", text: t });

function shellCall(tools) {
  const found = SHELL_TOOL_NAMES.map((n) => tools.find(({ tool }) => (tool.name ?? tool.type) === n)).find(Boolean);
  if (!found) return null;
  const name = found.tool.name ?? found.tool.type;
  if (name === "local_shell") {
    return { kind: "local_shell_call", namespace: found.namespace, action: { type: "exec", command: ["bash", "-lc", SHELL_COMMAND] } };
  }
  const props = found.tool.parameters?.properties ?? {};
  const args = Object.hasOwn(props, "cmd")
    ? { cmd: SHELL_COMMAND }
    : { command: name === "shell" ? ["bash", "-lc", SHELL_COMMAND] : SHELL_COMMAND };
  // Host login profiles can cd out of the workspace (qa-lab codex-native-hook-pressure.e2e.test.ts:303-310).
  if (Object.hasOwn(props, "login")) args.login = false;
  return { kind: "function_call", name, namespace: found.namespace, args };
}

function patchCall(tools) {
  const found = tools.find(({ tool }) => tool.name === "apply_patch");
  if (!found) return null;
  if (found.tool.type === "custom") {
    return { kind: "custom_tool_call", name: "apply_patch", namespace: found.namespace, input: PATCH };
  }
  const props = found.tool.parameters?.properties ?? {};
  const key = Object.hasOwn(props, "patch") ? "patch" : "input";
  return { kind: "function_call", name: "apply_patch", namespace: found.namespace, args: { [key]: PATCH } };
}

function spawnCall(tools) {
  const found = tools.find(({ tool }) => tool.name === "spawn_agent");
  if (!found) return null;
  const props = found.tool.parameters?.properties ?? {};
  const args = { message: CHILD_MESSAGE };
  if (Object.hasOwn(props, "task_name")) args.task_name = "pg_probe_child";
  return { kind: "function_call", name: "spawn_agent", namespace: found.namespace, args };
}

const SCENARIOS = {
  "codex-shell": { call: shellCall, done: "PG-CODEX-SHELL-DONE" },
  "codex-patch": { call: patchCall, done: "PG-CODEX-PATCH-DONE" },
  "codex-spawn": { call: spawnCall, done: "PG-CODEX-SPAWN-DONE" },
};

function plan(body) {
  const input = Array.isArray(body?.input) ? body.input : [];
  const tools = listTools(body);
  const a = analyze(input);
  if (input.some((item) => item?.type === "compaction_trigger")) return { a, reply: { kind: "compaction" } };
  if (a.child) return { a, reply: text("PG-CODEX-CHILD") };
  const sc = SCENARIOS[a.scenario];
  if (!sc) return { a, reply: text(`[mock] codex ${a.scenario} reply (step ${a.step})`) };
  if (a.step >= 1) return { a, reply: text(`${sc.done} after ${a.step} tool output(s)`) };
  const call = sc.call(tools);
  if (!call) {
    const names = tools.map(({ tool, namespace }) => `${namespace ? `${namespace}.` : ""}${tool.name ?? tool.type}`);
    return { a, reply: text(`[mock] ${a.scenario}: no matching tool offered (tools: ${names.join(", ") || "none"})`) };
  }
  return { a, reply: call };
}

/** Builds the Responses stream for one reply (mock-openai-stream.ts:8-123 order). */
function buildEvents(reply, model, scenario) {
  const id = nextId("resp");
  const base = { id, object: "response", created_at: Math.floor(Date.now() / 1000), model };
  const output = [];
  const events = [{ type: "response.created", response: { ...base, status: "in_progress", output: [] } }];
  const start = (item, initial = item) => {
    const output_index = output.push(item) - 1;
    events.push({ type: "response.output_item.added", output_index, item: initial });
    return output_index;
  };
  const done = (item, output_index) => events.push({ type: "response.output_item.done", output_index, item });
  const ns = (n) => (n ? { namespace: n } : {});
  const callId = () => nextId(`call_${String(scenario).replace(/\W/g, "_")}`);

  if (reply.kind === "text") {
    const itemId = nextId("msg");
    const part = { type: "output_text", text: reply.text, annotations: [] };
    const item = { type: "message", id: itemId, role: "assistant", status: "completed", phase: "final_answer", content: [part] };
    const idx = start(item, { ...item, status: "in_progress", content: [] });
    const pos = { item_id: itemId, output_index: idx, content_index: 0 };
    events.push({ type: "response.content_part.added", ...pos, part: { ...part, text: "" } });
    events.push({ type: "response.output_text.delta", ...pos, delta: reply.text });
    events.push({ type: "response.output_text.done", ...pos, text: reply.text });
    events.push({ type: "response.content_part.done", ...pos, part });
    done(item, idx);
  } else if (reply.kind === "function_call") {
    const args = JSON.stringify(reply.args);
    const item = { type: "function_call", id: nextId("fc"), call_id: callId(), name: reply.name, ...ns(reply.namespace), arguments: args };
    const idx = start(item, { ...item, arguments: "" });
    events.push({ type: "response.function_call_arguments.delta", item_id: item.id, output_index: idx, delta: args });
    events.push({ type: "response.function_call_arguments.done", item_id: item.id, output_index: idx, name: reply.name, arguments: args });
    done(item, idx);
  } else if (reply.kind === "custom_tool_call") {
    const item = { type: "custom_tool_call", id: nextId("ctc"), call_id: callId(), name: reply.name, ...ns(reply.namespace), input: reply.input, status: "completed" };
    const idx = start(item, { ...item, input: "", status: "in_progress" });
    events.push({ type: "response.custom_tool_call_input.delta", item_id: item.id, call_id: item.call_id, output_index: idx, delta: reply.input });
    events.push({ type: "response.custom_tool_call_input.done", item_id: item.id, output_index: idx, input: reply.input });
    done(item, idx);
  } else if (reply.kind === "local_shell_call") {
    const item = { type: "local_shell_call", id: nextId("lsh"), call_id: callId(), status: "completed", action: reply.action };
    done(item, start(item));
  } else if (reply.kind === "compaction") {
    const item = { type: "compaction", encrypted_content: "PG_MOCK_REMOTE_COMPACTION_SUMMARY" };
    done(item, start(item));
  }
  events.push({
    type: "response.completed",
    response: {
      ...base,
      status: "completed",
      output,
      usage: { input_tokens: 64, input_tokens_details: { cached_tokens: 0 }, output_tokens: 16, output_tokens_details: { reasoning_tokens: 0 }, total_tokens: 80 },
    },
  });
  return events.map((event, sequence_number) => ({ ...event, sequence_number }));
}

function describeReply(reply) {
  if (reply.kind === "text") return { kind: "text", text: reply.text };
  if (reply.kind === "function_call") return { kind: reply.kind, name: reply.name, namespace: reply.namespace, args: reply.args };
  if (reply.kind === "custom_tool_call") return { kind: reply.kind, name: reply.name, namespace: reply.namespace, input: reply.input };
  return { kind: reply.kind, action: reply.action };
}

// ---- server ----------------------------------------------------------------------------------

function embedding(text) {
  const digest = createHash("sha256").update(String(text)).digest();
  const v = Array.from({ length: 16 }, (_, i) => digest[i] / 255 - 0.5);
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
  const reqSeq = ++seq;
  try {
    if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/healthz")) {
      return writeJson(res, 200, { ok: true });
    }
    if (req.method === "GET" && /\/models$/.test(url.pathname)) {
      log({ kind: "models", req: reqSeq, url: req.url, headers: redactHeaders(req.headers) });
      // Codex reads `models` (full metadata); OpenAI clients read `data` (codex-native-hook-pressure.e2e.test.ts:336-344).
      return writeJson(res, 200, {
        object: "list",
        data: MODEL_IDS.map((id) => ({ id, object: "model", created: 0, owned_by: "pg-mock" })),
        models: codexModelInfos(),
      });
    }
    if (req.method !== "POST") {
      log({ kind: "unhandled", req: reqSeq, method: req.method, url: req.url, headers: redactHeaders(req.headers) });
      return writeJson(res, 404, { error: { type: "not_found", message: `no route ${req.method} ${url.pathname}` } });
    }

    const raw = decode(await readBody(req), req.headers["content-encoding"]).toString("utf8");
    let body;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch (error) {
      log({ kind: "bad-json", req: reqSeq, url: req.url, headers: redactHeaders(req.headers), raw: truncate(raw, 2000), error: String(error) });
      return writeJson(res, 400, { error: { type: "invalid_request_error", message: "body is not JSON" } });
    }

    if (/\/embeddings$/.test(url.pathname)) {
      const inputs = Array.isArray(body.input) ? body.input : [body.input ?? ""];
      log({ kind: "embeddings", req: reqSeq, count: inputs.length });
      return writeJson(res, 200, {
        object: "list",
        data: inputs.map((t, index) => ({ object: "embedding", index, embedding: embedding(t) })),
        model: body.model ?? "text-embedding-3-small",
        usage: { prompt_tokens: 0, total_tokens: 0 },
      });
    }

    if (!/\/responses$/.test(url.pathname)) {
      log({ kind: "unhandled", req: reqSeq, method: req.method, url: req.url, headers: redactHeaders(req.headers), body });
      return writeJson(res, 404, { error: { type: "not_found", message: `no route POST ${url.pathname}` } });
    }

    const tools = listTools(body);
    log({
      kind: "request",
      req: reqSeq,
      transport: "http",
      url: req.url,
      headers: redactHeaders(req.headers),
      toolNames: tools.map(toolLabel),
      body,
    });
    const { a, reply } = plan(body);
    const model = typeof body.model === "string" ? body.model : MODEL_IDS[0];
    const events = buildEvents(reply, model, a.scenario);
    const completion = events.at(-1).response;
    log({
      kind: "reply",
      req: reqSeq,
      scenario: a.scenario,
      step: a.step,
      child: a.child,
      markedIndex: a.markedIndex,
      priorOutputs: a.outputs,
      responseId: completion.id,
      stream: body.stream === true,
      reply: describeReply(reply),
      output: completion.output,
    });
    if (body.stream !== true) return writeJson(res, 200, completion);
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
    // Data-only frames plus [DONE], like the QA mock (mock-openai-contracts.ts:460-491). Codex reads
    // `type` from the JSON and skips frames it cannot parse (codex-api/src/sse/responses.rs:573-584).
    res.end(`${events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("")}data: [DONE]\n\n`);
  } catch (error) {
    log({ kind: "error", req: reqSeq, url: req.url, error: String(error?.stack ?? error) });
    if (!res.headersSent) writeJson(res, 500, { error: { type: "server_error", message: String(error) } });
    else res.end();
  }
});

// No WebSocket server: answer the upgrade with 426 so Codex falls back to HTTP SSE for the session.
server.on("upgrade", (req, socket) => {
  log({ kind: "ws-upgrade-refused", url: req.url, headers: redactHeaders(req.headers) });
  socket.end("HTTP/1.1 426 Upgrade Required\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
});

server.listen(PORT, HOST, () => {
  console.log(`mock-responses listening on http://${HOST}:${PORT} (models: ${MODEL_IDS.join(",")}; log: ${LOG})`);
});
