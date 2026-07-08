# Gnocchi

A household recipe app. Kitchen iPad, phone in the aisle, dinner on the
table. Runs on our homeserver, private to the tailnet.

Import from Pinterest, Instagram, arbitrary recipe sites, or a photo;
scale servings, ask Claude to make it kosher or half the batch, keep
notes on how each cook turned out, rate the ones we want to make again.

Currently mid-rebuild — see [`PLAN.md`](./PLAN.md) for the phased
homelab-ification plan (Supabase out, Postgres-on-homeserver in;
OpenAI out, Anthropic in; kitchen-first UI).

## Layout

```
gnocchi/
├── frontend/          Expo (React Native + web). One codebase → iOS, Android, web.
├── llmserver/         FastAPI. Recipe extraction, AI transformations, shopping lists.
└── PLAN.md            Multi-phase rebuild plan.
```

`llmserver/` will merge into a single `gnocchi-api/` backend during
Phase 1 of the rebuild; today it's still a separate service that the
frontend calls alongside Supabase.

## Local dev

### Backend (`llmserver/`)

```sh
cd llmserver
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # fill in OPENAI_API_KEY at minimum
uvicorn main:app --reload --port 8001
```

Smoke test: `curl http://localhost:8001/health` → `{"ok":true}`.

### Frontend (`frontend/`)

```sh
cd frontend
npm install
cp .env.example .env    # fill in Supabase creds (Phase 1 removes this)
npm run web             # or ios / android
```

The web build hot-reloads at <http://localhost:8081>.

## Deploy (target state, post-rebuild)

Deploys to `homeserver` via the [serverkepets container
pipeline](https://github.com/gkgkgkgk/serverkepets):

1. Push to `main` → GitHub Actions builds `ghcr.io/gkgkgkgk/gnocchi-api`
   and `ghcr.io/gkgkgkgk/gnocchi-web`.
2. `podman auto-update` on the server pulls the new images within a
   minute and swaps containers.
3. Reachable at `http://homeserver:8085` on the LAN and via tailscale
   from anywhere on the tailnet.

Details in `PLAN.md` Phase 1.
