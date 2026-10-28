# Phase 0 runtime report
Run: `/pg/runs/20261028-133956` · probe events: 262 · model calls: 25

## Steps
| Step | Exit | Seconds |
|---|---|---|
| plugin-inspect | 0 | 16.1 |
| persist-order | 0 | 28.7 |
| parallel-tools | 0 | 9.2 |
| params-race | 0 | 8.9 |
| spawn | 0 | 7.5 |
| meta-fetch | 0 | 8.9 |
| meta-spawn | 0 | 9.3 |
| cron-add | 0 | 3.2 |
| cron-run | 0 | 16.2 |
| cron-runs | 0 | 4.0 |
| heartbeat | 0 | 7.7 |
| heartbeat-last | 0 | 6.6 |
| local | 0 | 57.2 |

## Hooks that fired
`__register` ×5, `after_tool_call` ×17, `agent_end` ×9, `agent_turn_prepare` ×9, `before_agent_finalize` ×9, `before_agent_reply` ×9, `before_agent_run` ×9, `before_message_write` ×52, `before_model_resolve` ×9, `before_prompt_build` ×9, `before_tool_call` ×10, `before_tool_call:race-high` ×1, `before_tool_call:race-low` ×1, `cron_changed` ×5, `cron_reconciled` ×1, `gateway_start` ×1, `gateway_stop` ×1, `heartbeat_prompt_contribution` ×1, `llm_input` ×9, `llm_output` ×9, `model_call_ended` ×25, `model_call_started` ×25, `resolve_exec_env` ×5, `session_end` ×7, `session_start` ×7, `tool_result_persist` ×17

## Tool hook coverage
| Step | Tool | Call id | before_tool_call | Error | Params seen by after_tool_call |
|---|---|---|---|---|---|
| persist-order | read | call_1_0 | yes (as `read`) | — | {"path":"probe-input.txt"} |
| persist-order | exec | call_2_0 | yes (as `exec`) | — | {"command":"echo exec-output-1"} |
| persist-order | web_fetch | call_3_0 | **no** | Tool web_fetch not found | {"url":"http://127.0.0.1:28943/web/page1"} |
| parallel-tools | read | call_5_0 | yes (as `read`) | — | {"path":"probe-input.txt"} |
| parallel-tools | exec | call_5_1 | yes (as `exec`) | — | {"command":"echo exec-parallel"} |
| params-race | exec | call_7_0 | yes (as `exec`) | — | {"command":"echo from-low-priority"} |
| spawn | sessions_spawn | call_9_0 | **no** | Tool sessions_spawn not found | {"task":"Reply briefly. [scenario:default]"} |
| meta-fetch | tool_search | call_11_0 | yes (as `tool_search`) | — | {"query":"fetch a web page"} |
| meta-fetch | tool_describe | call_12_0 | **no** | Validation failed for tool "tool_describe": | {"name":"web_fetch"} |
| meta-fetch | tool_call | call_13_0 | **no** | Validation failed for tool "tool_call": | {"name":"web_fetch","arguments":{"url":"http://127.0.0.1:28943/web/page1"}} |
| meta-spawn | tool_call | call_15_0 | **no** | Validation failed for tool "tool_call": | {"name":"sessions_spawn","arguments":{"task":"Reply briefly. [scenario:default]"}} |
| cron-run | read | call_17_0 | yes (as `read`) | — | {"path":"probe-input.txt"} |
| cron-run | exec | call_18_0 | yes (as `exec`) | — | {"command":"echo exec-output-1"} |
| cron-run | web_fetch | call_19_0 | **no** | Tool web_fetch not found | {"url":"http://127.0.0.1:28943/web/page1"} |
| local | read | call_22_0 | yes (as `read`) | — | {"path":"probe-input.txt"} |
| local | exec | call_23_0 | yes (as `exec`) | — | {"command":"echo exec-output-1"} |
| local | web_fetch | call_24_0 | **no** | Tool web_fetch not found | {"url":"http://127.0.0.1:28943/web/page1"} |

**Executed without before_tool_call (no error):** 0

