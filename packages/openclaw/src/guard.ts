import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  applyUpfrontLabels,
  approvalText,
  AttestedValues,
  auditRecord,
  createEnv,
  decide,
  DEFAULT_GATEWAY_PORT,
  destinationForms,
  enforce,
  gatewaySecretPaths,
  hmac,
  ingestOwnerMessage,
  JsonlAuditLog,
  labelContent,
  execWindowLabels,
  labelInbound,
  labelsEmpty,
  memoryLabelsIn,
  mergeLabels,
  normalizeUrl,
  parseSimpleCommand,
  PRESETS,
  classifyEgressUrl,
  realpathBestEffort,
  redactSecrets,
  rewriteOutbound,
  SessionState,
  type AuditRecord,
  type Decision,
  type GuardEnv,
  type Outcome,
  type ToolCall,
  type Trigger,
} from "@provenance-guard/core";
import type { GuardConfig, GuardMode } from "./config.js";
import { approvalsOwnerOnly, doctorChecks, type DoctorCheck } from "./doctor.js";
import type {
  AfterToolCallEvent,
  AgentContext,
  ApprovalDecision,
  BeforeAgentRunEvent,
  BeforeToolCallEvent,
  BeforeToolCallResult,
  MessageContext,
  ModelContext,
  MessageReceivedEvent,
  PluginApi,
  ReplyPayloadEvent,
  SessionEvent,
  ToolCallContext,
  ToolResultPersistContext,
  ToolResultPersistEvent,
} from "./host.js";
import { loadRegistry, type OpenClawRegistry } from "./registry/index.js";
import { innerCallIdsFor, prepareCall, unwrapMetaCall, type CallContext, type PreparedCall } from "./registry/prepare.js";
import { KeyedGuardStore } from "./host-store.js";
import { FileBackedStore, type GuardRule, type GuardStore } from "./store.js";

/** Auto-loaded workspace files (plan §5.11); a labeled one taints every session that loads it. */
const BOOTSTRAP_FILES = ["AGENTS.md", "SOUL.md", "IDENTITY.md", "USER.md", "BOOTSTRAP.md", "MEMORY.md"];
const MAX_TRACKED_CALLS = 2000;
const MAX_TRACKED_RUNS = 1000;
const MAX_INBOUND_IDS = 5000;

interface RunInfo {
  trigger?: string;
  senderIsOwner?: boolean;
  provenanceKind?: string;
  sessionKey?: string;
}

/** An ask waiting for `/guard allow <code>` (confirm: command). */
export interface PendingConfirmation {
  code: string;
  sessionKey: string;
  tool: string;
  digest: string;
  summary: string;
  createdAt: number;
  expiresAt: number;
  granted?: "once" | "always";
  call: ToolCall;
  decision: Decision;
}

const MAX_CONFIRMATIONS = 50;

export interface AuditSink {
  append(rec: AuditRecord | Record<string, unknown>): void;
}

export interface GuardDeps {
  api: PluginApi;
  now?: () => number;
  registry?: OpenClawRegistry;
  store?: GuardStore;
  audit?: AuditSink;
  hmacKey?: string;
}

class DeadlineError extends Error {}

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (typeof p === "string" ? p : p && typeof p === "object" && typeof (p as { text?: unknown }).text === "string" ? (p as { text: string }).text : ""))
      .join("\n");
  }
  return "";
}

function bounded<K, V>(map: Map<K, V>, max: number): void {
  while (map.size > max) map.delete(map.keys().next().value as K);
}

function get(obj: unknown, ...keys: string[]): unknown {
  let cur = obj;
  for (const k of keys) cur = cur && typeof cur === "object" ? (cur as Record<string, unknown>)[k] : undefined;
  return cur;
}

/**
 * The OpenClaw adapter: wires the core engine to OpenClaw's hooks (plan §5.2). One instance per
 * gateway. Handlers never throw to the host: failures mark the session degraded and fall back to
 * failMode (§5.12).
 */
export class Guard {
  readonly env: GuardEnv;
  readonly registry: OpenClawRegistry;
  readonly store: GuardStore;
  private readonly api: PluginApi;
  private readonly now: () => number;
  private readonly audit: AuditSink;
  private readonly sessions = new Map<string, SessionState>();
  private readonly calls = new Map<string, ToolCall>();
  private readonly returned = new Map<string, string>();
  private readonly runs = new Map<string, RunInfo>();
  private readonly parents = new Map<string, string>();
  private readonly urlRules: string[] = [];
  private readonly commandRules: string[][] = [];
  private readonly ownerSenders = new Set<string>();
  private readonly workspace: string;
  private readonly confirms = new Map<string, PendingConfirmation>();
  /** Message ids the agent received; approval-emoji reactions to these are acks (§5.9). */
  private readonly inboundIds = new Map<string, true>();
  /** Resolved `confirm` setting: how the owner confirms asks. */
  readonly confirmVia: "approval" | "command";
  /** Settles once persisted state is loaded; before_tool_call waits for it (host keyed store). */
  readonly ready: Promise<void>;
  isReady = true;
  readonly storageBackend: "host" | "file" | "injected";
  readonly counts = { allow: 0, ask: 0, block: 0, shadowed: 0, errors: 0, mismatches: 0 };
  mode: GuardMode;
  preset: "balanced" | "strict";
  pausedUntil = 0;

