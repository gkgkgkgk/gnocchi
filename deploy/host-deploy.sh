#!/usr/bin/env bash
set -euo pipefail

sha="${1:?commit SHA required}"
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { echo "Invalid commit SHA" >&2; exit 2; }
cd /mnt/nvme_cache/appdata/gnocchi/deploy
[[ -f .env ]] || { echo "Create the root-only deploy/.env before the first release" >&2; exit 2; }
exec 9>.deploy.lock
flock -x 9

# The runtime file stays on Holocron. It must use URL-safe password characters.
set -a
source .env
set +a
: "${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD}"
: "${GNOCCHI_DATA_DIR:?Set GNOCCHI_DATA_DIR}"
[[ "$GNOCCHI_DATA_DIR" = /mnt/nvme_cache/appdata/gnocchi ]] || { echo "Unexpected data directory" >&2; exit 2; }

compose() { docker compose --env-file .env --env-file .release.env -f compose.yaml "$@"; }
previous=""
if [[ -f .release.env ]]; then
  previous="$(cat .release.env)"
fi
owner='gkgkgkgk'
printf 'GNOCCHI_API_IMAGE=ghcr.io/%s/gnocchi-api:%s\nGNOCCHI_WEB_IMAGE=ghcr.io/%s/gnocchi-web:%s\n' "$owner" "$sha" "$owner" "$sha" > .release.env

rollback() {
  echo "Release failed; restoring previous image references" >&2
  if [[ -n "$previous" ]]; then
    printf '%s\n' "$previous" > .release.env
    compose up -d --no-build --wait --wait-timeout 120 || true
  fi
  exit 1
}

compose up -d --no-build --wait --wait-timeout 120 db || rollback
backup_dir="${GNOCCHI_BACKUP_DIR:-/mnt/ssd_cache/gnocchi_backups}"
mkdir -p "$backup_dir"
stamp="$(date -u +%Y%m%d-%H%M%S)"
compose exec -T db pg_dump -U gnocchi -d gnocchi -Fc > "$backup_dir/gnocchi-$stamp.dump" || rollback
if [[ -d "$GNOCCHI_DATA_DIR/images" ]]; then
  tar -czf "$backup_dir/gnocchi-images-$stamp.tar.gz" -C "$GNOCCHI_DATA_DIR/images" . || rollback
fi

compose pull api web || rollback
compose run --rm --no-deps api alembic upgrade head || rollback
compose up -d --no-build --wait --wait-timeout 120 || rollback
curl --fail --silent --show-error --max-time 10 "http://${GNOCCHI_BIND_IP:-192.168.1.7}:${GNOCCHI_WEB_PORT:-9085}/api/health" > /dev/null || rollback
printf '%s\n' "$sha" > .current-release
echo "Gnocchi release $sha is healthy"
