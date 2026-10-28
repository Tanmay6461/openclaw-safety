# Provenance Guard Phase 0: runtime test harness notes

- **Ref:** `v2026.10.8`. **Date:** 2026-10-28.
- **Method:** same as `phase0/docs-findings.md`. Static reads only, as text through the GitHub contents and tree APIs, plus `gh search code` to locate files. Nothing was cloned, installed, or executed.
- **Confidence labels:**
  - **src**: read in source at the tag.
  - **docs**: stated in docs at the tag.
  - **e2e**: shown by the repo's own e2e scripts or fixtures at the tag. These are working recipes, but nothing was run.
  - **inferred**: reasoned from the above.
  - **runtime**: check first on the cluster.
- **Scope:** this file covers harness mechanics only. Hook semantics, the capability matrix, and the tool registry are in `docs-findings.md` §2 to §4 and are not repeated here.

---

## 0. Summary of the harness shape

1. **Run a mock LLM.** Write a Node HTTP server that serves `POST /v1/chat/completions` (SSE) and `GET /v1/models` (§4).
2. **Write the plugin.** Put the Guard plugin in a directory with `openclaw.plugin.json` and `index.js` (§1).
3. **Write the config.** Give OpenClaw an isolated state directory and config file through `OPENCLAW_STATE_DIR` and `OPENCLAW_CONFIG_PATH` (§3). The config loads the plugin through `plugins.load.paths` (§2) and points `models.providers.mock` at the mock (§4).
4. **Start the Gateway** in the foreground on loopback, with a token (§8).
5. **Drive turns:**
   - `openclaw agent --agent main --message ...` for user turns (§5).
   - `openclaw cron add ...`, then `openclaw cron run <id> --wait`, for cron turns (§6).
   - `openclaw system event --mode now` for heartbeat turns (§6).
   - For owner and non-owner chat turns, you need the qa-channel. It exists only in a source checkout (§5).
6. **Collect evidence.** The plugin writes every hook call (name, event, ctx) to a JSONL file. The mock logs every request body.

---

## 1. Minimal external plugin

### 1.1 Required files

A plugin needs two files: a manifest and an entry module. `package.json` is optional.

**Manifest**
- The filename is `openclaw.plugin.json` (`PLUGIN_MANIFEST_FILENAME`), and it must be in the plugin root.
- It is parsed as JSON5.
- Only two fields are required:
  - `id`: a non-empty string that is not a core-reserved id.
  - `configSchema`: an object (inline JSON Schema).
- Evidence:
  - **src**: `src/plugins/manifest.ts:35` (filename) and `src/plugins/manifest.ts:183-201` (parse, `"plugin manifest requires id"`, `"plugin manifest requires configSchema"`).
  - **docs**: `docs/plugins/manifest.md:20` and the field table in the same file (`id` and `configSchema` are "Yes", everything else is "No").

**`activation`**
- Set `activation.onStartup: true` so the Gateway imports the plugin at startup.
- Omitting it "no longer startup-loads the plugin implicitly".
- Evidence (**docs**): `docs/plugins/manifest/capabilities.md:229,247`.

**`contracts`**
- No `contracts` entry is needed for `api.on(...)` hooks or for `api.registerCommand(...)`.
- `contracts.tools` is needed only for `api.registerTool`.
- `contracts.trustedToolPolicies` is needed only for `api.registerTrustedToolPolicy`.
- Evidence (**docs**): `docs/plugins/manifest/capabilities.md:63-85` (contracts list), `docs/plugins/building-plugins.md:121-131`, and `docs/plugins/manifest.md:42` ("Do not use it for: registering native runtime hooks").

**Entry module**
- Without `package.json`, the loader looks for `index.ts`, `index.js`, `index.mjs`, then `index.cjs` in the plugin directory. This is `DEFAULT_PLUGIN_ENTRY_CANDIDATES`.
- With `package.json`, set `"openclaw": { "extensions": ["./index.js"] }`.
- Evidence:
  - **src**: `src/plugins/package-manifest.ts:12-17` and `src/plugins/discovery.ts:757-762`.
  - **docs**: `docs/plugins/manifest/package-json.md:35`.

**Export shape**
- The module may export either of these, as a default export or through CJS `module.exports`:
  - a function `register(api)`;
  - an object with a `register` function.
- Nested `.default` is unwrapped.
- Evidence (**src**): `src/plugins/module-export.ts:4-53`.

**`definePluginEntry`**
- It comes from `openclaw/plugin-sdk/plugin-entry` and is also re-exported from `openclaw/plugin-sdk/core`.
- It only returns `{id, name, description, configSchema (lazy getter), register, ...}`. It has no side effects.
- A plain object therefore works without importing the SDK.
- Evidence (**src**): `src/plugin-sdk/plugin-entry.ts:209-265` and `src/plugin-sdk/core.ts:208`.

**SDK imports**
- If the plugin does import the SDK, the loader installs an alias and resolver for `openclaw/plugin-sdk/*`.
- Evidence (**src**): `src/plugins/loader-module-runtime.ts:12,229-234` and `src/plugins/plugin-sdk-native-resolver.ts:1`.

**Recommendation**
- Ship plain `index.js` (ESM or CJS) with no SDK import. This avoids dependency-resolution issues for path-loaded plugins.
- The repo's own e2e fixture plugins do exactly this: `module.exports = { id, name, register(api) {...} }` plus a manifest of `{id, configSchema:{type:"object",properties:{}}}`.
- Evidence (**e2e**): `scripts/e2e/lib/fixtures/plugins.mjs:5-7,18-25`.

### 1.2 Copy-paste plugin

`openclaw.plugin.json`:

```json
{
  "id": "pg-probe",
  "name": "Provenance Guard Probe",
  "description": "Records every hook invocation for harness assertions.",
  "activation": { "onStartup": true },
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "logPath": { "type": "string" },
      "blockTools": { "type": "array", "items": { "type": "string" } },
      "approveTools": { "type": "array", "items": { "type": "string" } }
    }
  }
}
```

`package.json` (optional; keeps ESM explicit):

```json
{ "name": "pg-probe", "version": "0.0.1", "type": "module",
  "openclaw": { "extensions": ["./index.js"] } }
```

`index.js`:

