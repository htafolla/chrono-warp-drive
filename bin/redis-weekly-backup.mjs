#!/usr/bin/env node
/**
 * Weekly read-only Redis export for a Railway cron service.
 *
 * Prefers `redis-cli --rdb` (replication stream, not BGSAVE). If Redis refuses
 * SYNC/PSYNC, falls back to SCAN + TYPE + TTL + DUMP. Gzip, sha256 sidecar,
 * upload under chrono-redis/, keep the newest 13 archives.
 *
 * Required env (names only; values are never logged):
 *   REDIS_URL, BUCKET, ACCESS_KEY_ID, SECRET_ACCESS_KEY, ENDPOINT, REGION
 */

import { spawn } from 'node:child_process'
import { createHash, createHmac } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import tls from 'node:tls'
import { gzipSync } from 'node:zlib'

export const PREFIX = 'chrono-redis/'
export const RETENTION_COPIES = 13
const BACKUP_KEY_RE = /^chrono-redis\/\d{4}-\d{2}-\d{2}T\d{6}Z\.(?:rdb|json)\.gz$/
const READ_ONLY_COMMANDS = new Set(['AUTH', 'SELECT', 'PING', 'QUIT', 'SCAN', 'TYPE', 'TTL', 'DUMP'])
const REQUIRED_ENV = ['REDIS_URL', 'BUCKET', 'ACCESS_KEY_ID', 'SECRET_ACCESS_KEY', 'ENDPOINT', 'REGION']
const RDB_MAGIC = Buffer.from('REDIS')
const MAX_BULK_BYTES = 256 * 1024 * 1024

export function assertRedisReadOnly(command) {
  const name = String(command).toUpperCase()
  if (!READ_ONLY_COMMANDS.has(name)) {
    throw new Error(`refusing Redis command ${name}; backup is read-only`)
  }
  return name
}

export function buildRdbCliArgs(redisUrl, rdbPath) {
  return ['-u', redisUrl, '--rdb', rdbPath]
}

export function isSyncRefused(output) {
  const text = String(output).toLowerCase()
  const mentionsSync = /psync|replconf|\bsync\b|replication/.test(text)
  if (/unknown command/.test(text) && mentionsSync) return true
  if (/noperm|no permissions|permission denied|operation not permitted/.test(text) && mentionsSync) return true
  if (/sync with master failed|failed to sync|cannot sync|can't sync|can not sync/.test(text)) return true
  if (/replication/.test(text) && /not allowed|disabled|unsupported|refused/.test(text)) return true
  return false
}

export function formatBackupStamp(date) {
  const iso = date.toISOString()
  return `${iso.slice(0, 10)}T${iso.slice(11, 19).replace(/:/g, '')}Z`
}

export function objectKeyFor(date, ext) {
  if (ext !== 'rdb' && ext !== 'json') throw new Error('unsupported backup extension')
  return `${PREFIX}${formatBackupStamp(date)}.${ext}.gz`
}

export function sidecarKey(backupKey) {
  return `${backupKey}.sha256`
}

export function assertDeletableBackupKey(key) {
  if (typeof key !== 'string' || !key.startsWith(PREFIX)) {
    throw new Error('refusing to delete outside chrono-redis/')
  }
  const parent = key.endsWith('.sha256') ? key.slice(0, -'.sha256'.length) : key
  if (!BACKUP_KEY_RE.test(parent) || key.includes('..')) {
    throw new Error('refusing to delete an object that is not a weekly backup')
  }
}

export function selectKeysToDelete(objects, options = {}) {
  const keep = options.keep ?? RETENTION_COPIES
  const alwaysKeep = options.alwaysKeep ?? []
  const backups = []
  for (const object of objects) {
    if (!object || typeof object.key !== 'string') continue
    if (!object.key.startsWith(PREFIX) || !BACKUP_KEY_RE.test(object.key)) continue
    backups.push(object.key)
  }
  backups.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
  const keepSet = new Set(backups.slice(0, keep))
  for (const key of alwaysKeep) {
    if (typeof key === 'string' && BACKUP_KEY_RE.test(key)) keepSet.add(key)
  }
  const deletions = []
  for (const key of backups) {
    if (!keepSet.has(key)) deletions.push(key)
  }
  for (const object of objects) {
    if (!object || typeof object.key !== 'string') continue
    const key = object.key
    if (!key.startsWith(PREFIX) || !key.endsWith('.sha256')) continue
    const parent = key.slice(0, -'.sha256'.length)
    if (!BACKUP_KEY_RE.test(parent)) continue
    if (!keepSet.has(parent)) deletions.push(key)
  }
  return deletions
}

export function collectSecretValues(env) {
  const values = []
  const add = (value) => {
    if (typeof value === 'string' && value.length >= 8) values.push(value)
  }
  add(env.REDIS_URL)
  add(env.ACCESS_KEY_ID)
  add(env.SECRET_ACCESS_KEY)
  add(env.ENDPOINT)
  if (typeof env.REDIS_URL === 'string') {
    try {
      const url = new URL(env.REDIS_URL)
      if (url.password) {
        add(decodeURIComponent(url.password))
        add(url.password)
      }
    } catch {
      // Invalid URLs are reported by readEnv without echoing the value.
    }
  }
  return values
}

export function redactSecrets(text, secrets) {
  let out = String(text)
  const sorted = [...secrets].filter((value) => typeof value === 'string' && value.length >= 8)
  sorted.sort((a, b) => b.length - a.length)
  for (const secret of sorted) {
    if (out.includes(secret)) out = out.split(secret).join('[redacted]')
  }
  return out
}

export function readEnv(env) {
  const missing = REQUIRED_ENV.filter((name) => !env[name] || !String(env[name]).trim())
  if (missing.length > 0) throw new Error(`missing required env: ${missing.join(', ')}`)
  const values = {}
  for (const name of REQUIRED_ENV) values[name] = String(env[name]).trim()
  let parsed
  try {
    parsed = new URL(values.REDIS_URL)
  } catch {
    throw new Error('REDIS_URL is not a valid URL')
  }
  if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
    throw new Error('REDIS_URL must use redis: or rediss:')
  }
  return values
}

