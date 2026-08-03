#!/usr/bin/env bash
set -Eeuo pipefail

: "${BACKUP_ID:=latest}"
: "${RUN_ID:?RUN_ID is required}"

app_root=/opt/smartis
current_link=/opt/smartis-releases/current
check_suffix="$(printf '%s' "$RUN_ID" | tr -cd 'a-zA-Z0-9_.-' | cut -c1-40)"
check_container="smartis-restore-check-$check_suffix"
database_volume="smartis_restore_check_db_$check_suffix"
media_volume="smartis_restore_check_media_$check_suffix"
database_name=smartis_restore_check
database_user=smartis_restore_check
database_password="$(openssl rand -hex 24)"

test -n "$check_suffix"
test -f "$app_root/.env"
test -f "$current_link/compose.yaml"
test "$(df --output=pcent /var/lib/docker | tail -1 | tr -dc '0-9')" -lt 85
test "$(df --output=avail -B1 /var/lib/docker | tail -1 | tr -dc '0-9')" -gt 2147483648
docker network inspect smartis-lms_default >/dev/null

compose() {
  docker compose --project-name smartis-lms --env-file "$app_root/.env" \
    --file "$current_link/compose.yaml" "$@"
}

if [ "$BACKUP_ID" = "latest" ]; then
  BACKUP_ID="$(
    compose --profile maintenance run --rm --no-deps \
      --entrypoint /bin/sh restore -c \
      'set -eu; latest="$(ls -1dt /backups/* 2>/dev/null | head -n 1)"; test -d "$latest"; basename "$latest"' \
      | tail -n 1
  )"
fi

if [[ ! "$BACKUP_ID" =~ ^[0-9]{8}T[0-9]{6}Z$ ]]; then
  echo "Invalid backup id: $BACKUP_ID" >&2
  exit 2
fi

cleanup() {
  docker rm --force "$check_container" >/dev/null 2>&1 || true
  docker volume rm "$database_volume" >/dev/null 2>&1 || true
  docker volume rm "$media_volume" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup
docker volume create "$database_volume" >/dev/null
docker volume create "$media_volume" >/dev/null
docker run --detach \
  --name "$check_container" \
  --network smartis-lms_default \
  --env "POSTGRES_DB=$database_name" \
  --env "POSTGRES_USER=$database_user" \
  --env "POSTGRES_PASSWORD=$database_password" \
  --volume "$database_volume:/var/lib/postgresql/data" \
  postgres:17-alpine >/dev/null

attempt=0
until docker exec "$check_container" pg_isready --username "$database_user" --dbname "$database_name" >/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    docker logs --tail 80 "$check_container"
    exit 1
  fi
  sleep 2
done

compose --profile maintenance run --rm --no-deps \
  --env "POSTGRES_HOST=$check_container" \
  --env "POSTGRES_DB=$database_name" \
  --env "POSTGRES_USER=$database_user" \
  --env "PGPASSWORD=$database_password" \
  --volume "$media_volume:/restore-check" \
  --entrypoint /bin/sh restore -c '
    set -eu
    backup_id="$1"
    backup_dir="/backups/$backup_id"
    test -s "$backup_dir/database.dump"
    test -s "$backup_dir/media.tar.gz"
    test "$(cat "$backup_dir/backup-id.txt")" = "$backup_id"
    pg_restore --list "$backup_dir/database.dump" >/dev/null
    pg_restore \
      --exit-on-error \
      --host "$POSTGRES_HOST" \
      --username "$POSTGRES_USER" \
      --dbname "$POSTGRES_DB" \
      --no-owner \
      --no-privileges \
      "$backup_dir/database.dump"
    tar -C /restore-check -xzf "$backup_dir/media.tar.gz"
    table_count="$(psql --tuples-only --no-align --host "$POSTGRES_HOST" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --command "select count(*) from pg_tables where schemaname = '\''public'\''")"
    migration_count="$(psql --tuples-only --no-align --host "$POSTGRES_HOST" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --command "select count(*) from django_migrations")"
    media_file_count="$(find /restore-check -type f | wc -l | tr -d " ")"
    test "$table_count" -gt 0
    test "$migration_count" -gt 0
    printf "Backup verified: %s (tables=%s, migrations=%s, media_files=%s)\n" \
      "$backup_id" "$table_count" "$migration_count" "$media_file_count"
  ' sh "$BACKUP_ID"