```js
import fs from "node:fs";

const HOOKS = [
  "before_model_resolve","agent_turn_prepare","before_prompt_build","before_agent_reply",
  "model_call_started","model_call_ended","llm_input","llm_output","before_agent_finalize",
  "agent_end","before_compaction","after_compaction","before_reset","inbound_claim",
  "channel_pairing_requested","message_received","message_sending","reply_payload_sending",
  "message_sent","before_tool_call","after_tool_call","tool_result_persist","before_message_write",
  "session_start","session_end","subagent_delivery_target","subagent_spawned","subagent_progress",
  "subagent_ended","gateway_start","gateway_stop","heartbeat_prompt_contribution","cron_reconciled",
  "cron_changed","skill_changed","before_dispatch","reply_dispatch","before_install",
  "before_agent_run","resolve_exec_env",
]; // = PLUGIN_HOOK_NAMES, src/plugins/hook-types.ts:98-139 (40 names)

// Hooks whose return value matters: observe-only here, so return undefined.
const SYNC = new Set(["tool_result_persist", "before_message_write"]);
// Claim/modify hooks: returning undefined = "no decision".

function safe(v) {
  try { return JSON.parse(JSON.stringify(v, (k, x) =>
    typeof x === "function" ? "[fn]" : (x instanceof AbortSignal ? "[signal]" : x))); }
  catch { return "[unserializable]"; }
}

export default {
  id: "pg-probe",
  name: "Provenance Guard Probe",
  description: "Records every hook invocation",
  register(api) {
    const cfg = api.pluginConfig ?? {};                   // plugins.entries.pg-probe.config
    const logPath = cfg.logPath ?? "/tmp/pg-probe.jsonl";
    const log = (rec) => fs.appendFileSync(logPath, JSON.stringify({ t: Date.now(), ...rec }) + "\n");
    log({ hook: "__register", pluginId: api.id, hostHooks: api.config?.plugins?.entries?.[api.id]?.hooks });

    for (const name of HOOKS) {
      if (name === "before_tool_call") continue;
      api.on(name, (event, ctx) => { log({ hook: name, event: safe(event), ctx: safe(ctx) }); return undefined; },
             { priority: -1000 });
    }

    // Policy hook: lowest priority = runs LAST (higher runs first).
    api.on("before_tool_call", (event, ctx) => {
      log({ hook: "before_tool_call", event: safe(event), ctx: safe(ctx) });
      if ((cfg.blockTools ?? []).includes(event.toolName)) {
        return { block: true, blockReason: `pg-probe blocked ${event.toolName}` };
      }
      if ((cfg.approveTools ?? []).includes(event.toolName)) {
        return { requireApproval: {
          title: `Approve ${event.toolName}?`, description: "pg-probe test approval",
          severity: "warning", timeoutMs: 30000,
          onResolution: (d) => log({ hook: "__approval_resolution", decision: d, toolCallId: event.toolCallId }),
        } };
      }
      return { params: event.params };                      // explicit pass-through of what we checked
    }, { priority: -1000, timeoutMs: 2000 });

    api.registerCommand({
      name: "guard",                                         // must match /^[a-z][a-z0-9_-]*$/, not reserved
      description: "Provenance Guard probe command",
      acceptsArgs: true,
      requireAuth: true,                                     // default true
      requiredScopes: ["operator.admin"],
      handler: (ctx) => {
        log({ hook: "__command", ctx: safe({ ...ctx, config: undefined }) });
        return { text: `guard ok: ${ctx.args ?? ""}` };     // PluginCommandResult = ReplyPayload & {continueAgent?, suppressReply?}
      },
    });
  },
};
```

**Note on `SYNC` hooks**
- `tool_result_persist` and `before_message_write` must be **synchronous**. To rewrite, return `{ message }` synchronously; an async handler's result is ignored.
- The probe never rewrites, so returning `undefined` is fine.
- Evidence:
  - **docs**: `docs/plugins/hooks.md:193` and `docs/plugins/hooks/reference.md:28,99`.
  - **src**: the handler map, `src/plugins/hook-types.ts:906-913`.

### 1.3 `api.on` signature and options (src)

Signature, from `src/plugins/plugin-api.types.ts:494-499`:

```ts
on: <K extends PluginHookName>(hookName: K, handler: PluginHookHandlerMap[K],
                               opts?: PluginHookRegistrationOptions<K>) => void;
```

`PluginHookRegistrationOptions`, from `src/plugins/hook-types.ts:188-216`:

| Option | Hooks | Meaning |
|---|---|---|
| `priority?: number` | all | Default `0`. **Higher runs first.** The runner sorts with `(b.priority ?? 0) - (a.priority ?? 0)` (`src/plugins/hooks.ts:213-223`, `docs/plugins/hooks/reference.md:19,40`). A large negative value therefore runs last. |
| `timeoutMs?: number` | all | Per-handler await budget. The operator's `hooks.timeouts.<hook>` beats `hooks.timeoutMs`, which beats this value (`docs/plugins/hooks/reference.md:73-76`). |
| `registrationId?: string` | all | Stable id within the plugin. |
| `matcher?: [string, ...string[]]` | only `before_tool_call` and `after_tool_call` | Canonical tool ids. Empty lists, wildcards, and provider aliases are invalid. |
| `eligibleTriggers?: ("cron"\|"heartbeat"\|"user")[]` | only `before_agent_reply` | |
| `eligibleDispatchKinds?` | only `reply_dispatch` | |
| `requiresToolAuthority?: true` | only `before_prompt_build` | |

Handler arity is `(event, ctx)` (`docs/plugins/hooks.md:148`). Keep `register(api)` synchronous (`docs/plugins/hooks/reference.md:16`).

### 1.4 Return shapes (src)

`before_tool_call` returns `PluginHookBeforeToolCallResult`, from `src/plugins/hook-before-tool-call-result.ts:14-30`:

```ts
{ params?: Record<string, unknown>; block?: boolean; blockReason?: string;
  requireApproval?: { title: string; description: string; scope?: ApprovalScope;
    severity?: "info"|"warning"|"critical"; timeoutMs?: number; timeoutReason?: string;
    allowedDecisions?: Array<"allow-once"|"allow-always"|"deny">; pluginId?: string;
    onResolution?: (d: "allow-once"|"allow-always"|"deny"|"timeout"|"cancelled") => Promise<void>|void } }
```

- The event and ctx types are at `src/plugins/hook-types.ts:508-565`. `ctx.requester` is `{channel?, accountId?, senderId?, senderIsOwner?, roleIds?}`.
- **Harness caveat:** a `requireApproval` in a CLI turn is rejected up front.
  - With `trigger: "user"` and no `turnSourceChannel` or reviewer device, the reason is "Plugin approval unavailable: non-interactive CLI runs have no approval-capable initiating surface".
  - For cron and heartbeat runs, the reason is `${trigger} runs ...`.
  - `onResolution("cancelled")` is fired.
  - Evidence (**src**): `src/agents/agent-tools.before-tool-call.approval.ts:161-187,308-316`.
  - To test the real approval path, you need a channel turn (qa-channel) or a Gateway operator client.

`tool_result_persist` returns `PluginHookToolResultPersistResult = { message?: AgentMessage }`.
- It must be returned synchronously.
- Its event is `{toolName?, toolCallId?, message, isSynthetic?}`.
- Its ctx is `{agentId?, sessionKey?, toolName?, toolCallId?}`.
- Evidence (**src**): `src/plugins/hook-types.ts:579-595`.

### 1.5 Reading plugin config (src + docs)

- Use `api.pluginConfig`, which is `plugins.entries.<id>.config` after validation against `configSchema`. Read it inside `register`.
- The whole host config is `api.config`. Use it, for example, to read `plugins.entries[api.id].hooks.timeoutMs`.
- Editing `plugins.entries.<id>.config` in hybrid reload mode replaces the instance and re-runs `register`.
- Evidence:
  - **src**: `src/plugins/plugin-api.types.ts:204-205`.
  - **docs**: `docs/plugins/hooks.md:154-159`.

### 1.6 `api.registerCommand` (src)

