# Phase 0 channel report
Run: `/pg/runs/ch-base5` · probe events: 118 · model calls: 7

## Driver steps
| Test | Step | Note |
|---|---|---|
| c4c-operator-cli | approval-prompt | id=plugin:b26c7565-64a0-4777-b6fc-ac6ef5daa98c |
| c4c-operator-cli | cli |  |
| c4c-operator-cli | resolution | decision=allow-once |
| c4c-operator-cli | tool-result |  |
| c4d-cli-turn | approval-prompt | id=plugin:4eb6cdb9-aeaa-4b4a-812f-bf4c6f8bb9c5 |
| c4d-cli-turn | cli |  |
| c4d-cli-turn | after-cli-turn | still pending |
| c4d-cli-turn | resolution | decision=cancelled |
| c4d-cli-turn | tool-result |  |
| d-send | done |  |
|  | driver-done |  |

## message_received (event, ctx)
| Test | event.from | event.metadata/sender | ctx |
|---|---|---|---|
| c4c-operator-cli | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"713e5479-7d0d-42fa-92d3-5f5cb6288377","senderId":"alice"} |
| c4d-cli-turn | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"1b6f2919-5fe4-47f6-8f55-7b7db6a23e80","senderId":"alice"} |
| c4d-cli-turn | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"acaea2bc-b012-4b5f-8e87-6446eca3136d","senderId":"alice"} |
| d-send | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"ce9ce68a-8754-4f8f-a39e-7cbf674578c7","senderId":"alice"} |

## before_agent_run
| Test | sessionKey | trigger | senderIsOwner | inputProvenance | channel / sender |
|---|---|---|---|---|---|
| c4c-operator-cli | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| c4d-cli-turn | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| c4d-cli-turn | "agent:main:pg-unrelated" | "user" | true | — | {} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |

## before_tool_call requester
| Test | sessionKey | tool | params | ctx.requester |
|---|---|---|---|---|
| c4c-operator-cli | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| c4d-cli-turn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "tool_call" | {"id":"sessions_send","args":{"sessionKey":"agent:main:qa-channel:direct:dm:bob","message":"Relayed. [scenario:child-exec]"}} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "sessions_send" | {"sessionKey":"agent:main:qa-channel:direct:dm:bob","message":"Relayed. [scenario:child-exec]"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |

## Commands, approvals
- c4c-operator-cli: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_1_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c4c-operator-cli: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"allow-once","toolName":"exec","toolCallId":"call_1_0"}
- c4d-cli-turn: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_3_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c4d-cli-turn: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"cancelled","toolName":"exec","toolCallId":"call_3_0"}

## after_tool_call
| Test | sessionKey | tool | params | error |
|---|---|---|---|---|
| c4c-operator-cli | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | — |
| c4d-cli-turn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | "Plugin approval required (gateway unavailable)" |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "sessions_send" | {"sessionKey":"agent:main:qa-channel:direct:dm:bob","message":"Relayed. [scenario:child-exec]"} | "No session found: agent:main:qa-channel:direct:dm:bob" |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "tool_call" | {"id":"sessions_send","args":{"sessionKey":"agent:main:qa-channel:direct:dm:bob","message":"Relayed. [scenario:child-exec]"}} | "failed" |

## Hook counts
`__approval_request` ×2, `__approval_resolution` ×2, `__register` ×2, `after_tool_call` ×4, `agent_end` ×4, `agent_turn_prepare` ×4, `before_agent_finalize` ×4, `before_agent_reply` ×4, `before_agent_run` ×4, `before_dispatch` ×3, `before_message_write` ×18, `before_model_resolve` ×4, `before_prompt_build` ×4, `before_tool_call` ×4, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×4, `llm_output` ×4, `message_received` ×4, `message_sending` ×8, `message_sent` ×4, `model_call_ended` ×7, `model_call_started` ×7, `reply_dispatch` ×3, `reply_payload_sending` ×4, `resolve_exec_env` ×2, `session_start` ×1, `tool_result_persist` ×3
