# Phase 0 channel report
Run: `/pg/runs/ch-base2` · probe events: 44 · model calls: 2

## Driver steps
| Test | Step | Note |
|---|---|---|
| c1-owner | approval-prompt | id=plugin:adb2b5a1-2445-490d-8c30-4f05d0ba79bb |
| c1-owner | resolution | none within 20000ms |
| c1-owner | agent_end | ok |
|  | driver-done |  |

## message_received (event, ctx)
| Test | event.from | event.metadata/sender | ctx |
|---|---|---|---|
| c1-owner | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"ea0c71fb-b2d4-42aa-b8b5-08c9a865399a","senderId":"alice"} |
| c1-owner | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"edf7c7bc-5488-4a2b-885e-22f1a9198c98","senderId":"alice"} |

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
- c1-owner: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"timeout","toolName":"exec","toolCallId":"call_1_0"}

## after_tool_call
| Test | sessionKey | tool | params | error |
|---|---|---|---|---|
| c1-owner | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | "Approval timed out" |

## Hook counts
`__approval_request` ×1, `__approval_resolution` ×1, `__register` ×2, `after_tool_call` ×1, `agent_end` ×1, `agent_turn_prepare` ×1, `before_agent_finalize` ×1, `before_agent_reply` ×1, `before_agent_run` ×1, `before_dispatch` ×1, `before_message_write` ×5, `before_model_resolve` ×1, `before_prompt_build` ×1, `before_tool_call` ×1, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×1, `llm_output` ×1, `message_received` ×2, `message_sending` ×5, `message_sent` ×3, `model_call_ended` ×2, `model_call_started` ×2, `reply_dispatch` ×1, `reply_payload_sending` ×2, `resolve_exec_env` ×1, `tool_result_persist` ×1
