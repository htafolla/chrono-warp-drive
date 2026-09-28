import { EventEmitter } from 'events'

const emitter = new EventEmitter()
emitter.setMaxListeners(100)

let redisClient: any = null
let redisSubscriber: any = null
let redisClientForTests: { enabled: true; client: unknown } | null = null

/** Tests inject a client without opening a real connection. `null` means Redis is down. */
export function setRedisClientForTests(client: unknown | null): void {
  redisClientForTests = { enabled: true, client }
}

export function clearRedisClientForTests(): void {
  redisClientForTests = null
}

let pubsubMode: 'redis' | 'memory' = 'memory'

if (process.env.REDIS_URL) {
  pubsubMode = 'redis'
}

async function getRedis() {
  if (!redisClient && pubsubMode === 'redis') {
    // ioredis is an optional runtime dep installed only inside mcp/.
    // A non-literal specifier keeps the root vitest graph from requiring it
    // when Redis is not configured.
    const spec = 'ioredis'
    const mod: any = await import(/* @vite-ignore */ spec)
    const Redis = mod.Redis ?? mod.default
    redisClient = new Redis(process.env.REDIS_URL!)
    redisSubscriber = new Redis(process.env.REDIS_URL!)
    // ioredis throws on an unhandled 'error'. Unreachable Redis must not take the process down.
    const ignoreRedisError = () => {}
    redisClient.on('error', ignoreRedisError)
    redisSubscriber.on('error', ignoreRedisError)
  }
  return { client: redisClient, subscriber: redisSubscriber }
}

export async function publish(channel: string, message: string): Promise<boolean> {
  if (pubsubMode === 'redis') {
    const { client } = await getRedis()
    const count = await client.publish(channel, message)
    return count > 0
  }
  return emitter.emit(channel, message)
}

export async function subscribe(channel: string, callback: (message: string) => void): Promise<() => Promise<void>> {
  if (pubsubMode === 'redis') {
    const { subscriber } = await getRedis()
    await subscriber.subscribe(channel)
    const handler = (ch: string, msg: string) => {
      if (ch === channel) callback(msg)
    }
    subscriber.on('message', handler)
    return async () => {
      await subscriber.unsubscribe(channel)
      subscriber.off('message', handler)
    }
  }
  emitter.on(channel, callback)
  return async () => {
    emitter.off(channel, callback)
  }
}

export function getMode() {
  return pubsubMode
}

/** Get the shared Redis client for data storage (not just pub/sub). */
export async function getRedisClient(): Promise<any> {
  if (redisClientForTests?.enabled) return redisClientForTests.client
  if (pubsubMode === 'redis') {
    const { client } = await getRedis()
    return client
  }
  return null
}
