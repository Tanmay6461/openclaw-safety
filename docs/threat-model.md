# Threat model

## Assets
- Credentials and secrets.
- Private data: email, files, memory, calendar, chat history.
- The owner's outbound identity: messages and email sent "as" the owner.
- Host integrity (shell, filesystem) and agent configuration, including this plugin's own policy.

## The attacker
- **Can:**
  - place content anywhere the agent reads: web pages, search results, emails and attachments, group chats, DMs from non-owners, skill and MCP tool output, shared documents, cloned repos, and feeds;
  - phrase that content as instructions to the agent.
- **Cannot:** edit host files directly, run code on the host, or impersonate the owner's paired channel identity.

## Trust boundary
Messages from the owner carry trusted instructions:
- on chat surfaces, OpenClaw's `senderIsOwner` for the paired owner identity (`commands.ownerAllowFrom`);
- the owner's local CLI.

Everything else is untrusted data, including text the owner pastes or forwards inside their own message.

## In scope
1. **Exfiltration:**
   - messages, email and file attachments;
   - URL fetches: query string, path, encoded data;
   - link previews and markdown images;
   - shell network commands;
   - the agent's reply to a non-owner.
2. **Command execution** with attacker-chosen commands.
3. **Persistence ("sleepers"):**
   - instructions written into memory or files;
   - cron jobs;
   - sub-agents;
   - messages to other sessions;
   - files written by exec, including through redirection and `tee`.
4. **Disabling defenses:**
   - editing OpenClaw config or this plugin's policy;
   - installing skills or plugins;
   - the agent approving its own pending approval (the `openclaw` CLI, the Gateway token, approval reactions).
5. **Impersonation:** sending attacker-chosen messages to the owner's contacts.

## Out of scope (documented, not solved)
- **Malicious code in the Gateway process**, such as a malicious plugin or skill code. That needs sandboxing and vetting.
- **A compromised host or owner account.**
- **Text-only manipulation** with no action attached.
- **Low-bandwidth covert channels**, such as picking between attacker-supplied links to leak one bit at a time. Rate limits on link-following reduce this.
- **The owner approving a malicious prompt.** Prompt text names the untrusted source and the argument, but can't prevent a yes.
- **Multi-tenant isolation** on one shared Gateway.
