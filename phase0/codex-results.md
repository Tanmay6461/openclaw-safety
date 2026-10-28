# Phase 0 Codex lane (plan §13 item 4), OpenClaw 2026.10.8 + @openclaw/codex 2026.10.8 (Codex 0.160.0)

**Question:** do Codex-native tool names reach a plugin's `before_tool_call` normalized (`exec`) or native (`Bash`)?

**Answer: normalized, at runtime** (run codex-3), and the params are normalized too:

| Codex sent (Responses API, to the mock) | `before_tool_call` received | Guard (shadow) |
|---|---|---|
| `exec_command` function call `{cmd: "echo pg-codex-shell", login: false}` | `toolName: "exec"`, `params: {command: "echo pg-codex-shell"}` | allow (clean owner session) |
| `apply_patch` custom tool call, raw patch text | `toolName: "apply_patch"`, `params: {command: "*** Begin Patch\n*** Add File: pg-codex.txt…"}` | allow (clean owner session) |

- `ctx` carried `requester` and the session key as for OpenClaw-native runs. Both commands ran, and Codex returned their outputs to the mock.
- **Guard change:** Codex's patch text arrives as `command`, which neither the source reading (`{patch}`) nor OpenClaw's own `apply_patch` (`{input}`) predicted. The registry now maps `apply_patch.command` as content, and patch paths are derived from it too. A test covers a Codex-shaped patch that adds `~/.ssh/authorized_keys` in a tainted session, which is blocked as a protected path.
- `spawn_agent` wasn't offered in this config; Codex got OpenClaw's own `sessions_spawn` as a dynamic tool. The `Agent` → `spawn_agent` mapping remains source-only.

## Tools Codex offered the model

- Codex native: `exec_command`, `write_stdin`, `request_user_input`, `apply_patch` (custom grammar), `view_image`, `web_search` (hosted), `tool_search`.
- OpenClaw dynamic: `agents_list`, `agents_wait`, `message`, `progress_card`, `sessions_spawn`, `openclaw_direct.computer`, `openclaw_direct.heartbeat_respond`, `openclaw_direct.openclaw`, `openclaw_direct.sessions_yield`.
- **Open gap: Codex's hosted `web_search`** runs on OpenAI's side, so its results reach the model without any OpenClaw hook and the Guard can't label the session untrusted. It wasn't exercised; the Guard should treat Codex sessions with hosted web search enabled as tainted from the start, or the setup docs should turn it off. Not yet implemented.
- `write_stdin` (input to a running exec session) and `view_image` weren't exercised; whether the relay maps them is unknown.

## Harness and what it took

`phase0/codex/` (drafted from source by a background agent, then debugged here). The steps, with what went wrong along the way:

1. **Install:** `openclaw plugins install @openclaw/codex@2026.10.8 --pin` per run. A `plugins.load.paths` copy gets origin `config`, and the plugin's harness registration (`nativeCompaction`) is refused. The managed install gets origin `global`, trust `trusted-official`.
2. **Network fence:** the only step that needs the outside is the install (the npm registry through Explorer's proxy). After it, every proxy variable points at a dead local port, and Explorer compute nodes have no direct route out (`curl` to example.com fails). The run aborts if any outside connection succeeds. OpenClaw's `openai` provider keeps its official base URL, since Codex rejects custom routes; only Codex is pointed at the mock (`OPENCLAW_CODEX_APP_SERVER_ARGS … -c openai_base_url=<mock>/v1`). A hosts file bound over `/etc/hosts` was tried first and doesn't apply under Apptainer.
3. **Responses mock** (`mock-responses.mjs`): Codex first tries a WebSocket; the mock answers 426 and Codex falls back to HTTP SSE.
4. **codex-1 failed:** "Cannot inspect Codex processes. Process identity is unavailable." In Apptainer's PID namespace, a process whose group leader is outside the namespace shows `pgid 0` in `/proc/<pid>/stat`, which the Codex plugin rejects (`transport-process-snapshot.ts`, `parseLinuxProcess`). **Fix:** start the Gateway under `setsid`.
5. **codex-2 and codex-4 failed:** "SQLite snapshot requires a captured physical file identity" in the startup config check. Scratch hands out random 64-bit inode numbers; codex-4's `openclaw.json` got inode 12,295,761,393,218,165,011, above 2^63, which a signed SQLite integer can't hold. codex-1 and codex-3 got inodes below 2^63. That's an OpenClaw bug on filesystems with 64-bit inodes (GPFS and others), worth reporting upstream. **Fix (in the harness, for later runs):** OpenClaw's state goes on node-local disk (`LOCAL_STATE=1`, default) and is copied back at the end.

Run `codex-3` (setsid, state on scratch with a small inode) completed all four scenarios. Results: `phase0/results/codex-3/` (report.md has the tables).
