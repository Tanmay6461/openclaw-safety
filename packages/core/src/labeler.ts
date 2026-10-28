import { attestCommand } from "./attest/lookup.js";
import { normalizePath, normalizeUrl } from "./attest/normalize.js";
import { pathContext, type GuardEnv } from "./env.js";
import { classifyExec } from "./exec/classify.js";
import type { Decision } from "./policy/decide.js";
import { rolePaths, specFor } from "./registry/resolve.js";
import { findSecretFormats, rememberPrivateTokens } from "./secrets/scan.js";
import { labelsEmpty, mergeLabels, type SessionState } from "./session.js";
import type { Role, SourceKind, SourceRef, ToolCall, ToolSpec } from "./types.js";
import { classifyEgressUrl } from "./urls/classify.js";
import { recordSeenUrls } from "./urls/seen.js";
import { collectStrings, valuesAtPath } from "./util.js";

function valuesFor(call: ToolCall, spec: ToolSpec, role: Role): string[] {
  return rolePaths(spec, call.params, role).flatMap((a) => valuesAtPath(call.params, a).flatMap((v) => collectStrings(v)));
}

function isUnder(abs: string, dir: string): boolean {
  return abs === dir || abs.startsWith(dir.endsWith("/") ? dir : `${dir}/`);
}

/** Labels a file read adds: stored labels, exec windows, untrusted paths, private paths (§5.4). */
function labelFileRead(abs: string, session: SessionState, env: GuardEnv, at: number): { privateSource: boolean } {
  const rec = env.store.getArtifact(abs);
  if (rec) {
    session.addLabels(rec.labels);
  } else {
    if (env.untrustedPaths.matches(abs)) session.addUntrusted({ kind: "file", id: abs, at });
    const windows = env.store.execWindows().filter((w) => isUnder(abs, w.cwd));
    if (windows.length > 0) {
      const mtime = env.mtime?.(abs);
      for (const w of windows) if (mtime !== undefined && mtime >= w.start) session.addLabels(w.labels);
    }
  }
  const privateSource = env.privatePaths.matches(abs);
  if (privateSource) session.addPrivate("private_file");
  return { privateSource };
}

/**
 * Up-front labeling, run in before_tool_call once a call is allowed (§5.2 label timing). Applies
 * every label knowable from the tool and its arguments before the call runs, so labels never
 * depend on after_tool_call, and registers the call as pending until its content is labeled.
 */
export function applyUpfrontLabels(call: ToolCall, session: SessionState, env: GuardEnv, decision?: Decision): void {
  const spec = decision?.spec ?? specFor(call, env);
  const at = env.now();
  const ref = (kind: SourceKind, id: string): SourceRef => ({ kind, id, at });
  let privateSource = false;

  switch (spec.resultSource) {
    case "web":
    case "email":
    case "hook":
    case "skill_output":
    case "external_sender":
    case "inter_session":
    case "exec_output":
    case "unknown": {
      const url = valuesFor(call, spec, "egress_url").map(normalizeUrl).find((u) => u !== null);
      session.addUntrusted(ref(spec.resultSource, url ? new URL(url).hostname : call.tool));
      if (spec.resultSource === "email" && env.privateSources.has("email")) {
        session.addPrivate("email");
        privateSource = true;
      }
      break;
    }
    case "file":
      for (const p of valuesFor(call, spec, "path")) {
        privateSource = labelFileRead(normalizePath(p, pathContext(env)), session, env, at).privateSource || privateSource;
      }
      break;
    case "memory":
      // File-level fallback until entry-level memory labels land (Phase 3, §5.11).
      for (const rec of env.store.artifacts()) if (env.memoryPaths.matches(rec.path)) session.addLabels(rec.labels);
      if (env.privateSources.has("memory")) {
        session.addPrivate("memory");
        privateSource = true;
      }
      break;
    default:
      break;
  }
  if (spec.resultPrivate) {
    session.addPrivate(spec.resultPrivate);
    privateSource = true;
  }

  if (spec.category === "privileged_execution") {
    const cwdRaw = valuesFor(call, spec, "path")[0];
    const cwd = cwdRaw ? normalizePath(cwdRaw, pathContext(env)) : env.cwd;
    for (const command of valuesFor(call, spec, "code")) {
      const info = classifyExec(command);
      const trustedOutput = info.readOnly && attestCommand(info, session, env) !== undefined;
      if (!trustedOutput) session.addUntrusted(ref("exec_output", call.id));
      for (const pa of info.pathArgs) {
        privateSource = labelFileRead(normalizePath(pa, pathContext(env, cwd)), session, env, at).privateSource || privateSource;
      }
      for (const t of info.downloadTargets) {
        env.store.putArtifact({ path: normalizePath(t, pathContext(env, cwd)), labels: session.labels(), sessionKey: session.sessionKey, updatedAt: at });
      }
      if (session.tainted) env.store.addExecWindow({ sessionKey: session.sessionKey, cwd, start: at, labels: session.labels() });
    }
  }

  if (spec.category === "persistence_write") {
    for (const p of valuesFor(call, spec, "path")) {
      const abs = normalizePath(p, pathContext(env));
      const prev = env.store.getArtifact(abs);
      const labels = spec.writeMode === "merge" && prev ? mergeLabels(prev.labels, session.labels()) : session.labels();
      if (prev || !labelsEmpty(labels)) {
        env.store.putArtifact({ path: abs, labels, sessionKey: session.sessionKey, updatedAt: at });
      }
    }
  }

  // Link-following bookkeeping for the rate limit (§5.6).
  if (session.holdsPrivate) {
    for (const u of valuesFor(call, spec, "egress_url")) {
      const r = classifyEgressUrl(u, session, env);
      if (r.cls === "link_following" && r.domain) session.recordLinkFollow(r.domain, at);
    }
  }

  if (spec.resultSource || spec.resultPrivate || spec.category === "privileged_execution") {
    session.addPending(call.id, { privateSource });
  }
}

/**
 * Content labeling, run in tool_result_persist (synchronous, in memory). Records eligible URLs
 * and private tokens, and clears the call's pending state.
 */
export function labelContent(call: ToolCall, content: string, session: SessionState, env: GuardEnv): void {
  const spec = specFor(call, env);
  const pending = session.takePending(call.id);
  const kind: SourceKind | undefined = spec.category === "privileged_execution" ? "exec_output" : spec.resultSource;
  if (kind) recordSeenUrls(session, content, { kind, id: call.id, at: env.now() }, call.params, env);

  // Credentials showing up in command output or files make the session private.
  const formats = kind === "exec_output" || kind === "file" ? findSecretFormats(content) : [];
  if (formats.length > 0) session.addPrivate("secret");
  if (pending?.privateSource || formats.length > 0) rememberPrivateTokens(session, content, env.hmacKey);
}

/** The call's content will never be seen (e.g. Codex-native tool records): assume the worst. */
export function markContentUnavailable(call: ToolCall, session: SessionState): void {
  const pending = session.takePending(call.id);
  if (pending?.privateSource) session.markUnscannedPrivate();
}

/** Inbound content from anyone but the owner's typed text (§5.4): taints and records URLs. */
export function labelInbound(session: SessionState, content: string, source: SourceRef, env: GuardEnv): void {
  session.addUntrusted(source);
  recordSeenUrls(session, content, source, undefined, env);
}
