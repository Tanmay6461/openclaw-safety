#!/usr/bin/env bash
# Contract sweep on the compute node. From the login node, detached:
#   setsid nohup srun --jobid=<id> --overlap -n1 env RUN=/pg/runs/contract-1 bash /scratch/$USER/pg/contract/run-contract.sh \
#     > /scratch/$USER/pg/runs/contract-1.log 2>&1 < /dev/null &
set -euo pipefail
PG=${PG:-/scratch/$USER/pg}
exec apptainer exec --containall --cleanenv \
  --home "$PG/home:/home/pg" --workdir "$PG/apptainer-work" --bind "$PG":/pg --pwd /pg \
  --env npm_config_cache=/pg/npm-cache ${RUN:+--env RUN="$RUN"} ${PAR:+--env PAR="$PAR"} \
  "$PG/images/node24.sif" bash /pg/contract/inner.sh