The signature is `registerCommand: (command: OpenClawPluginCommandDefinition) => void` (`src/plugins/plugin-api.types.ts:361`).

The definition type is at `src/plugins/plugin-command.types.ts:134-182`:
- **Required:**
  - `name`: no leading slash; must match `/^[a-z][a-z0-9_-]*$/`.
  - `description`: non-empty.
  - `handler(ctx)`.
- **Optional:** `nativeNames`, `channels`, `acceptsArgs`, `requireAuth` (default `true`), `requiredScopes: OperatorScope[]`, `agentPromptGuidance`, and others.
- **Not available to external plugins:** `exposeSenderIsOwner` and `ownership: "reserved"`.

The handler receives `PluginCommandContext` (`:30-102`):
- `senderId`, `channel`, `channelId`, `isAuthorizedSender`;
- `senderIsOwner` (not passed to external plugins; see docs-findings Q5b);
- `gatewayClientScopes`, `agentId`, `sessionKey`, `sessionId`;
- `args`, `commandBody`, `config`, `from`, `to`, `accountId`, `messageThreadId`, and others.

The handler returns `PluginCommandResult = ReplyPayload & { continueAgent?, suppressReply? }`, for example `{ text: "..." }` (`:104-113`).

Reserved names that are rejected (`src/plugins/command-registration.ts:44-84,108-113`): `help`, `commands`, `status`, `diagnostics`, `codex`, `whoami`, `context`, `btw`, `stop`, `restart`, `reset`, `new`, `compact`, `config`, `debug`, `allowlist`, `activation`, `skill`, `learn`, `loop`, `subagents`, `kill`, `steer`, `tell`, `model`, `models`, `queue`, `send`, `bash`, `exec`, `think`, `verbose`, `reasoning`, `elevated`, `usage`. **`guard` is free.**

**Harness caveat:** `openclaw agent --message "/guard ..."` does **not** run the slash-command dispatcher, so it never reaches `registerCommand` handlers (**docs**: `docs/cli/agent.md:371`). Test `/guard` through a channel (qa-channel) instead.

### 1.7 `PLUGIN_HOOK_NAMES` (src)

`src/plugins/hook-types.ts:98-139` lists 40 names, which are copied into `HOOKS` in §1.2:

```
before_model_resolve, agent_turn_prepare, before_prompt_build, before_agent_reply,
model_call_started, model_call_ended, llm_input, llm_output, before_agent_finalize, agent_end,
before_compaction, after_compaction, before_reset, inbound_claim, channel_pairing_requested,
message_received, message_sending, reply_payload_sending, message_sent, before_tool_call,
after_tool_call, tool_result_persist, before_message_write, session_start, session_end,
subagent_delivery_target, subagent_spawned, subagent_progress, subagent_ended, gateway_start,
gateway_stop, heartbeat_prompt_contribution, cron_reconciled, cron_changed, skill_changed,
before_dispatch, reply_dispatch, before_install, before_agent_run, resolve_exec_env
```

Triggers are `PLUGIN_HOOK_AGENT_TRIGGERS = ["cron","heartbeat","user"]` (`:172`).

The internal `EmbeddedRunTrigger` union is wider: `cron | event | heartbeat | manual | memory | overflow | user` (`src/agents/run-trigger.ts:1-8`). Expect `ctx.trigger` to take values beyond the three public ones.

---

## 2. Installing and enabling a local plugin non-interactively

### Option A (recommended for tests): bare `plugins.load.paths`, with no install record

```json5
plugins: {
  enabled: true,
  load: { paths: ["/abs/path/pg-probe"] },
  entries: {
    "pg-probe": {
      enabled: true,
      hooks: { allowConversationAccess: true, allowPromptInjection: true, timeoutMs: 15000 },
      config: { logPath: "/abs/state/pg-probe.jsonl" }
    }
  }
}
```

- **No capability-consent prompt.** `resolvePluginCapabilityConsent` returns early when the plugin has no install owner and no install record. Bundled plugins also skip it.
  - **src**: `src/plugins/capability-consent.ts:135-167`, especially `:158` (bundled skip) and `:161-166` (no install record skip).
  - **docs**: `docs/plugins/manage-plugins.md:211-214` ("Plugins discovered directly in a workspace or through `plugins.load.paths`, without a managed install record, cannot persist capability acceptance").
- **Precedence.** A config-selected path has the highest discovery precedence (`docs/plugins/manifest/package-json.md:127-141`).
- **Enabling.** Enable it with `plugins.entries.<id>.enabled: true`, or list it in `plugins.allow`.
  - Workspace-origin plugins are disabled by default (`docs/tools/plugin.md:203-210`).
  - A standalone file in `load.paths` "starts with the Gateway once enabled through `allow` or `entries.<id>.enabled`" (`docs/gateway/config-extensions.md:205-206`).
- **Avoid `plugins.allow` unless you list every plugin you need.** It is an exclusive allowlist: plugins outside it, including bundled ones you may need, are not loaded (`docs/tools/plugin.md:200-202`). Without it, startup logs `plugins.allow is empty; discovered non-bundled plugins may auto-load` (`docs/tools/plugin.md:228-231`).
- **What `plugins.entries.<id>` accepts:**
  - `enabled`;
  - `hooks.allowConversationAccess`, `hooks.allowPromptInjection`, `hooks.timeoutMs`, `hooks.timeouts.<hook>` (positive integers up to 600000);
  - `config`, `env`, `apiKey`;
  - `subagent.*` and `llm.*` trust flags.
  - `hooks.*` sits beside `config`, not inside it (`docs/gateway/config-extensions.md:183-218`; `docs/plugins/hooks/reference.md:53-76`; `docs/plugins/hooks.md:191`).
- Confidence: **src + docs**.

### Option B: the managed install CLI

```bash
openclaw plugins install -l /abs/path/pg-probe --force --accept-capabilities   # link, records install
# or copy:  openclaw plugins install /abs/path/pg-probe --force --accept-capabilities
openclaw plugins enable pg-probe --accept-capabilities
openclaw plugins inspect pg-probe --runtime --json                             # verify hooks/commands registered
```

- **`--force`.** An arbitrary local, archive, npm, or git source "warns and asks before continuing". Non-interactive installs must pass `--force`. It does not bypass `security.installPolicy` (`docs/cli/plugins/install.md:67-76,171-173,314-317`).
- **`--accept-capabilities`.** A local copy needs consent "on every install", because it has no recorded integrity. Non-interactive runs fail without the flag (`docs/plugins/manage-plugins.md:176-193`; `docs/cli/plugins/install.md:78-83`).
- **`--link` still creates an install record and needs consent.** It "is not the same as adding a bare `plugins.load.paths` entry" (`docs/plugins/manage-plugins.md:216-219`).
- **`--acknowledge-install-policy-warning`.** Needed only if `security.installPolicy` returns `warn` (`docs/cli/plugins/install.md:201-203`).
- **Gateway interaction.** With a local Gateway running, `install` and `enable` apply through it. Otherwise they are saved for the next start (`docs/cli/plugins/install.md:15-19,345-348`).
- **Missing config.** If the plugin's config is absent, the install is recorded disabled. Set `plugins.entries.<id>.config`, then run `plugins enable` (`docs/cli/plugins/install.md:169`).
- **The repo's e2e does exactly this.** `openclaw_e2e_fixture_plugin_command` appends `--accept-capabilities` when the CLI supports it; the sweep uses `plugins install <dir> --force` (**e2e**: `scripts/lib/openclaw-e2e-instance.sh:481-506`; `scripts/e2e/lib/plugins/sweep.sh:149-155`).
- **Applying code changes.** After editing plugin code, run `openclaw plugins reload pg-probe` (`docs/plugins/hooks.md:122`).
- Confidence: **docs + e2e**.

