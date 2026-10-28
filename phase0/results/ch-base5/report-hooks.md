# Phase 0 runtime report
Run: `/pg/runs/ch-base5` · probe events: 118 · model calls: 7

## Steps
| Step | Exit | Seconds |
|---|---|---|

## Hooks that fired
`__approval_request` ×2, `__approval_resolution` ×2, `__register` ×2, `after_tool_call` ×4, `agent_end` ×4, `agent_turn_prepare` ×4, `before_agent_finalize` ×4, `before_agent_reply` ×4, `before_agent_run` ×4, `before_dispatch` ×3, `before_message_write` ×18, `before_model_resolve` ×4, `before_prompt_build` ×4, `before_tool_call` ×4, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×4, `llm_output` ×4, `message_received` ×4, `message_sending` ×8, `message_sent` ×4, `model_call_ended` ×7, `model_call_started` ×7, `reply_dispatch` ×3, `reply_payload_sending` ×4, `resolve_exec_env` ×2, `session_start` ×1, `tool_result_persist` ×3

## Tool hook coverage
| Step | Tool | Call id | before_tool_call | Error | Params seen by after_tool_call |
|---|---|---|---|---|---|
| (between steps) | exec | call_1_0 | yes (as `exec`) | — | {"command":"echo pg-approve-low ok"} |
| (between steps) | exec | call_3_0 | yes (as `exec`) | Plugin approval required (gateway unavailable) | {"command":"echo pg-approve-low ok"} |
| (between steps) | sessions_send | tool_call:call_6_0:sessions_send:1 | yes (as `sessions_send`) | No session found: agent:main:qa-channel:direct:dm:bob | {"sessionKey":"agent:main:qa-channel:direct:dm:bob","message":"Relayed. [scenario:child-exec]"} |
| (between steps) | tool_call | call_6_0 | yes (as `tool_call`) | failed | {"id":"sessions_send","args":{"sessionKey":"agent:main:qa-channel:direct:dm:bob","message":"Relayed. [scenario:child-exe |

**Executed without before_tool_call (no error):** 0

## Q1: `tool_result_persist` before the next model call
| Step | Tool | Call id | Persisted at | Next model call with this result | Gap (ms) | Model saw persisted copy |
|---|---|---|---|---|---|---|
| (between steps) | exec | call_1_0 | 1793216866304 | #2 | 186 | no |
| (between steps) | exec | call_3_0 | 1793216883451 | #5 | 220 | no |
| (between steps) | tool_call | call_6_0 | 1793216889823 | #7 | 390 | no |

**Verdict:** PASS: tool_result_persist always ran before the next model call. Persisted copy shown to the model in-run: 0/3.

## Q2: identity and trigger
| sessionKey | Steps | trigger | before_agent_run senderIsOwner | inputProvenance | jobId | before_tool_call requester |
|---|---|---|---|---|---|---|
| agent:main:qa-channel:direct:dm:alice | (between steps) | user | true | — | — | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| agent:main:pg-unrelated | (between steps) | user | true | — | — | — |

## Q6: whose `params` win
- High-priority handler ran: false; saw `—`
- Low-priority handler ran: false; saw `—`
- exec commands reported by after_tool_call: `echo pg-approve-low ok`, `echo pg-approve-low ok`
- **Winner:** undetermined

## Model requests
- First request: stream=true, tools offered (12): apply_patch, edit, exec, ls, openclaw, process, read, sessions_yield, tool_call, tool_describe, tool_search, write
- Scenarios seen: approve-low, default, send-exec-meta
- Unhandled or failed mock routes: none

### Meta-tool schemas
- `sessions_yield`: {"type":"object","properties":{"waitFor":{"type":"string","const":"message","description":"Explicitly pause an unfinished subagent until an incoming continuation message; its requester is notified once. Does not schedule a message or submit the final result."},"message":{"type":"string","description":"Private context for the resumed turn; not sent to the user."},"acknowledgment":{"type":"string","description":"Optional waiting reply for an otherwise-silent interactive parent turn; with waitFor, the pause notice for the requester."}}}
- `tool_call`: {"type":"object","required":["id"],"properties":{"id":{"type":"string","description":"Tool search result id or tool name."},"args":{"type":"object","patternProperties":{"^.*$":{}},"description":"Tool input."}}}
- `tool_describe`: {"type":"object","required":["id"],"properties":{"id":{"type":"string","description":"Tool search result id or tool name."}}}
- `tool_search`: {"type":"object","properties":{"query":{"anyOf":[{"type":"string"},{"type":"null"}],"description":"Single search query, in English. A non-empty query joins a non-empty batch first. Null or blank is ignored beside a non-empty batch."},"limit":{"anyOf":[{"type":"integer","minimum":1},{"type":"null"}],"description":"Maximum number of single-search results. Omitted or null uses the default. With only batch queries, omit this or set it to null; set limits on each batch entry."},"queries":{"anyOf":[{"type":"array","items":{"type":"object","required":["query"],"properties":{"query":{"type":"string","
