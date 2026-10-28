# Phase 0 channel report
Run: `/pg/runs/ch-base10` · probe events: 42 · model calls: 2

## Driver steps
| Test | Step | Note |
|---|---|---|
| c1-owner | approval-prompt | id=plugin:3c478d65-6942-4825-9a28-9316ceb9d410 |
| c1-owner | resolution | decision=cancelled |
| c1-owner | agent_end | ok |
|  | driver-done |  |

## message_received (event, ctx)
| Test | event.from | event.metadata/sender | ctx |
|---|---|---|---|
| c1-owner | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"60dbbc53-911a-416f-89fb-a4ef22364acd","senderId":"alice"} |
| c1-owner | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"c19f17af-01e8-4e88-9ed6-98666da502f3","senderId":"alice"} |

## before_agent_run
| Test | sessionKey | trigger | senderIsOwner | inputProvenance | channel / sender |
|---|---|---|---|---|---|
| c1-owner | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |

## before_tool_call requester
| Test | sessionKey | tool | params | ctx.requester |
|---|---|---|---|---|
| c1-owner | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |

## Commands, approvals
- c1-owner: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_1_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c1-owner: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"cancelled","toolName":"exec","toolCallId":"call_1_0"}

## after_tool_call
| Test | sessionKey | tool | params | error |
|---|---|---|---|---|
| c1-owner | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | "Plugin approval required (gateway unavailable)" |

## Hook counts
`__approval_request` ×1, `__approval_resolution` ×1, `__register` ×2, `after_tool_call` ×1, `agent_end` ×1, `agent_turn_prepare` ×1, `before_agent_finalize` ×1, `before_agent_reply` ×1, `before_agent_run` ×1, `before_dispatch` ×1, `before_message_write` ×5, `before_model_resolve` ×1, `before_prompt_build` ×1, `before_tool_call` ×1, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×1, `llm_output` ×1, `message_received` ×2, `message_sending` ×4, `message_sent` ×2, `model_call_ended` ×2, `model_call_started` ×2, `reply_dispatch` ×1, `reply_payload_sending` ×2, `resolve_exec_env` ×1, `tool_result_persist` ×1
