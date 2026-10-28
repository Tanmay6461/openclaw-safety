// Writes an isolated OpenClaw config for one Phase 0 run (runtime-harness-notes §3, §4, §7).
// Usage: node write-config.mjs <runDir> <gatewayPort> <mockPort> <token>
const [run, gwPort, mockPort, token] = process.argv.slice(2);
if (!run || !gwPort || !mockPort || !token) {
  console.error("usage: write-config.mjs <runDir> <gatewayPort> <mockPort> <token>");
  process.exit(2);
}

const config = {
  gateway: {
    mode: "local",
    port: Number(gwPort),
    bind: "loopback",
    auth: { mode: "token", token },
    controlUi: { enabled: false },
  },
  models: {
    mode: "merge",
    providers: {
      mock: {
        baseUrl: `http://127.0.0.1:${mockPort}/v1`,
        apiKey: "mock-key",
        api: "openai-completions",
        agentRuntime: { id: "openclaw" },
        request: { allowPrivateNetwork: true },
        timeoutSeconds: 60,
        models: [
          {
            id: "mock-model",
            name: "Mock",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 4096,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "mock/mock-model", fallbacks: [] },
      models: { "mock/mock-model": { agentRuntime: { id: "openclaw" } } },
      workspace: `${run}/state/workspace`,
      skipBootstrap: true,
      timeoutSeconds: 120,
      heartbeat: { every: "0m" },
    },
  },
  tools: {
    profile: "full",
    exec: { host: "gateway", mode: "full", strictInlineEval: false },
    web: { fetch: { ssrfPolicy: { dangerouslyAllowPrivateNetwork: true } } },
  },
  skills: { allowBundled: [] },
  plugins: {
    enabled: true,
    load: { paths: ["/pg/probe-plugin"] },
    entries: {
      "pg-probe": {
        enabled: true,
        hooks: { allowConversationAccess: true, timeoutMs: 15000 },
        config: { logPath: `${run}/probe.jsonl`, stampPersist: true, raceTest: true },
      },
    },
  },
};

console.log(JSON.stringify(config, null, 2));