---

## 3. Config and state location

| Item | Default | Override | Evidence |
|---|---|---|---|
| State dir | `~/.openclaw` | `OPENCLAW_STATE_DIR` (tilde-expanded) | src `src/config/paths.ts:62-76,159-164`; docs `docs/help/environment.md:39-43,346` |
| Config file | `$STATE_DIR/openclaw.json` (JSON or JSON5) | `OPENCLAW_CONFIG_PATH` | src `src/config/paths.ts:35,209-254`; docs `docs/help/environment.md:41,347` |
| Home used for all defaults | `$HOME` | `OPENCLAW_HOME` (explicit `*_STATE_DIR` and `*_CONFIG_PATH` still win) | docs `docs/help/environment.md:48-70` |
| Agent workspace | `~/.openclaw/workspace`, or `<state-dir>/workspace` when `OPENCLAW_STATE_DIR` is non-default | `OPENCLAW_WORKSPACE_DIR` (not tilde-expanded), or `agents.defaults.workspace` | docs `docs/concepts/agent-workspace.md:23-28,36`; `docs/help/environment.md:42,326` |
| Named profile | `~/.openclaw-<profile>` | `OPENCLAW_PROFILE` or `--profile <name>` | docs `docs/concepts/agent-workspace.md:24`; `docs/concepts/qa-e2e-automation/command-surface.md:84` |
| Gateway port | `18789` | `OPENCLAW_GATEWAY_PORT` > `gateway.port` | src `src/config/paths.ts:297,369-385` |
| Global `.env` | `$STATE_DIR/.env` | Never overrides existing env | docs `docs/gateway/configuration/environment-variables.md:13-18` |

- **There is no `OPENCLAW_CONFIG` variable.** It is `OPENCLAW_CONFIG_PATH`.
- **Session and automation state** lives in a shared SQLite state database under the state dir (`docs/cli/cron.md:224`; `docs/tools/exec-approvals.md:110`).
- **Non-public env vars used by the e2e scripts:**
  - `OPENCLAW_SKIP_CHANNELS=1`, `OPENCLAW_SKIP_GMAIL_WATCHER=1`, `OPENCLAW_SKIP_CANVAS_HOST=1`;
  - `OPENCLAW_SKIP_BROWSER_CONTROL_SERVER=1`, `OPENCLAW_SKIP_ACPX_RUNTIME=1`, `OPENCLAW_SKIP_ACPX_RUNTIME_PROBE=1`;
  - `OPENCLAW_AGENT_HARNESS_FALLBACK=none`;
  - `OPENCLAW_SKIP_CRON=1`. **Do not set this one if you test cron or heartbeat.** It also stops scheduled heartbeats (`docs/gateway/heartbeat.md:23`).
  - Source (**e2e**): `scripts/e2e/lib/openai-chat-tools/scenario.sh:6-13`.
  - The docs say undocumented `OPENCLAW_*` variables are internal and may change (`docs/help/environment.md:32`).

### Minimal headless config (`$OPENCLAW_CONFIG_PATH`)

Modeled on the repo's e2e config writer, `scripts/e2e/lib/openai-chat-tools/write-config.mjs:26-85` (**e2e**). The provider block is from §4 and the plugin block from §2.

```json
{
  "gateway": {
    "mode": "local",
    "port": 18789,
    "bind": "loopback",
    "auth": { "mode": "token", "token": "pg-test-token" },
    "controlUi": { "enabled": false }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "mock": {
        "baseUrl": "http://127.0.0.1:4010/v1",
        "apiKey": "mock-key",
        "api": "openai-completions",
        "agentRuntime": { "id": "openclaw" },
        "request": { "allowPrivateNetwork": true },
        "timeoutSeconds": 60,
        "models": [
          { "id": "mock-model", "name": "Mock", "reasoning": false, "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 128000, "maxTokens": 4096 }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": { "primary": "mock/mock-model", "fallbacks": [] },
      "models": { "mock/mock-model": { "agentRuntime": { "id": "openclaw" } } },
      "workspace": "/abs/state/workspace",
      "skipBootstrap": true,
      "timeoutSeconds": 120,
      "heartbeat": { "every": "0m" }
    }
  },
  "tools": { "profile": "full" },
  "skills": { "allowBundled": [] },
  "plugins": {
    "enabled": true,
    "load": { "paths": ["/abs/path/pg-probe"] },
    "entries": {
      "pg-probe": {
        "enabled": true,
        "hooks": { "allowConversationAccess": true, "timeoutMs": 15000 },
        "config": { "logPath": "/abs/state/pg-probe.jsonl" }
      }
    }
  }
}
```

**Notes on this config**
- `gateway.mode: "local"` is required, or you must pass `--allow-unconfigured` (`docs/cli/gateway/running.md:22,30`).
- `heartbeat.every: "0m"` disables recurring heartbeats, so they don't fire during user-turn tests. Manual and event wakes still work (`docs/gateway/heartbeat.md:25`).
- The e2e configs also set `session.maintenance` and `fallbacks: []`. Those are optional.

---

## 4. Custom provider pointing at a local OpenAI-compatible mock

### 4.1 Config keys (docs + e2e)

`models.providers.<id>` takes:
- `baseUrl` (include `/v1`);
- `apiKey` (a string, `${ENV}`, or a SecretRef);
- `api: "openai-completions"`;
- `models: [{ id, name?, reasoning?, input?, cost?, contextWindow?, contextTokens?, maxTokens? }]`.

Optional keys: `headers`, `authHeader`, `timeoutSeconds`, `request.{headers,auth,proxy,tls,allowPrivateNetwork}`, `agentRuntime`.

Evidence:
- `docs/gateway/config-tools/custom-providers.md:14-42,66-96`;
- `docs/concepts/model-providers/custom-providers.md:381-447`;
- `agentRuntime` and `allowPrivateNetwork` on the provider appear in the repo's mock fixture, `scripts/e2e/lib/fixtures/mock-openai-config.mjs:40-66`.

**Selecting the default model**
- Set `agents.defaults.model: { primary: "<providerId>/<modelId>" }`, for example `"mock/mock-model"`.
- Per agent: `agents.entries.<id>.model.primary`.
- Per run: `openclaw agent --model mock/mock-model`.
- Also add `models.providers.<p>.models[]` with the matching `id`. `agents.defaults.models["p/m"]` alone does not register a model (`docs/concepts/model-providers/custom-providers.md:24`).

**Pin the runtime**
- Set `agentRuntime: { id: "openclaw" }` on the provider and model entry. This keeps the embedded OpenClaw loop, so hooks fire on OpenClaw tools, not the Codex native relay.
- The repo's mock fixtures do this (`scripts/e2e/lib/fixtures/mock-openai-config.mjs:33,50,56`).
- Confidence: **e2e**. Whether a non-`openai` custom provider needs it at all is **inferred** not to, but it is harmless.

