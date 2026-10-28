import { attestCommand, attestDestination, isOwnerIdentity } from "../attest/lookup.js";
import { hostMatches, normalizePath, normalizeUrl } from "../attest/normalize.js";
import { pathContext, type GuardEnv } from "../env.js";
import { classifyExec, type ExecInfo } from "../exec/classify.js";
import { forgeryInExec, forgeryInPath, forgeryInUrl, type Forgery } from "./forgery.js";
import { rolePaths, specFor } from "../registry/resolve.js";
import { redactSecrets, scanSecrets } from "../secrets/scan.js";
import type { SessionState } from "../session.js";
import type { ActionCategory, Role, ToolCall, ToolSpec } from "../types.js";
import { classifyEgressUrl } from "../urls/classify.js";
import { rewriteOutbound } from "../urls/rewrite.js";
import { collectStrings, mapStringsAtPath, sanitizePreview, valuesAtPath } from "../util.js";

export type Verdict = "allow" | "ask" | "block";

export type FindingStatus = "owner" | "attested" | "link_following" | "constructed" | "unattested" | "protected";

export interface Finding {
  /** Spec path of the argument. */
  arg: string;
  role: Role;
  value: string;
  status: FindingStatus;
  via?: string;
}

export interface Decision {
  verdict: Verdict;
  /** Human-readable, most severe first. */
  reasons: string[];
  findings: Finding[];
  /** Full params to run with instead of the originals (defanging, redaction, command neutralizing). */
  rewrite?: Record<string, unknown>;
  /** Enforced even in shadow mode or while paused (§4.3). */
  hardSink: boolean;
  /** Lethal-trifecta egress: also enforced in shadow mode (§4.3). */
  trifecta: boolean;
  spec: ToolSpec;
}

const SEVERITY: Record<Verdict, number> = { allow: 0, ask: 1, block: 2 };

class Builder {
  private verdict: Verdict = "allow";
  private readonly reasons: { v: Verdict; text: string }[] = [];
  readonly findings: Finding[] = [];
  private working: Record<string, unknown>;
  private changed = false;
  hardSink = false;
  trifecta = false;

  constructor(
    readonly spec: ToolSpec,
    params: Record<string, unknown>,
  ) {
    this.working = params;
  }

  raise(v: Verdict, text: string): void {
    if (SEVERITY[v] > SEVERITY[this.verdict]) this.verdict = v;
    this.reasons.push({ v, text });
  }

  note(text: string): void {
    this.raise("allow", text);
  }

  /** Rewrites string leaves at `path` in the working params. Returns how many changed. */
  map(path: string, fn: (s: string) => string): number {
    let n = 0;
    const next = mapStringsAtPath(this.working, path, (s) => {
      const r = fn(s);
      if (r !== s) n++;
      return r;
    });
    if (n > 0) {
      this.working = next;
      this.changed = true;
    }
    return n;
  }

  /** Strings at `path` in the working params (after earlier rewrites). */
  current(path: string): string[] {
    return valuesAtPath(this.working, path).flatMap((v) => collectStrings(v));
  }

  build(): Decision {
    const reasons = [...this.reasons].sort((a, b) => SEVERITY[b.v] - SEVERITY[a.v]).map((r) => r.text);
    const d: Decision = {
      verdict: this.verdict,
      reasons,
      findings: this.findings,
      hardSink: this.hardSink,
      trifecta: this.trifecta,
      spec: this.spec,
    };
    if (this.changed) d.rewrite = this.working;
    return d;
  }
}

interface ArgValue {
  arg: string;
  value: string;
}

export function argValues(call: ToolCall, spec: ToolSpec, role: Role): ArgValue[] {
  const out: ArgValue[] = [];
  for (const arg of rolePaths(spec, call.params, role)) {
    for (const v of valuesAtPath(call.params, arg)) for (const value of collectStrings(v)) out.push({ arg, value });
  }
  return out;
}

function pathsWithRole(spec: ToolSpec, params: Record<string, unknown>, ...roles: Role[]): string[] {
  return roles.flatMap((r) => rolePaths(spec, params, r));
}

