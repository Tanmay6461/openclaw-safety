// Contract-sweep sentinel for OpenClaw v2026.10.8. Plain ESM, no SDK import.
// Registers before_tool_call below the Guard (which sits at -1_000_000), so it runs last: it logs the
// host's event as the Guard saw it, then blocks the call so nothing in the sweep executes. Block is
// sticky, so the Guard's own decision is still recorded in its audit log.
// Passes: the compact-surface meta tools (the inner call gets its own before_tool_call), and setup
// calls whose params contain passMarker (they label the session before a sweep).
import fs from "node:fs";

const PASS = new Set(["tool_call", "tool_search", "tool_describe"]);
const SENTINEL_PRIORITY = -2_000_000;

export default {
  id: "pg-contract",
  name: "Provenance Guard contract sentinel",
  description: "Phase 0 contract sweep sentinel",
  register(api) {
    const cfg = api.pluginConfig ?? {};
    const logPath = cfg.logPath ?? "/tmp/pg-contract.jsonl";
    const marker = cfg.passMarker ?? "pg-setup";
    let seq = 0;
    const log = (rec) => fs.appendFileSync(logPath, `${JSON.stringify({ t: Date.now(), seq: ++seq, ...rec })}\n`);

    api.on("before_tool_call", (event, ctx) => {
      const params = event?.params ?? {};
      let raw;
      try {
        raw = JSON.stringify(params);
      } catch {
        raw = "";
      }
      const pass = PASS.has(event?.toolName) || raw.includes(marker);
      log({
        hook: "before_tool_call",
        toolName: event?.toolName,
        toolCallId: event?.toolCallId,
        paramKeys: Object.keys(params),
        params: raw.length > 4000 ? `${raw.slice(0, 4000)}…` : params,
        requester: ctx?.requester,
        sessionKey: ctx?.sessionKey,
        pass,
      });
      return pass ? undefined : { block: true, blockReason: "[contract] blocked after the Guard decided (sweep call, never runs)" };
    }, { priority: SENTINEL_PRIORITY, timeoutMs: 5000 });

    api.on("after_tool_call", (event) => {
      log({ hook: "after_tool_call", toolName: event?.toolName, toolCallId: event?.toolCallId, error: event?.error ? String(event.error).slice(0, 300) : undefined });
    }, { priority: SENTINEL_PRIORITY });
  },
};
