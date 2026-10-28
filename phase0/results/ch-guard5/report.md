# Phase 0 channel report
Run: `/pg/runs/ch-guard5` · probe events: 68 · model calls: 3

## Driver steps
| Test | Step | Note |
|---|---|---|
| w-slash-alice | result | replies=0 |
| w-slash-bob | result | replies=0 |
| e1-double | prompt | plugin:afe7cce0-47bc-4922-9f6e-d6341ba89706 |
| e1-double | prompt | 88ffc7ed-a246-4e40-9caa-ab951dea4760 |
| e1-double | summary | prompts=2 ran=true |
|  | driver-done |  |

## message_received (event, ctx)
| Test | event.from | event.metadata/sender | ctx |
|---|---|---|---|
| w-slash | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"99ac5dd2-672b-467d-840d-32a77fadda2b","senderId":"alice"} |
| w-slash | "dm:bob" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:bob","sessionKey":"agent:main:qa-channel:slash:bob","messageId":"14908452-3fbf-451f-8d3c-242051cdb2b4","senderId":"bob"} |
| e1-double | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"731d86ed-90ac-4f63-ab07-6dc651b2849c","senderId":"alice"} |
| e1-double | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"4c0e208f-8eaa-42a1-9be3-87c6f5426e92","senderId":"alice"} |
| e1-double | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"cb0e5336-55ab-48ca-9a72-3cbe2a563262","senderId":"alice"} |

## before_agent_run
| Test | sessionKey | trigger | senderIsOwner | inputProvenance | channel / sender |
|---|---|---|---|---|---|
| e1-double | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |

## before_tool_call requester
| Test | sessionKey | tool | params | ctx.requester |
|---|---|---|---|---|
| e1-double | "agent:main:qa-channel:direct:dm:alice" | "tool_call" | {"id":"web_fetch","args":{"url":"http://127.0.0.1:21315/web/page1"}} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| e1-double | "agent:main:qa-channel:direct:dm:alice" | "web_fetch" | {"url":"http://127.0.0.1:21315/web/page1"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| e1-double | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-double-prompt"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |

## Commands, approvals
- w-slash: `__command` {"hook":"__command","command":"guardauth"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"sessionKey":"agent:main:qa-channel:direct:dm:alice","from":"dm:alice","to":"dm:alice"}

## after_tool_call
| Test | sessionKey | tool | params | error |
|---|---|---|---|---|
| e1-double | "agent:main:qa-channel:direct:dm:alice" | "web_fetch" | {"url":"http://127.0.0.1:21315/web/page1"} | — |
| e1-double | "agent:main:qa-channel:direct:dm:alice" | "tool_call" | {"id":"web_fetch","args":{"url":"http://127.0.0.1:21315/web/page1"}} | — |
| e1-double | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-double-prompt"} | — |

## Hook counts
`__command` ×1, `__register` ×2, `after_tool_call` ×3, `agent_end` ×1, `agent_turn_prepare` ×1, `before_agent_finalize` ×1, `before_agent_reply` ×1, `before_agent_run` ×1, `before_dispatch` ×3, `before_message_write` ×8, `before_model_resolve` ×1, `before_prompt_build` ×1, `before_tool_call` ×3, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×1, `llm_output` ×1, `message_received` ×5, `message_sending` ×9, `message_sent` ×4, `model_call_ended` ×3, `model_call_started` ×3, `reply_dispatch` ×3, `reply_payload_sending` ×5, `resolve_exec_env` ×1, `tool_result_persist` ×2
