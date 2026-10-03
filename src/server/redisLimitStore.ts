import net from 'node:net'
import tls from 'node:tls'

export interface ChainSaveLimitStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlMs: number): Promise<void>
}

interface RedisTarget {
  host: string
  port: number
  useTls: boolean
  username: string | null
  password: string | null
}

/** `redis://` or `rediss://`. Anything else is not a configured store. */
export function parseRedisUrl(raw: string): RedisTarget | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') return null
  if (!url.hostname) return null
  const port = url.port ? Number(url.port) : 6379
  if (!Number.isInteger(port) || port <= 0) return null
  return {
    host: url.hostname,
    port,
    useTls: url.protocol === 'rediss:',
    username: url.username ? decodeURIComponent(url.username) : null,
    password: url.password ? decodeURIComponent(url.password) : null,
  }
}

function encodeCommand(args: string[]): Buffer {
  const chunks: Buffer[] = [Buffer.from(`*${args.length}\r\n`)]
  for (const arg of args) {
    const body = Buffer.from(arg)
    chunks.push(Buffer.from(`$${body.length}\r\n`))
    chunks.push(body)
    chunks.push(Buffer.from('\r\n'))
  }
  return Buffer.concat(chunks)
}

function readReply(buffer: Buffer): { value: string | null; rest: Buffer } | null {
  const text = buffer.toString('utf8')
  if (text.startsWith('+')) {
    const end = text.indexOf('\r\n')
    if (end < 0) return null
    return { value: text.slice(1, end), rest: buffer.subarray(end + 2) }
  }
  if (text.startsWith('-')) {
    const end = text.indexOf('\r\n')
    if (end < 0) return null
    throw new Error('redis error')
  }
  if (text.startsWith('$-1')) {
    const end = text.indexOf('\r\n')
    if (end < 0) return null
    return { value: null, rest: buffer.subarray(end + 2) }
  }
  if (text.startsWith('$')) {
    const lineEnd = text.indexOf('\r\n')
    if (lineEnd < 0) return null
    const length = Number(text.slice(1, lineEnd))
    if (!Number.isInteger(length) || length < 0) throw new Error('redis bulk')
    const start = lineEnd + 2
    if (buffer.length < start + length + 2) return null
    return {
      value: buffer.subarray(start, start + length).toString('utf8'),
      rest: buffer.subarray(start + length + 2),
    }
  }
  return null
}

function command(target: RedisTarget, args: string[]): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const socket = target.useTls
      ? tls.connect({ host: target.host, port: target.port, servername: target.host })
      : net.connect({ host: target.host, port: target.port })
    const pending: Buffer[] = []
    if (target.password) {
      const auth = target.username ? ['AUTH', target.username, target.password] : ['AUTH', target.password]
      pending.push(encodeCommand(auth))
    }
    pending.push(encodeCommand(args))
    let buffered = Buffer.alloc(0)
    const expected = pending.length
    const replies: Array<string | null> = []
    const fail = (err: Error) => {
      socket.destroy()
      reject(err)
    }
    socket.setTimeout(5_000, () => fail(new Error('redis timeout')))
    socket.on('error', (err) => fail(err instanceof Error ? err : new Error('redis socket')))
    socket.on('data', (chunk: Buffer) => {
      buffered = Buffer.concat([buffered, chunk])
      try {
        while (replies.length < expected) {
          const parsed = readReply(buffered)
          if (!parsed) return
          replies.push(parsed.value)
          buffered = parsed.rest
        }
      } catch (err) {
        fail(err instanceof Error ? err : new Error('redis reply'))
        return
      }
      socket.end()
      resolve(replies[replies.length - 1] ?? null)
    })
    socket.on(target.useTls ? 'secureConnect' : 'connect', () => {
      socket.write(Buffer.concat(pending))
    })
  })
}

/** GET/SET against the URL Blaze configures. This process does not embed a vendor client. */
export function redisLimitStore(url: string): ChainSaveLimitStore | null {
  const target = parseRedisUrl(url)
  if (!target) return null
  return {
    async get(key: string): Promise<string | null> {
      return command(target, ['GET', key])
    },
    async set(key: string, value: string, ttlMs: number): Promise<void> {
      await command(target, ['SET', key, value, 'PX', String(ttlMs)])
    },
  }
}
