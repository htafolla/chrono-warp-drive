# Container seed audit

Reproduce this split with a read-only chain read. The script sends no transaction and writes no Redis key.

```bash
node mcp/scripts/audit-container-seeds.mjs
```

Run it from the repository root after `npm install` so `viem` resolves. It calls `containerCount`, `listContainers`, and `getContainer` through public Base RPCs (`https://mainnet.base.org`, then `https://base-rpc.publicnode.com`).

Optional Redis read: set `REDIS_URL`. The script then `HGETALL`s `dynamo:containers:origin` and quits. It does not call a Redis write command, and a Redis tag does not change `class`. If `REDIS_URL` is unset, Redis is not contacted. The snapshot below was classified without a Redis read.

```bash
node mcp/scripts/audit-container-seeds.mjs --from-raw path/to/normalized.json
```

`--from-raw` classifies a previously saved normalized payload and does not open a socket to the chain. Either mode rewrites this file and `docs/empirical/container-seed-audit.json`.

## Counts

| class | count |
| --- | ---: |
| seed | 786 |
| real | 52 |
| unknown | 94 |
| total | 932 |

Seed splits into 781 containers matching the `POST /dev/seed-containers` random-metric signature (`reason: dev-seed-route`) and 5 matching `mcp/scripts/register-test-containers.ts` (`reason: dev-test-script`).

## Checked-in data

`docs/empirical/container-seed-audit.json` stores one object per container: `id`, `class`, `reason`. The previous per-container evidence paragraphs and the TypeScript id-list modules are not checked in. Unknown ids in that JSON are what the Manifold flags with `reviewFlag: unknown`. They are not dropped.

## Method

A container is unknown unless a code-path invariant matches the on-chain payload. Seed, dev-route signature: the route hammer paired with verdict, 4-decimal score quanta, jitter windows, solar bounds, and verdict agreement with the sub-metric average. Seed, dev test script: container id is sha256 of a script label and the stored payload matches that script. Real: a dynamoSolarGovernance hammer, protonFlux and magnetometer 0, Trinitarium tension, verdict PASS|NEEDS_REVISION|REJECT, and a live solar activity class, and the seed signature does not also hold. Anything else is unknown. Bursts are not used to promote an unknown.

Registry `0xCB418F081D4fDAD6B2b17027294865B26cb26855` on Base (chain id 8453). No score was changed. No contract call was a write.
