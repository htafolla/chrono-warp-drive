Draft only. Do not merge. Open this only after draft #13 (`cursor/lock-onchain-write-routes-54c5`) has been reviewed. That PR moves the ambient `lpush`/`ltrim` block, so this branch must be rebased after #13 merges. The edit at each trim site is one call that passes `CONTAINER_LIST_CAP`.

## One constant

On `main`, `mcp/lib/ambientField.ts:12` defines its own `MAX_REDIS_CONTAINERS = 1000`, separate from `mcp/index.ts:27`. Both now import the single named constant `CONTAINER_LIST_CAP` from `mcp/lib/containerList.ts` (`mcp/index.ts:17`, `mcp/lib/ambientField.ts:9`) and pass it into `pushAndTrimContainerList`. The only definition is `mcp/lib/containerList.ts:8` (`4444`). `LTRIM` keeps indexes `0 .. cap - 1` (stop **4443**).

Raising the cap doesn't bring back anything that's already been evicted. The list stays at 1000 until new writes fill it.

This adds no TTL and no deletes. Redis memory for `dynamo:containers` grows up to 4.444x once the list fills. Cost notes are tracked separately by forge.

## Trim sites

| Path | Before | After |
| --- | --- | --- |
| Cap | `mcp/index.ts:27` `MAX_REDIS_CONTAINERS = 1000` | `mcp/lib/containerList.ts:8` `CONTAINER_LIST_CAP = 4444`, imported at `mcp/index.ts:17` |
| Cap | `mcp/lib/ambientField.ts:12` `MAX_REDIS_CONTAINERS = 1000` | same constant, imported at `mcp/lib/ambientField.ts:9` |
| Govern persist | `mcp/index.ts:1784-1785` `ltrim` stop 999 | `mcp/index.ts:1782` passes `CONTAINER_LIST_CAP` |
| Seed route | `mcp/index.ts:3192-3193` `ltrim` stop 999 | `mcp/index.ts:3188` passes `CONTAINER_LIST_CAP` |
| Ambient persist | `mcp/lib/ambientField.ts:344-345` `ltrim` stop 999 | `mcp/lib/ambientField.ts:342` passes `CONTAINER_LIST_CAP` |

No other `ltrim` touches `dynamo:containers`. Left as-is because they are different keys: `dynamo:history` (`mcp/lib/dynamoSolarGovernance.ts:141`, cap 10000), `dynamo:feed` (`mcp/lib/dynamoSolarGovernance.ts:159`, cap 500), `/manifold/points` max 1000 (`mcp/index.ts:1938`), `/history` max 1000 (`mcp/index.ts:1944`), and `dynamo:vortex:containers` (`mcp/scripts/sync-vortex-redis.ts:20` and `:76`).

## Readers

Every reader of `dynamo:containers` (the Redis list, or the in-memory `containerStore` loaded from it). Per-call cost at a full list of 4444 compared with a full list of 1000.

Byte figures use a measured `ContainerVortex` JSON of **1,049 bytes** with no `vortexMessage` (about **1.0 MB** at 1000 entries, **4.7 MB** at 4444). A manifold point without proposal text is **378 bytes**. One `/vortex/statuses` row is about **120 bytes**. Times are rough, not a benchmark: full-list Redis transfer assumes on the order of 200 Mbit/s, so moving the payload is about **40 ms vs 180 ms**. JSON.parse of that payload is about **10 ms vs 45 ms**. In-memory id scans stay under **1 ms** at both sizes.

| Reader | Kind | Entries read, 1000 → 4444 | Bytes, rough | Time, rough |
| --- | --- | --- | --- | --- |
| `mcp/index.ts:37` `lrange(REDIS_CONTAINER_KEY, 0, -1)` | Redis full list, once per process boot | 1000 → 4444 | 1.0 MB → 4.7 MB | ~40 ms → ~180 ms transfer |
| `mcp/index.ts:38` `for (const entry of raw.reverse())` | Full-list parse loop on that same boot read | 1000 → 4444 | same buffer, no second Redis read | ~10 ms → ~45 ms `JSON.parse` |
| `mcp/index.ts:54` `populateFromContainers(containerStore.map(...))` | Full-list loop into the manifold, same boot | 1000 → 4444 | in memory, 1.0 MB → 4.7 MB | a few ms → ~10 ms |
| `mcp/lib/temporalManifold.ts:205` `for (const c of containers)` | Full-list loop inside that populate | 1000 → 4444 | same objects, no second Redis read | included in the line above |
| `mcp/index.ts:1848-1850` `GET /containers` `slice(offset, offset + limit)` | Pagination. Limit defaults to 50 and is clamped to 100 | 50 → 50 (max 100 either way) | ~52 KB → ~52 KB per page | unchanged per call. Walking every page is 20 calls → 89 calls |
| `mcp/index.ts:1853-1858` `getAllPoints()` then `for (const point of points)` | Per-request scan on every `GET /containers`, beside the page | up to 1000 → up to 4444 points | ~0.4 MB → ~1.7 MB of point records | ~1 ms → ~5 ms |
| `mcp/index.ts:1872` `GET /containers/:id` `containerStore.find` | Per-request scan, stops at the match | worst case 1000 → 4444 | id strings only, ~66 KB → ~290 KB compared | under 1 ms → under 1 ms |
| `mcp/index.ts:2420` `POST /vortex/persist` `containerStore.find` | Per-request scan | worst case 1000 → 4444 | same id compare | under 1 ms. The chain write dominates |
| `mcp/index.ts:2524` `POST /vortex/mint` store fallback `containerStore.find` | Per-request scan, only after the registry read misses | worst case 1000 → 4444 | same id compare | under 1 ms |
| `mcp/index.ts:2612` `POST /vortex/mint` prefix `containerStore.find` | Per-request scan, only if the id is still unresolved | worst case 1000 → 4444 | same id compare | under 1 ms |
| `mcp/index.ts:2743` and `:2760` `GET /vortex/statuses` `containerStore.map` then `for (const cid of containerIds)` | Per-request full scan. Builds one status per id | 1000 → 4444 | response ~120 KB → ~540 KB | ~10 ms → ~40 ms to build and send |
| `src/pages/VortexClaim.tsx:252` `GET /containers?offset=0&limit=50` | Pagination, first page | 50 → 50 | ~52 KB → ~52 KB | one HTTP round trip, same per call |
| `src/pages/VortexClaim.tsx:282` `GET /containers?offset=${containers.length}&limit=50` | Pagination, each load-more | 50 → 50 | ~52 KB → ~52 KB | same per call. `src/pages/VortexClaim.tsx:217` stops when `containers.length < totalContainers`, so a full walk is 20 pages → 89 pages |
| `src/pages/VortexClaim.tsx:253` `GET /vortex/statuses` | Client of the full scan above, once per claim-page load | 1000 → 4444 status rows | ~120 KB → ~540 KB | same as `mcp/index.ts:2743` |

`mcp/scripts/sync-vortex-redis.ts:76` is an `lrange` of `dynamo:vortex:containers`, a different key, so it is not a reader of this list. On-chain `listContainers` in the bootstrap is the contract, not this Redis list.

None of these reads request a Redis index past 4443. The only `lrange` on this key uses stop `-1` (the last element). Pagination does not assume 1000.

## Tests

`src/__tests__/containerListCap.test.ts` pushes 4450 entries through each trim path on a mocked Redis and asserts length 4444. No real Redis and no chain calls.