  constructor(
    readonly config: GuardConfig,
    deps: GuardDeps,
  ) {
    this.api = deps.api;
    this.now = deps.now ?? Date.now;
    this.registry = deps.registry ?? loadRegistry();
    const stateDir = config.stateDir ?? path.join(this.hostStateDir(), "provenance-guard");
    const open = this.api.runtime?.state?.openKeyedStore;
    const useHost = !deps.store && config.storage !== "file" && typeof open === "function";
    if (!deps.store && config.storage === "host" && !useHost) this.api.logger?.warn?.("[provenance-guard] storage: host keyed store unavailable; using store.json");
    if (useHost) {
      const keyed = new KeyedGuardStore(open.bind(this.api.runtime!.state), path.join(stateDir, "store.json"));
      this.store = keyed;
      this.isReady = false;
      this.ready = keyed.ready.then(() => {
        this.isReady = true;
        this.applyRuntimeState();
        this.log({ ts: this.now(), kind: "store-loaded", backend: "host", pid: process.pid, cmd: process.argv.slice(2, 4).join(" "), ...keyed.loaded });
        for (const e of keyed.loaded.errors) this.api.logger?.warn?.(`[provenance-guard] keyed store load failed: ${e}`);
      });
    } else {
      this.store = deps.store ?? new FileBackedStore(path.join(stateDir, "store.json"));
      this.ready = Promise.resolve();
    }
    this.storageBackend = deps.store ? "injected" : useHost ? "host" : "file";
    this.audit = deps.audit ?? new JsonlAuditLog(config.auditPath ?? path.join(stateDir, "audit.jsonl"));
    const saved = this.store.runtimeState();
    this.mode = saved.mode ?? config.mode;
    this.preset = saved.preset ?? config.preset;
    this.pausedUntil = saved.pausedUntil ?? 0;

    const home = os.homedir();
    // Labels are keyed by realpath, so the workspace (bootstrap files, memory) must be too.
    this.workspace = realpathBestEffort(
      path.resolve(String(get(this.api.config, "agents", "defaults", "workspace") ?? path.join(this.hostStateDir(), "workspace"))),
    );
    const hostState = this.hostStateDir();
    const configPath = process.env.OPENCLAW_CONFIG_PATH?.trim();
    const port = Number(get(this.api.config, "gateway", "port") ?? process.env.OPENCLAW_GATEWAY_PORT ?? DEFAULT_GATEWAY_PORT);
    const privatePaths = config.privateSources.filter((s) => s.startsWith("files:")).map((s) => s.slice(6));
    this.env = createEnv({
      home,
      cwd: this.workspace,
      hmacKey: deps.hmacKey ?? loadOrCreateKey(path.join(stateDir, "hmac.key")),
      preset: PRESETS[this.preset],
      now: this.now,
      registry: (name) => this.registry.lookup(name),
      trustedDomains: config.trusted.domains,
      urlPrefixRules: this.urlRules,
      commandPrefixRules: this.commandRules,
      privatePaths,
      memoryPaths: [path.join(this.workspace, "MEMORY.md"), path.join(this.workspace, "memory/**")],
      privateSources: new Set(config.privateSources.filter((s): s is "email" | "memory" => s === "email" || s === "memory")),
      store: this.store,
      ...(config.untrustedPaths.length > 0 && { untrustedPaths: config.untrustedPaths }),
      ...(config.protectedPaths.length > 0 && { protectedPaths: config.protectedPaths }),
      gatewaySecrets: [
        ...gatewaySecretPaths(hostState),
        ...gatewaySecretPaths(realpathBestEffort(hostState)),
        ...gatewaySecretPaths(stateDir),
        ...(configPath ? [configPath, `${configPath}.*`] : []),
      ],
      isInboundMessage: (id) => this.inboundIds.has(id),
      readText: readSmallText,
      // Exec windows (§5.4) label files changed under a tainted exec's cwd by modification time.
      mtime: (abs) => {
        try {
          return statSync(abs).mtimeMs;
        } catch {
          return undefined;
        }
      },
      gatewayPorts: Number.isInteger(port) && port > 0 && port !== DEFAULT_GATEWAY_PORT ? [port, DEFAULT_GATEWAY_PORT] : [DEFAULT_GATEWAY_PORT],
    });
    this.confirmVia = config.confirm === "auto" ? (approvalsOwnerOnly(this.doctor()) ? "approval" : "command") : config.confirm;
    this.loadIdentities();
    this.rebuildRules();
  }

