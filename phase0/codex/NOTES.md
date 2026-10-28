# Phase 0: Codex runtime probe (OpenClaw v2026.10.8, Codex 0.160.0)

Goal: see at runtime which `toolName` and `params` a plugin's `before_tool_call` receives for
Codex-native tools (shell, `apply_patch`, `spawn_agent`), with Codex pointed at a mock LLM.

Sources were read as text through the GitHub API only: `openclaw/openclaw@v2026.10.8` and
`openai/codex@rust-v0.160.0` (the tag matching the pinned `@openai/codex` 0.160.0). Paths below are
repo-relative to those tags. Nothing here has been run yet.

## 0. Summary

| Question | Answer |
|---|---|
| Runtime selection | `agents.defaults.models["openai/gpt-5.6-luna"].agentRuntime.id = "codex"` (§1.2) |
| OpenClaw-side `models.providers.openai.baseUrl` | Must stay `https://api.openai.com/v1`. The mock is reached only through Codex's `-c openai_base_url=...` (§1.1) |
| Auth | An `api_key` auth profile for provider `openai` (QA stages one). Fallbacks: literal provider `apiKey`, then `CODEX_API_KEY` / `OPENAI_API_KEY` for local stdio (§1.4) |
| Plugin id / config | `codex`, at `plugins.entries.codex.config.appServer.*` (§2) |
| `plugins.load.paths` → `/pg/oc/node_modules/@openclaw/codex` | **Does not work.** Load paths get origin `config`, and the Codex harness registration is then refused. Use `openclaw plugins install` (origin `global`) (§2.2) |
| Binary | `@openai/codex/bin/codex.js`, resolved from the plugin root, then the `@openai/codex-linux-x64` optional dependency's `vendor/x86_64-unknown-linux-musl/bin/codex` (§3) |
| `--ignore-scripts` | Safe: no install scripts anywhere in the Codex packages (§3) |
| Transport | HTTP SSE is enough. The WebSocket is not mandatory: a 426 reply to the upgrade makes Codex fall back to HTTP at once (§4.1) |
| Shell tool name | `exec_command`, a function tool with `{cmd, ...}`. No `local_shell` or `shell` tool exists in 0.160.0 (§4.3) |
| `apply_patch` | A **custom** (freeform, Lark-grammar) tool. The model returns a `custom_tool_call` with raw `input` (§4.3) |
| Expected `before_tool_call` | `exec {command}`, `apply_patch {command: <patch text>}`, `spawn_agent {message, ...}` (§5) |

## 1. The QA lab's Codex mock lane

### 1.1 Provider, model, and the two base URLs

- **Model ref remap.** The forced-Codex mock lane uses `mock-openai/*` refs, remapped to
  `openai/<model>` (`extensions/qa-lab/src/model-selection.ts:49-60`). The default model ids are
  `gpt-5.6-luna` and `gpt-5.6-luna-alt` (`extensions/qa-lab/src/providers/shared/mock-model-config.ts:10`).
- **OpenClaw catalog: official URL, synthetic models.**
  `extensions/qa-lab/src/qa-gateway-config.ts:188-205` sets `models.mode: "replace"` and
  `providers.openai = {...mockCatalog, baseUrl: QA_CODEX_OPENAI_CATALOG_BASE_URL, request: undefined}`,
  with the models' `compat` removed.
  - `QA_CODEX_OPENAI_CATALOG_BASE_URL = "https://api.openai.com/v1"` (`:40`).
  - The comment explains why: "Keep synthetic QA model ids registered without authoring the private
    mock route that the Codex harness cannot reproduce."
  - The remaining fields come from `mock-model-config.ts:43-68`: `apiKey: "test"`,
    `api: "openai-responses"`, and models with `reasoning: true`, `input: ["text","image"]`, and zero cost.
- **Why the URL must stay official.** With runtime policy unset or `auto`, a custom endpoint selects
  the OpenClaw runtime. An explicit `agentRuntime.id: "codex"` "fails closed" on unsupported routes
  (`docs/providers/openai/runtimes.md:24-53`). The `openai/*` prefix alone never selects Codex
  (`docs/plugins/codex-harness.md:366-376`).
