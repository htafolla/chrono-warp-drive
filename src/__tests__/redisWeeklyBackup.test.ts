import { createHash } from 'node:crypto'
import { access, writeFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  assertDeletableBackupKey,
  buildRdbCliArgs,
  exportRdbViaCli,
  objectKeyFor,
  redactSecrets,
  runBackup,
  selectKeysToDelete,
} from '../../bin/redis-weekly-backup.mjs'

const aws4 = vi.hoisted(() => {
  const calls: Array<{ url: string; method: string; body?: Buffer }> = []
  const clients: Array<{ region: string; service?: string }> = []
  class AwsClient {
    constructor(options: { accessKeyId: string; secretAccessKey: string; region: string; service?: string }) {
      clients.push({ region: options.region, service: options.service })
    }
    async fetch(url: string | URL, init?: { method?: string; body?: Buffer }) {
      const method = init?.method ?? 'GET'
      calls.push({
        url: String(url),
        method,
        body: init?.body ? Buffer.from(init.body) : undefined,
      })
      if (method === 'GET') {
        return new Response('<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>', { status: 200 })
      }
      return new Response(null, { status: method === 'DELETE' ? 204 : 200 })
    }
  }
  return { calls, clients, AwsClient }
})

vi.mock('aws4fetch', () => ({ AwsClient: aws4.AwsClient }))

const PASSWORD = 'super-secret-password'
const ACCESS_KEY_ID = 'AKIAWEEKLYBACKUPEXAMPLE'
const SECRET_ACCESS_KEY = 'aws-secret-access-key-value-0123456789'
const ENDPOINT = 'https://t3.storageapi.dev'
const BUCKET = 'chrono-private-bucket'

type BackupEnv = {
  REDIS_URL: string
  BUCKET: string
  ACCESS_KEY_ID: string
  SECRET_ACCESS_KEY: string
  ENDPOINT: string
  REGION: string
}

type CliResult = { code: number | null; errorCode: string | null; stdout: string; stderr: string }
type ListedObject = { key: string; lastModified: string }
type StoredObject = { key: string; body: Buffer; contentType: string }

function env(overrides: Partial<BackupEnv> = {}): BackupEnv {
  return {
    REDIS_URL: `redis://default:${PASSWORD}@redis.internal:6379`,
    BUCKET,
    ACCESS_KEY_ID,
    SECRET_ACCESS_KEY,
    ENDPOINT,
    REGION: 'auto',
    ...overrides,
  }
}

function logger() {
  const lines: string[] = []
  return {
    lines,
    info(message: string) {
      lines.push(message)
    },
    error(message: string) {
      lines.push(message)
    },
  }
}

function versionThen(onRdb: (args: string[]) => Promise<CliResult> | CliResult) {
  return async (command: string, args: string[]): Promise<CliResult> => {
    expect(command).toBe('redis-cli')
    if (args[0] === '--version') {
      return { code: 0, errorCode: null, stdout: 'redis-cli 7.2.5\n', stderr: '' }
    }
    return onRdb(args)
  }
}

function memoryS3(initial: ListedObject[] = []) {
  const objects = initial.map((object) => ({ ...object }))
  const puts: StoredObject[] = []
  const deleted: string[] = []
  const prefixes: string[] = []
  const client = {
    async putObject(input: { bucket: string; key: string; body: Buffer; contentType: string }) {
      puts.push({ key: input.key, body: Buffer.from(input.body), contentType: input.contentType })
      objects.push({ key: input.key, lastModified: '2026-09-30T09:00:00.000Z' })
    },
    async listObjects(input: { bucket: string; prefix: string }) {
      prefixes.push(input.prefix)
      return objects.filter((object) => object.key.startsWith(input.prefix))
    },
    async deleteObject(input: { bucket: string; key: string }) {
      if (!input.key.startsWith('chrono-redis/')) throw new Error(`delete escaped prefix: ${input.key}`)
      deleted.push(input.key)
      const index = objects.findIndex((object) => object.key === input.key)
      if (index >= 0) objects.splice(index, 1)
    },
  }
  return { client, puts, deleted, prefixes, objects }
}

function archive(day: string): ListedObject[] {
  const key = `chrono-redis/2026-01-${day}T090000Z.rdb.gz`
  return [
    { key, lastModified: `2026-01-${day}T09:00:00.000Z` },
    { key: `${key}.sha256`, lastModified: `2026-01-${day}T09:00:01.000Z` },
  ]
}

