#!/usr/bin/env bash
set -Eeuo pipefail

: "${REVISION:?REVISION is required}"
: "${RELEASE_TAG:?RELEASE_TAG is required}"

app_root=/opt/smartis
releases_root=/opt/smartis-releases
release_dir="$releases_root/$REVISION"
release_tmp="$release_dir.tmp.$$"
current_link="$releases_root/current"
archive="/tmp/smartis-$REVISION.tar.gz"
previous_target=""

test -f "$app_root/.env"
test -f "$archive"
test "$(df --output=pcent / | tail -1 | tr -dc '0-9')" -lt 90

if [ -L "$current_link" ]; then
  previous_target="$(readlink -f "$current_link")"
elif [ -f "$app_root/compose.yaml" ]; then
  previous_target="$app_root"
fi

install -d -m 0750 "$releases_root"
if [ -d "$release_dir" ]; then
  test "$(cat "$release_dir/.release-revision")" = "$REVISION"
else
  install -d -m 0750 "$release_tmp"
  tar -xzf "$archive" -C "$release_tmp"
  printf '%s\n' "$REVISION" > "$release_tmp/.release-revision"
  mv "$release_tmp" "$release_dir"
fi
rm -f "$archive"

compose() {
  docker compose --project-name smartis-lms --env-file "$app_root/.env" \
    --file "$release_dir/compose.yaml" "$@"
}

compose config --quiet
compose pull db proxy
compose build api
compose build web
compose up --detach --no-build db

backup_output="$(compose --profile maintenance run --rm backup)"
printf '%s\n' "$backup_output"
backup_path="$(printf '%s\n' "$backup_output" | sed -n 's/^Backup created: //p' | tail -1)"
backup_id="$(basename "$backup_path")"
test -n "$backup_id"
test -s "/opt/smartis-backups/$backup_id/database.dump"
test -s "/opt/smartis-backups/$backup_id/media.tar.gz"

ln -sfn "$release_dir" "$current_link"

rollback_code() {
  status=$?
  if [ "$status" -ne 0 ] && [ -n "$previous_target" ]; then
    echo "Deployment failed; rebuilding the previous application release." >&2
    ln -sfn "$previous_target" "$current_link"
    docker compose --project-name smartis-lms --env-file "$app_root/.env" \
      --file "$previous_target/compose.yaml" build api web || true
    docker compose --project-name smartis-lms --env-file "$app_root/.env" \
      --file "$previous_target/compose.yaml" up --detach --no-build api web proxy || true
  fi
  exit "$status"
}
trap rollback_code EXIT

compose up --detach --no-build api web proxy
attempt=0
until compose exec -T api python -c "import urllib.request; r = urllib.request.Request('http://127.0.0.1:8000/api/v1/health/', headers={'Host':'api','X-Forwarded-Proto':'https'}); urllib.request.urlopen(r, timeout=5)"; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 24 ]; then
    compose ps --all
    compose logs --no-color --tail 80 api db
    exit 1
  fi
  sleep 5
done

curl --fail --silent --show-error --retry 12 --retry-all-errors --retry-delay 5 \
  --connect-timeout 10 --max-time 30 \
  https://lms.89.108.88.157.sslip.io/api/v1/health/ >/dev/null
curl --fail --silent --show-error --retry 12 --retry-all-errors --retry-delay 5 \
  --connect-timeout 10 --max-time 30 \
  https://lms.89.108.88.157.sslip.io/ >/dev/null

printf '%s %s\n' "$REVISION" "$RELEASE_TAG" > "$releases_root/.deployed-revision"
compose ps
df -h /
trap - EXIT