- **Codex's own URL points at the mock.** It is set through `OPENCLAW_CODEX_APP_SERVER_ARGS`,
  built by `extensions/qa-lab/src/codex-app-server-args.ts:25-37`:

  ```text
  app-server -c openai_base_url=<mock>/v1 -c "model_catalog_json=<path>"
    -c sandbox_workspace_write.exclude_tmpdir_env_var=true
    -c sandbox_workspace_write.exclude_slash_tmp=true --listen stdio://
  ```

  - The env var is set in `extensions/qa-lab/src/gateway-child-env.ts:207-224`.
  - OpenClaw splits the string with a quote-aware splitter (`extensions/codex/src/app-server/config-utils.ts:59-71`).
  - Config `appServer.args` would override the env var (`config-options.ts:131`), so `write-config.mjs` does not set it.
- **Codex model catalog.** `stageQaCodexMockModelCatalog` writes `{models: listMockCodexModelInfos()}`
  to a file (`gateway-child-env.ts:159-185`). The entry shape is at `mock-model-config.ts:126-162`,
  with `shell_type: "shell_command"`, `apply_patch_tool_type: "freeform"`, and `tool_mode: "direct"`.
  `mock-responses.mjs --write-catalog` writes the same shape.
- **Embeddings.** Memory embeddings bypass the model runtime, so QA binds `memory.search` to the mock
  (`qa-gateway-config.ts:216-228`). `write-config.mjs` copies this, and the mock serves `/v1/embeddings`.

### 1.2 Runtime id

- The `configured` selection writes `agents.defaults.models[ref] = {agentRuntime: {id: "codex"}}`
  (`qa-gateway-config.ts:161-169`).
- QA's default forced lane instead sets `OPENCLAW_QA_FORCE_RUNTIME=codex` (`gateway-child-env.ts:198-203`).
  That env var is private to QA, so it is not used here.
- QA also enables the `codex` plugin in every forced-Codex cell (`qa-gateway-config.ts:124-127`), with
  `config.appServer.sandbox: "workspace-write"` (`:137-146`).

### 1.3 Environment variables

| Var | Source | Used here |
|---|---|---|
| `OPENCLAW_CODEX_APP_SERVER_ARGS` | mock URL, catalog, `--listen stdio://` | yes |
| `OPENCLAW_SKIP_STARTUP_MODEL_PREWARM=1` | `gateway-child-env.ts:100` | yes |
| `OPENCLAW_QA_FORCE_RUNTIME`, `OPENCLAW_BUILD_PRIVATE_QA` | `gateway-child-env.ts:149-150, 198-203` (private QA build) | no |
| `CODEX_API_KEY` | QA hands it over only in `live-frontier` mode (`gateway-child-env.ts:126-132`) | fake value, as a fallback |

Other app-server overrides exist (`docs/plugins/codex-harness-reference/app-server-transport.md:276-283`;
read at `extensions/codex/src/app-server/config-options.ts:121-148, 274`):
`OPENCLAW_CODEX_APP_SERVER_BIN`, `_MODE`, `_APPROVAL_POLICY`, and `_SANDBOX`.

### 1.4 Auth

- **What QA does.** The runtime needs matching API-key profiles even though the mock accepts any key
  (`extensions/qa-lab/src/providers/shared/mock-auth.ts:30-59`).
  - Profiles `qa-mock-openai` and `qa-mock-anthropic` are written for agents `main` and `qa`.
  - Each is `{type: "api_key", provider, key: "qa-mock-not-a-real-key"}`, with an auth-profile config entry `mode: "api_key"`.
- **Packaged builds.** For an installed package, QA runs the CLI instead
  (`gateway-child-setup.ts:136-170`):

  ```bash
  openclaw models auth --agent qa paste-api-key --provider openai --profile-id qa-mock-openai
  ```

  The key is piped on stdin as `sk-qa-mock-<uuid>` (`:103-106`).
- **Order the harness uses.**
  1. An explicit or ordered OpenClaw auth profile.
  2. For an API-key route only, a prepared key, or the local stdio fallback `CODEX_API_KEY` then `OPENAI_API_KEY`.

  Sources: `docs/plugins/codex-harness-reference/auth.md:30-34`; `docs/providers/openai/runtimes.md:82-98`.
  The env fallback is used only when the app-server reports no account. A literal provider `apiKey`
  is a fallback after eligible profiles (`runtimes.md:60`).
