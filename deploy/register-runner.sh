#!/usr/bin/env bash
set -euo pipefail

runner=/mnt/nvme_cache/appdata/gnocchi/runner
cd "$runner"
chmod 600 .registration-token
chown nobody:users .registration-token
su -s /bin/bash nobody -c 'cd /mnt/nvme_cache/appdata/gnocchi/runner && ./config.sh --unattended --url https://github.com/gkgkgkgk/gnocchi --token "$(cat .registration-token)" --name holocron-gnocchi --labels holocron-deploy --work _work --replace'
rm .registration-token
echo 'Runner registered'
