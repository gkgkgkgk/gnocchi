{
  description = "Gnocchi — homelab recipe app. Dev shell for backend (Python) + frontend (Node) + local Postgres.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        python = pkgs.python312;
      in {
        devShells.default = pkgs.mkShell {
          packages = [
            # Backend
            python
            python.pkgs.pip
            python.pkgs.virtualenv
            pkgs.uv                # fast pip; used to install requirements
            pkgs.postgresql_17     # gives us initdb, pg_ctl, psql

            # Frontend
            pkgs.nodejs_22

            # Runner
            pkgs.just
          ];

          shellHook = ''
            # pip-installed wheels (greenlet, asyncpg, etc.) are pre-compiled
            # against libstdc++/zlib. Nix's Python doesn't put those on the
            # standard search path; expose them via LD_LIBRARY_PATH.
            export LD_LIBRARY_PATH="${pkgs.stdenv.cc.cc.lib}/lib:${pkgs.zlib}/lib:''${LD_LIBRARY_PATH:-}"

            # Local Postgres cluster lives inside the repo, gitignored.
            export PGDATA="$PWD/.pg/data"
            export PGHOST="$PWD/.pg/sock"
            export PGUSER=gnocchi
            export PGDATABASE=gnocchi
            # SQLAlchemy dispatches on the `+driver` — asyncpg is what the
            # app uses. Plain `postgresql://` would try to load psycopg2.
            export DATABASE_URL="postgresql+asyncpg:///$PGDATABASE?host=$PGHOST"
            mkdir -p "$PGHOST"

            # Backend deps via uv into a repo-local venv, kept in sync each shell entry.
            if [ -f gnocchi-api/requirements.txt ]; then
              export VIRTUAL_ENV="$PWD/gnocchi-api/.venv"
              if [ ! -d "$VIRTUAL_ENV" ]; then
                echo "Creating backend venv..."
                ${pkgs.uv}/bin/uv venv "$VIRTUAL_ENV" --python ${python}/bin/python >/dev/null
              fi
              export PATH="$VIRTUAL_ENV/bin:$PATH"
            fi

            cat <<EOF

            ╭─ gnocchi dev shell ─────────────────────────────
            │ DB:     $DATABASE_URL
            │ venv:   $VIRTUAL_ENV (populated by \`just backend-install\`)
            │
            │ First time:   just setup       # init db, install deps
            │ Every day:    just db-up       # start local postgres
            │               just dev         # backend + frontend in parallel
            ╰─────────────────────────────────────────────────
            EOF
          '';
        };
      });
}