**Private-network trust**
- The docs say the exact configured `scheme://host:port` origin, including loopback, is trusted automatically (`docs/gateway/config-tools/custom-providers.md:16`).
- The e2e fixture still sets `request.allowPrivateNetwork: true`. Keep it.

### 4.2 What OpenClaw sends (src)

**Transport.** The transport is the official `openai` Node SDK:
- `new OpenAI({ apiKey, baseURL, defaultHeaders, fetch: doneDetectingFetch })`;
- then `client.chat.completions.create(params)`.
- So the request is **`POST {baseUrl}/chat/completions`** (`/v1/chat/completions` with the base URL above), with header `Authorization: Bearer <apiKey>`.
- Evidence: `packages/ai/src/transports/openai-completions-transport.ts:384-387,512-582`. The embedded agent path uses `"managed"` mode (`:294-299`). **It does not call `/responses`** for `api: "openai-completions"`.

**Request body** (`packages/ai/src/transports/openai-completions-params.ts:247-380`):
- `model`: the model `id`, for example `"mock-model"`.
- `messages`:
  - The system prompt has role `"system"`. `developer` is forced off for non-OpenAI hosts (`packages/ai/src/openai-completions-messages.ts:88`; docs `custom-providers.md:436`).
  - Runtime notices appear as labeled `"user"` messages (`:121`).
  - Assistant turns carry `tool_calls`.
  - Tool results are `{ role: "tool", content: <text or "(no output)">, tool_call_id }` (`:263-272`).
- `stream: true`. It is true unless `params.streaming === false` is set for the model (`:294`).
- `stream_options: { include_usage: true }` when streaming and `compat.supportsUsageInStreaming`. That is true for loopback, `local`-class endpoints (`:297-299`; `openai-completions-compat.ts:211-215`).
- `tools: [{ type: "function", function: { name, description, parameters, strict? } }]`, sorted by name (`:174-226`).
- `tool_choice: "auto"`, only for proxy-like endpoints (`:375-379`).
- `max_completion_tokens` (or `max_tokens` for some vendors) when the model's `maxTokens` is known (`:485-489`).
- `store: false` only when `compat.supportsStore` applies. It is off for proxy-like endpoints (`openai-completions-compat.ts:203`).
- Possibly `prompt_cache_key` or `temperature`.
- **The mock should ignore unknown fields.**

### 4.3 What it parses (src)

The SDK's SSE iterator parses `data: {json}\n\n` lines. OpenClaw also watches the raw bytes for a `data: [DONE]` line (`SSE_DONE_LINE_RE = /^data:[ \t]*\[DONE\][ \t]*$/i`, `openai-completions-transport.ts:96-140,540-557`).

Per chunk (`packages/ai/src/transports/openai-completions-stream.ts:411-610`):
- `chunk.id` becomes the response id.
- `chunk.model` is recorded when it differs from the request.
- `chunk.usage` (or `choices[0].usage`) is read for `prompt_tokens`, `completion_tokens`, `total_tokens`, and `completion_tokens_details.reasoning_tokens`.
- `choices[0].delta`, or `choices[0].message` for providers that send whole messages:
  - `content`: text deltas.
  - `reasoning_content` and `reasoning_details`: thinking. **Omit these.**
  - `tool_calls[]: { index, id, type:"function", function: { name, arguments } }`.
    - Calls accumulate by `index`, or by `id` when there is no index.
    - `arguments` fragments are concatenated and parsed as JSON at the end.
    - A later non-empty `name` replaces the stored name.
- `choices[0].finish_reason` maps as follows (`packages/ai/src/providers/openai-stop-reason.ts:8-33`):
  - `"stop"`, `"end"`, or `null` → stop;
  - `"length"` → length;
  - `"tool_calls"`, `"function_call"`, or (here) `"tool_call"` → toolUse;
  - anything else → error.
- **Ending the stream.** If the stream ends without any `finish_reason` and no `[DONE]` was seen, the run fails with "Stream ended without finish_reason" (`:612-616`). **Always send a final chunk with `finish_reason`, then `data: [DONE]`.**
- **Missing usage.** Without usage, the run logs a warning that context size is estimated (`:690-699`). That is harmless, but send usage to keep logs clean.
- **Non-streaming fallback.** If you set `params.streaming: false`, the transport reads one JSON `chat.completion` body, capped at 16 MiB (`openai-completions-transport.ts:390-399`).

### 4.4 `/v1/models`

- **Not needed for ordinary turns** with explicit `models[]`. This is **inferred**: no discovery path for a plain custom provider was found.
- **It is needed for cron.** For isolated cron jobs on a local `openai-completions` provider, the scheduler first runs a preflight `GET <baseUrl>/models`. If that is unreachable, the run is recorded as **`skipped`**. The result is cached for 5 minutes. Evidence (**docs**): `docs/cli/cron.md:222`.
- **Implement it**, as the repo's own mock does (`scripts/e2e/mock-openai-server.mjs:791-797`; `extensions/qa-lab/src/providers/mock-openai/server.ts:2261`).

### 4.5 A working mock (copy-paste)

The chunk shapes mirror the repo's mock (`scripts/e2e/mock-openai-server.mjs:530-593`; `scripts/e2e/lib/mock-openai-http.mjs:88-101`).

```js
// mock-llm.mjs  — node mock-llm.mjs 4010 /abs/state/mock-requests.jsonl script.json
import http from "node:http"; import fs from "node:fs";
const [port = 4010, logPath = "/tmp/mock-requests.jsonl", scriptPath] = process.argv.slice(2);
// script: array of turns; each turn is {text} or {tool:{name, args}}; consumed in order, then default text.
let script = scriptPath ? JSON.parse(fs.readFileSync(scriptPath, "utf8")) : [];
const sse = (res, chunks) => {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
  for (const c of chunks) res.write(`data: ${JSON.stringify(c)}\n\n`);
  res.write("data: [DONE]\n\n"); res.end();
};
const chunk = (choice, extra = {}) => ({ id: "chatcmpl_mock", object: "chat.completion.chunk",
  created: Math.floor(Date.now() / 1000), model: "mock-model", choices: [{ index: 0, ...choice }], ...extra });
const usage = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (req.method === "GET" && url.pathname === "/v1/models") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ object: "list", data: [{ id: "mock-model", object: "model", owned_by: "mock" }] }));
  }
  if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
    let body = ""; for await (const p of req) body += p;
    const j = JSON.parse(body || "{}");
    fs.appendFileSync(logPath, JSON.stringify({ t: Date.now(), body: j }) + "\n");
    const last = j.messages?.at(-1);
    // After a tool result, finish with text; otherwise take next scripted step.
    const step = last?.role === "tool" ? { text: `done: ${String(last.content).slice(0, 80)}` }
                                       : (script.shift() ?? { text: "MOCK-OK" });
    if (j.stream === false) { // non-stream fallback
      const message = step.tool
        ? { role: "assistant", content: null, tool_calls: [{ id: "call_1", type: "function",
            function: { name: step.tool.name, arguments: JSON.stringify(step.tool.args) } }] }
        : { role: "assistant", content: step.text };
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ id: "chatcmpl_mock", object: "chat.completion", model: "mock-model",
        choices: [{ index: 0, message, finish_reason: step.tool ? "tool_calls" : "stop" }], usage }));
    }
    if (step.tool) {
      const id = `call_${Date.now()}`;
      return sse(res, [
        chunk({ delta: { role: "assistant", content: "" } }),
        chunk({ delta: { tool_calls: [{ index: 0, id, type: "function",
          function: { name: step.tool.name, arguments: JSON.stringify(step.tool.args) } }] } }),
        chunk({ delta: {}, finish_reason: "tool_calls" }),
        { id: "chatcmpl_mock", object: "chat.completion.chunk", model: "mock-model", choices: [], usage },
      ]);
    }
    return sse(res, [
      chunk({ delta: { role: "assistant", content: step.text } }),
      chunk({ delta: {}, finish_reason: "stop" }),
      { id: "chatcmpl_mock", object: "chat.completion.chunk", model: "mock-model", choices: [], usage },
    ]);
  }
  res.writeHead(404).end();
}).listen(Number(port), "127.0.0.1");
```

