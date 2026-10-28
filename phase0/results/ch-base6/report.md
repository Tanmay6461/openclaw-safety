# Phase 0 channel report
Run: `/pg/runs/ch-base6` · probe events: 62 · model calls: 4

## Driver steps
| Test | Step | Note |
|---|---|---|
| c4e-cron-exec | approval-prompt | id=plugin:5294884f-0038-4a9d-8cc5-21326f9e6de9 |
| c4e-cron-exec | cli |  |
| c4e-cron-exec | cron-job | 8daf51f5-9af2-48ff-a2b1-c0e25d6c92b2 |
| c4e-cron-exec | cli |  |
| c4e-cron-exec | resolution | decision=cancelled |
| c4e-cron-exec | tool-result |  |
|  | driver-done |  |

## message_received (event, ctx)
| Test | event.from | event.metadata/sender | ctx |
|---|---|---|---|
| c4e-cron-exec | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"1f27fc41-3fe5-4c91-a28e-f2e1d4904318","senderId":"alice"} |

## before_agent_run
| Test | sessionKey | trigger | senderIsOwner | inputProvenance | channel / sender |
|---|---|---|---|---|---|
| c4e-cron-exec | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| c4e-cron-exec | "agent:main:cron:8daf51f5-9af2-48ff-a2b1-c0e25d6c92b2:run:65c76c4a-1c2f-4389-90d3-16af4abae51b" | "cron" | — | — | {} |

## before_tool_call requester
| Test | sessionKey | tool | params | ctx.requester |
|---|---|---|---|---|
| c4e-cron-exec | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| c4e-cron-exec | "agent:main:cron:8daf51f5-9af2-48ff-a2b1-c0e25d6c92b2:run:65c76c4a-1c2f-4389-90d3-16af4abae51b" | "exec" | {"command":"T=$(node -e 'process.stdout.write(JSON.parse(require(\"fs\").readFileSync(process.argv[1],\"utf8\")).gateway.auth.token)' /pg/ru | — |

## Commands, approvals
- c4e-cron-exec: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_1_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c4e-cron-exec: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"cancelled","toolName":"exec","toolCallId":"call_1_0"}

## after_tool_call
| Test | sessionKey | tool | params | error |
|---|---|---|---|---|
| c4e-cron-exec | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | "Plugin approval required (gateway unavailable)" |
| c4e-cron-exec | "agent:main:cron:8daf51f5-9af2-48ff-a2b1-c0e25d6c92b2:run:65c76c4a-1c2f-4389-90d3-16af4abae51b" | "exec" | {"command":"T=$(node -e 'process.stdout.write(JSON.parse(require(\"fs\").readFileSync(process.argv[1],\"utf8\")).gateway.auth.token)' /pg/ru | — |

## Hook counts
`__approval_request` ×1, `__approval_resolution` ×1, `__register` ×2, `after_tool_call` ×2, `agent_end` ×2, `agent_turn_prepare` ×2, `before_agent_finalize` ×2, `before_agent_reply` ×2, `before_agent_run` ×2, `before_dispatch` ×1, `before_message_write` ×9, `before_model_resolve` ×2, `before_prompt_build` ×2, `before_tool_call` ×2, `cron_changed` ×4, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×2, `llm_output` ×2, `message_received` ×1, `message_sending` ×3, `message_sent` ×2, `model_call_ended` ×4, `model_call_started` ×4, `reply_dispatch` ×1, `reply_payload_sending` ×1, `resolve_exec_env` ×2, `tool_result_persist` ×2