/** Categories whose text can reach someone; checked for chat commands and secrets. */
const OUTBOUND: ReadonlySet<ActionCategory> = new Set([
  "outbound_communication",
  "inter_session",
  "autonomous_scheduling",
  "unknown",
]);
const SECRET_SCANNED: ReadonlySet<ActionCategory> = new Set(["outbound_communication", "external_retrieval", "unknown"]);

/**
 * Host and guard chat commands. If the agent can put one in a message that comes back as owner
 * input (WhatsApp self-chat), it could approve its own actions (§5.9). Provisional list until the
 * OpenClaw command set is confirmed.
 */
const CHAT_COMMAND = /(^|[\s(>"'`])\/(approve|deny|reject|allow|guard|config|plugins?|elevated|allowlist)\b/gi;

export function neutralizeChatCommands(text: string): { text: string; found: string[] } {
  const found: string[] = [];
  const out = text.replace(CHAT_COMMAND, (_m, pre: string, cmd: string) => {
    found.push(`/${cmd}`);
    return `${pre}[/]${cmd}`;
  });
  return { text: out, found };
}

function findForgery(call: ToolCall, spec: ToolSpec, env: GuardEnv, execs: { arg: string; info: ExecInfo }[], cwd: string): Forgery | null {
  for (const e of execs) {
    const f = forgeryInExec(e.arg, e.info, cwd, env);
    if (f) return f;
  }
  for (const role of ["egress_url", "destination", "path"] as const) {
    for (const v of argValues(call, spec, role)) {
      const f = forgeryInUrl(v.arg, v.value, env) ?? (role === "path" ? forgeryInPath(v.arg, v.value, env) : null);
      if (f) return f;
    }
  }
  return null;
}

function short(v: string): string {
  return sanitizePreview(v, 60);
}

/**
 * The policy decision for one tool call (§5.8). Pure apart from reading session and store state;
 * the caller applies up-front labels and rate-limit bookkeeping after an allow.
 */
export function decide(call: ToolCall, session: SessionState, env: GuardEnv): Decision {
  const spec = specFor(call, env);
  const b = new Builder(spec, call.params);
  const p = env.preset;
  const tainted = session.tainted;
  const priv = session.holdsPrivate;
  const autonomous = session.trigger !== "owner";
  const now = env.now();

  const urls = argValues(call, spec, "egress_url");
  const dests = argValues(call, spec, "destination");
  // A URL in a destination slot (webhooks) is an egress URL.
  for (const d of dests) if (normalizeUrl(d.value) !== null) urls.push(d);
  const realDests = dests.filter((d) => normalizeUrl(d.value) === null);
  // A URL in a path slot (message media, attachments) is fetched by the host: also egress.
  const pathVals = argValues(call, spec, "path");
  for (const v of pathVals) if (normalizeUrl(v.value) !== null) urls.push(v);
  const localPaths = pathVals.filter((v) => normalizeUrl(v.value) === null);

  // Exec commands, and the paths they or file tools touch.
  const execs: { arg: string; info: ExecInfo }[] = argValues(call, spec, "code").map((c) => ({
    arg: c.arg,
    info: classifyExec(c.value),
  }));
  // For exec, the path-role argument is the working directory.
  const cwdArg = spec.category === "privileged_execution" ? localPaths[0] : undefined;
  const ctx = pathContext(env, cwdArg ? normalizePath(cwdArg.value, pathContext(env)) : env.cwd);

  // Approval forgery: blocked before anything else, read-only tools and owner turns included.
  const forged = findForgery(call, spec, env, execs, ctx.cwd);
  if (forged) {
    b.hardSink = true;
    b.findings.push({ arg: forged.arg, role: forged.role, value: forged.value, status: "protected" });
    b.raise("block", `${forged.reason} With that the agent could approve its own actions, so the guard always blocks it. If you need this, run it yourself in a terminal.`);
    return b.build();
  }

  if (spec.category === "read_only" && urls.length === 0) {
    b.note("read-only tool");
    return b.build();
  }

  // Browsing to a messaging or webmail client acts as the owner there: hard sink (§5.9).
  for (const u of urls) {
    const n = normalizeUrl(u.value);
    const host = n === null ? null : new URL(n).hostname;
    if (host === null || !env.sensitiveHosts.some((h) => hostMatches(host, h))) continue;
    b.hardSink = true;
    b.findings.push({ arg: u.arg, role: "egress_url", value: u.value, status: "protected" });
    if (tainted) b.raise("block", `Opening ${host} lets the agent act as you in that app, and the session has read untrusted content.`);
    else b.raise("ask", `Opening ${host} lets the agent act as you in that app.`);
    return b.build();
  }

  const protectedHits: ArgValue[] = [];
  for (const v of localPaths) {
    if (env.protectedPaths.matches(normalizePath(v.value, pathContext(env)))) protectedHits.push(v);
  }
  for (const e of execs) {
    for (const pa of e.info.pathArgs) {
      if (env.protectedPaths.matches(normalizePath(pa, ctx))) protectedHits.push({ arg: e.arg, value: pa });
    }
  }

  // Config, policy, protected paths: hard sinks (§5.12).
  const configLike =
    spec.category === "config" || argValues(call, spec, "config").length > 0 || execs.some((e) => e.info.guardCli);
  if (configLike || protectedHits.length > 0) {
    b.hardSink = true;
    for (const h of protectedHits) b.findings.push({ arg: h.arg, role: "path", value: h.value, status: "protected" });
    const what = configLike
      ? "changes OpenClaw or guard configuration"
      : `touches a protected path (${short(protectedHits[0]!.value)})`;
    if (p.protectedWrite === "strict") b.raise("block", `This ${what}; under the Strict preset that's only possible through /guard commands.`);
    else if (tainted) b.raise("block", `This ${what}, and the session has read untrusted content.`);
    else b.raise("ask", `This ${what}.`);
    return b.build();
  }

  if (spec.category === "install") {
    b.hardSink = true;
    if (tainted) b.raise("block", "Installing skills or plugins isn't allowed after the session has read untrusted content.");
    else if (autonomous) b.raise("ask", "An automatic run wants to install a skill or plugin.");
    else b.note("install requested by the owner in a clean session");
    return b.build();
  }

  // Neutralize chat commands in outgoing text, in every mode and session state.
  if (OUTBOUND.has(spec.category)) {
    const found: string[] = [];
    for (const path of pathsWithRole(spec, call.params, "content", "deferred_instruction")) {
      b.map(path, (s) => {
        const n = neutralizeChatCommands(s);
        found.push(...n.found);
        return n.text;
      });
    }
    if (found.length > 0) {
      b.hardSink = true;
      b.note(`Neutralized ${[...new Set(found)].join(", ")} in outgoing text so it can't act as a command.`);
    }
  }

  if (!tainted && !autonomous) {
    b.note("clean session started by the owner");
    return b.build();
  }

  // Destinations.
  let attestedNonOwner = false;
  for (const d of realDests) {
    if (isOwnerIdentity(d.value, env)) {
      b.findings.push({ ...d, role: "destination", status: "owner" });
      continue;
    }
    const att = attestDestination(d.value, session, env);
    if (att) {
      attestedNonOwner = true;
      b.findings.push({ ...d, role: "destination", status: "attested", via: att.origin });
      continue;
    }
    b.findings.push({ ...d, role: "destination", status: "unattested" });
    if (tainted) {
      if (priv) b.trifecta = true;
      b.raise(p.unattestedDestinationTainted, `${short(d.value)} didn't come from you, and this session read untrusted content.`);
    }
  }
  if (attestedNonOwner && tainted && priv && p.attestedNonOwnerTaintedPrivate === "ask") {
    b.raise("ask", "This sends to someone other than you while the session holds untrusted content and private data.");
  }

  // Egress URLs.
  for (const u of urls) {
    const r = classifyEgressUrl(u.value, session, env);
    b.findings.push({ arg: u.arg, role: "egress_url", value: u.value, status: r.cls, ...(r.via && { via: r.via }) });
    if (!tainted) continue;
    const host = r.host ?? short(u.value);
    if (r.cls === "constructed") {
      if (priv) {
        b.trifecta = true;
        b.raise(
          p.constructedUrlTaintedPrivate,
          `The agent built this URL (${host}) itself, and the session holds untrusted content and private data, so the URL could carry that data out.`,
        );
      } else if (p.constructedUrlTaintedOnly === "ask" || (p.constructedUrlTaintedOnly === "ask_if_suspicious" && r.suspicious)) {
        b.raise("ask", `The agent built this URL (${host}) itself after reading untrusted content${r.suspicious ? ", and it has a query string or encoded-looking parts" : ""}.`);
      }
    } else if (r.cls === "attested" && r.via === "domain_allowlist" && r.sharedHosting && priv) {
      const mode = p.sharedHostingTaintedPrivate;
      if (mode === "ask" || (mode === "ask_if_suspicious" && r.suspicious)) {
        b.raise("ask", `${host} is on your allowlist, but anyone can publish there, and this session holds untrusted content and private data.`);
      }
    } else if (r.cls === "link_following" && priv) {
      if (p.linkFollowing === "ask_if_private") {
        b.raise("ask", `Following a link to ${host} while the session holds private data.`);
      } else if (p.linkFollowing === "allow_rate_limited_if_private" && r.domain) {
        const { max, windowMs } = env.linkFollowLimit;
        if (session.linkFollowCount(r.domain, now - windowMs) >= max) {
          b.raise("ask", `The agent has followed ${max} links to ${r.domain} in the last ${Math.round(windowMs / 60000)} minutes while holding private data.`);
        }
      }
    }
  }

  // Exec.
  for (const { arg, info } of execs) {
    const att = attestCommand(info, session, env);
    b.findings.push({ arg, role: "code", value: info.raw, status: att ? "attested" : "unattested", ...(att && { via: att.origin }) });
    if (info.sensitive && autonomous) {
      b.raise(p.sensitiveExecAutonomous, `An automatic run wants to run a sensitive command (${info.sensitive}).`);
    }
    if (info.scheduling && tainted) {
      b.raise(p.cronTainted, "This command schedules future work, and the session has read untrusted content.");
    }
    if (!att && tainted) {
      b.raise(p.execUnattestedTainted, "This command didn't come from you, and the session has read untrusted content.");
    }
  }

  if (spec.category === "autonomous_scheduling" && tainted) {
    b.raise(p.cronTainted, "This schedules future work from a session that has read untrusted content.");
  }

  if (spec.category === "unknown" && tainted && priv) {
    const hasText = argValues(call, spec, "content").some((v) => v.value.trim() !== "");
    if (hasText) b.raise("ask", `${short(call.tool)} isn't a tool the guard knows, and the session holds untrusted content and private data.`);
  }

  // Outgoing content: secret scan, then defang constructed URLs.
  const ownerOnly = realDests.length > 0 && b.findings.filter((f) => f.role === "destination").every((f) => f.status === "owner");
  const contentPaths = pathsWithRole(spec, call.params, "content");
  if (tainted && priv && !ownerOnly && SECRET_SCANNED.has(spec.category)) {
    const text = contentPaths.flatMap((a) => b.current(a)).join("\n");
    const scan = text.trim() === "" ? { matched: false, reasons: [] } : scanSecrets(text, session, env.hmacKey);
    if (scan.matched) {
      if (p.secretMatch === "redact") {
        for (const a of contentPaths) b.map(a, (s) => redactSecrets(s, session, env.hmacKey));
        b.note("Redacted secrets from outgoing text.");
      } else {
        b.raise("ask", `The outgoing text ${scan.reasons[0]}.`);
      }
    }
  }
  // Outgoing local files can carry private data that the text scan never sees.
  if (tainted && priv && !ownerOnly && spec.category === "outbound_communication" && localPaths.length > 0) {
    b.raise("ask", `This sends a file (${short(localPaths[0]!.value)}) to someone other than you while the session holds untrusted content and private data.`);
  }
  if (tainted && spec.category === "outbound_communication") {
    const isConstructed = (url: string) => classifyEgressUrl(url, session, env).cls === "constructed";
    let defanged = 0;
    let images = 0;
    for (const a of contentPaths) {
      b.map(a, (s) => {
        const r = rewriteOutbound(s, isConstructed);
        defanged += r.defanged.length;
        images += r.strippedImages;
        return r.text;
      });
    }
    if (defanged + images > 0) b.note(`Defanged ${defanged} link(s) the agent built and removed ${images} image(s).`);
  }

  if (spec.category === "persistence_write") b.note("write allowed; the file inherits this session's labels");
  if (spec.category === "inter_session") b.note("allowed; the target session inherits this session's labels");
  return b.build();
}
