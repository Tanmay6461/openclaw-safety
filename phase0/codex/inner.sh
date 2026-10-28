#!/usr/bin/env bash
# Codex runtime probe, inside the Node 24 container (see run-codex.sh). Same layout as
# phase0/guard-smoke/inner.sh. NOTES.md explains every Codex-specific step.
# Env: RUN, CODEX_INSTALL (managed | link), CODEX_SPEC, PG_CODEX_SANDBOX.
set -uo pipefail

RUN=${RUN:-/pg/runs/codex-$(date +%Y%m%d-%H%M%S)}
OC=/pg/oc/node_modules/.bin/openclaw
HERE=/pg/codex
CODEX_SPEC=${CODEX_SPEC:-@openclaw/codex@2026.10.8}
CODEX_INSTALL=${CODEX_INSTALL:-managed}
PORT_GW=$((20000 + RANDOM % 20000))
PORT_MOCK=$((PORT_GW + 1))
TOKEN="pg-$RANDOM$RANDOM$RANDOM"
FAKE_KEY="sk-pg-mock-not-a-real-key"
CATALOG="$RUN/codex-model-catalog.json"
mkdir -p "$RUN/state/workspace" "$RUN/out"

export OPENCLAW_STATE_DIR="$RUN/state" OPENCLAW_CONFIG_PATH="$RUN/state/openclaw.json"
export OPENCLAW_GATEWAY_TOKEN="$TOKEN" OPENCLAW_GATEWAY_PORT="$PORT_GW"
export OPENCLAW_SKIP_CHANNELS=1 OPENCLAW_SKIP_GMAIL_WATCHER=1 OPENCLAW_SKIP_CANVAS_HOST=1
export OPENCLAW_SKIP_BROWSER_CONTROL_SERVER=1 OPENCLAW_SKIP_ACPX_RUNTIME=1 OPENCLAW_SKIP_ACPX_RUNTIME_PROBE=1
export OPENCLAW_SKIP_STARTUP_MODEL_PREWARM=1
export OPENCLAW_AGENT_HARNESS_FALLBACK=none
export NO_PROXY="127.0.0.1,localhost,::1${NO_PROXY:+,$NO_PROXY}" no_proxy="127.0.0.1,localhost,::1${no_proxy:+,$no_proxy}"
# Codex itself talks to the mock; OpenClaw's own route stays official (NOTES.md §1). Same flags as
# extensions/qa-lab/src/codex-app-server-args.ts:25-37.
export OPENCLAW_CODEX_APP_SERVER_ARGS="app-server -c openai_base_url=http://127.0.0.1:$PORT_MOCK/v1 -c \"model_catalog_json=$CATALOG\" -c sandbox_workspace_write.exclude_tmpdir_env_var=true -c sandbox_workspace_write.exclude_slash_tmp=true --listen stdio://"
# Last-resort key for the local stdio no-account path (docs/plugins/codex-harness-reference/auth.md:30-34).
# OPENAI_API_KEY is left unset so no other OpenClaw subsystem picks the fake key up.
export CODEX_API_KEY="$FAKE_KEY"

# One JSONL line per step: name, exit code, start/end ms. Output goes to out/<name>.txt.
step() {
  local name=$1; shift
  local start end code
  start=$(date +%s%3N)
  timeout "${STEP_TIMEOUT:-300}" "$@" > "$RUN/out/$name.txt" 2>&1
  code=$?
  end=$(date +%s%3N)
  printf '{"step":"%s","exit":%d,"start":%s,"end":%s}\n' "$name" "$code" "$start" "$end" >> "$RUN/steps.jsonl"
  echo "step $name: exit $code ($(( (end - start) / 1000 ))s)"
  return "$code"
}

node "$HERE/mock-responses.mjs" --write-catalog "$CATALOG" > /dev/null || { echo "catalog failed"; exit 1; }
node "$HERE/write-config.mjs" "$RUN" "$PORT_GW" "$PORT_MOCK" "$TOKEN" pre > "$OPENCLAW_CONFIG_PATH" || { echo "pre config failed"; exit 1; }
echo "run=$RUN gateway=$PORT_GW mock=$PORT_MOCK codex-install=$CODEX_INSTALL"

# 1. The Codex plugin must have origin "global" (NOTES.md §2). Loaded from plugins.load.paths it gets
#    origin "config" and its harness registration (nativeCompaction) is refused.
case "$CODEX_INSTALL" in
  managed)
    # Managed npm project under $OPENCLAW_STATE_DIR/npm; needs the npm registry (uses /pg/npm-cache).
    STEP_TIMEOUT=900 step codex-install "$OC" plugins install "$CODEX_SPEC" --pin \
      || STEP_TIMEOUT=900 step codex-install-npm "$OC" plugins install "npm:$CODEX_SPEC" --pin --force \
      || { echo "codex plugin install failed:"; tail -30 "$RUN/out/codex-install-npm.txt"; exit 1; }
    ;;
  link)
    # Fallback without network: the /pg/oc copy from install-codex.sh, placed in the global
    # extensions root (<state>/extensions). Less proven than managed; see NOTES.md §2.
    src=/pg/oc/node_modules/@openclaw/codex
    [ -f "$src/openclaw.plugin.json" ] || { echo "missing $src; run install-codex.sh first"; exit 1; }
    mkdir -p "$RUN/state/extensions" && ln -s "$src" "$RUN/state/extensions/codex"
    ;;
  *) echo "CODEX_INSTALL must be managed or link"; exit 2 ;;
