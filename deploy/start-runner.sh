#!/usr/bin/env bash
set -euo pipefail

runner=/mnt/nvme_cache/appdata/gnocchi/runner
for _ in {1..120}; do
  [[ -x "$runner/run.sh" ]] && break
  sleep 5
done
[[ -x "$runner/run.sh" ]] || { echo 'Gnocchi runner storage unavailable' >&2; exit 1; }
exec 9>"$runner/.service.lock"
flock -n 9 || exit 0
cd "$runner"
exec su -s /bin/bash nobody -c './run.sh'
