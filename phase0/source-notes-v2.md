# Provenance Guard Phase 0: source notes v2 (OpenClaw v2026.10.8)

- **Ref:** `v2026.10.8`. Every file below was read as text through the GitHub contents API at that tag (raw media type). The full file list came from the git tree API.
- **Method:** `gh search code` (default branch only) was used only to find candidate paths. Every path cited was then re-read at the tag. Nothing was cloned, installed, or executed.
- **Line numbers** are for the tag.
- **Confidence labels:**
  - **src**: confirmed in source.
  - **docs**: stated in docs at the tag.
  - **inferred**: reasoned from source, not tested.
  - **runtime**: needs a cluster test.

---

## Q1. Approval reactions

### 1.1 Emoji to decision mapping

**WhatsApp, Signal, iMessage (shared SDK set)** (src)

Canonical bindings, in display order (`src/plugin-sdk/approval-reaction-runtime.ts:182-186`):

| Emoji | Decision | Label |
|---|---|---|
| `👍` | `allow-once` | "Allow Once" |
| `♾️` (U+221E U+FE0F) | `allow-always` | "Allow Always" |
| `👎` | `deny` | "Deny" |

- **Normalization** (`approval-reaction-runtime.ts:189-190, 250-260`):
  - variation selectors U+FE0E/U+FE0F are stripped;
  - Fitzpatrick skin-tone modifiers U+1F3FB..U+1F3FF are stripped, so 👍🏻..👍🏿 and 👎🏽 etc. all match;
  - a bare `♾` (no VS16) is mapped back to `♾️`.
- **No other aliases.** ✅, ❤️, 🙏 and `+1` text do not match.
- A decision only matches if it is in the request's `allowedDecisions` (`:263-277`, `listApprovalReactionBindings` `:193-204`).
- The prompt text carries a `React with:` hint listing `emoji label` lines (`:207-215`).
- **Docs/source mismatch:** the WhatsApp docs mention only 👍/👎 (`docs/channels/whatsapp.md:216`). Source also accepts ♾️ whenever `allow-always` is allowed.
- **iMessage** maps tapback text to emoji (`extensions/imessage/src/monitor/reaction-context.ts:17-28`):
  - "liked" → 👍, "disliked" → 👎. "loved", "laughed at", "emphasized" and "questioned" map to ❤️, 😂, ‼️, ❓, none of which are bindings.
  - `reaction_emoji` (custom emoji tapback) is also read (`:92-93`).
  - Tapback removal is ignored (`extensions/imessage/src/approval-reactions.ts:452-455`).

**Matrix (own set)** (src)

- Bindings `extensions/matrix/src/approval-reactions.ts:12-17`: `✅` = `allow-once`, `♾️` = `allow-always`, `❌` = `deny`.
- Matching is exact after `trim()` only (`:150-163`). There is no skin-tone or VS normalization, so a bare `♾` will **not** match on Matrix.
- Also documented at `docs/tools/exec-approvals.md:103-108`.

### 1.2 Must the reaction target the prompt message?

**Yes** (src).

- WhatsApp registers a target keyed `accountId:remoteJid:messageId` (`extensions/whatsapp/src/reaction-target.ts:1-10`):
  - for native session prompts: the key is the message id that Baileys returned for the delivered prompt (`approval-handler.runtime.ts:83-108` deliverPending → `:125-136` bindPending → `approval-reactions.ts:177-208`);
  - for forwarded (target-mode) prompts: every delivered message id is bound, after a visible-text correlation check (`approval-reactions.ts:91-153, 211-254`).
- **Lookup** (`approval-reactions.ts:291-325, 356-385`):
  - The message id comes from `reactionMessage.key.id`.
  - The chat comes from `reactionMessage.key.remoteJid` and `msg.key.remoteJid`, plus LID/phone alias mapping.
  - A reaction on any other message returns `false` and goes on to normal inbound handling.
- **TTL:** the approval's remaining lifetime (`approval-handler.runtime.ts:133`), or 24 h by default (`approval-reactions.ts:32`). Store namespace `whatsapp.approval-reactions`, at most 1000 entries (`:30-31`).
- The binding is cleared after any terminal resolution (`approval-reaction-runtime.ts:163-166`).
- **Other channels:**
  - Signal also requires that the reaction's target author is the bot account (`extensions/signal/src/approval-reactions.ts:405-415`).
  - iMessage probes every GUID alias of the tapback target (`imessage/src/approval-reactions.ts:395-470`).

