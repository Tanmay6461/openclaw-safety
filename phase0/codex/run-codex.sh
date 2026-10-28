#!/usr/bin/env bash
# Codex runtime probe on the compute node: srun --jobid=<id> --overlap bash /scratch/$USER/pg/codex/run-codex.sh
# Optional: RUN=..., CODEX_INSTALL=managed|link, CODEX_SPEC=@openclaw/codex@2026.10.8, PG_CODEX_SANDBOX=...
set -euo pipefail
PG=${PG:-/scratch/$USER/pg}
# inner.sh fences the network after the plugin install and aborts if an outside connection succeeds.
exec apptainer exec --containall --cleanenv \
  --home "$PG/home:/home/pg" --workdir "$PG/apptainer-work" --bind "$PG":/pg --pwd /pg \
  --env npm_config_cache=/pg/npm-cache \
  ${RUN:+--env RUN="$RUN"} \
  ${CODEX_INSTALL:+--env CODEX_INSTALL="$CODEX_INSTALL"} \
  ${CODEX_SPEC:+--env CODEX_SPEC="$CODEX_SPEC"} \
  ${PG_CODEX_SANDBOX:+--env PG_CODEX_SANDBOX="$PG_CODEX_SANDBOX"} \
  "$PG/images/node24.sif" bash /pg/codex/inner.sh
