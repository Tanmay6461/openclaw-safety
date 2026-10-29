# Real-channel tests: what to set up

These close plan §13 items 2 (owner flag on real channels) and 3 (self-chat echo, approval reactions, approver lists). qa-channel can't show them: it never reads the bot's own messages back and has no native approvals.

**Ground rules (as for every Phase 0 run):**
- **Throwaway accounts only.** Never your personal WhatsApp, Telegram, Slack or Discord.
- **Mock model:** the LLM stays the mock, so no model API key is involved.
- **The Gateway runs on the cluster**, inside the container, reaching the channel services through Explorer's proxy.
- **Tokens and linked-device credentials** live only in the run's state folder on scratch. They're never copied to the repo, and you revoke them after the tests.

## WhatsApp (self-chat, the most important)

You need:
- A spare phone number with WhatsApp installed on a phone you control. A cheap prepaid SIM or a secondary eSIM is enough.

How it works:
- OpenClaw links to it as a WhatsApp Web device. The Gateway prints a QR code in its log, and you scan it from the phone (Settings → Linked devices).
- Self-chat is the "message yourself" chat of that number.

Tests:
1. Does an `/approve <id>` that the agent sends to the self-chat through the `message` tool resolve a pending approval?
2. Does a 👍 that the agent adds to the approval prompt (`message` `react`, `fromMe: true`) approve it? This is the source-reading finding in `phase0/upstream-reports.md` #2. It runs with the Guard in shadow mode and the approval gating a harmless `echo`.
3. Is `senderIsOwner` true for your own messages, and is a `/guard` command's surface detected as self-chat (`from === to`)?

## Telegram (approver lists)

You need:
- **A bot:** create one with @BotFather and send me its bot token. Treat it like a password; revoke it with /revoke afterwards.
- **Two Telegram accounts:** one acting as the owner, one as the non-owner. A second account can use a second number, or Telegram's multi-account on the same phone.
- **A small group** containing the bot and both accounts.

Tests:
- Does a native approval (inline buttons) accept a tap from the non-owner?
- Is `senderIsOwner` set correctly in a DM and in the group?

## Slack and Discord (optional, same questions as Telegram)

- **Slack:** a free test workspace, an app with a bot token and Socket Mode token, and two member accounts.
- **Discord:** a test server, a bot application token, and two user accounts.

## What I need from you

1. Tell me which channels you've set up.
2. For Telegram, Slack or Discord, the tokens. Put them in a file on the cluster yourself (for example `/scratch/pawar.ta/pg/secrets/channels.env`, with mode 600) rather than pasting them into chat. I'll read them from there inside the container.
3. For WhatsApp, be ready to scan the QR code when the run prints it. The run waits up to 5 minutes for the link.
