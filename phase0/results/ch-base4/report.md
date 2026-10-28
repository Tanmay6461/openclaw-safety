# Phase 0 channel report
Run: `/pg/runs/ch-base4` · probe events: 2654 · model calls: 320

## Driver steps
| Test | Step | Note |
|---|---|---|
| c3-self-cli | approval-prompt | id=plugin:656d9b96-3acd-48e2-8af6-141ebcc20e2c |
| c3-self-cli | cli |  |
| c3-self-cli | resolution | none within 10000ms |
| c3-self-cli | echo-outbound |  |
| c3-self-cli | resolution | decision=cancelled |
| c3-guard-echo | cli |  |
| c3-guard-echo | result | handler=false |
| c4b-approvals-cli | approval-prompt | id=plugin:406028f9-512d-422b-a7b7-af92a136c1f9 |
| c4b-approvals-cli | cli |  |
| c4b-approvals-cli | resolution | decision=cancelled |
| d-spawn | done |  |
| d-send | done |  |
|  | driver-done |  |

## message_received (event, ctx)
| Test | event.from | event.metadata/sender | ctx |
|---|---|---|---|
| c3-self-cli | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"222116dd-3502-4a3b-996e-aebcf7294445","senderId":"alice"} |
| c3-self-cli | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"7c11a034-d83a-4b54-bb6b-467f3815f225","senderId":"alice"} |
| c4b-approvals-cli | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"f982bdea-4830-4aca-8019-88cc3b2193e2","senderId":"alice"} |
| d-spawn | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"a3696dd7-fc71-4c7d-9fd4-1a8be3951876","senderId":"alice"} |
| d-send | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"c1bbedaf-1e47-4ff5-9658-fe830e182146","senderId":"alice"} |

## before_agent_run
| Test | sessionKey | trigger | senderIsOwner | inputProvenance | channel / sender |
|---|---|---|---|---|---|
| c3-self-cli | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| c3-self-cli | "agent:main:pg-self-approve" | "user" | true | — | {} |
| c3-guard-echo | "agent:main:pg-self-guard" | "user" | true | — | {} |
| c4b-approvals-cli | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| c4b-approvals-cli | "agent:main:pg-self-exec-cli" | "user" | true | — | {} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| d-spawn | "agent:main:subagent:f39d51fe-7e4a-4126-8f1e-bab33893937b" | "user" | false | — | {"ch":"alice"} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "user" | false | {"kind":"inter_session","sourceSessionKey":"agent:main:subagent:f39d51fe-7e4a-4126-8f1e-bab33893937b","sourceChannel":"internal","sourceTool":"subagent_announce"} | {"ch":"alice"} |

## before_tool_call requester
| Test | sessionKey | tool | params | ctx.requester |
|---|---|---|---|---|
| c3-self-cli | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| c3-self-cli | "agent:main:pg-self-approve" | "tool_call" | {"id":"message","args":{"action":"send","channel":"qa-channel","target":"dm:alice","message":"/approve plugin:656d9b96-3acd-48e2-8af6-141ebc | {"senderIsOwner":true} |
| c3-self-cli | "agent:main:pg-self-approve" | "message" | {"action":"send","channel":"qa-channel","target":"dm:alice","message":"/approve plugin:656d9b96-3acd-48e2-8af6-141ebcc20e2c allow-once"} | {"senderIsOwner":true} |
| c3-guard-echo | "agent:main:pg-self-guard" | "tool_call" | {"id":"message","args":{"action":"send","channel":"qa-channel","target":"dm:alice","message":"/guard status"}} | {"senderIsOwner":true} |
| c3-guard-echo | "agent:main:pg-self-guard" | "message" | {"action":"send","channel":"qa-channel","target":"dm:alice","message":"/guard status"} | {"senderIsOwner":true} |
| c4b-approvals-cli | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| c4b-approvals-cli | "agent:main:pg-self-exec-cli" | "exec" | {"command":"T=$(node -e 'process.stdout.write(JSON.parse(require(\"fs\").readFileSync(process.argv[1],\"utf8\")).gateway.auth.token)' /pg/ru | {"senderIsOwner":true} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "tool_call" | {"id":"sessions_spawn","args":{"task":"Child run. [scenario:child-exec]"}} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "sessions_spawn" | {"task":"Child run. [scenario:child-exec]"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| d-spawn | "agent:main:subagent:f39d51fe-7e4a-4126-8f1e-bab33893937b" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | {"channel":"qa-channel","accountId":"default","senderIsOwner":false} |

## Commands, approvals
- c3-self-cli: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_1_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c3-self-cli: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"cancelled","toolName":"exec","toolCallId":"call_1_0"}
- c4b-approvals-cli: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_7_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c4b-approvals-cli: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"cancelled","toolName":"exec","toolCallId":"call_7_0"}

## after_tool_call
| Test | sessionKey | tool | params | error |
|---|---|---|---|---|
| c3-self-cli | "agent:main:pg-self-approve" | "message" | {"action":"send","channel":"qa-channel","target":"dm:alice","message":"/approve plugin:656d9b96-3acd-48e2-8af6-141ebcc20e2c allow-once"} | — |
| c3-self-cli | "agent:main:pg-self-approve" | "tool_call" | {"id":"message","args":{"action":"send","channel":"qa-channel","target":"dm:alice","message":"/approve plugin:656d9b96-3acd-48e2-8af6-141ebc | — |
| c3-self-cli | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | "Plugin approval required (gateway unavailable)" |
| c3-guard-echo | "agent:main:pg-self-guard" | "message" | {"action":"send","channel":"qa-channel","target":"dm:alice","message":"/guard status"} | — |
| c3-guard-echo | "agent:main:pg-self-guard" | "tool_call" | {"id":"message","args":{"action":"send","channel":"qa-channel","target":"dm:alice","message":"/guard status"}} | — |
| c4b-approvals-cli | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | "Plugin approval required (gateway unavailable)" |
| c4b-approvals-cli | "agent:main:pg-self-exec-cli" | "exec" | {"command":"T=$(node -e 'process.stdout.write(JSON.parse(require(\"fs\").readFileSync(process.argv[1],\"utf8\")).gateway.auth.token)' /pg/ru | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "sessions_spawn" | {"task":"Child run. [scenario:child-exec]"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "tool_call" | {"id":"sessions_spawn","args":{"task":"Child run. [scenario:child-exec]"}} | — |
| d-spawn | "agent:main:subagent:f39d51fe-7e4a-4126-8f1e-bab33893937b" | "exec" | {"command":"echo child-exec"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo child-exec"} | — |

## Hook counts
`__approval_request` ×2, `__approval_resolution` ×2, `__register` ×2, `after_tool_call` ×315, `agent_end` ×7, `agent_turn_prepare` ×8, `before_agent_finalize` ×7, `before_agent_reply` ×8, `before_agent_run` ×8, `before_dispatch` ×4, `before_message_write` ×646, `before_model_resolve` ×8, `before_prompt_build` ×8, `before_tool_call` ×316, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×8, `llm_output` ×7, `message_received` ×5, `message_sending` ×8, `message_sent` ×4, `model_call_ended` ×320, `model_call_started` ×320, `reply_dispatch` ×4, `reply_payload_sending` ×4, `resolve_exec_env` ×310, `session_start` ×3, `subagent_delivery_target` ×1, `subagent_progress` ×2, `subagent_spawned` ×1, `tool_result_persist` ×312