  /**
   * Whether OpenClaw prompts on every exec. Mode-based policies (`tools.exec.mode`) never do: "ask"
   * asks only on an allowlist miss. Only the legacy `tools.exec.ask: "always"` without a mode does
   * (src/infra/exec-approvals-core.ts, resolveExecModePolicy).
   */
  hostExecAlwaysAsks(): boolean {
    const exec = get(this.api.config, "tools", "exec");
    if (get(exec, "mode") !== undefined) return false;
    return get(exec, "ask") === "always" && get(exec, "security") !== "deny";
  }

  /** Mode, preset and pause loaded from the store after construction (host keyed store). */
  private applyRuntimeState(): void {
    const saved = this.store.runtimeState();
    if (saved.mode) this.mode = saved.mode;
    if (saved.preset) this.setPresetQuiet(saved.preset);
    if (saved.pausedUntil !== undefined) this.pausedUntil = saved.pausedUntil;
    this.rebuildRules();
  }

  private setPresetQuiet(preset: "balanced" | "strict"): void {
    this.preset = preset;
    this.env.preset = PRESETS[preset];
  }

  doctor(): DoctorCheck[] {
    return doctorChecks(this.api.config, this.api.id, this.config.codexWebSearch, this.config.approvalTimeoutSec);
  }

  private hostStateDir(): string {
    try {
      const dir = this.api.runtime?.state?.resolveStateDir?.(process.env);
      if (dir) return dir;
    } catch {
      // fall through
    }
    return process.env.OPENCLAW_STATE_DIR ?? path.join(os.homedir(), ".openclaw");
  }

  /** Owner identities from `commands.ownerAllowFrom` (§4.2), and command prefix allowlists. */
  private loadIdentities(): void {
    const owners = get(this.api.config, "commands", "ownerAllowFrom");
    const ids = new Set<string>();
    for (const o of Array.isArray(owners) ? owners : []) {
      if (typeof o !== "string") continue;
      this.ownerSenders.add(o.toLowerCase());
      // "channel:id" also names the owner's DM in the target spellings channels use ("dm:id", "user:id").
      const id = o.includes(":") ? o.slice(o.indexOf(":") + 1) : o;
      for (const form of [o, `dm:${id}`, `user:${id}`]) for (const [, v] of destinationForms(form, this.env)) ids.add(v);
    }
    this.env.ownerIdentities = ids;
    for (const p of this.config.trusted.commandPrefixes) {
      const parsed = parseSimpleCommand(p);
      if (parsed.simple) this.commandRules.push(parsed.argv);
    }
  }

  /** Attested values outside sessions: `trusted.recipients` plus learned rules. */
  rebuildRules(): void {
    const att = new AttestedValues();
    for (const r of this.config.trusted.recipients) {
      for (const [kind, v] of destinationForms(r, this.env)) att.add(kind, v, { origin: "allowlist", ref: "trusted.recipients", at: 0 });
    }
    for (const rule of this.store.rules()) att.add(rule.kind, rule.value, { origin: "rule", ref: rule.id, at: rule.createdAt });
    this.env.staticAttested = att;
  }

  setMode(mode: GuardMode, pausedUntil = 0): void {
    this.mode = mode;
    this.pausedUntil = pausedUntil;
    this.store.setRuntimeState({ mode, preset: this.preset, pausedUntil });
  }

  setPreset(preset: "balanced" | "strict"): void {
    this.preset = preset;
    this.env.preset = PRESETS[preset];
    this.store.setRuntimeState({ mode: this.mode, preset, pausedUntil: this.pausedUntil });
  }

  session(key: string | undefined): SessionState {
    const k = key ?? "(no session)";
    let s = this.sessions.get(k);
    if (s) return s;
    const snap = this.store.getSession(k);
    s = snap ? SessionState.fromJSON(snap) : new SessionState({ sessionKey: k, trigger: "unknown" });
    // Bootstrap fallback (§5.11): labeled auto-loaded files taint the session before its first tool call.
    // Memory files count only for the labeled lines they hold now, so removing a line clears it.
    for (const f of BOOTSTRAP_FILES) {
      const abs = path.join(this.workspace, f);
      const rec = this.store.getArtifact(abs);
      if (rec) s.addLabels(rec.labels);
      // Changed under a tainted exec in a way the command parser didn't see (python -c, scripts).
      for (const l of execWindowLabels(abs, this.env)) s.addLabels(l);
      if (this.env.memoryPaths.matches(abs)) for (const e of memoryLabelsIn(this.env.readText?.(abs) ?? "", this.env)) s.addLabels(e.labels);
    }
    const parent = this.parents.get(k);
    if (parent && parent !== k) s.addLabels(this.session(parent).labels());
    // Isolated cron runs: agent:<id>:cron:<jobId>:run:<sessionId> (Phase 0 runtime).
    const job = this.cronJobLabels(/:cron:([^:]+)/.exec(k)?.[1]);
    if (job) s.addLabels(job);
    this.sessions.set(k, s);
    return s;
  }

  sessionsList(): SessionState[] {
    return [...this.sessions.values()];
  }

