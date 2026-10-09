#!/usr/bin/env python3
"""Back up the gnocchi Postgres database + image files to a local directory.

Produces one timestamped, gzip-compressed archive per run under BACKUP_DIR
(default: gnocchi-api/backups). Each archive contains:
  - db.sql       -> pg_dump of the whole database (schema + data)
  - images/      -> the on-disk image store (config.image_storage_dir)

Restore with scripts/restore.py. One day the archive can be shipped off-box
(a backup drive, object storage) by pointing rsync/rclone at BACKUP_DIR.

Usage:
    python scripts/backup.py            # write a new backup, prune old ones
    BACKUP_DIR=/mnt/drive python scripts/backup.py
    KEEP=30 python scripts/backup.py    # keep the 30 most-recent backups
"""

from __future__ import annotations

import os
import subprocess
import sys
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path

# Make `app` importable whether run from repo root or gnocchi-api/.
API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(API_ROOT))

from sqlalchemy.engine import make_url  # noqa: E402

from app.config import settings  # noqa: E402

BACKUP_DIR = Path(os.environ.get("BACKUP_DIR", API_ROOT / "backups"))
KEEP = int(os.environ.get("KEEP", "14"))


def _pg_dump_env_and_args() -> tuple[dict[str, str], list[str]]:
    """Translate the SQLAlchemy URL into pg_dump connection args + env.

    Uses PGPASSWORD rather than putting the password on the command line so
    it doesn't leak into the process list.
    """
    url = make_url(settings.sqlalchemy_url)
    env = dict(os.environ)
    args: list[str] = []
    if url.username:
        args += ["-U", url.username]
    if url.password:
        env["PGPASSWORD"] = url.password
    # host may be a real host or a unix socket dir (?host=/tmp).
    host = url.host or url.query.get("host")
    if isinstance(host, (tuple, list)):
        host = host[0] if host else None
    if host:
        args += ["-h", str(host)]
    if url.port:
        args += ["-p", str(url.port)]
    if not url.database:
        raise SystemExit("DATABASE_URL has no database name; cannot back up.")
    args += ["-d", url.database]
    return env, args


def _run_pg_dump(dest: Path) -> None:
    env, args = _pg_dump_env_and_args()
    # --clean --if-exists so restoring over an existing DB drops old objects
    # first instead of failing on "already exists".
    with dest.open("wb") as fh:
        proc = subprocess.run(["pg_dump", "--clean", "--if-exists", *args], stdout=fh, env=env)
    if proc.returncode != 0:
        raise SystemExit(f"pg_dump failed with exit code {proc.returncode}")


def _prune(keep: int) -> None:
    backups = sorted(BACKUP_DIR.glob("gnocchi-*.tar.gz"))
    for old in backups[:-keep] if keep > 0 else []:
        old.unlink()
        print(f"pruned old backup: {old.name}")


def main() -> None:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    archive = BACKUP_DIR / f"gnocchi-{stamp}.tar.gz"

    with tempfile.TemporaryDirectory() as tmp:
        sql_path = Path(tmp) / "db.sql"
        print("dumping database...")
        _run_pg_dump(sql_path)

        print(f"writing archive {archive.name}...")
        with tarfile.open(archive, "w:gz") as tar:
            tar.add(sql_path, arcname="db.sql")
            images = settings.image_storage_dir
            if images.exists():
                tar.add(images, arcname="images")
            else:
                print(f"note: image dir {images} missing, skipping")

    size_mb = archive.stat().st_size / 1e6
    print(f"done: {archive} ({size_mb:.1f} MB)")
    _prune(KEEP)


if __name__ == "__main__":
    main()
