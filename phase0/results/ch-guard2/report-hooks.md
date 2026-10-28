# Phase 0 runtime report
Run: `/pg/runs/ch-guard2` · probe events: 82 · model calls: 6

## Steps
| Step | Exit | Seconds |
|---|---|---|

## Hooks that fired
`__approval_request` ×1, `__approval_resolution` ×1, `__register` ×2, `after_tool_call` ×4, `agent_end` ×2, `agent_turn_prepare` ×2, `before_agent_finalize` ×2, `before_agent_reply` ×2, `before_agent_run` ×2, `before_dispatch` ×2, `before_message_write` ×14, `before_model_resolve` ×2, `before_prompt_build` ×2, `before_tool_call` ×3, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×2, `llm_output` ×2, `message_received` ×3, `message_sending` ×5, `message_sent` ×2, `model_call_ended` ×6, `model_call_started` ×6, `reply_dispatch` ×2, `reply_payload_sending` ×3, `resolve_exec_env` ×2, `tool_result_persist` ×4

## Tool hook coverage
| Step | Tool | Call id | before_tool_call | Error | Params seen by after_tool_call |
|---|---|---|---|---|---|
| (between steps) | read | call_1_0 | yes (as `read`) | — | {"path":"probe-input.txt"} |
| (between steps) | exec | call_2_0 | yes (as `exec`) | — | {"command":"echo exec-output-1"} |
| (between steps) | web_fetch | call_3_0 | **no** | Tool web_fetch not found | {"url":"http://127.0.0.1:23516/web/page1"} |
| (between steps) | exec | call_5_0 | yes (as `exec`) | Plugin approval required (gateway unavailable) | {"command":"echo pg-approve-low ok"} |

**Executed without before_tool_call (no error):** 0

## Q1: `tool_result_persist` before the next model call
| Step | Tool | Call id | Persisted at | Next model call with this result | Gap (ms) | Model saw persisted copy |
|---|---|---|---|---|---|---|
| (between steps) | read | call_1_0 | 1793224337127 | #2 | 245 | no |
| (between steps) | exec | call_2_0 | 1793224338330 | #3 | 213 | no |
| (between steps) | web_fetch | call_3_0 | 1793224338749 | #4 | 191 | no |
| (between steps) | exec | call_5_0 | 1793224347294 | #6 | 277 | no |

**Verdict:** PASS: tool_result_persist always ran before the next model call. Persisted copy shown to the model in-run: 0/4.

## Q2: identity and trigger
| sessionKey | Steps | trigger | before_agent_run senderIsOwner | inputProvenance | jobId | before_tool_call requester |
|---|---|---|---|---|---|---|
| agent:main:qa-channel:direct:dm:alice | (between steps) | user | true | — | — | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |

## Q6: whose `params` win
- High-priority handler ran: false; saw `—`
- Low-priority handler ran: false; saw `—`
- exec commands reported by after_tool_call: `echo exec-output-1`, `echo pg-approve-low ok`
- **Winner:** undetermined

## Model requests
- First request: stream=true, tools offered (12): apply_patch, edit, exec, ls, openclaw, process, read, sessions_yield, tool_call, tool_describe, tool_search, write
- Scenarios seen: persist-order, approve-low
- Unhandled or failed mock routes: none

### Meta-tool schemas
- `sessions_yield`: {"type":"object","properties":{"waitFor":{"type":"string","const":"message","description":"Explicitly pause an unfinished subagent until an incoming continuation message; its requester is notified once. Does not schedule a message or submit the final result."},"message":{"type":"string","description":"Private context for the resumed turn; not sent to the user."},"acknowledgment":{"type":"string","description":"Optional waiting reply for an otherwise-silent interactive parent turn; with waitFor, the pause notice for the requester."}}}
- `tool_call`: {"type":"object","required":["id"],"properties":{"id":{"type":"string","description":"Tool search result id or tool name."},"args":{"type":"object","patternProperties":{"^.*$":{}},"description":"Tool input."}}}
- `tool_describe`: {"type":"object","required":["id"],"properties":{"id":{"type":"string","description":"Tool search result id or tool name."}}}
- `tool_search`: {"type":"object","properties":{"query":{"anyOf":[{"type":"string"},{"type":"null"}],"description":"Single search query, in English. A non-empty query joins a non-empty batch first. Null or blank is ignored beside a non-empty batch."},"limit":{"anyOf":[{"type":"integer","minimum":1},{"type":"null"}],"description":"Maximum number of single-search results. Omitted or null uses the default. With only batch queries, omit this or set it to null; set limits on each batch entry."},"queries":{"anyOf":[{"type":"array","items":{"type":"object","required":["query"],"properties":{"query":{"type":"string","