- **What Codex itself expects.** The built-in `openai` provider has `requires_openai_auth: true` and
  `supports_websockets: true` (`codex-rs/model-provider-info/src/lib.rs:520-555`). OpenClaw logs it
  in through app-server `account/login/start`; the API-key login uses the ephemeral credential store,
  so no `auth.json` is written (`auth.md:45-49, 70-73`).
- **Harness choice.** `inner.sh` pastes `sk-pg-mock-not-a-real-key` as profile `pg-mock-openai`. It
  also keeps `apiKey` in the provider and exports `CODEX_API_KEY`. `OPENAI_API_KEY` stays unset, so
  no other subsystem picks up the fake key.

### 1.5 Things to avoid

- **No finite tool allowlist and no unsafe denies.** Either makes the turn "policy-restricted".
  Restricted turns disable the native hook relays and drop native Code Mode and `spawn_agent`
  (`docs/plugins/codex-harness-reference/restricted-turns.md:15-26, 49-58`). The base config uses
  `tools.profile: "full"` with no allow/deny, which is fine.
- **No operator role model policy** (`gateway.operator` roles). Restricted runs need an
  OpenClaw-owned inference route, and custom providers need a native `base_url`
  (`docs/plugins/codex-harness/routing.md:75-80, 91-103`). The proxy rewrites the provider
  `base_url` (`extensions/codex/src/app-server/inference-provider-config.ts:42-97`).
  - QA's `agents.defaults.modelPolicy.allow` (`qa-gateway-config.ts:275`) is not needed, and is left out.
- **Tool profile `coding` or `full`.** `messaging` and `minimal` disable the native surface
  (`docs/plugins/codex-harness.md:384-387`).
- **No authored request overrides** on the openai provider or model (`request`, `headers`, `params`,
  `compat`). These turn the route into an OpenClaw one (`runtimes.md:28-35`).

## 2. Enabling `@openclaw/codex`

### 2.1 Id and config

- **Identity.** Plugin id `codex` (`extensions/codex/openclaw.plugin.json:2`). Package `@openclaw/codex`
  2026.10.8, which depends on `@openai/codex` 0.160.0 (`extensions/codex/package.json:2-11`).
- **Activation.** The plugin activates on the agent harness `codex` (`openclaw.plugin.json:83-93`).
- **Config.** Keys live at `plugins.entries.codex.config.appServer.*` (schema at `openclaw.plugin.json:351-500`):
  `transport`, `command`, `args`, `mode` (`yolo|guardian`), `approvalPolicy`, `sandbox`
  (`read-only|workspace-write|danger-full-access`), `loopDetectionPreToolUseRelay`,
  `requestTimeoutMs`, `clearEnv`, and others.
- **Defaults.** For `tools.exec.mode: "full"` the defaults are yolo, `approvalPolicy: never`, and
  `sandbox: danger-full-access` (`extensions/codex/src/app-server/config-options.ts:240-245, 272-279`;
  `app-server-transport.md:107-109`).
  - `write-config.mjs` sets `sandbox: "danger-full-access"` explicitly.
  - `workspace-write` needs bubblewrap user namespaces, which QA skips when they're denied
    (`extensions/qa-lab/src/codex-native-hook-pressure.e2e.test.ts:163-199`).
  - Override with `PG_CODEX_SANDBOX`.
- **Allowlist.** Add `codex` to `plugins.allow` if an allowlist is used (`docs/plugins/codex-harness.md:587-588`).

### 2.2 Why `plugins.load.paths` does not work

1. **The plugin registers its harness with `nativeCompaction`.**
   `extensions/codex/index.ts:270-272` calls
   `api.registerAgentHarness(createCodexAppServerAgentHarness(...), {nativeCompaction: ...})`.
2. **That registration requires reserved ownership.** It needs `canClaimReservedCommandOwnership(record)`.
   Otherwise it fails with "native compaction requires the registry-owned \"codex\" harness", and
   the harness is not registered (`src/plugins/registry-registrars-providers.ts:94-104`).
3. **Reserved ownership requires origin `bundled` or `global`.** The check is `origin === "bundled"`
   or an official Codex record. An official record means `id === "codex" && origin === "global"`,
   plus either `packageName === "@openclaw/codex"` or a path containing `/node_modules/@openclaw/codex`
   (`src/plugins/registry-registrars-operations.ts:43-63`).
