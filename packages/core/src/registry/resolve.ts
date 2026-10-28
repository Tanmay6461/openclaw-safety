import type { GuardEnv } from "../env.js";
import type { Role, ToolCall, ToolSpec } from "../types.js";
import { inferSpec } from "./infer.js";

/** Applies the per-action override selected by `spec.actionParam`, if any. */
export function resolveSpec(spec: ToolSpec, params: Record<string, unknown>): ToolSpec {
  if (!spec.actionParam || !spec.actions) return spec;
  const action = params[spec.actionParam];
  const o = typeof action === "string" ? spec.actions[action] : undefined;
  const { actions: _actions, ...base } = spec;
  if (!o) return base;
  const out: ToolSpec = { ...base, category: o.category ?? base.category, args: { ...base.args, ...o.args } };
  if (o.resultSource === null) delete out.resultSource;
  else if (o.resultSource !== undefined) out.resultSource = o.resultSource;
  if (o.resultPrivate === null) delete out.resultPrivate;
  else if (o.resultPrivate !== undefined) out.resultPrivate = o.resultPrivate;
  if (o.otherArgs !== undefined) out.otherArgs = o.otherArgs;
  if (o.writeMode !== undefined) out.writeMode = o.writeMode;
  return out;
}

/** The effective spec for a call: registry entry (or inferred), with its action override applied. */
export function specFor(call: ToolCall, env: GuardEnv): ToolSpec {
  return resolveSpec(env.registry(call.tool) ?? inferSpec(call), call.params);
}

/**
 * Spec paths with `role`, plus the call's top-level params that `args` doesn't mention when
 * `otherArgs` is that role.
 */
export function rolePaths(spec: ToolSpec, params: Record<string, unknown>, role: Role): string[] {
  const listed = Object.entries(spec.args)
    .filter(([, r]) => r === role)
    .map(([p]) => p);
  if (spec.otherArgs !== role) return listed;
  const covered = new Set(Object.keys(spec.args).map((p) => p.split(".")[0]!.replace(/\[\]$/, "")));
  if (spec.actionParam) covered.add(spec.actionParam);
  return [...listed, ...Object.keys(params).filter((k) => !covered.has(k))];
}