export function parseRedisUrl(redisUrl) {
  const url = new URL(redisUrl)
  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error('REDIS_URL must use redis: or rediss:')
  }
  const dbText = url.pathname.replace(/^\//, '')
  const db = dbText ? Number(dbText) : 0
  if (!Number.isInteger(db) || db < 0) throw new Error('REDIS_URL database index is invalid')
  const port = url.port ? Number(url.port) : (url.protocol === 'rediss:' ? 6380 : 6379)
  return {
    tls: url.protocol === 'rediss:',
    host: url.hostname,
    port,
    username: decodeURIComponent(url.username || ''),
    password: decodeURIComponent(url.password || ''),
    db,
  }
}

function readCrlf(buffer, offset) {
  const idx = buffer.indexOf('\r\n', offset)
  if (idx < 0) return null
  return { text: buffer.toString('utf8', offset, idx), next: idx + 2 }
}

function parseAt(buffer, offset) {
  if (offset >= buffer.length) return null
  const type = buffer[offset]
  if (type === 43 || type === 45 || type === 58) {
    const line = readCrlf(buffer, offset + 1)
    if (!line) return null
    if (type === 45) return { next: line.next, error: line.text }
    if (type === 58) {
      if (!/^-?\d+$/.test(line.text)) return { next: line.next, error: 'invalid integer reply' }
      return { next: line.next, value: Number(line.text) }
    }
    return { next: line.next, value: line.text }
  }
  if (type === 36) {
    const line = readCrlf(buffer, offset + 1)
    if (!line) return null
    const length = Number(line.text)
    if (!Number.isInteger(length)) return { next: line.next, error: 'invalid bulk length' }
    if (length < -1) return { next: line.next, error: 'invalid bulk length' }
    if (length === -1) return { next: line.next, value: null }
    if (length > MAX_BULK_BYTES) return { next: line.next, error: 'Redis bulk reply is too large' }
    const start = line.next
    const end = start + length
    if (buffer.length < end + 2) return null
    if (buffer[end] !== 13 || buffer[end + 1] !== 10) {
      return { next: end + 2, error: 'bulk reply missing CRLF' }
    }
    return { next: end + 2, value: Buffer.from(buffer.subarray(start, end)) }
  }
  if (type === 42) {
    const line = readCrlf(buffer, offset + 1)
    if (!line) return null
    const count = Number(line.text)
    if (!Number.isInteger(count)) return { next: line.next, error: 'invalid array length' }
    if (count < 0) return { next: line.next, value: null }
    const values = []
    let cursor = line.next
    for (let index = 0; index < count; index += 1) {
      const item = parseAt(buffer, cursor)
      if (!item) return null
      if (item.error) return { next: item.next, error: item.error }
      values.push(item.value)
      cursor = item.next
    }
    return { next: cursor, value: values }
  }
  return { next: offset + 1, error: 'unknown Redis reply type' }
}

