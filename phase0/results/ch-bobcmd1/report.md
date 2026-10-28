# Phase 0 channel report
Run: `/pg/runs/ch-bobcmd1` · probe events: 222 · model calls: 10

## Driver steps
| Test | Step | Note |
|---|---|---|
| a-dm-bob | agent_end | ok |
| b-guard-alice-direct | result | handler=true replies=1 agentRun=false |
| b-guardauth-alice-direct | result | handler=true replies=1 agentRun=false |
| b-guard-native-alice-direct | result | handler=true replies=1 agentRun=false |
| b-guard-bob-direct | result | handler=false replies=1 agentRun=false |
| b-guardauth-bob-direct | result | handler=true replies=1 agentRun=false |
| b-guard-native-bob-direct | result | handler=false replies=1 agentRun=false |
| b-guard-bob-group | result | handler=false replies=1 agentRun=false |
| b-guardauth-bob-group | result | handler=true replies=1 agentRun=false |
| b-guard-native-bob-group | result | handler=false replies=1 agentRun=false |
| b-guard-alice-group | result | handler=true replies=1 agentRun=false |
| b-guardauth-alice-group | result | handler=true replies=1 agentRun=false |
| b-guard-native-alice-group | result | handler=true replies=1 agentRun=false |
| c1-owner | approval-prompt | id=plugin:9a5c0ab9-382f-4c05-bb2f-6795e0fa66f3 |
| c1-owner | resolution | decision=allow-once |
| c1-owner | agent_end | ok |
| c2-bob-dm | approval-prompt | id=plugin:d25770fa-9655-4a55-a612-812c2671417f |
| c2-bob-dm | resolution | decision=allow-once |
| c2-bob-dm | bob-replies |  |
| c2-bob-group | approval-prompt | id=plugin:7f1a2de3-2329-417e-bcdf-982fd9648356 |
| c2-bob-group | resolution | decision=allow-once |
| c2-bob-group | bob-replies |  |
|  | driver-done |  |

## message_received (event, ctx)
| Test | event.from | event.metadata/sender | ctx |
|---|---|---|---|
| a-dm-bob | "dm:bob" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:bob","sessionKey":"agent:main:qa-channel:direct:dm:bob","messageId":"fec1e427-00b7-4432-90da-0a4779b6d577","senderId":"bob"} |
| b | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"8bc7f217-1d90-4b66-82d1-5bc44e896c5e","senderId":"alice"} |
| b | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"93fd6a7b-eae2-4882-beac-4af5df5a3bb8","senderId":"alice"} |
| b | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"52d05fe5-9cab-4aca-8b95-864fa2d3d735","senderId":"alice"} |
| b | "dm:bob" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:bob","sessionKey":"agent:main:qa-channel:direct:dm:bob","messageId":"9c830a61-2bd8-4441-93a1-68626a66e83c","senderId":"bob"} |
| b | "dm:bob" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:bob","sessionKey":"agent:main:qa-channel:direct:dm:bob","messageId":"e0725a35-6a8b-4430-b949-bc979fb335a8","senderId":"bob"} |
| b | "dm:bob" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:bob","sessionKey":"agent:main:qa-channel:slash:bob","messageId":"619e6534-94d9-43e3-abee-85c2a9990f44","senderId":"bob"} |
| b | "group:lab" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"40ec8dfc-8918-49e7-ac7f-034edaf833c7","senderId":"bob"} |
| b | "group:lab" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"754f0373-34e2-4a86-9305-4fc8f4fd9e5f","senderId":"bob"} |
| b | "group:lab" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:slash:bob","messageId":"b1cda2c5-4c38-4a71-8aa1-73b4dbd5d696","senderId":"bob"} |
| b | "group:lab" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"8cd97497-bce6-4c2f-a5a7-c1a4d3d755dd","senderId":"alice"} |
| b | "group:lab" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"97403bd4-82e0-42d9-8a81-bf8c182a9635","senderId":"alice"} |
| b | "group:lab" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"63c0fabb-528d-402f-9316-d6e2942161c2","senderId":"alice"} |
| c1-owner | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"0259ef3f-003b-4d18-8c71-884b045152db","senderId":"alice"} |
| c1-owner | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"bbc4c809-4977-4e7f-a4f2-e937b028f3cb","senderId":"alice"} |
| c2-bob-dm | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"1f474199-09cf-4d06-b13b-9d83c943aa23","senderId":"alice"} |
| c2-bob-dm | "dm:bob" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:bob","sessionKey":"agent:main:qa-channel:slash:bob","messageId":"ad717bc5-30ae-428c-83f5-eee643ac23a5","senderId":"bob"} |
| c2-bob-group | "group:lab" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"1c401928-73ea-47f8-8ce9-e4a8fde4f29f","senderId":"alice"} |
| c2-bob-group | "group:lab" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:slash:bob","messageId":"5c867937-414f-4adb-aaaf-019542dd2fe1","senderId":"bob"} |

