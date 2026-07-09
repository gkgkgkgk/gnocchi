# Gnocchi

A household recipe app. Kitchen iPad, phone in the aisle, dinner on the
table. Runs on our homeserver, private to the tailnet.

Import from Pinterest, Instagram, arbitrary recipe sites, or a photo;
scale servings, ask Claude to make it kosher or half the batch, keep
notes on how each cook turned out, rate the ones we want to make again.

Currently mid-rebuild — see [`PLAN.md`](./PLAN.md) for the phased
homelab-ification plan. Phase 1 (Supabase out, Postgres on homeserver in,
one backend, no auth) is landed.

## Layout

```
gnocchi/
├── frontend/          Expo (React Native + web) — iOS, Android, web from one codebase
├── gnocchi-api/       FastAPI + SQLAlchemy async + Alembic. Postgres-backed
│                      recipes, cookbooks, meal plan, image store, LLM ops.
├── flake.nix          Dev shell (Python + Node + Postgres)
├── justfile           `just setup`, `just dev`, etc.
└── PLAN.md            Multi-phase rebuild plan.
```

## Local dev

Everything is in a Nix dev shell. First time:

```sh
nix develop         # enter the shell; installs no system-wide state
just setup          # init local postgres, install python + node deps, migrate
just dev            # backend + frontend in parallel, ctrl-C stops both
```

Then <http://localhost:8081> for the web app, <http://localhost:8001/docs> for
the API. State lives entirely inside the repo — `./.pg` for postgres,
`./gnocchi-api/.venv` for python, `./frontend/node_modules` for node. Delete
those and you're back to a clean machine.

Other useful commands:

```sh
just db-up            # start postgres if it stopped
just db-shell         # psql into the gnocchi database
just migrate          # apply new migrations
just migration "add foo"    # generate a new migration from model diffs
just backend          # run just the API (dev-reloading uvicorn)
just frontend         # run just Expo web
just db-wipe          # nuke the local cluster; requires re-`just setup`
```

Fill in an `OPENAI_API_KEY` in `gnocchi-api/.env` (`cp .env.example .env`) if
you want LLM operations to work locally. Everything else works without keys.

## Deploy

Deploys to `homeserver` via the [serverkepets container
pipeline](https://github.com/gkgkgkgk/serverkepets):

1. Push to `main` → GitHub Actions builds `ghcr.io/gkgkgkgk/gnocchi-api`
   and `ghcr.io/gkgkgkgk/gnocchi-web` (paths-scoped: backend and frontend
   have separate workflows so a touch to one doesn't rebuild the other).
2. `podman auto-update` on the server pulls the new images within a
   minute and swaps containers.
3. Postgres, image storage, and firewall are provisioned by
   `serverkepets/apps.nix` (single line for the DB, single line for the
   internal-only backend, single line for the public web container).
4. Reachable at `http://homeserver:8085` on the LAN and via tailscale
   anywhere on the tailnet.

Details in `PLAN.md` Phase 1.
