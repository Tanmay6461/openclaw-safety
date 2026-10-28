#!/usr/bin/env bash
# Phase 0 cluster setup: a Node 24 Apptainer image plus OpenClaw installed under scratch.
# Safe to re-run. Everything OpenClaw touches lives in $PG; the container can't see $HOME.
set -euo pipefail

PG=${PG:-/scratch/$USER/pg}
OC_VERSION=${OC_VERSION:-2026.10.8}
export APPTAINER_CACHEDIR=$PG/.apptainer-cache
mkdir -p "$PG"/{images,home,oc,logs,work,npm-cache,apptainer-work}

# Isolated run: clean environment, only $PG bound (as /pg). --containall alone gives the container
# a tiny in-memory home and /tmp, so both are pointed at scratch, as is npm's cache.
run() {
  apptainer exec --containall --cleanenv \
    --home "$PG/home:/home/pg" --workdir "$PG/apptainer-work" --bind "$PG":/pg --pwd /pg \
    --env npm_config_cache=/pg/npm-cache \
    "$PG/images/node24.sif" "$@"
}

if [ ! -f "$PG/images/node24.sif" ]; then
  echo "== pulling node:24 image"
  apptainer pull "$PG/images/node24.sif" docker://node:24-bookworm
fi
echo "== node $(run node --version), npm $(run npm --version)"

echo "== installing openclaw@$OC_VERSION"
run bash -c "cd /pg/oc && { [ -f package.json ] || npm init -y >/dev/null; } && npm install --no-audit --no-fund openclaw@$OC_VERSION"
echo "== $(run bash -c 'cd /pg/oc && npx --no-install openclaw --version')"
echo "== setup done"
