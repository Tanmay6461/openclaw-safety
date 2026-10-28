import { appendFileSync } from "node:fs";
import type { Outcome } from "../policy/enforce.js";
import { redactSecrets } from "../secrets/scan.js";
import type { SessionState } from "../session.js";
import type { ToolCall } from "../types.js";
import { hmac, sanitizePreview } from "../util.js";

export interface AuditRecord {
  ts: number;
  sessionKey: string;
  callId: string;
  tool: string;
  action: Outcome["action"];
  verdict: Outcome["decision"]["verdict"];
  shadowed: boolean;
  hardSink: boolean;
  trifecta: boolean;
  reasons: string[];
  findings: { arg: string; role: string; status: string; via?: string; valueHmac: string; preview: string }[];
  tainted: boolean;
  private: boolean;
  trigger: string;
  rewritten: boolean;
  stopRun?: boolean;
}

/** One audit line per decision (§11): argument HMACs and short redacted previews, never full content. */
export function auditRecord(call: ToolCall, outcome: Outcome, session: SessionState, hmacKey: string, ts: number): AuditRecord {
  const d = outcome.decision;
  const rec: AuditRecord = {
    ts,
    sessionKey: session.sessionKey,
    callId: call.id,
    tool: call.tool,
    action: outcome.action,
    verdict: d.verdict,
    shadowed: outcome.shadowed,
    hardSink: d.hardSink,
    trifecta: d.trifecta,
    reasons: outcome.reason ? [outcome.reason, ...d.reasons] : d.reasons,
    findings: d.findings.map((f) => ({
      arg: f.arg,
      role: f.role,
      status: f.status,
      ...(f.via && { via: f.via }),
      valueHmac: hmac(hmacKey, f.value),
      preview: sanitizePreview(redactSecrets(f.value, session, hmacKey), 40),
    })),
    tainted: session.tainted,
    private: session.holdsPrivate,
    trigger: session.trigger,
    rewritten: outcome.params !== undefined,
  };
  if (outcome.stopRun) rec.stopRun = true;
  return rec;
}

export class JsonlAuditLog {
  constructor(private readonly path: string) {}

  append(rec: AuditRecord): void {
    appendFileSync(this.path, `${JSON.stringify(rec)}\n`, { mode: 0o600 });
  }
}
