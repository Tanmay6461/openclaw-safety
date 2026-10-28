import { normalizeEmail } from "../attest/normalize.js";
import type { Role, ToolCall, ToolSpec } from "../types.js";
import { collectStrings } from "../util.js";

/** Role from a value's shape, for tools missing from the registry (§5.5). */
export function shapeRole(value: string): Role {
  const t = value.trim();
  if (/^https?:\/\//i.test(t)) return "egress_url";
  if (normalizeEmail(t) !== null || /^\+[1-9][\d\s().-]{6,}$/.test(t)) return "destination";
  if (/^(?:~\/|\.\.?\/|\/(?!\/))\S*$/.test(t) && t.length > 1) return "path";
  return "content";
}

/** Unknown tools are treated as side-effecting, with roles inferred per argument. */
export function inferSpec(call: ToolCall): ToolSpec {
  const args: Record<string, Role> = {};
  for (const [k, v] of Object.entries(call.params)) {
    const first = collectStrings(v)[0];
    args[k] = first === undefined ? "none" : shapeRole(first);
  }
  return { name: call.tool, category: "unknown", args, resultSource: "skill_output", inferred: true };
}
