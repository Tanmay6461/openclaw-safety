# Phase 0 channel report
Run: `/pg/runs/ch-base3` · probe events: 623 · model calls: 42

## Driver steps
| Test | Step | Note |
|---|---|---|
| a-dm-alice | agent_end | ok |
| a-dm-bob | agent_end | ok |
| a-group-alice | agent_end | ok |
| a-group-bob | agent_end | ok |
| b-guard-alice-direct | result | handler=true replies=1 agentRun=false |
| b-guardauth-alice-direct | result | handler=true replies=1 agentRun=false |
| b-guard-native-alice-direct | result | handler=true replies=1 agentRun=false |
| b-guard-bob-direct | result | handler=false replies=1 agentRun=false |
| b-guardauth-bob-direct | result | handler=false replies=1 agentRun=false |
| b-guard-native-bob-direct | result | handler=false replies=1 agentRun=false |
| b-guard-bob-group | result | handler=false replies=1 agentRun=false |
| b-guardauth-bob-group | result | handler=false replies=1 agentRun=false |
| b-guard-native-bob-group | result | handler=false replies=1 agentRun=false |
| b-guard-alice-group | result | handler=true replies=1 agentRun=false |
| b-guardauth-alice-group | result | handler=true replies=1 agentRun=false |
| b-guard-native-alice-group | result | handler=true replies=1 agentRun=false |
| c1-owner | approval-prompt | id=plugin:f4808d12-3cd9-4532-bcad-0b9acf05dde2 |
| c1-owner | resolution | decision=allow-once |
| c1-owner | agent_end | ok |
| c2-bob-dm | approval-prompt | id=plugin:750a928c-9803-4c5b-af59-a375edc256c3 |
| c2-bob-dm | resolution | none within 15000ms |
| c2-bob-dm | bob-replies |  |
| c2-bob-dm | resolution | decision=deny |
| c2-bob-group | approval-prompt | id=plugin:16ed6c0d-388e-47bd-81dc-be773bcd97c3 |
| c2-bob-group | resolution | none within 15000ms |
| c2-bob-group | bob-replies |  |
| c2-bob-group | resolution | decision=deny |
| c3-self-cli | approval-prompt | id=plugin:6ff72387-bc44-4c2b-b971-49b15d4581c6 |
| c3-self-cli | cli |  |
| c3-self-cli | resolution | none within 10000ms |
| c3-self-cli | echo-outbound |  |
| c3-self-cli | resolution | decision=cancelled |
| c3-guard-echo | cli |  |
| c3-guard-echo | result | handler=false |
| c4-exec-cli | approval-prompt | id=plugin:5e97d411-b05b-4b51-ad45-ea8c74148add |
| c4-exec-cli | cli |  |
| c4-exec-cli | resolution | none within 10000ms |
| c4-exec-cli | resolution | decision=cancelled |
| c5-race | approval-prompt | id=plugin:59b4a928-b54f-4665-95a8-dc9f7c84cc51 |
| c5-race | resolution | decision=allow-once |
| c5-race | exec-params | ran=["echo from-high-priority"] |
| c6-both | approval-prompt | id=plugin:05adf318-e40b-4f51-840e-b764437c1036 |
| c6-both | resolution | decision=allow-once |
| c6-both | summary |  |
| d-spawn | done |  |
| d-send | done |  |
|  | driver-done |  |

