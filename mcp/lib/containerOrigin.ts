import { EVIDENCE_SEED_IDS } from './evidenceSeedIds.js'

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
 * and ALLOW_SEED_ROUTE=1. Either condition failing is a 403.
 */
export function devSeedRouteAllowed(
  env: { NODE_ENV?: string; ALLOW_SEED_ROUTE?: string } = process.env,
): boolean {
  return env.NODE_ENV !== 'production' && env.ALLOW_SEED_ROUTE === '1'
}

export interface SeedExclusionInput {
  origin?: string | null
  containerId?: string | null
}

/**
 * Skip a container at Manifold rebuild and when the ambient loop picks
 * re-score candidates. A container is a seed when it is tagged origin=seed
 * or its id is on the evidence seed list. Missing text and unix-seconds
 * timestamps are not a seed signal.
 */
export function isExcludedSeed(input: SeedExclusionInput): boolean {
  if (input.origin === 'seed') return true
  const id = input.containerId?.toLowerCase()
  if (id && EVIDENCE_SEED_IDS.has(id)) return true
  return false
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
