import { createHash } from 'node:crypto'
import { access, writeFile } from 'node:fs/promises'
import net from 'node:net'
import { gunzipSync } from 'node:zlib'
import { afterEach, describe, expect, it } from 'vitest'
import {
  assertDeletableBackupKey,
  assertRedisReadOnly,
  authorizeSigV4,
  buildRdbCliArgs,
  collectScanDump,
  createRedisReader,
  createS3Client,
  encodeCommand,
  exportRdbViaCli,
  isSyncRefused,
  objectKeyFor,
  parseListObjectsV2,
  parseRespMessage,
  redactSecrets,
  runBackup,
  selectKeysToDelete,
} from '../../bin/redis-weekly-backup.mjs'

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

type StoredObject = { key: string; body: Buffer; contentType: string }
type ListedObject = { key: string; lastModified: string }

type RedisReader = {
  tryRdb: () => Promise<{ ok: true; rdb: Buffer } | { ok: false; syncRefused: true }>
  scan?: (cursor: string) => Promise<{ cursor: string; keys: string[] }>
  type?: (key: string) => Promise<string>
  ttl?: (key: string) => Promise<number>
  dump?: (key: string) => Promise<Buffer | null>
  close?: () => Promise<void>
}

type S3Mock = {
  putObject: (input: { bucket: string; key: string; body: Buffer; contentType: string }) => Promise<void>
  listObjects: (input: { bucket: string; prefix: string }) => Promise<ListedObject[]>
  deleteObject: (input: { bucket: string; key: string }) => Promise<void>
}

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

function memoryS3(initial: ListedObject[] = []) {
  const objects = initial.map((object) => ({ ...object }))
  const puts: StoredObject[] = []
  const deleted: string[] = []
  const prefixes: string[] = []
  const client: S3Mock = {
    async putObject(input) {
      puts.push({ key: input.key, body: Buffer.from(input.body), contentType: input.contentType })
      objects.push({ key: input.key, lastModified: '2026-09-30T09:00:00.000Z' })
    },
    async listObjects(input) {
      prefixes.push(input.prefix)
      return objects.filter((object) => object.key.startsWith(input.prefix))
    },
    async deleteObject(input) {
      if (!input.key.startsWith('chrono-redis/')) throw new Error(`delete escaped prefix: ${input.key}`)
      deleted.push(input.key)
      const index = objects.findIndex((object) => object.key === input.key)
      if (index >= 0) objects.splice(index, 1)
    },
  }
  return { client, puts, deleted, prefixes, objects }
}

function archive(day: string) {
  const key = `chrono-redis/2026-01-${day}T090000Z.rdb.gz`
  return [
    { key, lastModified: `2026-01-${day}T09:00:00.000Z` },
    { key: `${key}.sha256`, lastModified: `2026-01-${day}T09:00:01.000Z` },
  ]
}

const servers: Array<{ close: () => Promise<void> }> = []

afterEach(async () => {
  while (servers.length > 0) {
    const server = servers.pop()
    if (server) await server.close()
  }
})

