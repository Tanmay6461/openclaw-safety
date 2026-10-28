// Config for the contract sweep: phase0/cluster/write-config.mjs plus the Provenance Guard (enforce mode)
// and the pg-contract sentinel, which blocks every sweep call after the Guard has decided.
// Usage: node write-config.mjs <runDir> <gatewayPort> <mockPort> <token>
import { execFileSync } from "node:child_process";

const [run, gwPort, mockPort, token] = process.argv.slice(2);
const base = JSON.parse(execFileSync("node", ["/pg/scripts/write-config.mjs", run, gwPort, mockPort, token], { encoding: "utf8" }));
const ws = `${run}/state/workspace`;

base.agents.defaults.timeoutSeconds = 900;
base.plugins.load.paths = ["/pg/guard-plugin/provenance-guard", "/pg/contract/plugin"];
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