## before_agent_run
| Test | sessionKey | trigger | senderIsOwner | inputProvenance | channel / sender |
|---|---|---|---|---|---|
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "user" | false | — | {"ch":"bob","sender":"bob"} |
| c1-owner | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| c2-bob-dm | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| c2-bob-group | "agent:main:qa-channel:group:group:lab" | "user" | true | — | {"ch":"group:lab","sender":"alice"} |

## before_tool_call requester
| Test | sessionKey | tool | params | ctx.requester |
|---|---|---|---|---|
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "read" | {"path":"probe-input.txt"} | {"channel":"qa-channel","accountId":"default","senderId":"bob","senderIsOwner":false} |
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "exec" | {"command":"echo exec-output-1"} | {"channel":"qa-channel","accountId":"default","senderId":"bob","senderIsOwner":false} |
| c1-owner | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| c2-bob-dm | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| c2-bob-group | "agent:main:qa-channel:group:group:lab" | "exec" | {"command":"echo pg-approve-low ok"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |

## Commands, approvals
- b: `__command` {"hook":"__command","command":"guard"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"senderIsOwner":true,"sessionKey":"agent:main:qa-channel:direct:dm:alice","from":"dm:alice","to":"dm:alice"}
- b: `__command` {"hook":"__command","command":"guardauth"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"sessionKey":"agent:main:qa-channel:direct:dm:alice","from":"dm:alice","to":"dm:alice"}
- b: `__command` {"hook":"__command","command":"guard"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"senderIsOwner":true,"sessionKey":"agent:main:qa-channel:direct:dm:alice","from":"dm:alice","to":"dm:alice"}
- b: `__command` {"hook":"__command","command":"guardauth"} ctx={"senderId":"bob","channel":"qa-channel","isAuthorizedSender":true,"sessionKey":"agent:main:qa-channel:direct:dm:bob","from":"dm:bob","to":"dm:bob"}
- b: `__command` {"hook":"__command","command":"guardauth"} ctx={"senderId":"bob","channel":"qa-channel","isAuthorizedSender":true,"sessionKey":"agent:main:qa-channel:group:group:lab","from":"group:lab","to":"group:lab"}
- b: `__command` {"hook":"__command","command":"guard"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"senderIsOwner":true,"sessionKey":"agent:main:qa-channel:group:group:lab","from":"group:lab","to":"group:lab"}
- b: `__command` {"hook":"__command","command":"guardauth"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"sessionKey":"agent:main:qa-channel:group:group:lab","from":"group:lab","to":"group:lab"}
- b: `__command` {"hook":"__command","command":"guard"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"senderIsOwner":true,"sessionKey":"agent:main:qa-channel:group:group:lab","from":"group:lab","to":"group:lab"}
- c1-owner: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_5_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c1-owner: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"allow-once","toolName":"exec","toolCallId":"call_5_0"}
- c2-bob-dm: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_7_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c2-bob-dm: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"allow-once","toolName":"exec","toolCallId":"call_7_0"}
- c2-bob-group: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_9_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c2-bob-group: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"allow-once","toolName":"exec","toolCallId":"call_9_0"}

## after_tool_call
| Test | sessionKey | tool | params | error |
|---|---|---|---|---|
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "read" | {"path":"probe-input.txt"} | — |
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "exec" | {"command":"echo exec-output-1"} | — |
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "web_fetch" | {"url":"http://127.0.0.1:21424/web/page1"} | "Tool web_fetch not found" |
| c1-owner | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | — |
| c2-bob-dm | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | — |
| c2-bob-group | "agent:main:qa-channel:group:group:lab" | "exec" | {"command":"echo pg-approve-low ok"} | — |

## Hook counts
`__approval_request` ×3, `__approval_resolution` ×3, `__command` ×8, `__register` ×2, `after_tool_call` ×6, `agent_end` ×4, `agent_turn_prepare` ×4, `before_agent_finalize` ×4, `before_agent_reply` ×4, `before_agent_run` ×4, `before_dispatch` ×16, `before_message_write` ×24, `before_model_resolve` ×4, `before_prompt_build` ×4, `before_tool_call` ×5, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×4, `llm_output` ×4, `message_received` ×19, `message_sending` ×25, `message_sent` ×6, `model_call_ended` ×10, `model_call_started` ×10, `reply_dispatch` ×16, `reply_payload_sending` ×19, `resolve_exec_env` ×4, `tool_result_persist` ×6
