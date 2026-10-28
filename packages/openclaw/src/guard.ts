import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  applyUpfrontLabels,
  approvalText,
  AttestedValues,
  auditRecord,
  createEnv,
  decide,
  destinationForms,
  enforce,
  ingestOwnerMessage,
  JsonlAuditLog,
  labelContent,
  labelInbound,
  normalizeUrl,
  parseSimpleCommand,
  PRESETS,
  realpathBestEffort,
  SessionState,
  type AuditRecord,
  type Decision,
  type GuardEnv,
  type Outcome,
  type ToolCall,
  type Trigger,
} from "@provenance-guard/core";
import type { GuardConfig, GuardMode } from "./config.js";
import type {
  AfterToolCallEvent,
  AgentContext,
  ApprovalDecision,
  BeforeAgentRunEvent,
  BeforeToolCallEvent,
  BeforeToolCallResult,
  MessageContext,
  MessageReceivedEvent,
  PluginApi,
  SessionEvent,
  ToolCallContext,
  ToolResultPersistContext,
  ToolResultPersistEvent,
} from "./host.js";
import { loadRegistry, type OpenClawRegistry } from "./registry/index.js";
import { innerCallIdsFor, prepareCall, unwrapMetaCall, type CallContext, type PreparedCall } from "./registry/prepare.js";
import { FileBackedStore, type GuardRule, type GuardStore } from "./store.js";

/** Auto-loaded workspace files (plan §5.11); a labeled one taints every session that loads it. */
const BOOTSTRAP_FILES = ["AGENTS.md", "SOUL.md", "IDENTITY.md", "USER.md", "BOOTSTRAP.md", "MEMORY.md"];
const MAX_TRACKED_CALLS = 2000;
const MAX_TRACKED_RUNS = 1000;

interface RunInfo {
  trigger?: string;
  senderIsOwner?: boolean;
  provenanceKind?: string;
  sessionKey?: string;
}

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
    this.store = deps.store ?? new FileBackedStore(path.join(stateDir, "store.json"));
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
    });
    this.loadIdentities();
    this.rebuildRules();
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
      for (const [, v] of destinationForms(o, this.env)) ids.add(v);
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
    for (const f of BOOTSTRAP_FILES) {
      const rec = this.store.getArtifact(path.join(this.workspace, f));
      if (rec) s.addLabels(rec.labels);
    }
    const parent = this.parents.get(k);
    if (parent && parent !== k) s.addLabels(this.session(parent).labels());
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
    const canAsk = s.trigger === "owner";
    const cctx = this.callContext(ctx);
    try {
      // Compact surface: the inner tool gets its own before_tool_call; the wrapper only blocks early.
      const inner = unwrapMetaCall(event, this.registry, cctx);
      if (inner) {
        const d = decide(inner.call, s, this.env);
        if (d.verdict === "block" && (this.enforcing() || d.hardSink || d.trifecta)) {
          return { block: true, blockReason: `[Guard] ${d.reasons[0] ?? "blocked"}` };
        }
        return { params: event.params };
      }

      const prepared = prepareCall(event, this.registry, cctx);
      const decision = decide(prepared.call, s, this.env);
      const outcome = enforce(
        decision,
        prepared.call,
        s,
        { mode: this.mode === "enforce" ? "enforce" : "shadow", pausedUntil: this.pausedUntil, canAsk },
        this.now(),
        this.env.hmacKey,
      );
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

    const text = approvalText(prepared.call, decision, s, this.now());
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
    if (other === "ask" && canAsk) {
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
        if (call) labelContent(call, content, s, this.env);
        else s.takePending(cid);
      }
      this.persist(s);
    } catch {
      this.counts.errors++;
      this.session(ctx.sessionKey).markDegraded();
    }
    return undefined;
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

  beforeAgentRun(event: BeforeAgentRunEvent, ctx: AgentContext): void {
    if (!ctx.runId) return;
    const info: RunInfo = {};
    if (ctx.trigger !== undefined) info.trigger = ctx.trigger;
    if (event.senderIsOwner !== undefined) info.senderIsOwner = event.senderIsOwner;
    if (ctx.inputProvenance?.kind !== undefined) info.provenanceKind = ctx.inputProvenance.kind;
    if (ctx.sessionKey !== undefined) info.sessionKey = ctx.sessionKey;
    this.runs.set(ctx.runId, info);
    bounded(this.runs, MAX_TRACKED_RUNS);
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

  sessionEnd(event: SessionEvent, ctx: SessionEvent): void {
    const key = event.sessionKey ?? ctx.sessionKey;
    const s = key ? this.sessions.get(key) : undefined;
    if (s) this.persist(s);
    this.store.flush();
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
