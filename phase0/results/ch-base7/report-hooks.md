# Phase 0 runtime report
Run: `/pg/runs/ch-base7` · probe events: 96 · model calls: 8

## Steps
| Step | Exit | Seconds |
|---|---|---|

## Hooks that fired
`__register` ×2, `after_tool_call` ×6, `agent_end` ×3, `agent_turn_prepare` ×3, `before_agent_finalize` ×3, `before_agent_reply` ×3, `before_agent_run` ×3, `before_dispatch` ×2, `before_message_write` ×19, `before_model_resolve` ×3, `before_prompt_build` ×3, `before_tool_call` ×5, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×3, `llm_output` ×3, `message_received` ×2, `message_sending` ×2, `model_call_ended` ×8, `model_call_started` ×8, `reply_dispatch` ×2, `reply_payload_sending` ×2, `resolve_exec_env` ×2, `tool_result_persist` ×5

## Tool hook coverage
| Step | Tool | Call id | before_tool_call | Error | Params seen by after_tool_call |
|---|---|---|---|---|---|
| (between steps) | read | call_1_0 | yes (as `read`) | — | {"path":"probe-input.txt"} |
| (between steps) | exec | call_2_0 | yes (as `exec`) | — | {"command":"echo exec-output-1"} |
| (between steps) | web_fetch | call_3_0 | **no** | Tool web_fetch not found | {"url":"http://127.0.0.1:24205/web/page1"} |
| (between steps) | exec | call_6_0 | yes (as `exec`) | — | {"command":"echo child-exec"} |
| (between steps) | sessions_send | tool_call:call_5_0:sessions_send:1 | yes (as `sessions_send`) | — | {"sessionKey":"agent:main:qa-channel:direct:dm:bob","message":"Relayed. [scenario:child-exec]"} |
| (between steps) | tool_call | call_5_0 | yes (as `tool_call`) | — | {"id":"sessions_send","args":{"sessionKey":"agent:main:qa-channel:direct:dm:bob","message":"Relayed. [scenario:child-exe |

**Executed without before_tool_call (no error):** 0

## Q1: `tool_result_persist` before the next model call
| Step | Tool | Call id | Persisted at | Next model call with this result | Gap (ms) | Model saw persisted copy |
|---|---|---|---|---|---|---|
| (between steps) | read | call_1_0 | 1793217260233 | #2 | 208 | no |
| (between steps) | exec | call_2_0 | 1793217261298 | #3 | 165 | no |
| (between steps) | web_fetch | call_3_0 | 1793217261599 | #4 | 195 | no |
| (between steps) | exec | call_6_0 | 1793217277311 | #7 | 185 | no |
| (between steps) | tool_call | call_5_0 | 1793217279204 | #8 | 245 | no |

**Verdict:** PASS: tool_result_persist always ran before the next model call. Persisted copy shown to the model in-run: 0/5.

## Q2: identity and trigger
| sessionKey | Steps | trigger | before_agent_run senderIsOwner | inputProvenance | jobId | before_tool_call requester |
|---|---|---|---|---|---|---|
| agent:main:qa-channel:direct:dm:bob | (between steps) | user | false | {"kind":"inter_session","sourceSessionKey":"agent:main:qa-channel:direct:dm:alice","sourceChannel":"qa-channel","sourceTool":"sessions_send"} | — | {"channel":"qa-channel","accountId":"default","senderId":"bob","senderIsOwner":false}; {"channel":"webchat","senderIsOwner":false} |
| agent:main:qa-channel:direct:dm:alice | (between steps) | user | true | — | — | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |

## Q6: whose `params` win
- High-priority handler ran: false; saw `—`
- Low-priority handler ran: false; saw `—`
- exec commands reported by after_tool_call: `echo exec-output-1`, `echo child-exec`
- **Winner:** undetermined

## Model requests
- First request: stream=true, tools offered (11): apply_patch, edit, exec, ls, process, read, sessions_yield, tool_call, tool_describe, tool_search, write
- Scenarios seen: persist-order, send-exec-meta, child-exec
- Unhandled or failed mock routes: none

### Meta-tool schemas
- `sessions_yield`: {"type":"object","properties":{"waitFor":{"type":"string","const":"message","description":"Explicitly pause an unfinished subagent until an incoming continuation message; its requester is notified once. Does not schedule a message or submit the final result."},"message":{"type":"string","description":"Private context for the resumed turn; not sent to the user."},"acknowledgment":{"type":"string","description":"Optional waiting reply for an otherwise-silent interactive parent turn; with waitFor, the pause notice for the requester."}}}
- `tool_call`: {"type":"object","required":["id"],"properties":{"id":{"type":"string","description":"Tool search result id or tool name."},"args":{"type":"object","patternProperties":{"^.*$":{}},"description":"Tool input."}}}
- `tool_describe`: {"type":"object","required":["id"],"properties":{"id":{"type":"string","description":"Tool search result id or tool name."}}}
- `tool_search`: {"type":"object","properties":{"query":{"anyOf":[{"type":"string"},{"type":"null"}],"description":"Single search query, in English. A non-empty query joins a non-empty batch first. Null or blank is ignored beside a non-empty batch."},"limit":{"anyOf":[{"type":"integer","minimum":1},{"type":"null"}],"description":"Maximum number of single-search results. Omitted or null uses the default. With only batch queries, omit this or set it to null; set limits on each batch entry."},"queries":{"anyOf":[{"type":"array","items":{"type":"object","required":["query"],"properties":{"query":{"type":"string","
