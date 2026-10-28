# Contract sweep: contract-4

- Tools with schemas: 57 (57 direct); unparsed describe results: 0
- Sweep calls: 192; fired before_tool_call: clean 192, tainted 192
- Guard audit records: 400; Guard errors: 0
- Steps: plugin-inspect=0 dump=0 clean-0=0 clean-1=0 clean-4=0 clean-2=0 clean-3=0 clean-5=0 clean-6=0 clean-7=0 clean-9=0 clean-8=0 clean-11=0 clean-10=0 clean-12=0 clean-13=0 clean-14=0 clean-15=0 clean-16=0 clean-17=0 clean-18=0 clean-19=0 clean-20=0 clean-21=0 clean-22=0 clean-23=0 clean-24=0 clean-25=0 clean-26=0 clean-27=0 clean-28=0 clean-29=0 clean-30=0 clean-31=0 clean-32=0 clean-33=0 clean-35=0 clean-34=0 clean-36=0 clean-37=0 clean-38=0 clean-39=0 clean-40=0 clean-41=0 clean-42=0 clean-43=0 clean-44=0 clean-46=0 clean-45=0 clean-47=0 clean-48=0 clean-49=0 clean-50=0 clean-51=0 clean-52=0 clean-53=0 clean-54=0 clean-55=0 clean-56=0 clean-57=0 clean-58=0 clean-59=0 clean-60=0 clean-61=0 clean-62=0 clean-63=0 clean-64=0 clean-65=0 clean-66=0 clean-68=0 clean-67=0 clean-69=0 clean-70=0 clean-71=0 clean-72=0 clean-73=0 clean-74=0 clean-75=0 clean-76=0 clean-77=0 clean-78=0 clean-79=0 clean-80=0 clean-81=0 clean-82=0 clean-83=0 clean-84=0 clean-85=0 clean-86=0 clean-87=0 clean-88=0 clean-89=0 clean-90=0 clean-91=0 clean-92=0 clean-93=0 clean-94=0 clean-100=0 clean-95=0 clean-96=0 clean-97=0 clean-99=0 clean-98=0 clean-101=0 clean-103=0 clean-102=0 clean-104=0 clean-105=0 clean-106=0 clean-107=0 clean-108=0 clean-109=0 clean-110=0 clean-111=0 clean-112=0 clean-113=0 clean-114=0 clean-115=0 clean-116=0 clean-117=0 clean-118=0 clean-119=0 clean-120=0 clean-121=0 clean-122=0 clean-123=0 clean-124=0 clean-125=0 clean-126=0 clean-127=0 clean-128=0 clean-129=0 clean-130=0 clean-131=0 clean-132=0 clean-133=0 clean-134=0 clean-140=0 clean-135=0 clean-136=0 clean-137=0 clean-138=0 clean-139=0 clean-141=0 clean-142=0 clean-143=0 clean-144=0 clean-145=0 clean-146=0 clean-147=0 clean-148=0 clean-149=0 clean-151=0 clean-150=0 clean-152=0 clean-153=0 clean-154=0 clean-155=0 clean-156=0 clean-158=0 clean-157=0 clean-159=0 clean-160=0 clean-161=0 clean-162=0 clean-163=0 clean-164=0 clean-167=0 clean-168=0 clean-165=0 clean-166=0 clean-169=0 clean-170=0 clean-171=0 clean-172=0 clean-173=0 clean-174=0 clean-175=0 clean-176=0 clean-177=0 clean-179=0 clean-178=0 clean-180=0 clean-181=0 clean-182=0 clean-184=0 clean-183=0 clean-185=0 clean-186=0 clean-187=0 clean-188=0 clean-189=0 clean-191=0 clean-190=0 taint=0 tainted-0=0 tainted-60=0 tainted-120=0 tainted-180=0

## Registry coverage

**Tools with no registry entry (Guard infers a spec):** none

| Tool | Category | Unmapped params | Stale registry params | Actions not in registry (fallback) | Registry actions not in schema |
|---|---|---|---|---|---|
| `apply_patch` | persistence_write | - | patch | - | - |
| `exec` | privileged_execution | - | cmd | - | - |
| `message` | outbound_communication | - | to, filePath, path, fileUrl, chatJid | - | thread-list, channel-list, channel-info, member-info, role-info, list-pins, event-list, emoji-list, sticker-search, permissions, download-file |

