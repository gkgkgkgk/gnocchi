# Gnocchi — Homelab Rebuild Plan

Living document. Ordered by phase; each phase is a shippable milestone that
leaves the app in a working state. Nothing here is committed until we hit the
phase — reorder freely.

---

## What Gnocchi is going to be

An iPad-in-the-kitchen recipe app, private to our house, running entirely on
`homeserver`. It:

- Ingests recipes from Pinterest pins, Instagram posts, arbitrary recipe
  websites, photos, and free-form AI generation.
- Presents them cleanly on iPad (kitchen counter), phones (couch / grocery
  store), and desktop web.
- Lets you (and Rebecca) modify them — swap ingredients, halve the batch,
  make it kosher, ask questions — via a Claude-powered chat panel.
- Remembers what you did with a recipe: rating, cook notes ("used less
  garlic"), photos of your version, when you last made it.
- No accounts, no cloud. Postgres and images live on `homeserver`, reachable
  over the tailnet.

---

## Design tenets (guide every decision below)

1. **One tenant, no auth.** This is a household. Any device on the tailnet
   is trusted; no logins, no per-user filtering, no OAuth flows. Anything
   that's currently gated by `user_id` becomes globally visible.
2. **Homeserver only.** No external SaaS in the runtime path. Postgres,
   image storage, and API all live on the server. External calls are
   limited to (a) Anthropic for LLM, (b) fetching source URLs the user
   pasted, (c) NTP/OS updates.
3. **One backend service.** Merge the current split (frontend → Supabase +
   frontend → llmserver) into a single FastAPI service that owns Postgres,
   images, and LLM calls. Fewer containers, fewer origins, one auth story.
4. **Deploy via the serverkepets container pipeline.** No bespoke ops. Build
   → GHCR → `podman auto-update` (documented in
   `serverkepets/documentation/deployment.md`).
5. **Declarative per-app dependencies.** An app's `apps.nix` entry names
   everything it needs — port, env, database, volumes. The registry
   provisions them on the host. Adding a second DB-using app never touches
   `shared-services.nix`; adding a new database never touches the app's
   Containerfile. One file to edit per app, always.
6. **Small, obvious code.** No architecture-astronaut layers. A recipe is
   one Postgres row plus rows for images. Ingredients live in the recipes
   JSON, not a normalized table (the current normalized approach is
   already leaking `unit_id`/`ingredient_id` complexity into the UI for
   no user-facing benefit).

---

## What's actually there today (audit)

### Stack
- **Frontend**: Expo Router (React Native + `react-native-web`), Expo 54,
  React 19. Targets iOS/Android/web from one codebase.
- **Data & auth**: Supabase (managed Postgres + storage + Google OAuth).
- **LLM backend**: FastAPI at `llmserver/`, seven endpoints, all calling
  OpenAI (`gpt-4o-mini` for text, `gpt-4o` for vision + shopping lists).
- **Scraping**: `bs4` in `scrape.py`; handles Pinterest (follows outbound
  link) and generic websites (prioritizes `.tasty-recipes` / WPRM
  containers, falls back to blocks with >20 chars).

### Feature surface (already implemented, mostly)
- Recipe CRUD; ingredient list with normalized `units` table lookup;
  optional `annotated_steps` where ingredient mentions in instructions are
  linked back to the ingredient row.
- Multi-source import: paste Pinterest URL, paste website URL, upload
  photo, type manually.
- Cookbooks (a recipe collection with ordering).
- Tags (default set of 6, user-customizable, stored in `profile_config`).
- AI "tools" — canned recipe transformations (`suggest_substitutions`,
  `scale_recipe`, `simplify_instructions`, `cooking_tips` per tests).
  Stored per-user in DB, fired on demand.
- AI insight banner: dietary-restriction analysis on view.
- Shopping list generation from a list of recipes (LLM-aggregated).
- **Meal planning is real** — full weekly grid with drag-and-drop between
  days, a "Recipe Ideas" short list, a checkbox shopping list that
  persists into the meal plan row. Not a stub.
- **Recipe view has a serving multiplier** — 0.5×–4× slider that rescales
  ingredient quantities live via `fraction-formatter.ts` (0.5 → ½).
  Nice UX; preserve through the rewrite.
- Recipe photo gallery component (multi-image, though not sure if wired
  up end-to-end).

### Bugs / rot found in the audit

Concrete stuff to fix as we go — none are urgent enough to fix before the
rewrite, they'll get killed naturally in Phase 1.

- `frontend/services/recipe-service.ts:2` imports `parseIngredient` from
  `@/utils/ingredient-parser` — that file doesn't exist. Dead import that
  survives because TS is loose and the symbol isn't used.
- `frontend/components/recipe-card.tsx:46` — leftover `console.log(props)`.
- `frontend/components/recipe-card.tsx:52` destructures
  `const { cookTime, prepTime, servings } = metadata` unconditionally; if
  `metadata` is null (older recipes, or fetches that skip enrichment) the
  card crashes the whole grid.
- `frontend/components/recipe-card.tsx:56` `parseInt(prepTime)` on a value
  the type already says is `number`. Works by coincidence.
- `Recipe` type has camelCase AND snake_case for the same field
  (`prepTime`/`prep_time`, `imageUrl`/`image_url`, `userId`/`user_id`,
  etc.) — the DB is snake_case and code randomly reaches for both. Every
  consumer becomes a compatibility layer.
- `recipe.ai_insight = { text: '__GENERATING__', ... }` mutation to
  signal a loading state is racy and leaks a magic string into the type.
- `llmserver/main.py` — every endpoint is a synchronous `def` even though
  they all block on OpenAI network calls. Should be `async def` with
  `AsyncOpenAI` / `AsyncAnthropic`. Under any load the server blocks a
  worker thread per request.
- CORS is `allow_origins=["*"]`. Fine for homelab, worth noting.
- No `/health` endpoint — the container has no way to declare itself
  healthy for `HEALTHCHECK` in the deploy pipeline.
- No `.env.example` — regenerated as part of this plan
  (`llmserver/.env.example`, `frontend/.env.example`).
- Annotation prompt uses a hand-rolled `${{raw_text, ingredient_text}}`
  syntax parsed by string matching later. Brittle; a structured
  `{original, spans: [{start, end, ingredient_id}]}` schema would round-trip
  cleanly.
- `Recipe` pydantic model requires `notes: str` (not Optional) — if the
  model omits it, the response fails validation.
- `.expo/` directory is checked into git; its own README says explicitly
  "you should not share the `.expo` folder." Gitignore + untrack.
- `frontend/components/hello-wave.tsx` — leftover from the Expo starter
  template, nothing uses it. Delete.
- Dark mode is stubbed — `hooks/use-color-scheme.ts` doesn't actually
  toggle; both platforms return the OS scheme but there's no in-app
  toggle and it's untested. `Colors.dark` in `constants/theme.ts` exists
  but the app hasn't been designed against it.
- `recipe/[id].tsx` polls the DB every N seconds while
  `ai_insight.text === '__GENERATING__'` or `annotated_steps === null`.
  Racy and wastes DB reads. SSE streaming in Phase 2 fixes this.
- `services/*.ts` are all direct `supabase.from(...)` calls — 88 sites
  across the frontend need to be replaced by `apiClient` calls in P1.
- Meal-plan screen calls `supabase.auth.getUser()` directly rather than
  going through a service. Leaky boundary that becomes moot once auth
  is gone.
- `models.py` `Recipe` model doesn't include an `id` or timestamps —
  it's only used as an LLM response schema. Fine, but worth naming so
  we don't confuse it with the DB row model in the new backend.

---

## Phased plan

Six phases, each independently shippable. Between phases the app still
works; the sequence is chosen so we're never mid-migration for long.

### Phase 0 — Groundwork (1 sitting)
Small, low-risk. Gets the repo into a state where the bigger changes are safe.

- [ ] Regenerate `llmserver/.env.example` and `frontend/.env.example`
      (done as part of this plan; user fills real values).
- [ ] Confirm `.env` is gitignored globally.
- [ ] Kill the dead `parseIngredient` import in `recipe-service.ts`.
- [ ] Add null-guard on `recipe-card.tsx` metadata destructure; remove
      debug `console.log`.
- [ ] Add `/health` to `llmserver/main.py` returning `{ok: true}`.
- [ ] Convert `llmserver` endpoints to `async def`; switch to
      `AsyncOpenAI`. (Prep for Phase 2; also unblocks concurrent
      requests.)
- [ ] `README.md` at the repo root — currently one line "# gnocchi". Give
      it a real description and dev quickstart.
- [ ] Gitignore `.expo/` and untrack it (its README literally says don't
      commit).
- [ ] Delete `frontend/components/hello-wave.tsx` (Expo starter leftover,
      unused).

**Exit state:** app works exactly as before, but the codebase isn't
embarrassing to open in an editor.

---

### Phase 1 — Homelab migration (the big one)

Goal: rip out Supabase entirely. One Postgres on the homeserver, one FastAPI
container that owns everything, zero auth, deployed via the serverkepets
container pipeline.

**1a. New backend service.** Merge `llmserver` into a proper backend called
`gnocchi-api` (rename directory). FastAPI, SQLAlchemy 2.x (async), Alembic
for migrations. Endpoints:

```
GET    /recipes                       # list, with query filters
POST   /recipes                       # create from body
GET    /recipes/{id}                  # one recipe
PATCH  /recipes/{id}                  # partial update
DELETE /recipes/{id}
POST   /recipes/{id}/photos           # multipart upload
DELETE /recipes/{id}/photos/{photo_id}
POST   /recipes/{id}/notes            # append a cook-note entry
PATCH  /recipes/{id}/rating           # set rating

GET    /cookbooks                     # list
POST   /cookbooks
GET    /cookbooks/{id}
PATCH  /cookbooks/{id}
DELETE /cookbooks/{id}

GET    /tags
PUT    /tags                          # replace tag set

# Imports — all return a Recipe payload for user review before save
POST   /import/website                # {url}
POST   /import/pinterest              # {url}
POST   /import/instagram              # {url}
POST   /import/photo                  # multipart image
POST   /import/text                   # {text} — for freeform paste

# AI — all take the current recipe, return a mutation or a text response
POST   /ai/chat                       # {recipe_id, message, history}
POST   /ai/transform                  # {recipe_id, prompt}  → new Recipe
POST   /ai/generate                   # {prompt}             → new Recipe
POST   /ai/annotate                   # {recipe_id}          → annotated steps
POST   /ai/shopping-list              # {recipe_ids}         → list

GET    /images/{key}                  # serve uploaded image
GET    /health
```

**1b. Postgres on the homeserver.** Zero manual per-app plumbing. Extend
`serverkepets/modules/app-registry.nix` (one-time change) to understand a
`db` field on `apps.nix` entries. Then `gnocchi-api`'s entry looks like:

```nix
gnocchi-api = {
  image = "ghcr.io/gkgkgkgk/gnocchi-api:latest";
  port = 8083;
  db = "gnocchi";                          # or `db = true;` to reuse the app name
  env = { ANTHROPIC_API_KEY = "..."; };
};
```

The registry, driven by `db` fields:

- Adds `services.postgresql.ensureDatabases` for each declared db.
- Adds `services.postgresql.ensureUsers` with `ensureDBOwnership = true`.
- Overrides `authentication` to `trust` on `local`, `127.0.0.1/32`, and
  `::1/128`. Containers use `--network=host`, so they reach postgres over
  loopback; nothing outside the box reaches it, so no passwords are
  needed and none exist to leak.
- Injects `DATABASE_URL=postgresql://<db>@127.0.0.1:5432/<db>` into that
  container's env.

Consequence: adding another DB-using app is one line in `apps.nix`
(`db = "foo";`). `shared-services.nix` never grows per-app entries;
neither does the app's Containerfile.

Homelab tradeoffs baked in — see [Design tenets](#design-tenets):
trust auth means no untrusted containers on this box, ever. One db per
app; extend `db` to a list only if a real use case appears.

**1c. Schema.** One migration, no normalization for ingredients/units — the
UI has been overpaying for those tables. Everything lives in a JSONB
`ingredients` array on the recipe.

```sql
CREATE TABLE recipes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  ingredients  jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{text, quantity, unit}]
  steps        text[] NOT NULL DEFAULT '{}',
  annotated_steps jsonb,                            -- [{original, spans:[...]}]
  notes        text,
  source_url   text,
  source_type  text,                                -- 'pinterest'|'website'|'instagram'|'photo'|'manual'|'ai'
  prep_time    int,
  cook_time    int,
  servings     int,
  rating       int CHECK (rating BETWEEN 1 AND 5),
  cook_history jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{date, note, rating}]
  ai_insight   jsonb,
  tags         text[] NOT NULL DEFAULT '{}',       -- tag ids
  cover_image  text,                                -- key into images/
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE recipe_images (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id  uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  key        text NOT NULL,                        -- filename in /data/images
  ord        int NOT NULL DEFAULT 0
);

CREATE TABLE cookbooks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  cover_color  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cookbook_recipes (
  cookbook_id  uuid NOT NULL REFERENCES cookbooks(id) ON DELETE CASCADE,
  recipe_id    uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ord          int NOT NULL DEFAULT 0,
  PRIMARY KEY (cookbook_id, recipe_id)
);

CREATE TABLE tags (
  id     text PRIMARY KEY,                          -- 'quick', 'kosher', ...
  name   text NOT NULL,
  color  text NOT NULL,
  icon   text NOT NULL
);
```

Full-text search index on `title` + ingredient text via a generated tsvector
column. `pg_trgm` extension for fuzzy search.

**Tradeoff acknowledged:** collapsing `ingredients`/`units` tables into a
JSON blob loses the current ingredient-picker autocomplete UX where you
select a canonical row from a shared list. In exchange we get: (a) no
join gymnastics on read, (b) LLM-extracted recipes save cleanly without
first canonicalizing every ingredient string, (c) the annotate step no
longer needs a stable ingredient ID — spans just index into the array.
If we ever want autocomplete back, it's a `SELECT DISTINCT jsonb_path`
query away.

**1d. Image storage.** Backend writes uploads to `/data/images/<uuid>.jpg`,
serves via `GET /images/<key>`. In production `/data` is the container's
bind-mounted `/var/lib/gnocchi` on the host (that's already how apps.nix
mounts state). Nothing exotic; no MinIO, no S3.

**1e. Rip out Supabase from the frontend.**
- Delete `lib/supabase.ts`, `contexts/auth-context.tsx`, `app/(auth)/`,
  `app/login-callback.tsx`, `SETUP_AUTH.md`.
- Replace every `supabase.from(...).select()` in `services/*.ts` with a
  `fetch(EXPOSED_API_URL + ...)` call. Introduce a thin `apiClient` helper
  so it's one place instead of many.
- Delete the `(auth)`-vs-`(drawer)` redirect dance in `app/_layout.tsx`.
- Drop `@supabase/supabase-js`, `expo-auth-session`, `expo-secure-store`,
  `expo-web-browser` from `package.json`.

**1f. Deploy.** Two containers already prereq'd (`5d7a74e`).
- **Prereq DONE (serverkepets `288fa8f` / `5d7a74e`):** `app-registry.nix`
  understands the `db` field; docs updated.
- `Containerfile` at repo root for the backend (`gnocchi-api`).
- `frontend/Containerfile` — Caddy image that (a) serves the
  `expo export --platform web` static bundle and (b) reverse-proxies
  `/api/*` → `127.0.0.1:8083`. Because both containers share the host
  network (`--network=host`), the proxy talks to the backend over
  loopback with no service discovery. The frontend uses **relative
  URLs** (`fetch('/api/recipes')`) — no `EXPO_PUBLIC_API_URL`
  build-time bake-in, no per-environment builds, one URL to give the
  household regardless of whether they're on LAN or tailnet.
- Two GitHub Actions workflows publishing to
  `ghcr.io/gkgkgkgk/gnocchi-api:latest` and
  `ghcr.io/gkgkgkgk/gnocchi-web:latest`.
- Two entries in `serverkepets/apps.nix`:
  - `gnocchi-api`: port 8083, `db = "gnocchi";`, `env = { ANTHROPIC_API_KEY
    = ...; };`. `DATABASE_URL` is injected by the registry, not declared
    here.
  - `gnocchi-web`: port 8080… wait, 8080 is reserved. Port **8085**,
    no `env` needed. Only URL anyone needs: `http://homeserver:8085`.

**Optional refinement:** while I'm in `app-registry.nix`, add an
`internal = true;` field that skips opening the app's port in the
firewall. Then `gnocchi-api` doesn't need to be firewall-accessible at
all — Caddy proxies to it over loopback. Keeps the attack surface tight.
Small addition, worth doing when we hit P1.

**Exit state:** app runs on homeserver, reachable via
`http://homeserver:8084` on the LAN and via tailscale off it. No Supabase.
No auth screen. Existing data isn't migrated — this is a fresh start
(there aren't many recipes yet).

---

### Phase 2 — Anthropic overhaul

Goal: better model, better prompts, better structured outputs, streaming
where it makes sense.

- Add `anthropic` to backend deps. Rewrite every LLM endpoint to
  `AsyncAnthropic`.
- Model choice per endpoint:
  - Extraction / parsing (photo, URL, text) → `claude-sonnet-4-6`
  - Chat / Q&A → `claude-sonnet-4-6`
  - Recipe transformation ("make it kosher", "half it") → `claude-sonnet-4-6`
  - Recipe generation from a pitch → `claude-opus-4-7` (worth the cost;
    used once per new recipe, not on every load)
- Structured outputs via **tool use forced to a single tool**, with the
  Recipe schema as the tool's input. Cleaner than JSON-mode string
  parsing. Same pattern for annotations.
- **Prompt caching** on the big system prompts (annotation, transformation
  guidelines). Cache TTL 5 min, hit rate should be near 100% during active
  use.
- **Streaming** for `/ai/chat` — SSE from FastAPI, React Native `fetch`
  reads chunks. Not for JSON-returning endpoints.
- Rewrite the annotate response format: instead of the `${{...}}` string,
  return `[{original, spans: [{start, end, ingredient_index}]}]`. Frontend
  renders that into clickable spans.
- Better scraping: try to parse JSON-LD `@type=Recipe` from the page first
  (many recipe sites embed it — zero-shot correct). Only fall back to LLM
  if absent or malformed.
- Rate limit / retry with exponential backoff on Anthropic 529s.

**Exit state:** every LLM call goes through Claude, prompts are cleaner,
Q&A streams to the UI.

---

### Phase 3 — UI foundation

Goal: kill the default-Expo look. Build a small, cohesive design system
before we redo screens. Playful but grown-up.

- **Palette:** warm off-white base (`#FBF7F1`), terracotta accent
  (`#E07856`), sage secondary (`#7A9B76`), ink text (`#1E1B18`). Dark mode:
  espresso base (`#1A1613`), same accents at higher saturation.
- **Typography:** Fraunces (variable serif, headers + display) + Inter
  (body + UI). Both via `expo-font` from Google Fonts. Add a `rounded`
  variant for playful moments (buttons, tag chips).
- **Component primitives:** `Button`, `Card`, `Chip`, `Input`, `Sheet`,
  `Screen` in `components/ui/`. Not a library import — hand-rolled, small.
- **Rework the `themed-*` helpers** to consume a real theme object instead
  of the current colors-only map.
- **Icons:** stick with `@expo/vector-icons` (already in), but standardize
  on Phosphor via `phosphor-react-native` for a friendlier look.
- **Wavy decoration:** keep the vibe from the current
  `wavy-decoration.tsx` but redo as a proper hand-drawn SVG divider —
  three or four variants, used in section breaks and empty states.
- **Cards:** softer shadows, generous whitespace, rating stars visible on
  hover/press, source badge (Pinterest / Instagram / Web).
- **Empty states:** illustrated (single doodle SVG each) + one warm line.
- **Dark mode:** currently stubbed (`hooks/use-color-scheme.ts` returns
  the OS scheme but nothing in the app has been designed against
  `Colors.dark`). Design the full palette across light + dark; add a
  toggle in settings.
- **Preserve:** the serving multiplier on the recipe view (0.5×–4× slider
  from `[id].tsx`) and both existing fraction/ingredient formatter utils
  (`fraction-formatter.ts` handles unicode fractions like ½; keep as-is).

**Exit state:** every existing screen looks intentionally-designed instead
of stock. No new features yet.

---

### Phase 4 — iPad & mobile-first screens

Goal: the actual devices the app runs on get first-class layouts. The
current UI is a phone layout stretched sideways on iPad.

- **Recipe detail — the crown jewel.** Three responsive modes:
  - **Phone (< 640):** hero image, sticky title bar, tabs (Recipe /
    Notes / Chat), single column, thumb-reachable primary actions.
  - **iPad landscape (>= 900):** two-pane. Ingredients pinned in a left
    column with checkboxes that survive route changes; steps in the right
    column, one big step at a time with "next step" haptic tap. Rating,
    photos, notes tucked in a right drawer.
  - **iPad kitchen mode toggle:** enters wake-lock, 1.5× font size,
    single big step, hands-free scroll after step timer.
- **Recipe list:** search bar always visible, tag filter chips, sort
  (recent / rating / cook count). Grid at 3 cols on iPad landscape, 2
  cols portrait, 1 col phone.
- **Import screens:** unified sheet — paste any URL, detect
  Pinterest/Instagram/generic, show a live preview of what we scraped
  before committing.
- **Bottom nav on phone / drawer on iPad:** the current drawer works on
  iPad but is fiddly on phone; add a mobile-appropriate bottom tabbar for
  the primary sections (Recipes, Cookbooks, Meal Plan, Settings).
- **Cook-along mode:** entered from a recipe. Full screen, one step at a
  time, wake lock on, big timer buttons per step ("start 20 min timer" if
  a step mentions minutes). Voice cue via `expo-speech` for hands-off.

**Exit state:** the app looks and feels custom-designed for kitchen iPad
+ phone in the aisle. Existing feature set intact.

---

### Phase 5 — Content features & AI depth

Goal: fill in the gaps you named — Instagram, ratings, cook notes,
photos, freeform AI chat, "pitch me a recipe."

- **Instagram import.** Fetch the public post URL server-side; extract
  caption from OG tags + JSON-LD. Send the caption to Claude with
  "extract recipe if present" tool. Reject non-recipe posts gracefully.
  Save the post's thumbnail as the cover image.
- **Ratings.** 1–5 stars on recipe detail; visible on cards; sortable in
  list.
- **Cook history / notes.** `POST /recipes/{id}/notes` appends an entry:
  `{date, note, rating?, photos?}`. Shown as a timeline on the recipe
  page ("last made 2026-01-05 — used less garlic ★★★★★"). This is
  distinct from `notes` (which is the recipe author's inline notes).
- **Multiple photos per recipe.** `recipe_images` table already spec'd.
  Drag to reorder (`react-native-draggable-flatlist` already in
  package.json). Set any one as cover.
- **AI chat panel per recipe.** Tab on recipe detail. Streams from Claude
  with the recipe as system context. "Make this kosher" / "swap sugar for
  honey" / "how do I know when the sauce is reduced enough" / "what wine
  goes with this". Common actions have quick-prompt chips at the top
  (Kosher, Vegetarian, Half batch, Double batch, Substitute ingredient,
  Explain step).
- **"Pitch me a recipe."** New entry point next to import. You describe
  what you want ("something with the chicken thighs in the fridge and
  gochujang, quick weeknight"); Opus 4.7 generates a full Recipe; you
  review + save.
- **Better tagging.** Search + filter by tags in list. Auto-suggest tags
  on save based on the recipe (via Claude, cheap sonnet call).
- **Dietary presets.** No user profile anymore, so preferences live in a
  single "House preferences" screen: dietary restrictions (kosher, dairy-
  free, etc.), household size (for default serving math). Used by the
  transform tools + the analyze banner.

**Exit state:** the app does everything you described in the ask.

---

### Phase 6 — Polish, backups, operability

Goal: safe to actually rely on. Nothing new user-facing, everything
important.

- **Nightly `pg_dump`** to `/var/lib/gnocchi/backups/YYYY-MM-DD.sql.gz`.
  Systemd timer in serverkepets. Rotate to keep 30 days.
- **Nightly image sync** (rsync-style) to a second location — external
  drive when we get one, or a second homeserver directory for now. This
  is called out in the deployment doc's invariant "not backed up until
  the backup drive exists — store nothing irreplaceable."
- **Recipe export / import.** JSON download of a recipe or the full
  library. Import to seed a fresh instance.
- **Tailscale HTTPS via `tailscale serve`.** `https://gnocchi.homeserver.
  tailXXXX.ts.net` with a real cert. Optional Funnel for guest access.
  (Funnel would let a wife's coworker share a recipe URL that resolves
  from outside the tailnet — probably unnecessary, listing for
  completeness.)
- **Shopping list rework.** Aggregated across selected recipes, editable,
  persisted (not just LLM-generated in-memory). Checkbox UI. Send-to-phone
  via a shareable URL.
- **Meal planning.** The grid, drag-and-drop, short list, and checkbox
  shopping list are already built and working. Phase 6 work here is
  polish: re-theme with the new design system, fix the racy drag on
  touch (`onLongPress` with 500ms is jittery on iOS), and hook it up to
  the P5 dietary-preset system so "generate week's shopping list"
  respects house preferences.
- **Health / logs dashboard.** Small `/status` page in the app showing
  DB size, image count, last backup, container versions. Nothing fancy.

**Exit state:** the app is a household appliance. Reliable, backed up,
recoverable, accessible from anywhere on the tailnet.

---

## Things explicitly out of scope

- Multi-user / sharing outside the household. (If you want to share a
  recipe with a friend, you can export JSON or copy-paste a link during
  a Funnel window.)
- Nutrition data / calorie tracking. Not asked for; adds an ingredient
  DB dependency (e.g. USDA); large scope creep.
- Native iOS / Android app store distribution. Expo web + PWA-adding-to-
  homescreen is enough for a household. Kept as an option if we ever want
  offline mode.
- Real-time collaboration (two devices editing the same recipe live).
- Voice-driven recipe entry ("Hey Gnocchi, add flour"). Cute; big lift;
  out of scope until basics land.

---

## Environment variables (index)

`llmserver/.env.example` and `frontend/.env.example` are checked in with
placeholder values. Fill them in a local `.env` (gitignored) for dev;
provide real values via `serverkepets/apps.nix` env for prod.

Legacy Supabase variables in the frontend example are commented — they're
only needed while Phase 0 still runs against the current stack. Deleted
in Phase 1.
