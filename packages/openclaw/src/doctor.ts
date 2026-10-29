// Host config checks for `/guard doctor` (phase0/channel-results.md, "What this means for the
// Guard"). Plugin approvals carry no resolver identity, so whether they are an owner-only control
// depends entirely on the host's command settings.

export interface DoctorCheck {
  id: "owner" | "approvers" | "forwarding" | "conversationAccess" | "selfChat" | "codex" | "runTimeout";
  ok: boolean;
  text: string;
}

function get(obj: unknown, ...keys: string[]): unknown {
  let cur = obj;
  for (const k of keys) cur = cur && typeof cur === "object" ? (cur as Record<string, unknown>)[k] : undefined;
  return cur;
}

function nonEmpty(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === "object") return Object.values(v).some(nonEmpty);
  return typeof v === "string" && v.trim() !== "";
}

function usesCodex(cfg: unknown): boolean {
  const runtime = (v: unknown) => get(v, "agentRuntime", "id") === "codex";
  const values = (v: unknown) => (v && typeof v === "object" ? Object.values(v as Record<string, unknown>) : []);
  return runtime(get(cfg, "agents", "defaults")) || values(get(cfg, "agents", "defaults", "models")).some(runtime) || values(get(cfg, "models", "providers")).some(runtime);
}

export function doctorChecks(hostConfig: unknown, pluginId: string, codexWebSearch: "assume_on" | "off" = "assume_on", approvalTimeoutSec = 600): DoctorCheck[] {
  const owner = nonEmpty(get(hostConfig, "commands", "ownerAllowFrom"));
  const allowFrom = nonEmpty(get(hostConfig, "commands", "allowFrom"));
  const forwarding = get(hostConfig, "approvals", "plugin", "enabled") === true;
  const access = get(hostConfig, "plugins", "entries", pluginId, "hooks", "allowConversationAccess") === true;
  const whatsapp = get(hostConfig, "channels", "whatsapp");
  const selfChat = whatsapp !== undefined && get(whatsapp, "selfChatMode") !== false;
  // OpenClaw's default is 48 h and 0 means no limit (src/agents/timeout.ts). An approval only counts
  // while its run is alive: in tg-2 the owner approved at 119.7 s and the 120 s run timeout killed the run.
  const runTimeout = Number(get(hostConfig, "agents", "defaults", "timeoutSeconds"));
  const shortRun = Number.isFinite(runTimeout) && runTimeout > 0 && runTimeout < approvalTimeoutSec;
  return [
    {
      id: "owner",
      ok: owner,
      text: owner
        ? "commands.ownerAllowFrom is set, so the guard can tell your messages from other senders'."
        : "Set commands.ownerAllowFrom to your own sender id. Without it the guard can't recognize you on a channel, and every allowed sender can resolve approvals.",
    },
    {
      id: "approvers",
      ok: owner && !allowFrom,
      text: !allowFrom
        ? "commands.allowFrom is unset, so only the owner can run /approve."
        : "commands.allowFrom lets non-owners run commands, and any of them can resolve a pending approval by its id from their own chat. Remove it, or keep confirm: command.",
    },
    {
      id: "forwarding",
      ok: forwarding,
      text: forwarding
        ? "approvals.plugin.enabled is on, so approval prompts reach the chat."
        : "approvals.plugin.enabled is off: approval prompts only reach native approval clients and otherwise expire unseen.",
    },
    {
      id: "conversationAccess",
      ok: access,
      text: access
        ? `plugins.entries.${pluginId}.hooks.allowConversationAccess is on.`
        : `Set plugins.entries.${pluginId}.hooks.allowConversationAccess: true. Without it, heartbeat and sub-agent runs can't be told apart from other non-owner runs.`,
    },
    {
      id: "selfChat",
      ok: true,
      text: selfChat
        ? "WhatsApp may run in self-chat mode (channels.whatsapp.selfChatMode isn't false). There, loosening /guard commands only work from the Control UI or TUI, and the agent can't add approval reactions."
        : "No WhatsApp self-chat setup.",
    },
    {
      id: "codex",
      ok: true,
      text: !usesCodex(hostConfig)
        ? "No model runs on the Codex runtime."
        : codexWebSearch === "off"
          ? "Codex runtime in use; codexWebSearch is off, so Codex runs aren't labeled up front. Keep Codex's hosted web_search turned off."
          : "Codex runtime in use: its hosted web_search reaches the model without any OpenClaw hook, so every Codex run starts as having read untrusted content. If you turn that search off in Codex, set codexWebSearch: off.",
    },
    {
      id: "runTimeout",
      ok: !shortRun,
      text: shortRun
        ? `agents.defaults.timeoutSeconds is ${runTimeout} s, shorter than the guard's ${approvalTimeoutSec} s approval window. A run that waits for your approval is ended at ${runTimeout} s even if you approve. Raise it, or lower approvalTimeoutSec.`
        : `The agent run timeout leaves the full ${approvalTimeoutSec} s approval window.`,
    },
  ];
}

/** Plugin approvals are an owner-only, visible control only when all three hold. */
export function approvalsOwnerOnly(checks: readonly DoctorCheck[]): boolean {
  return checks.filter((c) => c.id === "owner" || c.id === "approvers" || c.id === "forwarding").every((c) => c.ok);
}
