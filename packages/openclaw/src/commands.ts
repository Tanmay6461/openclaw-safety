import { normalizePath } from "@provenance-guard/core";
import type { Guard } from "./guard.js";
import type { CommandDefinition } from "./host.js";

const HELP = [
  "/guard status · enforce · shadow · pause <30m|2h> · preset <balanced|strict>",
  "/guard rules · forget <id> · trust <path> · report · off",
  "/guard doctor · pending · allow <code> [always] · deny <code>",
].join("\n");

function duration(raw: string | undefined): number | null {
  const m = /^(\d+)\s*(m|min|h)?$/i.exec(raw ?? "1h");
  if (!m) return null;
  const n = Number(m[1]);
  return (m[2]?.toLowerCase().startsWith("m") ? n * 60 : n * 3600) * 1000;
}

export function runGuardCommand(guard: Guard, args: string): string {
  const [sub = "status", ...rest] = args.trim().split(/\s+/).filter(Boolean);
  const now = Date.now();
  switch (sub.toLowerCase()) {
    case "status": {
      const sessions = guard.sessionsList();
      const tainted = sessions.filter((s) => s.tainted).length;
      const lines = [
        `Mode: ${guard.mode}${guard.pausedUntil > now ? ` (paused until ${new Date(guard.pausedUntil).toISOString()})` : ""} · preset: ${guard.preset}`,
        `Sessions: ${sessions.length} (${tainted} started tainted or became tainted) · rules: ${guard.store.rules().length}`,
        `Decisions: ${guard.counts.allow} allow, ${guard.counts.ask} ask, ${guard.counts.block} block, ${guard.counts.shadowed} shadowed · errors: ${guard.counts.errors}`,
        `Confirmations: ${guard.confirmVia === "command" ? `/guard allow <code> (${guard.pendingConfirmations().length} pending)` : "OpenClaw approval prompts"}`,
      ];
      const failing = guard.doctor().filter((c) => !c.ok).length;
      if (failing > 0) lines.push(`${failing} config check(s) need attention: /guard doctor`);
      return lines.join("\n");
    }
    case "doctor": {
      const lines = guard.doctor().map((c) => `${c.ok ? "ok" : "fix"}: ${c.text}`);
      lines.push(
        guard.confirmVia === "approval"
          ? "Asks use OpenClaw approval prompts."
          : "Asks are blocked with a code; confirm with /guard allow <code>, which only you can run.",
      );
      return lines.join("\n");
    }
    case "pending": {
      const list = guard.pendingConfirmations().filter((p) => !p.granted);
      if (list.length === 0) return "Nothing waiting for confirmation.";
      return list.map((p) => `${p.code}: ${p.summary} (expires ${new Date(p.expiresAt).toISOString()})`).join("\n");
    }
    case "allow": {
      if (!rest[0]) return "Usage: /guard allow <code> [always] (see /guard pending)";
      const always = rest[1]?.toLowerCase() === "always";
      const p = guard.grantConfirmation(rest[0], always);
      if (!p) return `No pending confirmation ${rest[0]}. It may have expired; see /guard pending.`;
      return `Allowed ${always ? "this and future matching actions" : "once"}: ${p.summary}. Ask the agent to try again.`;
    }
    case "deny":
      return rest[0] && guard.denyConfirmation(rest[0]) ? `Denied ${rest[0]}.` : "Usage: /guard deny <code> (see /guard pending)";
    case "enforce":
      guard.setMode("enforce");
      return "Guard is now enforcing.";
    case "shadow":
      guard.setMode("shadow");
      return "Guard is in shadow mode: decisions are logged, and only hard sinks and lethal-trifecta egress are enforced.";
    case "pause": {
      const ms = duration(rest[0]);
      if (ms === null) return "Usage: /guard pause 30m | 2h";
      guard.setMode(guard.mode === "off" ? "shadow" : guard.mode, now + ms);
      return `Paused for ${rest[0] ?? "1h"}. Hard sinks are still enforced.`;
    }
    case "preset": {
      const p = rest[0]?.toLowerCase();
      if (p !== "balanced" && p !== "strict") return "Usage: /guard preset balanced | strict";
      guard.setPreset(p);
      return `Preset is now ${p}.`;
    }
    case "rules": {
      const rules = guard.store.rules();
      return rules.length === 0 ? "No learned rules." : rules.map((r) => `${r.id}: ${r.kind} ${r.value} (from ${r.tool})`).join("\n");
    }
    case "forget":
      return rest[0] && guard.forgetRule(rest[0]) ? `Forgot rule ${rest[0]}.` : "Usage: /guard forget <rule id> (see /guard rules)";
    case "trust": {
      if (rest.length === 0) return "Usage: /guard trust <path>";
      const p = normalizePath(rest.join(" "), { home: guard.env.home, cwd: guard.env.cwd });
      guard.store.putArtifact({ path: p, labels: { untrusted: [], privateData: [] }, sessionKey: "/guard trust", updatedAt: now });
      return `Cleared labels on ${p}.`;
    }
    case "report":
      return `Since start: ${JSON.stringify(guard.counts)}`;
    case "off":
      guard.setMode("off");
      return "Guard is off. Nothing is enforced, including hard sinks, until /guard enforce or /guard shadow.";
    default:
      return HELP;
  }
}

/** Owner-only on chat surfaces through `requiredScopes` (§4.6); `requireAuth` alone isn't enough. */
export function guardCommand(guard: Guard): CommandDefinition {
  return {
    name: "guard",
    description: "Provenance Guard status and controls",
    acceptsArgs: true,
    requireAuth: true,
    requiredScopes: ["operator.admin"],
    // requiredScopes already limits channel senders to the owner; refuse if the host says otherwise.
    handler: (ctx) => ({ text: ctx.senderIsOwner === false ? "Only the owner can use /guard." : runGuardCommand(guard, ctx.args ?? "") }),
  };
}