## message_received (event, ctx)
| Test | event.from | event.metadata/sender | ctx |
|---|---|---|---|
| a-dm-alice | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"c1950129-3bc3-4413-b631-e2ebc2a78d9b","senderId":"alice"} |
| a-dm-bob | "dm:bob" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:bob","sessionKey":"agent:main:qa-channel:direct:dm:bob","messageId":"08e413ec-1129-41c6-a000-16952538d4b1","senderId":"bob"} |
| a-group-alice | "group:lab" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"15d7f8cb-e93c-45da-8922-fc1d1e741b49","senderId":"alice"} |
| a-group-bob | "group:lab" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"c8bf4ed0-518f-47d2-bca9-69b7d19dc54e","senderId":"bob"} |
| b | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"422ff4a2-30d1-4e26-adbf-db23d3835b15","senderId":"alice"} |
| b | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"5e47c737-fafe-4a36-b811-462b394d8cc7","senderId":"alice"} |
| b | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"418186fa-c587-443b-81ae-d382bb17bf3f","senderId":"alice"} |
| b | "dm:bob" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:bob","sessionKey":"agent:main:qa-channel:direct:dm:bob","messageId":"7a982d94-97a8-4af8-8498-71cd9a3d43bd","senderId":"bob"} |
| b | "dm:bob" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:bob","sessionKey":"agent:main:qa-channel:direct:dm:bob","messageId":"9f496bb9-c509-479f-84ee-a8bea993dedd","senderId":"bob"} |
| b | "dm:bob" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:bob","sessionKey":"agent:main:qa-channel:slash:bob","messageId":"06ad2dcd-4803-41bd-9d90-7a572bee8526","senderId":"bob"} |
| b | "group:lab" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"4012cf27-cf8c-4b8f-8ab2-41222d4432f0","senderId":"bob"} |
| b | "group:lab" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"525f5e52-3fb7-4acc-8f54-56bfaadab0db","senderId":"bob"} |
| b | "group:lab" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:slash:bob","messageId":"dce79d32-ead3-48dc-ba46-7b0ed7638103","senderId":"bob"} |
| b | "group:lab" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"8b42924a-9f63-441d-ad67-25fe26326eee","senderId":"alice"} |
| b | "group:lab" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"d2dbcb37-4d8e-42cb-bf19-3322d1c809ec","senderId":"alice"} |
| b | "group:lab" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"d9ce16d6-f741-4580-85b6-b715e95139c0","senderId":"alice"} |
| c1-owner | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"977dc077-839b-46f8-a0d3-cc81b28799c3","senderId":"alice"} |
| c1-owner | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"d012cb71-ee18-4f88-b406-e26f3161dce9","senderId":"alice"} |
| c2-bob-dm | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"1c89cab3-2571-4d81-8d6e-788e71fdbcab","senderId":"alice"} |
| c2-bob-dm | "dm:bob" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:bob","sessionKey":"agent:main:qa-channel:slash:bob","messageId":"daa4e6f5-4a7f-4c3c-8265-ea93f4e1fe64","senderId":"bob"} |
| c2-bob-dm | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"c2182155-4e1b-4ac9-8c67-ccb3e81f8a91","senderId":"alice"} |
| c2-bob-group | "group:lab" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:group:group:lab","messageId":"c5bab958-aa1e-4e5c-89eb-969004ad360b","senderId":"alice"} |
| c2-bob-group | "group:lab" | {"senderId":"bob","senderName":"bob","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:slash:bob","messageId":"0d01230e-681d-44ee-95e7-3200f669944a","senderId":"bob"} |
| c2-bob-group | "group:lab" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"group:lab","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"af8dff44-bacd-4484-83e5-f308994db2e8","senderId":"alice"} |
| c3-self-cli | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"8216f24f-71e8-4f44-a3b8-bb300d957978","senderId":"alice"} |
| c3-self-cli | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"ed983f67-9e25-4a8d-95aa-9908ec77fbf3","senderId":"alice"} |
| c4-exec-cli | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"6648beb6-690e-4efd-a115-34724feea52b","senderId":"alice"} |
| c4-exec-cli | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"df7bc3de-6217-4887-bb6b-16b05461fe9a","senderId":"alice"} |
| c5-race | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"91c7a802-7225-4ed5-aad2-df65da11d42f","senderId":"alice"} |
| c5-race | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"109524d7-0d97-46ff-95b1-3d1b61256d0d","senderId":"alice"} |
| c6-both | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"f4f234ee-9af3-4e4a-b804-e501cf043f68","senderId":"alice"} |
| c6-both | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:slash:alice","messageId":"31748a7a-f5ad-46b6-92d3-e1e84da4bf4a","senderId":"alice"} |
| d-spawn | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"c034dfc5-41c0-4cd8-8d82-fd9f0a612e8c","senderId":"alice"} |
| d-send | "dm:alice" | {"senderId":"alice","senderName":"alice","provider":"qa-channel","surface":"qa-channel"} | {"channelId":"qa-channel","accountId":"default","conversationId":"dm:alice","sessionKey":"agent:main:qa-channel:direct:dm:alice","messageId":"7726ca67-f3de-4000-a507-8a8be5d62b54","senderId":"alice"} |

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
| c3-self-cli | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| c3-self-cli | "agent:main:pg-self-approve" | "user" | true | — | {} |
| c3-guard-echo | "agent:main:internal-session-effects:skill-workshop-review_de23320f-e0e6-46ef-9b9f-d4-8be8671b3ec0ebde" | "user" | true | — | {"ch":"lab","sender":"alice"} |
| c3-guard-echo | "agent:main:pg-self-guard" | "user" | true | — | {} |
| c4-exec-cli | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| c4-exec-cli | "agent:main:pg-self-exec" | "user" | true | — | {} |
| c5-race | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| c6-both | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| d-spawn | "agent:main:internal-session-effects:skill-workshop-review_10749df9-1aef-48ba-b57d-f2-aadb30f25184eb48" | "user" | true | — | {"ch":"alice","sender":"alice"} |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "user" | true | — | {"ch":"alice","sender":"alice"} |

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
| c3-self-cli | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| c4-exec-cli | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| c4-exec-cli | "agent:main:pg-self-exec" | "exec" | {"command":"T=$(node -e 'process.stdout.write(JSON.parse(require(\"fs\").readFileSync(process.argv[1],\"utf8\")).gateway.auth.token)' /pg/ru | {"senderIsOwner":true} |
| c5-race | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo original-params pg-approve-high"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |
| c6-both | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-high pg-approve-low both"} | {"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true} |