beforeEach(() => {
  aws4.calls.length = 0
  aws4.clients.length = 0
})

describe('redis weekly backup', () => {
  it('uploads the gzipped RDB through aws4fetch at the dated key and prefix', async () => {
    const rdb = Buffer.concat([Buffer.from('REDIS0011'), Buffer.from([0x00, 0xff])])
    const log = logger()
    const result = await runBackup({
      env: env(),
      now: () => new Date('2026-09-30T09:00:00.123Z'),
      logger: log,
      redisDeps: {
        runCli: versionThen(async (args) => {
          expect(args).toEqual(['-u', env().REDIS_URL, '--rdb', args[3]])
          expect(args.map((arg) => arg.toLowerCase())).not.toContain('bgsave')
          await writeFile(args[3], rdb)
          return { code: 0, errorCode: null, stdout: '', stderr: '' }
        }),
      },
    })

    expect(result.key).toBe('chrono-redis/2026-09-30T090000Z.rdb.gz')
    expect(aws4.clients).toEqual([{ region: 'auto', service: 's3' }])
    const puts = aws4.calls.filter((call) => call.method === 'PUT')
    const lists = aws4.calls.filter((call) => call.method === 'GET')
    expect(puts.map((call) => call.url)).toEqual([
      `https://${BUCKET}.t3.storageapi.dev/chrono-redis/2026-09-30T090000Z.rdb.gz`,
      `https://${BUCKET}.t3.storageapi.dev/chrono-redis/2026-09-30T090000Z.rdb.gz.sha256`,
    ])
    expect(lists).toHaveLength(1)
    expect(lists[0]?.url.startsWith(`https://${BUCKET}.t3.storageapi.dev/?`)).toBe(true)
    expect(lists[0]?.url).toContain('prefix=chrono-redis%2F')
    expect(lists[0]?.url).not.toContain(SECRET_ACCESS_KEY)
    const archiveBody = puts[0]?.body ?? Buffer.alloc(0)
    expect(archiveBody.subarray(0, 2)).toEqual(Buffer.from([0x1f, 0x8b]))
    expect(gunzipSync(archiveBody)).toEqual(rdb)
    const digest = createHash('sha256').update(archiveBody).digest('hex')
    expect(result.sha256).toBe(digest)
    expect(puts[1]?.body?.toString('utf8')).toBe(`${digest}  ${result.key}\n`)
    expect(log.lines[0]).toBe('redis-cli 7.2.5')
    expect(log.lines.join('\n')).not.toContain(PASSWORD)
    expect(log.lines.join('\n')).not.toContain(SECRET_ACCESS_KEY)
    expect(log.lines.join('\n')).not.toContain(ACCESS_KEY_ID)
  })

  it('uploads nothing and prunes nothing when redis-cli --rdb or SYNC fails', async () => {
    const log = logger()
    const calls: string[][] = []
    await expect(runBackup({
      env: env(),
      logger: log,
      redisDeps: {
        runCli: async (command, args) => {
          calls.push([command, ...args])
          if (args[0] === '--version') return { code: 0, errorCode: null, stdout: 'redis-cli 7.2.5', stderr: '' }
          return { code: 1, errorCode: null, stdout: '', stderr: 'SYNC with master failed: connection reset' }
        },
      },
    })).rejects.toThrow(/redis-cli --rdb failed/)
    expect(aws4.calls).toEqual([])
    expect(aws4.clients).toEqual([])
    expect(calls.some((call) => call.includes('--rdb'))).toBe(true)
    expect(log.lines.join('\n')).toContain('redis-cli 7.2.5')
    expect(log.lines.join('\n')).not.toContain(PASSWORD)
  })

  it('stops before Redis and before aws4fetch when redis-cli --version fails', async () => {
    const calls: string[][] = []
    await expect(runBackup({
      env: env(),
      logger: logger(),
      redisDeps: {
        runCli: async (command, args) => {
          calls.push([command, ...args])
          return { code: null, errorCode: 'ENOENT', stdout: '', stderr: '' }
        },
      },
    })).rejects.toThrow(/redis-cli is not installed/)
    expect(calls).toEqual([['redis-cli', '--version']])
    expect(aws4.calls).toEqual([])
  })

  it('prunes to the newest 13 archives and only under the prefix', async () => {
    const seeded: ListedObject[] = []
    for (let day = 1; day <= 15; day += 1) seeded.push(...archive(String(day).padStart(2, '0')))
    seeded.push(
      { key: 'elsewhere/keep-me.rdb.gz', lastModified: '2020-01-01T00:00:00.000Z' },
      { key: 'chrono-redis-not/2020-01-01T000000Z.rdb.gz', lastModified: '2020-01-01T00:00:00.000Z' },
      { key: 'chrono-redis/notes.txt', lastModified: '2020-01-01T00:00:00.000Z' },
    )
    const s3 = memoryS3(seeded)
    const result = await runBackup({
      env: env(),
      now: () => new Date('2026-09-30T09:00:00.000Z'),
      logger: logger(),
      s3: s3.client,
      redisDeps: {
        runCli: versionThen(async (args) => {
          await writeFile(args[3], Buffer.from('REDIS0011ok'))
          return { code: 0, errorCode: null, stdout: '', stderr: '' }
        }),
      },
    })

    expect(result.pruned).toBe(6)
    expect(new Set(s3.deleted)).toEqual(new Set([
      'chrono-redis/2026-01-01T090000Z.rdb.gz',
      'chrono-redis/2026-01-02T090000Z.rdb.gz',
      'chrono-redis/2026-01-03T090000Z.rdb.gz',
      'chrono-redis/2026-01-01T090000Z.rdb.gz.sha256',
      'chrono-redis/2026-01-02T090000Z.rdb.gz.sha256',
      'chrono-redis/2026-01-03T090000Z.rdb.gz.sha256',
    ]))
    expect(s3.prefixes).toEqual(['chrono-redis/'])
    const remaining = s3.objects.map((object) => object.key)
    expect(remaining.filter((key) => /^chrono-redis\/\d{4}-\d{2}-\d{2}T\d{6}Z\.rdb\.gz$/.test(key))).toHaveLength(13)
    expect(remaining).toContain('elsewhere/keep-me.rdb.gz')
    expect(remaining).toContain('chrono-redis-not/2020-01-01T000000Z.rdb.gz')
    expect(remaining).toContain('chrono-redis/notes.txt')
    expect(aws4.calls).toEqual([])
    expect(() => assertDeletableBackupKey('elsewhere/keep-me.rdb.gz')).toThrow(/outside chrono-redis/)
  })

  it('keeps the archive just uploaded and sorts October after September', () => {
    const objects: ListedObject[] = []
    for (let day = 1; day <= 13; day += 1) {
      objects.push({ key: `chrono-redis/2026-09-${String(day).padStart(2, '0')}T090000Z.rdb.gz`, lastModified: '' })
    }
    const uploaded = 'chrono-redis/2026-01-01T090000Z.rdb.gz'
    objects.push({ key: uploaded, lastModified: '' })
    const doomed = selectKeysToDelete(objects, { alwaysKeep: [uploaded] })
    expect(doomed).not.toContain(uploaded)
    expect(selectKeysToDelete([
      { key: 'chrono-redis/2026-09-30T090000Z.rdb.gz', lastModified: '' },
      { key: 'chrono-redis/2026-10-01T090000Z.rdb.gz', lastModified: '' },
    ], { keep: 1 })).toEqual(['chrono-redis/2026-09-30T090000Z.rdb.gz'])
    expect(objectKeyFor(new Date('2026-09-30T09:00:00.999Z'))).toBe('chrono-redis/2026-09-30T090000Z.rdb.gz')
    expect(buildRdbCliArgs('redis://default:secret@example:6379', '/tmp/dump.rdb')).toEqual([
      '-u',
      'redis://default:secret@example:6379',
      '--rdb',
      '/tmp/dump.rdb',
    ])
  })

  it('redacts Redis and bucket secrets from failure logs', async () => {
    const log = logger()
    const redisUrl = `redis://default:${PASSWORD}@redis.internal:6379`
    let thrown = ''
    try {
      await runBackup({
        env: env({ REDIS_URL: redisUrl }),
        logger: log,
        redisDeps: {
          runCli: versionThen(() => {
            throw new Error(`connect failed ${redisUrl} token ${SECRET_ACCESS_KEY} id ${ACCESS_KEY_ID} endpoint ${ENDPOINT}`)
          }),
        },
      })
    } catch (error) {
      thrown = error instanceof Error ? error.message : String(error)
    }
    const blob = `${log.lines.join('\n')}\n${thrown}`
    expect(blob).not.toContain(PASSWORD)
    expect(blob).not.toContain(SECRET_ACCESS_KEY)
    expect(blob).not.toContain(ACCESS_KEY_ID)
    expect(blob).not.toContain(redisUrl)
    expect(blob).not.toContain(ENDPOINT)
    expect(blob).toContain('[redacted]')
    expect(redactSecrets(`url=${redisUrl}`, [redisUrl, PASSWORD])).toBe('url=[redacted]')
    expect(aws4.calls).toEqual([])
  })

  it('does not call redis-cli when env is missing and does not prune after an upload failure', async () => {
    let cliCalls = 0
    const log = logger()
    await expect(runBackup({
      env: { ...env(), SECRET_ACCESS_KEY: '   ' },
      logger: log,
      redisDeps: {
        runCli: async () => {
          cliCalls += 1
          return { code: 0, errorCode: null, stdout: 'redis-cli 7.2.5', stderr: '' }
        },
      },
    })).rejects.toThrow(/missing required env: SECRET_ACCESS_KEY/)
    expect(cliCalls).toBe(0)
    expect(log.lines.join('\n')).toContain('missing required env: SECRET_ACCESS_KEY')
    expect(log.lines.join('\n')).not.toContain(PASSWORD)
    expect(aws4.calls).toEqual([])

    const s3 = memoryS3(archive('01'))
    await expect(runBackup({
      env: env(),
      logger: logger(),
      redisDeps: {
        runCli: versionThen(async (args) => {
          await writeFile(args[3], Buffer.from('REDIS0011ok'))
          return { code: 0, errorCode: null, stdout: '', stderr: '' }
        }),
      },
      s3: {
        ...s3.client,
        async putObject() {
          throw new Error('bucket unavailable')
        },
      },
    })).rejects.toThrow(/bucket unavailable/)
    expect(s3.deleted).toEqual([])
    expect(s3.objects.map((object) => object.key)).toContain('chrono-redis/2026-01-01T090000Z.rdb.gz')
  })

  it('removes the new archive if the sha256 sidecar upload fails and leaves older copies', async () => {
    const s3 = memoryS3(archive('01'))
    let puts = 0
    await expect(runBackup({
      env: env(),
      now: () => new Date('2026-09-30T09:00:00.000Z'),
      logger: logger(),
      redisDeps: {
        runCli: versionThen(async (args) => {
          await writeFile(args[3], Buffer.from('REDIS0011ok'))
          return { code: 0, errorCode: null, stdout: '', stderr: '' }
        }),
      },
      s3: {
        async putObject(input: { bucket: string; key: string; body: Buffer; contentType: string }) {
          puts += 1
          if (puts === 2) throw new Error('sidecar failed')
          await s3.client.putObject(input)
        },
        listObjects: s3.client.listObjects,
        deleteObject: s3.client.deleteObject,
      },
    })).rejects.toThrow(/sidecar failed/)
    expect(s3.deleted).toEqual(['chrono-redis/2026-09-30T090000Z.rdb.gz'])
    expect(s3.objects.map((object) => object.key)).toContain('chrono-redis/2026-01-01T090000Z.rdb.gz')
  })

  it('reads an RDB from redis-cli --rdb and deletes the temp file', async () => {
    const redisUrl = 'redis://default:secret@example:6379'
    let rdbPath = ''
    const rdb = await exportRdbViaCli(redisUrl, async (command, args) => {
      expect(command).toBe('redis-cli')
      expect(args[2]).toBe('--rdb')
      expect(args.map((arg: string) => arg.toLowerCase())).not.toContain('bgsave')
      rdbPath = String(args[3])
      await writeFile(rdbPath, Buffer.from('REDIS0011-from-cli'))
      return { code: 0, errorCode: null, stdout: '', stderr: '' }
    })
    expect(rdb.toString('utf8')).toBe('REDIS0011-from-cli')
    await expect(access(rdbPath)).rejects.toThrow()
    await expect(exportRdbViaCli(redisUrl, async () => ({
      code: 1,
      errorCode: null,
      stdout: '',
      stderr: 'SYNC with master failed: closed',
    }))).rejects.toThrow(/redis-cli --rdb failed/)
  })
})
