# Unraid deployment

Gnocchi uses Docker Compose on Holocron. The app is served at `http://192.168.1.7:9085`; the API is available only through its `/api` proxy. The database and uploaded images persist under `/mnt/nvme_cache/appdata/gnocchi` and are never baked into an image.

## Initial server setup

Create `/mnt/nvme_cache/appdata/gnocchi/deploy/.env` from the root `.env.example`, owned by root with mode `600`. Set a long alphanumeric `POSTGRES_PASSWORD`, `GNOCCHI_DATA_DIR=/mnt/nvme_cache/appdata/gnocchi`, `GNOCCHI_BIND_IP=192.168.1.7`, and `GNOCCHI_WEB_PORT=9085`. Set `ANTHROPIC_API_KEY` only if AI features are wanted. The registry images must be accessible to Docker on the host; public GHCR packages need no registry login.

The GitHub Actions `deploy` job requires a self-hosted Linux x64 runner with label `holocron-deploy` that can reach the server over SSH. Set the repository's `DEPLOY_SSH_KEY` secret to a dedicated SSH key whose public half is authorized for deployment. The checked-in `known_hosts` pins the host key. The runner needs no Docker socket. Keep the runner on a trusted machine and restrict the `production` environment to the `main` branch.

On every push to `main`, the workflow runs lint, TypeScript, migrations, and API tests; builds two commit-tagged images; and deploys that exact commit. `host-deploy.sh` backs up Postgres and images to `/mnt/ssd_cache/gnocchi_backups` before migration and release. It rolls image references back if a release fails. Database migrations may not be backward-compatible, so keep the backup when recovering an older release.

## Recovery

To restore a database backup, stop the app, retain the current data directory, and restore a selected `gnocchi-*.dump` with `pg_restore` into a fresh `gnocchi` database. Restore the matching `gnocchi-images-*.tar.gz` into the images directory. Then set `.release.env` to the image tags that match that schema and run `docker compose --env-file .env --env-file .release.env -f compose.yaml up -d --no-build --wait`. Verify `/api/health` and a saved recipe before discarding the retained data. Test this procedure before relying on the backups.