The raw SSE for one tool call looks like this:

```
data: {"id":"chatcmpl_mock","object":"chat.completion.chunk","model":"mock-model","choices":[{"index":0,"delta":{"role":"assistant","content":""}}]}

data: {"id":"chatcmpl_mock","object":"chat.completion.chunk","model":"mock-model","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"call_1","type":"function","function":{"name":"exec","arguments":"{\"command\":\"echo hi\"}"}}]}}]}

data: {"id":"chatcmpl_mock","object":"chat.completion.chunk","model":"mock-model","choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}]}

data: {"id":"chatcmpl_mock","object":"chat.completion.chunk","model":"mock-model","choices":[],"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}

data: [DONE]
```

**Mock tips**
- **Only call tools the request actually lists in `tools[]`.** Log `j.tools.map(t => t.function.name)` on the first run. Code Mode or Tool Search can change the visible surface.
  - For a custom endpoint, automatic Code Mode keeps the normal tool surface unless `compat.codeMode` is set (`docs/concepts/model-providers/custom-providers.md:18`).
  - **runtime:** confirm that the tool names are canonical (`exec`, `write`, ...).
- **Tool parameter names.** `exec` takes `command` and `workdir` (not `cwd`). `write` and `read` take paths. See `docs-findings.md` §4.

---

## 5. Running agent turns headlessly

### 5.1 CLI

Evidence (**docs**): `docs/cli/agent.md:9-24,306-381`.

```bash
# Gateway-backed (needs a running Gateway; see §8)
openclaw agent --agent main --message "do the thing" --json --timeout 120
openclaw agent --agent main --session-key pg-case-01 --message "..." --json   # => agent:main:pg-case-01
openclaw agent --session-id <id> --message "..." --json

# Embedded, no Gateway (refuses while a Gateway owns the state dir)
openclaw agent --agent main --message "..." --local --json

# Strict one-shot embedded run for CI (temp state by default; plugins still resolve from config)
openclaw agent exec "..." --config "$OPENCLAW_CONFIG_PATH" --state-dir /abs/state --json --timeout 120
```

**Rules**
- Pass at least one selector: `--to`, `--session-key`, `--session-id`, or `--agent`. Pass exactly one of `--message` or `--message-file`.
- **Exit codes.** `agent` exits 0 on completion and 1 on error, timeout, or cancel. `agent exec` exits 0, 1, or 2 (2 = timeout).
- **State-dir ownership.** `--local` and `agent exec --state-dir` need exclusive ownership of the state dir. They refuse while a Gateway owns it (`docs/cli/agent.md:46,373`). Use one mode per state dir: either a Gateway plus `openclaw agent`, or no Gateway plus `--local`.
- **Plugins load on every path.**
  - `--local` runs "after plugin registry preload" (`:339`).
  - The local path wraps the run in `withAgentPluginRegistry` (**src**: `src/agents/agent-command-local.ts:90-93`).
  - Gateway ingress does the same (`src/agents/agent-command.ts:621-628`).
  - `agent exec` with `--config` or the ambient config "installed plugins continue to resolve" (`docs/cli/agent.md:48`).

### 5.2 `trigger` and `requester` on the CLI path

**`trigger`**
- The agent command's embedded attempt hard-codes `trigger: "user"`. Inter-session CLI handoff does the same.
- Evidence (**src**): `src/agents/command/attempt-execution.ts:422,483`.

**`senderIsOwner`**
- In local or standalone runs it defaults to **`true`**: `senderIsOwner: params.opts.senderIsOwner ?? true` (**src**: `src/agents/agent-command-local.ts:70`).
- On the Gateway ingress path it is `opts.senderIsOwner === true` (`src/agents/agent-command.ts:609`). How the Gateway sets it for an operator CLI client was not traced. **runtime:** probably true for a token or admin client.

**`requester` (inferred)**
- The tool context is built with `messageChannel`, `messageProvider`, `agentAccountId`, `senderId`, and `senderIsOwner` (`src/agents/command/attempt-execution.ts:314-331`).
- The Codex relay's equivalent builder makes `requester` from those fields and drops it when all are empty (`extensions/codex/src/app-server/hook-requester.ts:7-27`).
- So the expected CLI `ctx.requester` is roughly `{ senderIsOwner: true }`, maybe plus `channel` for the main session's last channel, and no `senderId`. **runtime:** dump `ctx.requester` and `ctx.channelId` in both the local and Gateway modes.

**Approvals**
- `requireApproval` in CLI turns is rejected as "non-interactive CLI runs" (§1.4).
- To test approvals, use a channel turn, or a Gateway operator client with an approval reviewer.

### 5.3 qa-channel and `openclaw qa`

**Availability**
- `qa-channel` and `qa-lab` are **private packages excluded from packaged installs** (`docs/channels/qa-channel.md:10,116-123`; `extensions/qa-channel/package.json` has `"private": true`).
- All `qa` flows are documented as `pnpm openclaw qa <subcommand>` from a source checkout (`docs/concepts/qa-e2e-automation/command-surface.md:12`).
- **On a cluster running an npm-installed OpenClaw, neither is available.** You would need a source checkout at the tag, or the "installed-candidate fixture" recipe that builds the two packages and adds them to `plugins.load.paths` (`docs/channels/qa-channel.md:116-165`).

**Commands** (`docs/concepts/qa-e2e-automation/command-surface.md:15-39`; `extending-the-stack.md:86-104`):
- `qa suite [--scenario <id>] [--provider-mode mock-openai]`
- `qa run --qa-profile smoke-ci`
- `qa manual`
- `qa mock-openai [--host]`: starts only the mock server.
- `qa aimock`
- `qa ui`
- `qa up`

