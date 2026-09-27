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
