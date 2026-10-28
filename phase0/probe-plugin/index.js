// Phase 0 probe plugin for OpenClaw v2026.10.8. Plain ESM, no SDK import (runtime-harness-notes §1).
// - Logs every hook invocation (event + ctx, long strings truncated) to a JSONL file.
// - stampPersist: tool_result_persist appends "[[persist:<toolCallId>]]" to each tool result, so the
//   mock LLM can tell whether the next model call saw the persisted copy (plan §13 still-open 1).
// - raceTest: two before_tool_call handlers rewrite an exec command, to see whose params win (still-open 6).
// - approveTools: the low-priority (last) before_tool_call handler returns requireApproval for these tools.
//   Only calls whose params contain approveMatch (a substring) ask.
// - approveHighTools / approveHighMatch: the high-priority (first) handler returns requireApproval (plus a params rewrite for
//   race calls), so the low-priority rewrite tells whether another plugin's approval freezes params.
// - Every approval logs "__approval_request" and, via onResolution, "__approval_resolution".
import fs from "node:fs";

// PLUGIN_HOOK_NAMES, src/plugins/hook-types.ts:98-139.
const HOOKS = [
  "before_model_resolve", "agent_turn_prepare", "before_prompt_build", "before_agent_reply",
  "model_call_started", "model_call_ended", "llm_input", "llm_output", "before_agent_finalize",
  "agent_end", "before_compaction", "after_compaction", "before_reset", "inbound_claim",
  "channel_pairing_requested", "message_received", "message_sending", "reply_payload_sending",
  "message_sent", "before_tool_call", "after_tool_call", "tool_result_persist", "before_message_write",
  "session_start", "session_end", "subagent_delivery_target", "subagent_spawned", "subagent_progress",
  "subagent_ended", "gateway_start", "gateway_stop", "heartbeat_prompt_contribution", "cron_reconciled",
  "cron_changed", "skill_changed", "before_dispatch", "reply_dispatch", "before_install",
  "before_agent_run", "resolve_exec_env",
];
const CUSTOM = new Set(["before_tool_call", "tool_result_persist"]);
const MAX_STRING = 400;

let seq = 0;

function safe(value) {
  const seen = new WeakSet();
  try {
    return JSON.parse(
      JSON.stringify(value, (_k, x) => {
        if (typeof x === "function") return "[fn]";
        if (typeof AbortSignal !== "undefined" && x instanceof AbortSignal) return "[signal]";
        if (typeof x === "string" && x.length > MAX_STRING) return `${x.slice(0, MAX_STRING)}…[+${x.length - MAX_STRING}]`;
        if (x && typeof x === "object") {
          if (seen.has(x)) return "[circular]";
          seen.add(x);
        }
        return x;
      }),
    );
  } catch {
    return "[unserializable]";
  }
}

function markerFor(id) {
  return `[[persist:${String(id ?? "none").replace(/[^A-Za-z0-9_-]/g, "_")}]]`;
}

/** Returns a copy of a toolResult message with the marker appended to its text. */
function stamp(message, marker) {
  if (!message || typeof message !== "object") return message;
  const content = message.content;
  if (typeof content === "string") return { ...message, content: `${content}\n${marker}` };
  if (Array.isArray(content)) return { ...message, content: [...content, { type: "text", text: marker }] };
  return { ...message, content: [{ type: "text", text: marker }] };
}