export function parseRespMessage(buffer) {
  return parseAt(buffer, 0)
}

export function encodeCommand(args) {
  const chunks = [Buffer.from(`*${args.length}\r\n`)]
  for (const arg of args) {
    const buf = Buffer.isBuffer(arg) ? arg : Buffer.from(String(arg), 'utf8')
    chunks.push(Buffer.from(`$${buf.length}\r\n`))
    chunks.push(buf)
    chunks.push(Buffer.from('\r\n'))
  }
  return Buffer.concat(chunks)
}

function openSocket(parsed) {
  return new Promise((resolve, reject) => {
    const socket = parsed.tls
      ? tls.connect({
        host: parsed.host,
        port: parsed.port,
        servername: parsed.host,
        rejectUnauthorized: true,
      })
      : net.connect({ host: parsed.host, port: parsed.port })
    const onError = (error) => {
      socket.destroy()
      reject(error instanceof Error ? new Error('Redis connection failed') : new Error('Redis connection failed'))
    }
    socket.once('error', onError)
    socket.once(parsed.tls ? 'secureConnect' : 'connect', () => {
      socket.off('error', onError)
      socket.setTimeout(60_000)
      resolve(socket)
    })
  })
}

export async function connectReadOnlyRedis(redisUrl) {
  const parsed = parseRedisUrl(redisUrl)
  const socket = await openSocket(parsed)
  let buffer = Buffer.alloc(0)
  const waiters = []
  let failed = null

  const failAll = (error) => {
    failed = error
    while (waiters.length > 0) {
      const waiter = waiters.shift()
      waiter.reject(error)
    }
  }

  const drain = () => {
    while (waiters.length > 0) {
      const parsedMessage = parseRespMessage(buffer)
      if (!parsedMessage) return
      buffer = buffer.subarray(parsedMessage.next)
      const waiter = waiters.shift()
      if (parsedMessage.error) waiter.reject(new Error(`Redis reply failed: ${parsedMessage.error}`))
      else waiter.resolve(parsedMessage.value)
    }
  }

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk])
    drain()
  })
  socket.on('error', () => failAll(new Error('Redis connection failed')))
  socket.on('timeout', () => {
    socket.destroy()
    failAll(new Error('Redis connection timed out'))
  })
  socket.on('close', () => {
    if (waiters.length > 0) failAll(new Error('Redis connection closed'))
  })

  const call = (args) => {
    assertRedisReadOnly(args[0])
    if (failed) return Promise.reject(failed)
    return new Promise((resolve, reject) => {
      waiters.push({ resolve, reject })
      socket.write(encodeCommand(args))
      drain()
    })
  }

  if (parsed.password) {
    const authArgs = parsed.username ? ['AUTH', parsed.username, parsed.password] : ['AUTH', parsed.password]
    const auth = await call(authArgs)
    if (auth !== 'OK') throw new Error('Redis AUTH failed')
  }
  if (parsed.db !== 0) {
    const selected = await call(['SELECT', String(parsed.db)])
    if (selected !== 'OK') throw new Error('Redis SELECT failed')
  }

  return {
    call,
    close() {
      socket.destroy()
    },
  }
}

function replyText(value) {
  if (typeof value === 'string') return value
  if (Buffer.isBuffer(value)) {
    const text = value.toString('utf8')
    if (!value.equals(Buffer.from(text, 'utf8'))) {
      throw new Error('refusing to export a Redis key that is not valid UTF-8')
    }
    return text
  }
  throw new Error('Redis reply had an unexpected type')
}

