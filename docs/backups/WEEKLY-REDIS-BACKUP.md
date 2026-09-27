# Weekly Redis backup

This job takes a point-in-time Redis RDB and uploads it to a private S3-compatible Railway bucket. It is a separate Railway cron service built from this GitHub repository. It does not start the MCP app.

A copy counts as a backup only after one run inside the Railway service shows a dated object, a matching sha256, and a restore into scratch Redis. Until that run is recorded, this is the job definition only.

The export contains user proposal text. The bucket must stay private. Do not commit an export, do not make the bucket public, and do not log object bodies.

## Schedule

Cron expression: `0 9 * * 3`

That is Wednesday at 09:00 UTC.

09:00 UTC is 4 AM Central Time until November 1, and 3 AM Central Time after. In 2026, US daylight saving ends on November 1 (the first Sunday of November): Central Daylight Time is UTC−5, so 09:00 UTC is 4 AM CT; after the clocks fall back, Central Standard Time is UTC−6, so 09:00 UTC is 3 AM CT. The same split happens each year at the fall-back.

## What it does

`bin/redis-weekly-backup.mjs` talks to Redis only through `redis-cli --rdb`.

1. It reads `REDIS_URL` and the bucket settings from the environment. It does not write those values to logs, including when a command fails.
2. It runs `redis-cli --version` and logs that line before it touches Redis.
3. It runs `redis-cli --rdb`. That opens a replication stream (`PSYNC` / `SYNC`). The primary forks a child to emit the RDB. The script does not call `BGSAVE` or `SAVE`, and it does not send `SCAN` or `DUMP`. There is no second export path.
4. If `redis-cli` is missing, `--rdb` fails, or SYNC/PSYNC fails, the process exits non-zero. It uploads nothing and prunes nothing.
5. On success it gzips the RDB and uploads it with `aws4fetch` (pinned at 1.0.20 in the cron image) to:

   `chrono-redis/YYYY-MM-DDTHHMMSSZ.rdb.gz`

6. It uploads a sha256 sidecar: the same key plus `.sha256`. The digest is the sha256 of the gzip bytes, in `sha256sum` form.
7. It keeps the 13 newest `.rdb.gz` archives under `chrono-redis/` and the sidecar for each kept archive. Older archives and their sidecars under that prefix are deleted. Objects outside `chrono-redis/` are not deleted. Objects under that prefix that are not these RDB archives are left in place.
8. Any failure exits non-zero. The Railway service restart policy is `NEVER`, so a failed run does not loop. The process does not listen for HTTP.

`redis-cli --rdb` makes production Redis fork. A pre-run headroom check is required before this cron is enabled: the host needs free RAM for that fork, on the order of the dataset size. This script does not measure memory.

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

The image installs the `redis-tools` package so `redis-cli` is on `PATH`, and `npm ci` installs `aws4fetch@1.0.20` from `services/redis-weekly-backup/package.json`. It does not contain the MCP server.

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

Uploads use virtual-hosted URLs: the bucket name is the subdomain of `ENDPOINT`. The client does not set a public ACL. Signing is `aws4fetch`, not a local SigV4 implementation.

## Retention

13-copy retention. Each copy is one gzipped RDB plus its `.sha256` sidecar. After a successful upload the job sorts archive keys under `chrono-redis/` and deletes every archive older than the newest 13, plus the sidecars for those deleted archives. The archive just written is kept even if the clock is behind the existing names. Nothing outside the prefix is removed. A failed RDB does not prune.

Thirteen weekly copies is about one quarter.

## Restore

Keep the bucket private while you do this. The bytes include user proposal text.

1. Download one `chrono-redis/<stamp>.rdb.gz` and its `.sha256` sidecar from the Railway service's bucket.
2. Check the gzip bytes. The sidecar is `sha256sum` format (`<hex>  <key>`). `sha256sum` of the downloaded `.gz` must match the hex.
3. `gunzip` to an `.rdb` file.
4. Restore into scratch Redis first: `redis-server --dbfilename dump.rdb --dir <directory>`. Confirm the keys you expect are present. Railway Redis will not let you replace its on-disk `dump.rdb`. Copying keys onward with `RESTORE` writes; do that only against the Redis you mean to fill.

A failed run is not a restore point. A dated object with a matching sha256 is not a backup until that scratch restore has been done from a run inside the Railway service.
