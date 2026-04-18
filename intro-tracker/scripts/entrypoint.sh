#!/bin/sh
set -e

DB_PATH="/data/crm.db"

if [ -n "${BUCKET_NAME:-}" ]; then
  if [ ! -f "$DB_PATH" ]; then
    echo "[entrypoint] $DB_PATH missing — attempting litestream restore"
    litestream restore -if-replica-exists -config /etc/litestream.yml "$DB_PATH"
  else
    echo "[entrypoint] $DB_PATH exists — skipping restore"
  fi
  exec litestream replicate -config /etc/litestream.yml -exec "node server.js"
else
  echo "[entrypoint] BUCKET_NAME not set — running without replication"
  exec node server.js
fi
