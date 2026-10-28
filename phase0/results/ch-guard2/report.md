# Phase 0 channel report
Run: `/pg/runs/ch-guard2` · probe events: 82 · model calls: 6

## Driver steps
| Test | Step | Note |
|---|---|---|
| a-dm-alice | agent_end | ok |
| c1-owner | approval-prompt | id=plugin:96fc35ca-abe8-4030-ab02-66a76e9ea363 |
| c1-owner | resolution | decision=cancelled |
| c1-owner | agent_end | ok |
|  | driver-done |  |

## message_received (event, ctx)
| Test | event.from | event.metadata/sender | ctx |
|---|---|---|---|
| a-dm-alice | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"7110e0cc-c695-41c6-a50d-495434c34222","senderId":"alice"} |
| c1-owner | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"8a835774-9d0e-44ee-91d5-397ff846a9de","senderId":"alice"} |
| c1-owner | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"3765d354-3f0c-48da-9ca7-632bfb129833","senderId":"alice"} |

## before_agent_run
| Test | sessionKey | trigger | senderIsOwner | inputProvenance | channel / sender |
|---|---|---|---|---|---|
| a-dm-alice | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| c1-owner | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |

## before_tool_call requester
| Test | sessionKey | tool | params | ctx.requester |
|---|---|---|---|---|
| a-dm-alice | "agent:main:qa-channel:direct:dm:alice" | "read" | {"path":"probe-input.txt"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| a-dm-alice | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo exec-output-1"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| c1-owner | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |

## Commands, approvals
- c1-owner: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_5_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c1-owner: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"cancelled","toolName":"exec","toolCallId":"call_5_0"}

## after_tool_call
| Test | sessionKey | tool | params | error |
|---|---|---|---|---|
| a-dm-alice | "agent:main:qa-channel:direct:dm:alice" | "read" | {"path":"probe-input.txt"} | — |
| a-dm-alice | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo exec-output-1"} | — |
| a-dm-alice | "agent:main:qa-channel:direct:dm:alice" | "web_fetch" | {"url":"http://127.0.0.1:23516/web/page1"} | "Tool web_fetch not found" |
| c1-owner | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | "Plugin approval required (gateway unavailable)" |

## Hook counts
`__approval_request` ×1, `__approval_resolution` ×1, `__register` ×2, `after_tool_call` ×4, `agent_end` ×2, `agent_turn_prepare` ×2, `before_agent_finalize` ×2, `before_agent_reply` ×2, `before_agent_run` ×2, `before_dispatch` ×2, `before_message_write` ×14, `before_model_resolve` ×2, `before_prompt_build` ×2, `before_tool_call` ×3, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×2, `llm_output` ×2, `message_received` ×3, `message_sending` ×5, `message_sent` ×2, `model_call_ended` ×6, `model_call_started` ×6, `reply_dispatch` ×2, `reply_payload_sending` ×3, `resolve_exec_env` ×2, `tool_result_persist` ×4