esac

# Network fence: only the plugin install above needs the outside (the npm registry, via Explorer's
# proxy). From here on every proxy points at a dead local port, and Explorer compute nodes have no
# direct route out, so nothing reaches a real LLM API; Codex and OpenClaw talk to the mock on
# 127.0.0.1 (NO_PROXY). The check below aborts the run if any outside connection still succeeds.
# (A hosts file bound over /etc/hosts doesn't work here: Apptainer keeps its own.)
export HTTPS_PROXY=http://127.0.0.1:9 HTTP_PROXY=http://127.0.0.1:9 https_proxy=http://127.0.0.1:9 http_proxy=http://127.0.0.1:9 ALL_PROXY=http://127.0.0.1:9 all_proxy=http://127.0.0.1:9
if node -e 'const ok=(u)=>fetch(u,{signal:AbortSignal.timeout(6000)}).then(()=>true,()=>false);Promise.all(["https://example.com","https://api.openai.com/v1/models"].map(ok)).then((r)=>process.exit(r.some(Boolean)?1:0))'; then
  echo "fence: ok (no outside connection succeeds)"
else
  echo "fence: FAILED, an outside connection succeeded; aborting"; exit 1
fi

# 2. API-key auth profile for provider openai, as QA stages it for packaged builds
#    (extensions/qa-lab/src/gateway-child-setup.ts:136-170). The mock accepts any key.
printf '%s\n' "$FAKE_KEY" | step auth-paste "$OC" models auth paste-api-key --provider openai --agent main --profile-id pg-mock-openai \
  || echo "auth paste failed; continuing with the provider apiKey and CODEX_API_KEY fallbacks"

# 3. Final config: codex entry plus the runtime pin, merged into what steps 1-2 wrote.
node "$HERE/write-config.mjs" "$RUN" "$PORT_GW" "$PORT_MOCK" "$TOKEN" final > "$RUN/state/openclaw.next.json" \
  && mv "$RUN/state/openclaw.next.json" "$OPENCLAW_CONFIG_PATH" || { echo "final config failed"; exit 1; }
cp "$OPENCLAW_CONFIG_PATH" "$RUN/out/openclaw.final.json"
step codex-inspect-offline "$OC" plugins inspect codex --json

MOCK_PORT=$PORT_MOCK MOCK_LOG="$RUN/mock.jsonl" node "$HERE/mock-responses.mjs" > "$RUN/mock.out" 2>&1 &
MOCK_PID=$!
for _ in $(seq 1 60); do
  node -e 'fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' "http://127.0.0.1:$PORT_MOCK/health" && break
  sleep 1
done
echo "mock: $(cat "$RUN/mock.out")"

# setsid: inside the container's PID namespace, a process whose group leader is outside it shows pgid 0
# in /proc/<pid>/stat, and the Codex plugin rejects that ("Process identity is unavailable", codex-1;
# extensions/codex/src/app-server/transport-process-snapshot.ts parseLinuxProcess).
# GW_SETSID=0 skips it (with PIDNS=0 in run-codex.sh the container shares the node's PID namespace).
if [ "${GW_SETSID:-1}" = 1 ]; then LAUNCH=(setsid); else LAUNCH=(); fi
"${LAUNCH[@]}" "$OC" gateway run --verbose --port "$PORT_GW" --bind loopback --auth token --token "$TOKEN" > "$RUN/gateway.log" 2>&1 &
GW_PID=$!
trap 'kill $GW_PID $MOCK_PID 2>/dev/null; wait 2>/dev/null' EXIT
for _ in $(seq 1 180); do
  grep -q "\[gateway\] ready" "$RUN/gateway.log" 2>/dev/null && break
  kill -0 "$GW_PID" 2>/dev/null || break
  sleep 1
done
grep -q "\[gateway\] ready" "$RUN/gateway.log" || { echo "gateway not ready"; tail -40 "$RUN/gateway.log"; exit 1; }

step plugin-inspect-codex "$OC" plugins inspect codex --runtime --json
step plugin-inspect-probe "$OC" plugins inspect pg-probe --runtime --json
for sc in default codex-shell codex-patch codex-spawn; do
  step "$sc" "$OC" agent --agent main --session-key "pg-$sc" --message "Codex probe. [scenario:$sc]" --json --timeout 240
done
sleep 3
kill "$GW_PID" "$MOCK_PID" 2>/dev/null; wait 2>/dev/null; trap - EXIT

# Codex's own rollouts (native tool calls and hook runs) stay in the per-agent Codex home.
find "$RUN/state" -path '*codex-home*' -name '*.jsonl' > "$RUN/out/codex-rollouts.txt" 2>/dev/null
node "$HERE/summarize.mjs" "$RUN" > "$RUN/report.md"
cat "$RUN/report.md"
echo "report: $RUN/report.md"
