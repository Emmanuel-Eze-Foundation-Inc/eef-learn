#!/bin/sh
set -eu
# shellcheck disable=SC1091
. /repo/scripts/heroku-db-url.sh

AI_PORT="${AI_INTERNAL_PORT:-8000}"
export AI_SERVICE_URL="${AI_SERVICE_URL:-http://127.0.0.1:${AI_PORT}}"

cd /ai
uv run uvicorn eef_ai.main:app --host 127.0.0.1 --port "$AI_PORT" &
AI_PID=$!
trap 'kill "$AI_PID" 2>/dev/null || true' EXIT INT TERM

for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if curl -fsS "http://127.0.0.1:${AI_PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

cd /repo
exec pnpm --filter web exec next start -H 0.0.0.0 -p "${PORT:-3000}"
