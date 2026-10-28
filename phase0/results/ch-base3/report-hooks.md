# Phase 0 runtime report
Run: `/pg/runs/ch-base3` · probe events: 623 · model calls: 42

## Steps
| Step | Exit | Seconds |
|---|---|---|

## Hooks that fired
`__approval_request` ×8, `__approval_resolution` ×7, `__command` ×6, `__register` ×2, `after_tool_call` ×24, `agent_end` ×16, `agent_turn_prepare` ×18, `before_agent_finalize` ×18, `before_agent_reply` ×18, `before_agent_run` ×18, `before_dispatch` ×25, `before_message_write` ×97, `before_model_resolve` ×16, `before_prompt_build` ×18, `before_tool_call` ×16, `before_tool_call:race-high` ×1, `before_tool_call:race-low` ×1, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×18, `llm_output` ×18, `message_received` ×34, `message_sending` ×46, `message_sent` ×14, `model_call_ended` ×42, `model_call_started` ×42, `reply_dispatch` ×25, `reply_payload_sending` ×32, `resolve_exec_env` ×12, `session_start` ×3, `tool_result_persist` ×24

## Tool hook coverage
| Step | Tool | Call id | before_tool_call | Error | Params seen by after_tool_call |
|---|---|---|---|---|---|
| (between steps) | read | call_1_0 | yes (as `read`) | — | {"path":"probe-input.txt"} |
| (between steps) | exec | call_2_0 | yes (as `exec`) | — | {"command":"echo exec-output-1"} |
| (between steps) | web_fetch | call_3_0 | **no** | Tool web_fetch not found | {"url":"http://127.0.0.1:24746/web/page1"} |
| (between steps) | read | call_5_0 | yes (as `read`) | — | {"path":"probe-input.txt"} |
| (between steps) | exec | call_6_0 | yes (as `exec`) | — | {"command":"echo exec-output-1"} |
| (between steps) | web_fetch | call_7_0 | **no** | Tool web_fetch not found | {"url":"http://127.0.0.1:24746/web/page1"} |
| (between steps) | read | call_9_0 | yes (as `read`) | — | {"path":"probe-input.txt"} |
| (between steps) | exec | call_10_0 | yes (as `exec`) | — | {"command":"echo exec-output-1"} |
| (between steps) | web_fetch | call_11_0 | **no** | Tool web_fetch not found | {"url":"http://127.0.0.1:24746/web/page1"} |
| (between steps) | read | call_13_0 | yes (as `read`) | — | {"path":"probe-input.txt"} |
| (between steps) | exec | call_14_0 | yes (as `exec`) | — | {"command":"echo exec-output-1"} |
| (between steps) | web_fetch | call_15_0 | **no** | Tool web_fetch not found | {"url":"http://127.0.0.1:24746/web/page1"} |
| (between steps) | exec | call_17_0 | yes (as `exec`) | — | {"command":"echo pg-approve-low ok"} |
| (between steps) | exec | call_19_0 | yes (as `exec`) | Denied by user. The tool call did not run. | {"command":"echo pg-approve-low ok"} |
| (between steps) | exec | call_21_0 | yes (as `exec`) | Denied by user. The tool call did not run. | {"command":"echo pg-approve-low ok"} |
| (between steps) | message | call_24_0 | **no** | Tool message not found | {"action":"send","channel":"qa-channel","target":"dm:alice","message":"/approve plugin:6ff72387-bc44-4c2b-b971-49b15d458 |
| (between steps) | exec | call_23_0 | yes (as `exec`) | Plugin approval required (gateway unavailable) | {"command":"echo pg-approve-low ok"} |
| (between steps) | message | call_28_0 | **no** | Tool message not found | {"action":"send","channel":"qa-channel","target":"dm:alice","message":"/guard status"} |
| (between steps) | exec | call_31_0 | yes (as `exec`) | — | {"command":"T=$(node -e 'process.stdout.write(JSON.parse(require(\"fs\").readFileSync(process.argv[1],\"utf8\")).gateway |
| (between steps) | exec | call_30_0 | yes (as `exec`) | Plugin approval required (gateway unavailable) | {"command":"echo pg-approve-low ok"} |
| (between steps) | exec | call_34_0 | yes (as `exec`) | — | {"command":"echo from-high-priority"} |
| (between steps) | exec | call_36_0 | yes (as `exec`) | — | {"command":"echo pg-approve-high pg-approve-low both"} |
| (between steps) | sessions_spawn | call_38_0 | **no** | Tool sessions_spawn not found | {"task":"Child run. [scenario:child-exec]"} |
| (between steps) | sessions_send | call_41_0 | **no** | Tool sessions_send not found | {"sessionKey":"agent:main:qa-channel:direct:dm:bob","message":"Relayed. [scenario:child-exec]"} |

**Executed without before_tool_call (no error):** 0

## Q1: `tool_result_persist` before the next model call
| Step | Tool | Call id | Persisted at | Next model call with this result | Gap (ms) | Model saw persisted copy |
|---|---|---|---|---|---|---|
| (between steps) | read | call_1_0 | 1793215498097 | #2 | 169 | no |
| (between steps) | exec | call_2_0 | 1793215498973 | #3 | 136 | no |
| (between steps) | web_fetch | call_3_0 | 1793215499252 | #4 | 120 | no |
| (between steps) | read | call_5_0 | 1793215505965 | #6 | 104 | no |
| (between steps) | exec | call_6_0 | 1793215506375 | #7 | 165 | no |
| (between steps) | web_fetch | call_7_0 | 1793215506669 | #8 | 145 | no |
| (between steps) | read | call_9_0 | 1793215513462 | #10 | 133 | no |
| (between steps) | exec | call_10_0 | 1793215514018 | #11 | 136 | no |
| (between steps) | web_fetch | call_11_0 | 1793215514274 | #12 | 150 | no |
| (between steps) | read | call_13_0 | 1793215520065 | #14 | 107 | no |
| (between steps) | exec | call_14_0 | 1793215520521 | #15 | 118 | no |
| (between steps) | web_fetch | call_15_0 | 1793215520744 | #16 | 104 | no |
| (between steps) | exec | call_17_0 | 1793215610918 | #18 | 186 | no |
| (between steps) | exec | call_19_0 | 1793215635315 | #20 | 183 | no |
| (between steps) | exec | call_21_0 | 1793215658126 | #22 | 141 | no |
| (between steps) | message | call_24_0 | 1793215672740 | #25 | 126 | no |
| (between steps) | exec | call_23_0 | 1793215684396 | #26 | 133 | no |
| (between steps) | message | call_28_0 | 1793215694335 | #29 | 187 | no |
| (between steps) | exec | call_31_0 | 1793215716601 | #32 | 149 | no |
| (between steps) | exec | call_30_0 | 1793215727923 | #33 | 235 | no |
| (between steps) | exec | call_34_0 | 1793215735132 | #35 | 161 | no |
| (between steps) | exec | call_36_0 | 1793215743978 | #37 | 377 | no |
| (between steps) | sessions_spawn | call_38_0 | 1793215753117 | #39 | 130 | no |
| (between steps) | sessions_send | call_41_0 | 1793215883884 | #42 | 143 | no |

**Verdict:** PASS: tool_result_persist always ran before the next model call. Persisted copy shown to the model in-run: 0/24.

## Q2: identity and trigger
| sessionKey | Steps | trigger | before_agent_run senderIsOwner | inputProvenance | jobId | before_tool_call requester |
|---|---|---|---|---|---|---|
| agent:main:qa-channel:direct:dm:alice | (between steps) | user | true | — | — | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| agent:main:qa-channel:direct:dm:bob | (between steps) | user | false | — | — | {"channel":"qa-channel","accountId":"default","senderId":"bob","senderIsOwner":false} |
| agent:main:qa-channel:group:group:lab | (between steps) | user | true; false | — | — | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}; {"channel":"qa-channel","accountId":"default","senderId":"bob","senderIsOwner":false} |
| agent:main:pg-self-approve | (between steps) | user | true | — | — | — |
| agent:main:internal-session-effects:skill-workshop-review_de23320f-e0e6-46ef-9b9f-d4-8be8671b3ec0ebde | (between steps) | user | true | — | — | — |
| agent:main:pg-self-guard | (between steps) | user | true | — | — | — |
| agent:main:pg-self-exec | (between steps) | user | true | — | — | {"senderIsOwner":true} |
| agent:main:internal-session-effects:skill-workshop-review_10749df9-1aef-48ba-b57d-f2-aadb30f25184eb48 | (between steps) | user | true | — | — | — |

## Q6: whose `params` win
- High-priority handler ran: true; saw `echo original-params pg-approve-high`
- Low-priority handler ran: true; saw `echo original-params pg-approve-high`
- exec commands reported by after_tool_call: `echo exec-output-1`, `echo exec-output-1`, `echo exec-output-1`, `echo exec-output-1`, `echo pg-approve-low ok`, `echo pg-approve-low ok`, `echo pg-approve-low ok`, `echo pg-approve-low ok`, `T=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).gateway.auth.token)' /pg/runs/ch-base3/state/openclaw.json) && /pg/oc/node_modules/.bin/openclaw gateway call plugin.approval.resolve --url ws://127.0.0.1:24745 --token "$T" --params '{"id":"plugin:5e97d411-b05b-4b51-ad45-ea8c74148add","decision":"allow-once"}' --json`, `echo pg-approve-low ok`, `echo from-high-priority`, `echo pg-approve-high pg-approve-low both`
- **Winner:** high: the Guard's plan needs rework

## Model requests
- First request: stream=true, tools offered (12): apply_patch, edit, exec, ls, openclaw, process, read, sessions_yield, tool_call, tool_describe, tool_search, write
- Scenarios seen: persist-order, approve-low, message-approve, message-guard, exec-approve, approve-race, approve-both, spawn-exec, send-exec
- Unhandled or failed mock routes: none

### Meta-tool schemas
- `sessions_yield`: {"type":"object","properties":{"waitFor":{"type":"string","const":"message","description":"Explicitly pause an unfinished subagent until an incoming continuation message; its requester is notified once. Does not schedule a message or submit the final result."},"message":{"type":"string","description":"Private context for the resumed turn; not sent to the user."},"acknowledgment":{"type":"string","description":"Optional waiting reply for an otherwise-silent interactive parent turn; with waitFor, the pause notice for the requester."}}}
- `tool_call`: {"type":"object","required":["id"],"properties":{"id":{"type":"string","description":"Tool search result id or tool name."},"args":{"type":"object","patternProperties":{"^.*$":{}},"description":"Tool input."}}}
- `tool_describe`: {"type":"object","required":["id"],"properties":{"id":{"type":"string","description":"Tool search result id or tool name."}}}
- `tool_search`: {"type":"object","properties":{"query":{"anyOf":[{"type":"string"},{"type":"null"}],"description":"Single search query, in English. A non-empty query joins a non-empty batch first. Null or blank is ignored beside a non-empty batch."},"limit":{"anyOf":[{"type":"integer","minimum":1},{"type":"null"}],"description":"Maximum number of single-search results. Omitted or null uses the default. With only batch queries, omit this or set it to null; set limits on each batch entry."},"queries":{"anyOf":[{"type":"array","items":{"type":"object","required":["query"],"properties":{"query":{"type":"string","
