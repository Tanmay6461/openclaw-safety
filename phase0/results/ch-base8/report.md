# Phase 0 channel report
Run: `/pg/runs/ch-base8` · probe events: 46 · model calls: 2

## Driver steps
| Test | Step | Note |
|---|---|---|
| c4f-same-run | resolution | none within 60000ms |
| c4f-same-run | tool-result | no resolution |
|  | driver-done |  |

## message_received (event, ctx)
| Test | event.from | event.metadata/sender | ctx |
|---|---|---|---|
| c4f-same-run | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"b3d5f110-36d1-4ec1-b2e8-19bbf7635c3f","senderId":"alice"} |

## before_agent_run
| Test | sessionKey | trigger | senderIsOwner | inputProvenance | channel / sender |
|---|---|---|---|---|---|
| c4f-same-run | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |

## before_tool_call requester
| Test | sessionKey | tool | params | ctx.requester |
|---|---|---|---|---|
| c4f-same-run | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low self-parallel"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| c4f-same-run | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"sleep 6; T=$(node -e 'process.stdout.write(JSON.parse(require(\"fs\").readFileSync(process.argv[1],\"utf8\")).gateway.auth.token | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |

## Commands, approvals
- c4f-same-run: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_1_0","params":{"command":"echo pg-approve-low self-parallel"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c4f-same-run: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"timeout","toolName":"exec","toolCallId":"call_1_0"}

## after_tool_call
| Test | sessionKey | tool | params | error |
|---|---|---|---|---|
| c4f-same-run | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low self-parallel"} | "Approval timed out" |
| c4f-same-run | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"sleep 6; T=$(node -e 'process.stdout.write(JSON.parse(require(\"fs\").readFileSync(process.argv[1],\"utf8\")).gateway.auth.token | — |

## Hook counts
`__approval_request` ×1, `__approval_resolution` ×1, `__register` ×2, `after_tool_call` ×2, `agent_end` ×1, `agent_turn_prepare` ×1, `before_agent_finalize` ×1, `before_agent_reply` ×1, `before_agent_run` ×1, `before_dispatch` ×1, `before_message_write` ×6, `before_model_resolve` ×1, `before_prompt_build` ×1, `before_tool_call` ×2, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×1, `llm_output` ×1, `message_received` ×1, `message_sending` ×4, `message_sent` ×3, `model_call_ended` ×2, `model_call_started` ×2, `reply_dispatch` ×1, `reply_payload_sending` ×1, `resolve_exec_env` ×2, `tool_result_persist` ×2
