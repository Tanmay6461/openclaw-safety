#!/usr/bin/env bash
# One sweep call in a fresh clean owner session (the tainted+private pass runs chunked in inner.sh).
# Called by inner.sh through xargs -P, with the run's environment exported.
set -uo pipefail
i=$1
OC=/pg/oc/node_modules/.bin/openclaw
run_step() {
  local name=$1; shift
  local start end code
  start=$(date +%s%3N)
  timeout 600 "$@" > "$RUN/out/$name.txt" 2>&1
  code=$?
  end=$(date +%s%3N)
  printf '{"step":"%s","exit":%d,"start":%s,"end":%s}\n' "$name" "$code" "$start" "$end" >> "$RUN/steps.jsonl"
}
A=("$OC" agent --agent main --json --timeout 500)
run_step "clean-$i" "${A[@]}" --session-key "pg-c-clean-$i" --message "Contract sweep. [contract:sweep] FROM=$i TO=$((i + 1)) PASS=clean"
