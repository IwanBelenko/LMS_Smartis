#!/bin/sh
set -eu

if [ "${DJANGO_DEBUG:-true}" = "false" ] && [ "${BOOTSTRAP_DEMO:-false}" = "true" ]; then
  echo "BOOTSTRAP_DEMO cannot be enabled in production" >&2
  exit 1
fi

python manage.py migrate --noinput
python manage.py collectstatic --noinput

if [ "${BOOTSTRAP_DEMO:-false}" = "true" ]; then
  python manage.py bootstrap_demo
fi

if [ -n "${INITIAL_ADMIN_EMAIL:-}" ] && [ -n "${INITIAL_ADMIN_PASSWORD:-}" ]; then
  python manage.py ensure_admin
fi

exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "${GUNICORN_WORKERS:-3}" \
  --timeout "${GUNICORN_TIMEOUT:-120}" \
  --access-logfile - \
  --error-logfile -