export function createRedisReader(redisUrl, deps = {}) {
  const runCli = deps.runCli ?? defaultRunCli
  let session = null

  const sessionCall = async (args) => {
    if (!session) session = await connectReadOnlyRedis(redisUrl)
    return session.call(args)
  }

  return {
    async tryRdb() {
      return exportRdbViaCli(redisUrl, runCli)
    },
    async scan(cursor) {
      const reply = await sessionCall(['SCAN', String(cursor), 'COUNT', '500'])
      if (!Array.isArray(reply) || reply.length < 2 || !Array.isArray(reply[1])) {
        throw new Error('Redis SCAN returned an unexpected reply')
      }
      const keys = []
      for (const key of reply[1]) keys.push(replyText(key))
      return { cursor: replyText(reply[0]), keys }
    },
    async type(key) {
      return replyText(await sessionCall(['TYPE', key]))
    },
    async ttl(key) {
      const value = await sessionCall(['TTL', key])
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Redis TTL returned a non-integer')
      return value
    },
    async dump(key) {
      const value = await sessionCall(['DUMP', key])
      if (value == null) return null
      if (!Buffer.isBuffer(value)) throw new Error('Redis DUMP returned a non-bulk reply')
      return value
    },
    async close() {
      if (!session) return
      const current = session
      session = null
      try {
        await current.call(['QUIT'])
      } catch {
        // The socket is closed either way.
      }
      current.close()
    },
  }
}

export async function exportRdbViaCli(redisUrl, runCli) {
  const dir = await mkdtemp(join(tmpdir(), 'chrono-rdb-'))
  const rdbPath = join(dir, 'dump.rdb')
  try {
    const args = buildRdbCliArgs(redisUrl, rdbPath)
    const result = await runCli('redis-cli', args)
    if (result.errorCode === 'ENOENT') throw new Error('redis-cli is not installed')
    const output = `${result.stderr || ''}\n${result.stdout || ''}`
    if (result.code === 0) {
      const rdb = await readFile(rdbPath)
      if (rdb.length < 5 || !rdb.subarray(0, 5).equals(RDB_MAGIC)) {
        throw new Error('redis-cli --rdb did not write a Redis RDB file')
      }
      return { ok: true, rdb }
    }
    if (isSyncRefused(output)) return { ok: false, syncRefused: true }
    const detail = output.replace(/\s+/g, ' ').trim().slice(0, 300)
    throw new Error(`redis-cli --rdb failed (${result.code ?? 'unknown'}): ${detail}`)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

function defaultRunCli(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const stdout = []
    const stderr = []
    child.stdout.on('data', (chunk) => stdout.push(chunk))
    child.stderr.on('data', (chunk) => stderr.push(chunk))
    const timer = setTimeout(() => child.kill('SIGKILL'), 10 * 60 * 1000)
    child.once('error', (error) => {
      clearTimeout(timer)
      resolve({ code: null, errorCode: error.code ?? 'SPAWN_ERROR', stdout: '', stderr: '' })
    })
    child.once('close', (code) => {
      clearTimeout(timer)
      resolve({
        code,
        errorCode: null,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      })
    })
  })
}

export async function collectScanDump(redis, options = {}) {
  const maxScanRounds = options.maxScanRounds ?? 100_000
  const keys = []
  let skipped = 0
  let cursor = '0'
  let rounds = 0
  do {
    rounds += 1
    if (rounds > maxScanRounds) throw new Error('Redis SCAN did not finish')
    const page = await redis.scan(cursor)
    cursor = String(page.cursor)
    for (const key of page.keys) {
      const type = await redis.type(key)
      if (type === 'none') {
        skipped += 1
        continue
      }
      const ttl = await redis.ttl(key)
      const dump = await redis.dump(key)
      if (dump == null) {
        skipped += 1
        continue
      }
      keys.push({
        key,
        type,
        ttl,
        dump: dump.toString('base64'),
      })
    }
  } while (cursor !== '0')
  return { keys, skipped }
}

export function awsUriEncode(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

export function canonicalQueryString(pairs) {
  return pairs
    .map(([key, value]) => [awsUriEncode(key), awsUriEncode(value)])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
}

function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex')
}

function hmac(key, data) {
  return createHmac('sha256', key).update(data).digest()
}

export function authorizeSigV4({
  method,
  canonicalUri,
  canonicalQuery,
  headers,
  payloadHash,
  region,
  service = 's3',
  accessKeyId,
  secretAccessKey,
  amzDate,
}) {
  const names = Object.keys(headers).map((name) => name.toLowerCase()).sort()
  const canonicalHeaders = names
    .map((name) => `${name}:${String(headers[name]).trim().replace(/[ \t]+/g, ' ')}\n`)
    .join('')
  const signedHeaders = names.join(';')
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')
  const dateStamp = amzDate.slice(0, 8)
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n')
  let signingKey = hmac(`AWS4${secretAccessKey}`, dateStamp)
  signingKey = hmac(signingKey, region)
  signingKey = hmac(signingKey, service)
  signingKey = hmac(signingKey, 'aws4_request')
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex')
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  return { authorization, signature, signedHeaders, canonicalRequest }
}

