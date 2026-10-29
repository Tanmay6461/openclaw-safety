import { memoryLabelsIn, normalizePath } from "@provenance-guard/core";
import type { Guard } from "./guard.js";
import { KeyedGuardStore } from "./host-store.js";
import type { CommandContext, CommandDefinition, PluginApi } from "./host.js";

/**
 * Where a /guard command came from (phase0/source-notes-v2.md Q3). OpenClaw has no CLI path for
 * plugin commands; the Control UI and TUI arrive as Gateway clients with `gatewayClientScopes` set.
 * A self-chat is a chat with yourself (WhatsApp self-chat), where the agent's own sends can come
 * back as owner input.
 */
export type CommandSurface = "operator" | "chat" | "self_chat";

function get(obj: unknown, ...keys: string[]): unknown {
  let cur = obj;
  for (const k of keys) cur = cur && typeof cur === "object" ? (cur as Record<string, unknown>)[k] : undefined;
  return cur;
}

const peer = (v: string) => v.trim().toLowerCase().replace(/^[a-z-]+:/, "").replace(/@.*$/, "").replace(/^\+/, "");

export function commandSurface(ctx: CommandContext, hostConfig?: unknown): CommandSurface {
  if (Array.isArray(ctx.gatewayClientScopes)) return "operator";
  if (ctx.from && ctx.to && peer(ctx.from) !== "" && peer(ctx.from) === peer(ctx.to)) return "self_chat";
  if (ctx.channel === "whatsapp") {
    const mode = (ctx.accountId && get(hostConfig, "channels", "whatsapp", "accounts", ctx.accountId, "selfChatMode")) ?? get(hostConfig, "channels", "whatsapp", "selfChatMode");
    if (mode === true) return "self_chat";
  }
  return "chat";
}

const PRESET_STRENGTH: Record<string, number> = { balanced: 1, strict: 2 };

/** Subcommands that weaken protection. */
export function isLoosening(guard: Guard, sub: string, rest: string[]): boolean {
  switch (sub) {
    case "shadow":
    case "pause":
    case "off":
    case "forget":
    case "trust":
    case "allow":
      return true;
    case "preset":
      return (PRESET_STRENGTH[rest[0]?.toLowerCase() ?? ""] ?? 0) < (PRESET_STRENGTH[guard.preset] ?? 0);
    default:
      return false;
  }
}

function refusal(guard: Guard, sub: string, rest: string[], surface: CommandSurface): string | null {
  if (sub === "off" && surface !== "operator") {
    return "/guard off turns off every protection, so it only works from the Control UI or TUI, not from a chat. To log only, use /guard shadow.";
  }
  if (surface === "self_chat" && isLoosening(guard, sub, rest)) {
    return "This loosens the guard. In a chat with yourself the agent's own messages can come back as yours, so loosening /guard commands only work from the Control UI or TUI.";
  }
  return null;
}

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

export function runGuardCommand(guard: Guard, args: string, surface: CommandSurface = "operator"): string {
  const [rawSub = "status", ...rest] = args.trim().split(/\s+/).filter(Boolean);
  const sub = rawSub.toLowerCase();
  const now = Date.now();
  const refused = refusal(guard, sub, rest, surface);
  if (refused) return refused;
  switch (sub) {
    case "status": {
      const sessions = guard.sessionsList();
      const tainted = sessions.filter((s) => s.tainted).length;
      const started = sessions.filter((s) => s.startedTainted !== undefined);
      const lines = [
        `Mode: ${guard.mode}${guard.pausedUntil > now ? ` (paused until ${new Date(guard.pausedUntil).toISOString()})` : ""} · preset: ${guard.preset}`,
        `Sessions: ${sessions.length} (${tainted} tainted; ${started.filter((s) => s.startedTainted).length} of ${started.length} were tainted at their first tool call) · rules: ${guard.store.rules().length}`,
        `Decisions: ${guard.counts.allow} allow, ${guard.counts.ask} ask, ${guard.counts.block} block, ${guard.counts.shadowed} shadowed · errors: ${guard.counts.errors}`,
        `Storage: ${guard.storageBackend}${guard.isReady ? "" : " (loading)"}${guard.store instanceof KeyedGuardStore && guard.store.lastError ? ` · last error: ${guard.store.lastError}` : ""}`,
        `Confirmations: ${guard.confirmVia === "command" ? `/guard allow <code> (${guard.pendingConfirmations().length} pending)` : "OpenClaw approval prompts"}`,
      ];
      const stale = [...guard.store.artifacts()].filter((a) => a.stale && (a.labels.untrusted.length > 0 || a.labels.privateData.length > 0));
      if (stale.length > 0) lines.push(`${stale.length} labeled file(s) changed outside the agent; review, then /guard trust <path>: ${stale.slice(0, 3).map((a) => a.path).join(", ")}${stale.length > 3 ? ", …" : ""}`);
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
      const empty = { untrusted: [], privateData: [] };
      guard.store.putArtifact({ path: p, labels: empty, sessionKey: "/guard trust", updatedAt: now, stale: false });
      // A memory file's labels live on its lines (§5.11): clear the lines written to it, and any
      // labeled line it holds now (copied from elsewhere).
      const inFile = new Set(memoryLabelsIn(guard.env.readText?.(p) ?? "", guard.env).map((e) => e.hash));
      let lines = 0;
      for (const e of [...guard.store.memoryEntries()]) {
        if ((e.file !== p && !inFile.has(e.hash)) || (e.labels.untrusted.length === 0 && e.labels.privateData.length === 0)) continue;
        guard.store.putMemoryEntry({ ...e, labels: empty, updatedAt: now });
        lines++;
      }
      return `Cleared labels on ${p}${lines > 0 ? ` and ${lines} memory line(s)` : ""}.`;
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
    // requiredScopes already limits channel senders to the owner; refuse if the host says otherwise.
    handler: (ctx) => ({
      text: ctx.senderIsOwner === false ? "Only the owner can use /guard." : runGuardCommand(guard, ctx.args ?? "", commandSurface(ctx, api.config)),
    }),
  };
}
