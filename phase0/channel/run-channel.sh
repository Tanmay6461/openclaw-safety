#!/usr/bin/env bash
# Phase 0 channel tests. From the login node, detached so it survives the Mac sleeping:
#   setsid nohup srun --jobid=<id> --overlap -n1 env TESTS=all bash /scratch/$USER/pg/channel-scripts/run-channel.sh \
#     > /scratch/$USER/pg/runs/<name>.log 2>&1 < /dev/null &
# Same isolation as phase0/cluster/run-phase0.sh: clean env, only /scratch/$USER/pg visible (as /pg).
set -euo pipefail
PG=${PG:-/scratch/$USER/pg}
exec apptainer exec --containall --cleanenv \
  --home "$PG/home:/home/pg" --workdir "$PG/apptainer-work" --bind "$PG":/pg --pwd /pg \
  --env npm_config_cache=/pg/npm-cache ${RUN:+--env RUN="$RUN"} ${TESTS:+--env TESTS="$TESTS"} ${VARIANT:+--env VARIANT="$VARIANT"} \
  "$PG/images/node24.sif" bash /pg/channel-scripts/inner.sh
