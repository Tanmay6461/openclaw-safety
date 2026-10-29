#!/usr/bin/env bash
# Interactive Telegram test, inside the Node 24 container (see run-telegram.sh). The Gateway stays up for
# MINUTES (default 30) or until $RUN/stop exists, while the owner and the non-owner send the test messages.
# OpenClaw's state (including the token file) lives on node-local disk (/localstate) and is removed after.
set -uo pipefail
RUN=${RUN:?}
MINUTES=${MINUTES:-30}
OC=/pg/oc/node_modules/.bin/openclaw
STATE=/localstate/state
PORT_GW=$((20000 + RANDOM % 20000))
PORT_MOCK=$((PORT_GW + 1))
GWTOKEN="pg-$RANDOM$RANDOM$RANDOM"
mkdir -p "$RUN/out" "$STATE/workspace"

# Burner bot token: from the user's mode-600 file into a mode-600 tokenFile on node-local disk.
umask 077
TG=$(sed -n 's/^TELEGRAM_BOT_TOKEN=//p' /pg/secrets/channels.env | head -1)
[ -n "$TG" ] || { echo "no TELEGRAM_BOT_TOKEN in /pg/secrets/channels.env"; exit 1; }
printf '%s' "$TG" > "$STATE/telegram.token"
unset TG
PROXY="${https_proxy:-${HTTPS_PROXY:-}}"

export OPENCLAW_STATE_DIR="$STATE" OPENCLAW_CONFIG_PATH="$STATE/openclaw.json"
export OPENCLAW_GATEWAY_TOKEN="$GWTOKEN" OPENCLAW_GATEWAY_PORT="$PORT_GW"
export OPENCLAW_SKIP_GMAIL_WATCHER=1 OPENCLAW_SKIP_CANVAS_HOST=1 OPENCLAW_SKIP_BROWSER_CONTROL_SERVER=1
export OPENCLAW_SKIP_ACPX_RUNTIME=1 OPENCLAW_SKIP_ACPX_RUNTIME_PROBE=1 OPENCLAW_AGENT_HARNESS_FALLBACK=none
export NO_PROXY="127.0.0.1,localhost,::1${NO_PROXY:+,$NO_PROXY}" no_proxy="127.0.0.1,localhost,::1${no_proxy:+,$no_proxy}"

node /pg/telegram/write-config.mjs "$RUN" "$PORT_GW" "$PORT_MOCK" "$GWTOKEN" "$STATE" "$STATE/telegram.token" "$PROXY" > "$OPENCLAW_CONFIG_PATH" || exit 1
echo "run=$RUN gateway=$PORT_GW mock=$PORT_MOCK proxy=${PROXY:+set} minutes=$MINUTES"

MOCK_PORT=$PORT_MOCK MOCK_LOG="$RUN/mock.jsonl" MOCK_SCENARIOS=/pg/mock-llm/scenarios.json node /pg/channel-scripts/mock-llm-channel.mjs > "$RUN/mock.out" 2>&1 &
MOCK_PID=$!
setsid "$OC" gateway run --port "$PORT_GW" --bind loopback --auth token --token "$GWTOKEN" > "$RUN/gateway.log" 2>&1 &
GW_PID=$!
trap 'kill $GW_PID $MOCK_PID 2>/dev/null; wait 2>/dev/null; rm -f "$STATE/telegram.token"' EXIT
for _ in $(seq 1 240); do
  grep -q "\[gateway\] ready" "$RUN/gateway.log" 2>/dev/null && break
  kill -0 "$GW_PID" 2>/dev/null || break
  sleep 1
done
grep -q "\[gateway\] ready" "$RUN/gateway.log" || { echo "gateway not ready"; grep -iv "watcher error" "$RUN/gateway.log" | tail -30; exit 1; }
echo "gateway ready: send the test messages now"
grep -i "telegram" "$RUN/gateway.log" | grep -iv "watcher" | tail -5 | sed -E 's/[0-9]{8,10}:[A-Za-z0-9_-]{30,}/<token>/g'

end=$(( $(date +%s) + MINUTES * 60 ))
while [ "$(date +%s)" -lt "$end" ] && [ ! -e "$RUN/stop" ] && kill -0 "$GW_PID" 2>/dev/null; do sleep 5; done
echo "stopping"
kill "$GW_PID" "$MOCK_PID" 2>/dev/null; wait 2>/dev/null; trap - EXIT
rm -f "$STATE/telegram.token"
cp "$OPENCLAW_CONFIG_PATH" "$RUN/out/openclaw.json"
echo "done: $RUN"
