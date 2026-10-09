#!/usr/bin/env bash
set -euo pipefail

runner=/mnt/nvme_cache/appdata/gnocchi/runner
start=/mnt/nvme_cache/appdata/gnocchi/deploy/start-runner.sh
chmod 700 "$start"
cp -p /boot/config/go /boot/config/go.before-gnocchi-20261009
if ! grep -Fq "$start" /boot/config/go; then
  printf '\nnohup %s > %s/service.log 2>&1 < /dev/null &\n' "$start" "$runner" >> /boot/config/go
fi
nohup "$start" > "$runner/service.log" 2>&1 < /dev/null &
echo 'Gnocchi runner started and configured to start at boot'
