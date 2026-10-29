# FAQ

**Does it use a model to decide?**
No. Every decision comes from labels, the tool registry, and the preset, so the same inputs always get the same answer. It makes no network calls.

**Why did it ask me?**
The prompt names what is risky and why, for example: "billing@unknown.example didn't come from you, and this session read untrusted content: web page recipes.example (2 min ago)." Allow it once, allow it always (which adds a rule; see `/guard rules`), or deny it.

**How do I avoid a prompt for something I asked for?**
Type the value yourself in your own message:
- a URL, an email address, a path, a channel target (`dm:carol`);
- a command in backticks (`` `ls ~/notes` ``).

Values you type are attested. Text you paste, quote, or forward doesn't count.

**Why is a new session already tainted?**
Something it loads carries a label. Usually that's a line in `MEMORY.md` that was written after reading a web page, or a file a tainted session wrote. `/guard status` shows how many sessions were tainted at their first tool call, and lists labeled files that changed outside the agent. After reviewing a file, run `/guard trust <path>`. For `MEMORY.md`, that also clears its labeled lines.

**Does `/new` clear the taint?**
Yes. After `/new`, `/reset`, or an idle or daily reset, the session starts fresh. It still picks up labels from memory lines or files it reads. Compaction doesn't clear labels, because the summary still carries the content.

**What happens in cron jobs and heartbeats?**
Nobody can answer a prompt there, so asks become blocks. A job created in a tainted session passes its labels to every run of that job.

**Someone else messaged my bot. What can they get?**
In a run a non-owner started, the Guard blocks reads of your local data (files, memory, mail, other sessions), because the reply would go back to them. Fetching public web pages for them is still allowed.

**Is shadow mode safe?**
Shadow mode logs what it would ask or block without enforcing it. But some cases are enforced even in shadow mode:
- **hard sinks:** config and policy changes, approval forgery, protected paths after untrusted content;
- **the lethal trifecta:** untrusted content plus private data plus a way out.

Start in shadow mode, check `/guard status`, then `/guard enforce`.

**Does it slow the agent down?**
On a large test state, decisions take about 0.3 ms (p95) and 0.4 ms (p99), against a 20 ms budget. Labeling a 100 KB tool result takes about 3 ms. Details are in plan §10.

**Which OpenClaw versions?**
The tool registry is checked against `v2026.10.8`. Tools the registry doesn't know fall back to inferred specs.

**Where is its data?**
In OpenClaw's plugin state store (SQLite), with an audit log under the plugin's state directory. The audit log stores HMACs of arguments, not the arguments themselves. Nothing leaves the machine.
