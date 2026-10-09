# Gnocchi

A simple household recipe book for creating, importing, and adapting recipes. Recipes and photos live in Postgres and local storage; the optional AI features can suggest changes and save them as linked variations.

## Local preview

Enter the Nix shell, then run the one-time setup and the development servers:

```sh
nix develop
just setup
just dev
```

Open <http://localhost:8081>. The API runs at <http://localhost:8001> and exposes interactive docs at `/docs`. The local database lives in `.pg`; images live in `gnocchi-api/.data`. Recipe management works without an AI key. Set `ANTHROPIC_API_KEY` in `gnocchi-api/.env` to enable AI operations.

If you run the API and Expo separately, use `just backend` and `just frontend`. Keep `frontend/node_modules` inside the checkout; linking it from another checkout makes Expo generate an invalid JavaScript bundle URL.

## Deployment

`compose.yaml` runs three services: Postgres, the API, and a Caddy web server. The web server proxies `/api/*` to the API, so browser requests use one origin. Persistent database and image files live under `GNOCCHI_DATA_DIR` outside the containers. Each image is a normal app image, not a bundled 20 GB copy of all dependencies and data.

GitHub Actions checks code, builds API and web images for each `main` commit, then calls the Unraid deployment script using a self-hosted runner. That script backs up the database and images, applies migrations, switches both app images to the exact commit, and checks health. See [deploy/README.md](deploy/README.md) for setup, release, and recovery details.

## Recipe agent

`gnocchi-mcp/` provides local MCP tools to find, read, save, correct, and branch recipes through the same API used by the app. The [Gnocchi recipes skill](.agents/skills/gnocchi-recipes/SKILL.md) tells an agent when to save a variation versus correct the same recipe. See [gnocchi-mcp/README.md](gnocchi-mcp/README.md) for setup.

`PLAN.md` records the earlier rebuild work and historical audit; this README describes the current app.
