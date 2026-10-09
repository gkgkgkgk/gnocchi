# Unraid deployment

Gnocchi uses Docker Compose on Holocron. The app is served at `http://192.168.1.7:9085`; the API is available only through its `/api` proxy. The database and uploaded images persist under `/mnt/nvme_cache/appdata/gnocchi` and are never baked into an image.

## Initial server setup

Run `deploy/bootstrap-host.sh` once on Holocron. It creates `/mnt/nvme_cache/appdata/gnocchi/deploy/.env`, owned by root with mode `600`, and generates a database password. Set `ANTHROPIC_API_KEY` there only if AI features are wanted. The pipeline logs Docker into GHCR with its short-lived repository token before each pull; the images can remain private.

The GitHub Actions `deploy` job uses the Linux x64 runner registered on Holocron with label `holocron-deploy`. `start-runner.sh` starts it as `nobody`; `enable-runner-on-unraid.sh` adds its start command to Unraid's `/boot/config/go` (after backing that file up). The repository's `DEPLOY_SSH_KEY` secret is a dedicated SSH key whose public half is authorized for deployment. The checked-in `known_hosts` pins the host key. The runner needs no Docker socket. Keep the runner on a trusted machine and restrict the `production` environment to the `main` branch.

On every push to `main`, the workflow runs lint, TypeScript, migrations, and API tests; builds two commit-tagged images; and deploys that exact commit. `host-deploy.sh` backs up Postgres and images to `/mnt/ssd_cache/gnocchi_backups` before migration and release. It rolls image references back if a release fails. Database migrations may not be backward-compatible, so keep the backup when recovering an older release.

## Recovery

To restore a database backup, stop the app, retain the current data directory, and restore a selected `gnocchi-*.dump` with `pg_restore` into a fresh `gnocchi` database. Restore the matching `gnocchi-images-*.tar.gz` into the images directory. Then set `.release.env` to the image tags that match that schema and run `docker compose --env-file .env --env-file .release.env -f compose.yaml up -d --no-build --wait`. Verify `/api/health` and a saved recipe before discarding the retained data. Test this procedure before relying on the backups.
