#!/usr/bin/env bash
# Guard smoke test on the compute node: srun --jobid=<id> --overlap bash /scratch/$USER/pg/guard-smoke/run-guard.sh
set -euo pipefail
PG=${PG:-/scratch/$USER/pg}
exec apptainer exec --containall --cleanenv \
  --home "$PG/home:/home/pg" --workdir "$PG/apptainer-work" --bind "$PG":/pg --pwd /pg \
  --env npm_config_cache=/pg/npm-cache \
  "$PG/images/node24.sif" bash /pg/guard-smoke/inner.sh
