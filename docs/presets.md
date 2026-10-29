# Presets

Each row is a situation the Guard decides on before a tool runs. Some terms:
- **Tainted:** the session holds untrusted content.
- **Private:** it holds private data, such as secrets, email, memory, or files listed in `privateSources`.
- **Owner-triggered:** the current run was started by a message from the owner (`senderIsOwner` from OpenClaw). Cron, heartbeat, sub-agent and inter-session runs aren't owner-triggered, and neither are messages from anyone else.

An **ask** is an OpenClaw approval prompt in the owner's chat. A run nobody can answer turns its asks into blocks: cron, heartbeat, a non-owner's run, an inter-session run. A Relaxed preset ships in v0.2.

| Situation | **Balanced** (default) | Strict |
|---|---|---|
| Read-only tools | allow | allow |
| Reading local data (files, memory, mail, other sessions) in a run a non-owner started, since the reply goes to them | block | block |
| Any side effect in a clean, owner-triggered session | allow | allow |
| Content to the owner (tainted) | allow, constructed links defanged | same |
| Attested destination (tainted, not private) | allow | allow |
| Attested non-owner destination (tainted and private) | ask if the secret scan matches, else allow | ask |
| Unattested destination (tainted) | ask | block |
| Constructed URL (tainted and private) | ask | block |
| Constructed URL (tainted only) | ask if it has a query string or encoded-looking parts, else allow | ask |
| Constructed-looking URL on an allowlisted shared-hosting domain (tainted and private) | ask if suspicious, else allow | ask |
| Link-following URL (copied from a page the session read) | allow, rate-limited while private | ask if private |
| Exec with an attested command (owner typed it in backticks, or a `trusted.commandPrefixes` match) | allow | allow |
| Exec with an unattested command (tainted) | ask | block |
| Sensitive exec in an autonomous run (ssh, scp, `curl \| sh`, `rm -rf`, installs, `git push`, …) | ask | block |
| File or memory write (tainted) | allow, and label it (memory: the lines it added) | same |
| Outbound files to anyone but the owner (tainted and private) | ask | ask |
| Scheduling (tainted): `automations`, or `crontab` / `at` / `systemd-run` / `launchctl` through exec | ask | block |
| Config, policy, or protected-path write, including `openclaw` CLI config and plugin subcommands | ask if clean, block if tainted | block unless done through `/guard` |
| Skill or plugin install (tainted) | block | block |
| Any `openclaw` CLI use from exec, reading the Gateway token, dumping the environment, or calling the Gateway port | block (approval forgery) | block |
| An approval emoji (👍 ♾️ 👎 …) on anything but a received message | block | block |
| Browsing to a messaging web client (web.whatsapp.com, web.telegram.org, …) | ask if clean, block if tainted | same |
| `sessions_send` / `sessions_spawn` | allow; the target inherits the labels | same |
| Unknown tool carrying text (tainted and private) | ask | ask |

## What counts as attested

Values the owner typed in their own message: email addresses, phone numbers, `@handles`, channel targets (`dm:carol`, `channel:C123`), URLs, file paths, `` `backticked` `` commands, and quoted strings.
- **Bare domains:** a bare domain attests only its root URL.
- **Pasted text:** quoted (`>`), forwarded, long pasted paragraphs, long fenced blocks, and attachments never attest anything. They taint the session instead.
- **Commands:** only backticks or a short fenced block count. A plain-prose command ("run ls ~/x") isn't attested, because harvesting from prose would also attest "don't run rm -rf ~".

## Hard sinks and shadow mode

Shadow mode logs asks and blocks without enforcing them, with two exceptions that hold in every mode except `off`:
- **Hard sinks:** config and protected paths after untrusted content, approval forgery, installs, and messaging web clients.
- **The lethal trifecta:** untrusted instructions, private data, and a way out.