  private persist(s: SessionState): void {
    this.store.putSession(s.toJSON());
  }

  /**
   * Run trigger for a tool call (§4.2, runtime results). Owner needs the host's `senderIsOwner`;
   * `trigger: user` alone isn't enough, since sub-agent and inter-session runs report it too.
   */
  triggerFor(ctx: ToolCallContext): Trigger {
    if (ctx.requester?.senderIsOwner === true) return "owner";
    const run = ctx.runId ? this.runs.get(ctx.runId) : undefined;
    if (run?.provenanceKind === "inter_session") return "inter_session";
    if (run?.trigger === "cron") return "cron";
    if (run?.trigger === "heartbeat") return "heartbeat";
    // A channel turn from someone who isn't the owner. Sub-agent and inter-session runs also report
    // senderIsOwner false; they're caught above by provenance, or here by being a known child or
    // arriving through webchat (the Control UI's channel name for them, channel results).
    const r = ctx.requester;
    if (r?.senderIsOwner === false && r.senderId && r.channel && r.channel !== "webchat" && !this.parents.has(ctx.sessionKey ?? "")) return "non_owner";
    return "unknown";
  }

  private callContext(ctx: ToolCallContext): CallContext {
    const r = ctx.requester;
    const out: CallContext = {};
    if (r?.channel && r.senderId) out.currentConversation = `${r.channel}:${r.senderId}`;
    if (ctx.agentId) out.agentId = ctx.agentId;
    return out;
  }

  private enforcing(): boolean {
    return this.mode === "enforce" && this.pausedUntil <= this.now();
  }

  private record(call: ToolCall, outcome: Outcome, s: SessionState): void {
    this.counts[outcome.action]++;
    if (outcome.shadowed) this.counts.shadowed++;
    try {
      this.audit.append(auditRecord(call, outcome, s, this.env.hmacKey, this.now()));
    } catch {
      // The audit log must never break a decision.
    }
  }

  // ---- before_tool_call ---------------------------------------------------------------------

  beforeToolCall(event: BeforeToolCallEvent, ctx: ToolCallContext): BeforeToolCallResult {
    if (this.mode === "off") return { params: event.params };
    const start = this.now();
    const s = this.session(ctx.sessionKey);
    s.trigger = this.triggerFor(ctx);
    if (s.startedTainted === undefined) {
      // Taint creep (§5.11): the share of sessions that are already tainted when they start working.
      s.startedTainted = s.tainted;
      this.log({ ts: this.now(), kind: "session-start", sessionKey: s.sessionKey, tainted: s.tainted, private: s.holdsPrivate, trigger: s.trigger });
    }
    const canAsk = s.trigger === "owner";
    const cctx = this.callContext(ctx);
    try {
      // Compact surface: the inner tool gets its own before_tool_call; the wrapper only blocks early.
      const inner = unwrapMetaCall(event, this.registry, cctx);
      if (inner) {
        const d = decide(inner.call, s, this.env);
        if (d.verdict === "block" && (this.enforcing() || d.hardSink || d.trifecta)) {
          // The inner call never gets its own before_tool_call, so record the block here.
          this.record(inner.call, { action: "block", decision: d, shadowed: false }, s);
          return { block: true, blockReason: `[Guard] ${d.reasons[0] ?? "blocked"}` };
        }
        return { params: event.params };
      }

      const prepared = prepareCall(event, this.registry, cctx);
      const decision = decide(prepared.call, s, this.env);
      const granted = decision.verdict === "ask" && canAsk ? this.takeGrant(s.sessionKey, prepared.call) : undefined;
      const outcome: Outcome = granted
        ? { action: "allow", decision, shadowed: false, reason: "confirmed with /guard allow", ...(decision.rewrite && { params: decision.rewrite }) }
        : enforce(
            decision,
            prepared.call,
            s,
            { mode: this.mode === "enforce" ? "enforce" : "shadow", pausedUntil: this.pausedUntil, canAsk },
            this.now(),
            this.env.hmacKey,
          );
      if (granted) this.onResolution(granted.granted === "always" ? "allow-always" : "allow-once", granted.call, granted.decision);
      if (this.now() - start > this.config.deadlineMs) throw new DeadlineError("deadline exceeded");

      // Up-front labels for anything that may run. Labeling an ask that ends up denied over-labels,
      // which is the safe direction.
      if (outcome.action !== "block") applyUpfrontLabels(prepared.call, s, this.env, decision);
      this.calls.set(prepared.call.id, prepared.call);
      bounded(this.calls, MAX_TRACKED_CALLS);
      this.persist(s);
      this.record(prepared.call, outcome, s);
      const result = this.toHost(outcome, decision, prepared, s);
      if (result.params && event.toolCallId) {
        this.returned.set(event.toolCallId, JSON.stringify(result.params));
        bounded(this.returned, MAX_TRACKED_CALLS);
      }
      return result;
    } catch (err) {
      s.markDegraded();
      this.counts.errors++;
      try {
        this.audit.append({ ts: this.now(), kind: "error", tool: event.toolName, sessionKey: s.sessionKey, error: String(err) });
      } catch {
        // ignore
      }
      return this.failResult(event, canAsk);
    }
  }