4. **Load paths get origin `config`.** Entries in `plugins.load.paths` are discovered with
   `origin: "config"` (`src/plugins/discovery.ts:917-921`). Install records and the global
   extensions root get `origin: "global"` (`discovery.ts:1117-1137`).
5. **The docs agree.** Load-path and `--link` copies "do not inherit official package trust"
   (`docs/cli/plugins/install.md:85-92`).

So a `/pg/oc/node_modules/@openclaw/codex` load path loads the plugin, but no `codex` harness is
registered. With `OPENCLAW_AGENT_HARNESS_FALLBACK=none`, the turn then fails.

**How it is loaded instead:**

- **`CODEX_INSTALL=managed` (default).** `inner.sh` runs, per run:

  ```bash
  openclaw plugins install @openclaw/codex@2026.10.8 --pin
  ```

  If that fails, it retries with `npm:@openclaw/codex@2026.10.8 --pin --force`.
  - The plugin lands in a managed npm project under `$OPENCLAW_STATE_DIR/npm`. Install roots follow
    `OPENCLAW_STATE_DIR` (`src/plugins/install-root-context.ts:19-30`; `src/infra/config-dir.ts:7-19`).
  - The path contains `/node_modules/@openclaw/codex` and the plugin gets origin `global`.
  - Verified first-party npm installs need no `--accept-capabilities`
    (`docs/plugins/manage-plugins.md:146-150`).
  - This needs the npm registry each run; `/pg/npm-cache` makes repeats cheap.
  - The install runs against the `pre` config, which has no codex entry yet. The `final` stage then
    merges the codex entry and the runtime pin into whatever the install wrote.
- **`CODEX_INSTALL=link` (fallback, unproven).** Symlinks the `/pg/oc` copy into the global
  extensions root `$OPENCLAW_STATE_DIR/extensions/codex`. Discovery follows symlinked directories
  and only checks that the entry stays inside the real root and that file owners are sane
  (`discovery.ts:104-114, 170-177, 208`). The package name is `@openclaw/codex`, so the official
  check passes. There is no install record, so trust checks that need one (`record-missing`,
  `src/plugins/plugin-trust.ts:49-56`, used for hook agent turns) may still refuse something.
- **Check the result.** After either mode, `out/plugin-inspect-codex.txt` should show origin
  `global` and a registered `codex` harness.

## 3. How Codex finds its binary

1. **Command source.** With no `appServer.command` and no `OPENCLAW_CODEX_APP_SERVER_BIN`, the
   source is `managed` (`config-options.ts:119-128`).
2. **Launcher.** `resolveManagedCodexPackageEntrypoint` resolves `@openai/codex/bin/codex.js` with
   `createRequire(<pluginRoot>/package.json)` (`extensions/codex/src/app-server/managed-binary.ts:216-226`).
   - The plugin root is recorded from `api.rootDir` at registration (`extensions/codex/index.ts:91`).
   - The launcher must be executable (`X_OK`, `managed-binary.ts:228-234`). npm's bin linking sets that.
3. **Native binary.** `codex.js` picks `@openai/codex-<os>-<arch>` and runs its
   `vendor/<triple>/bin/codex`, which is `x86_64-unknown-linux-musl` on linux-x64
   (`codex-cli/bin/codex.js:16-23, 79-110` in openai/codex).
4. **Version.** QA checks `/proc/<pid>/exe` is named `codex` and reports `codex-cli 0.160.0`
   (`codex-native-hook-pressure.e2e.test.ts:632-650`).

**`--ignore-scripts`:** safe.

- `codex-cli/package.json` has no `scripts`.
- Platform packages are generated with only `name`, `version`, `os`, `cpu`, `files: ["vendor"]`, and
  similar fields, with no scripts (`codex-cli/scripts/build_npm_package.py:250-264`).
- They are wired in as `optionalDependencies` aliases (`npm:@openai/codex@<ver>-linux-x64`, `:300-308`).
- OpenClaw's own managed installs always use `--ignore-scripts` (`docs/cli/plugins/install.md:215`).

What breaks the binary: `--omit=optional` or `--no-optional`, or installing on a different OS/arch
than the one that runs it. Install inside the container.

## 4. The Responses API stream Codex 0.160.0 expects

`mock-responses.mjs` follows the QA mock (`extensions/qa-lab/src/providers/mock-openai/`).

### 4.1 Transport

