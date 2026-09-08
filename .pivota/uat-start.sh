#!/usr/bin/env bash
# Idempotent, detached UAT app launcher (written by verify-express). Re-run after
# any code fix to (re)start the app — it frees the port first.
set -u
PORT="${UAT_PORT:-3000}"
BS="${BUILD_SYSTEM:-}"
LOG=/tmp/pivota-uat-app.log
PRIOR_PID="$(cat /tmp/pivota-uat-app.pid 2>/dev/null || true)"
if [ -n "$PRIOR_PID" ] && kill -0 "$PRIOR_PID" 2>/dev/null; then
  PGID="$(ps -o pgid= -p "$PRIOR_PID" 2>/dev/null | tr -d ' ')"
  if [ -n "$PGID" ]; then kill -TERM "-${PGID}" 2>/dev/null || true; fi
  kill -TERM "$PRIOR_PID" 2>/dev/null || true
fi
fuser -k "${PORT}/tcp" 2>/dev/null || true
pkill -f 'next (dev|start)' 2>/dev/null || true
sleep 1
if [ "$BS" = "docker-compose" ] || ls docker-compose.y*ml compose.y*ml >/dev/null 2>&1; then
  COMPOSE_CMD="${COMPOSE:-docker compose}"
  $COMPOSE_CMD up -d
  echo "[uat] ${COMPOSE_CMD} up -d"
  exit 0
fi
if [ ! -f package.json ]; then
  echo "[uat] no compose file or package.json found — start the app manually" >&2
  exit 1
fi
if grep -qE '"start"[[:space:]]*:' package.json 2>/dev/null; then
  RUN_CMD='npm start'
else
  RUN_CMD='WATCHPACK_POLLING=true npm run dev'
fi
setsid bash -c "$RUN_CMD" > "$LOG" 2>&1 < /dev/null &
echo "$!" > /tmp/pivota-uat-app.pid
echo "[uat] launched detached on :${PORT} (log: $LOG)"
