# Contract sweep: contract-1

- Tools with schemas: 43 (12 direct); unparsed describe results: 29
- Sweep calls: 134; fired before_tool_call: clean 50, tainted 39
- Guard audit records: 353; Guard errors: 0
- Steps: plugin-inspect=0 dump=0 clean-0=0 taint-0=0 tainted-0=0 clean-60=0 taint-60=0 tainted-60=0 clean-120=0 taint-120=0 tainted-120=0

## Registry coverage

**Tools with no registry entry (Guard infers a spec):** `agents_list`, `create_goal`, `dir_list`, `file_write`, `get_goal`, `github_identity_status`, `session_status`, `skills_read`, `talk_voice`

| Tool | Category | Unmapped params | Stale registry params | Actions not in registry (fallback) | Registry actions not in schema |
|---|---|---|---|---|---|
| `apply_patch` | persistence_write | - | __derived.paths | - | - |
| `browser` | external_retrieval | accept (IGNORED), actions[] (IGNORED), browser (IGNORED), button (IGNORED), clear (IGNORED), colorScheme (IGNORED), compact (IGNORED), dashboard (IGNORED), delayMs (IGNORED), depth (IGNORED), device (IGNORED), dialogId (IGNORED), domains[] (IGNORED), doubleClick (IGNORED), element (IGNORED), endRef (IGNORED), filter (IGNORED), frame (IGNORED), fullPage (IGNORED), height (IGNORED), inputRef (IGNORED), interactive (IGNORED), into (IGNORED), key (IGNORED), kind (IGNORED), label (IGNORED), labels (IGNORED), level (IGNORED), limit (IGNORED), loadState (IGNORED), locale (IGNORED), maxChars (IGNORED), mode (IGNORED), modifiers[] (IGNORED), node (IGNORED), profile (IGNORED), query (IGNORED), ref (IGNORED), refs (IGNORED), request.actions[] (IGNORED), request.button (IGNORED), request.delayMs (IGNORED), request.doubleClick (IGNORED), request.endRef (IGNORED), request.height (IGNORED), request.key (IGNORED), request.kind (IGNORED), request.loadState (IGNORED), request.modifiers[] (IGNORED), request.ref (IGNORED), request.selector (IGNORED), request.slowly (IGNORED), request.startRef (IGNORED), request.stopOnError (IGNORED), request.submit (IGNORED), request.targetId (IGNORED), request.textGone (IGNORED), request.timeMs (IGNORED), request.timeoutMs (IGNORED), request.width (IGNORED), request.x (IGNORED), request.y (IGNORED), selector (IGNORED), slowly (IGNORED), snapshotFormat (IGNORED), startRef (IGNORED), stopOnError (IGNORED), submit (IGNORED), systemProfile (IGNORED), target (IGNORED), targetId (IGNORED), textGone (IGNORED), timeMs (IGNORED), timeoutMs (IGNORED), timezoneId (IGNORED), type (IGNORED), urls (IGNORED), width (IGNORED), x (IGNORED), y (IGNORED) | - | start, stop, importprofile, open, focus, close, navigate, emulate, dialog | - |
| `canvas` | unknown | gatewayToken (otherArgs:content), gatewayUrl (otherArgs:content), height (otherArgs:content), node (otherArgs:content), target (otherArgs:content), timeoutMs (otherArgs:content), url (otherArgs:content), width (otherArgs:content), x (otherArgs:content), y (otherArgs:content) | - | present, hide, navigate | - |
| `conversations_list` | read_only | channel (IGNORED), limit (IGNORED), query (IGNORED) | - | - | - |
| `exec` | privileged_execution | ask (IGNORED), awaitResults (IGNORED), background (IGNORED), elevated (IGNORED), pty (IGNORED), timeoutSeconds (IGNORED), yieldMs (IGNORED) | - | - | - |
| `gateway` | install | timeoutMs (IGNORED) | - | update.run | - |
| `ls` | read_only | after (IGNORED), limit (IGNORED) | - | - | - |
| `memory_search` | read_only | - | - | - | sessions, all |
| `message` | outbound_communication | asDocument (otherArgs:content), attachments[].mimeType (otherArgs:content), attachments[].name (otherArgs:content), attachments[].type (otherArgs:content), buffer (otherArgs:content), caption (otherArgs:content), effect (otherArgs:content), effectId (otherArgs:content), filename (otherArgs:content), final (otherArgs:content), gatewayToken (otherArgs:content), gifPlayback (otherArgs:content), message (otherArgs:content), quoteText (otherArgs:content), voiceId (otherArgs:content), voiceProvider (otherArgs:content), voiceText (otherArgs:content) | to, channelId, filePath, path, fileUrl, messageId | broadcast, send | read, reactions, search, thread-list, channel-list, channel-info, member-info, role-info, list-pins, event-list, emoji-list, sticker-search, permissions, download-file |
| `mobile_ui` | unknown | confirmed (otherArgs:content), gatewayToken (otherArgs:content), gatewayUrl (otherArgs:content), mobileAction.direction (otherArgs:content), mobileAction.durationMs (otherArgs:content), mobileAction.ms (otherArgs:content), mobileAction.name (otherArgs:content), mobileAction.ref (otherArgs:content), mobileAction.text (otherArgs:content), mobileAction.type (otherArgs:content), mobileAction.x (otherArgs:content), mobileAction.x1 (otherArgs:content), mobileAction.x2 (otherArgs:content), mobileAction.y (otherArgs:content), mobileAction.y1 (otherArgs:content), mobileAction.y2 (otherArgs:content), node (otherArgs:content), snapshotId (otherArgs:content), timeoutMs (otherArgs:content) | - | observe, act | - |
| `nodes` | privileged_execution | bins[] (IGNORED), delayMs (IGNORED), delivery (IGNORED), desiredAccuracy (IGNORED), deviceId (IGNORED), duration (IGNORED), durationMs (IGNORED), facing (IGNORED), fps (IGNORED), gatewayToken (IGNORED), gatewayUrl (IGNORED), includeAudio (IGNORED), invokeTimeoutMs (IGNORED), limit (IGNORED), locationTimeoutMs (IGNORED), maxAgeMs (IGNORED), maxWidth (IGNORED), notificationAction (IGNORED), notificationKey (IGNORED), panDegrees (IGNORED), priority (IGNORED), ptzOperation (IGNORED), quality (IGNORED), requestId (IGNORED), screenIndex (IGNORED), sound (IGNORED), tiltDegrees (IGNORED), timeoutMs (IGNORED), zoomPercent (IGNORED) | sessionKey | camera_snap, camera_list, camera_clip, camera_ptz, screen_record, screen_snapshot, notifications_list, notifications_action, device_status, device_info, device_permissions, device_health, invoke | - |
| `plugins` | install | - | - | install, enable | - |
| `portal` | unknown | description (otherArgs:content), environmentId (otherArgs:content), id (otherArgs:content), path (otherArgs:content), port (otherArgs:content), title (otherArgs:content) | - | open, list, close | - |
| `process` | privileged_execution | bracketed (IGNORED), eof (IGNORED), limit (IGNORED), literal (IGNORED), offset (IGNORED), timeout (IGNORED) | - | write, send-keys, submit, paste, kill, clear, remove | - |
| `read` | read_only | cursor (IGNORED), limit (IGNORED), offset (IGNORED), optional (IGNORED) | - | - | - |
| `secrets` | config | allowedHosts[] (otherArgs:content), kind (otherArgs:content), name (otherArgs:content), reason (otherArgs:content), timeoutSeconds (otherArgs:content) | - | request, delete | - |
| `sessions` | read_only | archived (IGNORED), attention (IGNORED), clearQueued (IGNORED), color (IGNORED), deleteTranscript (IGNORED), expectedSessionId (IGNORED), group (IGNORED), icon (IGNORED), label (IGNORED), model (IGNORED), name (IGNORED), names[] (IGNORED), offset (IGNORED), ownerId (IGNORED), ownerType (IGNORED), pinned (IGNORED), profileId (IGNORED), runId (IGNORED), sessionKey (IGNORED), statusNote (IGNORED), targets[].expectedSessionId (IGNORED), targets[].sessionKey (IGNORED), thinkingLevel (IGNORED), to (IGNORED), ttlMinutes (IGNORED), user (IGNORED) | - | cloud_profiles, patch, stop, reset, delete, assign_owner, group_list, group_set, group_rename, group_delete | - |
| `sessions_send` | inter_session | timeoutSeconds (IGNORED), user (IGNORED), watch (IGNORED) | - | - | - |
| `sessions_spawn` | inter_session | attachAs.mountPath (IGNORED), attachments[].encoding (IGNORED), attachments[].mimeType (IGNORED), attachments[].name (IGNORED), cleanup (IGNORED), collect (IGNORED), completionTarget (IGNORED), context (IGNORED), expectsCompletionMessage (IGNORED), fastMode (IGNORED), group (IGNORED), groupId (IGNORED), label (IGNORED), lightContext (IGNORED), mode (IGNORED), outputSchema (IGNORED), placement.kind (IGNORED), placement.machineClass (IGNORED), placement.os (IGNORED), placement.profileId (IGNORED), projectGitUrl (IGNORED), projectId (IGNORED), runTimeoutSeconds (IGNORED), runtime (IGNORED), sandbox (IGNORED), taskName (IGNORED), thinking (IGNORED), user (IGNORED), visible (IGNORED), worktree (IGNORED), worktreeBaseRef (IGNORED), worktreeName (IGNORED) | - | - | - |
| `skill_workshop` | install | absorbed_into (otherArgs:content), content (otherArgs:content), file_path (otherArgs:content), name (otherArgs:content), new_text (otherArgs:content), old_text (otherArgs:content), reason (otherArgs:content), version (otherArgs:content) | - | create, patch, write_file, remove_file, archive, restore | - |
| `subagents` | read_only | recentMinutes (IGNORED), runId (IGNORED), runIds[] (IGNORED), timeoutSeconds (IGNORED) | - | list, wait, cancel | - |
| `terminal` | privileged_execution | cols (otherArgs:code), data (otherArgs:code), rows (otherArgs:code), sessionId (otherArgs:code) | - | read, list, resize, close, input | - |
| `tts` | outbound_communication | channel (otherArgs:content), text (otherArgs:content), timeoutMs (otherArgs:content) | - | - | - |
| `web_fetch` | external_retrieval | extractMode (IGNORED), maxChars (IGNORED) | - | - | - |