### 1.3 Who counts as the actor

- **Actor JID** (`approval-reactions.ts:340-344`):
  - `msg.key.participant` (groups);
  - else, if `msg.key.fromMe`, the **self LID or self JID**;
  - else `msg.key.remoteJid` (the DM peer).
  - The JID is mapped to E.164 through `resolveInboundJid` (`:387`). If it can't be mapped, the reaction is consumed and ignored (`:388-393`).
- **Approvers** are the WhatsApp account's `allowFrom` entries, normalized, with group JIDs dropped (`extensions/whatsapp/src/approval-auth.ts:5-26`; `src/plugin-sdk/approval-approvers.ts:13-39`).
  - `"*"` in `allowFrom` authorizes **any** actor for the approve action (`approval-auth.ts:25`).
  - There is no separate `approvers` key on WhatsApp.
  - `defaultTo` is not an approver (docs `whatsapp.md:235`).
- **`settleApprovalReaction` checks** (`approval-reaction-runtime.ts:116-143`):
  - an empty approver list means "denied; reactions require explicit approvers" (`:134-139`);
  - otherwise the actor must be in the list (`:140-143`, via `approval-auth-helpers.ts:73-90, 177-198`).
- **Self-chat:**
  - A `fromMe` reaction resolves as the account owner's number. Owner self-chat approval is a tested feature (`approval-reactions.test.ts:291-321`).
  - A `fromMe` reaction in a *peer* DM is attributed to self, not the peer (`:464-492`).
- **Groups:** the origin route needs explicit approvers (`approval-native.ts:38-41`).

**SECURITY FINDING (inferred; runtime test needed): the echo filter does not protect approval reactions on the live path.**