**The `mock-openai` lane mocks the Responses API, not chat completions**
- Routes: `/v1/responses`, `/v1/models`, `/v1/messages`, `/v1/embeddings`, images, audio, `/debug/*` (`extensions/qa-lab/src/providers/mock-openai/server.ts:224-228,2257-2359`).
- Its gateway config uses `api: "openai-responses"` on the `openai` provider (`scripts/e2e/lib/fixtures/mock-openai-config.mjs:45-56`).
- It is scenario-aware: it picks tool calls from directives in the prompt text.
- For your own tests, the hand-written chat-completions mock in §4.5 is simpler and fully under your control.

**qa-channel config**
```json
{ "channels": { "qa-channel": { "baseUrl": "http://127.0.0.1:43123", "botUserId": "openclaw",
  "allowFrom": ["*"], "pollTimeoutMs": 1000 } } }
```
- Also `groupPolicy`, `groupAllowFrom`, `groups.<room>.requireMention`, `actions.*`, and `accounts`.
- The channel **long-polls a QA bus**:
  - `POST /v1/poll {accountId, cursor, acknowledgedCursor, timeoutMs}`;
  - outbound sends go to `POST /v1/outbound/message`;
  - actions go to `/v1/actions/{thread-create,react,edit,delete,read,search}`;
  - inbound messages are injected with `POST /v1/inbound/message` and the state is read with `GET /v1/state`.
- Evidence (**src**): `extensions/qa-channel/src/bus-client.ts:175-255`. The bus server is in `qa-lab` (`extensions/qa-lab/src/bus-server.ts`).
- Inbound input: `{ accountId?, conversation: {id, kind: "direct"|"group"|"channel", title?}, senderId, senderName?, text, threadId?, replyToId?, attachments?, nativeCommand? }` (`src/plugin-sdk/qa-channel-protocol.ts:98-102,192-205`).

**Owner and non-owner: yes, both can be simulated (src)**
- Set `commands.ownerAllowFrom: ["qa-channel:alice"]` and, optionally, `commands.allowFrom: { "qa-channel": ["alice","bob"] }`.
- Inject with `senderId: "alice"` (owner) or `senderId: "bob"` (non-owner).
- The repo's scenario `qa/scenarios/channels/system-agent-owner-trust.yaml:12-17,78-118` does exactly this with `sendInbound` steps.
- Owner resolution goes through `commands.ownerAllowFrom` (`docs/gateway/config-channels/commands.md:27,53`).
- qa-channel admits the DM as `dmPolicy: "open"` and marks commands authorized (`extensions/qa-channel/src/inbound.ts:365-402,452-458`).
- **runtime:** confirm that `before_tool_call` `ctx.requester.senderIsOwner` is `true` for alice and `false` or absent for bob.

**Scenario format**
- YAML under `qa/scenarios/**`. Top-level `title`, then:
  - `scenario: { id, surface, coverage, objective, gatewayConfigPatch, successCriteria, execution: { kind: flow, config: {...} } }`;
  - `flow: { steps: [{ name, actions: [...] }] }`.
- Actions include `assert`, `call` (for example `waitForGatewayHealthy`, `waitForQaChannelReady`, `waitForOutboundMessage`, `env.gateway.call`), `set`, and `sendInbound`.
- `gatewayConfigPatch` can add `plugins.load.paths` and `plugins.entries` for the Guard.
- Evidence (**src**): `qa/scenarios/channels/system-agent-owner-trust.yaml:1-120`.

**Without a source checkout:** a small fake QA bus of your own (`/v1/poll` and `/v1/outbound/message`) is the only route to a channel-shaped owner or non-owner turn. It still needs the private `qa-channel` plugin code. Otherwise use a real channel.

---

## 6. Triggering cron and heartbeat runs on demand

Both need a running Gateway (`docs/cli/cron.md:27-31`; `docs/cli/system.md:15,82`). Both need `operator.admin` for mutations: use the Gateway token. Do not set `OPENCLAW_SKIP_CRON`.

### Cron (`openclaw cron`, alias `openclaw automations`)

These commands mirror the repo's e2e (**e2e**: `scripts/e2e/cron-cli-docker.sh:89-91,319-327,462`).

```bash
T="--token pg-test-token"
# isolated agent-turn job; hourly so it won't fire during the test; no chat delivery
openclaw cron add "pg cron probe" --every 1h --session isolated \
  --message "run the cron probe" --no-deliver --json $T > /tmp/job.json
JOB=$(node -e 'console.log(JSON.parse(require("fs").readFileSync("/tmp/job.json","utf8")).id)')
openclaw cron run "$JOB" --wait --wait-timeout 120s --poll-interval 500ms $T     # forced run
openclaw cron runs "$JOB" --limit 5 --json $T
openclaw cron rm "$JOB" --json $T
# main-session system-event job (fires a heartbeat-style wake, no isolated agent):
openclaw cron add "pg event" --every 1h --session main --system-event "probe event" --json $T
```

- `cron run` force-runs and skips `trigger.script`. With `--wait`, it polls `cron.runs` and exits 0 only for `completionStatus: "succeeded"` (`docs/cli/cron.md:226-249`).
- `--session` accepts `main`, `isolated`, `current`, or `session:<id>`. From the CLI it defaults to `isolated` (`:114-125`).
- **Mock preflight:** an isolated job against a local provider first calls `GET /v1/models` (§4.4).
- An agent can also trigger cron with the `automations` tool: `{action:"run", runMode:"force"}`. Its default is `"due"` (`docs/cli/cron.md:236`).
- **Expected hook ctx:** `ctx.trigger === "cron"` and `ctx.jobId` on agent hooks such as `model_call_started`. There is no `ctx.requester` on the tool ctx (see `docs-findings.md` Q6). **runtime.**

### Heartbeat

```bash
openclaw system event --text "pg heartbeat probe" --mode now --token pg-test-token --json   # immediate heartbeat
openclaw system event --text "x" --session-key agent:main:main --token pg-test-token          # targeted wake
openclaw system heartbeat last --token pg-test-token
```

- Source: `docs/cli/system.md:29-73` and `docs/gateway/heartbeat.md:536-560`.
- **Busy deferral.** Scheduled heartbeats defer while the agent is busy; manual and event wakes don't need cron (`docs/gateway/heartbeat.md:23-29,104`).
- **Rate limit.** Event wakes are limited to 30 s between event turns, plus a flood guard of 5 starts per 60 s (`:27`). **Space heartbeat tests at least 30 s apart.**
- **No-op reply.** Heartbeat runs may reply `NO_REPLY` or call `heartbeat_respond` (`:158-169`). The mock should just return text `NO_REPLY` unless the test wants a tool call.
- **Expected hook ctx:** `ctx.trigger === "heartbeat"`. **runtime.**

---

## 7. Tool availability in a headless run

