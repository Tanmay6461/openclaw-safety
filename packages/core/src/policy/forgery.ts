import { normalizePath } from "../attest/normalize.js";
import { pathContext, type GuardEnv } from "../env.js";
import type { ExecInfo } from "../exec/classify.js";
import type { Role } from "../types.js";

/**
 * Approval forgery (phase0/channel-results.md, c4b and c4g). An agent that can reach the Gateway
 * with its credentials resolves its own pending approvals: a background exec read the token from
 * openclaw.json and ran `openclaw approvals resolve`, and the gated call then ran with no human
 * involved. So reading Gateway secrets, running the openclaw CLI, and connecting to the Gateway
 * port are blocked in every session state, mode, and trigger.
 */
export interface Forgery {
  arg: string;
  role: Role;
  value: string;
  reason: string;
}

const SECRET_ENV = /\b(?:OPENCLAW_GATEWAY_(?:TOKEN|PASSWORD)|CLAWDBOT_GATEWAY_TOKEN)\b/;
// $OPENCLAW_STATE_DIR, ${OPENCLAW_CONFIG_PATH}, and the config file named outright.
const STATE_REF = /\$\{?OPENCLAW_(?:STATE_DIR|CONFIG_PATH|HOME)\b|(?:^|[^\w.-])openclaw\.json\b/;
// The whole environment: printenv, bare env, export -p, /proc/<pid>/environ.
const ENV_DUMP = /(?:^|[;&|(`]\s*|\$\(\s*)(?:printenv|env|export\s+-p)\s*(?:$|[;&|)`>])|\/proc\/[^/\s]+\/environ/;
const LOOPBACK_PORT = /(?:localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1?\]|\[::ffff:127(?:\.\d{1,3}){3}\])\s*:\s*(\d{2,5})\b/gi;

function loopbackHost(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  return h === "localhost" || h.endsWith(".localhost") || /^127(?:\.\d{1,3}){3}$/.test(h) || h === "0.0.0.0" || h === "::1" || h === "::" || /^::ffff:127\./.test(h);
}

const REASON = {
  secret: "This touches the Gateway's credentials or state",
  cli: "This runs the openclaw CLI, which can approve pending actions with the Gateway's own credentials",
  port: "This connects to the OpenClaw Gateway",
};

export function forgeryInPath(arg: string, value: string, env: GuardEnv): Forgery | null {
  if (!env.gatewaySecrets.matches(normalizePath(value, pathContext(env)))) return null;
  return { arg, role: "path", value, reason: `${REASON.secret} (${value}).` };
}

export function forgeryInUrl(arg: string, value: string, env: GuardEnv): Forgery | null {
  let u: URL;
  try {
    u = new URL(value.trim());
  } catch {
    return null;
  }
  if (!/^(?:https?|wss?):$/.test(u.protocol)) return null;
  const port = Number(u.port || (u.protocol === "https:" || u.protocol === "wss:" ? 443 : 80));
  if (!loopbackHost(u.hostname) || !env.gatewayPorts.includes(port)) return null;
  return { arg, role: "egress_url", value, reason: `${REASON.port} (${u.host}).` };
}

export function forgeryInExec(arg: string, info: ExecInfo, cwd: string, env: GuardEnv): Forgery | null {
  const hit = (reason: string): Forgery => ({ arg, role: "code", value: info.raw, reason });
  if (info.openclawCli) return hit(`${REASON.cli}.`);
  const ctx = { ...pathContext(env), cwd };
  for (const p of info.pathArgs) {
    if (env.gatewaySecrets.matches(normalizePath(p, ctx))) return hit(`${REASON.secret} (${p}).`);
  }
  if (STATE_REF.test(info.raw) || SECRET_ENV.test(info.raw)) return hit(`${REASON.secret}.`);
  if (ENV_DUMP.test(info.raw)) return hit("This prints the environment, which can hold the Gateway's token.");
  for (const m of info.raw.matchAll(LOOPBACK_PORT)) {
    if (env.gatewayPorts.includes(Number(m[1]))) return hit(`${REASON.port} (${m[0]}).`);
  }
  return null;
}
