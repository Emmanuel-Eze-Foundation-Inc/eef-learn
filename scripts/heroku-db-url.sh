#!/bin/sh
# Heroku Postgres URLs omit sslmode; Prisma and asyncpg need TLS.
set -eu
if [ -n "${DATABASE_URL:-}" ] && printf '%s' "$DATABASE_URL" | grep -vq 'sslmode='; then
  case "$DATABASE_URL" in
    *\?*) DATABASE_URL="${DATABASE_URL}&sslmode=require" ;;
    *) DATABASE_URL="${DATABASE_URL}?sslmode=require" ;;
  esac
  export DATABASE_URL
fi
