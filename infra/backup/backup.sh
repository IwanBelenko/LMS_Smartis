#!/bin/sh
set -eu

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="/backups/$stamp"
mkdir -p "$target"

pg_dump \
  --host "$POSTGRES_HOST" \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --format=custom \
  --file "$target/database.dump"

tar -C /source -czf "$target/media.tar.gz" media
printf '%s\n' "$stamp" > "$target/backup-id.txt"

find /backups -mindepth 1 -maxdepth 1 -type d -mtime "+${BACKUP_RETENTION_DAYS:-14}" -exec rm -rf {} +
echo "Backup created: $target"
