# Phase 0 channel report
Run: `/pg/runs/ch-guard4` · probe events: 105 · model calls: 6

## Driver steps
| Test | Step | Note |
|---|---|---|
| w-slash-alice | result | replies=0 |
| w-slash-bob | result | replies=0 |
| e1-double | prompt | 54d49ffb-16c8-4073-b4b8-6a6c8c3e129d |
| e1-double | summary | prompts=1 ran=true |
| r1-react | summary | ask |
|  | driver-done |  |

## message_received (event, ctx)
| Test | event.from | event.metadata/sender | ctx |
|---|---|---|---|
| w-slash | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"2e6587b9-dce9-4e63-9c3b-2c0f0d28a8e8","senderId":"alice"} |
| w-slash | "dm:bob" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:bob","sessionKey":"agent:main:qa-channel:slash:bob","messageId":"abd9bf50-d3e1-475a-bb30-ab368946f949","senderId":"bob"} |
| e1-double | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"15379efc-cfaf-4dc8-a34d-f8028566b5af","senderId":"alice"} |
| e1-double | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"c79f6881-5258-4132-a613-a72986b81ae8","senderId":"alice"} |
| r1-react | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"b51a65ce-e656-4cdb-bcf1-43591b0b3077","senderId":"alice"} |
| r1-react | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"92db1149-b311-4865-8c0d-9f73ac8f9397","senderId":"alice"} |

## before_agent_run
| Test | sessionKey | trigger | senderIsOwner | inputProvenance | channel / sender |
|---|---|---|---|---|---|
| e1-double | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| r1-react | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| r1-react | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |

## before_tool_call requester
| Test | sessionKey | tool | params | ctx.requester |
|---|---|---|---|---|
| e1-double | "agent:main:qa-channel:direct:dm:alice" | "tool_call" | {"id":"web_fetch","args":{"url":"http://127.0.0.1:36989/web/page1"}} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| e1-double | "agent:main:qa-channel:direct:dm:alice" | "web_fetch" | {"url":"http://127.0.0.1:36989/web/page1"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| e1-double | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-double-prompt"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| r1-react | "agent:main:qa-channel:direct:dm:alice" | "tool_call" | {"id":"message","args":{"action":"react","channel":"qa-channel","target":"dm:alice","messageId":"01784f4b-0b06-47e6-a168-2777647b4dc5","emoj | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| r1-react | "agent:main:qa-channel:direct:dm:alice" | "tool_call" | {"id":"message","args":{"action":"react","channel":"qa-channel","target":"dm:alice","messageId":"b51a65ce-e656-4cdb-bcf1-43591b0b3077","emoj | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| r1-react | "agent:main:qa-channel:direct:dm:alice" | "message" | {"action":"react","channel":"qa-channel","target":"dm:alice","messageId":"b51a65ce-e656-4cdb-bcf1-43591b0b3077","emoji":"👍"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |

## Commands, approvals
- w-slash: `__command` {"hook":"__command","command":"guardauth"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"sessionKey":"agent:main:qa-channel:direct:dm:alice","from":"dm:alice","to":"dm:alice"}

## after_tool_call
| Test | sessionKey | tool | params | error |
|---|---|---|---|---|
| e1-double | "agent:main:qa-channel:direct:dm:alice" | "web_fetch" | {"url":"http://127.0.0.1:36989/web/page1"} | — |
| e1-double | "agent:main:qa-channel:direct:dm:alice" | "tool_call" | {"id":"web_fetch","args":{"url":"http://127.0.0.1:36989/web/page1"}} | — |
| e1-double | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-double-prompt"} | — |
| r1-react | "agent:main:qa-channel:direct:dm:alice" | "tool_call" | {"id":"message","args":{"action":"react","channel":"qa-channel","target":"dm:alice","messageId":"01784f4b-0b06-47e6-a168-2777647b4dc5","emoj | "[Guard] Reacting with 👍 can answer an approval prompt, so the agent may only use approval emoji on messages it received from someone." |

## Hook counts
`__command` ×1, `__register` ×2, `after_tool_call` ×4, `agent_end` ×2, `agent_turn_prepare` ×3, `before_agent_finalize` ×2, `before_agent_reply` ×3, `before_agent_run` ×3, `before_dispatch` ×5, `before_message_write` ×16, `before_model_resolve` ×3, `before_prompt_build` ×3, `before_tool_call` ×6, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×3, `llm_output` ×2, `message_received` ×6, `message_sending` ×8, `message_sent` ×3, `model_call_ended` ×6, `model_call_started` ×6, `reply_dispatch` ×5, `reply_payload_sending` ×5, `resolve_exec_env` ×1, `tool_result_persist` ×3
