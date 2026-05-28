---
sidebar_position: 8
---

# Public Feed & History

Dynamo stores two levels of query data.

## Public Feed

Proposals submitted with `sharePublicly: true` appear in the public feed. This is a curated view — it shows the proposal text, resonance score, verdict, solar activity level, and timestamp only.

- **Capacity**: 50 entries
- **Storage**: In-memory + Redis (persistent across restarts when Redis is configured)
- **Endpoint**: `GET /public_feed`

Use cases: seeing what others are asking, understanding current solar sensitivity, community awareness.

## Full History

Every `govern_with_solar` call is stored with the complete response — all four (or five) resonance dimensions, adaptive thresholds, momentum, peak forecast, hammer reason, and solar context. This is the full `EnhancedGovernanceDecision` object.

- **Capacity**: 10,000 entries in Redis (FIFO eviction)
- **Storage**: Redis-backed (falls back to public feed data when Redis is unavailable)
- **Endpoint**: `GET /history?n=100`

Use cases: inference training data, analytics, debugging, auditing governance decisions over time.

## Redis Configuration

When `REDIS_URL` is set in the environment, Dynamo automatically persists both the public feed and full history to Redis. Without Redis, data is stored in-memory and resets on server restart.

Redis is provisioned via the Railway dashboard: **+ New → Database → Redis**. The `REDIS_URL` variable is auto-injected into all services in the project.

## Data Retention

| Store | Max Entries | Eviction | Persistent |
|-------|-------------|----------|------------|
| Public feed | 50 | Oldest removed | With Redis |
| Full history | 10,000 | Oldest removed (FIFO) | With Redis |
| Resonance history | 10 per proposal | Oldest removed | No (in-memory only) |
