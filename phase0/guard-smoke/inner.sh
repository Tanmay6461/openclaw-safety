#!/usr/bin/env bash
# Guard smoke test, inside the Node 24 container. Same environment as phase0/cluster/inner.sh.
set -uo pipefail

RUN=${RUN:-/pg/runs/guard-$(date +%Y%m%d-%H%M%S)}
OC=/pg/oc/node_modules/.bin/openclaw
PORT_GW=$((20000 + RANDOM % 20000))
PORT_MOCK=$((PORT_GW + 1))
TOKEN="pg-$RANDOM$RANDOM$RANDOM"
mkdir -p "$RUN/state/workspace" "$RUN/out"

export OPENCLAW_STATE_DIR="$RUN/state" OPENCLAW_CONFIG_PATH="$RUN/state/openclaw.json"
export OPENCLAW_GATEWAY_TOKEN="$TOKEN" OPENCLAW_GATEWAY_PORT="$PORT_GW"
export OPENCLAW_SKIP_CHANNELS=1 OPENCLAW_SKIP_GMAIL_WATCHER=1 OPENCLAW_SKIP_CANVAS_HOST=1
export OPENCLAW_SKIP_BROWSER_CONTROL_SERVER=1 OPENCLAW_SKIP_ACPX_RUNTIME=1 OPENCLAW_SKIP_ACPX_RUNTIME_PROBE=1
export OPENCLAW_AGENT_HARNESS_FALLBACK=none
export NO_PROXY="127.0.0.1,localhost,::1${NO_PROXY:+,$NO_PROXY}" no_proxy="127.0.0.1,localhost,::1${no_proxy:+,$no_proxy}"

node /pg/guard-smoke/write-config.mjs "$RUN" "$PORT_GW" "$PORT_MOCK" "$TOKEN" > "$OPENCLAW_CONFIG_PATH"
echo "run=$RUN gateway=$PORT_GW mock=$PORT_MOCK"

step() {
  local name=$1; shift
  local start end code
  start=$(date +%s%3N)
  timeout 240 "$@" > "$RUN/out/$name.txt" 2>&1
  code=$?
  end=$(date +%s%3N)
  printf '{"step":"%s","exit":%d,"start":%s,"end":%s}\n' "$name" "$code" "$start" "$end" >> "$RUN/steps.jsonl"
  echo "step $name: exit $code"
}

MOCK_PORT=$PORT_MOCK MOCK_LOG="$RUN/mock.jsonl" MOCK_SCENARIOS=/pg/guard-smoke/scenarios.json node /pg/mock-llm/server.mjs > "$RUN/mock.out" 2>&1 &
MOCK_PID=$!
for _ in $(seq 1 60); do
  node -e 'fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' "http://127.0.0.1:$PORT_MOCK/health" && break
  sleep 1
done

"$OC" gateway run --port "$PORT_GW" --bind loopback --auth token --token "$TOKEN" > "$RUN/gateway.log" 2>&1 &
GW_PID=$!
trap 'kill $GW_PID $MOCK_PID 2>/dev/null; wait 2>/dev/null' EXIT
for _ in $(seq 1 180); do
  grep -q "\[gateway\] ready" "$RUN/gateway.log" 2>/dev/null && break
  kill -0 "$GW_PID" 2>/dev/null || break
  sleep 1
done
grep -q "\[gateway\] ready" "$RUN/gateway.log" || { echo "gateway not ready"; tail -40 "$RUN/gateway.log"; exit 1; }

step plugin-inspect "$OC" plugins inspect provenance-guard --runtime --json
for sc in smoke-clean smoke-taint-exec smoke-protected smoke-meta-block smoke-neutralize smoke-links; do
  step "$sc" "$OC" agent --agent main --session-key "pg-$sc" --message "Guard smoke. [scenario:$sc]" --json --timeout 180
done
sleep 3
kill "$GW_PID" "$MOCK_PID" 2>/dev/null; wait 2>/dev/null; trap - EXIT
node /pg/guard-smoke/check.mjs "$RUN" > "$RUN/report.md"
echo "report: $RUN/report.md"
