// Writes the OpenClaw config for one Phase 0 channel run: phase0/cluster/write-config.mjs plus the
// qa-channel fixture against a local QA bus, an owner (alice) and a non-owner (bob), and probe approvals.
// Usage: node write-config.mjs <runDir> <gatewayPort> <mockPort> <token> <busUrl> [variant]
// Variants: "base" (default): commands.allowFrom unset. "bobcmd": commands.allowFrom lists alice and bob, so
// bob is command-authorized but still not an owner. Any variant ending in "-nofwd" leaves approvals.plugin
// unset (then qa-channel never shows plugin approval prompts; see channel-results.md). Any variant containing
// "guard" also loads the bundled Provenance Guard (enforce mode) from /pg/guard-plugin/provenance-guard.
const [run, gwPort, mockPort, token, busUrl, variant = "base"] = process.argv.slice(2);
if (!run || !gwPort || !mockPort || !token || !busUrl) {
  console.error("usage: write-config.mjs <runDir> <gatewayPort> <mockPort> <token> <busUrl>");
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
      timeoutSeconds: 180,
      heartbeat: { every: "0m" },
    },
  },
  // Separate sessions per DM peer (the default "main" would put alice's and bob's DMs in one session).
  session: { dmScope: "per-channel-peer" },
  // alice is the owner; bob may message (qa-channel allowFrom) but is not an owner.
  commands: {
    ownerAllowFrom: ["qa-channel:alice"],
    ...(variant.startsWith("bobcmd") ? { allowFrom: { "qa-channel": ["alice", "bob"] } } : {}),
  },
  // Forward plugin approval prompts to the originating chat session (qa-channel has no native approval UI).
  ...(variant.endsWith("-nofwd") ? {} : { approvals: { plugin: { enabled: true, mode: "session" } } }),
  channels: {
    "qa-channel": {
      enabled: true,
      baseUrl: busUrl,
      botUserId: "openclaw",
      botDisplayName: "OpenClaw QA",
      allowFrom: ["alice", "bob"],
      groupPolicy: "open",
      pollTimeoutMs: 1000,
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
    load: { paths: ["/pg/probe-plugin", "/pg/oc/fixtures/qa-channel"] },
    entries: {
      "qa-channel": { enabled: true },
      "pg-probe": {
        enabled: true,
        hooks: { allowConversationAccess: true, timeoutMs: 15000 },
        config: {
          logPath: `${run}/probe.jsonl`,
          stampPersist: true,
          raceTest: true,
          approveTools: ["exec"],
          approveMatch: "pg-approve-low",
          approveHighTools: ["exec"],
          approveHighMatch: "pg-approve-high",
          approvalTimeoutMs: 90000,
        },
      },
    },
  },
};

// Exec approval variants (plan §13 item 8): "execalways" is the legacy policy that asks on every exec;
// "execask" is tools.exec.mode "ask" (asks on an allowlist miss). Both forward exec prompts to the chat.
if (variant.includes("execalways") || variant.includes("execask")) {
  const { mode: _mode, ...rest } = config.tools.exec;
  config.tools.exec = variant.includes("execalways") ? { ...rest, security: "allowlist", ask: "always" } : { ...rest, mode: "ask" };
  config.approvals = { ...(config.approvals ?? {}), exec: { enabled: true, mode: "session" } };
}

if (variant.includes("guard")) {
  config.plugins.load.paths.unshift("/pg/guard-plugin/provenance-guard");
  config.plugins.entries["provenance-guard"] = {
    enabled: true,
    hooks: { allowConversationAccess: true, timeoutMs: 15000 },
    config: { mode: "enforce", preset: "balanced", stateDir: `${run}/guard-state` },
  };
}

console.log(JSON.stringify(config, null, 2));
