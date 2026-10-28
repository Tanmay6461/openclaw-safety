// Host config checks for `/guard doctor` (phase0/channel-results.md, "What this means for the
// Guard"). Plugin approvals carry no resolver identity, so whether they are an owner-only control
// depends entirely on the host's command settings.

export interface DoctorCheck {
  id: "owner" | "approvers" | "forwarding" | "conversationAccess";
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

export function doctorChecks(hostConfig: unknown, pluginId: string): DoctorCheck[] {
  const owner = nonEmpty(get(hostConfig, "commands", "ownerAllowFrom"));
  const allowFrom = nonEmpty(get(hostConfig, "commands", "allowFrom"));
  const forwarding = get(hostConfig, "approvals", "plugin", "enabled") === true;
  const access = get(hostConfig, "plugins", "entries", pluginId, "hooks", "allowConversationAccess") === true;
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
  ];
}

/** Plugin approvals are an owner-only, visible control only when all three hold. */
export function approvalsOwnerOnly(checks: readonly DoctorCheck[]): boolean {
  return checks.filter((c) => c.id !== "conversationAccess").every((c) => c.ok);
}
