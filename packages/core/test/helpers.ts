import { createEnv, SessionState, type EnvOptions, type GuardEnv, type ToolCall, type ToolSpec, type Trigger } from "../src/index.js";

export const HOME = "/home/u";
export const OWNER_EMAIL = "owner@example.com";

/** A small registry shaped like the OpenClaw one in phase0/docs-findings.md §4. */
export const REGISTRY: Record<string, ToolSpec> = {
  message: {
    name: "message",
    category: "outbound_communication",
    args: { target: "destination", targets: "destination", message: "content", caption: "content", "presentation.blocks[].text": "content" },
    actionParam: "action",
    actions: { read: { category: "read_only", resultSource: "external_sender", args: {} } },
  },
  web_fetch: { name: "web_fetch", category: "external_retrieval", args: { url: "egress_url" }, resultSource: "web" },
  web_search: { name: "web_search", category: "external_retrieval", args: { query: "content" }, resultSource: "web" },
  exec: { name: "exec", category: "privileged_execution", args: { command: "code", workdir: "path" } },
  read: { name: "read", category: "read_only", args: { path: "path" }, resultSource: "file" },
  write: { name: "write", category: "persistence_write", args: { path: "path", content: "content" }, writeMode: "replace" },
  edit: { name: "edit", category: "persistence_write", args: { path: "path", "edits[].newText": "content" }, writeMode: "merge" },
  memory_get: { name: "memory_get", category: "read_only", args: { path: "none" }, resultSource: "memory" },
  automations: {
    name: "automations",
    category: "autonomous_scheduling",
    args: { "job.payload.message": "deferred_instruction", "job.delivery.to": "destination" },
    actionParam: "action",
    actions: { list: { category: "read_only" }, status: { category: "read_only" } },
  },
  plugins: {
    name: "plugins",
    category: "install",
    args: { packageName: "content" },
    actionParam: "action",
    actions: { list: { category: "read_only" }, search: { category: "read_only" } },
  },
  openclaw: { name: "openclaw", category: "config", args: { message: "config" } },
  sessions_send: { name: "sessions_send", category: "inter_session", args: { message: "content", sessionKey: "none" } },
};

export interface TestEnv extends GuardEnv {
  advance(ms: number): void;
}

export function testEnv(over: Partial<EnvOptions> = {}): TestEnv {
  let t = 1_000_000;
  const env = createEnv({
    home: HOME,
    cwd: `${HOME}/work`,
    hmacKey: "test-key",
    resolveLinks: false,
    registry: (n) => REGISTRY[n],
    ownerIdentities: new Set([OWNER_EMAIL, "+15550001111"]),
    now: () => t,
    privatePaths: ["~/secrets/**"],
    memoryPaths: ["~/work/MEMORY.md"],
    ...over,
  });
  return Object.assign(env, { advance: (ms: number) => void (t += ms) });
}

let n = 0;
export function call(tool: string, params: Record<string, unknown>, id = `c${++n}`): ToolCall {
  return { id, tool, params };
}

export function session(trigger: Trigger = "owner", key = "s1"): SessionState {
  return new SessionState({ sessionKey: key, trigger });
}

export function taint(s: SessionState, id = "evil.example"): void {
  s.addUntrusted({ kind: "web", id, at: 1 });
}

/** Tainted and private. */
export function trifecta(s: SessionState): void {
  taint(s);
  s.addPrivate("private_file");
}
