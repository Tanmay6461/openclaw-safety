// Config for the contract sweep: phase0/cluster/write-config.mjs plus the Provenance Guard (enforce mode)
// and the pg-contract sentinel, which blocks every sweep call after the Guard has decided.
// Usage: node write-config.mjs <runDir> <gatewayPort> <mockPort> <token> <qaBusUrl>
// qa-channel is configured so the message tool exposes channel actions (react and others).
import { execFileSync } from "node:child_process";

const [run, gwPort, mockPort, token, busUrl] = process.argv.slice(2);
const base = JSON.parse(execFileSync("node", ["/pg/scripts/write-config.mjs", run, gwPort, mockPort, token], { encoding: "utf8" }));
const ws = `${run}/state/workspace`;

base.agents.defaults.timeoutSeconds = 900;
// CONTRACT_SURFACE=full turns off the compact surface (source-notes-v2 Q6), so the request carries every
// tool's full schema (tool_describe truncates large ones such as automations at ~32k chars).
if (process.env.CONTRACT_SURFACE === "full") base.tools = { ...base.tools, toolSearch: false, codeMode: false };
base.plugins.load.paths = ["/pg/guard-plugin/provenance-guard", "/pg/contract/plugin", "/pg/oc/fixtures/qa-channel"];
base.session = { dmScope: "per-channel-peer" };
base.commands = { ownerAllowFrom: ["qa-channel:alice"] };
base.channels = {
  "qa-channel": { enabled: true, baseUrl: busUrl, botUserId: "openclaw", botDisplayName: "OpenClaw QA", allowFrom: ["alice", "bob"], groupPolicy: "open", pollTimeoutMs: 1000 },
};
base.plugins.entries["qa-channel"] = { enabled: true };
delete base.plugins.entries["pg-probe"];
base.plugins.entries["provenance-guard"] = {
  enabled: true,
  hooks: { allowConversationAccess: true, timeoutMs: 15000 },
  config: { mode: "enforce", preset: "balanced", stateDir: `${run}/guard-state`, privateSources: ["email", "memory", `files:${ws}/private/**`] },
};
base.plugins.entries["pg-contract"] = {
  enabled: true,
  hooks: { timeoutMs: 15000 },
  config: { logPath: `${run}/contract.jsonl`, passMarker: "pg-setup" },
};

console.log(JSON.stringify(base, null, 2));