  private toHost(outcome: Outcome, decision: Decision, prepared: PreparedCall, s: SessionState): BeforeToolCallResult {
    const reason = outcome.reason ?? decision.reasons[0] ?? "blocked";
    if (outcome.action === "block") {
      const stop = outcome.stopRun ? " Stop retrying this action; tell the owner what happened." : "";
      return { block: true, blockReason: `[Guard] ${reason}${stop}` };
    }
    const params = outcome.params ?? prepared.call.params;
    if (prepared.blockOnly && outcome.params) {
      return { block: true, blockReason: "[Guard] This action needs a change the host can't apply to this tool, so it was blocked." };
    }
    const finalParams = prepared.finalize(params);
    if (outcome.action === "allow") return { params: finalParams };

    // Host exec approvals run after this hook and would prompt a second time (§5.9). When the host
    // asks on every exec, the Guard defers to that prompt instead of asking too.
    if (this.registry.canonical(prepared.call.tool) === "exec" && !decision.hardSink && this.hostExecAlwaysAsks()) {
      this.log({ ts: this.now(), kind: "deferred-to-host-exec-approval", tool: prepared.call.tool, callId: prepared.call.id, sessionKey: s.sessionKey });
      return { params: finalParams };
    }
    const text = approvalText(prepared.call, decision, s, this.now());
    if (this.confirmVia === "command") {
      const p = this.pendingFor(s.sessionKey, prepared.call, decision, text.action);
      return {
        block: true,
        blockReason:
          `[Guard] This needs the owner's OK: ${text.why} Ask the owner to reply "/guard allow ${p.code}" ` +
          `(or "/guard allow ${p.code} always"), then try the same action again. Don't retry before the owner confirms.`,
      };
    }
    return {
      params: finalParams,
      requireApproval: {
        title: text.title.slice(0, 80),
        description: `${text.action}\n${text.why}`.slice(0, 512),
        severity: decision.trifecta ? "critical" : "warning",
        timeoutMs: this.config.approvalTimeoutSec * 1000,
        timeoutReason: "[Guard] No answer in time, so this action was blocked.",
        allowedDecisions: ["allow-once", "allow-always", "deny"],
        onResolution: (d) => this.onResolution(d, prepared.call, decision),
      },
    };
  }

  private failResult(event: BeforeToolCallEvent, canAsk: boolean): BeforeToolCallResult {
    if (this.mode !== "enforce") return { params: event.params };
    const other = this.config.failMode.other;
    if (other === "allow") return { params: event.params };
    if (other === "ask" && canAsk && this.confirmVia === "approval") {
      return {
        params: event.params,
        requireApproval: {
          title: "[Guard] Approval needed",
          description: `${event.toolName}: the guard couldn't check this action in time, so it's asking instead.`,
          severity: "warning",
          timeoutMs: this.config.approvalTimeoutSec * 1000,
          allowedDecisions: ["allow-once", "deny"],
        },
      };
    }
    return { block: true, blockReason: "[Guard] The guard couldn't check this action, so it was blocked." };
  }

  /** `allow-always` creates a narrow rule: this value, this kind of action (§4.5). */
  onResolution(d: ApprovalDecision, call: ToolCall, decision: Decision): void {
    try {
      this.audit.append({ ts: this.now(), kind: "approval", decision: d, tool: call.tool, callId: call.id });
      if (d !== "allow-always") return;
      const rules = this.store.rules();
      const add = (kind: GuardRule["kind"], value: string) => {
        if (rules.some((r) => r.kind === kind && r.value === value)) return;
        rules.push({ id: `r${randomBytes(3).toString("hex")}`, kind, value, tool: call.tool, createdAt: this.now() });
      };
      for (const f of decision.findings) {
        if (f.role === "destination" && f.status === "unattested") {
          const form = destinationForms(f.value, this.env)[0];
          if (form) add(form[0] as GuardRule["kind"], form[1]);
        } else if (f.role === "egress_url" && f.status === "constructed") {
          const u = normalizeUrl(f.value);
          if (u) add("url", u);
        } else if (f.role === "code" && f.status === "unattested") {
          add("command", f.value.trim());
        }
      }
      this.store.setRules(rules);
      this.rebuildRules();
    } catch {
      // Fire-and-forget by host contract; never throw back.
    }
  }

  // ---- owner confirmation by command (confirm: command) --------------------------------------

  private log(rec: Record<string, unknown>): void {
    try {
      this.audit.append(rec);
    } catch {
      // The audit log must never break a decision.
    }
  }

  private digest(call: ToolCall): string {
    return hmac(this.env.hmacKey, `${call.tool}\u0000${JSON.stringify(call.params)}`);
  }