export default {
  id: "pg-probe",
  name: "Provenance Guard Probe",
  description: "Phase 0 hook probe",
  register(api) {
    const cfg = api.pluginConfig ?? {};
    const logPath = cfg.logPath ?? "/tmp/pg-probe.jsonl";
    const log = (rec) => fs.appendFileSync(logPath, `${JSON.stringify({ t: Date.now(), seq: ++seq, ...rec })}\n`);
    log({ hook: "__register", pluginId: api.id, config: cfg, hostHooks: api.config?.plugins?.entries?.[api.id]?.hooks });

    for (const name of HOOKS) {
      if (CUSTOM.has(name)) continue;
      api.on(name, (event, ctx) => {
        log({ hook: name, event: safe(event), ctx: safe(ctx) });
        return undefined;
      }, { priority: -1000 });
    }

    // Synchronous by contract: a returned promise would be ignored.
    api.on("tool_result_persist", (event, ctx) => {
      const marker = cfg.stampPersist ? markerFor(event?.toolCallId ?? ctx?.toolCallId) : null;
      log({ hook: "tool_result_persist", marker, event: safe(event), ctx: safe(ctx) });
      return marker ? { message: stamp(event.message, marker) } : undefined;
    }, { priority: -1000 });

    const approval = (event, ctx, where) => {
      log({ hook: "__approval_request", where, toolName: event.toolName, toolCallId: event.toolCallId, params: safe(event.params), requester: safe(ctx?.requester) });
      return {
        title: `pg-probe: approve ${event.toolName}?`,
        description: `pg-probe test approval (${where}) for ${event.toolName} ${JSON.stringify(event.params ?? {}).slice(0, 120)}`,
        severity: "warning",
        timeoutMs: cfg.approvalTimeoutMs ?? 60000,
        onResolution: (decision) => log({ hook: "__approval_resolution", where, decision, toolName: event.toolName, toolCallId: event.toolCallId }),
      };
    };
    // Only calls whose params contain the marker ask (approveMatch for low, approveHighMatch for high).
    const wantsApproval = (list, event, marker) =>
      Array.isArray(list) && list.includes(event?.toolName) && JSON.stringify(event?.params ?? {}).includes(marker ?? "");

    const isRaceCall = (event) => cfg.raceTest && event?.toolName === "exec" && String(event?.params?.command ?? "").includes("original-params");

    // Higher priority runs first. This one rewrites the command; the low-priority handler below runs last.
    api.on("before_tool_call", (event, ctx) => {
      const approve = wantsApproval(cfg.approveHighTools, event, cfg.approveHighMatch);
      if (!isRaceCall(event)) return approve ? { requireApproval: approval(event, ctx, "high") } : undefined;
      log({ hook: "before_tool_call:race-high", sawParams: safe(event.params), ctx: safe(ctx) });
      const params = { ...event.params, command: "echo from-high-priority" };
      return approve ? { params, requireApproval: approval(event, ctx, "high") } : { params };
    }, { priority: 1000 });

    api.on("before_tool_call", (event, ctx) => {
      log({ hook: "before_tool_call", event: safe(event), ctx: safe(ctx) });
      if (isRaceCall(event)) {
        log({ hook: "before_tool_call:race-low", sawParams: safe(event.params) });
        return { params: { ...event.params, command: "echo from-low-priority" } };
      }
      if (wantsApproval(cfg.approveTools, event, cfg.approveMatch)) return { params: event.params, requireApproval: approval(event, ctx, "low") };
      return { params: event.params };
    }, { priority: -1000, timeoutMs: 2000 });

    api.registerCommand({
      name: "guard",
      description: "Provenance Guard probe command",
      acceptsArgs: true,
      requireAuth: true,
      requiredScopes: ["operator.admin"],
      handler: (ctx) => {
        log({ hook: "__command", command: "guard", ctx: safe({ ...ctx, config: undefined }) });
        return { text: `guard probe ok: ${ctx.args ?? ""}` };
      },
    });

    // Control for /guard: same, but requireAuth only (no requiredScopes).
    api.registerCommand({
      name: "guardauth",
      description: "Provenance Guard probe command without requiredScopes",
      acceptsArgs: true,
      requireAuth: true,
      handler: (ctx) => {
        log({ hook: "__command", command: "guardauth", ctx: safe({ ...ctx, config: undefined }) });
        return { text: `guardauth probe ok: ${ctx.args ?? ""}` };
      },
    });
  },
};
