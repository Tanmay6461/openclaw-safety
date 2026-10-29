// Structural types for the parts of the OpenClaw plugin API the Guard uses. Shapes come from
// phase0/runtime-harness-notes.md §1 and the payloads recorded at runtime (phase0/results/). The
// adapter never imports OpenClaw, so these are deliberately loose: every field is optional unless
// the runtime always sent it.

import type { OpenKeyedStore } from "./host-store.js";

export interface HostRequester {
  channel?: string;
  accountId?: string;
  senderId?: string;
  senderIsOwner?: boolean;
  roleIds?: string[];
}

export interface ToolCallContext {
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  runId?: string;
  toolName?: string;
  toolCallId?: string;
  requester?: HostRequester;
}

export interface BeforeToolCallEvent {
  toolName: string;
  params: Record<string, unknown>;
  toolCallId?: string;
  runId?: string;
  derivedPaths?: string[];
}

export type ApprovalDecision = "allow-once" | "allow-always" | "deny" | "timeout" | "cancelled";

export interface RequireApproval {
  title: string;
  description: string;
  severity?: "info" | "warning" | "critical";
  timeoutMs?: number;
  timeoutReason?: string;
  allowedDecisions?: ("allow-once" | "allow-always" | "deny")[];
  onResolution?: (decision: ApprovalDecision) => void | Promise<void>;
}

export interface BeforeToolCallResult {
  params?: Record<string, unknown>;
  block?: boolean;
  blockReason?: string;
  requireApproval?: RequireApproval;
}

export interface AfterToolCallEvent {
  toolName: string;
  toolCallId?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: unknown;
}

export interface ToolResultMessage {
  role?: string;
  toolCallId?: string;
  toolName?: string;
  content?: unknown;
}

export interface ToolResultPersistEvent {
  toolName?: string;
  toolCallId?: string;
  message: ToolResultMessage;
  isSynthetic?: boolean;
}

export interface ToolResultPersistContext {
  agentId?: string;
  sessionKey?: string;
  toolName?: string;
  toolCallId?: string;
}

export interface MessageReceivedEvent {
  from?: string;
  content?: string;
  senderId?: string;
  messageId?: string;
  sessionKey?: string;
  runId?: string;
  replyToBody?: string;
  replyToIsQuote?: boolean;
  media?: { kind?: string; transcribed?: string; path?: string; url?: string }[];
}

export interface MessageContext {
  channelId?: string;
  accountId?: string;
  conversationId?: string;
  sessionKey?: string;
  runId?: string;
  senderId?: string;
  messageId?: string;
}

/** reply_payload_sending: a normal assistant reply, after normalization and before delivery. */
export interface ReplyPayloadEvent {
  payload?: { text?: string; [k: string]: unknown };
  kind?: string;
  channel?: string;
  sessionKey?: string;
  runId?: string;
}

export interface InputProvenance {
  kind?: string;
  sourceTool?: string;
  sourceSessionKey?: string;
}

export interface AgentContext {
  agentId?: string;
  sessionKey?: string;
  runId?: string;
  trigger?: string;
  jobId?: string;
  inputProvenance?: InputProvenance;
}

/** before_model_resolve / llm_input ctx: the run's resolved model (seen at runtime, phase0/results/codex-5). */
export interface ModelContext {
  runId?: string;
  agentId?: string;
  sessionKey?: string;
  modelProviderId?: string;
  modelId?: string;
}

export interface BeforeAgentRunEvent {
  senderIsOwner?: boolean;
  senderId?: string;
  channelId?: string;
}

export interface SessionEvent {
  sessionId?: string;
  sessionKey?: string;
  /** session_end: new, reset, idle, daily, compaction, deleted, shutdown, restart, or unknown. */
  reason?: string;
}

export interface CommandContext {
  args?: string;
  senderId?: string;
  channel?: string;
  sessionKey?: string;
  isAuthorizedSender?: boolean;
  /** Sent to commands with requiredScopes (channel results §b). */
  senderIsOwner?: boolean;
  /** Set (always an array) for Gateway clients such as the Control UI and TUI; absent for chat senders. */
  gatewayClientScopes?: string[];
  from?: string;
  to?: string;
  accountId?: string;
  channelId?: string;
}

export interface CommandDefinition {
  name: string;
  description: string;
  acceptsArgs?: boolean;
  requireAuth?: boolean;
  requiredScopes?: string[];
  handler: (ctx: CommandContext) => { text: string } | Promise<{ text: string }>;
}

export interface HookOptions {
  priority?: number;
  timeoutMs?: number;
}

// The handler map is intentionally loose: the host calls handlers with (event, ctx).
export type HookHandler = (event: never, ctx: never) => unknown;

export interface PluginApi {
  id: string;
  pluginConfig?: Record<string, unknown>;
  config?: Record<string, unknown>;
  on(hook: string, handler: HookHandler, opts?: HookOptions): void;
  registerCommand(def: CommandDefinition): void;
  runtime?: {
    state?: {
      resolveStateDir?: (env?: NodeJS.ProcessEnv) => string;
      openKeyedStore?: OpenKeyedStore;
    };
  };
  logger?: { info?: (msg: string) => void; warn?: (msg: string) => void; error?: (msg: string) => void };
}
