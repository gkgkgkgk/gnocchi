#!/usr/bin/env bash
# Forced command for the gnocchi-deploy SSH key on Holocron.
#
# Installed by hand at /mnt/nvme_cache/appdata/gnocchi/deploy/ssh-entry.sh
# (root, mode 700) and referenced from root's authorized_keys as:
#   restrict,command="/mnt/nvme_cache/appdata/gnocchi/deploy/ssh-entry.sh",from="192.168.1.7" ssh-ed25519 … gnocchi-deploy
# CI never copies this file, so a workflow change cannot widen what the key may do.
#
# The only accepted command is:  deploy <40-hex commit SHA>
# stdin must be a tar stream holding exactly compose.yaml, host-deploy.sh and
# ghcr-token (the job's short-lived GITHUB_TOKEN for pulling from GHCR).
set -euo pipefail
umask 077

log() { logger -t gnocchi-deploy "$*"; }

command="${SSH_ORIGINAL_COMMAND:-}"
if [[ ! "$command" =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
  log "rejected command: ${command:0:120}"
  echo "This key may only run: deploy <commit-sha>" >&2
  exit 2
fi
sha="${BASH_REMATCH[1]}"

project=/mnt/nvme_cache/appdata/gnocchi/deploy
stage="$(mktemp -d)"
cleanup() {
  rm -rf "$stage"
  docker logout ghcr.io >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Cap the upload at 2 MB and extract only the three expected names.
head -c 2000000 | tar -x -f - -C "$stage" --no-same-owner --no-same-permissions \
  compose.yaml host-deploy.sh ghcr-token
for name in compose.yaml host-deploy.sh ghcr-token; do
  if [[ ! -f "$stage/$name" || -L "$stage/$name" ]]; then
    echo "Upload is missing $name" >&2
    exit 2
  fi
done

docker login ghcr.io -u gkgkgkgk --password-stdin < "$stage/ghcr-token" > /dev/null
install -m 600 "$stage/compose.yaml" "$project/compose.yaml"
install -m 700 "$stage/host-deploy.sh" "$project/host-deploy.sh"

log "deploying $sha"
bash "$project/host-deploy.sh" "$sha"
