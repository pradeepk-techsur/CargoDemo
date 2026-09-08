#!/usr/bin/env bash
set -u
PORT="${UAT_PORT:-3000}"
LOG=/tmp/pivota-uat-app.log
PRIOR_PID="$(cat /tmp/pivota-uat-app.pid 2>/dev/null || true)"
if [ -n "$PRIOR_PID" ] && kill -0 "$PRIOR_PID" 2>/dev/null; then
  PGID="$(ps -o pgid= -p "$PRIOR_PID" 2>/dev/null | tr -d ' ')"
  if [ -n "$PGID" ]; then kill -TERM "-${PGID}" 2>/dev/null || true; fi
  kill -TERM "$PRIOR_PID" 2>/dev/null || true
fi
fuser -k "${PORT}/tcp" 2>/dev/null || true
sleep 1
RUN_CMD='npm start'
setsid bash -c "$RUN_CMD" > "$LOG" 2>&1 < /dev/null &
echo "$!" > /tmp/pivota-uat-app.pid
echo "[uat] launched detached on :${PORT} (log: $LOG)"
