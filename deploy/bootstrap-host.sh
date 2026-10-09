#!/usr/bin/env bash
set -euo pipefail

project=/mnt/nvme_cache/appdata/gnocchi
install -d -m 700 "$project/deploy" /mnt/ssd_cache/gnocchi_backups
if [[ ! -f "$project/deploy/.env" ]]; then
  umask 077
  password="$(openssl rand -hex 32)"
  printf 'POSTGRES_PASSWORD=%s\nGNOCCHI_DATA_DIR=%s\nGNOCCHI_BIND_IP=192.168.1.7\nGNOCCHI_WEB_PORT=9085\nANTHROPIC_API_KEY=\n' "$password" "$project" > "$project/deploy/.env"
fi
chmod 600 "$project/deploy/.env"
echo "Gnocchi data and deploy configuration are ready"
