// Config for the interactive Telegram test (plan §13 items 2-3): phase0/cluster/write-config.mjs plus the
// Telegram channel (burner bot, token via tokenFile, Explorer's proxy), the owner and approver lists,
// plugin approvals forwarded to the originating chat with inline buttons, the probe and the Guard.
// Usage: node write-config.mjs <runDir> <gatewayPort> <mockPort> <token> <stateDir> <tokenFile> <proxyUrl>
import { execFileSync } from "node:child_process";

const [run, gwPort, mockPort, token, stateDir, tokenFile, proxy] = process.argv.slice(2);
const OWNER = "7845032487";
const NON_OWNER = "7419412584";
const base = JSON.parse(execFileSync("node", ["/pg/scripts/write-config.mjs", run, gwPort, mockPort, token], { encoding: "utf8" }));

base.agents.defaults.workspace = `${stateDir}/workspace`;
base.session = { dmScope: "per-channel-peer" };
base.commands = { ownerAllowFrom: [`telegram:${OWNER}`] };
base.approvals = { plugin: { enabled: true, mode: "session" } };
base.channels = {
  telegram: {
    enabled: true,
    tokenFile,
    ...(proxy && { proxy }),
    dmPolicy: "allowlist",
    allowFrom: [OWNER, NON_OWNER],
    groupPolicy: "open",
    groupAllowFrom: [OWNER, NON_OWNER],
    groups: { "*": { requireMention: false } },
    capabilities: { inlineButtons: "all" },
    execApprovals: { enabled: true, approvers: [OWNER], target: "both" },
  },
};
base.plugins.load.paths = ["/pg/guard-plugin/provenance-guard", "/pg/probe-plugin"];
base.plugins.entries["pg-probe"] = {
  enabled: true,
  hooks: { allowConversationAccess: true, timeoutMs: 15000 },
  config: { logPath: `${run}/probe.jsonl`, stampPersist: false, raceTest: false, approveTools: ["exec"], approveMatch: "pg-approve-low", approvalTimeoutMs: 300000 },
};
base.plugins.entries["provenance-guard"] = {
  enabled: true,
  hooks: { allowConversationAccess: true, timeoutMs: 15000 },
  config: { mode: "enforce", preset: "balanced", stateDir: `${run}/guard-state` },
};

console.log(JSON.stringify(base, null, 2));
