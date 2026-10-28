import type { SessionState } from "../session.js";
import type { SourceKind, ToolCall } from "../types.js";
import { sanitizePreview } from "../util.js";
import type { Decision } from "./decide.js";

const KIND_LABEL: Record<SourceKind, string> = {
  owner: "your message",
  owner_forwarded: "content you forwarded or pasted",
  system: "system content",
  external_sender: "a message from",
  web: "web page",
  email: "email",
  hook: "webhook",
  skill_output: "tool output from",
  exec_output: "command output",
  file: "file",
  memory: "memory",
  inter_session: "another session",
  unknown: "an unknown source",
};

export function ago(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  return h < 48 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
}

/** "web page recipes.example (2 min ago), email (1 h ago)" for the most recent sources. */
export function describeSources(session: SessionState, now: number, max = 2): string {
  const refs = session.untrusted.sort((a, b) => b.at - a.at).slice(0, max);
  const parts = refs.map((r) => {
    const label = KIND_LABEL[r.kind];
    const id = r.kind === "web" || r.kind === "external_sender" || r.kind === "skill_output" ? ` ${sanitizePreview(r.id, 40)}` : "";
    return `${label}${id} (${ago(now - r.at)})`;
  });
  const extra = session.untrusted.length - refs.length;
  return parts.join(", ") + (extra > 0 ? `, and ${extra} more` : "");
}

export interface ApprovalText {
  title: string;
  action: string;
  why: string;
}

/**
 * Text for a native approval (§4.4). Never includes raw untrusted text: only the tool, the
 * flagged argument values (sanitized, ≤ 120 chars), and where the session's taint came from.
 */
export function approvalText(call: ToolCall, decision: Decision, session: SessionState, now: number): ApprovalText {
  const flagged = decision.findings.filter((f) => f.status !== "owner" && f.status !== "attested" && f.status !== "link_following");
  const target = flagged[0] ?? decision.findings[0];
  const action = target ? `${call.tool}: ${sanitizePreview(target.value)}` : sanitizePreview(call.tool);
  let why = decision.reasons[0] ?? "This action needs your approval.";
  if (session.untrusted.length > 0) why += ` Untrusted content in this session: ${describeSources(session, now)}.`;
  return { title: "[Guard] Approval needed", action, why };
}
