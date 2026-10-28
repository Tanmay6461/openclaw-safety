# Phase 0 channel report
Run: `/pg/runs/ch-base1` · probe events: 285 · model calls: 21

## Driver steps
| Test | Step | Note |
|---|---|---|
| a-dm-alice | agent_end | ok |
| a-dm-bob | agent_end | ok |
| a-group-alice | agent_end | ok |
| a-group-bob | agent_end | ok |
| b-guard-alice-direct | result | handler=true replies=1 agentRun=false |
| b-guardauth-alice-direct | result | handler=true replies=1 agentRun=false |
| b-guard-bob-direct | result | handler=false replies=1 agentRun=false |
| b-guardauth-bob-direct | result | handler=false replies=1 agentRun=false |
| b-guard-bob-group | result | handler=false replies=1 agentRun=false |
| b-guardauth-bob-group | result | handler=false replies=1 agentRun=false |
| b-guard-alice-group | result | handler=true replies=1 agentRun=false |
| b-guardauth-alice-group | result | handler=true replies=1 agentRun=false |
| c1-owner | approval-prompt | NO PROMPT |
| c2-bob-dm | approval-prompt | NO PROMPT |

## message_received (event, ctx)
| Test | event.from | event.metadata/sender | ctx |
|---|---|---|---|
| a-dm-alice | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"3cba7703-6a16-4dac-a2de-d27416ef254a","senderId":"alice"} |
| a-dm-bob | "dm:bob" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:bob","sessionKey":"agent:main:qa-channel:direct:dm:bob","messageId":"7b6b3caf-7e74-464b-b323-34466d4dfe86","senderId":"bob"} |
| a-group-alice | "group:lab" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"e212c9c4-fcb2-4f44-b85a-c62a4033e87a","senderId":"alice"} |
| a-group-bob | "group:lab" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"25a230d3-2be9-467e-991d-3645b9468ea1","senderId":"bob"} |
| b | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"1f6e2183-1f97-4a7d-8460-66fe08c0f328","senderId":"alice"} |
| b | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"108fdc90-c7f3-4e8a-a149-468b8e463dba","senderId":"alice"} |
| b | "dm:bob" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:bob","sessionKey":"agent:main:qa-channel:direct:dm:bob","messageId":"a6720d46-5be3-4ce7-89e0-b097e70862d9","senderId":"bob"} |
| b | "dm:bob" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:bob","sessionKey":"agent:main:qa-channel:direct:dm:bob","messageId":"95fdce8f-dfc1-40d7-8515-bb50cca58a96","senderId":"bob"} |
| b | "group:lab" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"6fff404d-c80f-4a0b-afa3-33ef8c5012bd","senderId":"bob"} |
| b | "group:lab" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"3be9facd-f662-41cd-b90c-7ea43e89fb65","senderId":"bob"} |
| b | "group:lab" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"73c1521a-7903-4606-9c5d-6396758838a4","senderId":"alice"} |
| b | "group:lab" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"9f4a2eb2-0c99-44c1-a78a-5b037345de00","senderId":"alice"} |
| c1-owner | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"bfc3b743-f806-4680-8e30-635aa81fe0e0","senderId":"alice"} |
| c2-bob-dm | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"9c8672f4-35a3-4623-bd29-6b3b9961308a","senderId":"alice"} |
| c2-bob-group | "group:lab" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"83750878-7499-42b9-863b-eb97955153a7","senderId":"alice"} |

## before_agent_run
| Test | sessionKey | trigger | senderIsOwner | inputProvenance | channel / sender |
|---|---|---|---|---|---|
| a-dm-alice | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "user" | false | — | {"ch":"bob","sender":"bob"} |
| a-group-alice | "agent:main:qa-channel:group:group:lab" | "user" | true | — | {"ch":"group:lab","sender":"alice"} |
| a-group-bob | "agent:main:qa-channel:group:group:lab" | "user" | false | — | {"ch":"group:lab","sender":"bob"} |
| c1-owner | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| c2-bob-dm | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| c2-bob-group | "agent:main:qa-channel:group:group:lab" | "user" | true | — | {"ch":"group:lab","sender":"alice"} |

