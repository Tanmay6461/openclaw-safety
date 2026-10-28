#!/usr/bin/env bash
# Phase 0 runtime tests. Run on the compute node:
#   srun --jobid=<id> --overlap bash /scratch/$USER/pg/scripts/run-phase0.sh
# Same isolation as setup.sh: clean env, only /scratch/$USER/pg visible (as /pg).
set -euo pipefail
PG=${PG:-/scratch/$USER/pg}
exec apptainer exec --containall --cleanenv \
  --home "$PG/home:/home/pg" --workdir "$PG/apptainer-work" --bind "$PG":/pg --pwd /pg \
  --env npm_config_cache=/pg/npm-cache ${RUN:+--env RUN="$RUN"} \
  "$PG/images/node24.sif" bash /pg/scripts/inner.sh
