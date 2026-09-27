# Container seed audit

Reproduce this split with a read-only chain read. The script sends no transaction and writes no Redis key.

```bash
node mcp/scripts/audit-container-seeds.mjs
```

Run it from the repository root after `npm install` so `viem` resolves. It calls `containerCount`, `listContainers`, and `getContainer` through public Base RPCs (`https://mainnet.base.org`, then `https://base-rpc.publicnode.com`).

```bash
node mcp/scripts/audit-container-seeds.mjs --from-raw path/to/normalized.json
```

`--from-raw` classifies a previously saved normalized payload and does not open a socket to the chain. Either mode rewrites this file, `docs/empirical/container-seed-audit.json`, and `mcp/data/container-classes.json`.

## Counts

| class | count |
| --- | ---: |
| seed | 786 |
| real | 52 |
| unknown | 94 |
| total | 932 |

Seed splits into 781 containers matching the `POST /dev/seed-containers` random-metric signature (`reason: dev-seed-route`) and 5 matching `mcp/scripts/register-test-containers.ts` (`reason: dev-test-script`).

## Checked-in data

`docs/empirical/container-seed-audit.json` is the human classification record: one object per container with `id`, `class`, and `reason`. The server does not read it.

`mcp/data/container-classes.json` is the runtime list the server imports (`id` and `class` for unknown containers only). `mcp/lib/containerOrigin.ts` loads that file. Production starts with its working directory at `mcp/` (`tsx server.ts` in `mcp/railway.toml`), so the runtime data lives inside `mcp/` and does not depend on `docs/`. This script writes that file in the same run as the human summary. Re-running the script refreshes it directly.

Unknown ids stay in the Manifold and are flagged `reviewFlag: unknown`. They are not dropped.

## Method

A container is unknown unless a code-path invariant matches the on-chain payload. Seed, dev-route signature: the route hammer paired with verdict, 4-decimal score quanta, jitter windows, solar bounds, and verdict agreement with the sub-metric average. Seed, dev test script: container id is sha256 of a script label and the stored payload matches that script. Real: a dynamoSolarGovernance hammer, protonFlux and magnetometer 0, Trinitarium tension, verdict PASS|NEEDS_REVISION|REJECT, and a live solar activity class, and the seed signature does not also hold. Anything else is unknown. Bursts are not used to promote an unknown.

Registry `0xCB418F081D4fDAD6B2b17027294865B26cb26855` on Base (chain id 8453). No score was changed. No contract call was a write.
