import { EventEmitter } from 'events'

const emitter = new EventEmitter()
emitter.setMaxListeners(100)

let redisClient: any = null
let redisSubscriber: any = null

let pubsubMode: 'redis' | 'memory' = 'memory'

if (process.env.REDIS_URL) {
  pubsubMode = 'redis'
}

async function getRedis() {
  if (!redisClient && pubsubMode === 'redis') {
    const { Redis } = await import('ioredis')
    redisClient = new Redis(process.env.REDIS_URL!)
    redisSubscriber = new Redis(process.env.REDIS_URL!)
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
