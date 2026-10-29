# Telegram results (run tg-2, 2026-10-28)

Closes the Telegram part of plan §13 items 2–3.

**Setup:**
- a real Telegram bot (throwaway, @baruka_1_bot) and two burner accounts: the owner (7845032487) and a non-owner (7419412584), plus a group containing the bot and both;
- OpenClaw `v2026.10.8` on the cluster (Apptainer, node-local state), Telegram reached through Explorer's proxy;
- mock model, Guard in enforce mode, probe plugin gating `exec echo pg-approve-low ok` with a plugin approval.

Channel config is in `phase0/telegram/write-config.mjs`:
- `dmPolicy: allowlist` with both accounts;
- `execApprovals.approvers: [owner]`, target `both`;
- `commands.ownerAllowFrom: ["telegram:<owner>"]`;
- `approvals.plugin.enabled`, mode `session`.

Evidence is in `phase0/results/tg-2/`:
- the trimmed and redacted probe events (`events.jsonl`);
- the Guard audit;
- mock requests;
- the config (Gateway token redacted);
- a Telegram excerpt of the Gateway log.

The bot token was never copied out of the cluster.

## Results

| Question | Result |
|---|---|
| `senderIsOwner` in a DM | **Correct.** Owner DM: `true` on every hook that carries the requester, `before_agent_run` through `agent_end`. Non-owner DM: `false` on all of them |
| `senderIsOwner` in the group | **Correct for the owner:** `true` on `before_agent_run` and on `before_tool_call`'s `ctx.requester` (`{channel: telegram, senderId: 7845032487, senderIsOwner: true}`). The non-owner didn't send a plain group message in this run, so non-owner-in-group was shown only on qa-channel (channel-results) |
| Tool surface for a non-owner | OpenClaw drops the owner-only `openclaw` tool from the non-owner's turns (`mock-requests.jsonl`, seq 2–3); owner turns offer it |
| Who can resolve a native approval (inline buttons)? | **Approvers only.** The prompt went to the group (message 10) and the owner's DM (message 11), as `target: both` asks. The non-owner's taps came first (Telegram updates at 21:28:36–21:29:22) and **resolved nothing**. The owner's tap (21:29:42) resolved it `allow-once`, and the exec ran. Confirmed by the user on both phones |
| `/guard status` from the non-owner | **No reply and no `message_received`.** OpenClaw dropped it before the command handler (owner-only commands under `commands.ownerAllowFrom`) |
| `/guard status` from the owner | Answered: enforce, balanced, 3 sessions, 1 allow, `Storage: host`. It also showed a stale load error (below) |
| Guard decision | The gated exec was audited `allow` ("clean session started by the owner"). Ownership came from the real channel's requester, not from config |

## Findings

1. **Approval window = agent run timeout.**
   - The approval asked for 300 s, but the embedded run timed out at 120 s (`agents.defaults.timeoutSeconds`). The owner approved at 119.7 s and the exec ran, then the run was killed, and the group got "Request timed out before a response was generated".
   - So an approval only works while the run is still alive. For the Guard's asks, the effective window is the shorter of the approval timeout and the run's remaining time.
   - **Fix:** `/guard doctor` should warn when the run timeout is short for human confirmations.
2. **Stale load error in `/guard status` (fixed).**
   - The keyed-store load failed on its first attempt and loaded cleanly on retry (audit `store-loaded`, attempts 2, no errors). `lastError` still kept the first attempt's message, so status reported "last error: load pg-artifacts: … runtime is no longer active".
   - **Fix:** a clean retry now clears it (`host-store.ts`, test in `host-store.test.ts`).
3. **`/start` reaches the agent:** Telegram's `/start` (the non-owner's first message) was delivered to the agent as a normal message, not as a command.

## Still open

- **WhatsApp self-chat** (§13 item 3): the echo of `/approve` and of approval reactions. Needs a burner WhatsApp number.
- **Slack and Discord approver lists:** optional, and only if those accounts are set up.
