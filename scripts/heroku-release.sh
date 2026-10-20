#!/bin/sh
set -eu
# shellcheck disable=SC1091
. /repo/scripts/heroku-db-url.sh
cd /repo
exec pnpm --filter @eef/db migrate:deploy
