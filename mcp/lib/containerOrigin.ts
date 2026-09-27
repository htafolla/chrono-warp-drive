/**
 * Off-chain origin tags for temporal containers.
 *
 * Stored in the existing Redis instance under a dedicated hash.
 * Never added to ContainerVortex, containerToContractParams, or storeContainer args.
 */

export const REDIS_CONTAINER_ORIGIN_KEY = 'dynamo:containers:origin'

/** Dev route that writes random-metric containers. */
export const SEED_ROUTE_SOURCE = '/dev/seed-containers'

export type ContainerOrigin = 'seed' | 'real'

export interface ContainerOriginRecord {
  origin: ContainerOrigin
  /** Present only for seed-route writes. Identifies which route produced the container. */
  seedSource?: string
}

export interface RedisHashWriter {
  hset(key: string, field: string, value: string): Promise<unknown>
}

export function containerOriginRecord(
  origin: ContainerOrigin,
  seedSource?: string,
): ContainerOriginRecord {
  if (origin === 'seed') {
    return { origin: 'seed', seedSource: seedSource ?? SEED_ROUTE_SOURCE }
  }
  return { origin: 'real' }
}

export function containerOriginHashField(
  containerId: string,
  origin: ContainerOrigin,
  seedSource?: string,
): { key: string; field: string; value: string } {
  return {
    key: REDIS_CONTAINER_ORIGIN_KEY,
    field: containerId.toLowerCase(),
    value: JSON.stringify(containerOriginRecord(origin, seedSource)),
  }
}

/**
 * Dev seed route is off unless this process is explicitly not production
 * and ALLOW_DEV_SEED=true. Either condition failing is a 403.
 */
export function devSeedRouteAllowed(
  env: { NODE_ENV?: string; ALLOW_DEV_SEED?: string } = process.env,
): boolean {
  return env.NODE_ENV !== 'production' && env.ALLOW_DEV_SEED === 'true'
}

/** Unix milliseconds are ~1e12. Seed containers store unix seconds (~1e9). */
export function timestampIsUnixSeconds(timestamp: number): boolean {
  return Number.isFinite(timestamp) && timestamp > 0 && timestamp < 1_000_000_000_000
}

export interface SeedExclusionInput {
  origin?: string | null
  text?: string | null
  timestamp?: number | null
}

/**
 * Skip a container in the manifold rebuild, ambient re-score, and axioms.
 * Tagged seeds always skip. Untagged seeds match the signature that used to
 * fall out only by accident: no proposal text, or a unix-seconds timestamp
 * (manifold windows are milliseconds).
 * A container tagged origin=real is a real run and stays, including when its
 * on-chain timestamp is unix seconds.
 */
export function isExcludedSeed(input: SeedExclusionInput): boolean {
  if (input.origin === 'real') return false
  if (input.origin === 'seed') return true
  const noText = input.text == null || input.text.trim() === ''
  const seconds = input.timestamp != null && timestampIsUnixSeconds(input.timestamp)
  return noText || seconds
}

/** Read origin tags written by tagContainerOrigin. Unknown values are ignored. */
export function originFromRedisHash(
  entries: Record<string, string> | null | undefined,
): Map<string, ContainerOrigin> {
  const origins = new Map<string, ContainerOrigin>()
  if (!entries) return origins
  for (const [id, raw] of Object.entries(entries)) {
    try {
      const parsed = JSON.parse(raw) as { origin?: string }
      if (parsed.origin === 'seed' || parsed.origin === 'real') {
        origins.set(id.toLowerCase(), parsed.origin)
      }
    } catch { /* ignore malformed tag */ }
  }
  return origins
}

/** Write an origin tag. Does not read or modify the container or any on-chain payload. */
export async function tagContainerOrigin(
  client: RedisHashWriter,
  containerId: string,
  origin: ContainerOrigin,
  seedSource?: string,
): Promise<ContainerOriginRecord> {
  const record = containerOriginRecord(origin, seedSource)
  const field = containerOriginHashField(containerId, origin, seedSource)
  await client.hset(field.key, field.field, field.value)
  return record
}