Fully consistent: `agents_list`, `agents_wait`, `ask_user`, `automations`, `browser`, `canvas`, `conversations_list`, `conversations_send`, `conversations_turn`, `create_goal`, `dashboard`, `dir_fetch`, `dir_list`, `edit`, `file_fetch`, `file_write`, `gateway`, `get_goal`, `github_identity_status`, `intent`, `ls`, `memory_get`, `memory_search`, `mobile_ui`, `node_inference`, `nodes`, `openclaw`, `plugins`, `portal`, `presence`, `process`, `progress_card`, `read`, `secrets`, `session_status`, `sessions`, `sessions_history`, `sessions_list`, `sessions_search`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `skill_workshop`, `skills_read`, `skills_search`, `subagents`, `talk_voice`, `terminal`, `theme`, `transcripts`, `tts`, `update_goal`, `web_fetch`, `write`

Registry tools not offered in this install: `web_search`, `x_search`, `personal_instructions`, `code_execution`, `computer`, `screen`, `github_publish`, `image_generate`, `music_generate`, `video_generate`, `voice_call`, `codex_bash`, `codex_write`, `codex_agent`, `tool_search`, `tool_describe`, `tool_call`

## Runtime

**Not seen by the Guard (clean or tainted):** none


**Params changed on the way to the hook:** none

**Side-effecting calls allowed in the tainted+private session (review):** 34

- `apply_patch`: write allowed; the file inherits this session's labels
- `dashboard:tab_create`: write allowed; the file inherits this session's labels
- `dashboard:tab_update`: write allowed; the file inherits this session's labels
- `dashboard:tab_delete`: write allowed; the file inherits this session's labels
- `dashboard:tabs_reorder`: write allowed; the file inherits this session's labels
- `dashboard:widget_put`: 
- `dashboard:widget_move`: write allowed; the file inherits this session's labels
- `dashboard:widget_resize`: write allowed; the file inherits this session's labels
- `dashboard:widget_remove`: write allowed; the file inherits this session's labels
- `dashboard:focus_tab`: write allowed; the file inherits this session's labels
- `dashboard:set_presentation`: write allowed; the file inherits this session's labels
- `dashboard:set_default_presentation`: write allowed; the file inherits this session's labels
- `edit`: write allowed; the file inherits this session's labels
- `file_write`: write allowed; the file inherits this session's labels
- `intent:cancel`: write allowed; the file inherits this session's labels
- `node_inference:run`: 
- `portal:open`: write allowed; the file inherits this session's labels
- `progress_card`: 
- `sessions:patch`: write allowed; the file inherits this session's labels
- `sessions:stop`: allowed; the target session inherits this session's labels
- `sessions:reset`: allowed; the target session inherits this session's labels
- `sessions:delete`: allowed; the target session inherits this session's labels
- `sessions:group_set`: write allowed; the file inherits this session's labels
- `sessions:group_rename`: write allowed; the file inherits this session's labels
- `sessions:group_delete`: write allowed; the file inherits this session's labels
- `sessions_send`: allowed; the target session inherits this session's labels
- `sessions_yield`: allowed; the target session inherits this session's labels
- `subagents:cancel`: allowed; the target session inherits this session's labels
- `talk_voice:set`: write allowed; the file inherits this session's labels
- `theme:set`: write allowed; the file inherits this session's labels
- `theme:import`: write allowed; the file inherits this session's labels
- `tts`: 
- `update_goal`: write allowed; the file inherits this session's labels
- `write`: write allowed; the file inherits this session's labels