## before_tool_call requester
| Test | sessionKey | tool | params | ctx.requester |
|---|---|---|---|---|
| a-dm-alice | "agent:main:qa-channel:direct:dm:alice" | "read" | {"path":"probe-input.txt"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| a-dm-alice | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo exec-output-1"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "read" | {"path":"probe-input.txt"} | {"channel":"qa-channel","accountId":"default","senderId":"bob","senderIsOwner":false} |
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "exec" | {"command":"echo exec-output-1"} | {"channel":"qa-channel","accountId":"default","senderId":"bob","senderIsOwner":false} |
| a-group-alice | "agent:main:qa-channel:group:group:lab" | "read" | {"path":"probe-input.txt"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| a-group-alice | "agent:main:qa-channel:group:group:lab" | "exec" | {"command":"echo exec-output-1"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| a-group-bob | "agent:main:qa-channel:group:group:lab" | "read" | {"path":"probe-input.txt"} | {"channel":"qa-channel","accountId":"default","senderId":"bob","senderIsOwner":false} |
| a-group-bob | "agent:main:qa-channel:group:group:lab" | "exec" | {"command":"echo exec-output-1"} | {"channel":"qa-channel","accountId":"default","senderId":"bob","senderIsOwner":false} |
| c1-owner | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| c2-bob-dm | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| c2-bob-group | "agent:main:qa-channel:group:group:lab" | "exec" | {"command":"echo pg-approve-low ok"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |

## Commands, approvals
- b: `__command` {"hook":"__command","command":"guard"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"senderIsOwner":true,"sessionKey":"agent:main:qa-channel:direct:dm:alice","from":"dm:alice","to":"dm:alice"}
- b: `__command` {"hook":"__command","command":"guardauth"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"sessionKey":"agent:main:qa-channel:direct:dm:alice","from":"dm:alice","to":"dm:alice"}
- b: `__command` {"hook":"__command","command":"guard"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"senderIsOwner":true,"sessionKey":"agent:main:qa-channel:group:group:lab","from":"group:lab","to":"group:lab"}
- b: `__command` {"hook":"__command","command":"guardauth"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"sessionKey":"agent:main:qa-channel:group:group:lab","from":"group:lab","to":"group:lab"}
- c1-owner: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_17_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c2-bob-dm: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"timeout","toolName":"exec","toolCallId":"call_17_0"}
- c2-bob-dm: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_19_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c2-bob-group: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"timeout","toolName":"exec","toolCallId":"call_19_0"}
- c2-bob-group: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_21_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}

## after_tool_call
| Test | sessionKey | tool | params | error |
|---|---|---|---|---|
| a-dm-alice | "agent:main:qa-channel:direct:dm:alice" | "read" | {"path":"probe-input.txt"} | — |
| a-dm-alice | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo exec-output-1"} | — |
| a-dm-alice | "agent:main:qa-channel:direct:dm:alice" | "web_fetch" | {"url":"http://127.0.0.1:32766/web/page1"} | "Tool web_fetch not found" |
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "read" | {"path":"probe-input.txt"} | — |
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "exec" | {"command":"echo exec-output-1"} | — |
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "web_fetch" | {"url":"http://127.0.0.1:32766/web/page1"} | "Tool web_fetch not found" |
| a-group-alice | "agent:main:qa-channel:group:group:lab" | "read" | {"path":"probe-input.txt"} | — |
| a-group-alice | "agent:main:qa-channel:group:group:lab" | "exec" | {"command":"echo exec-output-1"} | — |
| a-group-alice | "agent:main:qa-channel:group:group:lab" | "web_fetch" | {"url":"http://127.0.0.1:32766/web/page1"} | "Tool web_fetch not found" |
| a-group-bob | "agent:main:qa-channel:group:group:lab" | "read" | {"path":"probe-input.txt"} | — |
| a-group-bob | "agent:main:qa-channel:group:group:lab" | "exec" | {"command":"echo exec-output-1"} | — |
| a-group-bob | "agent:main:qa-channel:group:group:lab" | "web_fetch" | {"url":"http://127.0.0.1:32766/web/page1"} | "Tool web_fetch not found" |
| c2-bob-dm | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | "Approval timed out" |
| c2-bob-group | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | "Approval timed out" |

## Hook counts
`__approval_request` ×3, `__approval_resolution` ×2, `__command` ×4, `__register` ×2, `after_tool_call` ×14, `agent_end` ×6, `agent_turn_prepare` ×7, `before_agent_finalize` ×6, `before_agent_reply` ×7, `before_agent_run` ×7, `before_dispatch` ×15, `before_message_write` ×49, `before_model_resolve` ×7, `before_prompt_build` ×7, `before_tool_call` ×11, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×7, `llm_output` ×6, `message_received` ×15, `message_sending` ×14, `model_call_ended` ×21, `model_call_started` ×21, `reply_dispatch` ×15, `reply_payload_sending` ×14, `resolve_exec_env` ×7, `tool_result_persist` ×14
