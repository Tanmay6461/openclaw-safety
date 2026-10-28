# Phase 0 runtime report
Run: `/pg/runs/20261028-133239` · probe events: 171 · model calls: 15

## Steps
| Step | Exit | Seconds |
|---|---|---|
| plugin-inspect | 0 | 16.8 |
| persist-order | 0 | 33.9 |
| parallel-tools | 0 | 17.7 |
| params-race | 0 | 8.5 |
| spawn | 0 | 8.1 |
| cron-add | 0 | 3.5 |
| heartbeat | 0 | 6.7 |
| heartbeat-last | 0 | 7.4 |
| local | 0 | 62.4 |

## Hooks that fired
`__register` ×5, `after_tool_call` ×10, `agent_end` ×6, `agent_turn_prepare` ×6, `before_agent_finalize` ×6, `before_agent_reply` ×6, `before_agent_run` ×6, `before_message_write` ×32, `before_model_resolve` ×6, `before_prompt_build` ×6, `before_tool_call` ×7, `before_tool_call:race-high` ×1, `before_tool_call:race-low` ×1, `cron_changed` ×3, `cron_reconciled` ×1, `gateway_start` ×1, `gateway_stop` ×1, `heartbeat_prompt_contribution` ×1, `llm_input` ×6, `llm_output` ×6, `model_call_ended` ×15, `model_call_started` ×15, `resolve_exec_env` ×4, `session_end` ×5, `session_start` ×5, `tool_result_persist` ×10

## Q1: `tool_result_persist` before the next model call
| Step | Tool | Marker | Persisted at | First model call carrying it | Gap (ms) |
|---|---|---|---|---|---|
| persist-order | read | [[persist:call_1_0]] | 1793208876527 | **not seen** | — |
| persist-order | exec | [[persist:call_2_0]] | 1793208878177 | **not seen** | — |
| persist-order | web_fetch | [[persist:call_3_0]] | 1793208878756 | **not seen** | — |
| parallel-tools | read | [[persist:call_5_0]] | 1793208897296 | **not seen** | — |
| parallel-tools | exec | [[persist:call_5_1]] | 1793208897402 | **not seen** | — |
| params-race | exec | [[persist:call_7_0]] | 1793208905997 | **not seen** | — |
| spawn | sessions_spawn | [[persist:call_9_0]] | 1793208914199 | **not seen** | — |
| local | read | [[persist:call_12_0]] | 1793209030322 | **not seen** | — |
| local | exec | [[persist:call_13_0]] | 1793209032012 | **not seen** | — |
| local | web_fetch | [[persist:call_14_0]] | 1793209032479 | **not seen** | — |

Tool results that reached a model call **without** a persist marker: 16
- model call #2: tool_call_id call10, 19 chars
- model call #3: tool_call_id call10, 19 chars
- model call #3: tool_call_id call20, 13 chars
- model call #4: tool_call_id call10, 19 chars
- model call #4: tool_call_id call20, 13 chars
- model call #4: tool_call_id call30, 24 chars
- model call #6: tool_call_id call50, 19 chars
- model call #6: tool_call_id call51, 13 chars
- model call #8: tool_call_id call70, 17 chars
- model call #10: tool_call_id call90, 29 chars
- model call #13: tool_call_id call120, 19 chars
- model call #14: tool_call_id call120, 19 chars
- model call #14: tool_call_id call130, 13 chars
- model call #15: tool_call_id call120, 19 chars
- model call #15: tool_call_id call130, 13 chars
- model call #15: tool_call_id call140, 24 chars

**Verdict:** FAIL or partial: see rows above

## Q2: `ctx.requester` and run trigger
| sessionKey | Steps | trigger (model_call_started) | jobId | inputProvenance | requester (before_tool_call) | channelId |
|---|---|---|---|---|---|---|
| agent:main:pg-persist-order | persist-order | — | — | — | {"senderIsOwner":true} | — |
| agent:main:pg-parallel-tools | parallel-tools | — | — | — | {"senderIsOwner":true} | — |
| agent:main:pg-params-race | params-race | — | — | — | {"senderIsOwner":true} | — |
| agent:main:pg-spawn | spawn | — | — | — | — | — |
| agent:main:main | (between steps) | — | — | — | — | — |
| agent:main:pg-local | local | — | — | — | {"senderIsOwner":true} | — |

## Q6: whose `params` win
- High-priority handler ran: true; saw `echo original-params`
- Low-priority handler ran: true; saw `echo original-params`
- exec commands reported by after_tool_call: `echo exec-output-1`, `echo exec-parallel`, `echo from-low-priority`, `echo exec-output-1`
- **Winner:** low (runs last): PASS for the Guard's plan

## Model requests
- First request: stream=true, tools offered (12): apply_patch, edit, exec, ls, openclaw, process, read, sessions_yield, tool_call, tool_describe, tool_search, write
- Scenarios seen: persist-order, parallel-tools, params-race, spawn, default
- Unhandled or failed mock routes: none
