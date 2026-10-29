#!/usr/bin/env bash
set -euo pipefail

runner=/mnt/nvme_cache/appdata/gnocchi/runner
start=/mnt/nvme_cache/appdata/gnocchi/deploy/start-runner.sh
chmod 700 "$start"
cp -p /boot/config/go "/boot/config/go.before-gnocchi-$(date +%Y%m%d%H%M%S)"
# start-runner.sh lives on the NVMe pool, which mounts after `go` runs, so
# the boot line itself waits (up to an hour) for the script to appear.
line="nohup bash -c 'for _ in \$(seq 720); do [ -x $start ] && exec $start; sleep 5; done; echo NVMe pool never mounted >&2' > /var/log/gnocchi-runner.log 2>&1 < /dev/null &"
grep -Fv "$start" /boot/config/go > /boot/config/go.new || true
printf '%s\n' "$line" >> /boot/config/go.new
mv /boot/config/go.new /boot/config/go
nohup "$start" > "$runner/service.log" 2>&1 < /dev/null &
echo 'Gnocchi runner started and configured to start at boot'