export function formatAmzDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function virtualHost(endpoint, bucket) {
  const base = new URL(endpoint)
  const host = base.hostname.startsWith(`${bucket}.`) ? base.host : `${bucket}.${base.host}`
  return host
}

export function decodeXml(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, digits) => String.fromCodePoint(Number(digits)))
    .replace(/&amp;/g, '&')
}

export function parseListObjectsV2(xml) {
  const truncated = /<IsTruncated>([^<]*)<\/IsTruncated>/.exec(xml)?.[1] === 'true'
  const token = /<NextContinuationToken>([^<]*)<\/NextContinuationToken>/.exec(xml)?.[1]
  const objects = []
  const blocks = xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)
  for (const block of blocks) {
    const key = /<Key>([\s\S]*?)<\/Key>/.exec(block[1])?.[1]
    const lastModified = /<LastModified>([^<]*)<\/LastModified>/.exec(block[1])?.[1] ?? ''
    if (!key) throw new Error('list objects response missing key')
    objects.push({ key: decodeXml(key), lastModified: decodeXml(lastModified) })
  }
  return {
    objects,
    isTruncated: truncated,
    nextToken: token ? decodeXml(token) : undefined,
  }
}

export function createS3Client(env, deps = {}) {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch
  const now = deps.now ?? (() => new Date())

  const request = async (method, key, queryPairs, body, contentType) => {
    const host = virtualHost(env.ENDPOINT, env.BUCKET)
    const canonicalUri = key ? `/${key.split('/').map((part) => awsUriEncode(part)).join('/')}` : '/'
    const canonicalQuery = canonicalQueryString(queryPairs)
    const payload = body ?? Buffer.alloc(0)
    const payloadHash = sha256Hex(payload)
    const amzDate = formatAmzDate(now())
    const headers = {
      host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    }
    if (contentType) headers['content-type'] = contentType
    const signed = authorizeSigV4({
      method,
      canonicalUri,
      canonicalQuery,
      headers,
      payloadHash,
      region: env.REGION,
      accessKeyId: env.ACCESS_KEY_ID,
      secretAccessKey: env.SECRET_ACCESS_KEY,
      amzDate,
    })
    const outbound = {
      'content-type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      authorization: signed.authorization,
    }
    if (!contentType) delete outbound['content-type']
    const url = canonicalQuery
      ? `https://${host}${canonicalUri}?${canonicalQuery}`
      : `https://${host}${canonicalUri}`
    const response = await fetchImpl(url, {
      method,
      headers: outbound,
      body: body ? payload : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(120_000),
    })
    if (response.status >= 300 && response.status < 400) {
      throw new Error(`S3 refused to follow a redirect (${response.status})`)
    }
    if (!response.ok) {
      const text = await response.text()
      const code = /<Code>([^<]*)<\/Code>/.exec(text)?.[1] ?? 'Error'
      throw new Error(`S3 ${method} failed (${response.status} ${code})`)
    }
    if (method === 'GET') return response.text()
    return ''
  }

  const expectBucket = (bucket) => {
    if (bucket !== env.BUCKET) throw new Error('refusing to use an unexpected bucket')
  }

  return {
    async putObject({ bucket, key, body, contentType }) {
      expectBucket(bucket)
      await request('PUT', key, [], body, contentType)
    },
    async listObjects({ bucket, prefix }) {
      expectBucket(bucket)
      const objects = []
      let token
      for (let page = 0; page < 1000; page += 1) {
        const pairs = [
          ['list-type', '2'],
          ['max-keys', '1000'],
          ['prefix', prefix],
        ]
        if (token) pairs.push(['continuation-token', token])
        const xml = await request('GET', '', pairs)
        const parsed = parseListObjectsV2(xml)
        objects.push(...parsed.objects)
        if (!parsed.isTruncated || !parsed.nextToken) break
        token = parsed.nextToken
      }
      return objects
    },
    async deleteObject({ bucket, key }) {
      expectBucket(bucket)
      assertDeletableBackupKey(key)
      await request('DELETE', key, [])
    },
  }
}

