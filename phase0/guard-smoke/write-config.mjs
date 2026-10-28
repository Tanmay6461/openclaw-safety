// Config for the Guard smoke test: phase0/cluster/write-config.mjs plus the provenance-guard plugin
// (enforce mode) next to the probe. Usage: node write-config.mjs <runDir> <gatewayPort> <mockPort> <token>
import { execFileSync } from "node:child_process";

const [run, gwPort, mockPort, token] = process.argv.slice(2);
const base = JSON.parse(execFileSync("node", ["/pg/scripts/write-config.mjs", run, gwPort, mockPort, token], { encoding: "utf8" }));

base.plugins.load.paths = ["/pg/guard-plugin/provenance-guard", "/pg/probe-plugin"];
base.plugins.entries["pg-probe"].config = { logPath: `${run}/probe.jsonl`, stampPersist: false, raceTest: false };
base.plugins.entries["provenance-guard"] = {
  enabled: true,
  hooks: { allowConversationAccess: true, timeoutMs: 15000 },
  config: { mode: "enforce", preset: "balanced", stateDir: `${run}/guard-state` },
};

console.log(JSON.stringify(base, null, 2));
