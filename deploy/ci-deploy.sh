#!/usr/bin/env bash
set -euo pipefail

sha="${1:?commit SHA required}"
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { echo "Invalid commit SHA" >&2; exit 2; }
[[ -n "${DEPLOY_SSH_KEY:-}" ]] || { echo "DEPLOY_SSH_KEY is missing" >&2; exit 2; }
[[ -n "${DEPLOY_GHCR_TOKEN:-}" ]] || { echo "DEPLOY_GHCR_TOKEN is missing" >&2; exit 2; }

keyfile="$(mktemp)"
trap 'rm -f "$keyfile"' EXIT
chmod 600 "$keyfile"
printf '%s\n' "$DEPLOY_SSH_KEY" > "$keyfile"

host='root@192.168.1.7'
project='/mnt/nvme_cache/appdata/gnocchi/deploy'
ssh_options=(-i "$keyfile" -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=deploy/known_hosts)
printf '%s' "$DEPLOY_GHCR_TOKEN" | ssh "${ssh_options[@]}" "$host" 'docker login ghcr.io -u gkgkgkgk --password-stdin' > /dev/null
ssh "${ssh_options[@]}" "$host" "mkdir -p '$project'"
scp "${ssh_options[@]}" compose.yaml deploy/host-deploy.sh "$host:$project/"
ssh "${ssh_options[@]}" "$host" "bash '$project/host-deploy.sh' '$sha'"