- **Endpoint.** Codex calls `POST <openai_base_url>/responses`. QA's mock serves SSE when
  `body.stream === true` and the final response JSON otherwise
  (`mock-openai/server.ts:2359-2361`; `mock-openai-responses-http.ts:40-48`).
- **SSE frames.** Each frame is data-only, `data: <json>\n\n`, ending with `data: [DONE]\n\n`
  (`mock-openai-contracts.ts:460-491`).
  - Codex reads the event `type` from the JSON and skips frames it cannot parse, so `[DONE]` is
    harmless (`codex-rs/codex-api/src/sse/responses.rs:573-584`).
  - It stops after `response.completed` (`:629-637`).
- **WebSocket.**
  - **Codex tries it first.** The built-in provider has `supports_websockets: true`, and Codex starts
    with a `response.create` prewarm carrying `generate: false` (`codex-rs/core/src/client.rs:17-26`).
  - **A 426 reply avoids the retries.** If the upgrade answers HTTP **426**, Codex falls back to HTTP
    at once (`client.rs:1919-1923`). The fallback is session-scoped (`client.rs:254-259, 645-665`).
    Other failures reach the same fallback, but only after retries. QA notes that "An SSE-only mock
    makes each native turn pay websocket reconnect/fallback retries"
    (`mock-openai-responses-websocket.ts:41-45`).
  - **Not mandatory.** The mock therefore answers every upgrade with 426 and implements no
    WebSocket (QA's version uses the `ws` package).
- **`GET /v1/models`.** Returns `{data: [{id, object: "model"}], models: <Codex model infos>}`
  (`codex-native-hook-pressure.e2e.test.ts:336-344`; `server.ts:2261-2269`). With
  `model_catalog_json` set, Codex may not call it at all.

### 4.2 Event sequence (`mock-openai-stream.ts:8-123`)

Every reply starts with `response.created` and ends with `response.completed`:

- **`response.created`:** `{response: {id, object: "response", status: "in_progress", output: [], created_at, model}}`.
- **`response.completed`:** `{response: {id, object: "response", status: "completed", output: [<all items>], usage: {input_tokens, output_tokens, total_tokens}}}`.
  - Codex requires `response.id`; `usage` is optional and, when present, needs those three integers
    (`codex-rs/codex-api/src/sse/responses.rs:105-126`).

**(a) Plain text reply**

1. `response.output_item.added` with `{output_index: 0, item: {type: "message", id: "msg_…", role: "assistant", status: "in_progress", phase: "final_answer", content: []}}`.
2. `response.content_part.added` with `{item_id, output_index, content_index: 0, part: {type: "output_text", text: "", annotations: []}}`.
3. `response.output_text.delta` with `{item_id, output_index, content_index, delta}`.
4. `response.output_text.done` with `{…, text}`.
5. `response.content_part.done` with `{…, part}`.
6. `response.output_item.done` with the completed message, `content: [{type: "output_text", text, annotations: []}]`.

**(b) Function call (`exec_command`, `spawn_agent`)**

1. `response.output_item.added` with `{item: {type: "function_call", id: "fc_…", call_id: "call_…", name, [namespace], arguments: ""}}`.
2. `response.function_call_arguments.delta` with `{item_id, output_index, delta: <args JSON string>}`.
3. `response.function_call_arguments.done` with `{item_id, output_index, name, arguments}`.
4. `response.output_item.done` with the full item, where `arguments` is a JSON **string**.

**(c) Custom tool call (`apply_patch`)**

1. `response.output_item.added` with `{item: {type: "custom_tool_call", id: "ctc_…", call_id, name: "apply_patch", input: "", status: "in_progress"}}`.
2. `response.custom_tool_call_input.delta` with `{item_id, call_id, output_index, delta}`.
3. `response.custom_tool_call_input.done` with `{item_id, output_index, input}`.
4. `response.output_item.done` with `{…, input: <raw patch text>, status: "completed"}`.

**How Codex reads these.** Codex acts on `response.output_item.done` items (the `ResponseItem` serde
enum). `output_text.delta` and `custom_tool_call_input.delta` are used for streaming only; the other
events are ignored (`responses.rs:344-500`). Item fields (`codex-rs/protocol/src/models.rs`):

| Item | Fields |
|---|---|
| `FunctionCall` | `{id?, name, namespace?, arguments: String, call_id}` (`:1074-1095`) |
| `CustomToolCall` | `{id?, status?, call_id, name, namespace?, input}` (`:1134-1153`) |

**What Codex sends back** in the next request's `input`:

- `{type: "function_call_output", call_id, output}`. For `exec_command`, `output` is a string
  containing `"\nProcess exited with code 0\n"` (`codex-native-hook-pressure.e2e.test.ts:610-613`).
- `{type: "custom_tool_call_output", call_id, output}` (`models.rs:1114, 1155`).

The mock counts both kinds after the marked user input to find the step.

### 4.3 Tool names in the request's `tools` array

**Tool types.** In 0.160.0, `ToolSpec` serializes only as `function`, `namespace`, `tool_search`,
`web_search`, or `custom` (`codex-rs/tools/src/tool_spec.rs:20-56`). **No `local_shell` type exists.**
Namespaced tools arrive as `{type: "namespace", name, tools: [...]}`, and a call to one must carry
`namespace` (`codex-native-hook-pressure.e2e.test.ts:138-150, 311-318`).

| Tool | How it appears | Call payload |
|---|---|---|
| **Shell** | `add_shell_tools` always registers **`exec_command`** (unified exec, or a one-shot variant when unified exec is disabled), plus `write_stdin` (`codex-rs/core/src/tools/spec_plan.rs:1079-1117`). `shell_type` only gates it (`Disabled` removes it). Params: `cmd` (required), `workdir`, `tty`, `yield_time_ms`, `max_output_tokens`, `shell`, `login`, `environment_id` (`codex-rs/core/src/tools/handlers/shell_spec.rs:15-115`). | QA sends `{cmd, login: false}`. It accepts `exec_command`, `shell_command`, or `shell`, and uses `cmd` if the schema has it, else `command` (an array for `shell`) (`codex-native-hook-pressure.e2e.test.ts:288-318`; `native-workspace-behavior.ts:31-55`). |
| **`apply_patch`** | Always the freeform custom tool `{type: "custom", name: "apply_patch", format: {type: "grammar", syntax: "lark", definition}}` (`codex-rs/core/src/tools/handlers/apply_patch_spec.rs:9-26`; registered at `spec_plan.rs:1269-1272`). The handler accepts only a `Custom {input}` payload (`handlers/apply_patch.rs:332`). | Patch text is `*** Begin Patch` … `*** End Patch`, matching QA's `input` (`native-workspace-behavior.ts:57-72`). |
| **`spawn_agent`** | v1 lives inside namespace `multi_agent_v1` and takes `message` / `items` / `agent_type` / `model` / `fork_context`. v2 is a plain function that requires `task_name` and `message` (`codex-rs/core/src/tools/handlers/multi_agents_spec.rs:14, 65-138`; args at `multi_agents/spawn.rs:217-225`). | Absent on restricted turns. |
| **Code mode** | When native Code Mode is on, Codex also offers **`exec`** (a JavaScript runner) and `wait` (`codex-rs/code-mode-protocol/src/lib.rs:52-53`). OpenClaw enables Code Mode when no OpenClaw sandbox is active, with code-mode-only off (`docs/plugins/codex-harness.md:378-383`). | The mock never picks `exec`. |

## 5. What `before_tool_call` should receive (to confirm)

**What Codex sends to `PreToolUse` hooks:**

| Tool | `tool_name` | `tool_input` | Source |
|---|---|---|---|
| `exec_command` | `"Bash"` | `{command: <cmd string>}` | `codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:520-531`; `hook_names.rs:54-55` |
| `apply_patch` | `"apply_patch"` | `{command: <patch text>}` | `handlers/apply_patch.rs:415-419`; `hook_names.rs:34-36`; `Write` and `Edit` are matcher aliases only |
| `spawn_agent` | `"spawn_agent"` | the parsed function arguments | `codex-rs/core/src/tools/registry.rs:134-142, 834-850` |
| Other function tools | flat tool name | parsed arguments | same |

**What OpenClaw does with them.** It lowercases the name, maps `bash`→`exec`, and maps the aliases
`exec_command`→`exec`, `write`/`edit`→`apply_patch`, `agent`→`spawn_agent`
(`src/agents/harness/native-hook-relay-codec.ts:16-21, 133-136`). `tool_input` passes through, plus
a `command` string when an exec input has `cmd` (`:73-103`).

| Scenario | Expected `toolName` | Expected `params` |
|---|---|---|
| `codex-shell` | `exec` | `{command: "echo pg-codex-shell"}` |
| `codex-patch` | `apply_patch` | `{command: "*** Begin Patch\n*** Add File: pg-codex.txt\n+pg-codex-patch\n*** End Patch\n"}` |
| `codex-spawn` | `spawn_agent` | `{message: "[pg-child] …", task_name?}` |

The `codex-patch` row is not OpenClaw's `apply_patch {input}` shape, and not the `{patch}` example
in `native-hook-relay.test.ts`. The Guard's patch-path derivation needs to read `command`
(PROGRESS.md known gap).

Because the probe's hook has no matcher, the relay runs for every native tool
(`extensions/codex/src/app-server/native-hook-relay.ts:608-612`). `write_stdin` and similar tools
appear under their lowercased names, and a Code Mode `exec` would collide with OpenClaw's `exec`.

## 6. Files and how to run

| File | Role |
|---|---|
| `mock-responses.mjs` | Responses mock. It logs each request (full body, plus a `toolNames` digest) and reply to `MOCK_LOG`. It reads `[scenario:<name>]` from the latest marked user input; the step is the count of `*_output` items after it. Scenarios: `default` (text), `codex-shell`, `codex-patch`, `codex-spawn`. Spawned children are recognized by `[pg-child]` in a later user message and answer text. `--write-catalog <path>` writes `model_catalog_json`. |
| `write-config.mjs` | `pre` and `final` stages (§2.2). |
| `inner.sh` | In-container driver: catalog, pre config, Codex install, auth paste, final config, mock, gateway, four `openclaw agent` turns, then `summarize.mjs`. |
| `run-codex.sh` | Apptainer wrapper, like `guard-smoke/run-guard.sh`. |
| `install-codex.sh` | Runs `npm install @openclaw/codex@2026.10.8` into `/pg/oc`, checks the binary and `--version`, then does a throwaway managed install with `plugins inspect`. |
| `summarize.mjs` | Writes `report.md`: steps, plugin origin, tools offered, mock replies, `before_tool_call`/`after_tool_call` rows, and the patched file. |

**Copy to the cluster.** The scripts expect `/pg/codex`, plus `/pg/scripts/write-config.mjs`,
`/pg/probe-plugin`, and `/pg/guard-plugin/provenance-guard` from earlier steps:

```bash
rsync -a phase0/codex/ explorer:/scratch/$USER/pg/codex/
```

**Run:**

```bash
# login node or compute node, once (registry access needed)
bash /scratch/$USER/pg/codex/install-codex.sh
# compute node
srun --jobid=<id> --overlap bash /scratch/$USER/pg/codex/run-codex.sh
# without registry access on the compute node:
CODEX_INSTALL=link srun --jobid=<id> --overlap bash /scratch/$USER/pg/codex/run-codex.sh
```

**Outputs** go to `/pg/runs/codex-<ts>/`: `report.md`, `probe.jsonl`, `mock.jsonl`, `gateway.log`,
`out/*.txt`, and `out/codex-rollouts.txt` (Codex's own rollout files).

## 7. Open points

1. **The managed install has never been run here.** If `@openclaw/codex@2026.10.8 --pin` is rejected
   (for example, if an exact version is not accepted for the official catalog path), the `npm:` retry
   runs. Look in `out/codex-install*.txt`.
2. **`paste-api-key` writes the config itself** ("A configured provider stores the profile
   reference", `docs/cli/models.md:410`). If it fails, the provider `apiKey` and `CODEX_API_KEY`
   remain. Watch the gateway log for "unsupported route/auth" refusals.
3. **The 426 fallback is read from source, not observed.** `mock.jsonl` should show one
   `ws-upgrade-refused` per Codex session, followed by HTTP requests.
4. **`spawn_agent` may not be offered.** That depends on Codex multi-agent features and OpenClaw's
   delegation settings. The mock then answers with the list of offered tools, and the summary prints the tools array.
5. **Auxiliary requests (titles, summaries, finalization) can also hit `/v1/responses`.** Requests
   without a scenario marker get the default text reply; check `mock.jsonl` if a turn looks odd.
6. **Codex request bodies may be compressed.** The mock decodes gzip, deflate, br, and zstd. zstd
   needs Node ≥ 22.15, which the node24 image has.
