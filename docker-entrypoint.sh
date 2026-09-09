#!/bin/sh
set -e

DATA_DIR=$(dirname "${DB_PATH:-/app/data/bookings.json}")
mkdir -p "$DATA_DIR"
chown -R node:node "$DATA_DIR" 2>/dev/null || true

if [ "$(id -u)" = "0" ]; then
  exec runuser -u node -- "$@"
fi

exec "$@"
