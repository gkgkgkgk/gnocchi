#!/usr/bin/env python3
"""Restore a gnocchi backup produced by scripts/backup.py.

DESTRUCTIVE: this overwrites the current database and image files. Run it
deliberately, never automatically. Requires typing 'yes' unless --force.

Usage:
    python scripts/restore.py                       # restore newest backup
    python scripts/restore.py backups/gnocchi-XXXX.tar.gz
    python scripts/restore.py --force <archive>     # skip the confirmation
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(API_ROOT))

from sqlalchemy.engine import make_url  # noqa: E402

from app.config import settings  # noqa: E402
from backup import _pg_dump_env_and_args, BACKUP_DIR  # noqa: E402


def _latest_archive() -> Path:
    backups = sorted(BACKUP_DIR.glob("gnocchi-*.tar.gz"))
    if not backups:
        raise SystemExit(f"no backups found in {BACKUP_DIR}")
    return backups[-1]


def _psql_restore(sql_path: Path) -> None:
    """Pipe the dump into psql. Assumes the target database already exists."""
    env, args = _pg_dump_env_and_args()  # same connection args as pg_dump
    with sql_path.open("rb") as fh:
        proc = subprocess.run(["psql", *args], stdin=fh, env=env)
    if proc.returncode != 0:
        raise SystemExit(f"psql restore failed with exit code {proc.returncode}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", nargs="?", help="backup .tar.gz (default: newest)")
    parser.add_argument("--force", action="store_true", help="skip confirmation")
    ns = parser.parse_args()

    archive = Path(ns.archive) if ns.archive else _latest_archive()
    if not archive.exists():
        raise SystemExit(f"archive not found: {archive}")

    db = make_url(settings.sqlalchemy_url).database
    if not ns.force:
        print(f"About to OVERWRITE database '{db}' and image files from:\n  {archive}")
        if input("Type 'yes' to continue: ").strip() != "yes":
            raise SystemExit("aborted")

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        print(f"extracting {archive.name}...")
        with tarfile.open(archive, "r:gz") as tar:
            tar.extractall(tmp_path)

        sql_path = tmp_path / "db.sql"
        if not sql_path.exists():
            raise SystemExit("archive has no db.sql")
        print("restoring database...")
        _psql_restore(sql_path)

        images_src = tmp_path / "images"
        if images_src.exists():
            dest = settings.image_storage_dir
            print(f"restoring images -> {dest}...")
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(images_src, dest)

    print("restore complete.")


if __name__ == "__main__":
    main()
