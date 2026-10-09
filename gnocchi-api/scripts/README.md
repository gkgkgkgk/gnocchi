# Backup & restore

Local, manual backups of the gnocchi Postgres DB **and** the on-disk image
store. No cloud target yet — one day point rsync/rclone at `backups/` to ship
archives off-box (backup drive, object storage).

## Back up

```sh
cd gnocchi-api
python scripts/backup.py
```

Writes `backups/gnocchi-<UTC-timestamp>.tar.gz` containing `db.sql`
(a `pg_dump --clean --if-exists`) and the `images/` directory. Keeps the 14
most-recent backups.

Env overrides: `BACKUP_DIR` (where to write), `KEEP` (how many to retain).

Automate with cron, e.g. daily at 03:00:

```
0 3 * * * cd /path/to/gnocchi/gnocchi-api && python scripts/backup.py >> backups/backup.log 2>&1
```

## Restore (DESTRUCTIVE)

Overwrites the current database and image files. Do this deliberately.

```sh
cd gnocchi-api
python scripts/restore.py                 # newest backup
python scripts/restore.py backups/gnocchi-<stamp>.tar.gz
```

Both scripts read the connection string from `app.config.settings`
(`DATABASE_URL`), so they follow whatever the API uses.
