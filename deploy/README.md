# Unraid deployment

Gnocchi uses Docker Compose on Holocron. The app is served at `http://192.168.1.7:9085`; the API is available only through its `/api` proxy. The database and uploaded images persist under `/mnt/nvme_cache/appdata/gnocchi` and are never baked into an image.

## Initial server setup

Run `deploy/bootstrap-host.sh` once on Holocron. It creates `/mnt/nvme_cache/appdata/gnocchi/deploy/.env`, owned by root with mode `600`, and generates a database password. Set `ANTHROPIC_API_KEY` there only if AI features are wanted. The pipeline logs Docker into GHCR with its short-lived repository token before each pull; the images can remain private.

The GitHub Actions `deploy` job uses the Linux x64 runner registered on Holocron with label `holocron-deploy`. `start-runner.sh` starts it as `nobody`; `enable-runner-on-unraid.sh` adds its start command to Unraid's `/boot/config/go` (after backing that file up). The repository's `DEPLOY_SSH_KEY` secret is a dedicated SSH key whose public half is authorized for deployment. The checked-in `known_hosts` pins the host key. The runner needs no Docker socket. Keep the runner on a trusted machine and restrict the `production` environment to the `main` branch.

On every push to `main`, the workflow runs lint, TypeScript, migrations, and API tests; builds two commit-tagged images; and deploys that exact commit. `host-deploy.sh` backs up Postgres and images to `/mnt/ssd_cache/gnocchi_backups` before migration and release. It rolls image references back if a release fails. Database migrations may not be backward-compatible, so keep the backup when recovering an older release.

## Recovery

To restore a database backup, stop the app, retain the current data directory, and restore a selected `gnocchi-*.dump` with `pg_restore` into a fresh `gnocchi` database. Restore the matching `gnocchi-images-*.tar.gz` into the images directory. Then set `.release.env` to the image tags that match that schema and run `docker compose --env-file .env --env-file .release.env -f compose.yaml up -d --no-build --wait`. Verify `/api/health` and a saved recipe before discarding the retained data. Test this procedure before relying on the backups.

## Deploy key restrictions and approval

The `gnocchi-deploy` public key in Holocron's root `authorized_keys` (live in `/root/.ssh`, persisted in `/boot/config/ssh/root`) is restricted:

```text
restrict,command="/mnt/nvme_cache/appdata/gnocchi/deploy/ssh-entry.sh",from="192.168.1.7" ssh-ed25519 … gnocchi-deploy
```

`deploy/ssh-entry.sh` is a forced command installed **by hand** on the server (root, mode 700). CI never copies it. It accepts only `deploy <40-hex sha>`, reads `compose.yaml`, `host-deploy.sh` and the job's short-lived GHCR token from a tar stream on stdin (capped at 2 MB), installs the two files, logs in to GHCR, runs `host-deploy.sh`, and logs out. Anything else is refused and logged to syslog as `gnocchi-deploy`. If you change `ssh-entry.sh`, copy it to the server yourself.

Because `compose.yaml` and `host-deploy.sh` still come from the repo and run as root, the main protection is the GitHub `production` environment: it requires the owner's approval before the deploy job runs, and only `main` may deploy. Third-party actions are pinned to commit SHAs.

The runner starts at boot from `/boot/config/go` and logs to `/var/log/gnocchi-runner.log` (RAM-backed, so it resets on reboot). The boot line waits up to an hour for the NVMe pool to mount, because `start-runner.sh` itself lives on that pool; `enable-runner-on-unraid.sh` writes or replaces it.
