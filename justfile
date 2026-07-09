# Gnocchi dev commands. Enter the shell with `nix develop`, then run these.
# Environment variables (PGDATA, PGHOST, DATABASE_URL, etc.) come from flake.nix.

# Default target: list available recipes.
default:
    @just --list

# One-command initial setup: init db, install deps, migrate. Idempotent.
setup: db-init backend-install migrate frontend-install

# --- Local Postgres cluster (state in ./.pg, gitignored) -----------------

# Create the cluster + gnocchi user + gnocchi database. Safe to re-run.
db-init:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f "$PGDATA/PG_VERSION" ]; then
        echo "Initializing postgres cluster at $PGDATA..."
        initdb -D "$PGDATA" --auth=trust --username=postgres --no-locale --encoding=UTF8 -A trust
    fi
    just _db-start-bg
    # Wait until socket is ready.
    for _ in {1..20}; do
        psql -h "$PGHOST" -U postgres -c 'select 1' postgres >/dev/null 2>&1 && break
        sleep 0.2
    done
    psql -h "$PGHOST" -U postgres -c "create role gnocchi login" postgres 2>/dev/null || true
    psql -h "$PGHOST" -U postgres -c "create database gnocchi owner gnocchi" postgres 2>/dev/null || true
    echo "DB ready at $DATABASE_URL"

# Start postgres. Auto-inits the cluster the first time.
db-up:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f "$PGDATA/PG_VERSION" ]; then
        just db-init
    else
        just _db-start-bg
        echo "postgres listening on socket $PGHOST"
    fi

# Stop postgres. Data persists in ./.pg.
db-down:
    pg_ctl -D "$PGDATA" -m fast stop

# Connect a psql session (uses PGHOST/PGDATABASE from the shell).
db-shell:
    psql

# Nuke the whole local cluster. Requires re-init.
db-wipe:
    -pg_ctl -D "$PGDATA" -m immediate stop 2>/dev/null
    rm -rf "$PGDATA"
    @echo "Wiped $PGDATA. Run \`just db-init\` to recreate."

_db-start-bg:
    #!/usr/bin/env bash
    set -euo pipefail
    if pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
        exit 0
    fi
    pg_ctl -D "$PGDATA" \
        -l "$PGDATA/postgres.log" \
        -o "-k $PGHOST -h '' -p 5432" \
        start

# --- Backend --------------------------------------------------------------

backend-install:
    cd gnocchi-api && uv pip install -r requirements.txt

migrate:
    cd gnocchi-api && alembic upgrade head

migration name:
    cd gnocchi-api && alembic revision --autogenerate -m "{{name}}"

backend:
    cd gnocchi-api && uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# --- Frontend -------------------------------------------------------------

frontend-install:
    cd frontend && npm install

frontend:
    cd frontend && npm run web

# --- Everything at once ---------------------------------------------------

# Runs backend + frontend in parallel. Ctrl-C stops both.
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    just db-up >/dev/null
    trap 'kill 0' EXIT
    just backend  &
    just frontend &
    wait
