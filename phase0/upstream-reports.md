# Draft upstream reports for OpenClaw (v2026.10.8)

Three issues found during Provenance Guard's Phase 0 testing. Each is written to be filed as-is; adjust the wording before posting. Evidence paths refer to this repo (`phase0/…`) or to OpenClaw source at tag `v2026.10.8`. All tests ran with a mock LLM and the simulated qa-channel; no real accounts were involved.

---

## 1. Pending approvals are revoked by unrelated session changes; a sender's first native `/approve` always fails closed

**Summary.** A pending plugin approval fails closed ("Plugin approval required (gateway unavailable)", `onResolution("cancelled")`) whenever any session change happens while it waits, even when the owner approves it correctly. In practice:
- **The first approval fails.** A sender's first-ever native `/approve` creates their slash session (`agent:main:<channel>:slash:<sender>`). Creating that session revokes the very approval it was sent to resolve.
- **Concurrent runs cancel it.** Any other agent run that starts while an approval is pending (a CLI turn, a cron job) cancels it too.

**Impact.**
- **Usability:** an owner's first approval after setup never works, and approvals are fragile on busy gateways.
- **Safety:** none. It fails closed.

**Steps to reproduce** (qa-channel; harness in `phase0/channel/`):
1. Configure `commands.ownerAllowFrom: ["qa-channel:alice"]` and `approvals.plugin: { enabled: true, mode: "session" }`, with a plugin whose `before_tool_call` returns `requireApproval` for an `exec`.
2. As alice, with no prior native command, send a message that triggers the gated `exec`.
3. When the prompt appears, send `/approve <id> allow-once` as a native command.
4. The chat confirms "Plugin approval allowed once. Resolved by Chat approval (qa-channel:alice)", but the waiting call fails with `Approval requester authority changed` and the plugin's `onResolution` receives `cancelled`.
5. Send any native command first (for example `/status`), then repeat steps 2–3: the approval resolves `allow-once`.

**Observed.**
- Runs `ch-base10` (no third-party plugins) and `ch-guard1`/`ch-guard2` fail as described.
- `ch-guard3`, with a native-command warm-up first, succeeds.
- Runs `ch-base5` and `ch-base6` show the concurrent-run variant: an `openclaw agent` CLI turn, or a cron job, started during the wait.
- Gateway log: `plugin approval gateway request failed; blocking tool call: Error: Approval requester authority changed`.

**Where (source).**
- **The check:** `src/gateway/server-methods/approval-request-authority.ts` `assertPolicyCurrent` throws when `readGatewayAccessRevision()` has changed since the request.
- **The bump:** `bumpGatewayAccessRevision()` runs on every committed session change event (`src/gateway/server-methods/session-change-event.ts:427-428`, unless `accessChanged === false`) and on session identity mutations (`src/gateway/server-runtime-subscriptions.ts:666`).

**Suggested direction.**
- Scope the revision check to changes that affect the approval's own requester or source session, rather than any session.
- Or mark slash-session creation and unrelated run starts as `accessChanged: false`.

---

## 2. WhatsApp: approval reactions are resolved before the outbound-echo filter on the live path

**Summary.** On the live inbound path, an approval reaction (👍 allow-once, ♾️ allow-always, 👎 deny) is resolved *before* the echo filter that drops the gateway's own sends. The durable replay path filters first.
- **What follows:** a reaction the agent itself sends on the approval prompt, through the `message` tool's `react` action with `fromMe: true`, would be accepted as the owner's decision. This applies wherever the owner's own number, or `"*"`, is an allowed approver.
- **Self-chat:** owner reactions in self-chat are a supported feature, so self-chat setups are exposed by design.

**Impact.**
- **Safety:** an agent steered by injected content could approve its own pending action, including plugin approvals such as a security plugin's. It needs the prompt's message id, which it can get, for example, when the owner quote-replies to the prompt.

**Status.**
- **Found by reading source**, not reproduced at runtime: no WhatsApp account was used.
- **Mitigated in Provenance Guard**, which blocks the agent's approval-emoji reactions on messages it didn't receive (runtime-tested on qa-channel, run `ch-guard6`).

**Where (source, v2026.10.8).**
- **Live upsert path:** `extensions/whatsapp/src/inbound/message-delivery.ts`. `resolveApprovalReaction` runs at `:503`, before `skipRecentOutboundEcho` at `:517`.
- **Replay path:** filters first (`:418-425`).
- **Actor resolution:** `extensions/whatsapp/src/approval-reactions.ts:340-344`; with `fromMe`, the actor is the self LID/JID.
- **Emoji set:** `src/plugin-sdk/approval-reaction-runtime.ts:182-190`.

**Suggested direction.**
- Run the echo check (`shouldSkipRecentOutboundEcho`) before `resolveApprovalReaction` on the live path as well.
- Consider refusing approval reactions whose message id matches a recent gateway send.

---

## 3. The Gateway randomly refuses to start on filesystems with 64-bit inode numbers ≥ 2^63

**Summary.** On a shared HPC scratch filesystem that hands out random 64-bit inode numbers, `openclaw gateway run` failed at startup about half the time, after a config write by `openclaw plugins install`:

```
Config could not be read at <state>/openclaw.json:
- <root>: read failed at <state>/openclaw.json: Error: SQLite snapshot requires a captured physical file identity
    at assertPreflightConfigUnchanged (doctor-config-preflight-plugin-verification-*.mjs)
    at prepareStartupConfig (startup-config-preflight-*.mjs)
```

**Observed.**

| Run | Config file inode | Result |
|---|---|---|
| codex-1 | 4,545,468,370,416,307,149 | started |
| codex-3 | 1,278,084,731,538,541,337 | started |
| codex-4 | 12,295,761,393,218,165,011 | **failed** as above |
| codex-2 | not recorded | failed at the same bootstrap stage, with no message (no `--verbose`) |
| codex-5 | state on node-local ext4/xfs (small inodes) | started |

- **Pattern:** the one failure with a recorded inode had an inode above 2^63 (9,223,372,036,854,775,807), and both successes were below it. A signed 64-bit SQLite INTEGER can't hold an inode above 2^63, which fits the failure.
- **Caveat:** we didn't trace the exact conversion inside OpenClaw. `readDatabaseFileIdentity` (`src/infra/sqlite-worker-identity.ts:36-49`) accepts up to 20 decimal digits, so the loss must happen earlier: when the identity is captured or stored.

**Environment.** Linux, Node 24.22.1, Apptainer container, state directory on a GPFS-style scratch filesystem (`stat -c %i` shows 19–20 digit inode numbers).

**Steps to reproduce.**
1. Put `OPENCLAW_STATE_DIR` on a filesystem with large inode numbers.
2. Run `openclaw plugins install <any>`, which rewrites `openclaw.json`.
3. Check `stat -c %i openclaw.json`; if it's ≥ 2^63, `openclaw gateway run` fails as above.

**Suggested direction.**
- Capture `dev`/`ino` with `fs.statSync(path, { bigint: true })`.
- Store them as strings or BLOBs rather than SQLite INTEGERs.
