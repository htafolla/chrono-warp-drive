# Weekly Redis backup

This job exports Redis and uploads the archive to a private S3-compatible Railway bucket. It is a separate Railway cron service built from this GitHub repository. It does not start the MCP app.

ONE real run against Railway will be added before this is called a backup. Until that run is recorded, this is the job definition only.

The export contains user proposal text. The bucket must stay private. Do not commit an export, do not make the bucket public, and do not log object bodies.

## Schedule

Cron expression: `0 9 * * 3`

That is Wednesday at 09:00 UTC.

09:00 UTC is 4 AM Central Time until November 1, and 3 AM Central Time after. In 2026, US daylight saving ends on November 1 (the first Sunday of November): Central Daylight Time is UTC−5, so 09:00 UTC is 4 AM CT; after the clocks fall back, Central Standard Time is UTC−6, so 09:00 UTC is 3 AM CT. The same split happens each year at the fall-back.

## What it does

`bin/redis-weekly-backup.mjs` is read-only against Redis.

1. It reads `REDIS_URL` and the bucket settings from the environment. It does not write those values to logs, including when a command fails.
2. It prefers `redis-cli --rdb`. That opens a replication stream (`PSYNC` / `SYNC`) and saves the RDB locally. It does not modify keys. The script does not call `BGSAVE` or `SAVE`. `BGSAVE` forks the server and writes a snapshot on the Redis host; this job does not need that, and a managed Redis often refuses it.
3. If Redis refuses `SYNC` / `PSYNC`, it falls back to `SCAN`, then `TYPE`, `TTL`, and `DUMP` for every key. Those are read commands. The fallback is not one point-in-time snapshot: each `DUMP` is atomic for that key, and keys can change while the scan is running. A key that disappears mid-scan is skipped. The JSON object has `key`, `type`, `ttl` (seconds, `-1` when the key has no expiry), and `dump` (base64 `DUMP` payload).
4. It gzips the RDB or the JSON and uploads it to:

   `chrono-redis/YYYY-MM-DDTHHMMSSZ.rdb.gz`

   or

   `chrono-redis/YYYY-MM-DDTHHMMSSZ.json.gz`

5. It uploads a sha256 sidecar next to that object: the same key plus `.sha256`. The digest is the sha256 of the gzip bytes (the object that was uploaded), in `sha256sum` form.
6. It keeps the 13 newest backup archives under `chrono-redis/` and the sidecar for each kept archive. Older archives and their sidecars under that prefix are deleted. Objects outside `chrono-redis/` are not deleted. Objects under that prefix that are not these weekly archives are left in place.
7. Any failure exits non-zero. The Railway service restart policy is `NEVER`, so a failed run does not loop. The process exits when the upload finishes. It does not listen for HTTP.

The allowed Redis commands in the fallback client are `AUTH`, `SELECT`, `PING`, `QUIT`, `SCAN`, `TYPE`, `TTL`, and `DUMP`. `redis-cli --rdb` is the only path that uses replication.

## Railway service

Create a **new** service from `htafolla/chrono-warp-drive`. Do not attach this config to the MCP service.

| Setting | Value |
| --- | --- |
| Root directory | `/` (repository root) |
| Config file | `/services/redis-weekly-backup/railway.json` |
| Builder | Dockerfile `services/redis-weekly-backup/Dockerfile` |
| Start command | `node bin/redis-weekly-backup.mjs` |
| Cron schedule | `0 9 * * 3` |
| Restart policy | `NEVER` |

The config file lives beside the Dockerfile, not at the repo root and not in `mcp/`. The MCP service keeps `mcp/railway.toml`. The image copies only the backup script and installs `redis-cli`. It does not contain the MCP server.

`railway.json` is Config as Code. Railway no longer lets a brand-new service opt into Config as Code, and existing Config as Code files stop being read on 2026-12-01. If the dashboard will not attach this file, set the same builder, Dockerfile path, start command, cron schedule, and restart policy on the new service. Do not add a project-wide `.railway/railway.ts` that lists only this service: a full project file treats omitted resources as deletions.

There is no hand upload. The service builds from the GitHub repo.

Share `REDIS_URL` from the Redis plugin and the bucket credential variables onto this service. Do not start a web process.

## Environment variables

The script requires these names. Values are not written here and are not logged.

| Name | Role |
| --- | --- |
| `REDIS_URL` | Redis connection URL (`redis:` or `rediss:`) |
| `BUCKET` | S3 bucket name |
| `ACCESS_KEY_ID` | S3 access key id |
| `SECRET_ACCESS_KEY` | S3 secret access key |
| `ENDPOINT` | S3 API origin, such as the base host from the bucket credentials tab |
| `REGION` | S3 region (`auto` on current Railway buckets) |

Uploads use virtual-hosted URLs: the bucket name is the subdomain of `ENDPOINT`. The client does not set a public ACL.

## Retention

13-copy retention. Each copy is one gzip archive plus its `.sha256` sidecar. After a successful upload the job sorts archive keys under `chrono-redis/` (the timestamp in the name sorts chronologically) and deletes every archive older than the newest 13, plus the sidecars for those deleted archives. The archive just written is kept even if the clock is behind the existing names. Nothing outside the prefix is removed.

Thirteen weekly copies is about one quarter.

## Restore

Keep the bucket private while you do this. The bytes include user proposal text.

1. Download one `chrono-redis/<stamp>.<ext>.gz` and its `.sha256` sidecar.
2. Check the gzip bytes. The sidecar is `sha256sum` format (`<hex>  <key>`). `sha256sum` of the downloaded `.gz` must match the hex.
3. `gunzip` the object.
4. RDB (`.rdb`): Railway Redis will not let you replace its on-disk `dump.rdb`. Start a local Redis on the file (`redis-server --dbfilename dump.rdb --dir <directory>`), inspect it, then copy keys into the target with `DUMP` locally and `RESTORE` remotely. `RESTORE` writes; run it only against the Redis you mean to fill.
5. JSON (`.json`): for each entry, base64-decode `dump`. `RESTORE <key> <ttl-ms> <payload> REPLACE` loads it. `ttl` of `-1` means no expiry, so the `RESTORE` ttl is `0`. A positive `ttl` is seconds; `RESTORE` wants milliseconds (`ttl * 1000`). Skip a `ttl` of `-2`. `REPLACE` overwrites the key.

A failed run is not a restore point. Do not treat this document as proof that a backup exists until one real Railway run has been appended.
