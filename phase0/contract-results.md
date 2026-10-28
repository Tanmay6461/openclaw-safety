# Phase 0 contract sweep (OpenClaw 2026.10.8, Explorer cluster)

Plan §13 item 7 ("confirm the exact parameter names of the less common tools"), done as a sweep over **every tool, every action, and every parameter** a live Gateway offers. Harness: `phase0/contract/`. Results: `phase0/results/contract-1` … `contract-4` (`report.md` in each; per-run CLI output in `out/` isn't committed).

## How it works

1. **Dump.** A Gateway with the Guard (enforce), qa-channel (so `message` exposes channel actions), and the `pg-contract` sentinel plugin. The contract mock LLM collects every tool's JSON schema:
   - compact surface on (contract-1/2): the request's 12 direct tools, plus `tool_search` (one query per call; a 16-query batch truncates) and `tool_describe` on every id found, feeding "Did you mean" suggestions back in until nothing new appears;
   - compact surface off (`tools.toolSearch: false`, `tools.codeMode: false`; contract-3/4): every tool's full schema is in the request. This is the only way to get `automations`, whose 64k-char schema `tool_describe` truncates at ~32k.
2. **Generate** (`gen-calls.mjs`). One call per tool, and per value of its `action` (or `corpus`) enum, with **every** parameter filled with a schema-valid sample. Paths land in the workspace, URLs point at a dummy host, and string patterns are honored.
3. **Sweep.**
   - **Clean pass:** each call in its own fresh owner session (6 in parallel), because up-front labels from one blocked call would taint the next.
   - **Tainted+private pass:** one session, labeled first by a setup run (web_fetch of an injected page, read of a private file), then swept in chunks.
   - **Sentinel:** registers `before_tool_call` at priority -2,000,000, below the Guard's -1,000,000. It records the host's event and blocks the call, so nothing in the sweep executes. Setup calls carry `pg-setup` and pass.
4. **Analyze** (`analyze-contract.mjs`). Compares the schemas with the registry (unmapped parameters, stale entries, unlisted actions), and joins each call to the Guard's audit decision through the mock's call ids.

## Runtime facts learned along the way

- **A Guard block or ask ends the hook chain.** Lower-priority handlers (the sentinel) never see the call. The Guard's audit log is the record of truth.
- **OpenClaw validates arguments, regex patterns included, before `before_tool_call`.** An invalid call fails with "Validation failed for tool …"; the hook doesn't fire and the tool doesn't run (contract-3: 22 calls with pattern-invalid samples). That's no bypass, but the generator now picks pattern-valid values.
- **Every hidden tool reaches the Guard through `tool_call`** (contract-2 clean pass: 176 of 176). With the compact surface off, every tool is called directly (contract-3/4).
- **Tool-call ids are rewritten on the wire** (non-alphanumerics dropped), so joins compare alphanumerics only.
- **The `message` schema depends on the configured channels.** With channels off it has only `send`/`broadcast`; with qa-channel it adds `react`, `edit`, `delete`, `read`, `search`, `reactions` and `thread-*`.

## Registry gaps found and fixed

contract-1/2 compared the registry from static research (49 tools) with the live schemas (58 tools); contract-3 added `automations` and `progress_card`. Everything below is now in `packages/openclaw/src/registry/openclaw-tools.json`:

| Gap | Risk | Fix |
|---|---|---|
| 26 tools unregistered (`agents_*`, `ask_user`, `dashboard`, `dir_*`/`file_*` node transfer, goals, `intent`, `node_inference`, `presence`, `sessions_*`, `skills_*`, `theme`, `transcripts`, `talk_voice`, `progress_card`, …) | Inferred specs: result labeled untrusted, no egress or destination checks | All registered, with roles per parameter |
| `sessions` and `subagents` registered read-only, but `patch`/`stop`/`reset`/`delete`/`assign_owner`/`group_*`/`cancel` change state | Allowed even in tainted sessions as "read-only" | Per-action categories; `assign_owner` is config (hard sink) |
| Egress params unmapped or treated as content: `gatewayUrl` (nodes, canvas, mobile_ui, file transfer, automations), `canvas.url`, `sessions_spawn.projectGitUrl`, `ask_user` thumbnails/`resourceUri`, `transcripts.meetingUrl` | Constructed URLs could carry private data out unchecked | `egress_url` |
| Code params unmapped: `process` `literal` (send-keys), `terminal` `data` (via catch-all), `automations` `job.schedule.command[]` | Shell input without exec checks | `code` |
| `secrets.request` `allowedHosts[]` | A tainted session could phish a credential bound to an attacker host | `destination`; `request` is outbound |
| `browser.importprofile` | Copies the owner's logged-in browser profile | Config (hard sink) |
| `mobile_ui.act` | Drives the owner's phone apps | `actsAsOwner`: blocked when tainted |
| `exec.elevated` | Host elevation | `elevationParam`: asked in automatic runs, blocked unattested when tainted |
| `automations` `job.payload.allowUnsafeExternalContent` | Turns off OpenClaw's own protection for scheduled prompts | `unsafeFlags`: config hard sink when true |
| `nodes` captures, notifications, `presence`, history and search tools | Private results unlabeled | `resultPrivate` / `resultSource` |
| `message.react` | Approval emoji can approve | `reaction` spec (§5.9) |
| `memory_get`/`memory_search` corpora (`memory`, `wiki`, `all`, `sessions`) | — | Listed |

Every schema parameter and action is now listed explicitly (UI controls as `none`), so a parameter added in a later OpenClaw version shows up. `packages/openclaw/test/contract.test.ts` checks the registry against `test/fixtures/openclaw-tools-contract.json`, which is merged from the contract runs by `phase0/contract/make-fixture.mjs`. Known-unseen params are allowlisted with their source: `message` params from channels not configured here, Codex-native `exec.cmd` and `apply_patch.patch`.

## Guard decisions in the sweep

contract-4, the verification sweep (the corrected registry, compact surface off, 57 tools, 192 calls):

- **Every call reached the Guard, in both passes** (192/192 clean, 192/192 tainted). No params were changed on the way to the hook, no tool got an inferred spec, 0 Guard errors, and no runs failed.
- **Coverage:** all schema parameters and actions are mapped. The only leftovers are the allowlisted known-unseen `message` channel params and Codex-native `exec.cmd` / `apply_patch.patch`.

| Pass | allow | ask | block | hard sinks |
|---|---|---|---|---|
| Clean owner, one fresh session per call | 182 | 10 | 0 | 19 |
| Tainted+private owner, one session | 84 | 88 | 20 | 20 |

- **Clean asks (10):** all config-class hard sinks: `browser.importprofile`, `nodes` approve/reject, `openclaw` (config delegate), `plugins` disable/uninstall/reload/reloadAndResume, `secrets.delete`, `sessions.assign_owner`. Installs in a clean owner session are allowed (§5.12).
- **Tainted blocks (20):** the same config sinks, installs (`plugins` install/enable, `gateway update.run`, every `skill_workshop` write), and `mobile_ui.act`.
- **Tainted allows** of side-effecting calls are the by-design kinds:
  - file writes (`write`, `edit`, `apply_patch`, `file_write`), with the file inheriting the session's labels;
  - UI and session state (`dashboard`, `theme`, `talk_voice`, `sessions` patch/groups, `portal.open`, goals);
  - inter-session actions whose target inherits the labels (`sessions` stop/reset/delete, `sessions_send`, `subagents.cancel`);
  - owner-facing output with no destination (`tts`, `progress_card`, `dashboard.widget_put`), whose constructed links are defanged.

## Reproduce

```bash
# login node, detached (the Mac may sleep). Don't replace /scratch/$USER/pg/contract while a run reads it:
# the scratch filesystem gives "Stale file handle" (contract-2 stopped that way).
setsid nohup srun --jobid=<id> --overlap -n1 env RUN=/pg/runs/contract-N PAR=6 CONTRACT_SURFACE=full \
  bash /scratch/$USER/pg/contract/run-contract.sh > /scratch/$USER/pg/runs/contract-N.log 2>&1 < /dev/null &
# locally, after copying the run back (without state/, hmac.key, gateway.log, out/):
node phase0/contract/analyze-contract.mjs phase0/results/contract-N packages/openclaw/src/registry/openclaw-tools.json > phase0/results/contract-N/report.md
node phase0/contract/make-fixture.mjs phase0/results/contract-N/schemas.json packages/openclaw/test/fixtures/openclaw-tools-contract.json 2026.10.8 contract-N
```
