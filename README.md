# Provenance Guard

A security plugin for [OpenClaw](https://github.com/openclaw/openclaw) that stops prompt-injected content from driving risky tool calls.

It tracks where the data in each session came from: web pages, emails, other people's messages, files, memory. Before a tool runs, it checks where each risky argument came from: a recipient, a URL, a command, a path.

When untrusted content would reach a risky argument the owner never supplied, the Guard asks the owner through OpenClaw's own approval prompt. For actions that can't be undone, it blocks. It needs no model calls and does no injection detection: every decision is deterministic and runs outside the model.

> **Status: beta (0.1.0-beta.0, unreleased).** Not yet on npm or ClawHub. MIT licensed. It's tested against OpenClaw `v2026.10.8`:
> - 555 unit, property and fuzz tests;
> - runtime tests on a real Gateway with qa-channel and Telegram;
> - a benchmark run with a scripted mock model.
>
> Real-model benchmark numbers come later (plan §9).

## What it catches

| An injected page, email, or message tries to… | What the Guard does |
|---|---|
| Send your data to an address you never gave (`message`, email) | Asks; under Strict, blocks |
| Leak data in a URL it builds itself (query string, path, base64) | Asks when the URL has a query string or encoded-looking parts, or the session holds private data. Under Strict: asks on any such URL, and blocks with private data |
| Run a command you didn't type (`curl … \| sh`) | Asks; under Strict, blocks |
| Edit your shell profile, OpenClaw config, or this plugin's policy | Blocks after untrusted content |
| Approve its own pending approval through the `openclaw` CLI, the Gateway token, or 👍 reactions | Always blocks |
| Schedule a job (`automations`, `at`, `crontab`) | Asks; the job's runs inherit the session's labels |
| Plant an instruction in memory or a file for a later session | Labels the lines it wrote; a later session that reads them is tainted |
| Get a stranger's DM answered with your local files | Blocks local reads in runs a non-owner started |
| Hide data in a markdown image in the reply | Removes the image from the reply |

Things you asked for yourself are allowed: a URL, address, path, channel target (`dm:carol`), or `` `command` `` you typed. Links copied from a page you're reading are allowed too.

## How it works

- **Labels.** Each session collects *untrusted* labels (what it read from outside) and *private* labels (secrets, email, memory). Labels follow data into files, memory lines, cron jobs, sub-agents and other sessions, and persist in OpenClaw's plugin store across restarts.
- **Attestation.** Values the owner typed in their own messages are attested. Pasted, quoted and forwarded text never counts.
- **Decisions.** On `before_tool_call`, each risky argument is classified as attested, link-following, or constructed, then checked against the preset. Asks go through OpenClaw's native plugin approvals. Some cases are blocked in every mode, shadow included:
  - hard sinks: config changes, approval forgery, protected paths after untrusted content;
  - the lethal trifecta: untrusted input, private data, and a way out.
- **Replies.** The agent's normal replies are rewritten on `reply_payload_sending`: images that point at URLs the agent built are removed, and private tokens are redacted from replies to anyone but the owner.

The full design is in [`provenance-guard-implementation-plan.md`](provenance-guard-implementation-plan.md).

## Install (from source)

```bash
npm ci
npm run bundle            # -> dist/provenance-guard
```

Point OpenClaw at the bundle and start in shadow mode, which logs what it would ask or block without enforcing:

```jsonc
// openclaw.json
{
  "plugins": {
    "load": { "paths": ["/path/to/dist/provenance-guard"] },
    "entries": {
      "provenance-guard": {
        "enabled": true,
        "hooks": { "allowConversationAccess": true },
        "config": { "mode": "shadow" }
      }
    }
  },
  // Recommended host settings; /guard doctor checks them:
  "commands": { "ownerAllowFrom": ["telegram:<your id>"] },
  "approvals": { "plugin": { "enabled": true, "mode": "session" } }
}
```

Then, from your own chat:
1. Run `/guard doctor` and fix what it flags.
2. Use OpenClaw normally for a while. `/guard status` shows what the Guard would have done.
3. When you're comfortable, run `/guard enforce`.

## Commands

`/guard` is owner-only (`requiredScopes: ["operator.admin"]`). In a WhatsApp chat with yourself, commands that loosen the Guard only work from the Control UI or TUI.

| Command | What it does |
|---|---|
| `/guard status` | Mode, preset, session and decision counts, storage, config checks |
| `/guard doctor` | Checks the host settings that make approvals owner-only and visible |
| `/guard enforce` · `shadow` · `pause <30m\|2h>` · `off` | Change mode (`off` only from an operator surface) |
| `/guard preset balanced\|strict` | Switch preset |
| `/guard rules` · `forget <id>` | List or remove rules learned from "allow always" |
| `/guard trust <path>` | Clear labels on a file you've reviewed. For a memory file, also clears its labeled lines |
| `/guard pending` · `allow <code> [always]` · `deny <code>` | Confirm asks by code (`confirm: command`) |
| `/guard report` | Decision counts since start |

## Configuration

All keys are optional (`plugins.entries.provenance-guard.config`).

| Key | Default | Meaning |
|---|---|---|
| `mode` | `shadow` | `shadow`, `enforce`, or `off` |
| `preset` | `balanced` | `balanced` or `strict` ([presets](docs/presets.md)) |
| `confirm` | `auto` | How the owner confirms an ask: OpenClaw approval prompts (`approval`), or `/guard allow <code>` (`command`). `auto` picks approvals only when `/guard doctor` finds them owner-only |
| `trusted.recipients` / `domains` / `commandPrefixes` | `[]` | Always-attested recipients, domains, and command prefixes |
| `untrustedPaths` | `~/Downloads/**`, `/tmp/**` | Files that taint a session when read |
| `privateSources` | `email`, `memory` | Also `files:<glob>` |
| `protectedPaths` | (built-in list) | Extra protected paths |
| `approvalTimeoutSec` | `600` | Approval window; keep it under `agents.defaults.timeoutSeconds` |
| `codexWebSearch` | `assume_on` | Codex runs start untrusted unless you turned Codex's hosted search off |
| `storage` | `auto` | OpenClaw's plugin store (`host`), or `store.json` (`file`) |
| `deadlineMs` | `200` | Hard per-decision deadline. Past it, the call falls back to `failMode` (ask, or block when nobody can be asked) |

## Limits

See [docs/limitations.md](docs/limitations.md) for what the Guard doesn't do, [docs/threat-model.md](docs/threat-model.md) for what it's built against, and [docs/faq.md](docs/faq.md) for common questions.

## Development

```bash
npm ci
npm test          # vitest: unit, property (fast-check) and fuzz tests
npm run typecheck
npm run build
```

- `packages/core` is the harness-agnostic engine: labels, attestation, policy, URL and exec classification, memory entries.
- `packages/openclaw` is the OpenClaw adapter: hooks, the tool registry for `v2026.10.8`, approvals, commands, and the host keyed store.
