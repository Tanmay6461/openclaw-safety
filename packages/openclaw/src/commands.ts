import { normalizePath } from "@provenance-guard/core";
import type { Guard } from "./guard.js";
import type { CommandDefinition, PluginApi } from "./host.js";

const HELP = [
  "/guard status · enforce · shadow · pause <30m|2h> · preset <balanced|strict>",
  "/guard rules · forget <id> · trust <path> · report · off",
].join("\n");

function duration(raw: string | undefined): number | null {
  const m = /^(\d+)\s*(m|min|h)?$/i.exec(raw ?? "1h");
  if (!m) return null;
  const n = Number(m[1]);
  return (m[2]?.toLowerCase().startsWith("m") ? n * 60 : n * 3600) * 1000;
}

function hostHooks(api: PluginApi | undefined): Record<string, unknown> {
  const h = (api?.config as { plugins?: { entries?: Record<string, { hooks?: Record<string, unknown> }> } } | undefined)?.plugins?.entries?.[api?.id ?? ""]?.hooks;
  return h ?? {};
}

export function runGuardCommand(guard: Guard, args: string, api?: PluginApi): string {
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
      ];
      if (hostHooks(api).allowConversationAccess !== true) {
        lines.push(
          "Missing: plugins.entries.provenance-guard.hooks.allowConversationAccess: true. Without it, heartbeat and sub-agent runs can't be told apart from other non-owner runs.",
        );
      }
      return lines.join("\n");
    }
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
export function guardCommand(guard: Guard, api: PluginApi): CommandDefinition {
  return {
    name: "guard",
    description: "Provenance Guard status and controls",
    acceptsArgs: true,
    requireAuth: true,
    requiredScopes: ["operator.admin"],
    handler: (ctx) => ({ text: runGuardCommand(guard, ctx.args ?? "", api) }),
  };
}