| # | Call | Clean | Tainted+private |
|---|---|---|---|
| 0 | `agents_list` | allow | allow [P] |
| 1 | `agents_wait` | allow [T] | allow [TP] |
| 2 | `apply_patch` | allow | allow [TP] |
| 3 | `ask_user` | allow | ask [TP] |
| 4 | `automations:status` | allow | ask [TP] |
| 5 | `automations:list` | allow | ask [TP] |
| 6 | `automations:get` | allow | ask [TP] |
| 7 | `automations:add` | allow | ask [TP] |
| 8 | `automations:update` | allow | ask [TP] |
| 9 | `automations:remove` | allow | ask [TP] |
| 10 | `automations:run` | allow | ask [TP] |
| 11 | `automations:runs` | allow | ask [TP] |
| 12 | `automations:next_check` | allow | ask [TP] |
| 13 | `automations:wake` | allow | ask [TP] |
| 14 | `browser:doctor` | allow | ask [TP] |
| 15 | `browser:status` | allow | ask [TP] |
| 16 | `browser:start` | allow | ask [TP] |
| 17 | `browser:stop` | allow | ask [TP] |
| 18 | `browser:profiles` | allow | ask [TP] |
| 19 | `browser:importprofile` | ask (hard sink) [T] | block (hard sink) [TP] |
| 20 | `browser:tabs` | allow [T] | ask [TP] |
| 21 | `browser:open` | allow [T] | ask [TP] |
| 22 | `browser:focus` | allow | ask [TP] |
| 23 | `browser:close` | allow | ask [TP] |
| 24 | `browser:snapshot` | allow [T] | ask [TP] |
| 25 | `browser:screenshot` | allow [T] | ask [TP] |
| 26 | `browser:navigate` | allow [T] | ask [TP] |
| 27 | `browser:console` | allow [T] | ask [TP] |
| 28 | `browser:requests` | allow [T] | ask [TP] |
| 29 | `browser:errors` | allow [T] | ask [TP] |
| 30 | `browser:text` | allow [T] | ask [TP] |
| 31 | `browser:emulate` | allow | ask [TP] |
| 32 | `browser:pdf` | allow [T] | ask [TP] |
| 33 | `browser:download` | allow [T] | ask [TP] |
| 34 | `browser:waitfordownload` | allow [T] | ask [TP] |
| 35 | `browser:upload` | allow [T] | ask [TP] |
| 36 | `browser:dialog` | allow [T] | ask [TP] |
| 37 | `browser:act` | allow [T] | ask [TP] |
| 38 | `canvas:present` | allow | ask [TP] |
| 39 | `canvas:hide` | allow | ask [TP] |
| 40 | `canvas:navigate` | allow | ask [TP] |
| 41 | `conversations_list` | allow | allow [TP] |
| 42 | `conversations_send` | allow | ask [TP] |
| 43 | `conversations_turn` | allow [T] | ask [TP] |
| 44 | `create_goal` | allow | ask [TP] |
| 45 | `dashboard:read` | allow | allow [TP] |
| 46 | `dashboard:tab_create` | allow | allow [TP] |
| 47 | `dashboard:tab_update` | allow | allow [TP] |
| 48 | `dashboard:tab_delete` | allow | allow [TP] |
| 49 | `dashboard:tabs_reorder` | allow | allow [TP] |
| 50 | `dashboard:widget_put` | allow | allow [TP] |
| 51 | `dashboard:widget_move` | allow | allow [TP] |
| 52 | `dashboard:widget_resize` | allow | allow [TP] |
| 53 | `dashboard:widget_remove` | allow | allow [TP] |
| 54 | `dashboard:focus_tab` | allow | allow [TP] |
| 55 | `dashboard:set_presentation` | allow | allow [TP] |
| 56 | `dashboard:set_default_presentation` | allow | allow [TP] |
| 57 | `dir_fetch` | allow [TP] | ask [TP] |
| 58 | `dir_list` | allow [T] | ask [TP] |
| 59 | `edit` | allow | allow [TP] |
| 60 | `exec` | allow [T] | ask [TP] |
| 61 | `file_fetch` | allow [TP] | ask [TP] |
| 62 | `file_write` | allow | allow [TP] |
| 63 | `gateway:config.get` | allow [P] | ask [TP] |
| 64 | `gateway:config.schema.lookup` | allow | ask [TP] |
| 65 | `gateway:update.run` | allow (hard sink) | block (hard sink) [TP] |
| 66 | `get_goal` | allow | allow [TP] |
| 67 | `github_identity_status` | allow | allow [TP] |
| 68 | `intent:create` | allow | ask [TP] |
| 69 | `intent:list` | allow | allow [TP] |
| 70 | `intent:cancel` | allow | allow [TP] |
| 71 | `ls` | allow | allow [TP] |
| 72 | `memory_get:memory` | allow [P] | allow [TP] |
| 73 | `memory_get:wiki` | allow [P] | allow [TP] |
| 74 | `memory_get:all` | allow [P] | allow [TP] |
| 75 | `memory_search:memory` | allow [P] | allow [TP] |
| 76 | `memory_search:wiki` | allow [P] | allow [TP] |
| 77 | `memory_search:all` | allow [TP] | allow [TP] |
| 78 | `memory_search:sessions` | allow [TP] | allow [TP] |
| 79 | `message:broadcast` | allow | ask [TP] |
| 80 | `message:delete` | allow | ask [TP] |
| 81 | `message:edit` | allow | ask [TP] |
| 82 | `message:react` | allow | ask [TP] |
| 83 | `message:reactions` | allow [T] | ask [TP] |
| 84 | `message:read` | allow [T] | ask [TP] |
| 85 | `message:search` | allow [T] | ask [TP] |
| 86 | `message:send` | allow | ask [TP] |
| 87 | `message:thread-create` | allow | ask [TP] |
| 88 | `message:thread-reply` | allow | ask [TP] |
| 89 | `mobile_ui:observe` | allow [TP] | ask [TP] |
| 90 | `mobile_ui:act` | allow | block (hard sink) [TP] |
| 91 | `node_inference:discover` | allow | allow [TP] |
| 92 | `node_inference:run` | allow [T] | allow [TP] |
| 93 | `nodes:status` | allow | ask [TP] |
| 94 | `nodes:describe` | allow | ask [TP] |
| 95 | `nodes:pending` | allow | ask [TP] |
| 96 | `nodes:approve` | ask (hard sink) | block (hard sink) [TP] |
| 97 | `nodes:reject` | ask (hard sink) | block (hard sink) [TP] |
| 98 | `nodes:notify` | allow | ask [TP] |
| 99 | `nodes:camera_snap` | allow [P] | ask [TP] |
| 100 | `nodes:camera_list` | allow | ask [TP] |
| 101 | `nodes:camera_clip` | allow [P] | ask [TP] |
| 102 | `nodes:camera_ptz` | allow [T] | ask [TP] |
| 103 | `nodes:photos_latest` | allow [P] | ask [TP] |
| 104 | `nodes:screen_record` | allow [P] | ask [TP] |
| 105 | `nodes:screen_snapshot` | allow [P] | ask [TP] |
| 106 | `nodes:location_get` | allow [P] | ask [TP] |
| 107 | `nodes:notifications_list` | allow [TP] | ask [TP] |
| 108 | `nodes:notifications_action` | allow | ask [TP] |
| 109 | `nodes:device_status` | allow | ask [TP] |
| 110 | `nodes:device_info` | allow | ask [TP] |
| 111 | `nodes:device_permissions` | allow | ask [TP] |
| 112 | `nodes:device_health` | allow | ask [TP] |
| 113 | `nodes:which` | allow | ask [TP] |
| 114 | `nodes:invoke` | allow [T] | ask [TP] |
| 115 | `openclaw` | ask (hard sink) | block (hard sink) [TP] |
| 116 | `plugins:list` | allow | allow [TP] |
| 117 | `plugins:inspect` | allow | allow [TP] |
| 118 | `plugins:search` | allow | allow [TP] |
| 119 | `plugins:install` | allow (hard sink) | block (hard sink) [TP] |
| 120 | `plugins:enable` | allow (hard sink) | block (hard sink) [TP] |
| 121 | `plugins:disable` | ask (hard sink) | block (hard sink) [TP] |
| 122 | `plugins:uninstall` | ask (hard sink) | block (hard sink) [TP] |
| 123 | `plugins:reload` | ask (hard sink) | block (hard sink) [TP] |
| 124 | `plugins:reloadAndResume` | ask (hard sink) | block (hard sink) [TP] |
| 125 | `portal:open` | allow | allow [TP] |
| 126 | `portal:list` | allow | allow [TP] |
| 127 | `portal:close` | allow | allow [TP] |
| 128 | `presence:list` | allow [P] | allow [TP] |
| 129 | `presence:person` | allow [P] | allow [TP] |
| 130 | `presence:device` | allow [P] | allow [TP] |
| 131 | `process:list` | allow [T] | allow [TP] |
| 132 | `process:poll` | allow [T] | allow [TP] |
| 133 | `process:log` | allow [T] | allow [TP] |
| 134 | `process:write` | allow [T] | ask [TP] |
| 135 | `process:send-keys` | allow [T] | ask [TP] |
| 136 | `process:submit` | allow [T] | ask [TP] |
| 137 | `process:paste` | allow [T] | ask [TP] |
| 138 | `process:kill` | allow [T] | ask [TP] |
| 139 | `process:clear` | allow | allow [TP] |
| 140 | `process:remove` | allow | allow [TP] |
| 141 | `progress_card` | allow | allow [TP] |
| 142 | `read` | allow [T] | allow [TP] |
| 143 | `secrets:request` | allow | ask [TP] |
| 144 | `secrets:list` | allow [P] | allow [TP] |
| 145 | `secrets:delete` | ask (hard sink) | block (hard sink) [TP] |
| 146 | `session_status` | allow | allow [TP] |
| 147 | `sessions:cloud_profiles` | allow | allow [TP] |
| 148 | `sessions:patch` | allow | allow [TP] |
| 149 | `sessions:stop` | allow | allow [TP] |
| 150 | `sessions:reset` | allow | allow [TP] |
| 151 | `sessions:delete` | allow | allow [TP] |
| 152 | `sessions:assign_owner` | ask (hard sink) | block (hard sink) [TP] |
| 153 | `sessions:group_list` | allow | allow [TP] |
| 154 | `sessions:group_set` | allow | allow [TP] |
| 155 | `sessions:group_rename` | allow | allow [TP] |
| 156 | `sessions:group_delete` | allow | allow [TP] |
| 157 | `sessions_history` | allow [TP] | allow [TP] |
| 158 | `sessions_list` | allow [T] | allow [TP] |
| 159 | `sessions_search` | allow [TP] | allow [TP] |
| 160 | `sessions_send` | allow | allow [TP] |
| 161 | `sessions_spawn` | allow | ask [TP] |
| 162 | `sessions_yield` | allow | allow [TP] |
| 163 | `skill_workshop:list` | allow | allow [TP] |
| 164 | `skill_workshop:view` | allow | allow [TP] |
| 165 | `skill_workshop:create` | allow (hard sink) | block (hard sink) [TP] |
| 166 | `skill_workshop:patch` | allow (hard sink) | block (hard sink) [TP] |
| 167 | `skill_workshop:write_file` | allow (hard sink) | block (hard sink) [TP] |
| 168 | `skill_workshop:remove_file` | allow (hard sink) | block (hard sink) [TP] |
| 169 | `skill_workshop:archive` | allow (hard sink) | block (hard sink) [TP] |
| 170 | `skill_workshop:restore` | allow (hard sink) | block (hard sink) [TP] |
| 171 | `skills_read` | allow [T] | allow [TP] |
| 172 | `skills_search` | allow [T] | allow [TP] |
| 173 | `subagents:list` | allow [T] | allow [TP] |
| 174 | `subagents:wait` | allow [T] | allow [TP] |
| 175 | `subagents:cancel` | allow | allow [TP] |
| 176 | `talk_voice:list` | allow | allow [TP] |
| 177 | `talk_voice:set` | allow | allow [TP] |
| 178 | `terminal:read` | allow [T] | allow [TP] |
| 179 | `terminal:list` | allow | allow [TP] |
| 180 | `terminal:resize` | allow | allow [TP] |
| 181 | `terminal:close` | allow | allow [TP] |
| 182 | `terminal:input` | allow [T] | ask [TP] |
| 183 | `theme:list` | allow | allow [TP] |
| 184 | `theme:get` | allow | allow [TP] |
| 185 | `theme:set` | allow | allow [TP] |
| 186 | `theme:import` | allow | allow [TP] |
| 187 | `transcripts` | allow [TP] | ask [TP] |
| 188 | `tts` | allow | allow [TP] |
| 189 | `update_goal` | allow | allow [TP] |
| 190 | `web_fetch` | allow [T] | ask [TP] |
| 191 | `write` | allow | allow [TP] |