**Profiles** (**docs**: `docs/gateway/config-tools/tool-policy.md:12-104`)
- An unset `tools.profile` leaves core tools unfiltered, but optional plugin tools are not selected.
- `tools.profile: "full"` adds optional plugin tools too.
- `coding` covers `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, and others. It does **not** include `message` or the `openclaw` delegate.
- `messaging` includes `message` and the session tools, but not `exec` or `fs`.

**Groups**
- `group:fs` = `read`, `write`, `edit`, `apply_patch`
- `group:runtime` = `exec`, `process`, `code_execution`
- `group:web` = `web_search`, `x_search`, `web_fetch`
- `group:sessions` includes `sessions_spawn` and `sessions_send`
- `group:automation` = `heartbeat_respond`, `automations` (alias `cron`), `gateway`, `plugins`, `openclaw`
- `group:messaging` = `message`

**Recommended harness setting**
- Use `tools.profile: "full"`, or an unset profile with explicit `tools.alsoAllow`.
- For per-test narrowing, use `tools.allow` and `tools.deny`. `deny` wins (`:184-213`).
- `agent exec` defaults to the `coding` profile and full exec when your config leaves those unset (`docs/cli/agent.md:38`).

**`exec`: no prompts by default**
- "No-approval host exec is the default for gateway and node (`mode=full`)". With no settings or sandboxing, the default permission posture is full access.
- Evidence (**docs**): `docs/tools/exec.md:125`; `docs/gateway/permission-modes.md:44`.
- To make it explicit:
  ```json5
  tools: { exec: { host: "gateway", mode: "full", strictInlineEval: false } }
  ```
  If an approvals document has been tightened, also set host approvals: `openclaw approvals set --stdin <<<'{version:1,defaults:{security:"full",ask:"off",askFallback:"full"}}'`. Approvals live in the SQLite state DB.
- Offline only (no Gateway running): `openclaw exec-policy preset yolo` (`docs/tools/exec-approvals.md:110,195-205,316-392`).
- Leave `agents.defaults.sandbox` off.

**`write`, `read`, `edit`, `apply_patch`**
- Workspace-contained by default even in `full` exec mode (`docs/gateway/permission-modes.md:52`).
- Point test paths inside `agents.defaults.workspace`.

**`web_fetch`**
- On by default (`docs/tools/web-fetch.md:17,118`).
- It **blocks private and loopback hosts**. To fetch a local "attacker" page server, set `tools.web.fetch.ssrfPolicy.allowedHostnames: ["attacker.test"]` or `dangerouslyAllowPrivateNetwork: true` (`:133-138`). **runtime:** confirm that an `/etc/hosts` name resolving to 127.0.0.1 passes with `allowedHostnames`.

**`message`**
- Needs a channel route. In pure CLI runs with no channel configured, expect it to be absent or to fail. **inferred/runtime.**
- Use qa-channel, or test only the `before_tool_call` decision. A blocked call never needs delivery.

**`automations`, `gateway`, `openclaw`**
- These are owner-gated and admin-scoped tools.
- In CLI local runs the sender is the owner by default (§5.2).
- In cron runs, the job's `toolsAllow` defaults to `["*"]` (e2e `scripts/e2e/cron-cli-docker.sh:336-338`). `cron edit --tools read` narrows it.

**`sessions_spawn`**
- In `group:sessions`, so the full and coding profiles include it.
- Sub-agents spawn in the same Gateway. Hooks fire with the child `sessionKey`, and `subagent_spawned` links parent and child.

---

## 8. Gateway

**Is it needed?**
- **Yes**, for:
  - Gateway-backed `openclaw agent`;
  - `openclaw cron ...` and `openclaw system event/heartbeat`;
  - channels (qa-channel), plugin approvals, and `gateway_start` / `gateway_stop` hooks.
- **No**, for `openclaw agent --local` and `openclaw agent exec`. Those **refuse** to run while a Gateway owns the same state dir (`docs/cli/agent.md:11,28,46,373`).

**Headless start** (**docs + e2e**)
- Docs: `docs/cli/gateway/running.md:13-104`.
- e2e: `scripts/lib/openclaw-e2e-instance.sh:353` runs `node <entry> gateway --port <p> --bind loopback --allow-unconfigured`, and waits for the log line `[gateway] ready` (`:358-361`).
- The CLI is the same:

```bash
export OPENCLAW_STATE_DIR=/abs/state OPENCLAW_CONFIG_PATH=/abs/state/openclaw.json
export OPENCLAW_GATEWAY_TOKEN=pg-test-token
openclaw gateway run --port 18789 --bind loopback --auth token --token "$OPENCLAW_GATEWAY_TOKEN" \
  > /abs/state/gateway.log 2>&1 &
# readiness: grep '[gateway] ready' in the log, or:
openclaw gateway health --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN" --timeout 120000 --json
```

- **`gateway.mode`.** Startup refuses unless `gateway.mode=local` or `--allow-unconfigured` (`docs/cli/gateway/running.md:22,77-79`). Exit code 78 means invalid config.
- **Bind and auth.** Loopback is the default bind. Binding beyond loopback without auth is blocked (`:31,49-61`).
- **`--force`** kills an existing listener, but refuses to kill a verified Gateway from a non-interactive shell (`:102-104`). Use a fresh port and state dir per test run.
- **Raw stream logging.** `--raw-stream --raw-stream-path <p>` logs raw model stream events to JSONL. This is useful for debugging the mock (`:127-132`).
- **Model debug env vars:** `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted` and `OPENCLAW_DEBUG_SSE=peek` (`docs/help/environment.md`, logging table).

**How the CLI reaches the Gateway**
- `agent`, `cron`, `system`, `plugins install|enable`, and `gateway health` connect over WebSocket to the local Gateway. The port comes from config or env.
- Pass `--token` or set `OPENCLAW_GATEWAY_TOKEN`. Use `--url ws://127.0.0.1:<port>` or `--port` for a non-default port.
- Loopback calls with token auth skip device pairing (`docs/cli/cron.md:22-31`).
- `openclaw agent` never silently falls back to embedded execution if the Gateway connection fails (`docs/cli/agent.md:379`).

---

## 9. Verify these first at runtime (ordered)

1. **The plugin loads from a bare `plugins.load.paths` entry with no consent prompt**, and its hooks register. Check `openclaw plugins inspect pg-probe --runtime --json` and the `__register` line in the JSONL. If consent is demanded at Gateway load, fall back to `plugins install -l <dir> --force --accept-capabilities`.
2. **The mock contract.**
   - The first request reaches `POST /v1/chat/completions` with `stream: true` and `stream_options.include_usage`.
   - A `tool_calls` delta with `finish_reason: "tool_calls"` then `[DONE]` produces a real tool execution and a second request carrying a `role: "tool"` message.
   - Log the `tools[]` names to confirm they are canonical.
3. **The provider route.** A custom provider id without `agentRuntime` runs on the embedded OpenClaw loop and not a harness. Keep `agentRuntime: {id:"openclaw"}` to be safe.
4. **CLI-turn identity.** For `openclaw agent` (Gateway) and `openclaw agent --local`, dump `ctx.requester`, `ctx.channelId`, and the agent-ctx `trigger`. Expected: `trigger: "user"` and `senderIsOwner: true` on local runs; the Gateway path is unverified.
5. **Cron:** `trigger: "cron"`, `jobId` set, and the `/v1/models` preflight is hit. **Heartbeat:** `trigger: "heartbeat"`. Mind the 30 s event-wake rate limit.
6. **qa-channel availability.** It is not in npm installs. Decide early between a source checkout at `v2026.10.8` and a real channel for owner and non-owner, `/guard`, and approval tests.
7. **`web_fetch` to a local attacker server** needs an `ssrfPolicy` opt-in. **`message`** in CLI-only runs probably has no route.
