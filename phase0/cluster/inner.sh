#!/usr/bin/env bash
# Runs inside the Node 24 container (see run-phase0.sh). Everything lives under $RUN.
# Drives OpenClaw through the Phase 0 scenarios and writes probe, mock, and step logs.
set -uo pipefail

RUN=${RUN:-/pg/runs/$(date +%Y%m%d-%H%M%S)}
OC=/pg/oc/node_modules/.bin/openclaw
PORT_GW=${PORT_GW:-$((20000 + RANDOM % 20000))}
PORT_MOCK=$((PORT_GW + 1))
TOKEN="pg-$RANDOM$RANDOM$RANDOM"
mkdir -p "$RUN/state/workspace" "$RUN/out"

export OPENCLAW_STATE_DIR="$RUN/state" OPENCLAW_CONFIG_PATH="$RUN/state/openclaw.json"
export OPENCLAW_GATEWAY_TOKEN="$TOKEN" OPENCLAW_GATEWAY_PORT="$PORT_GW"
# Headless: no channels or side services (runtime-harness-notes §3). Cron stays on.
export OPENCLAW_SKIP_CHANNELS=1 OPENCLAW_SKIP_GMAIL_WATCHER=1 OPENCLAW_SKIP_CANVAS_HOST=1
export OPENCLAW_SKIP_BROWSER_CONTROL_SERVER=1 OPENCLAW_SKIP_ACPX_RUNTIME=1 OPENCLAW_SKIP_ACPX_RUNTIME_PROBE=1
export OPENCLAW_AGENT_HARNESS_FALLBACK=none
# Explorer sets http(s)_proxy, and Apptainer passes it through even with --cleanenv. Keep loopback
# (the mock LLM and mock web) off the proxy.
export NO_PROXY="127.0.0.1,localhost,::1${NO_PROXY:+,$NO_PROXY}" no_proxy="127.0.0.1,localhost,::1${no_proxy:+,$no_proxy}"

echo "phase0 probe input" > "$RUN/state/workspace/probe-input.txt"
node /pg/scripts/write-config.mjs "$RUN" "$PORT_GW" "$PORT_MOCK" "$TOKEN" > "$OPENCLAW_CONFIG_PATH"
echo "run=$RUN gateway=$PORT_GW mock=$PORT_MOCK"

# One JSONL line per step: name, exit code, start/end ms. Output goes to out/<name>.txt.
step() {
  local name=$1; shift
  local start end code
  start=$(date +%s%3N)
  timeout 240 "$@" > "$RUN/out/$name.txt" 2>&1
  code=$?
  end=$(date +%s%3N)
  printf '{"step":"%s","exit":%d,"start":%s,"end":%s}\n' "$name" "$code" "$start" "$end" >> "$RUN/steps.jsonl"
  echo "step $name: exit $code ($(( (end - start) / 1000 ))s)"
}

MOCK_PORT=$PORT_MOCK MOCK_LOG="$RUN/mock.jsonl" node /pg/mock-llm/server.mjs > "$RUN/mock.out" 2>&1 &
MOCK_PID=$!
for _ in $(seq 1 60); do
  node -e 'fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' "http://127.0.0.1:$PORT_MOCK/health" && break
  sleep 1
done
echo "mock: $(cat "$RUN/mock.out")"

"$OC" gateway run --port "$PORT_GW" --bind loopback --auth token --token "$TOKEN" > "$RUN/gateway.log" 2>&1 &
GW_PID=$!
cleanup() { kill "$GW_PID" "$MOCK_PID" 2>/dev/null; wait 2>/dev/null; }
trap cleanup EXIT

for _ in $(seq 1 180); do
  grep -q "\[gateway\] ready" "$RUN/gateway.log" 2>/dev/null && break
  kill -0 "$GW_PID" 2>/dev/null || break
  sleep 1
done
if ! grep -q "\[gateway\] ready" "$RUN/gateway.log"; then
  echo "gateway did not become ready; last log lines:"; tail -40 "$RUN/gateway.log"; exit 1
fi
echo "gateway ready"

step plugin-inspect "$OC" plugins inspect pg-probe --runtime --json
agent() { step "$1" "$OC" agent --agent main --session-key "pg-$1" --message "$2" --json --timeout 180; }
agent persist-order "Phase 0 probe. [scenario:persist-order]"
agent parallel-tools "Phase 0 probe. [scenario:parallel-tools]"
agent params-race "Phase 0 probe. [scenario:params-race]"
agent spawn "Phase 0 probe. [scenario:spawn]"
agent meta-fetch "Phase 0 probe. [scenario:meta-fetch]"
agent meta-spawn "Phase 0 probe. [scenario:meta-spawn]"
agent meta-exec "Phase 0 probe. [scenario:meta-exec]"
sleep 5

# Cron: an isolated agent-turn job, force-run once. The CLI may print a notice before the JSON.
step cron-add "$OC" cron add "pg cron probe" --agent main --every 1h --session isolated --message "Cron probe. [scenario:persist-order]" --no-deliver --json
JOB=$(node -e 'try{const t=require("fs").readFileSync(process.argv[1],"utf8");const j=JSON.parse(t.slice(t.indexOf("{")));console.log(j.id??j.job?.id??"")}catch{console.log("")}' "$RUN/out/cron-add.txt")
echo "cron job: ${JOB:-<none>}"
if [ -n "$JOB" ]; then
  step cron-run "$OC" cron run "$JOB" --wait --wait-timeout 180s --poll-interval 1s
  step cron-runs "$OC" cron runs "$JOB" --limit 5 --json
fi

# Heartbeat: an immediate event wake, then give it time to finish.
step heartbeat "$OC" system event --text "Heartbeat probe. [scenario:default]" --mode now --json
sleep 25
step heartbeat-last "$OC" system heartbeat last --json

# Embedded run needs exclusive ownership of the state dir, so stop the Gateway first.
kill "$GW_PID" 2>/dev/null; wait "$GW_PID" 2>/dev/null
step local "$OC" agent --local --agent main --session-key pg-local --message "Local probe. [scenario:persist-order]" --json --timeout 180

kill "$MOCK_PID" 2>/dev/null; wait "$MOCK_PID" 2>/dev/null
trap - EXIT
node /pg/scripts/analyze.mjs "$RUN" > "$RUN/report.md"
echo "report: $RUN/report.md"
