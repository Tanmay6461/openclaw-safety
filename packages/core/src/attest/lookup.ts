import type { GuardEnv } from "../env.js";
import type { ExecInfo } from "../exec/classify.js";
import type { Attestation, AttestKind, SessionState } from "../session.js";
import { normalizeEmail, normalizeHandle, normalizeLoose, normalizePhone } from "./normalize.js";
import { argvHasPrefix, argvKey } from "./shell.js";

export function lookupAttested(
  kind: AttestKind,
  value: string,
  session: SessionState,
  env: GuardEnv,
): Attestation | undefined {
  return session.attested.get(kind, value) ?? env.staticAttested.get(kind, value);
}

/** Every normalized form a destination value could take. */
export function destinationForms(value: string, env: GuardEnv): [AttestKind, string][] {
  const forms: [AttestKind, string | null][] = [
    ["email", normalizeEmail(value, env.stripPlusTag !== undefined ? { stripPlusTag: env.stripPlusTag } : {})],
    ["phone", normalizePhone(value, env.defaultCallingCode ? { defaultCallingCode: env.defaultCallingCode } : {})],
    ["handle", value.trim().startsWith("@") ? normalizeHandle(value) : null],
    ["string", normalizeLoose(value)],
  ];
  return forms.filter((f): f is [AttestKind, string] => f[1] !== null);
}

export function isOwnerIdentity(value: string, env: GuardEnv): boolean {
  return destinationForms(value, env).some(([, v]) => env.ownerIdentities.has(v));
}

export function attestDestination(value: string, session: SessionState, env: GuardEnv): Attestation | undefined {
  for (const [kind, v] of destinationForms(value, env)) {
    const a = lookupAttested(kind, v, session, env);
    if (a) return a;
  }
  return undefined;
}

/**
 * A command is attested if the owner typed exactly this command, or it's a simple command whose
 * argv starts with a prefix rule. Commands with shell syntax only ever match exactly (§5.6).
 */
export function attestCommand(exec: ExecInfo, session: SessionState, env: GuardEnv): Attestation | undefined {
  const exact = lookupAttested("command", exec.raw.trim(), session, env);
  if (exact) return exact;
  if (!exec.parsed.simple) return undefined;
  const { argv } = exec.parsed;
  const byArgv = lookupAttested("command", argvKey(argv), session, env);
  if (byArgv) return byArgv;
  if (env.commandPrefixRules.some((p) => argvHasPrefix(argv, p))) {
    return { origin: "allowlist", ref: "commandPrefixes", at: 0 };
  }
  return undefined;
}
