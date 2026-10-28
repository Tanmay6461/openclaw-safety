# Phase 0 channel report
Run: `/pg/runs/ch-base7` · probe events: 96 · model calls: 8

## Driver steps
| Test | Step | Note |
|---|---|---|
| a-dm-bob | agent_end | ok |
| d-send | done |  |
|  | driver-done |  |

## message_received (event, ctx)
| Test | event.from | event.metadata/sender | ctx |
|---|---|---|---|
| a-dm-bob | "dm:bob" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:bob","sessionKey":"agent:main:qa-channel:direct:dm:bob","messageId":"92dc127b-6235-43c4-b4de-04baa02069e6","senderId":"bob"} |
| d-send | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"a999ab2f-1ffe-4bd6-aad9-771d69fabd43","senderId":"alice"} |

## before_agent_run
| Test | sessionKey | trigger | senderIsOwner | inputProvenance | channel / sender |
|---|---|---|---|---|---|
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "user" | false | — | {"ch":"bob","sender":"bob"} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| d-send | "agent:main:qa-channel:direct:dm:bob" | "user" | false | {"kind":"inter_session","sourceSessionKey":"agent:main:qa-channel:direct:dm:alice","sourceChannel":"qa-channel","sourceTool":"sessions_send"} | {"ch":"webchat"} |

## before_tool_call requester
| Test | sessionKey | tool | params | ctx.requester |
|---|---|---|---|---|
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "read" | {"path":"probe-input.txt"} | {"channel":"qa-channel","accountId":"default","senderId":"bob","senderIsOwner":false} |
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "exec" | {"command":"echo exec-output-1"} | {"channel":"qa-channel","accountId":"default","senderId":"bob","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "tool_call" | {"id":"sessions_send","args":{"sessionKey":"agent:main:qa-channel:direct:dm:bob","message":"Relayed. [scenario:child-exec]"}} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "sessions_send" | {"sessionKey":"agent:main:qa-channel:direct:dm:bob","message":"Relayed. [scenario:child-exec]"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| d-send | "agent:main:qa-channel:direct:dm:bob" | "exec" | {"command":"echo child-exec"} | {"channel":"webchat","senderIsOwner":false} |

## Commands, approvals

## after_tool_call
| Test | sessionKey | tool | params | error |
|---|---|---|---|---|
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "read" | {"path":"probe-input.txt"} | — |
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "exec" | {"command":"echo exec-output-1"} | — |
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "web_fetch" | {"url":"http://127.0.0.1:24205/web/page1"} | "Tool web_fetch not found" |
| d-send | "agent:main:qa-channel:direct:dm:bob" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "sessions_send" | {"sessionKey":"agent:main:qa-channel:direct:dm:bob","message":"Relayed. [scenario:child-exec]"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "tool_call" | {"id":"sessions_send","args":{"sessionKey":"agent:main:qa-channel:direct:dm:bob","message":"Relayed. [scenario:child-exec]"}} | — |

## Hook counts
`__register` ×2, `after_tool_call` ×6, `agent_end` ×3, `agent_turn_prepare` ×3, `before_agent_finalize` ×3, `before_agent_reply` ×3, `before_agent_run` ×3, `before_dispatch` ×2, `before_message_write` ×19, `before_model_resolve` ×3, `before_prompt_build` ×3, `before_tool_call` ×5, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×3, `llm_output` ×3, `message_received` ×2, `message_sending` ×2, `model_call_ended` ×8, `model_call_started` ×8, `reply_dispatch` ×2, `reply_payload_sending` ×2, `resolve_exec_env` ×2, `tool_result_persist` ×5