  private pruneConfirmations(): void {
    const now = this.now();
    for (const [code, p] of this.confirms) if (p.expiresAt <= now) this.confirms.delete(code);
    bounded(this.confirms, MAX_CONFIRMATIONS);
  }

  /** The pending confirmation for this exact call, reusing its code on retries. */
  private pendingFor(sessionKey: string, call: ToolCall, decision: Decision, summary: string): PendingConfirmation {
    this.pruneConfirmations();
    const digest = this.digest(call);
    for (const p of this.confirms.values()) if (p.sessionKey === sessionKey && p.digest === digest && !p.granted) return p;
    let code = randomBytes(3).toString("hex");
    while (this.confirms.has(code)) code = randomBytes(3).toString("hex");
    const now = this.now();
    const p: PendingConfirmation = {
      code, sessionKey, tool: call.tool, digest, summary: summary.slice(0, 160), createdAt: now,
      expiresAt: now + this.config.approvalTimeoutSec * 1000, call, decision,
    };
    this.confirms.set(code, p);
    this.log({ ts: now, kind: "confirm-pending", code, tool: call.tool, callId: call.id, sessionKey });
    return p;
  }

  /** A granted confirmation for this exact call in this session, consumed on use. */
  private takeGrant(sessionKey: string, call: ToolCall): PendingConfirmation | undefined {
    if (this.confirms.size === 0) return undefined;
    this.pruneConfirmations();
    const digest = this.digest(call);
    for (const [code, p] of this.confirms) {
      if (p.granted && p.sessionKey === sessionKey && p.digest === digest) {
        this.confirms.delete(code);
        return p;
      }
    }
    return undefined;
  }

  pendingConfirmations(): PendingConfirmation[] {
    this.pruneConfirmations();
    return [...this.confirms.values()];
  }

  /** `/guard allow <code> [always]`. The command itself is owner-only. */
  grantConfirmation(code: string, always: boolean): PendingConfirmation | undefined {
    this.pruneConfirmations();
    const p = this.confirms.get(code.toLowerCase());
    if (!p) return undefined;
    p.granted = always ? "always" : "once";
    this.log({ ts: this.now(), kind: "confirm-granted", code: p.code, always, tool: p.tool, sessionKey: p.sessionKey });
    return p;
  }

  denyConfirmation(code: string): boolean {
    const p = this.confirms.get(code.toLowerCase());
    if (!p) return false;
    this.confirms.delete(p.code);
    this.log({ ts: this.now(), kind: "confirm-denied", code: p.code, tool: p.tool, sessionKey: p.sessionKey });
    return true;
  }

  forgetRule(id: string): boolean {
    const rules = this.store.rules();
    const next = rules.filter((r) => r.id !== id);
    if (next.length === rules.length) return false;
    this.store.setRules(next);
    this.rebuildRules();
    return true;
  }

  // ---- tool_result_persist (synchronous) ----------------------------------------------------

  toolResultPersist(event: ToolResultPersistEvent, ctx: ToolResultPersistContext): undefined {
    try {
      const s = this.session(ctx.sessionKey);
      const id = event.toolCallId ?? ctx.toolCallId;
      if (!id) return undefined;
      // Wrapper results carry their inner calls' output (runtime results, compact surface).
      const ids = [id, ...innerCallIdsFor(id, s.pendingIds())];
      const content = textOf(event.message?.content);
      for (const cid of ids) {
        const call = this.calls.get(cid);
        if (call) {
          labelContent(call, content, s, this.env);
          this.recordCronJob(call, content, s);
        } else s.takePending(cid);
      }
      this.persist(s);
    } catch {
      this.counts.errors++;
      this.session(ctx.sessionKey).markDegraded();
    }
    return undefined;
  }

  /**
   * Cron labels (§5.11): a job created or changed in a labeled session keeps that session's labels,
   * stored as the virtual artifact `cron:<jobId>`. Runs of the job inherit them (beforeAgentRun,
   * and session() for isolated `:cron:<jobId>:` sessions). The id comes from the tool result; the
   * compact surface nests that result as escaped JSON after its own tool "id", so match a UUID.
   */
  private recordCronJob(call: ToolCall, content: string, s: SessionState): void {
    if (this.registry.canonical(call.tool) !== "automations") return;
    const action = call.params.action;
    if (action !== "add" && action !== "update") return;
    const labels = s.labels();
    if (labelsEmpty(labels)) return;
    const ids = new Set<string>();
    const fromResult = /\\?"id\\?"\s*:\s*\\?"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(content)?.[1];
    if (fromResult) ids.add(fromResult);
    for (const k of ["id", "jobId"]) {
      const v = call.params[k];
      if (typeof v === "string" && v !== "") ids.add(v);
    }
    for (const id of ids) {
      const key = `cron:${id}`;
      const prev = this.store.getArtifact(key);
      this.store.putArtifact({ path: key, labels: prev ? mergeLabels(prev.labels, labels) : labels, sessionKey: s.sessionKey, updatedAt: this.now() });
    }
  }

