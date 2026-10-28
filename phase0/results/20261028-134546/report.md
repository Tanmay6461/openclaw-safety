# Phase 0 runtime report
Run: `/pg/runs/20261028-134546` · probe events: 331 · model calls: 29

## Steps
| Step | Exit | Seconds |
|---|---|---|
| plugin-inspect | 0 | 14.9 |
| persist-order | 0 | 25.7 |
| parallel-tools | 0 | 8.9 |
| params-race | 0 | 10.3 |
| spawn | 0 | 8.5 |
| meta-fetch | 0 | 8.5 |
| meta-spawn | 0 | 8.8 |
| meta-exec | 0 | 10.7 |
| cron-add | 0 | 3.0 |
| cron-run | 0 | 15.9 |
| cron-runs | 0 | 3.9 |
| heartbeat | 0 | 6.5 |
| heartbeat-last | 0 | 6.0 |
| local | 0 | 55.4 |

## Hooks that fired
`__register` ×6, `after_tool_call` ×21, `agent_end` ×12, `agent_turn_prepare` ×12, `before_agent_finalize` ×12, `before_agent_reply` ×12, `before_agent_run` ×12, `before_message_write` ×63, `before_model_resolve` ×12, `before_prompt_build` ×12, `before_tool_call` ×17, `before_tool_call:race-high` ×2, `before_tool_call:race-low` ×2, `cron_changed` ×5, `cron_reconciled` ×1, `gateway_start` ×1, `gateway_stop` ×1, `heartbeat_prompt_contribution` ×1, `llm_input` ×12, `llm_output` ×12, `model_call_ended` ×29, `model_call_started` ×29, `resolve_exec_env` ×6, `session_end` ×8, `session_start` ×8, `subagent_delivery_target` ×1, `subagent_ended` ×1, `subagent_progress` ×2, `subagent_spawned` ×1, `tool_result_persist` ×18

## Tool hook coverage
| Step | Tool | Call id | before_tool_call | Error | Params seen by after_tool_call |
|---|---|---|---|---|---|
| persist-order | read | call_1_0 | yes (as `read`) | — | {"path":"probe-input.txt"} |
| persist-order | exec | call_2_0 | yes (as `exec`) | — | {"command":"echo exec-output-1"} |
| persist-order | web_fetch | call_3_0 | **no** | Tool web_fetch not found | {"url":"http://127.0.0.1:28001/web/page1"} |
| parallel-tools | read | call_5_0 | yes (as `read`) | — | {"path":"probe-input.txt"} |
| parallel-tools | exec | call_5_1 | yes (as `exec`) | — | {"command":"echo exec-parallel"} |
| params-race | exec | call_7_0 | yes (as `exec`) | — | {"command":"echo from-low-priority"} |
| spawn | sessions_spawn | call_9_0 | **no** | Tool sessions_spawn not found | {"task":"Reply briefly. [scenario:default]"} |
| meta-fetch | tool_search | call_11_0 | yes (as `tool_search`) | — | {"query":"fetch a web page"} |
| meta-fetch | tool_describe | call_12_0 | yes (as `tool_describe`) | — | {"id":"web_fetch"} |
| meta-fetch | web_fetch | tool_call:call_13_0:web_fetch:1 | yes (as `web_fetch`) | — | {"url":"http://127.0.0.1:28001/web/page1"} |
| meta-fetch | tool_call | call_13_0 | yes (as `tool_call`) | — | {"id":"web_fetch","args":{"url":"http://127.0.0.1:28001/web/page1"}} |
| meta-spawn | sessions_spawn | tool_call:call_15_0:sessions_spawn:1 | yes (as `sessions_spawn`) | — | {"task":"Reply briefly. [scenario:default]"} |
| meta-spawn | tool_call | call_15_0 | yes (as `tool_call`) | — | {"id":"sessions_spawn","args":{"task":"Reply briefly. [scenario:default]"}} |
| meta-exec | exec | tool_call:call_19_0:exec:1 | yes (as `exec`) | — | {"command":"echo from-low-priority"} |
| meta-exec | tool_call | call_19_0 | yes (as `tool_call`) | — | {"id":"exec","args":{"command":"echo via-meta original-params"}} |
| cron-run | read | call_21_0 | yes (as `read`) | — | {"path":"probe-input.txt"} |
| cron-run | exec | call_22_0 | yes (as `exec`) | — | {"command":"echo exec-output-1"} |
| cron-run | web_fetch | call_23_0 | **no** | Tool web_fetch not found | {"url":"http://127.0.0.1:28001/web/page1"} |
| local | read | call_26_0 | yes (as `read`) | — | {"path":"probe-input.txt"} |
| local | exec | call_27_0 | yes (as `exec`) | — | {"command":"echo exec-output-1"} |
| local | web_fetch | call_28_0 | **no** | Tool web_fetch not found | {"url":"http://127.0.0.1:28001/web/page1"} |

**Executed without before_tool_call (no error):** 0

