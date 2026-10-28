# Phase 0 runtime report
Run: `/pg/runs/ch-guard6` · probe events: 98 · model calls: 8

## Steps
| Step | Exit | Seconds |
|---|---|---|

## Hooks that fired
`__register` ×2, `after_tool_call` ×10, `agent_end` ×2, `agent_turn_prepare` ×2, `before_agent_finalize` ×2, `before_agent_reply` ×2, `before_agent_run` ×2, `before_dispatch` ×2, `before_message_write` ×22, `before_model_resolve` ×2, `before_prompt_build` ×2, `before_tool_call` ×10, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×2, `llm_output` ×2, `message_received` ×2, `message_sending` ×2, `model_call_ended` ×8, `model_call_started` ×8, `reply_dispatch` ×2, `reply_payload_sending` ×2, `tool_result_persist` ×6

## Tool hook coverage
| Step | Tool | Call id | before_tool_call | Error | Params seen by after_tool_call |
|---|---|---|---|---|---|
| (between steps) | web_fetch | tool_call:call_2_0:web_fetch:1 | yes (as `web_fetch`) | — | {"url":"http://127.0.0.1:35230/web/page1"} |
| (between steps) | tool_call | call_2_0 | yes (as `tool_call`) | — | {"id":"web_fetch","args":{"url":"http://127.0.0.1:35230/web/page1"}} |
| (between steps) | tool_call | call_3_0 | yes (as `tool_call`) | [Guard] Reacting with 👍 can answer an approval prompt, so the agent may only us | {"id":"message","args":{"action":"react","channel":"qa-channel","target":"dm:alice","messageId":"4f7c5cd3-1422-4b10-b95a |
| (between steps) | message | tool_call:call_4_0:message:2 | yes (as `message`) | — | {"action":"react","channel":"qa-channel","target":"dm:alice","messageId":"4d150eaf-c2a9-4422-b360-e37749235ebb","emoji": |
| (between steps) | tool_call | call_4_0 | yes (as `tool_call`) | — | {"id":"message","args":{"action":"react","channel":"qa-channel","target":"dm:alice","messageId":"4d150eaf-c2a9-4422-b360 |
| (between steps) | message | tool_call:call_5_0:message:3 | yes (as `message`) | — | {"action":"react","channel":"qa-channel","target":"dm:alice","messageId":"4f7c5cd3-1422-4b10-b95a-7f0279b0142d","emoji": |
| (between steps) | tool_call | call_5_0 | yes (as `tool_call`) | — | {"id":"message","args":{"action":"react","channel":"qa-channel","target":"dm:alice","messageId":"4f7c5cd3-1422-4b10-b95a |
| (between steps) | message | tool_call:call_6_0:message:4 | yes (as `message`) | qa-channel react requires messageId and emoji | {"action":"react","channel":"qa-channel","target":"dm:alice","emoji":"👍"} |
| (between steps) | tool_call | call_6_0 | yes (as `tool_call`) | qa-channel react requires messageId and emoji | {"id":"message","args":{"action":"react","channel":"qa-channel","target":"dm:alice","emoji":"👍"}} |
| (between steps) | tool_call | call_7_0 | yes (as `tool_call`) | [Guard] Reacting with 👍 can answer an approval prompt, so the agent may only us | {"id":"message","args":{"action":"react","channel":"qa-channel","target":"dm:alice","messageId":"4d150eaf-c2a9-4422-b360 |

**Executed without before_tool_call (no error):** 0

## Q1: `tool_result_persist` before the next model call
| Step | Tool | Call id | Persisted at | Next model call with this result | Gap (ms) | Model saw persisted copy |
|---|---|---|---|---|---|---|
| (between steps) | tool_call | call_2_0 | 1793228007741 | #3 | 242 | no |
| (between steps) | tool_call | call_3_0 | 1793228008181 | #4 | 196 | no |
| (between steps) | tool_call | call_4_0 | 1793228008701 | #5 | 263 | no |
| (between steps) | tool_call | call_5_0 | 1793228009328 | #6 | 200 | no |
| (between steps) | tool_call | call_6_0 | 1793228009808 | #7 | 186 | no |
| (between steps) | tool_call | call_7_0 | 1793228010202 | #8 | 175 | no |

**Verdict:** PASS: tool_result_persist always ran before the next model call. Persisted copy shown to the model in-run: 0/6.

## Q2: identity and trigger
| sessionKey | Steps | trigger | before_agent_run senderIsOwner | inputProvenance | jobId | before_tool_call requester |
|---|---|---|---|---|---|---|
| agent:main:qa-channel:direct:dm:alice | (between steps) | user | true | — | — | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |

## Q6: whose `params` win
- High-priority handler ran: false; saw `—`
- Low-priority handler ran: false; saw `—`
- exec commands reported by after_tool_call: none
- **Winner:** undetermined

## Model requests
- First request: stream=true, tools offered (12): apply_patch, edit, exec, ls, openclaw, process, read, sessions_yield, tool_call, tool_describe, tool_search, write
- Scenarios seen: default, react-test
- Unhandled or failed mock routes: none

### Meta-tool schemas
- `sessions_yield`: {"type":"object","properties":{"waitFor":{"type":"string","const":"message","description":"Explicitly pause an unfinished subagent until an incoming continuation message; its requester is notified once. Does not schedule a message or submit the final result."},"message":{"type":"string","description":"Private context for the resumed turn; not sent to the user."},"acknowledgment":{"type":"string","description":"Optional waiting reply for an otherwise-silent interactive parent turn; with waitFor, the pause notice for the requester."}}}
- `tool_call`: {"type":"object","required":["id"],"properties":{"id":{"type":"string","description":"Tool search result id or tool name."},"args":{"type":"object","patternProperties":{"^.*$":{}},"description":"Tool input."}}}
- `tool_describe`: {"type":"object","required":["id"],"properties":{"id":{"type":"string","description":"Tool search result id or tool name."}}}
- `tool_search`: {"type":"object","properties":{"query":{"anyOf":[{"type":"string"},{"type":"null"}],"description":"Single search query, in English. A non-empty query joins a non-empty batch first. Null or blank is ignored beside a non-empty batch."},"limit":{"anyOf":[{"type":"integer","minimum":1},{"type":"null"}],"description":"Maximum number of single-search results. Omitted or null uses the default. With only batch queries, omit this or set it to null; set limits on each batch entry."},"queries":{"anyOf":[{"type":"array","items":{"type":"object","required":["query"],"properties":{"query":{"type":"string","