- In the live `messages.upsert` handler, `resolveApprovalReaction(msg)` runs at `extensions/whatsapp/src/inbound/message-delivery.ts:503`. That is **before** `shouldSkipRecentOutboundEcho(msg)` at `:517`.
- Both `notify` and `append` upserts are processed (`:489`).
- The echo-first ordering exists only in the durable replay path (`:418-425`).
- Consequence: suppose the bot itself sends a 👍 through its socket. For example, the `message` tool `react` action targets the approval prompt's `messageId` with `fromMe: true`. Baileys' default `emitOwnEvents` is not overridden (`session.ts:288-308`), so the reaction echoes back as a `fromMe` upsert, and it would resolve with actor = self. That actor is an approver whenever the owner's number is in `allowFrom` (the standard self-chat setup) or `allowFrom` contains `"*"`.
- Mitigating factor: the agent must know the prompt's WhatsApp message id. The prompt is sent by the host (`approval-handler.runtime.ts:89-98`), and its own echo is filtered from agent input. But the id can leak, for example if the owner quote-replies to the prompt, which exposes `replyToId` to the agent.
- **Applies to:** exec, plugin (`requireApproval`, including the Guard's own prompts) and system-agent approvals.

### 1.4 Which approval kinds

- **Exec, plugin and system-agent** (src): `approval-handler.runtime.ts:46`; `approval-native.ts:50-63`; target kinds `approval-reactions.ts:194-196`.

### 1.5 Enablement

**Off by default; enabled by config** (src + docs).

- Native delivery needs:
  - `approvals.exec.enabled: true` (exec and system-agent) or `approvals.plugin.enabled: true` (plugin);
  - the transport enabled;
  - a route that resolves to WhatsApp (`src/plugin-sdk/approval-native-helpers.ts:399-406`: `config?.enabled ? {mode: config.mode ?? defaultForwardingMode} : null`).
- The WhatsApp default mode is `"session"` (`approval-native.ts:32`): only approvals that originate from WhatsApp.
- `mode: "targets"` with `targets: [{channel: "whatsapp", to}]` uses forwarding. `"both"` is also accepted.
- There is no WhatsApp-specific reaction toggle.
- Docs: `docs/channels/whatsapp.md:214-236`. Setup hint text: `approval-native.ts:43-49`.

### 1.6 Other channels that resolve approvals from reactions (src)

| Channel | Emoji set | Approver source | Evidence |
|---|---|---|---|
| WhatsApp | 👍 / ♾️ / 👎 (SDK) | `allowFrom` | above |
| Signal | 👍 / ♾️ / 👎 (SDK) | Signal approvers; target-author check | `extensions/signal/src/approval-reactions.ts:395-420, 495-505`; `approval-reaction-routes.ts` |
| iMessage | 👍 / ♾️ / 👎 (SDK; tapbacks liked/disliked) | iMessage approvers | `extensions/imessage/src/approval-reactions.ts:411-487`; poller `approval-reaction-poller.ts` |
| Matrix | ✅ / ♾️ / ❌ (exact match) | Matrix approvers | `extensions/matrix/src/approval-reactions.ts:12-17`; `approval-reaction-auth.ts:6-19`; `matrix/monitor/reaction-events.ts:103-130` |
| Telegram, Discord, Slack, Teams, Google Chat, QQ | none found | n/a | They use buttons/cards and `/approve`. A code search for `ApprovalReaction` under `extensions/` matches only the four channels above. |

- The Matrix ✅/❌ overlap with the default status-reaction emojis (`src/channels/status-reactions.ts:29-43`: done `✅`, error `❌`) is worth noting. However, Matrix requires the actor to be in the approver list (bot users normally aren't).
- The WhatsApp default status/ack emojis contain no 👍/👎/♾️. Status reactions on WhatsApp also need `messages.statusReactions.enabled: true` (`extensions/whatsapp/src/auto-reply/monitor/status-reaction.ts:14-16`).

---

## Q2. The `message` tool `react` action (src)

### 2.1 Schema

The schema is one flat object for all actions (`src/agents/tools/message-tool-schema.ts:573-593`).

- **Routing** (`:25-41`): `channel?`, `target?`, `targets?`, `accountId?`, `dryRun?`.
- **`action`** is an enum of the active actions (`:591`).
- **React group** (`:306-350`; applies to `react`, `reactions`, `read`, `edit`, `delete`, `unsend`, `pin`, `unpin`, `reply`, `thread-create`):
  - `messageId?` ("reactions default current inbound") and its alias `message_id?`;
  - `emoji?` ("Unicode emoji; channels may also support custom emoji.");
  - `remove?: boolean`;
  - `trackToolCalls?` / `track_tool_calls?` ("Use the reacted message for this turn's status reaction lifecycle.");
  - `targetAuthor?`, `targetAuthorUuid?` (Signal);
  - `groupId?`.
- **`fromMe?: boolean`** is in the read/search group (`:352-374`), not the react group. It is still read by the WhatsApp react handler (below).
- Snake_case aliases are resolved by `readSnakeCaseParamRaw` (`src/agents/tools/common.ts:16, 125-144`).

### 2.2 WhatsApp react handler

`extensions/whatsapp/src/channel-react-action.ts:175-236` → `action-runtime.ts:26-70`.

- **Chat:** `chatJid` or `to`. The canonical `target` is mapped through `messageActionTargetAliases.react` (aliases `chatJid`, `messageId`) at `channel.ts:162-168`. It falls back to the current WhatsApp conversation (`:58-71`).
- **`messageId`:** explicit, or `toolContext.currentMessageId` (the triggering inbound) when same-chat (`src/channels/plugins/actions/reaction-message-id.ts:3-8`; `channel-react-action.ts:182-207`).
- **Other params:** `emoji` (empty is allowed), `remove`, `participant` (inferred as the requester in groups), `fromMe`, `accountId`.
- **Socket send:** `sock.sendMessage(jid, {react: {text, key: {remoteJid, id, fromMe, participant}}})` (`inbound/send-api.ts:226-249`). This gives the bot arbitrary-message reaction ability.
- **Gating:**
  - `channels.whatsapp.actions.reactions`, then `channels.whatsapp.reactionLevel` `"minimal"` (default) or `"extensive"` (`action-runtime.ts:26-40`; `reaction-level.ts:19`);
  - the action only appears when agent reactions are enabled (`channel-actions.ts:47-73`).

### 2.3 Other ways to add a reaction

- Host-driven ack and status reactions (`src/channels/status-reactions.ts`, `extensions/whatsapp/src/auto-reply/monitor/ack-reaction.ts`, `status-reaction.ts`) use host-chosen emojis on the inbound message. `trackToolCalls` lets the model choose which message the status lifecycle uses.
- No dedicated reaction tool was found. The model reaches `react` only through `message` (directly, or through `tool_call {id:"message"}` under Tool Search).
- Indirect paths are out of band: `browser` on web.whatsapp.com, or `exec` scripts with their own WhatsApp session.

---

## Q3. Self-chat and plugin command context

### 3.1 WhatsApp self-chat config/detection (src + docs)

- **Keys:** `channels.whatsapp.selfChatMode` (boolean), or `channels.whatsapp.accounts.<id>.selfChatMode`. It is not inherited from `accounts.default` by named accounts (`account-config.ts:16-23`; `docs/channels/whatsapp.md:547`).
- **Detection** (`extensions/whatsapp/src/inbound-policy.ts:69`):
  - `isSelfChat = account.selfChatMode ?? isSelfChatMode(selfE164, allowFrom)`;
  - `isSelfChatMode` is true when the linked number appears in `allowFrom`, and `"*"` doesn't count (`targets-runtime.ts:53-64`).
- **Same-number DM admission** is on unless `selfChatMode === false`: the self number is appended to the DM allowlist (`inbound-policy.ts:121-128`).
- **Defaults:**
  - `dmPolicy` defaults to `"pairing"` (`:40`);
  - with an empty `allowFrom`, the DM allowlist defaults to `[selfE164]` (`:41-42`).
- **Onboarding baseline:** `dmPolicy: "allowlist"`, `allowFrom` containing own number, `selfChatMode: true` (`docs/channels/whatsapp.md:128, 361-372`).
- **Self-chat effects:** read receipts are skipped (`inbound/message-delivery.ts:447`), and presence is "unavailable" (`socket-session.ts:128`).

### 3.2 `PluginCommandContext`

Type at `src/plugins/plugin-command.types.ts:30-102`; built at `src/plugins/plugin-command-execution.ts:205-270`.

Fields:

- `senderId?`
- `channel` (string)
- `channelId?`
- `isAuthorizedSender`
- `senderIsOwner?`: **only for bundled/official plugins with `exposeSenderIsOwner`, or trusted reserved owners** (`:188-194`)
- `assertOwnerCurrent?`
- `gatewayClientScopes?`
- `agentId?`, `sessionKey?`, `sessionId?`, `sessionTarget?`, `sessionFile?`
- `args?`, `commandBody`, `config`
- `from?`, `to?`
- `accountId?`, `messageThreadId?`, `threadParentId?`
- `diagnosticsSessions?`
- `runtimeContext?{llm, compactCurrent}`
- the binding helpers `requestConversationBinding`, `detachConversationBinding`, `getCurrentConversationBinding`

There is **no `isSelfChat` or `fromMe` field.** Raw `from`/`to` are present. Inferred: in a WhatsApp self-chat both are the owner's number, so `from === to` is a possible heuristic (runtime check).

### 3.3 How the channel value is derived

- `channel = lowercase(OriginatingChannel ?? Provider ?? Surface)` (`src/auto-reply/reply/commands-context.ts:13-16`).
- `gatewayClientScopes = ctx.GatewayClientScopes` (`:27`).

**CLI, TUI and Control UI vs chat channels** (src):

- Gateway `chat.send` clients (Control UI/WebChat, and the TUI in Gateway mode) build the context with `Provider = Surface = "webchat"` (`INTERNAL_MESSAGE_CHANNEL`, `src/utils/message-channel-constants.ts:3`), `OriginatingChannel` from the route, and `GatewayClientScopes: client.connect.scopes ?? []` (`src/gateway/server-methods/gateway-client-identity.ts:110-145`; used at `chat-send-user-turn.ts:193-231`).
- The route is `webchat` unless `deliver: true` and the session is channel-scoped (or the main session from a CLI client). Then `OriginatingChannel` becomes the session's channel, for example `"whatsapp"` (`chat-origin-routing.ts:101-195`; WebChat never inherits, `:166-173`).
- **Reliable discriminator:** gateway-client invocations always have `Array.isArray(ctx.gatewayClientScopes)`, possibly empty. Chat-channel inbound has it undefined. `channel` alone is not reliable because origin routing can report `"whatsapp"` (inferred from the code above).
- **`requiredScopes` check** (`plugin-command-execution.ts:162-174`):
  - for gateway clients the scope must be present (`operator.admin` satisfies any);
  - for chat channels (scopes undefined) `senderIsOwner === true` satisfies it.

### 3.4 Running a plugin command from the local CLI

- **`openclaw agent --message "/guard off"`: no.** "`--message` does not run the channel slash-command dispatcher" (`docs/cli/agent.md:371`).
- **TUI: yes.** Unknown slash commands are "forwarded to the Gateway and shown as system output" (`docs/web/tui.md:142-204`). They are sent through `client.sendChat` (`src/tui/tui-command-handlers.ts:855-865`), so they arrive as `chat.send` with `channel` `"webchat"` (unless `openclaw tui --deliver` and a channel-scoped session) and with the TUI client's scopes.
  - TUI `--local` (embedded) is unverified for plugin commands.
- **Control UI/WebChat:** same path, `channel: "webchat"`.
- **No `openclaw commands run` CLI** exists (no such file under `src/cli/` or `docs/cli/`).
- **Alternative:** `api.registerCli(...)` lets a plugin add its own `openclaw <name> ...` CLI subcommands (`docs/plugins/sdk-overview/cli-and-discovery.md:52-120`). These run in the CLI process, not the gateway, so state must be shared, for example through the SQLite plugin stores.

---

## Q4. Codex-native tools (src + docs)

### 4.1 Tool names seen by `before_tool_call`

**Normalized OpenClaw names**, not native ones.

- `normalizeNativeHookToolName` = `normalizeToolPolicyName` (lowercase, `bash`→`exec`, `apply-patch`→`apply_patch`, `cron`→`automations`; `src/agents/tool-policy-shared.ts:13-18, 75-78`), then the Codex aliases `exec_command`→`exec`, `write`→`apply_patch`, `edit`→`apply_patch`, `agent`→`spawn_agent` (`src/agents/harness/native-hook-relay-codec.ts:16-21, 133-136`).
- So `Bash`/`exec_command`/`exec` → `exec`; `apply_patch`/`Write`/`Edit` → `apply_patch`; `Agent`/`spawn_agent` → `spawn_agent`. Other native names are only lowercased.
- **PreToolUse relay:** `runNativeHookRelayPreToolUse` (`src/agents/harness/native-hook-relay-events.ts:140-175`). It calls `runBeforeToolCall` / `runBeforeToolCallHook` with `{toolName, params: toolInput, toolCallId: tool_use_id}` and a ctx carrying `agentId`, `sessionId`, `sessionKey`, `runId`, `channelId`, `requester`, `cwd`, `workspaceDir`.
- **Rewritten params are refused:** the native call is blocked (`:186-198`).
- **Codex hook matchers:** the native-name aliases installed in Codex config are `exec: Bash|exec|exec_command`, `apply_patch: apply_patch|Write|Edit`, `spawn_agent: spawn_agent|Agent` (`extensions/codex/src/app-server/native-hook-relay.ts:53-57, 661-692`). With no matcher scope, the group is match-all (`:608-612`).
- **Default relay timeout:** 10 s (`:47`).

### 4.2 Params shape

- The raw Codex `tool_input` is passed through (`native-hook-relay-codec.ts:73-101`).
- **Bash:** `{command: "git status"}` (a string; test `native-hook-relay.test.ts:365-371`).
- **`exec_command`:** Codex sends `{cmd: ...}`. For `exec`, a `command` **string** is added:
  - string `cmd` is copied;
  - argv-array `cmd` is shell-quoted and joined;
  - the original `cmd` is kept.
  - Example: `{cmd: ["cat","/tmp/private key"]}` → params `{cmd: [...], command: "cat '/tmp/private key'"}`. A stale `command` is overwritten by `cmd` (`native-hook-relay.test.ts:1695-1719`).
- **Write/Edit/apply_patch:** passed as is (for example `{patch: "*** Begin Patch"}`, test `:1714-1718`). This is not the OpenClaw `apply_patch {input}` shape.

### 4.3 Binary bundling

- **Not bundled with `openclaw`.** The root package excludes `dist/extensions/codex/**` (`package.json:302`).
- The harness is the separate npm plugin `@openclaw/codex` (`extensions/codex/package.json:2`, `install.npmSpec`), installed with `openclaw plugins install @openclaw/codex` (`docs/plugins/codex-harness.md:587-611`).
- That plugin depends on **`@openai/codex` 0.160.0** (pinned) plus the platform packages `@openai/codex-{linux,darwin,win32}-{x64,arm64}` (`package.json:11, 31-38`). The managed binary is resolved from that package (`src/app-server/managed-binary.ts:49-90, 216-221`).
- **Overrides:** `plugins.entries.codex.config.appServer.command` / `.args`, or the env vars `OPENCLAW_CODEX_APP_SERVER_BIN` / `OPENCLAW_CODEX_APP_SERVER_ARGS` (`docs/plugins/codex-harness-reference/app-server-transport.md:98-118, 276-283`).

### 4.4 Custom base URL and wire API

- **The OpenClaw-side route must look official.** A custom `models.providers.openai.baseUrl` makes the implicit runtime "OpenClaw", and explicit `agentRuntime.id: "codex"` fails closed on unsupported routes (`docs/providers/openai/runtimes.md:24-53`; `src/agents/openai-routing.ts:52-109`).
- **The repo's own mock lane shows the way:** QA forced-Codex + `mock-openai`.
  - It keeps the OpenAI catalog `baseUrl: "https://api.openai.com/v1"` in OpenClaw config (`extensions/qa-lab/src/qa-gateway-config.ts:40, 185-205`).
  - It points Codex itself at the mock through `OPENCLAW_CODEX_APP_SERVER_ARGS="app-server -c openai_base_url=<mock>/v1 -c model_catalog_json=<path> ... --listen stdio://"` (`extensions/qa-lab/src/codex-app-server-args.ts:2-38`; `gateway-child-env.ts:187-230`).
  - It sets `agentRuntime: {id: "codex"}` (`qa-gateway-config.ts:162-166`).
- **Wire API: Responses.** `mock-openai` serves `/v1/responses` over SSE and WebSocket (`extensions/qa-lab/src/providers/mock-openai/server.ts:224-228, 2359`; `mock-openai-responses-http.ts`, `mock-openai-responses-websocket.ts`). No `/v1/chat/completions` route exists. Codex custom providers use `wire_api = "responses"` (`docs/plugins/codex-harness/configuration.md:218-231`).
- **Auth:** a synthetic API-key auth profile is staged (`gateway-child-setup.ts:136-170`).
- **Caveat:** restricted turns (operator role model policy) route through an OpenClaw inference proxy that rewrites provider `base_url` (`extensions/codex/src/app-server/inference-provider-config.ts:42-97`; `docs/plugins/codex-harness/routing.md:91-103`). Don't enable model policies in the test.
- **Verdict:** a mock-LLM Codex test is feasible. It needs the `@openclaw/codex` npm plugin (and its `@openai/codex` binary) on the cluster, plus a Responses-API mock (runtime).

---

## Q5. Exec approvals (src + docs)

### 5.1 Config keys

- **Preferred key:** `tools.exec.mode` (also `agents.entries.<id>.tools.exec.mode`), one of `deny | allowlist | ask | auto | full` (`src/infra/exec-approvals-core.ts:14`).
- **Mode mapping** (`:115-133`):

| Mode | security | ask | Notes |
|---|---|---|---|
| `deny` | `deny` | `off` | |
| `allowlist` | `allowlist` | `off` | |
| `ask` | `allowlist` | `on-miss` | |
| `auto` | `allowlist` | `on-miss` | plus the auto-reviewer |
| `full` | `full` | `off` | |

- **Legacy pair:** `tools.exec.security` (`deny|allowlist|full`) and `tools.exec.ask` (`off|on-miss|always`). Doctor migrates these. `ask: "always"` and `full` + `on-miss` have no mode equivalent and stay as the legacy pair (`docs/tools/exec-approvals.md:188-216`).
- **Host approvals document fields:** `defaults` and `agents.<id>` with `security`, `ask`, `askFallback` (`deny|allowlist|full`, default `deny`), `autoAllowSkills`, `allowlist[]` (`pattern`, `argPattern`, `source`, ...), `mcpTools[]` (`:146-186`).
- The effective policy is the **stricter** of `tools.exec` and the host document (`:24-35`).
- **Defaults:** security `full` for gateway/node hosts (`deny` for sandbox), ask `off` (`:218-238`). **Out of the box there are no host exec prompts.**
- **Other keys:** `tools.exec.strictInlineEval`. Per-session `/exec` overrides exist.
- **Chat delivery of exec prompts** needs `approvals.exec.enabled` (Q1.5). Otherwise prompts go to the Control UI or companion app, and `askFallback` (default `deny`) applies when no UI is reachable (`:96-97`).

### 5.2 When the host prompts

`requiresExecApproval` (`src/infra/exec-approvals-policy.ts:13-31`):

- `ask: "always"` → always prompts (durable `allow-always` does not suppress it).
- A durable approval satisfied → no prompt.
- Otherwise, prompt only when `ask: "on-miss"` **and** `security: "allowlist"` **and** (analysis failed **or** allowlist miss).
- Extra triggers: heredoc, allowlist-plan-unavailable, strict inline-eval (`src/agents/bash-tools.exec-host-gateway.ts:636-666`).
- Headless or non-interactive runs → denied with `approval_required` (`:667-698`).

### 5.3 Ordering against `before_tool_call`

**The plugin hook runs first.**

- The wrapper awaits `runBeforeToolCallHook` (including any plugin `requireApproval` wait) at `src/agents/agent-tools.before-tool-call.wrapper.ts:413-426`.
- It blocks or finalizes params at `:430-470`, then calls `tool.execute`.
- The exec tool evaluates host approval inside its own execute (the gateway host path above).
- Docs: the hook "cannot grant past" exec approvals (`docs/plugins/hooks/tool-policy.md:224-226`). Plugin and exec approvals are separate systems (`docs/plugins/plugin-permission-requests.md:308-311`).

### 5.4 Two prompts?

**Yes.** A Guard `requireApproval` on `exec`, combined with a host policy that also requires approval (`ask` / `auto` miss / `always`), gives two sequential prompts: the plugin one first, then the exec one.

- No code path was found that lets a plugin approval satisfy the exec approval. `bash-tools.exec-host-gateway.ts` has no plugin-approval reference.
- With the default `full`/`off` host policy, only the Guard prompt appears.
- (src, by code path; runtime test recommended)

### 5.5 Allowlist storage

- The SQLite state database on the execution host: `$OPENCLAW_STATE_DIR/state/openclaw.sqlite` (default `~/.openclaw/state/openclaw.sqlite`), singleton row in table `exec_approvals_config` (`docs/tools/exec-approvals.md:109-127`; `src/infra/exec-approvals-sqlite.ts:33, 86, 167`).
- The socket is `~/.openclaw/exec-approvals.sock`.
- A legacy `exec-approvals.json` is imported once by `openclaw doctor --fix` (`:129-144`).
- **CLI:** `openclaw approvals get|...`, `openclaw exec-policy show|set|preset`.

---

## Q6. Compact tool surface (Tool Search) (src + docs)

### 6.1 Disabling it

- **Key:** `tools.toolSearch` (boolean, or `{enabled?, mode?: "tools"|"directory", searchDefaultLimit?, maxSearchLimit?}`) (`src/config/zod-schema.agent-runtime.ts:432-446`; help text `src/config/schema.help.runtime.ts:131-140`).
- **Parsing** (`src/agents/tool-search-config.ts:12-44`):
  - unset or `true` → enabled (the "tools" mode);
  - **`false` → disabled, so direct schemas are restored** (`docs/tools/tool-search.md:22-27`).
- **Also set `tools.codeMode: false`.** The global default is `"auto"`, which on "catalog-preferred" models exposes only `exec`/`wait` (`schema.help.runtime.ts:141-142`; `zod-schema.agent-runtime.ts:448-457`; `docs/tools/code-mode/configuration.md:13-16, 69-76`).
- The log line "tool-search: cataloged N tools behind compact prompt surface" is emitted at `src/agents/embedded-agent-runner/run/attempt-tool-catalog.ts:108-115`.
- Codex runs use Codex's native search instead; `tools.toolSearch` doesn't apply there.

### 6.2 What `tool_describe` returns

- Input: `{id}` (`src/agents/tool-search.ts:297-312`).
- Output: `describeEntry` = the compact entry plus **`parameters: entry.parameters`** (the full input JSON schema) plus `outputSchema` when declared (`src/agents/tool-search-runtime.ts:73-79, 300-311`; docs `tool-search.md:183-190`).
- MCP and client tools are searched by name and description only (`input: "unknown"`), but `describe` still returns their parameters.
- `tool_call {id, args}` executes the target "through OpenClaw" with the normal policy, approvals and hooks (`tool-search.md:76-77`; `tool-search.ts:313-370`).

### 6.3 What stays visible vs hidden

- **Always visible:**
  - the controls `tool_search`, `tool_describe`, `tool_call`;
  - core coding tools of families `base-coding`/`shell`: `read`, `write`, `edit`, `ls`, `apply_patch`, `exec`, `process` (`src/agents/core-tool-factory-descriptors.ts:14-21, 103-106`; `tool-search-catalog.ts:179-195`);
  - caller-required names (for example `message` when it is the only reply path);
  - `catalogMode: "direct-only"` tools: `structured_output`, `sessions_yield`, `openclaw` (delegate and system-agent), `computer`, and `view_image` when the model has vision (`src/agents/tools/{structured-output,sessions-yield,openclaw-delegate,system-agent,computer,image}-tool.ts`).
- **Hidden (cataloged):** every other policy-eligible core tool in the `openclaw` family list (`core-tool-factory-descriptors.ts:22-77`):
  - `agents_list`, `agents_wait`, `ask_user`, `conversations_list`, `conversations_send`, `conversations_turn`, `automations`;
  - `screen`, `theme`, `secrets`, `dashboard`, `decision_evaluate`, `gateway`, `plugins`;
  - `get_goal`, `create_goal`, `update_goal`;
  - `github_identity_status`, `github_publish`, `heartbeat_respond`;
  - `image_generate`, `music_generate`, `video_generate`, `message`, `mobile_ui`, `nodes`, `pdf`;
  - `personal_instructions`, `presence`, `session_status`, `show_widget`, `progress_card`;
  - `sessions`, `sessions_history`, `sessions_list`, `sessions_search`, `sessions_send`, `sessions_spawn`;
  - `skill_workshop`, `suggest_task`, `dismiss_task`, `subagents`, `terminal`, `portal`, `transcripts`, `tts`;
  - `web_fetch`, `web_search`;
  - plus `code_execution`, `browser`, memory tools, all plugin tools, MCP tools and client tools.
- The exact set per run depends on profile and policy, so verify at runtime from the log line or the debug tool list.

---

## Q7. `message_sending` / `message_sent` for `message`-tool sends (src)

### 7.1 Send path

- `message` tool → `runMessageAction` (`src/agents/tools/message-tool-execution.ts:533`) → `action === "send"` → `executeMessageSend` (`src/infra/outbound/message-action-runner.ts:682-688`).
- `executeMessageSend` (`message-action-send.ts:493-560`) first tries `executeGatewayAction`. That only applies when a remote `gateway` context exists and the plugin's execution mode is `"gateway"` (`message-action-execution.ts:276-300`), so it is a remote/CLI path.
- Then it calls `executeSendAction` (`outbound-send-service.ts:136-345`):
  1. If the channel plugin has `actions.prepareSendPayload`, or a presentation with core presentation delivery, or `forceCoreDelivery`/`requireQueuePersistence`, the payload goes to **core** (`:157-182`).
  2. **Otherwise it first tries the plugin's own `actions.handleAction("send")`** through `tryHandleWithPluginAction` → `dispatchChannelMessageAction` (`:183-256, 85-134`; `src/channels/plugins/message-action-dispatch.ts:651-711`). If the plugin handles it, the result returns **without** core delivery. No hook runner is called anywhere in this branch or in dispatch (no `message_sending` or `message_sent` reference in `message-action-dispatch.ts`).
  3. Otherwise there's a core `sendMessage` (`:268-327`) → `src/infra/outbound/message.ts:297-340` → `sendDurableMessageBatchCore` (`src/channels/message/send.ts:374-382`) → `deliverOutboundPayloadsInternal` → `deliver-queue.ts:86` `prepareOutboundPayloadBatch` → **`applyMessageSendingHook`** (`deliver-prepare.ts:199-210`; `deliver-hooks.ts:136-160`). `message_sent` is emitted by `createOutboundMessageSentEmitter` (`deliver-queue-execute.ts:43, 104`; `message-sent-hook.ts:89`).

### 7.2 By channel

- **qa-channel:** it declares `send` (`extensions/qa-channel/src/channel-actions.ts:34`) and handles it itself by posting to the QA bus (`:149-197`). It defines no `prepareSendPayload`. **So `message`-tool sends on qa-channel bypass both `message_sending` and `message_sent`.**
- **WhatsApp:**
  - `supportsAction` is only `react` and `upload-file` (`extensions/whatsapp/src/channel.ts:171`). A `message` `send` falls through to core, so **`message_sending` and `message_sent` fire**.
  - But **`upload-file` (with `message`/`caption` text) sends directly** through `sendMessageWhatsApp` (`channel-react-action.ts:113-173`), and **`react` goes direct too**. Both bypass `message_sending`. `sendMessageWhatsApp` has no hook calls (`send.ts`).
  - Host approval prompts are also sent with `sendMessageWhatsApp` directly (`approval-handler.runtime.ts:89-121`).
- **Other channels** whose `actions.handleAction` handles `send` without `prepareSendPayload` (not enumerated here) bypass the hooks in the same way. Check per channel by its `supportsAction`/`handleAction` and `prepareSendPayload`.
- **Implication for the Guard:** use `before_tool_call` on `message` (all actions, including `upload-file` captions and `react`) as the primary control. `message_sending` is only a backstop for core-delivered sends and auto-replies.
