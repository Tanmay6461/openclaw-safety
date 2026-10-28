import { guardCommand } from "./commands.js";
import { parseConfig } from "./config.js";
import { Guard, type GuardDeps } from "./guard.js";
import type { HookHandler, PluginApi } from "./host.js";

export const PLUGIN_ID = "provenance-guard";
/** Higher priority runs first; the Guard runs last so its params win (§5.2, confirmed at runtime). */
export const LOWEST_PRIORITY = -1_000_000;

/** Registers every Guard hook and the /guard command. Returns the Guard for tests. */
export function registerGuard(api: PluginApi, deps: Partial<Omit<GuardDeps, "api">> = {}): Guard {
  const { config, errors } = parseConfig(api.pluginConfig);
  for (const e of errors) api.logger?.warn?.(`[provenance-guard] config: ${e}`);
  const guard = new Guard(config, { ...deps, api });
  // The host calls handlers as (event, ctx); the casts only bridge our structural types.
  const on = <E, C>(hook: string, fn: (event: E, ctx: C) => unknown, opts?: { priority?: number; timeoutMs?: number }) =>
    api.on(hook, fn as unknown as HookHandler, opts);

  on("before_tool_call", (e: Parameters<Guard["beforeToolCall"]>[0], c: Parameters<Guard["beforeToolCall"]>[1]) => guard.beforeToolCall(e, c), {
    priority: LOWEST_PRIORITY,
    timeoutMs: 5000,
  });
  on("tool_result_persist", (e: Parameters<Guard["toolResultPersist"]>[0], c: Parameters<Guard["toolResultPersist"]>[1]) => guard.toolResultPersist(e, c), {
    priority: LOWEST_PRIORITY,
  });
  on("after_tool_call", (e: Parameters<Guard["afterToolCall"]>[0], c: Parameters<Guard["afterToolCall"]>[1]) => guard.afterToolCall(e, c));
  on("message_received", (e: Parameters<Guard["messageReceived"]>[0], c: Parameters<Guard["messageReceived"]>[1]) => guard.messageReceived(e, c));
  on("before_agent_run", (e: Parameters<Guard["beforeAgentRun"]>[0], c: Parameters<Guard["beforeAgentRun"]>[1]) => {
    guard.beforeAgentRun(e, c);
    return undefined;
  });
  on("subagent_spawned", (e: Parameters<Guard["subagentSpawned"]>[0], c: Parameters<Guard["subagentSpawned"]>[1]) => guard.subagentSpawned(e, c));
  on("session_end", (e: Parameters<Guard["sessionEnd"]>[0], c: Parameters<Guard["sessionEnd"]>[1]) => guard.sessionEnd(e, c));
  api.registerCommand(guardCommand(guard));
  return guard;
}

/** OpenClaw entry: a plain `{ id, name, register }` object, no SDK import (runtime-harness-notes §1). */
export default {
  id: PLUGIN_ID,
  name: "Provenance Guard",
  description: "Tracks where data came from and checks each tool argument's origin before risky actions.",
  register(api: PluginApi): void {
    registerGuard(api);
  },
};
