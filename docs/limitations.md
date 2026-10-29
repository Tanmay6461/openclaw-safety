# What Provenance Guard doesn't do

- **No injection detection.** It never inspects text for "ignore previous instructions". It tracks where data came from and checks the arguments of risky actions. Pair it with a content scanner if you want both.
- **No sandbox.** A malicious plugin, skill, or MCP server running inside the Gateway process can bypass any plugin, this one included.
- **No protection against a yes.** If you approve a prompt that sends your data somewhere, it goes. The prompt names what's being sent, where, and which untrusted source the session read.
- **Text-only manipulation passes.** A poisoned summary or a misleading answer that triggers no tool call isn't stopped.
- **Some sends can't be rewritten after the fact.** The Guard rewrites the agent's final replies (removing constructed-URL images, redacting private tokens for non-owners). But channels that stream a live preview (qa-channel, Telegram drafts) may show the unrewritten text briefly before the final replaces it.
- **Plain-prose commands aren't yours.** "Run ls ~/x" is not attested; `` `ls ~/x` `` is. After the session reads untrusted content, the prose version asks.
- **Memory taint is sticky by design.** A note saved from a web page labels that line. Every later session that loads it (`MEMORY.md`) or reads it starts tainted until the line is removed or you run `/guard trust MEMORY.md`. `/guard status` shows how many sessions were already tainted at their first tool call.
- **Approvals need a reachable owner.**
  - Cron, heartbeat, a non-owner's runs, and runs started by another session can't ask, so their asks become blocks.
  - An approval only works while its run is alive. Keep `agents.defaults.timeoutSeconds` above `approvalTimeoutSec`; `/guard doctor` warns if it isn't.
- **Codex's hosted web search is invisible to plugins.** Runs on the Codex runtime start untrusted unless you set `codexWebSearch: "off"` after turning that search off in Codex.
- **Exec is parsed, not traced.**
  - Redirections, `tee`, `curl -o`, `wget` and `git clone` targets are labeled.
  - Other writes are covered by exec windows: a file under a tainted exec's working directory that changed after it started inherits the labels. That's conservative, not exact.
- **OpenClaw versions.** The tool registry is checked against `v2026.10.8`. Unknown tools fall back to inferred specs and ask when they carry text in tainted, private sessions.
