import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import {
  CONTAINER_LIST_CAP,
  REDIS_CONTAINER_KEY,
  pushAndTrimContainerList,
} from '../../mcp/lib/containerList'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * In-memory Redis list + pipeline. Commands apply on EXEC, matching MULTI.
 * LPUSH inserts at index 0. LTRIM keeps an inclusive index range.
 */
class MockRedis {
  readonly lists = new Map<string, string[]>()
  readonly hashes = new Map<string, Map<string, string>>()
  readonly commands: string[] = []

  multi(): MockPipeline {
    return new MockPipeline(this)
  }

  llen(key: string): number {
    return (this.lists.get(key) ?? []).length
  }
}

class MockPipeline {
  private queued: Array<() => void> = []

  constructor(private readonly redis: MockRedis) {}

  lpush(key: string, value: string): this {
    this.redis.commands.push('lpush')
    this.queued.push(() => {
      const list = this.redis.lists.get(key) ?? []
      list.unshift(value)
      this.redis.lists.set(key, list)
    })
    return this
  }

  ltrim(key: string, start: number, stop: number): this {
    this.redis.commands.push('ltrim')
    this.queued.push(() => {
      const list = this.redis.lists.get(key) ?? []
      const end = stop < 0 ? list.length + stop : stop
      this.redis.lists.set(key, list.slice(start, end + 1))
    })
    return this
  }

  hset(key: string, field: string, value: string): this {
    this.redis.commands.push('hset')
    this.queued.push(() => {
      const hash = this.redis.hashes.get(key) ?? new Map<string, string>()
      hash.set(field, value)
      this.redis.hashes.set(key, hash)
    })
    return this
  }

  exec(): Promise<unknown[]> {
    for (const command of this.queued) command()
    this.queued = []
    return Promise.resolve([])
  }
}

const PUSH_COUNT = 4450

interface TrimPath {
  name: string
  originValue: string
}

const TRIM_PATHS: TrimPath[] = [
  { name: 'govern persist', originValue: 'real' },
  { name: 'seed route', originValue: 'seed' },
  { name: 'ambient persist', originValue: 'real' },
]

async function pushThroughPath(redis: MockRedis, originValue: string): Promise<void> {
  for (let n = 0; n < PUSH_COUNT; n++) {
    const origin = { key: 'dynamo:containers:origin', field: `id-${n}`, value: originValue }
    await pushAndTrimContainerList(redis.multi(), JSON.stringify({ n }))
      .hset(origin.key, origin.field, origin.value)
      .exec()
  }
}

describe('container list cap', () => {
  it('uses one cap of 4444', () => {
    expect(CONTAINER_LIST_CAP).toBe(4444)
    expect(REDIS_CONTAINER_KEY).toBe('dynamo:containers')
  })

  it.each(TRIM_PATHS)('$name trims 4450 pushes down to 4444', async ({ originValue }) => {
    const redis = new MockRedis()
    await pushThroughPath(redis, originValue)

    const list = redis.lists.get(REDIS_CONTAINER_KEY) ?? []
    expect(list).toHaveLength(4444)
    expect(list).toHaveLength(CONTAINER_LIST_CAP)
    expect(JSON.parse(list[0]).n).toBe(PUSH_COUNT - 1)
    expect(JSON.parse(list[list.length - 1]).n).toBe(PUSH_COUNT - CONTAINER_LIST_CAP)
    expect(redis.commands.every((command) => command === 'lpush' || command === 'ltrim' || command === 'hset')).toBe(true)
    expect(redis.commands).not.toContain('expire')
    expect(redis.commands).not.toContain('del')
  })

  it('wires every container-list trim site through the shared cap', () => {
    const indexSource = readFileSync(join(repoRoot, 'mcp/index.ts'), 'utf8')
    const ambientSource = readFileSync(join(repoRoot, 'mcp/lib/ambientField.ts'), 'utf8')
    const capSource = readFileSync(join(repoRoot, 'mcp/lib/containerList.ts'), 'utf8')

    expect(indexSource.match(/pushAndTrimContainerList\(/g)).toHaveLength(2)
    expect(ambientSource.match(/pushAndTrimContainerList\(/g)).toHaveLength(1)
    expect(indexSource).not.toContain('MAX_REDIS_CONTAINERS')
    expect(ambientSource).not.toContain('MAX_REDIS_CONTAINERS')
    expect(indexSource).not.toContain('.ltrim(')
    expect(ambientSource).not.toContain('.ltrim(')
    expect(capSource).toContain('CONTAINER_LIST_CAP - 1')
    expect(capSource.match(/\.ltrim\(/g)).toHaveLength(1)
  })
})
