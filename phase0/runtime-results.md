# Phase 0 runtime results (OpenClaw 2026.10.8, Explorer cluster)

- **Where:** Slurm job 11433350 on node `c0219`, inside an isolated Apptainer `node:24-bookworm` container. Node is v24.22.1. Only `/scratch/pawar.ta/pg` is visible to the container.
- **Setup:** mock LLM (`phase0/mock-llm`); probe plugin (`phase0/probe-plugin`); harness scripts (`phase0/cluster`).
- **Runs:** three, with reports and raw logs in `phase0/results/<run>/`.
  - `20261028-133239`
  - `20261028-133956`
  - `20261028-134546`: the final one, covering every scenario.

## Answers

| Plan §13 question | Answer | Evidence |
|---|---|---|
| **1. Does `tool_result_persist` run before the next model call?** | **Yes**, for all 18 tool results across user, parallel, cron, meta-tool, and `--local` runs: 300–400 ms before the next model request. Two caveats follow | Q1 table, run 134546 |
| ↳ caveat: does a rewrite in `tool_result_persist` reach the model? | **No** (0/18). A rewrite changes only the stored transcript; the model sees the original in-memory result for the rest of the run. Harmless for the Guard, which only reads there | marker check |
| ↳ caveat: does it fire for calls made through `tool_call`? | **Only for the outer `tool_call`.** The inner tool gets `before_tool_call` and `after_tool_call` but no `tool_result_persist`; its output is inside the outer result | run 134546 |
| **2. `ctx.requester` and run trigger** | Per run type, below. `trigger` is **not** on `model_call_started` (the static research was wrong). It is on `before_agent_run`, `agent_turn_prepare`, and the other conversation hooks, which need `allowConversationAccess` | Q2 table |
| ↳ CLI turn through the Gateway | `trigger: user`; `before_agent_run.senderIsOwner: true`; `requester: {senderIsOwner: true}` | |
| ↳ `--local` embedded turn | same as above | |
| ↳ cron (`cron run --wait`) | `trigger: cron`, `jobId` set; **no `requester`** on tool calls | |
| ↳ heartbeat (`system event --mode now`) | `trigger: heartbeat`; `senderIsOwner: false`; `inputProvenance: {kind: internal_system, sourceTool: heartbeat}` | |
| ↳ sub-agent child (`sessions_spawn`) | `trigger: user` (!) with `senderIsOwner: false` | |
| ↳ parent follow-up after the child announces | `trigger: user` (!), `senderIsOwner: false`, `inputProvenance: {kind: inter_session, sourceTool: subagent_announce}` | |
| **6. Do the lowest-priority handler's `params` win?** | **Yes.** Both handlers saw the original params, and the last handler's rewrite ran (`echo from-low-priority`). This also holds for an `exec` reached through `tool_call` | Q6 |
| Do hidden tools (behind the compact surface) bypass the hook? | **No.** With the default compact surface the model sees 12 tools (`apply_patch`, `edit`, `exec`, `ls`, `openclaw`, `process`, `read`, `sessions_yield`, `tool_call`, `tool_describe`, `tool_search`, `write`). A hidden tool called by name fails with "Tool … not found" and never executes. Called through `tool_call {id, args}`, it runs `before_tool_call` twice: once for the wrapper, once for the inner tool, with id `tool_call:<outer>:<tool>:<n>` and the inner params. Rewrites on the inner call apply | tool hook coverage |
| Plugin load without consent | A bare `plugins.load.paths` entry plus `entries.<id>.enabled` loads with no prompt (`status: loaded`, trust `record-missing`) | `out/plugin-inspect.txt` |
| Proxy | Explorer's `http(s)_proxy` leaks into Apptainer despite `--cleanenv`, and OpenClaw's model fetch uses it. Loopback needs `NO_PROXY` | run 114646 failure |

## What changes in the design

1. **Trigger and owner signals.** "Owner-triggered" requires `before_tool_call.ctx.requester.senderIsOwner === true`, or, for the run as a whole, `before_agent_run.event.senderIsOwner === true`. `trigger: user` alone proves nothing: sub-agent runs and inter-session follow-ups also report it. `inputProvenance.kind === "inter_session"` marks inherited runs.
2. **Compact tool surface:**
   - The outer `tool_call` is read-only, because the inner tool gets its own `before_tool_call`.
   - Asks and labels happen on the inner call. The outer call is also blocked whenever the inner call would be blocked, as a backstop.
   - Content labeling for inner calls must come from the outer `tool_result_persist`, mapped by the `tool_call:<outer>:` prefix (`innerCallIdsFor`). Otherwise inner calls stay pending forever and the secret scan stays in worst-case mode.
3. **Trigger observation** needs `allowConversationAccess`, because `model_call_started` doesn't carry the trigger. Without it, the absence of `ctx.requester` is the only autonomous-run signal. Cron already shows that, but heartbeat and sub-agent runs need the conversation hooks to be told apart.

## Still open

- **Owner and non-owner chat turns, `/guard` with `requiredScopes`, the self-chat echo and reactions (§13 still-open 3), and real approvals.** All need a channel. `qa-channel` exists only in a source checkout, so the next step is a source checkout at `v2026.10.8` on the cluster, or a burner Telegram bot.
- Codex-native names (still-open 4); `message_sending` for plugin-handled sends (5); exec double prompts (8); benchmark cost (9).
