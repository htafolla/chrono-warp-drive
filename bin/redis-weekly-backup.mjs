#!/usr/bin/env node
/**
 * Weekly point-in-time Redis export for a Railway cron service.
 *
 * Uses `redis-cli --rdb` only. That replication stream makes the Redis
 * primary fork. If redis-cli or SYNC/PSYNC fails, the process exits non-zero
 * and does not upload or prune. There is no SCAN/DUMP fallback.
 *
 * Required env (names only; values are never logged):
 *   REDIS_URL, BUCKET, ACCESS_KEY_ID, SECRET_ACCESS_KEY, ENDPOINT, REGION
 */

import { AwsClient } from 'aws4fetch'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

export const PREFIX = 'chrono-redis/'
export const RETENTION_COPIES = 13
const BACKUP_KEY_RE = /^chrono-redis\/\d{4}-\d{2}-\d{2}T\d{6}Z\.rdb\.gz$/
const REQUIRED_ENV = ['REDIS_URL', 'BUCKET', 'ACCESS_KEY_ID', 'SECRET_ACCESS_KEY', 'ENDPOINT', 'REGION']
const RDB_MAGIC = Buffer.from('REDIS')

export function buildRdbCliArgs(redisUrl, rdbPath) {
  return ['-u', redisUrl, '--rdb', rdbPath]
}

export function formatBackupStamp(date) {
  const iso = date.toISOString()
  return `${iso.slice(0, 10)}T${iso.slice(11, 19).replace(/:/g, '')}Z`
}

export function objectKeyFor(date) {
  return `${PREFIX}${formatBackupStamp(date)}.rdb.gz`
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
    if (!BACKUP_KEY_RE.test(parent) || keepSet.has(parent)) continue
    deletions.push(key)
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
      // readEnv reports an invalid URL without echoing the value.
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
  const source = env ?? {}
  const missing = REQUIRED_ENV.filter((name) => !source[name] || !String(source[name]).trim())
  if (missing.length > 0) throw new Error(`missing required env: ${missing.join(', ')}`)
  const values = {}
  for (const name of REQUIRED_ENV) values[name] = String(source[name]).trim()
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

export async function readRedisCliVersion(runCli) {
  const result = await runCli('redis-cli', ['--version'])
  if (result.errorCode === 'ENOENT') throw new Error('redis-cli is not installed')
  const text = `${result.stdout || ''}\n${result.stderr || ''}`.replace(/\s+/g, ' ').trim()
  if (result.code !== 0 || !text) throw new Error('redis-cli --version failed')
  return text
}

export async function exportRdbViaCli(redisUrl, runCli) {
  const dir = await mkdtemp(join(tmpdir(), 'chrono-rdb-'))
  const rdbPath = join(dir, 'dump.rdb')
  try {
    const result = await runCli('redis-cli', buildRdbCliArgs(redisUrl, rdbPath))
    if (result.errorCode === 'ENOENT') throw new Error('redis-cli is not installed')
    if (result.code !== 0) {
      const detail = `${result.stderr || ''}\n${result.stdout || ''}`.replace(/\s+/g, ' ').trim().slice(0, 300)
      throw new Error(`redis-cli --rdb failed (${result.code ?? 'unknown'}): ${detail}`)
    }
    const rdb = await readFile(rdbPath)
    if (rdb.length < 5 || !rdb.subarray(0, 5).equals(RDB_MAGIC)) {
      throw new Error('redis-cli --rdb did not write a Redis RDB file')
    }
    return rdb
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
  for (const block of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
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

function virtualHost(endpoint, bucket) {
  const base = new URL(endpoint)
  return base.hostname.startsWith(`${bucket}.`) ? base.host : `${bucket}.${base.host}`
}

function objectUrl(env, key, queryPairs) {
  const host = virtualHost(env.ENDPOINT, env.BUCKET)
  const path = key ? `/${key.split('/').map((part) => encodeURIComponent(part)).join('/')}` : '/'
  const url = new URL(`https://${host}${path}`)
  for (const [name, value] of queryPairs) url.searchParams.set(name, value)
  return url
}

export function createS3Client(env, deps = {}) {
  const Client = deps.AwsClient ?? AwsClient
  const aws = new Client({
    accessKeyId: env.ACCESS_KEY_ID,
    secretAccessKey: env.SECRET_ACCESS_KEY,
    region: env.REGION,
    service: 's3',
    retries: 2,
  })

  const expectBucket = (bucket) => {
    if (bucket !== env.BUCKET) throw new Error('refusing to use an unexpected bucket')
  }

  const request = async (method, key, queryPairs, body, contentType) => {
    const headers = {}
    if (contentType) headers['content-type'] = contentType
    const response = await aws.fetch(objectUrl(env, key, queryPairs), {
      method,
      headers,
      body: body ?? undefined,
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

export async function runBackup(options) {
  const secrets = collectSecretValues(options.env ?? {})
  const logger = wrapLogger(options.logger ?? defaultLogger(), secrets)
  const runCli = options.redisDeps?.runCli ?? defaultRunCli
  try {
    const env = readEnv(options.env)
    const version = await readRedisCliVersion(runCli)
    logger.info(version)
    const rdb = await exportRdbViaCli(env.REDIS_URL, runCli)
    const when = (options.now ?? (() => new Date()))()
    if (!(when instanceof Date) || Number.isNaN(when.getTime())) throw new Error('backup clock is invalid')
    const gzipped = gzipSync(rdb)
    const key = objectKeyFor(when)
    const digest = createHash('sha256').update(gzipped).digest('hex')
    const sidecar = sidecarKey(key)
    const s3 = options.s3 ?? createS3Client(env, options.s3Deps)
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
        // The non-zero exit is the signal that the archive has no sidecar.
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
    logger.info(`redis weekly backup uploaded ${key} bytes=${gzipped.length} pruned=${doomed.length}`)
    return { key, sidecar, pruned: doomed.length, sha256: digest }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const safe = redactSecrets(message, secrets)
    logger.error(safe)
    if (error instanceof Error) {
      error.message = safe
      throw error
    }
    throw new Error(safe)
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