describe('redis weekly backup', () => {
  it('uploads a gzipped RDB at the timestamp key with a sha256 sidecar', async () => {
    const rdb = Buffer.concat([Buffer.from('REDIS0011'), Buffer.from([0x00, 0xff])])
    const s3 = memoryS3()
    const log = logger()
    const result = await runBackup({
      env: env(),
      now: () => new Date('2026-09-30T09:00:00.123Z'),
      logger: log,
      redis: {
        async tryRdb() {
          return { ok: true, rdb }
        },
        async scan() {
          throw new Error('SCAN must not run after an RDB export')
        },
        async close() {},
      },
      s3: s3.client,
    })

    expect(result.key).toBe('chrono-redis/2026-09-30T090000Z.rdb.gz')
    expect(result.ext).toBe('rdb')
    expect(s3.prefixes).toEqual(['chrono-redis/'])
    const archivePut = s3.puts.find((put) => put.key === result.key)
    const sidecarPut = s3.puts.find((put) => put.key === `${result.key}.sha256`)
    expect(archivePut?.contentType).toBe('application/gzip')
    expect(archivePut?.body.subarray(0, 2)).toEqual(Buffer.from([0x1f, 0x8b]))
    expect(gunzipSync(archivePut?.body ?? Buffer.alloc(0))).toEqual(rdb)
    const digest = createHash('sha256').update(archivePut?.body ?? Buffer.alloc(0)).digest('hex')
    expect(result.sha256).toBe(digest)
    expect(sidecarPut?.body.toString('utf8')).toBe(`${digest}  ${result.key}\n`)
    expect(log.lines.join('\n')).not.toContain(PASSWORD)
    expect(log.lines.join('\n')).not.toContain(SECRET_ACCESS_KEY)
    expect(log.lines.join('\n')).not.toContain(ACCESS_KEY_ID)
    expect(log.lines.join('\n')).toContain('keys=snapshot')
  })

  it('falls back to SCAN DUMP JSON when SYNC is refused', async () => {
    const calls: string[] = []
    const payload = Buffer.from([0x00, 0x0d, 0x0a, 0xff, 0x41])
    const s3 = memoryS3()
    const redis: RedisReader = {
      async tryRdb() {
        calls.push('RDB')
        return { ok: false, syncRefused: true }
      },
      async scan(cursor) {
        calls.push(`SCAN ${cursor}`)
        if (cursor === '0') return { cursor: '5', keys: ['proposal:1'] }
        if (cursor === '5') return { cursor: '0', keys: ['proposal:2', 'proposal:gone'] }
        throw new Error(`unexpected cursor ${cursor}`)
      },
      async type(key) {
        calls.push(`TYPE ${key}`)
        return key === 'proposal:gone' ? 'none' : 'hash'
      },
      async ttl(key) {
        calls.push(`TTL ${key}`)
        return key === 'proposal:1' ? 90 : -1
      },
      async dump(key) {
        calls.push(`DUMP ${key}`)
        return key === 'proposal:2' ? payload : Buffer.from('one')
      },
      async close() {},
    }

    const result = await runBackup({
      env: env(),
      now: () => new Date('2026-09-30T09:00:00.000Z'),
      logger: logger(),
      redis,
      s3: s3.client,
    })

    expect(result.key).toBe('chrono-redis/2026-09-30T090000Z.json.gz')
    expect(calls).toEqual([
      'RDB',
      'SCAN 0',
      'TYPE proposal:1',
      'TTL proposal:1',
      'DUMP proposal:1',
      'SCAN 5',
      'TYPE proposal:2',
      'TTL proposal:2',
      'DUMP proposal:2',
      'TYPE proposal:gone',
    ])
    expect(calls.join(' ')).not.toMatch(/BGSAVE|SAVE|SET|RESTORE|FLUSH/)
    const body = s3.puts.find((put) => put.key === result.key)?.body ?? Buffer.alloc(0)
    const parsed = JSON.parse(gunzipSync(body).toString('utf8')) as {
      format: string
      keyCount: number
      skipped: number
      keys: Array<{ key: string; type: string; ttl: number; dump: string }>
    }
    expect(parsed.format).toBe('chrono-redis-scan-dump-v1')
    expect(parsed.keyCount).toBe(2)
    expect(parsed.skipped).toBe(1)
    expect(parsed.keys).toEqual([
      { key: 'proposal:1', type: 'hash', ttl: 90, dump: Buffer.from('one').toString('base64') },
      { key: 'proposal:2', type: 'hash', ttl: -1, dump: payload.toString('base64') },
    ])
  })

  it('prunes to the newest 13 archives and only under the prefix', async () => {
    const seeded: ListedObject[] = []
    for (let day = 1; day <= 15; day += 1) {
      seeded.push(...archive(String(day).padStart(2, '0')))
    }
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
      redis: {
        async tryRdb() {
          return { ok: true, rdb: Buffer.from('REDIS0011ok') }
        },
        async close() {},
      },
      s3: s3.client,
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
    const remaining = s3.objects.map((object) => object.key)
    expect(remaining.filter((key) => /^chrono-redis\/\d{4}-\d{2}-\d{2}T\d{6}Z\.rdb\.gz$/.test(key))).toHaveLength(13)
    expect(remaining).toContain('chrono-redis/2026-09-30T090000Z.rdb.gz')
    expect(remaining).toContain('chrono-redis/2026-09-30T090000Z.rdb.gz.sha256')
    expect(remaining).toContain('elsewhere/keep-me.rdb.gz')
    expect(remaining).toContain('chrono-redis-not/2020-01-01T000000Z.rdb.gz')
    expect(remaining).toContain('chrono-redis/notes.txt')
    expect(remaining).not.toContain('chrono-redis/2026-01-01T090000Z.rdb.gz')

    const mixed = selectKeysToDelete([
      ...seeded,
      { key: 'chrono-redis/2026-09-30T090000Z.rdb.gz', lastModified: '2026-09-30T09:00:00.000Z' },
    ])
    expect(mixed.every((key) => key.startsWith('chrono-redis/'))).toBe(true)
    expect(mixed.some((key) => key.startsWith('elsewhere/'))).toBe(false)
    expect(mixed.some((key) => key.startsWith('chrono-redis-not/'))).toBe(false)
    expect(() => assertDeletableBackupKey('elsewhere/keep-me.rdb.gz')).toThrow(/outside chrono-redis/)
  })

  it('keeps the archive just uploaded when it is older than 13 existing copies', () => {
    const objects: ListedObject[] = []
    for (let day = 1; day <= 13; day += 1) {
      objects.push({ key: `chrono-redis/2026-09-${String(day).padStart(2, '0')}T090000Z.rdb.gz`, lastModified: '' })
    }
    const uploaded = 'chrono-redis/2026-01-01T090000Z.rdb.gz'
    objects.push({ key: uploaded, lastModified: '' })
    const doomed = selectKeysToDelete(objects, { alwaysKeep: [uploaded] })
    expect(doomed).not.toContain(uploaded)
    expect(doomed).toHaveLength(0)
    expect(selectKeysToDelete([
      { key: 'chrono-redis/2026-09-30T090000Z.rdb.gz', lastModified: '' },
      { key: 'chrono-redis/2026-10-01T090000Z.rdb.gz', lastModified: '' },
    ], { keep: 1 })).toEqual(['chrono-redis/2026-09-30T090000Z.rdb.gz'])
  })

  it('redacts Redis and bucket secrets from failure logs', async () => {
    const log = logger()
    const redisUrl = `redis://default:${PASSWORD}@redis.internal:6379`
    let thrown = ''
    try {
      await runBackup({
        env: env({ REDIS_URL: redisUrl }),
        logger: log,
        redis: {
          async tryRdb() {
            throw new Error(`connect failed ${redisUrl} token ${SECRET_ACCESS_KEY} id ${ACCESS_KEY_ID} endpoint ${ENDPOINT}`)
          },
          async close() {},
        },
        s3: memoryS3().client,
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
  })

  it('exits the attempt before Redis when env is missing and does not prune after an upload failure', async () => {
    let rdbCalls = 0
    const log = logger()
    const incomplete = { ...env(), SECRET_ACCESS_KEY: '   ' }
    await expect(runBackup({
      env: incomplete,
      logger: log,
      redis: {
        async tryRdb() {
          rdbCalls += 1
          return { ok: true, rdb: Buffer.from('REDIS0011ok') }
        },
      },
      s3: memoryS3().client,
    })).rejects.toThrow(/missing required env: SECRET_ACCESS_KEY/)
    expect(rdbCalls).toBe(0)
    expect(log.lines.join('\n')).toContain('missing required env: SECRET_ACCESS_KEY')
    expect(log.lines.join('\n')).not.toContain(PASSWORD)

    const s3 = memoryS3(archive('01'))
    await expect(runBackup({
      env: env(),
      logger: logger(),
      redis: {
        async tryRdb() {
          return { ok: true, rdb: Buffer.from('REDIS0011ok') }
        },
        async close() {},
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

  it('removes the archive if the sha256 sidecar upload fails', async () => {
    const s3 = memoryS3()
    let puts = 0
    await expect(runBackup({
      env: env(),
      now: () => new Date('2026-09-30T09:00:00.000Z'),
      logger: logger(),
      redis: {
        async tryRdb() {
          return { ok: true, rdb: Buffer.from('REDIS0011ok') }
        },
        async close() {},
      },
      s3: {
        async putObject(input) {
          puts += 1
          if (puts === 2) throw new Error('sidecar failed')
          await s3.client.putObject(input)
        },
        listObjects: s3.client.listObjects,
        deleteObject: s3.client.deleteObject,
      },
    })).rejects.toThrow(/sidecar failed/)
    expect(s3.deleted).toEqual(['chrono-redis/2026-09-30T090000Z.rdb.gz'])
  })

  it('refuses write commands and treats SYNC refusal separately from connection loss', () => {
    expect(assertRedisReadOnly('dump')).toBe('DUMP')
    expect(assertRedisReadOnly('SCAN')).toBe('SCAN')
    for (const command of ['BGSAVE', 'SAVE', 'SET', 'RESTORE', 'FLUSHALL', 'CONFIG', 'SYNC', 'PSYNC', 'EVAL']) {
      expect(() => assertRedisReadOnly(command)).toThrow(/read-only/)
    }
    expect(buildRdbCliArgs('redis://default:secret@example:6379', '/tmp/dump.rdb')).toEqual([
      '-u',
      'redis://default:secret@example:6379',
      '--rdb',
      '/tmp/dump.rdb',
    ])
    expect(isSyncRefused("ERR unknown command 'PSYNC'")).toBe(true)
    expect(isSyncRefused('NOPERM this user has no permissions to run the sync command')).toBe(true)
    expect(isSyncRefused('SYNC with master failed: closed')).toBe(true)
    expect(isSyncRefused('Could not connect to Redis: Connection refused')).toBe(false)
    expect(objectKeyFor(new Date('2026-09-30T09:00:00.999Z'), 'json')).toBe('chrono-redis/2026-09-30T090000Z.json.gz')
  })

  it('reads an RDB from redis-cli --rdb without BGSAVE and stops a non-SYNC failure', async () => {
    const redisUrl = 'redis://default:secret@example:6379'
    let rdbPath = ''
    const written = await exportRdbViaCli(redisUrl, async (command, args) => {
      expect(command).toBe('redis-cli')
      expect(args[0]).toBe('-u')
      expect(args[2]).toBe('--rdb')
      expect(args.map((arg: string) => arg.toLowerCase())).not.toContain('bgsave')
      expect(args.map((arg: string) => arg.toLowerCase())).not.toContain('save')
      rdbPath = String(args[3])
      await writeFile(rdbPath, Buffer.from('REDIS0011-from-cli'))
      return { code: 0, errorCode: null, stdout: '', stderr: '' }
    })
    expect(written.ok).toBe(true)
    if (written.ok) expect(written.rdb.toString('utf8')).toBe('REDIS0011-from-cli')
    await expect(access(rdbPath)).rejects.toThrow()

    const refused = await exportRdbViaCli(redisUrl, async () => ({
      code: 1,
      errorCode: null,
      stdout: '',
      stderr: "ERR unknown command 'PSYNC', with no subcommand",
    }))
    expect(refused).toEqual({ ok: false, syncRefused: true })

    await expect(exportRdbViaCli(redisUrl, async () => ({
      code: 1,
      errorCode: null,
      stdout: '',
      stderr: 'Could not connect to Redis: Connection refused',
    }))).rejects.toThrow(/redis-cli --rdb failed/)

    await expect(exportRdbViaCli(redisUrl, async () => ({
      code: null,
      errorCode: 'ENOENT',
      stdout: '',
      stderr: '',
    }))).rejects.toThrow(/redis-cli is not installed/)
  })

  it('parses RESP dumps that contain CRLF and stops a stalled SCAN', async () => {
    const dump = Buffer.from([0x00, 0x0d, 0x0a, 0xff])
    const frame = Buffer.concat([
      Buffer.from(`$${dump.length}\r\n`),
      dump,
      Buffer.from('\r\n'),
    ])
    const parsed = parseRespMessage(frame)
    expect(parsed?.value).toEqual(dump)
    expect(parseRespMessage(Buffer.from('$4\r\nab'))).toBeNull()
    const scan = parseRespMessage(Buffer.from('*2\r\n$1\r\n0\r\n*1\r\n$3\r\nfoo\r\n'))
    expect(scan?.value).toEqual([Buffer.from('0'), [Buffer.from('foo')]])
    expect(encodeCommand(['DUMP', 'proposal:1']).toString('utf8')).toContain('$4\r\nDUMP\r\n')

    await expect(collectScanDump({
      async scan() {
        return { cursor: '1', keys: [] }
      },
      async type() {
        return 'string'
      },
      async ttl() {
        return -1
      },
      async dump() {
        return Buffer.from('x')
      },
    }, { maxScanRounds: 2 })).rejects.toThrow(/SCAN did not finish/)
  })

  it('talks to Redis with read commands only when SYNC is refused', async () => {
    const commands: string[] = []
    const dump = Buffer.from([0x00, 0x0d, 0x0a, 0xff])
    const server = net.createServer((socket) => {
      let pending = Buffer.alloc(0)
      socket.on('data', (chunk) => {
        pending = Buffer.concat([pending, chunk])
        while (true) {
          const message = parseRespMessage(pending)
          if (!message || message.error) break
          pending = pending.subarray(message.next)
          const args = message.value as Buffer[]
          const name = args[0].toString('utf8').toUpperCase()
          commands.push(name)
          if (name === 'AUTH') {
            socket.write(Buffer.from('+OK\r\n'))
          } else if (name === 'SCAN') {
            socket.write(Buffer.from('*2\r\n$1\r\n0\r\n*1\r\n$13\r\nproposal:wire\r\n'))
          } else if (name === 'TYPE') {
            socket.write(Buffer.from('+hash\r\n'))
          } else if (name === 'TTL') {
            socket.write(Buffer.from(':15\r\n'))
          } else if (name === 'DUMP') {
            socket.write(Buffer.concat([Buffer.from(`$${dump.length}\r\n`), dump, Buffer.from('\r\n')]))
          } else if (name === 'QUIT') {
            socket.write(Buffer.from('+OK\r\n'))
            socket.end()
          } else {
            socket.write(Buffer.from('-ERR unsupported\r\n'))
          }
        }
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    servers.push({
      close: () => new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      }),
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('fake Redis did not bind')
    const log = logger()
    const s3 = memoryS3()
    const redis = createRedisReader(`redis://default:${PASSWORD}@127.0.0.1:${address.port}`, {
      async runCli() {
        return {
          code: 1,
          errorCode: null,
          stdout: '',
          stderr: 'SYNC with master failed: NOPERM this user has no permissions to run the sync command',
        }
      },
    })
    const result = await runBackup({
      env: env({ REDIS_URL: `redis://default:${PASSWORD}@127.0.0.1:${address.port}` }),
      now: () => new Date('2026-09-30T09:00:00.000Z'),
      logger: log,
      redis,
      s3: s3.client,
    })
    const body = gunzipSync(s3.puts.find((put) => put.key === result.key)?.body ?? Buffer.alloc(0)).toString('utf8')
    const parsed = JSON.parse(body) as { keys: Array<{ key: string; type: string; ttl: number; dump: string }> }
    expect(parsed.keys).toEqual([
      { key: 'proposal:wire', type: 'hash', ttl: 15, dump: dump.toString('base64') },
    ])
    expect(commands).toEqual(['AUTH', 'SCAN', 'TYPE', 'TTL', 'DUMP', 'QUIT'])
    expect(log.lines.join('\n')).not.toContain(PASSWORD)
  })

  it('signs S3 requests with the AWS SigV4 example and uses a virtual-hosted prefix', async () => {
    const signed = authorizeSigV4({
      method: 'GET',
      canonicalUri: '/test.txt',
      canonicalQuery: '',
      headers: {
        host: 'examplebucket.s3.amazonaws.com',
        range: 'bytes=0-9',
        'x-amz-content-sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        'x-amz-date': '20130524T000000Z',
      },
      payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      region: 'us-east-1',
      service: 's3',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      amzDate: '20130524T000000Z',
    })
    expect(signed.signature).toBe('f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41')

    const listed = parseListObjectsV2(`<?xml version="1.0"?>
      <ListBucketResult>
        <IsTruncated>true</IsTruncated>
        <NextContinuationToken>abc/def</NextContinuationToken>
        <Contents><Key>chrono-redis/a&amp;b.rdb.gz</Key><LastModified>2026-01-01T00:00:00.000Z</LastModified></Contents>
      </ListBucketResult>`)
    expect(listed.objects[0]?.key).toBe('chrono-redis/a&b.rdb.gz')
    expect(listed.nextToken).toBe('abc/def')

    const requests: Array<{ url: string; method: string; body: Buffer | undefined }> = []
    const page = (truncated: boolean, token: string, key: string) => `<?xml version="1.0"?>
      <ListBucketResult>
        <IsTruncated>${truncated}</IsTruncated>
        ${token ? `<NextContinuationToken>${token}</NextContinuationToken>` : ''}
        <Contents><Key>${key}</Key><LastModified>2026-01-01T00:00:00.000Z</LastModified></Contents>
        <Contents><Key>elsewhere/keep-me.rdb.gz</Key><LastModified>2020-01-01T00:00:00.000Z</LastModified></Contents>
      </ListBucketResult>`
    const fetchImpl = async (url: string, init: { method: string; body?: Buffer; headers: Record<string, string> }) => {
      requests.push({ url, method: init.method, body: init.body ? Buffer.from(init.body) : undefined })
      expect(url).not.toContain(SECRET_ACCESS_KEY)
      expect(init.headers.authorization).toContain('AWS4-HMAC-SHA256')
      if (init.method === 'PUT' || init.method === 'DELETE') return new Response(null, { status: init.method === 'DELETE' ? 204 : 200 })
      if (requests.filter((item) => item.method === 'GET').length === 1) {
        return new Response(page(true, 'abc/def', 'chrono-redis/2026-01-01T090000Z.rdb.gz'), { status: 200 })
      }
      return new Response(page(false, '', 'chrono-redis/2026-01-02T090000Z.json.gz'), { status: 200 })
    }
    const client = createS3Client(env(), {
      fetchImpl,
      now: () => new Date('2026-09-30T09:00:00.000Z'),
    })
    await client.putObject({
      bucket: BUCKET,
      key: 'chrono-redis/2026-09-30T090000Z.rdb.gz',
      body: Buffer.from('gzip-bytes'),
      contentType: 'application/gzip',
    })
    const objects = await client.listObjects({ bucket: BUCKET, prefix: 'chrono-redis/' })
    expect(objects.map((object) => object.key)).toEqual([
      'chrono-redis/2026-01-01T090000Z.rdb.gz',
      'elsewhere/keep-me.rdb.gz',
      'chrono-redis/2026-01-02T090000Z.json.gz',
      'elsewhere/keep-me.rdb.gz',
    ])
    expect(requests[0]?.url).toBe(`https://${BUCKET}.t3.storageapi.dev/chrono-redis/2026-09-30T090000Z.rdb.gz`)
    expect(requests[0]?.method).toBe('PUT')
    expect(requests[0]?.body?.toString('utf8')).toBe('gzip-bytes')
    expect(requests[1]?.url).toContain(`https://${BUCKET}.t3.storageapi.dev/?`)
    expect(requests[1]?.url).toContain('list-type=2')
    expect(requests[1]?.url).toContain('prefix=chrono-redis%2F')
    expect(requests[2]?.url).toContain('continuation-token=abc%2Fdef')
    await expect(client.deleteObject({ bucket: BUCKET, key: 'elsewhere/keep-me.rdb.gz' })).rejects.toThrow(/outside chrono-redis/)
    expect(requests.some((item) => item.url.includes('elsewhere'))).toBe(false)
  })
})