  /** Labels a cron job carries, if it was created or changed in a labeled session. */
  private cronJobLabels(jobId: string | undefined) {
    return jobId ? this.store.getArtifact(`cron:${jobId}`)?.labels : undefined;
  }

  // ---- after_tool_call (audit only) ---------------------------------------------------------

  afterToolCall(event: AfterToolCallEvent, ctx: ToolCallContext): void {
    const id = event.toolCallId ?? ctx.toolCallId;
    if (!id) return;
    const expected = this.returned.get(id);
    if (expected === undefined || event.params === undefined) return;
    if (JSON.stringify(event.params) !== expected) {
      this.counts.mismatches++;
      try {
        this.audit.append({ ts: this.now(), kind: "param-mismatch", tool: event.toolName, callId: id, sessionKey: ctx.sessionKey });
      } catch {
        // ignore
      }
    }
  }

  // ---- inbound and run context --------------------------------------------------------------

  isOwnerSender(channel: string | undefined, senderId: string | undefined): boolean {
    if (!senderId) return false;
    const s = senderId.toLowerCase();
    return this.ownerSenders.has(`${(channel ?? "").toLowerCase()}:${s}`) || this.ownerSenders.has(s);
  }

  messageReceived(event: MessageReceivedEvent, ctx: MessageContext): void {
    try {
      const key = event.sessionKey ?? ctx.sessionKey;
      if (!key) return;
      const s = this.session(key);
      const sender = event.senderId ?? ctx.senderId;
      const text = event.content ?? "";
      const messageId = event.messageId ?? ctx.messageId;
      if (messageId) {
        this.inboundIds.set(String(messageId), true);
        bounded(this.inboundIds, MAX_INBOUND_IDS);
      }
      if (this.isOwnerSender(ctx.channelId, sender)) {
        // Quotes and attachments are owner_forwarded: no channel exposes a forward flag (§5.4).
        const forwarded = [
          ...(event.replyToBody ? [event.replyToBody] : []),
          ...(event.media ?? []).map((m) => m.transcribed ?? `[${m.kind ?? "attachment"}]`),
        ];
        ingestOwnerMessage(s, { id: event.messageId ?? `msg-${this.now()}`, text, forwarded }, this.env);
      } else {
        labelInbound(s, text, { kind: "external_sender", id: `${ctx.channelId ?? "?"}:${sender ?? "?"}`, at: this.now() }, this.env);
      }
      this.persist(s);
    } catch {
      this.counts.errors++;
    }
  }

  /**
   * Whether a model runs on the Codex runtime, from config: agentRuntime.id "codex" on the model entry
   * (agents.defaults.models["provider/model"]), the provider, or the agent defaults.
   */
  isCodexModel(provider: string | undefined, model: string | undefined): boolean {
    const cfg = this.api.config;
    const ids = [
      provider && model ? get(cfg, "agents", "defaults", "models", `${provider}/${model}`, "agentRuntime", "id") : undefined,
      provider ? get(cfg, "models", "providers", provider, "agentRuntime", "id") : undefined,
      get(cfg, "agents", "defaults", "agentRuntime", "id"),
    ];
    return ids.find((v) => typeof v === "string") === "codex";
  }

  /**
   * before_model_resolve and llm_input: on the Codex runtime, hosted web_search results reach the
   * model without passing any OpenClaw hook, so the session is labeled untrusted up front.
   */
  modelResolved(ctx: ModelContext): void {
    try {
      if (this.config.codexWebSearch === "off" || !this.isCodexModel(ctx.modelProviderId, ctx.modelId)) return;
      const s = this.session(ctx.sessionKey);
      if (s.tainted && s.labels().untrusted.some((r) => r.id === "codex-hosted-web-search")) return;
      s.addUntrusted({ kind: "web", id: "codex-hosted-web-search", at: this.now() });
      this.persist(s);
    } catch {
      this.counts.errors++;
    }
  }

  beforeAgentRun(event: BeforeAgentRunEvent, ctx: AgentContext): void {
    if (!ctx.runId) return;
    const info: RunInfo = {};
    if (ctx.trigger !== undefined) info.trigger = ctx.trigger;
    if (event.senderIsOwner !== undefined) info.senderIsOwner = event.senderIsOwner;
    if (ctx.inputProvenance?.kind !== undefined) info.provenanceKind = ctx.inputProvenance.kind;
    if (ctx.sessionKey !== undefined) info.sessionKey = ctx.sessionKey;
    this.runs.set(ctx.runId, info);
    bounded(this.runs, MAX_TRACKED_RUNS);
    // sessions_send targets and sub-agent announces (channel results ch-base4, ch-base7): the
    // receiving session inherits the sending session's labels before its first tool call (§5.11).
    const source = ctx.inputProvenance?.kind === "inter_session" ? ctx.inputProvenance.sourceSessionKey : undefined;
    if (source && ctx.sessionKey && source !== ctx.sessionKey) {
      const s = this.session(ctx.sessionKey);
      s.addLabels(this.session(source).labels());
      this.persist(s);
    }
    // A job can also fire into an existing session (sessionTarget "main"): label that session too.
    const job = ctx.trigger === "cron" ? this.cronJobLabels(ctx.jobId) : undefined;
    if (job && ctx.sessionKey) {
      const s = this.session(ctx.sessionKey);
      s.addLabels(job);
      this.persist(s);
    }
  }

