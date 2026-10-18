#!/usr/bin/env bash
set -euo pipefail

sha="${1:?commit SHA required}"
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { echo "Invalid commit SHA" >&2; exit 2; }
[[ -n "${DEPLOY_SSH_KEY:-}" ]] || { echo "DEPLOY_SSH_KEY is missing" >&2; exit 2; }
[[ -n "${DEPLOY_GHCR_TOKEN:-}" ]] || { echo "DEPLOY_GHCR_TOKEN is missing" >&2; exit 2; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
chmod 700 "$work"
keyfile="$work/key"
( umask 077; printf '%s\n' "$DEPLOY_SSH_KEY" > "$keyfile" )

# The deploy key is restricted on Holocron to deploy/ssh-entry.sh, which only
# accepts "deploy <sha>" and reads these three files from a tar stream on stdin.
mkdir "$work/upload"
cp compose.yaml deploy/host-deploy.sh "$work/upload/"
( umask 077; printf '%s' "$DEPLOY_GHCR_TOKEN" > "$work/upload/ghcr-token" )

host='root@192.168.1.7'
ssh_options=(-i "$keyfile" -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=deploy/known_hosts)
tar -cf - -C "$work/upload" compose.yaml host-deploy.sh ghcr-token | ssh "${ssh_options[@]}" "$host" "deploy $sha"
