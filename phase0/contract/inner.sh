#!/usr/bin/env bash
# Contract sweep, inside the Node 24 container (see run-contract.sh). Same isolation as phase0/guard-smoke.
#  1. dump: every tool's JSON schema (direct tools from the request, hidden ones through tool_describe)
#  2. gen-calls.mjs: one schema-valid call per tool and per action, every parameter filled
#  3. sweep every call in its own fresh sessions (sweep-one.sh, PAR at a time): clean owner, then
#     tainted+private owner after a setup run. Up-front labels from earlier blocked calls would
#     otherwise taint later ones.
# qa-channel is configured (with its QA bus) so the message tool exposes channel actions such as react.
# The pg-contract sentinel blocks every sweep call after the Guard has decided, so nothing executes.
set -uo pipefail

RUN=${RUN:-/pg/runs/contract-$(date +%Y%m%d-%H%M%S)}
PAR=${PAR:-6}
C=/pg/contract
OC=/pg/oc/node_modules/.bin/openclaw
PORT_GW=$((20000 + RANDOM % 20000))
PORT_MOCK=$((PORT_GW + 1))
PORT_BUS=$((PORT_GW + 2))
TOKEN="pg-$RANDOM$RANDOM$RANDOM"
WS="$RUN/state/workspace"
mkdir -p "$WS/contract" "$WS/private" "$RUN/out"
echo "contract sample" > "$WS/contract/sample.txt"
echo "billing notes: account 4111-0000-2222-9999, api_key=sk-pgfake-0123456789abcdef" > "$WS/private/pg-setup-notes.txt"

export OPENCLAW_STATE_DIR="$RUN/state" OPENCLAW_CONFIG_PATH="$RUN/state/openclaw.json"
export OPENCLAW_GATEWAY_TOKEN="$TOKEN" OPENCLAW_GATEWAY_PORT="$PORT_GW"
export OPENCLAW_SKIP_GMAIL_WATCHER=1 OPENCLAW_SKIP_CANVAS_HOST=1
export OPENCLAW_SKIP_BROWSER_CONTROL_SERVER=1 OPENCLAW_SKIP_ACPX_RUNTIME=1 OPENCLAW_SKIP_ACPX_RUNTIME_PROBE=1
export OPENCLAW_AGENT_HARNESS_FALLBACK=none
export NO_PROXY="127.0.0.1,localhost,::1${NO_PROXY:+,$NO_PROXY}" no_proxy="127.0.0.1,localhost,::1${no_proxy:+,$no_proxy}"

node "$C/write-config.mjs" "$RUN" "$PORT_GW" "$PORT_MOCK" "$TOKEN" "http://127.0.0.1:$PORT_BUS" > "$OPENCLAW_CONFIG_PATH"
echo "run=$RUN gateway=$PORT_GW mock=$PORT_MOCK bus=$PORT_BUS par=$PAR"

step() {
  local name=$1; shift
  local start end code
  start=$(date +%s%3N)
  timeout 1200 "$@" > "$RUN/out/$name.txt" 2>&1
  code=$?
  end=$(date +%s%3N)
  printf '{"step":"%s","exit":%d,"start":%s,"end":%s}\n' "$name" "$code" "$start" "$end" >> "$RUN/steps.jsonl"
  echo "step $name: exit $code ($(( (end - start) / 1000 ))s)"
}
# `timeout` runs commands, not shell functions, so the agent call is spelled out per step.
AGENT=("$OC" agent --agent main --json --timeout 1100)

MOCK_PORT=$PORT_MOCK MOCK_LOG="$RUN/mock.jsonl" CONTRACT_CALLS="$RUN/calls.json" PRIVATE_FILE="$WS/private/pg-setup-notes.txt" \
  CONTRACT_NAMES="$(tr '\n' ',' < "$C/names.txt")" node "$C/mock-contract.mjs" > "$RUN/mock.out" 2>&1 &
MOCK_PID=$!
QA_BUS_PORT=$PORT_BUS node /pg/oc/fixtures/qa-bus.mjs > "$RUN/bus.out" 2>&1 &
BUS_PID=$!
for _ in $(seq 1 60); do
  node -e 'fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' "http://127.0.0.1:$PORT_MOCK/health" && break
  sleep 1
done

"$OC" gateway run --port "$PORT_GW" --bind loopback --auth token --token "$TOKEN" > "$RUN/gateway.log" 2>&1 &
GW_PID=$!
trap 'kill $GW_PID $MOCK_PID $BUS_PID 2>/dev/null; wait 2>/dev/null' EXIT
for _ in $(seq 1 180); do
  grep -q "\[gateway\] ready" "$RUN/gateway.log" 2>/dev/null && break
  kill -0 "$GW_PID" 2>/dev/null || break
  sleep 1
done
grep -q "\[gateway\] ready" "$RUN/gateway.log" || { echo "gateway not ready"; tail -40 "$RUN/gateway.log"; exit 1; }
echo "gateway ready"

step plugin-inspect "$OC" plugins inspect provenance-guard --runtime --json
step dump "${AGENT[@]}" --session-key pg-contract-dump --message "Contract dump. [contract:dump]"
node "$C/gen-calls.mjs" "$RUN/mock.jsonl" "$RUN" "$WS" | tee "$RUN/out/gen-calls.txt"
[ -s "$RUN/calls.json" ] || { echo "no calls generated"; exit 1; }
TOTAL=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).length)' "$RUN/calls.json")
echo "calls=$TOTAL"
export RUN
seq 0 $((TOTAL - 1)) | xargs -P "$PAR" -I{} bash "$C/sweep-one.sh" {}
echo "sweep runs: $(grep -c . "$RUN/steps.jsonl")"
sleep 3
kill "$GW_PID" "$MOCK_PID" "$BUS_PID" 2>/dev/null; wait 2>/dev/null; trap - EXIT
echo "done: $RUN"
