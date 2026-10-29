#!/usr/bin/env bash
# Interactive Telegram test on the compute node, detached:
#   setsid nohup srun --jobid=<id> --overlap -n1 env RUN=/pg/runs/tg-1 bash /scratch/$USER/pg/telegram/run-telegram.sh \
#     > /scratch/$USER/pg/runs/tg-1.log 2>&1 < /dev/null &
# Explorer's proxy reaches the container (it leaks through --cleanenv), which Telegram needs.
set -euo pipefail
PG=${PG:-/scratch/$USER/pg}
LOCAL=$(mktemp -d /tmp/pg-tg-state.XXXXXX)
set +e
apptainer exec --containall --cleanenv \
  --home "$PG/home:/home/pg" --workdir "$PG/apptainer-work" --bind "$PG":/pg --pwd /pg \
  --bind "$LOCAL":/localstate --env npm_config_cache=/pg/npm-cache \
  ${RUN:+--env RUN="$RUN"} ${MINUTES:+--env MINUTES="$MINUTES"} \
  "$PG/images/node24.sif" bash /pg/telegram/inner.sh
code=$?
rm -rf "$LOCAL"
exit $code
