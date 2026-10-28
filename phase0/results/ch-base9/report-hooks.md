# Phase 0 runtime report
Run: `/pg/runs/ch-base9` · probe events: 47 · model calls: 3

## Steps
| Step | Exit | Seconds |
|---|---|---|

## Hooks that fired
`__approval_request` ×1, `__approval_resolution` ×1, `__register` ×2, `after_tool_call` ×2, `agent_end` ×1, `agent_turn_prepare` ×1, `before_agent_finalize` ×1, `before_agent_reply` ×1, `before_agent_run` ×1, `before_dispatch` ×1, `before_message_write` ×7, `before_model_resolve` ×1, `before_prompt_build` ×1, `before_tool_call` ×2, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×1, `llm_output` ×1, `message_received` ×1, `message_sending` ×3, `message_sent` ×2, `model_call_ended` ×3, `model_call_started` ×3, `reply_dispatch` ×1, `reply_payload_sending` ×1, `resolve_exec_env` ×2, `tool_result_persist` ×2

## Tool hook coverage
| Step | Tool | Call id | before_tool_call | Error | Params seen by after_tool_call |
|---|---|---|---|---|---|
| (between steps) | exec | call_1_0 | yes (as `exec`) | — | {"command":"sleep 8; T=$(node -e 'process.stdout.write(JSON.parse(require(\"fs\").readFileSync(process.argv[1],\"utf8\") |
| (between steps) | exec | call_2_0 | yes (as `exec`) | — | {"command":"echo pg-approve-low self-background"} |

**Executed without before_tool_call (no error):** 0

## Q1: `tool_result_persist` before the next model call
| Step | Tool | Call id | Persisted at | Next model call with this result | Gap (ms) | Model saw persisted copy |
|---|---|---|---|---|---|---|
| (between steps) | exec | call_1_0 | 1793217864101 | #2 | 315 | no |
| (between steps) | exec | call_2_0 | 1793217882956 | #3 | 1061 | no |

**Verdict:** PASS: tool_result_persist always ran before the next model call. Persisted copy shown to the model in-run: 0/2.

## Q2: identity and trigger
| sessionKey | Steps | trigger | before_agent_run senderIsOwner | inputProvenance | jobId | before_tool_call requester |
|---|---|---|---|---|---|---|
| agent:main:qa-channel:direct:dm:alice | (between steps) | user | true | — | — | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |

## Q6: whose `params` win
- High-priority handler ran: false; saw `—`
- Low-priority handler ran: false; saw `—`
- exec commands reported by after_tool_call: `sleep 8; T=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).gateway.auth.token)' /pg/runs/ch-base9/state/openclaw.json); ID=$(/pg/oc/node_modules/.bin/openclaw approvals pending --json --url ws://127.0.0.1:20981 --token "$T" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s.slice(s.indexOf("{")));process.stdout.wri…[+221]`, `echo pg-approve-low self-background`
- **Winner:** undetermined

## Model requests
- First request: stream=true, tools offered (12): apply_patch, edit, exec, ls, openclaw, process, read, sessions_yield, tool_call, tool_describe, tool_search, write
- Scenarios seen: self-approve-background
- Unhandled or failed mock routes: none

### Meta-tool schemas
- `sessions_yield`: {"type":"object","properties":{"waitFor":{"type":"string","const":"message","description":"Explicitly pause an unfinished subagent until an incoming continuation message; its requester is notified once. Does not schedule a message or submit the final result."},"message":{"type":"string","description":"Private context for the resumed turn; not sent to the user."},"acknowledgment":{"type":"string","description":"Optional waiting reply for an otherwise-silent interactive parent turn; with waitFor, the pause notice for the requester."}}}
- `tool_call`: {"type":"object","required":["id"],"properties":{"id":{"type":"string","description":"Tool search result id or tool name."},"args":{"type":"object","patternProperties":{"^.*$":{}},"description":"Tool input."}}}
- `tool_describe`: {"type":"object","required":["id"],"properties":{"id":{"type":"string","description":"Tool search result id or tool name."}}}
- `tool_search`: {"type":"object","properties":{"query":{"anyOf":[{"type":"string"},{"type":"null"}],"description":"Single search query, in English. A non-empty query joins a non-empty batch first. Null or blank is ignored beside a non-empty batch."},"limit":{"anyOf":[{"type":"integer","minimum":1},{"type":"null"}],"description":"Maximum number of single-search results. Omitted or null uses the default. With only batch queries, omit this or set it to null; set limits on each batch entry."},"queries":{"anyOf":[{"type":"array","items":{"type":"object","required":["query"],"properties":{"query":{"type":"string","
