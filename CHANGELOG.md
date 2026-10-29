# Changelog

## 0.1.0-beta.0 (unreleased)

First beta. Tested against OpenClaw `v2026.10.8`.

**Engine**
- **Session labels:** each session collects untrusted and private labels. Values the owner types are attested; pasted, quoted and forwarded text never counts.
- **Per-argument decisions:** each risky argument (destination, URL, command, path) is classified before the tool runs, under the Balanced and Strict presets.
- **Blocked in every mode except `off`:**
  - hard sinks: config and protected paths after untrusted content, installs, messaging web clients;
  - the lethal trifecta: untrusted content, private data, and a way out.
- **Approval forgery is always blocked:** the `openclaw` CLI from exec, the Gateway token, environment dumps, the Gateway port, and approval emoji.
- **Runs started by a non-owner can't read local data** (files, memory, mail, other sessions).
- **Outbound text:**
  - URLs the agent built are defanged, and chat commands are neutralized;
  - the secret scan asks before sending matches, or redacts them;
  - replies are rewritten too, through `reply_payload_sending`: constructed-URL images removed, private tokens redacted for non-owners.

**Persistence**
- **Storage:** labels, rules and mode live in OpenClaw's plugin keyed store and survive restarts.
- **Files:** writes label the file. Exec downloads, redirection and `tee` targets are labeled too, and exec windows cover what the parser can't see. Labeled files changed outside the agent are flagged as stale.
- **Memory:** labeled per line. A later read, or the bootstrap load of `MEMORY.md`, is tainted only by the labeled lines it contains.
- **Propagation:** cron jobs pass their labels to their runs; sub-agents and `sessions_send` targets inherit the sender's labels.
- **Session lifecycle:** after `/new`, `/reset`, or an idle or daily reset, a session starts fresh. Compaction keeps labels.

**Owner experience**
- **Asks** go through OpenClaw's native plugin approvals, or `/guard allow <code>` when approvals aren't owner-only.
- **`/guard` commands** (owner-only): `status`, `doctor`, `enforce`, `shadow`, `pause`, `off`, `preset`, `rules`, `forget`, `trust`, `pending`, `allow`, `deny`, `report`.
- **`/guard doctor`** checks the owner identity, approvers, prompt forwarding, conversation access, self-chat mode, Codex, and the run timeout.
- **Shadow mode** is the default.

**Measured** (benchmark v0, mock model):
- Against stock OpenClaw, 100% of the 14 attack scenarios succeeded.
- With the Guard on Balanced and a careful user, the share fell to 7% on the first fixed build. The remaining case was a scoring error, since fixed.
- Decisions take p99 0.42 ms.