function mergeObjects(listed, uploaded) {
  const byKey = new Map()
  for (const object of listed) byKey.set(object.key, object)
  for (const object of uploaded) {
    if (!byKey.has(object.key)) byKey.set(object.key, object)
  }
  return [...byKey.values()]
}

function defaultLogger() {
  return {
    info(message) {
      console.log(message)
    },
    error(message) {
      console.error(message)
    },
  }
}

function wrapLogger(logger, secrets) {
  return {
    info(message) {
      logger.info(redactSecrets(String(message), secrets))
    },
    error(message) {
      logger.error(redactSecrets(String(message), secrets))
    },
  }
}

async function exportSnapshot(redis, when, logger) {
  const rdb = await redis.tryRdb()
  if (rdb && rdb.ok) return { ext: 'rdb', body: rdb.rdb, keyCount: null }
  if (!rdb || !rdb.syncRefused) throw new Error('redis-cli --rdb failed')
  logger.info('redis-cli --rdb refused SYNC; using SCAN, TYPE, TTL, and DUMP')
  const collected = await collectScanDump(redis)
  const payload = {
    format: 'chrono-redis-scan-dump-v1',
    exportedAt: when.toISOString(),
    keyCount: collected.keys.length,
    skipped: collected.skipped,
    keys: collected.keys,
  }
  return {
    ext: 'json',
    body: Buffer.from(JSON.stringify(payload), 'utf8'),
    keyCount: collected.keys.length,
  }
}

export async function runBackup(options) {
  const secrets = collectSecretValues(options.env ?? {})
  const logger = wrapLogger(options.logger ?? defaultLogger(), secrets)
  let redis
  try {
    const env = readEnv(options.env)
    redis = options.redis ?? createRedisReader(env.REDIS_URL, options.redisDeps)
    const s3 = options.s3 ?? createS3Client(env, { fetchImpl: options.fetchImpl, now: options.now })
    const now = options.now ?? (() => new Date())
    const when = now()
    if (!(when instanceof Date) || Number.isNaN(when.getTime())) throw new Error('backup clock is invalid')
    const exported = await exportSnapshot(redis, when, logger)
    const gzipped = gzipSync(exported.body)
    const key = objectKeyFor(when, exported.ext)
    const digest = sha256Hex(gzipped)
    const sidecar = sidecarKey(key)
    await s3.putObject({
      bucket: env.BUCKET,
      key,
      body: gzipped,
      contentType: 'application/gzip',
    })
    try {
      await s3.putObject({
        bucket: env.BUCKET,
        key: sidecar,
        body: Buffer.from(`${digest}  ${key}\n`, 'utf8'),
        contentType: 'text/plain; charset=utf-8',
      })
    } catch (error) {
      try {
        await s3.deleteObject({ bucket: env.BUCKET, key })
      } catch {
        // Leave the failed archive for the non-zero exit to surface.
      }
      throw error
    }
    const listed = await s3.listObjects({ bucket: env.BUCKET, prefix: PREFIX })
    const present = mergeObjects(listed, [
      { key, lastModified: when.toISOString() },
      { key: sidecar, lastModified: when.toISOString() },
    ])
    const doomed = selectKeysToDelete(present, { alwaysKeep: [key] })
    for (const doomedKey of doomed) {
      assertDeletableBackupKey(doomedKey)
      await s3.deleteObject({ bucket: env.BUCKET, key: doomedKey })
    }
    const keyCount = exported.keyCount == null ? 'snapshot' : String(exported.keyCount)
    logger.info(`redis weekly backup uploaded ${key} bytes=${gzipped.length} keys=${keyCount} pruned=${doomed.length}`)
    return { key, sidecar, pruned: doomed.length, ext: exported.ext, sha256: digest }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const safe = redactSecrets(message, secrets)
    logger.error(safe)
    if (error instanceof Error) {
      error.message = safe
      throw error
    }
    throw new Error(safe)
  } finally {
    if (redis && typeof redis.close === 'function') {
      try {
        await redis.close()
      } catch {
        // Closing Redis must not hide the backup result.
      }
    }
  }
}

export async function main(env = process.env) {
  try {
    await runBackup({ env })
  } catch {
    process.exitCode = 1
  }
}

const entry = process.argv[1]
if (entry && import.meta.url === pathToFileURL(entry).href) {
  await main()
}
