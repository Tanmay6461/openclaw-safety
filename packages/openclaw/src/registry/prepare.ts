import type { ToolCall } from "@provenance-guard/core";
import type { OpenClawRegistry } from "./index.js";

/** Where the engine stores computed params. Stripped again before params go back to OpenClaw. */
export const DERIVED_KEY = "__derived";

/** Absolute virtual path, so writes and reads agree whatever the session's cwd is. */
export function personalInstructionsPath(agentId: string | undefined): string {
  return `/__openclaw__/personal_instructions/${agentId ?? "default"}`;
}

/** File paths touched by an apply_patch input (`*** Add File:`, `*** Update File:`, `*** Move to:`, ...). */
export function parsePatchPaths(input: string): string[] {
  const out = new Set<string>();
  for (const line of input.split(/\r?\n/)) {
    const m = /^\*\*\* (?:Add File|Delete File|Update File|Move to):\s*(.+?)\s*$/.exec(line);
    if (m) out.add(m[1]!);
  }
  return [...out];
}

export interface HookToolEvent {
  toolName: string;
  params: Record<string, unknown>;
  toolCallId?: string;
  /** OpenClaw's best-effort path hint for patch-like tools. */
  derivedPaths?: string[];
}

export interface CallContext {
  /** Target the `message` tool uses when the agent omits one (the current conversation). */
  currentConversation?: string;
  agentId?: string;
}

export interface PreparedCall {
  /** What the engine evaluates: canonical tool name plus derived params. */
  call: ToolCall;
  /** Codex-native tool: a rewrite decision must become a block. */
  blockOnly: boolean;
  /**
   * Params to hand back to OpenClaw: the engine's rewrite (or the originals) minus everything
   * prepare added. The Guard always returns params, so a later plugin can't swap them (§5.2).
   */
  finalize(params?: Record<string, unknown>): Record<string, unknown>;
}

let seq = 0;

/**
 * The inner call behind a compact-surface wrapper (`tool_call {id, args}`), shaped the way OpenClaw
 * reports it to before_tool_call: `toolCallId` is `tool_call:<outerId>:<tool>:<n>` and the params are
 * `args`. `id` may be a search-result id such as `openclaw:core:web_fetch`. The adapter evaluates it
 * on the outer call only to block early; asks and labels happen on the inner hook, which always fires.
 */
export function unwrapMetaCall(
  event: HookToolEvent,
  registry: OpenClawRegistry,
  ctx: CallContext = {},
): PreparedCall | undefined {
  if (registry.entry(event.toolName)?.metaWrapper !== true) return undefined;
  const id = event.params.id;
  if (typeof id !== "string" || id === "") return undefined;
  const inner = id.split(":").pop()!;
  const args = event.params.args;
  const params = args !== null && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
  return prepareCall({ toolName: inner, params, toolCallId: `tool_call:${event.toolCallId ?? "?"}:${inner}:1` }, registry, ctx);
}

/**
 * tool_result_persist fires only for the outer wrapper, with the inner result inside its content.
 * These are the pending inner calls that content belongs to.
 */
export function innerCallIdsFor(outerCallId: string, pendingIds: Iterable<string>): string[] {
  const prefix = `tool_call:${outerCallId}:`;
  return [...pendingIds].filter((id) => id.startsWith(prefix));
}

export function prepareCall(event: HookToolEvent, registry: OpenClawRegistry, ctx: CallContext = {}): PreparedCall {
  const tool = registry.canonical(event.toolName);
  const entry = registry.entry(tool);
  const params: Record<string, unknown> = { ...event.params };
  const added: string[] = [];

  const derived: Record<string, unknown> = {};
  for (const d of entry?.derive ?? []) {
    if (d === "apply_patch_paths") {
      // OpenClaw's apply_patch takes `input`. Codex's apply_patch (a custom tool) reaches the hook as
      // apply_patch with the patch text in `command` (runtime, phase0/codex run codex-3); `patch` per source.
      const input = [params.input, params.patch, params.command].filter((v): v is string => typeof v === "string").join("\n");
      derived.paths = [...new Set([...parsePatchPaths(input), ...(event.derivedPaths ?? [])])];
    } else if (d === "personal_instructions_path") {
      derived.paths = [personalInstructionsPath(typeof params.agentId === "string" ? params.agentId : ctx.agentId)];
    }
  }
  if (Object.keys(derived).length > 0) {
    params[DERIVED_KEY] = derived;
    added.push(DERIVED_KEY);
  }

  // An omitted message target means the current conversation; make it explicit for the engine.
  if (tool === "message" && ctx.currentConversation) {
    const hasTarget = ["target", "targets", "to", "channelId"].some((k) => params[k] !== undefined);
    if (!hasTarget) {
      params.target = ctx.currentConversation;
      added.push("target");
    }
  }

  return {
    call: { id: event.toolCallId ?? `oc-${++seq}`, tool, params },
    blockOnly: entry?.blockOnly === true,
    finalize(out = params) {
      const copy = { ...out };
      for (const k of added) delete copy[k];
      return copy;
    },
  };
}
