/**
 * Redis list of temporal containers (`LPUSH`, newest at index 0).
 * No TTL is set on this key. The only length control is LTRIM.
 */
export const REDIS_CONTAINER_KEY = 'dynamo:containers'

/** Keep at most this many list entries. LTRIM stop index is CAP - 1. */
export const CONTAINER_LIST_CAP = 4444

export interface ContainerListPipeline<T> {
  lpush(key: string, value: string): T
  ltrim(key: string, start: number, stop: number): T
}

/**
 * Queue LPUSH + LTRIM on an existing pipeline.
 * Returns the same pipeline so callers can still HSET and EXEC.
 */
export function pushAndTrimContainerList<T extends ContainerListPipeline<T>>(
  pipeline: T,
  serialized: string,
  cap: number = CONTAINER_LIST_CAP,
): T {
  return pipeline
    .lpush(REDIS_CONTAINER_KEY, serialized)
    .ltrim(REDIS_CONTAINER_KEY, 0, cap - 1)
}
