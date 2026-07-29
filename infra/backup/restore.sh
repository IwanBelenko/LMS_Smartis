#!/bin/sh
set -eu

backup_id="${1:-}"
if [ -z "$backup_id" ] || [ ! -f "/backups/$backup_id/database.dump" ]; then
  echo "Usage: restore.sh <backup-id>" >&2
  exit 2
fi

pg_restore \
  --host "$POSTGRES_HOST" \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --clean \
  --if-exists \
  --single-transaction \
  --no-owner \
  "/backups/$backup_id/database.dump"

if [ -f "/backups/$backup_id/media.tar.gz" ]; then
  find /restore/media -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  tar -C /restore -xzf "/backups/$backup_id/media.tar.gz"
fi
echo "Backup restored: $backup_id"
