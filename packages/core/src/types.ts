/** Where a piece of content came from (plan §5.3). */
export type SourceKind =
  | "owner" // text the owner typed
  | "owner_forwarded" // forwarded, quoted, pasted, or attached by the owner
  | "system"
  | "external_sender"
  | "web"
  | "email"
  | "hook"
  | "skill_output"
  | "exec_output"
  | "file"
  | "memory"
  | "inter_session"
  | "unknown";

export interface SourceRef {
  kind: SourceKind;
  /** Domain, sender id, file realpath, tool call id, ... */
  id: string;
  /** Epoch ms. */
  at: number;
}

export type PrivateCategory = "secret" | "email" | "memory" | "private_file" | "personal";

/** Who started the run. Anything other than a host-confirmed "owner" is treated as autonomous. */
export type Trigger = "owner" | "cron" | "heartbeat" | "hook" | "inter_session" | "unknown";

/** Labels carried by an artifact or inherited by a session. */
export interface Labels {
  untrusted: SourceRef[];
  privateData: PrivateCategory[];
}

export type Role =
  | "destination" // recipient, channel, target session
  | "content" // body text, attachments, search queries
  | "egress_url" // anything fetched or navigated to
  | "code" // shell commands, scripts
  | "path" // file paths
  | "deferred_instruction" // cron tasks, sub-agent tasks
  | "config" // gateway or config changes
  | "none";

export type ActionCategory =
  | "read_only"
  | "external_retrieval"
  | "outbound_communication"
  | "privileged_execution"
  | "persistence_write"
  | "autonomous_scheduling"
  | "inter_session"
  | "config"
  | "install"
  /** A tool missing from the registry; roles were inferred from value shapes. */
  | "unknown";

export interface ToolSpec {
  name: string;
  category: ActionCategory;
  /**
   * Parameter path → role. Paths use dots for nesting and `[]` to step into arrays:
   * `"message"`, `"request.url"`, `"edits[].newText"`, `"job.payload.message"`.
   */
  args: Record<string, Role>;
  /** Role for top-level params `args` doesn't mention, e.g. "content" so no outgoing text escapes the scan. */
  otherArgs?: Role;
  /** Label for the tool's result. */
  resultSource?: SourceKind;
  /** The result is private data of this category (config reads, location, photos). */
  resultPrivate?: PrivateCategory;
  /** For persistence writes: "replace" overwrites the target's labels, "merge" unions them. */
  writeMode?: "replace" | "merge";
  /** Parameter whose value picks an override from `actions`, e.g. `"action"` for `message`. */
  actionParam?: string;
  /** Per-action overrides. An action missing here keeps the base spec, so make the base conservative. */
  actions?: Record<string, ActionOverride>;
  inferred?: boolean;
}

export interface ActionOverride {
  category?: ActionCategory;
  /** Merged over the base args. */
  args?: Record<string, Role>;
  otherArgs?: Role;
  /** `null` removes the base result label (for example a `send` action has no result content). */
  resultSource?: SourceKind | null;
  resultPrivate?: PrivateCategory | null;
  writeMode?: "replace" | "merge";
}

export interface ToolCall {
  id: string;
  tool: string;
  params: Record<string, unknown>;
}
