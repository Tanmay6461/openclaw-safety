import type { ActionCategory, PrivateCategory, Role, SourceKind } from "../types.js";

const ROLES: ReadonlySet<string> = new Set<Role>([
  "destination", "content", "egress_url", "code", "path", "deferred_instruction", "config", "none",
]);
const CATEGORIES: ReadonlySet<string> = new Set<ActionCategory>([
  "read_only", "external_retrieval", "outbound_communication", "privileged_execution", "persistence_write",
  "autonomous_scheduling", "inter_session", "config", "install", "unknown",
]);
const SOURCES: ReadonlySet<string> = new Set<SourceKind>([
  "owner", "owner_forwarded", "system", "external_sender", "web", "email", "hook", "skill_output",
  "exec_output", "file", "memory", "inter_session", "unknown",
]);
const PRIVATE: ReadonlySet<string> = new Set<PrivateCategory>(["secret", "email", "memory", "private_file", "personal"]);
const WRITE_MODES: ReadonlySet<string> = new Set(["replace", "merge"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function checkFields(where: string, s: Record<string, unknown>, override: boolean): string[] {
  const errs: string[] = [];
  const enumField = (key: string, allowed: ReadonlySet<string>, nullable: boolean) => {
    const v = s[key];
    if (v === undefined || (nullable && v === null)) return;
    if (typeof v !== "string" || !allowed.has(v)) errs.push(`${where}.${key}: invalid value ${JSON.stringify(v)}`);
  };
  if (!override && s.category === undefined) errs.push(`${where}.category: required`);
  enumField("category", CATEGORIES, false);
  enumField("otherArgs", ROLES, false);
  enumField("resultSource", SOURCES, override);
  enumField("resultPrivate", PRIVATE, override);
  enumField("writeMode", WRITE_MODES, false);
  if (s.args !== undefined || !override) {
    if (!isRecord(s.args)) errs.push(`${where}.args: must be an object`);
    else {
      for (const [path, role] of Object.entries(s.args)) {
        if (!/^[A-Za-z_][\w-]*(?:\[\])?(?:\.[A-Za-z_][\w-]*(?:\[\])?)*$/.test(path)) errs.push(`${where}.args: bad path ${JSON.stringify(path)}`);
        if (typeof role !== "string" || !ROLES.has(role)) errs.push(`${where}.args.${path}: invalid role ${JSON.stringify(role)}`);
      }
    }
  }
  return errs;
}

/** Validates registry data loaded at runtime (the registry can be updated without a release). */
export function validateToolSpec(name: string, spec: unknown): string[] {
  if (!isRecord(spec)) return [`${name}: must be an object`];
  const errs = checkFields(name, spec, false);
  if (spec.actionParam !== undefined && typeof spec.actionParam !== "string") errs.push(`${name}.actionParam: must be a string`);
  if (spec.actions !== undefined) {
    if (!isRecord(spec.actions)) errs.push(`${name}.actions: must be an object`);
    else if (spec.actionParam === undefined) errs.push(`${name}.actions: needs actionParam`);
    else for (const [a, o] of Object.entries(spec.actions)) {
      if (!isRecord(o)) errs.push(`${name}.actions.${a}: must be an object`);
      else errs.push(...checkFields(`${name}.actions.${a}`, o, true));
    }
  }
  return errs;
}