Fully consistent: `conversations_send`, `conversations_turn`, `edit`, `memory_get`, `openclaw`, `sessions_yield`, `tool_call`, `tool_describe`, `tool_search`, `write`

Registry tools not offered in this install: `web_search`, `x_search`, `automations`, `personal_instructions`, `code_execution`, `computer`, `screen`, `github_publish`, `image_generate`, `music_generate`, `video_generate`, `voice_call`, `codex_bash`, `codex_write`, `codex_agent`

## Runtime

**Not fired (clean or tainted):** `agents_list`, `apply_patch`, `browser:doctor`, `browser:status`, `browser:start`, `browser:stop`, `browser:profiles`, `browser:importprofile`, `browser:tabs`, `browser:open`, `browser:focus`, `browser:close`, `browser:snapshot`, `browser:screenshot`, `browser:navigate`, `browser:console`, `browser:requests`, `browser:errors`, `browser:text`, `browser:emulate`, `browser:pdf`, `browser:download`, `browser:waitfordownload`, `browser:upload`, `browser:dialog`, `browser:act`, `canvas:present`, `canvas:hide`, `canvas:navigate`, `conversations_send`, `conversations_turn`, `create_goal`, `dir_list`, `edit`, `exec`, `file_write`, `gateway:config.get`, `gateway:config.schema.lookup`, `gateway:update.run`, `get_goal`, `message:broadcast`, `message:send`, `mobile_ui:observe`, `mobile_ui:act`, `nodes:reject`, `nodes:notify`, `nodes:camera_snap`, `nodes:camera_list`, `nodes:camera_clip`, `nodes:camera_ptz`, `nodes:photos_latest`, `nodes:location_get`, `nodes:notifications_list`, `nodes:notifications_action`, `nodes:device_status`, `nodes:device_info`, `nodes:device_permissions`, `nodes:device_health`, `nodes:which`, `nodes:invoke`, `openclaw`, `plugins:install`, `plugins:enable`, `plugins:disable`, `plugins:uninstall`, `plugins:reload`, `plugins:reloadAndResume`, `portal:open`, `portal:list`, `portal:close`, `process:write`, `process:send-keys`, `process:submit`, `process:paste`, `process:kill`, `process:clear`, `process:remove`, `secrets:list`, `secrets:delete`, `session_status`, `sessions_yield`, `skill_workshop:create`, `skill_workshop:patch`, `skill_workshop:write_file`, `skill_workshop:remove_file`, `skill_workshop:archive`, `skill_workshop:restore`, `skills_read`, `talk_voice:list`, `talk_voice:set`, `terminal:read`, `terminal:list`, `terminal:resize`, `terminal:close`, `terminal:input`, `tts`, `web_fetch`, `write`

