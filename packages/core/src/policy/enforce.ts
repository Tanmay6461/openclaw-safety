import type { SessionState } from "../session.js";
import type { ToolCall } from "../types.js";
import { hmac } from "../util.js";
import type { Decision, Verdict } from "./decide.js";

export type Mode = "shadow" | "enforce";

export interface EnforceOptions {
  mode: Mode;
  /** `/guard pause`: log-only until this time; hard sinks are still enforced. */
  pausedUntil?: number;
  /** More asks than this in the window escalate to block (§5.9). */
  promptLimit?: { max: number; windowMs: number };
  /** Identical blocked calls before the run is stopped (§5.8). */
  maxIdenticalBlocks?: number;
  /**
   * Whether anyone can answer an approval for this run. OpenClaw rejects plugin approvals for
   * runs whose trigger isn't "user" (cron, heartbeat), so the adapter passes false for runs
   * without a host-confirmed requester, and asks become explicit blocks.
   */
  canAsk?: boolean;
}

export interface Outcome {
  action: Verdict;
  decision: Decision;
  /** Shadow mode let through something enforce mode would have changed. */
  shadowed: boolean;
  /** Params to run with, when they differ from the call's. */
  params?: Record<string, unknown>;
  /** Overrides the decision's first reason. */
  reason?: string;
  /** Repeated identical blocks: the adapter should end the run with an explanation. */
  stopRun?: boolean;
  /** An ask was turned into a block because no one could answer; tell the owner later. */
  notifyOwner?: boolean;
}

/** Applies mode, prompt-rate, and retry-loop rules to a decision. Mutates rate-limit state only. */
export function enforce(
  decision: Decision,
  call: ToolCall,
  session: SessionState,
  opts: EnforceOptions,
  now: number,
  hmacKey: string,
): Outcome {
  const logOnly = opts.mode === "shadow" || (opts.pausedUntil ?? 0) > now;
  if (logOnly && !decision.hardSink && !decision.trifecta) {
    return { action: "allow", decision, shadowed: decision.verdict !== "allow" || decision.rewrite !== undefined };
  }

  let action = decision.verdict;
  let reason: string | undefined;
  let notifyOwner = false;
  if (action === "ask" && opts.canAsk === false) {
    action = "block";
    notifyOwner = true;
    reason = "This needs your approval, but the run wasn't started from a chat that can show approvals (for example a scheduled run), so the guard blocked it.";
  } else if (action === "ask") {
    const limit = opts.promptLimit ?? { max: 5, windowMs: 60 * 60 * 1000 };
    if (session.promptCount(now - limit.windowMs) >= limit.max) {
      action = "block";
      reason = "Too many approval requests in this session in the last hour, so the guard is blocking instead of asking again.";
    } else {
      session.recordPrompt(now);
    }
  }

  const out: Outcome = { action, decision, shadowed: false };
  if (reason) out.reason = reason;
  if (notifyOwner) out.notifyOwner = true;
  if (decision.rewrite && action !== "block") out.params = decision.rewrite;
  if (action === "block") {
    const n = session.recordBlock(hmac(hmacKey, `${call.tool}\u0000${JSON.stringify(call.params)}`));
    if (n >= (opts.maxIdenticalBlocks ?? 3)) out.stopRun = true;
  }
  return out;
}