  /**
   * reply_payload_sending: the agent's normal replies, which no tool call carries (benchmark a11,
   * a12). In a tainted session, images that point at URLs the agent built are removed and such
   * links defanged (§5.10). A reply to anyone but the owner also has the session's private tokens
   * redacted. Removed images and redactions are exfiltration paths, so they apply in shadow mode too;
   * defanging only when enforcing. Fails open, like the host hook: errors leave the reply as is.
   */
  replyPayloadSending(event: ReplyPayloadEvent, ctx: MessageContext): { payload: NonNullable<ReplyPayloadEvent["payload"]> } | undefined {
    try {
      if (this.mode === "off") return undefined;
      const key = event.sessionKey ?? ctx.sessionKey;
      const text = event.payload?.text;
      if (!key || typeof text !== "string" || text === "") return undefined;
      if (!this.sessions.has(key) && !this.store.getSession(key)) return undefined;
      const s = this.session(key);
      let out = text;
      let defanged = 0;
      let images = 0;
      if (s.tainted) {
        const r = rewriteOutbound(out, (url) => classifyEgressUrl(url, s, this.env).cls === "constructed", { defang: this.enforcing() });
        defanged = r.defanged.length;
        images = r.strippedImages;
        out = r.text;
      }
      let redacted = false;
      if (!this.isOwnerSender(ctx.channelId, ctx.senderId) && s.holdsPrivate) {
        const r = redactSecrets(out, s, this.env.hmacKey);
        redacted = r !== out;
        out = r;
      }
      if (out === text) return undefined;
      this.log({ ts: this.now(), kind: "reply-rewrite", sessionKey: key, defanged, images, redacted, enforcing: this.enforcing() });
      return { payload: { ...event.payload, text: out } };
    } catch {
      this.counts.errors++;
      return undefined;
    }
  }

  /** Sub-agents inherit their parent's labels (§5.11). */
  subagentSpawned(event: { childSessionKey?: string }, ctx: { requesterSessionKey?: string; sessionKey?: string }): void {
    const child = event.childSessionKey;
    const parent = ctx.requesterSessionKey ?? ctx.sessionKey;
    if (!child || !parent || child === parent) return;
    this.parents.set(child, parent);
    const existing = this.sessions.get(child);
    if (existing) existing.addLabels(this.session(parent).labels());
  }

  /**
   * session_end. After a reset (`/new`, `/reset`, idle or daily) the key's next transcript starts
   * empty, so the untrusted and private content behind its labels is out of the model's context:
   * start that key fresh. Its next session still picks up labeled memory lines, a parent, or a cron
   * job. Compaction keeps the history (summarized), and shutdown, restart, and unknown endings may,
   * so labels stay. A context engine can also hand compaction a successor session id, which is
   * why a sessionId change alone never resets labels.
   */
  sessionEnd(event: SessionEvent, ctx: SessionEvent): void {
    const key = event.sessionKey ?? ctx.sessionKey;
    const s = key ? this.sessions.get(key) : undefined;
    const reason = event.reason ?? ctx.reason;
    if (key && reason !== undefined && FRESH_AFTER.has(reason)) {
      const was = s ?? (this.store.getSession(key) ? this.session(key) : undefined);
      this.sessions.delete(key);
      this.store.putSession(new SessionState({ sessionKey: key, trigger: "unknown" }).toJSON());
      if (was?.tainted || was?.holdsPrivate) this.log({ ts: this.now(), kind: "session-reset", sessionKey: key, reason });
    } else if (s) {
      this.persist(s);
    }
    this.store.flush();
  }
}

/** session_end reasons after which the session key starts with an empty transcript. */
const FRESH_AFTER: ReadonlySet<string> = new Set(["new", "reset", "idle", "daily", "deleted"]);

const MAX_READ = 1 << 20;

/** A local file's text for memory diffing and bootstrap checks; undefined if missing or over 1 MiB. */
function readSmallText(abs: string): string | undefined {
  try {
    return statSync(abs).size <= MAX_READ ? readFileSync(abs, "utf8") : undefined;
  } catch {
    return undefined;
  }
}

function loadOrCreateKey(file: string): string {
  try {
    const k = readFileSync(file, "utf8").trim();
    if (k.length >= 32) return k;
  } catch {
    // create below
  }
  const k = randomBytes(32).toString("hex");
  try {
    mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    writeFileSync(file, k, { mode: 0o600 });
  } catch {
    // Unwritable state dir: keep the key in memory for this process.
  }
  return k;
}