**Params changed on the way to the hook:** none

**Side-effecting calls allowed in the tainted+private session (review):** 10

- `apply_patch`: write allowed; the file inherits this session's labels
- `edit`: write allowed; the file inherits this session's labels
- `github_identity_status`: 
- `nodes:approve`: read-only tool
- `nodes:screen_record`: read-only tool
- `nodes:screen_snapshot`: read-only tool
- `secrets:request`: read-only tool
- `sessions_send`: allowed; the target session inherits this session's labels
- `sessions_spawn`: allowed; the target session inherits this session's labels
- `write`: write allowed; the file inherits this session's labels

| # | Call | Clean | Tainted+private |
|---|---|---|---|
| 0 | `agents_list` | allow | not fired |
| 1 | `apply_patch` | not fired | allow |
| 2 | `browser:doctor` | not fired | not fired |
| 3 | `browser:status` | not fired | not fired |
| 4 | `browser:start` | not fired | not fired |
| 5 | `browser:stop` | not fired | not fired |
| 6 | `browser:profiles` | not fired | not fired |
| 7 | `browser:importprofile` | not fired | not fired |
| 8 | `browser:tabs` | not fired | not fired |
| 9 | `browser:open` | not fired | not fired |
| 10 | `browser:focus` | not fired | not fired |
| 11 | `browser:close` | not fired | not fired |
| 12 | `browser:snapshot` | not fired | not fired |
| 13 | `browser:screenshot` | not fired | not fired |
| 14 | `browser:navigate` | not fired | not fired |
| 15 | `browser:console` | not fired | not fired |
| 16 | `browser:requests` | not fired | not fired |
| 17 | `browser:errors` | not fired | not fired |
| 18 | `browser:text` | not fired | not fired |
| 19 | `browser:emulate` | not fired | not fired |
| 20 | `browser:pdf` | not fired | not fired |
| 21 | `browser:download` | not fired | not fired |
| 22 | `browser:waitfordownload` | not fired | not fired |
| 23 | `browser:upload` | not fired | not fired |
| 24 | `browser:dialog` | not fired | not fired |
| 25 | `browser:act` | not fired | not fired |
| 26 | `canvas:present` | allow | not fired |
| 27 | `canvas:hide` | allow | not fired |
| 28 | `canvas:navigate` | allow | not fired |
| 29 | `conversations_list` | allow | allow |
| 30 | `conversations_send` | not fired | not fired |
| 31 | `conversations_turn` | not fired | not fired |
| 32 | `create_goal` | allow | not fired |
| 33 | `dir_list` | allow | not fired |
| 34 | `edit` | not fired | allow |
| 35 | `exec` | not fired | not fired |
| 36 | `file_write` | allow | not fired |
| 37 | `gateway:config.get` | allow | not fired |
| 38 | `gateway:config.schema.lookup` | not fired | not fired |
| 39 | `gateway:update.run` | not fired | not fired |
| 40 | `get_goal` | not fired | not fired |
| 41 | `github_identity_status` | allow | allow |
| 42 | `ls` | allow | allow |
| 43 | `memory_get` | allow | allow |
| 44 | `memory_search` | allow | allow |
| 45 | `message:broadcast` | not fired | not fired |
| 46 | `message:send` | not fired | not fired |
| 47 | `mobile_ui:observe` | not fired | not fired |
| 48 | `mobile_ui:act` | not fired | not fired |
| 49 | `nodes:status` | allow | allow |
| 50 | `nodes:describe` | allow | allow |
| 51 | `nodes:pending` | allow | allow |
| 52 | `nodes:approve` | allow | allow |
| 53 | `nodes:reject` | not fired | not fired |
| 54 | `nodes:notify` | not fired | not fired |
| 55 | `nodes:camera_snap` | not fired | not fired |
| 56 | `nodes:camera_list` | not fired | not fired |
| 57 | `nodes:camera_clip` | not fired | not fired |
| 58 | `nodes:camera_ptz` | not fired | not fired |
| 59 | `nodes:photos_latest` | not fired | not fired |
| 60 | `nodes:screen_record` | allow | allow |
| 61 | `nodes:screen_snapshot` | allow | allow |
| 62 | `nodes:location_get` | allow | not fired |
| 63 | `nodes:notifications_list` | not fired | not fired |
| 64 | `nodes:notifications_action` | not fired | not fired |
| 65 | `nodes:device_status` | not fired | not fired |
| 66 | `nodes:device_info` | not fired | not fired |
| 67 | `nodes:device_permissions` | not fired | not fired |
| 68 | `nodes:device_health` | not fired | not fired |
| 69 | `nodes:which` | not fired | not fired |
| 70 | `nodes:invoke` | not fired | not fired |
| 71 | `openclaw` | not fired | not fired |
| 72 | `plugins:list` | allow | allow |
| 73 | `plugins:inspect` | allow | allow |
| 74 | `plugins:search` | allow | allow |
| 75 | `plugins:install` | not fired | not fired |
| 76 | `plugins:enable` | not fired | not fired |
| 77 | `plugins:disable` | not fired | not fired |
| 78 | `plugins:uninstall` | not fired | not fired |
| 79 | `plugins:reload` | not fired | not fired |
| 80 | `plugins:reloadAndResume` | not fired | not fired |
| 81 | `portal:open` | not fired | not fired |
| 82 | `portal:list` | not fired | not fired |
| 83 | `portal:close` | not fired | not fired |
| 84 | `process:list` | allow | allow |
| 85 | `process:poll` | allow | allow |
| 86 | `process:log` | allow | allow |
| 87 | `process:write` | not fired | not fired |
| 88 | `process:send-keys` | not fired | not fired |
| 89 | `process:submit` | not fired | not fired |
| 90 | `process:paste` | not fired | not fired |
| 91 | `process:kill` | not fired | not fired |
| 92 | `process:clear` | not fired | not fired |
| 93 | `process:remove` | not fired | not fired |
| 94 | `read` | allow | allow |
| 95 | `secrets:request` | allow | allow |
| 96 | `secrets:list` | not fired | not fired |
| 97 | `secrets:delete` | not fired | not fired |
| 98 | `session_status` | not fired | not fired |
| 99 | `sessions:cloud_profiles` | allow | allow |
| 100 | `sessions:patch` | allow | allow |
| 101 | `sessions:stop` | allow | allow |
| 102 | `sessions:reset` | allow | allow |
| 103 | `sessions:delete` | allow | allow |
| 104 | `sessions:assign_owner` | allow | allow |
| 105 | `sessions:group_list` | allow | allow |
| 106 | `sessions:group_set` | allow | allow |
| 107 | `sessions:group_rename` | allow | allow |
| 108 | `sessions:group_delete` | allow | allow |
| 109 | `sessions_send` | allow | allow |
| 110 | `sessions_spawn` | allow | allow |
| 111 | `sessions_yield` | not fired | not fired |
| 112 | `skill_workshop:list` | allow | allow |
| 113 | `skill_workshop:view` | allow | allow |
| 114 | `skill_workshop:create` | not fired | not fired |
| 115 | `skill_workshop:patch` | not fired | not fired |
| 116 | `skill_workshop:write_file` | not fired | not fired |
| 117 | `skill_workshop:remove_file` | not fired | not fired |
| 118 | `skill_workshop:archive` | not fired | not fired |
| 119 | `skill_workshop:restore` | not fired | not fired |
| 120 | `skills_read` | allow | not fired |
| 121 | `subagents:list` | allow | allow |
| 122 | `subagents:wait` | allow | allow |
| 123 | `subagents:cancel` | allow | allow |
| 124 | `talk_voice:list` | allow | not fired |
| 125 | `talk_voice:set` | allow | not fired |
| 126 | `terminal:read` | not fired | not fired |
| 127 | `terminal:list` | not fired | not fired |
| 128 | `terminal:resize` | not fired | not fired |
| 129 | `terminal:close` | not fired | not fired |
| 130 | `terminal:input` | not fired | not fired |
| 131 | `tts` | allow | not fired |
| 132 | `web_fetch` | allow | not fired |
| 133 | `write` | not fired | allow |

