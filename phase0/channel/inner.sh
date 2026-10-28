#!/usr/bin/env bash
# Runs inside the Node 24 container (see run-channel.sh). Starts the mock LLM, the QA bus, and a Gateway
# with qa-channel, then runs driver.mjs. Everything for the run lives under $RUN.
set -uo pipefail

RUN=${RUN:-/pg/runs/ch-$(date +%Y%m%d-%H%M%S)}
TESTS=${TESTS:-all}
VARIANT=${VARIANT:-base}
S=/pg/channel-scripts
OC=/pg/oc/node_modules/.bin/openclaw
PORT_GW=${PORT_GW:-$((20000 + RANDOM % 20000))}
PORT_MOCK=$((PORT_GW + 1))
PORT_BUS=$((PORT_GW + 2))
TOKEN="pg-$RANDOM$RANDOM$RANDOM"
BUS="http://127.0.0.1:$PORT_BUS"
mkdir -p "$RUN/state/workspace" "$RUN/out"

export OPENCLAW_STATE_DIR="$RUN/state" OPENCLAW_CONFIG_PATH="$RUN/state/openclaw.json"
export OPENCLAW_GATEWAY_TOKEN="$TOKEN" OPENCLAW_GATEWAY_PORT="$PORT_GW"
# Channels stay on (qa-channel); other side services off.
export OPENCLAW_SKIP_GMAIL_WATCHER=1 OPENCLAW_SKIP_CANVAS_HOST=1
export OPENCLAW_SKIP_BROWSER_CONTROL_SERVER=1 OPENCLAW_SKIP_ACPX_RUNTIME=1 OPENCLAW_SKIP_ACPX_RUNTIME_PROBE=1
export OPENCLAW_AGENT_HARNESS_FALLBACK=none
export NO_PROXY="127.0.0.1,localhost,::1${NO_PROXY:+,$NO_PROXY}" no_proxy="127.0.0.1,localhost,::1${no_proxy:+,$no_proxy}"

echo "phase0 probe input" > "$RUN/state/workspace/probe-input.txt"
node "$S/write-config.mjs" "$RUN" "$PORT_GW" "$PORT_MOCK" "$TOKEN" "$BUS" "$VARIANT" > "$OPENCLAW_CONFIG_PATH"
echo "run=$RUN gateway=$PORT_GW mock=$PORT_MOCK bus=$PORT_BUS tests=$TESTS variant=$VARIANT"

wait_http() { for _ in $(seq 1 60); do node -e 'fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' "$1" && return 0; sleep 1; done; return 1; }

MOCK_PORT=$PORT_MOCK MOCK_LOG="$RUN/mock.jsonl" MOCK_SCENARIOS=/pg/mock-llm/scenarios.json node "$S/mock-llm-channel.mjs" > "$RUN/mock.out" 2>&1 &
MOCK_PID=$!
QA_BUS_PORT=$PORT_BUS node /pg/oc/fixtures/qa-bus.mjs > "$RUN/bus.out" 2>&1 &
BUS_PID=$!
wait_http "http://127.0.0.1:$PORT_MOCK/health" || { echo "mock failed"; cat "$RUN/mock.out"; exit 1; }
wait_http "$BUS/health" || { echo "bus failed"; cat "$RUN/bus.out"; exit 1; }
echo "mock: $(cat "$RUN/mock.out")"; echo "bus: $(cat "$RUN/bus.out")"

"$OC" gateway run --port "$PORT_GW" --bind loopback --auth token --token "$TOKEN" > "$RUN/gateway.log" 2>&1 &
GW_PID=$!
cleanup() { kill "$GW_PID" "$MOCK_PID" "$BUS_PID" 2>/dev/null; wait 2>/dev/null; }
trap cleanup EXIT

for _ in $(seq 1 180); do
  grep -q "\[gateway\] ready" "$RUN/gateway.log" 2>/dev/null && break
  kill -0 "$GW_PID" 2>/dev/null || break
  sleep 1
done
if ! grep -q "\[gateway\] ready" "$RUN/gateway.log"; then
  echo "gateway did not become ready; last log lines:"; tail -60 "$RUN/gateway.log"; exit 1
fi
echo "gateway ready"
"$OC" plugins inspect qa-channel --runtime --json > "$RUN/out/qa-channel-inspect.json" 2>&1
"$OC" plugins inspect pg-probe --runtime --json > "$RUN/out/pg-probe-inspect.json" 2>&1
"$OC" channels status --json > "$RUN/out/channels-status.json" 2>&1

# qa-channel is ready once it has polled the bus (its poll cursor shows up in the bus state) or after 20 s.
for _ in $(seq 1 20); do grep -qi "qa-channel" "$RUN/gateway.log" && break; sleep 1; done
sleep 5

OC="$OC" node "$S/driver.mjs" "$RUN" "$BUS" "$TESTS" 2>&1 | tee "$RUN/driver.out"
sleep 3
node /pg/scripts/analyze.mjs "$RUN" > "$RUN/report-hooks.md" 2>/dev/null
node "$S/analyze-channel.mjs" "$RUN" > "$RUN/report.md" 2>&1
echo "report: $RUN/report.md"