## Q1: `tool_result_persist` before the next model call
| Step | Tool | Call id | Persisted at | Next model call with this result | Gap (ms) | Model saw persisted copy |
|---|---|---|---|---|---|---|
| persist-order | read | call_1_0 | 1793209623680 | #2 | 276 | no |
| persist-order | exec | call_2_0 | 1793209624823 | #3 | 240 | no |
| persist-order | web_fetch | call_3_0 | 1793209625199 | #4 | 197 | no |
| parallel-tools | read | call_5_0 | 1793209634138 | #6 | 301 | no |
| parallel-tools | exec | call_5_1 | 1793209634234 | #6 | 205 | no |
| params-race | exec | call_7_0 | 1793209644377 | #8 | 332 | no |
| spawn | sessions_spawn | call_9_0 | 1793209653044 | #10 | 186 | no |
| meta-fetch | tool_search | call_11_0 | 1793209660365 | #12 | 326 | no |
| meta-fetch | tool_describe | call_12_0 | 1793209660874 | #13 | 234 | no |
| meta-fetch | tool_call | call_13_0 | 1793209661615 | #14 | 191 | no |
| meta-spawn | tool_call | call_15_0 | 1793209669951 | #16 | 192 | no |
| meta-exec | tool_call | call_19_0 | 1793209681084 | #20 | 230 | no |
| cron-run | read | call_21_0 | 1793209697126 | #22 | 200 | no |
| cron-run | exec | call_22_0 | 1793209697715 | #23 | 213 | no |
| cron-run | web_fetch | call_23_0 | 1793209698049 | #24 | 187 | no |
| local | read | call_26_0 | 1793209808341 | #27 | 198 | no |
| local | exec | call_27_0 | 1793209809833 | #28 | 205 | no |
| local | web_fetch | call_28_0 | 1793209810211 | #29 | 236 | no |

**Verdict:** PASS: tool_result_persist always ran before the next model call. Persisted copy shown to the model in-run: 0/18.

## Q2: identity and trigger
| sessionKey | Steps | trigger | before_agent_run senderIsOwner | inputProvenance | jobId | before_tool_call requester |
|---|---|---|---|---|---|---|
| agent:main:pg-persist-order | persist-order | user | true | — | — | {"senderIsOwner":true} |
| agent:main:pg-parallel-tools | parallel-tools | user | true | — | — | {"senderIsOwner":true} |
| agent:main:pg-params-race | params-race | user | true | — | — | {"senderIsOwner":true} |
| agent:main:pg-spawn | spawn | user | true | — | — | — |
| agent:main:pg-meta-fetch | meta-fetch | user | true | — | — | {"senderIsOwner":true} |
| agent:main:pg-meta-spawn | meta-spawn; meta-exec | user | true; false | {"kind":"inter_session","sourceSessionKey":"agent:main:subagent:0e2aba2a-f776-4f9a-8147-82797a2aae60","sourceChannel":"internal","sourceTool":"subagent_announce"} | — | {"senderIsOwner":true} |
| agent:main:subagent:0e2aba2a-f776-4f9a-8147-82797a2aae60 | meta-spawn | user | false | — | — | — |
| agent:main:pg-meta-exec | meta-exec | user | true | — | — | {"senderIsOwner":true} |
| agent:main:cron:cb3b6d20-4542-44d1-b636-fa5a9a19802a:run:03157f62-cbc2-457a-8f27-74e1be8ba933 | cron-run | cron | undefined | — | cb3b6d20-4542-44d1-b636-fa5a9a19802a | null |
| agent:main:main | (between steps) | heartbeat | false | {"kind":"internal_system","sourceTool":"heartbeat"} | — | — |
| agent:main:pg-local | local | user | true | — | — | {"senderIsOwner":true} |

## Q6: whose `params` win
- High-priority handler ran: true; saw `echo original-params`
- Low-priority handler ran: true; saw `echo original-params`
- exec commands reported by after_tool_call: `echo exec-output-1`, `echo exec-parallel`, `echo from-low-priority`, `echo from-low-priority`, `echo exec-output-1`, `echo exec-output-1`
- **Winner:** low (runs last): PASS for the Guard's plan

## Model requests
- First request: stream=true, tools offered (12): apply_patch, edit, exec, ls, openclaw, process, read, sessions_yield, tool_call, tool_describe, tool_search, write
- Scenarios seen: persist-order, parallel-tools, params-race, spawn, meta-fetch, meta-spawn, default, meta-exec
- Unhandled or failed mock routes: none

### Meta-tool schemas
- `sessions_yield`: {"type":"object","properties":{"waitFor":{"type":"string","const":"message","description":"Explicitly pause an unfinished subagent until an incoming continuation message; its requester is notified once. Does not schedule a message or submit the final result."},"message":{"type":"string","description":"Private context for the resumed turn; not sent to the user."},"acknowledgment":{"type":"string","description":"Optional waiting reply for an otherwise-silent interactive parent turn; with waitFor, the pause notice for the requester."}}}
- `tool_call`: {"type":"object","required":["id"],"properties":{"id":{"type":"string","description":"Tool search result id or tool name."},"args":{"type":"object","patternProperties":{"^.*$":{}},"description":"Tool input."}}}
- `tool_describe`: {"type":"object","required":["id"],"properties":{"id":{"type":"string","description":"Tool search result id or tool name."}}}
- `tool_search`: {"type":"object","properties":{"query":{"anyOf":[{"type":"string"},{"type":"null"}],"description":"Single search query, in English. A non-empty query joins a non-empty batch first. Null or blank is ignored beside a non-empty batch."},"limit":{"anyOf":[{"type":"integer","minimum":1},{"type":"null"}],"description":"Maximum number of single-search results. Omitted or null uses the default. With only batch queries, omit this or set it to null; set limits on each batch entry."},"queries":{"anyOf":[{"type":"array","items":{"type":"object","required":["query"],"properties":{"query":{"type":"string","