## Q1: `tool_result_persist` before the next model call
| Step | Tool | Call id | Persisted at | Next model call with this result | Gap (ms) | Model saw persisted copy |
|---|---|---|---|---|---|---|
| persist-order | read | call_1_0 | 1793209288009 | #2 | 261 | no |
| persist-order | exec | call_2_0 | 1793209289185 | #3 | 333 | no |
| persist-order | web_fetch | call_3_0 | 1793209289679 | #4 | 262 | no |
| parallel-tools | read | call_5_0 | 1793209299179 | #6 | 287 | no |
| parallel-tools | exec | call_5_1 | 1793209299273 | #6 | 193 | no |
| params-race | exec | call_7_0 | 1793209308183 | #8 | 286 | no |
| spawn | sessions_spawn | call_9_0 | 1793209315691 | #10 | 197 | no |
| meta-fetch | tool_search | call_11_0 | 1793209323778 | #12 | 226 | no |
| meta-fetch | tool_describe | call_12_0 | 1793209324134 | #13 | 180 | no |
| meta-fetch | tool_call | call_13_0 | 1793209324452 | #14 | 179 | no |
| meta-spawn | tool_call | call_15_0 | 1793209334021 | #16 | 202 | no |
| cron-run | read | call_17_0 | 1793209351228 | #18 | 394 | no |
| cron-run | exec | call_18_0 | 1793209352026 | #19 | 202 | no |
| cron-run | web_fetch | call_19_0 | 1793209352340 | #20 | 204 | no |
| local | read | call_22_0 | 1793209465373 | #23 | 227 | no |
| local | exec | call_23_0 | 1793209466894 | #24 | 179 | no |
| local | web_fetch | call_24_0 | 1793209467194 | #25 | 161 | no |

**Verdict:** PASS: tool_result_persist always ran before the next model call. Persisted copy shown to the model in-run: 0/17.

## Q2: identity and trigger
| sessionKey | Steps | trigger | before_agent_run senderIsOwner | inputProvenance | jobId | before_tool_call requester |
|---|---|---|---|---|---|---|
| agent:main:pg-persist-order | persist-order | user | true | — | — | {"senderIsOwner":true} |
| agent:main:pg-parallel-tools | parallel-tools | user | true | — | — | {"senderIsOwner":true} |
| agent:main:pg-params-race | params-race | user | true | — | — | {"senderIsOwner":true} |
| agent:main:pg-spawn | spawn | user | true | — | — | — |
| agent:main:pg-meta-fetch | meta-fetch | user | true | — | — | {"senderIsOwner":true} |
| agent:main:pg-meta-spawn | meta-spawn | user | true | — | — | — |
| agent:main:cron:ab74035b-4593-48ec-b22b-7b04bd34fa27:run:084048ae-de59-44b0-92b2-6be4b3df3b4e | cron-run | cron | undefined | — | ab74035b-4593-48ec-b22b-7b04bd34fa27 | null |
| agent:main:main | (between steps) | heartbeat | false | {"kind":"internal_system","sourceTool":"heartbeat"} | — | — |
| agent:main:pg-local | local | user | true | — | — | {"senderIsOwner":true} |

## Q6: whose `params` win
- High-priority handler ran: true; saw `echo original-params`
- Low-priority handler ran: true; saw `echo original-params`
- exec commands reported by after_tool_call: `echo exec-output-1`, `echo exec-parallel`, `echo from-low-priority`, `echo exec-output-1`, `echo exec-output-1`
- **Winner:** low (runs last): PASS for the Guard's plan

## Model requests
- First request: stream=true, tools offered (12): apply_patch, edit, exec, ls, openclaw, process, read, sessions_yield, tool_call, tool_describe, tool_search, write
- Scenarios seen: persist-order, parallel-tools, params-race, spawn, meta-fetch, meta-spawn, default
- Unhandled or failed mock routes: none

### Meta-tool schemas
- `sessions_yield`: {"type":"object","properties":{"waitFor":{"type":"string","const":"message","description":"Explicitly pause an unfinished subagent until an incoming continuation message; its requester is notified once. Does not schedule a message or submit the final result."},"message":{"type":"string","description":"Private context for the resumed turn; not sent to the user."},"acknowledgment":{"type":"string","description":"Optional waiting reply for an otherwise-silent interactive parent turn; with waitFor, the pause notice for the requester."}}}
- `tool_call`: {"type":"object","required":["id"],"properties":{"id":{"type":"string","description":"Tool search result id or tool name."},"args":{"type":"object","patternProperties":{"^.*$":{}},"description":"Tool input."}}}
- `tool_describe`: {"type":"object","required":["id"],"properties":{"id":{"type":"string","description":"Tool search result id or tool name."}}}
- `tool_search`: {"type":"object","properties":{"query":{"anyOf":[{"type":"string"},{"type":"null"}],"description":"Single search query, in English. A non-empty query joins a non-empty batch first. Null or blank is ignored beside a non-empty batch."},"limit":{"anyOf":[{"type":"integer","minimum":1},{"type":"null"}],"description":"Maximum number of single-search results. Omitted or null uses the default. With only batch queries, omit this or set it to null; set limits on each batch entry."},"queries":{"anyOf":[{"type":"array","items":{"type":"object","required":["query"],"properties":{"query":{"type":"string","