## Unparsed tool_describe results

- `Agent`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: Agent. Did you mean: agents_list, agents_wait, subagents? Use tool_search to find
- `Bash`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: Bash. Use tool_search to find a tool, tool_describe to inspect it, then tool_call
- `Edit`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: Edit. Did you mean: edit, automations, plugins? Use tool_search to find a tool, t
- `Write`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: Write. Did you mean: write, file_write, file_fetch? Use tool_search to find a too
- `apply-patch`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: apply-patch. Did you mean: apply_patch, skill_workshop, sessions? Use tool_search
- `automations`: {   "id": "openclaw:core:automations",   "source": "openclaw",   "sourceName": "core",   "name": "automations",   "label": "Automations",   "description": "Gate
- `bash`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: bash. Use tool_search to find a tool, tool_describe to inspect it, then tool_call
- `code_execution`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: code_execution. Did you mean: exec, automations, ask_user? Use tool_search to fin
- `codex_agent`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: codex_agent. Did you mean: agents_list, automations, browser? Use tool_search to 
- `codex_bash`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: codex_bash. Use tool_search to find a tool, tool_describe to inspect it, then too
- `codex_write`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: codex_write. Did you mean: write, file_fetch, file_write? Use tool_search to find
- `computer`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: computer. Did you mean: nodes? Use tool_search to find a tool, tool_describe to i
- `cron`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: cron. Did you mean: automations? Use tool_search to find a tool, tool_describe to
- `exec_command`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: exec_command. Did you mean: exec, automations, process? Use tool_search to find a
- `github_publish`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: github_publish. Did you mean: github_identity_status, sessions_spawn? Use tool_se
- `image_generate`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: image_generate. Did you mean: file_fetch, read? Use tool_search to find a tool, t
- `music_generate`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: music_generate. Use tool_search to find a tool, tool_describe to inspect it, then
- `openclaw`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: openclaw. Did you mean: browser, gateway, portal? Use tool_search to find a tool,
- `personal_instructions`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: personal_instructions. Did you mean: automations, create_goal, dashboard? Use too
- `screen`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: screen. Did you mean: nodes, browser, file_fetch? Use tool_search to find a tool,
- `sessions_yield`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: sessions_yield. Did you mean: sessions, sessions_send, agents_list? Use tool_sear
- `spawn_agent`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: spawn_agent. Did you mean: agents_list, sessions_spawn, agents_wait? Use tool_sea
- `tool_call`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: tool_call. Did you mean: automations, browser, ask_user? Use tool_search to find 
- `tool_describe`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: tool_describe. Did you mean: automations, browser, dashboard? Use tool_search to 
- `tool_search`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: tool_search. Did you mean: plugins, skills_read, automations? Use tool_search to 
- `video_generate`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: video_generate. Did you mean: nodes? Use tool_search to find a tool, tool_describ
- `voice_call`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: voice_call. Did you mean: talk_voice, ask_user, automations? Use tool_search to f
- `web_search`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: web_search. Did you mean: memory_search, plugins, sessions_search? Use tool_searc
- `x_search`: {   "status": "error",   "tool": "tool_describe",   "error": "Unknown tool id: x_search. Did you mean: memory_search, plugins, sessions_search? Use tool_search 