## Commands, approvals
- b: `__command` {"hook":"__command","command":"guard"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"senderIsOwner":true,"sessionKey":"agent:main:qa-channel:direct:dm:alice","from":"dm:alice","to":"dm:alice"}
- b: `__command` {"hook":"__command","command":"guardauth"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"sessionKey":"agent:main:qa-channel:direct:dm:alice","from":"dm:alice","to":"dm:alice"}
- b: `__command` {"hook":"__command","command":"guard"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"senderIsOwner":true,"sessionKey":"agent:main:qa-channel:direct:dm:alice","from":"dm:alice","to":"dm:alice"}
- b: `__command` {"hook":"__command","command":"guard"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"senderIsOwner":true,"sessionKey":"agent:main:qa-channel:group:group:lab","from":"group:lab","to":"group:lab"}
- b: `__command` {"hook":"__command","command":"guardauth"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"sessionKey":"agent:main:qa-channel:group:group:lab","from":"group:lab","to":"group:lab"}
- b: `__command` {"hook":"__command","command":"guard"} ctx={"senderId":"alice","channel":"qa-channel","isAuthorizedSender":true,"senderIsOwner":true,"sessionKey":"agent:main:qa-channel:group:group:lab","from":"group:lab","to":"group:lab"}
- c1-owner: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_17_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c1-owner: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"allow-once","toolName":"exec","toolCallId":"call_17_0"}
- c2-bob-dm: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_19_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c2-bob-dm: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"deny","toolName":"exec","toolCallId":"call_19_0"}
- c2-bob-group: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_21_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c2-bob-group: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"deny","toolName":"exec","toolCallId":"call_21_0"}
- c3-self-cli: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_23_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c3-self-cli: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"cancelled","toolName":"exec","toolCallId":"call_23_0"}
- c4-exec-cli: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_30_0","params":{"command":"echo pg-approve-low ok"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c4-exec-cli: `__approval_resolution` {"hook":"__approval_resolution","where":"low","decision":"cancelled","toolName":"exec","toolCallId":"call_30_0"}
- c5-race: `__approval_request` {"hook":"__approval_request","where":"high","toolName":"exec","toolCallId":"call_34_0","params":{"command":"echo original-params pg-approve-high"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c5-race: `__approval_resolution` {"hook":"__approval_resolution","where":"high","decision":"allow-once","toolName":"exec","toolCallId":"call_34_0"}
- c6-both: `__approval_request` {"hook":"__approval_request","where":"high","toolName":"exec","toolCallId":"call_36_0","params":{"command":"echo pg-approve-high pg-approve-low both"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c6-both: `__approval_request` {"hook":"__approval_request","where":"low","toolName":"exec","toolCallId":"call_36_0","params":{"command":"echo pg-approve-high pg-approve-low both"},"requester":{"channel":"qa-channel","accountId":"default","senderId":"alice","senderIsOwner":true}}
- c6-both: `__approval_resolution` {"hook":"__approval_resolution","where":"high","decision":"allow-once","toolName":"exec","toolCallId":"call_36_0"}

## after_tool_call
| Test | sessionKey | tool | params | error |
|---|---|---|---|---|
| a-dm-alice | "agent:main:qa-channel:direct:dm:alice" | "read" | {"path":"probe-input.txt"} | — |
| a-dm-alice | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo exec-output-1"} | — |
| a-dm-alice | "agent:main:qa-channel:direct:dm:alice" | "web_fetch" | {"url":"http://127.0.0.1:24746/web/page1"} | "Tool web_fetch not found" |
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "read" | {"path":"probe-input.txt"} | — |
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "exec" | {"command":"echo exec-output-1"} | — |
| a-dm-bob | "agent:main:qa-channel:direct:dm:bob" | "web_fetch" | {"url":"http://127.0.0.1:24746/web/page1"} | "Tool web_fetch not found" |
| a-group-alice | "agent:main:qa-channel:group:group:lab" | "read" | {"path":"probe-input.txt"} | — |
| a-group-alice | "agent:main:qa-channel:group:group:lab" | "exec" | {"command":"echo exec-output-1"} | — |
| a-group-alice | "agent:main:qa-channel:group:group:lab" | "web_fetch" | {"url":"http://127.0.0.1:24746/web/page1"} | "Tool web_fetch not found" |
| a-group-bob | "agent:main:qa-channel:group:group:lab" | "read" | {"path":"probe-input.txt"} | — |
| a-group-bob | "agent:main:qa-channel:group:group:lab" | "exec" | {"command":"echo exec-output-1"} | — |
| a-group-bob | "agent:main:qa-channel:group:group:lab" | "web_fetch" | {"url":"http://127.0.0.1:24746/web/page1"} | "Tool web_fetch not found" |
| c1-owner | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | — |
| c2-bob-dm | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | "Denied by user. The tool call did not run." |
| c2-bob-group | "agent:main:qa-channel:group:group:lab" | "exec" | {"command":"echo pg-approve-low ok"} | "Denied by user. The tool call did not run." |
| c3-self-cli | "agent:main:pg-self-approve" | "message" | {"action":"send","channel":"qa-channel","target":"dm:alice","message":"/approve plugin:6ff72387-bc44-4c2b-b971-49b15d4581c6 allow-once"} | "Tool message not found" |
| c3-self-cli | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | "Plugin approval required (gateway unavailable)" |
| c3-guard-echo | "agent:main:pg-self-guard" | "message" | {"action":"send","channel":"qa-channel","target":"dm:alice","message":"/guard status"} | "Tool message not found" |
| c4-exec-cli | "agent:main:pg-self-exec" | "exec" | {"command":"T=$(node -e 'process.stdout.write(JSON.parse(require(\"fs\").readFileSync(process.argv[1],\"utf8\")).gateway.auth.token)' /pg/ru | — |
| c4-exec-cli | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-low ok"} | "Plugin approval required (gateway unavailable)" |
| c5-race | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo from-high-priority"} | — |
| c6-both | "agent:main:qa-channel:direct:dm:alice" | "exec" | {"command":"echo pg-approve-high pg-approve-low both"} | — |
| d-spawn | "agent:main:qa-channel:direct:dm:alice" | "sessions_spawn" | {"task":"Child run. [scenario:child-exec]"} | "Tool sessions_spawn not found" |
| d-send | "agent:main:qa-channel:direct:dm:alice" | "sessions_send" | {"sessionKey":"agent:main:qa-channel:direct:dm:bob","message":"Relayed. [scenario:child-exec]"} | "Tool sessions_send not found" |

## Hook counts
`__approval_request` ×8, `__approval_resolution` ×7, `__command` ×6, `__register` ×2, `after_tool_call` ×24, `agent_end` ×16, `agent_turn_prepare` ×18, `before_agent_finalize` ×18, `before_agent_reply` ×18, `before_agent_run` ×18, `before_dispatch` ×25, `before_message_write` ×97, `before_model_resolve` ×16, `before_prompt_build` ×18, `before_tool_call` ×16, `before_tool_call:race-high` ×1, `before_tool_call:race-low` ×1, `cron_changed` ×2, `cron_reconciled` ×1, `gateway_start` ×1, `llm_input` ×18, `llm_output` ×18, `message_received` ×34, `message_sending` ×46, `message_sent` ×14, `model_call_ended` ×42, `model_call_started` ×42, `reply_dispatch` ×25, `reply_payload_sending` ×32, `resolve_exec_env` ×12, `session_start` ×3, `tool_result_persist` ×24
