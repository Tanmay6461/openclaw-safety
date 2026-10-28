// Config for the Codex runtime probe (NOTES.md §1-§3). Two stages, because the Codex plugin has to
// be installed by `openclaw plugins install` (origin "global") between them:
//   pre:   node write-config.mjs <runDir> <gatewayPort> <mockPort> <token> pre   > openclaw.json
//          phase0/cluster/write-config.mjs base, plus the OpenAI catalog Codex needs, the probe and the
//          Guard (shadow). No codex plugin entry and no runtime pin yet, so the install and the auth
//          paste see a config that validates without the plugin.
//   final: node write-config.mjs <runDir> <gatewayPort> <mockPort> <token> final > openclaw.next.json
//          reads $OPENCLAW_CONFIG_PATH (as left by the install and auth steps) and adds
//          plugins.entries.codex plus agentRuntime.id "codex" on the model.
// Env: PG_CODEX_SANDBOX (default danger-full-access; workspace-write needs bubblewrap user namespaces).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const [run, gwPort, mockPort, token, stage = "pre"] = process.argv.slice(2);
if (!run || !gwPort || !mockPort || !token || !["pre", "final"].includes(stage)) {
  console.error("usage: write-config.mjs <runDir> <gatewayPort> <mockPort> <token> pre|final");
  process.exit(2);
}

const MODEL_ID = "gpt-5.6-luna"; // QA's Codex mock model id (mock-model-config.ts:10)
const MODEL_REF = `openai/${MODEL_ID}`;
const FAKE_KEY = "sk-pg-mock-not-a-real-key";
const ZERO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

function preConfig() {
  const base = JSON.parse(execFileSync("node", ["/pg/scripts/write-config.mjs", run, gwPort, mockPort, token], { encoding: "utf8" }));

  // The OpenClaw-side route must stay the official Platform Responses route: Codex rejects authored
  // custom routes (qa-gateway-config.ts:161-205; docs/providers/openai/runtimes.md:24-53). The mock
  // is reached only through Codex's own openai_base_url (OPENCLAW_CODEX_APP_SERVER_ARGS in inner.sh).
  // "replace" keeps the synthetic key out of live catalog discovery (qa-gateway-config.ts:192).
  base.models = {
    mode: "replace",
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        apiKey: FAKE_KEY,
        api: "openai-responses",
        models: [
          {
            id: MODEL_ID,
            name: MODEL_ID,
            api: "openai-responses",
            reasoning: true,
            input: ["text", "image"],
            cost: ZERO_COST,
            contextWindow: 128000,
            maxTokens: 4096,
          },
        ],
      },
    },
  };
  base.agents.defaults.model = { primary: MODEL_REF, fallbacks: [] };
  base.agents.defaults.models = { [MODEL_REF]: {} };
  base.agents.defaults.timeoutSeconds = 240;
  // Embeddings bypass the model runtime; keep them on the mock (qa-gateway-config.ts:216-228).
  base.memory = {
    search: {
      provider: "openai-compatible",
      model: "text-embedding-3-small",
      remote: { baseUrl: `http://127.0.0.1:${mockPort}/v1`, apiKey: "test" },
    },
  };

  base.plugins.load.paths = ["/pg/guard-plugin/provenance-guard", "/pg/probe-plugin"];
  base.plugins.entries["pg-probe"].config = { logPath: `${run}/probe.jsonl`, stampPersist: false, raceTest: false };
  base.plugins.entries["provenance-guard"] = {
    enabled: true,
    hooks: { allowConversationAccess: true, timeoutMs: 15000 },
    config: { mode: "shadow", preset: "balanced", stateDir: `${run}/guard-state` },
  };
  return base;
}

function finalConfig() {
  const path = process.env.OPENCLAW_CONFIG_PATH ?? `${run}/state/openclaw.json`;
  const cfg = JSON.parse(readFileSync(path, "utf8"));
  cfg.plugins ??= {};
  cfg.plugins.entries ??= {};
  const prev = cfg.plugins.entries.codex ?? {};
  cfg.plugins.entries.codex = {
    ...prev,
    enabled: true,
    config: {
      ...(prev.config ?? {}),
      appServer: {
        ...(prev.config?.appServer ?? {}),
        // yolo + danger-full-access is the default for tools.exec.mode "full"
        // (config-options.ts:240-245); set explicitly so the run never needs bubblewrap.
        sandbox: process.env.PG_CODEX_SANDBOX || "danger-full-access",
      },
    },
  };
  if (Array.isArray(cfg.plugins.allow) && !cfg.plugins.allow.includes("codex")) cfg.plugins.allow.push("codex");
  if (Array.isArray(cfg.plugins.deny)) cfg.plugins.deny = cfg.plugins.deny.filter((id) => id !== "codex");
  // Explicit runtime pin, the QA "configured" selection (qa-gateway-config.ts:164-166).
  cfg.agents.defaults.models ??= {};
  cfg.agents.defaults.models[MODEL_REF] = { ...(cfg.agents.defaults.models[MODEL_REF] ?? {}), agentRuntime: { id: "codex" } };
  return cfg;
}

console.log(JSON.stringify(stage === "pre" ? preConfig() : finalConfig(), null, 2));
