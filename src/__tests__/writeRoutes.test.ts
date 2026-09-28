import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChainExecutor, RegistryContainer } from '../../mcp/lib/chainPort'
import type { ContainerVortex } from '../../mcp/lib/temporalContainer'
import { ambientField } from '../../mcp/lib/ambientField.js'
import { clearRedisClientForTests, setRedisClientForTests } from '../../mcp/redisTestHooks'

const realSetTimeout = globalThis.setTimeout.bind(globalThis)

const counters = vi.hoisted(() => {
  delete process.env.REDIS_URL
  delete process.env.DEPLOYER_PRIVATE_KEY
  delete process.env.MCP_WRITE_API_KEY
  delete process.env.VORTEX_SIGNING_KEY
  return { deployerKeyReads: 0, directChainCalls: 0 }
})

vi.mock('../../mcp/lib/contractClient.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../mcp/lib/contractClient.js')>()
  return {
    ...actual,
    getPrivateKey: () => {
      counters.deployerKeyReads += 1
      throw new Error('DEPLOYER_PRIVATE_KEY read')
    },
    persistContainerToChain: async () => {
      counters.directChainCalls += 1
      counters.deployerKeyReads += 1
      throw new Error('persistContainerToChain called')
    },
  }
})

import { app, autoMintVortex, rememberContainerForTests, replayMintBacklog, resetBootMemoryForTests } from '../../mcp/index'
import { dynamoSolarGovernance } from '../../mcp/lib/dynamoSolarGovernance.js'
import { onChainMintId, setChainExecutorForTests } from '../../mcp/lib/chainPort'
import { VORTEX_TREASURY } from '../../mcp/lib/chainPort'
import {
  DEFAULT_MINT_GLOBAL_BUDGET,
  DEFAULT_MINT_GLOBAL_WINDOW_MS,
  MINT_ADDRESS_CAP,
  MINT_RATE_LIMIT,
  MINT_SIGNATURE_MAX_AHEAD_SECONDS,
  PERSIST_COOLDOWN_MS,
  mintGlobalBudget,
  mintGlobalWindowMs,
  resetWriteGuardsForTests,
  signVortex,
  signingKeyReadCount,
  throwOnNextVerifyForTests,
  verifyVortexSignature,
} from '../../mcp/lib/writeGate'

const WRITE_KEY = 'write-test-key'
const SIGN_KEY = 'sign-test-key'

class StubChain implements ChainExecutor {
  chainCalls = 0
  keyReads = 0
  reads: string[] = []
  mints: string[] = []
  persists = 0
  autoMints: string[] = []
  containers = new Map<string, RegistryContainer>()
  mintedOnChain = new Map<string, string>()
  failNextMint = false
  existingMintPairs: Array<{ containerId: string; containerHash: string }> = []
  existingHold: Promise<void> | null = null
  existingWaiters = 0
  existingMintErrorIds = new Set<string>()
  proposalTexts: string[] = []
  nextReceiptStatus: 'success' | 'reverted' = 'success'
  revertLeavesToken = false
  autoMintHold: Promise<void> | null = null
  autoMintEntered = 0
  readError: Error | null = null

  async readContainerExact(containerId: string): Promise<RegistryContainer | null> {
    this.chainCalls += 1
    this.reads.push(containerId)
    if (this.readError) {
      const error = this.readError
      this.readError = null
      throw error
    }
    return this.containers.get(containerId.toLowerCase()) ?? null
  }

  async persistStoredContainer(): Promise<{ txHash: string }> {
    this.keyReads += 1
    this.chainCalls += 1
    this.persists += 1
    return { txHash: '0x' + 'ab'.repeat(32) }
  }

  async persistGovernedContainer(): Promise<{ txHash: string }> {
    this.keyReads += 1
    this.chainCalls += 1
    this.persists += 1
    return { txHash: '0x' + 'cd'.repeat(32) }
  }

  async mintRegistered(input: { to: string; containerId: string; container: RegistryContainer }): Promise<{ txHash: string; tokenId: string | null }> {
    this.keyReads += 1
    this.chainCalls += 1
    if (this.failNextMint) {
      this.failNextMint = false
      throw new Error('mint reverted')
    }
    const mintId = onChainMintId(input.containerId)
    this.mints.push(mintId)
    this.mintedOnChain.set(mintId.toLowerCase(), '7')
    return { txHash: '0x' + '11'.repeat(32), tokenId: '7' }
  }

  async existingMint(containerId: string, containerHash: string): Promise<string | null> {
    this.existingMintPairs.push({ containerId, containerHash })
    if (this.existingHold) {
      this.existingWaiters += 1
      await this.existingHold
    }
    if (this.existingMintErrorIds.has(containerId.toLowerCase())) throw new Error('rpc down')
    const seen = new Set<string>()
    let found: string | null = null
    for (const key of [containerId, containerHash]) {
      const lower = key.toLowerCase()
      if (seen.has(lower)) continue
      seen.add(lower)
      this.chainCalls += 1
      const hit = this.mintedOnChain.get(lower) ?? null
      if (hit && !found) found = hit
    }
    return found
  }

  async autoMint(mintId: string, _container: ContainerVortex, proposalText: string): Promise<{ txHash: string; receiptStatus: 'success' | 'reverted' }> {
    this.proposalTexts.push(proposalText)
    this.autoMintEntered += 1
    if (this.autoMintHold) await this.autoMintHold
    if (this.nextReceiptStatus === 'reverted') {
      const leaveToken = this.revertLeavesToken
      this.nextReceiptStatus = 'success'
      this.revertLeavesToken = false
      if (leaveToken) this.mintedOnChain.set(mintId.toLowerCase(), '9')
      return { txHash: '0x' + '33'.repeat(32), receiptStatus: 'reverted' }
    }
    this.keyReads += 1
    this.chainCalls += 1
    this.autoMints.push(mintId)
    this.mintedOnChain.set(mintId.toLowerCase(), '8')
    return { txHash: '0x' + '22'.repeat(32), receiptStatus: 'success' }
  }
}

class MemoryRedis {
  lists = new Map<string, string[]>()
  hashes = new Map<string, Record<string, string>>()
  private kv = new Map<string, { value: string; expiresAt: number | null }>()

  private live(key: string): string | null {
    const row = this.kv.get(key)
    if (!row) return null
    if (row.expiresAt !== null && row.expiresAt <= Date.now()) {
      this.kv.delete(key)
      return null
    }
    return row.value
  }

  private list(key: string): string[] {
    const current = this.lists.get(key)
    if (current) return current
    const created: string[] = []
    this.lists.set(key, created)
    return created
  }

  async rpush(key: string, value: string): Promise<number> {
    const values = this.list(key)
    values.push(value)
    return values.length
  }

  async lpush(key: string, value: string): Promise<number> {
    const values = this.list(key)
    values.unshift(value)
    return values.length
  }

  async lpop(key: string): Promise<string | null> {
    const values = this.list(key)
    return values.shift() ?? null
  }

  async lindex(key: string, index: number): Promise<string | null> {
    return this.list(key)[index] ?? null
  }

  async lrange(key: string, start: number, end: number): Promise<string[]> {
    const values = this.list(key)
    const stop = end < 0 ? values.length + end : end
    return values.slice(start, stop + 1)
  }

  async ltrim(): Promise<string> {
    return 'OK'
  }

  async lrem(key: string, count: number, element: string): Promise<number> {
    const values = this.list(key)
    let removed = 0
    const removeAt = (index: number) => {
      values.splice(index, 1)
      removed += 1
    }
    if (count === 0) {
      for (let i = values.length - 1; i >= 0; i -= 1) {
        if (values[i] === element) removeAt(i)
      }
      return removed
    }
    if (count > 0) {
      for (let i = 0; i < values.length && removed < count;) {
        if (values[i] === element) removeAt(i)
        else i += 1
      }
      return removed
    }
    for (let i = values.length - 1; i >= 0 && removed < Math.abs(count); i -= 1) {
      if (values[i] === element) removeAt(i)
    }
    return removed
  }

  async get(key: string): Promise<string | null> {
    return this.live(key)
  }

  async del(key: string): Promise<number> {
    return this.kv.delete(key) ? 1 : 0
  }

  async set(key: string, value: string, ...rest: Array<string | number>): Promise<'OK' | null> {
    const args = rest.map((part) => String(part))
    const nx = args.includes('NX')
    const exists = this.live(key) !== null
    if (nx && exists) return null
    if (args.includes('XX') && !exists) return null
    let expiresAt: number | null = null
    const pxAt = args.indexOf('PX')
    if (pxAt >= 0) expiresAt = Date.now() + Number(args[pxAt + 1])
    this.kv.set(key, { value, expiresAt })
    return 'OK'
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.hashes.get(key) ?? {}
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    const hash = this.hashes.get(key) ?? {}
    hash[field] = value
    this.hashes.set(key, hash)
    return 1
  }

  multi(): MemoryRedisMulti {
    return new MemoryRedisMulti(this)
  }
}

class MemoryRedisMulti {
  private ops: Array<() => Promise<unknown>> = []

  constructor(private readonly redis: MemoryRedis) {}

  lpush(key: string, value: string): this {
    this.ops.push(() => this.redis.lpush(key, value))
    return this
  }

  rpush(key: string, value: string): this {
    this.ops.push(() => this.redis.rpush(key, value))
    return this
  }

  ltrim(): this {
    this.ops.push(async () => 'OK')
    return this
  }

  hset(key: string, field: string, value: string): this {
    this.ops.push(() => this.redis.hset(key, field, value))
    return this
  }

  async exec(): Promise<Array<[null, unknown]>> {
    const results: Array<[null, unknown]> = []
    for (const op of this.ops) results.push([null, await op()])
    return results
  }
}

const MINT_BACKLOG_KEY = 'vortex:mint:backlog'

async function flushTicks(times = 8): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await new Promise<void>((resolve) => { realSetTimeout(resolve, 0) })
  }
}

async function waitForAutoMint(count: number): Promise<void> {
  vi.useRealTimers()
  for (let i = 0; i < 40; i += 1) {
    if (stub.autoMints.length >= count) return
    await new Promise<void>((resolve) => { realSetTimeout(resolve, 0) })
  }
  throw new Error(`auto-mint did not finish; saw ${stub.autoMints.length}`)
}

let stub: StubChain
let seq = 0

function bytes32(n: number): string {
  return '0x' + n.toString(16).padStart(64, '0')
}

function address(n: number): string {
  return '0x' + n.toString(16).padStart(40, '0')
}

function nextId(): string {
  seq += 1
  return bytes32(seq)
}

function registryContainer(id: string, hash: string): RegistryContainer {
  const one = 10n ** 18n
  return {
    containerId: id,
    timestamp: 1_700_000_000n,
    source: 'human',
    containerHash: hash,
    hammerReason: 'test',
    resonanceProfile: {
      verdict: 'PASS',
      fullBox7DComposite: one,
      waveProximity: one,
      phaseAlignment: one,
      calibratedVortex: one,
      calibratedSync: one,
      neuralProximity: one,
      neuralVortex: one,
      gematriaResonance: one,
    },
    moralOverlay: {
      trinitariumMoralScore: one,
      trinitariumGematriaFusion: one,
      moralNumerologicalTension: 'Mild',
      virtueAlignment: one,
      moralSafety: one,
      intentAlignment: one,
    },
  }
}

function sampleVortex(id: string, hash: string): ContainerVortex {
  return {
    containerId: id,
    timestamp: 1_700_000_000,
    proposalHash: bytes32(9),
    solarSnapshot: {
      timestamp: 1_700_000_000,
      activityLevel: 'quiet',
      xrayFlux: 0,
      kpIndex: 0,
      protonFlux: 0,
      magnetometer: 0,
      solarTdf: 0,
    },
    resonanceProfile: {
      fullBox7DComposite: 0.8,
      fullBox7DVerdict: 'PASS',
      waveProximity: 0.8,
      phaseAlignment: 0.8,
      calibratedVortex: 0.8,
      calibratedSync: 0.8,
      neuralProximity: 0.8,
      neuralVortex: 0.8,
      gematriaResonance: 0.8,
      structuralResonance: 0.8,
      verdict: 'PASS',
      confidence: 0.9,
    },
    moralOverlay: {
      trinitariumMoralScore: 0.7,
      virtueAlignment: 0.7,
      moralSafety: 0.7,
      intentAlignment: 0.7,
      trinitariumGematriaFusion: 0.5,
      moralNumerologicalTension: 'Mild',
    },
    hammerReason: 'test',
    previousContainerHash: '0x' + '00'.repeat(32),
    containerHash: hash,
    source: 'human',
  }
}

function futureExpiry(seconds = 3600): number {
  return Math.floor(Date.now() / 1000) + seconds
}

function signedMint(id: string, hash: string, to: string, expiresAt = futureExpiry()) {
  return {
    containerId: id,
    containerHash: hash,
    to,
    expiresAt,
    signature: signVortex(hash, id, to, expiresAt, SIGN_KEY),
  }
}

function authHeader(key = WRITE_KEY): Record<string, string> {
  return { authorization: `Bearer ${key}` }
}

function expectNoChainOrKey(chainBefore = 0, keyBefore = 0): void {
  expect(stub.chainCalls).toBe(chainBefore)
  expect(stub.keyReads).toBe(keyBefore)
  expect(counters.deployerKeyReads).toBe(0)
  expect(counters.directChainCalls).toBe(0)
}

async function postJson(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  const json = await res.json() as Record<string, unknown>
  return { status: res.status, json }
}

async function mint(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return postJson('/vortex/mint', body, headers)
}

beforeEach(() => {
  vi.useRealTimers()
  ambientField.stop()
  clearRedisClientForTests()
  counters.deployerKeyReads = 0
  counters.directChainCalls = 0
  resetWriteGuardsForTests()
  process.env.MCP_WRITE_API_KEY = WRITE_KEY
  process.env.VORTEX_SIGNING_KEY = SIGN_KEY
  delete process.env.MINT_GLOBAL_BUDGET
  delete process.env.MINT_GLOBAL_WINDOW_MS
  delete process.env.ALLOW_SEED_ROUTE
  delete process.env.DEPLOYER_PRIVATE_KEY
  delete process.env.REDIS_URL
  stub = new StubChain()
  setChainExecutorForTests(stub)
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new Error('outbound network blocked in write-route tests')
  }))
})

afterEach(() => {
  vi.useRealTimers()
  ambientField.stop()
  clearRedisClientForTests()
  setChainExecutorForTests(null)
  vi.unstubAllGlobals()
})

describe('signed vortexes', () => {
  it('rejects /vortex/mint when the signing key is unset, with 0 chain calls and 0 key reads', async () => {
    delete process.env.VORTEX_SIGNING_KEY
    const id = nextId()
    const hash = nextId()
    const { status, json } = await mint({
      containerId: id,
      containerHash: hash,
      to: address(1),
      expiresAt: futureExpiry(),
      signature: 'ab'.repeat(32),
    }, authHeader())
    expect(status).toBe(503)
    expect(json.success).toBe(false)
    expectNoChainOrKey()
    expect(stub.reads).toEqual([])
    expect(stub.mints).toEqual([])
  })

  it('rejects a missing or wrong signature before any chain call or deployer key read', async () => {
    const id = nextId()
    const hash = nextId()
    const missing = await mint({ containerId: id, containerHash: hash, to: address(1) }, authHeader())
    expect(missing.status).toBe(400)
    expectNoChainOrKey()

    const wrong = await mint({
      containerId: id,
      containerHash: hash,
      to: address(1),
      expiresAt: futureExpiry(),
      signature: 'cd'.repeat(32),
    }, authHeader())
    expect(wrong.status).toBe(401)
    expectNoChainOrKey()
    expect(stub.reads).toEqual([])
  })

  it('accepts only an HMAC over containerHash, containerId, recipient, and expiry', async () => {
    const id = nextId()
    const hash = nextId()
    const to = address(1)
    const expiresAt = futureExpiry()
    stub.containers.set(id.toLowerCase(), registryContainer(id, hash))
    const signature = signVortex(hash, id, to, expiresAt, SIGN_KEY)
    expect(verifyVortexSignature(hash, id, to, expiresAt, signature, SIGN_KEY)).toEqual({ ok: true })
    expect(verifyVortexSignature(hash, id, to, expiresAt, signature, null)).toEqual({ ok: false, reason: 'invalid' })
    expect(verifyVortexSignature(hash, nextId(), to, expiresAt, signature, SIGN_KEY).reason).toBe('invalid')
    expect(verifyVortexSignature(hash, id, address(9), expiresAt, signature, SIGN_KEY).reason).toBe('invalid')
    expect(verifyVortexSignature(hash, id, to, expiresAt, 'aa', SIGN_KEY).reason).toBe('invalid')
    const now = Math.floor(Date.now() / 1000)
    const expiredSig = signVortex(hash, id, to, now, SIGN_KEY)
    expect(verifyVortexSignature(hash, id, to, now, expiredSig, SIGN_KEY, now).reason).toBe('expired')

    const { status, json } = await mint(signedMint(id, hash, to, expiresAt), authHeader())
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect(stub.reads).toEqual([id])
    expect(stub.mints).toEqual([id])
    expect(counters.deployerKeyReads).toBe(0)
    expect(counters.directChainCalls).toBe(0)
  })
})

describe('exact mint lookup', () => {
  it('does not mint a prefix, a store-only id, or a neighbor id', async () => {
    const full = nextId()
    const hash = nextId()
    stub.containers.set(full.toLowerCase(), registryContainer(full, hash))
    const prefix = full.slice(0, 18)
    const prefixExpiry = futureExpiry()
    const prefixRes = await mint({
      containerId: prefix,
      containerHash: hash,
      to: address(1),
      expiresAt: prefixExpiry,
      signature: signVortex(hash, prefix, address(1), prefixExpiry, SIGN_KEY),
    }, authHeader())
    expect(prefixRes.status).toBe(400)
    expectNoChainOrKey()
    expect(stub.reads).toEqual([])
    expect(stub.mints).toEqual([])

    const unknown = nextId()
    const unknownHash = nextId()
    const miss = await mint(signedMint(unknown, unknownHash, address(1)), authHeader())
    expect(miss.status).toBe(404)
    expect(stub.reads).toEqual([unknown])
    expect(stub.mints).toEqual([])
    expect(stub.persists).toBe(0)
    expect(stub.keyReads).toBe(0)
    expect(counters.deployerKeyReads).toBe(0)
    expect(counters.directChainCalls).toBe(0)

    const neighbor = bytes32(0xabcdef)
    const neighborHash = nextId()
    const near = await mint(signedMint(neighbor, neighborHash, address(1)), authHeader())
    expect(near.status).toBe(404)
    expect(stub.reads).toEqual([unknown, neighbor])
    expect(stub.mints).toEqual([])
    expect(stub.keyReads).toBe(0)
    expect(counters.deployerKeyReads).toBe(0)

    const mismatchId = nextId()
    const signedHash = nextId()
    const registryHash = nextId()
    stub.containers.set(mismatchId.toLowerCase(), registryContainer(mismatchId, registryHash))
    const mismatch = await mint(signedMint(mismatchId, signedHash, address(1)), authHeader())
    expect(mismatch.status).toBe(401)
    expect(String(mismatch.json.error)).toMatch(/does not match/i)
    expect(stub.mints).toEqual([])
    expect(stub.keyReads).toBe(0)
    expect(counters.deployerKeyReads).toBe(0)
  })
})

describe('mint abuse limits', () => {
  it('rate-limits the next mint with 0 chain calls and 0 key reads', async () => {
    const to = address(2)
    for (let i = 0; i < MINT_RATE_LIMIT; i++) {
      const id = nextId()
      const hash = nextId()
      stub.containers.set(id.toLowerCase(), registryContainer(id, hash))
      const res = await mint(signedMint(id, hash, to), authHeader())
      expect(res.status).toBe(200)
    }
    const chainBefore = stub.chainCalls
    const keyBefore = stub.keyReads
    const signingBefore = signingKeyReadCount()
    const blockedId = nextId()
    const blockedHash = nextId()
    const blocked = await mint(signedMint(blockedId, blockedHash, to), authHeader())
    expect(blocked.status).toBe(429)
    expectNoChainOrKey(chainBefore, keyBefore)
    expect(signingKeyReadCount()).toBe(signingBefore)
    expect(stub.mints).toHaveLength(MINT_RATE_LIMIT)
  })

  it('enforces the per-address cap with 0 chain calls and 0 key reads', async () => {
    const to = address(3)
    for (let i = 0; i < MINT_ADDRESS_CAP; i++) {
      const id = nextId()
      const hash = nextId()
      stub.containers.set(id.toLowerCase(), registryContainer(id, hash))
      const res = await mint(signedMint(id, hash, to), { ...authHeader(), 'x-forwarded-for': `10.0.0.${i + 1}` })
      expect(res.status).toBe(200)
    }
    const chainBefore = stub.chainCalls
    const keyBefore = stub.keyReads
    const id = nextId()
    const hash = nextId()
    const blocked = await mint(signedMint(id, hash, to), { ...authHeader(), 'x-forwarded-for': '10.1.0.9' })
    expect(blocked.status).toBe(429)
    expect(String(blocked.json.error)).toContain('cap')
    expectNoChainOrKey(chainBefore, keyBefore)
  })

  it('refuses a second token for the same containerId from mint and autoMint before any chain call', async () => {
    const id = nextId()
    const hash = nextId()
    stub.containers.set(id.toLowerCase(), registryContainer(id, hash))
    const first = await mint(signedMint(id, hash, address(4)), authHeader())
    expect(first.status).toBe(200)
    const chainBefore = stub.chainCalls
    const keyBefore = stub.keyReads
    const signingBefore = signingKeyReadCount()

    const secondExpiry = futureExpiry()
    const second = await mint({
      containerId: id,
      containerHash: hash,
      to: address(5),
      expiresAt: secondExpiry,
      signature: signVortex(hash, id, address(5), secondExpiry, SIGN_KEY),
    }, authHeader())
    expect(second.status).toBe(409)
    expectNoChainOrKey(chainBefore, keyBefore)
    expect(signingKeyReadCount()).toBe(signingBefore)

    const auto = await autoMintVortex(sampleVortex(id, hash), 'again')
    expect(auto).toBeNull()
    expectNoChainOrKey(chainBefore, keyBefore)
    expect(stub.autoMints).toEqual([])
  })

  it('autoMintVortex uses the same cap and will not call the chain once the container is reserved', async () => {
    const firstId = nextId()
    const first = await autoMintVortex(sampleVortex(firstId, nextId()), 'first')
    expect(first).toBe('0x' + '22'.repeat(32))
    expect(stub.autoMints).toEqual([firstId])
    const chainBefore = stub.chainCalls
    const keyBefore = stub.keyReads
    const again = await autoMintVortex(sampleVortex(firstId, nextId()), 'second')
    expect(again).toBeNull()
    expectNoChainOrKey(chainBefore, keyBefore)

    const mintedId = nextId()
    await autoMintVortex(sampleVortex(mintedId, nextId()), 'claimed')
    const after = stub.chainCalls
    const keys = stub.keyReads
    const http = await mint({
      containerId: mintedId,
      containerHash: nextId(),
      to: address(6),
      expiresAt: futureExpiry(),
      signature: 'ee'.repeat(32),
    }, authHeader())
    expect(http.status).toBe(409)
    expectNoChainOrKey(after, keys)
  })

  it('rejects a copied signature when the recipient changes, with 0 chain calls', async () => {
    const id = nextId()
    const hash = nextId()
    const to = address(11)
    const other = address(12)
    const expiresAt = futureExpiry()
    stub.containers.set(id.toLowerCase(), registryContainer(id, hash))
    const copied = await mint({
      containerId: id,
      containerHash: hash,
      to: other,
      expiresAt,
      signature: signVortex(hash, id, to, expiresAt, SIGN_KEY),
    }, authHeader())
    expect(copied.status).toBe(401)
    expect(String(copied.json.error)).toBe('Invalid vortex signature')
    expectNoChainOrKey()
    expect(stub.mints).toEqual([])

    const original = await mint(signedMint(id, hash, to, expiresAt), authHeader())
    expect(original.status).toBe(200)
    expect(stub.mints).toEqual([id])
  })

  it('rejects a copied signature after the expiry has passed, with 0 chain calls', async () => {
    const id = nextId()
    const hash = nextId()
    const to = address(13)
    const expiresAt = Math.floor(Date.now() / 1000) - 5
    stub.containers.set(id.toLowerCase(), registryContainer(id, hash))
    process.env.MINT_GLOBAL_BUDGET = '1'
    const copied = await mint({
      containerId: id,
      containerHash: hash,
      to,
      expiresAt,
      signature: signVortex(hash, id, to, expiresAt, SIGN_KEY),
    }, authHeader())
    expect(copied.status).toBe(401)
    expect(String(copied.json.error)).toMatch(/expired/i)
    expectNoChainOrKey()
    expect(stub.mints).toEqual([])

    const freshId = nextId()
    const freshHash = nextId()
    stub.containers.set(freshId.toLowerCase(), registryContainer(freshId, freshHash))
    const later = await mint(signedMint(freshId, freshHash, address(14)), {
      ...authHeader(),
      'x-forwarded-for': '10.13.0.2',
    })
    expect(later.status).toBe(200)
    expect(stub.mints).toEqual([freshId])
  })

  it('blocks on the global mint budget before any chain call or signing-key read', async () => {
    expect(mintGlobalBudget()).toBe(DEFAULT_MINT_GLOBAL_BUDGET)
    expect(mintGlobalWindowMs()).toBe(DEFAULT_MINT_GLOBAL_WINDOW_MS)
    process.env.MINT_GLOBAL_BUDGET = 'nope'
    process.env.MINT_GLOBAL_WINDOW_MS = '0'
    expect(mintGlobalBudget()).toBe(DEFAULT_MINT_GLOBAL_BUDGET)
    expect(mintGlobalWindowMs()).toBe(DEFAULT_MINT_GLOBAL_WINDOW_MS)

    process.env.MINT_GLOBAL_BUDGET = '2'
    for (let i = 0; i < 2; i++) {
      const id = nextId()
      const hash = nextId()
      stub.containers.set(id.toLowerCase(), registryContainer(id, hash))
      const res = await mint(signedMint(id, hash, address(20 + i)), {
        ...authHeader(),
        'x-forwarded-for': `10.20.0.${i + 1}`,
      })
      expect(res.status).toBe(200)
    }
    const chainBefore = stub.chainCalls
    const keyBefore = stub.keyReads
    const signingBefore = signingKeyReadCount()
    const blockedId = nextId()
    const blockedHash = nextId()
    const blocked = await mint(signedMint(blockedId, blockedHash, address(29)), {
      ...authHeader(),
      'x-forwarded-for': '10.20.0.9',
    })
    expect(blocked.status).toBe(429)
    expect(String(blocked.json.error)).toBe('Mint budget exceeded')
    expectNoChainOrKey(chainBefore, keyBefore)
    expect(signingKeyReadCount()).toBe(signingBefore)
    expect(stub.mints).toHaveLength(2)
    expect(stub.reads).toHaveLength(2)
  })

  it('lets the global window expire before another mint is allowed', async () => {
    process.env.MINT_GLOBAL_BUDGET = '1'
    process.env.MINT_GLOBAL_WINDOW_MS = '1000'
    const now = vi.spyOn(Date, 'now')
    try {
      now.mockReturnValue(1_700_000_000_000)
      const expiresAt = 1_700_003_600
      const id = nextId()
      const hash = nextId()
      stub.containers.set(id.toLowerCase(), registryContainer(id, hash))
      const first = await mint(signedMint(id, hash, address(30), expiresAt), {
        ...authHeader(),
        'x-forwarded-for': '10.30.0.1',
      })
      expect(first.status).toBe(200)

      const chainBefore = stub.chainCalls
      const keyBefore = stub.keyReads
      const signingBefore = signingKeyReadCount()
      const blocked = await mint(signedMint(nextId(), nextId(), address(31), expiresAt), {
        ...authHeader(),
        'x-forwarded-for': '10.30.0.2',
      })
      expect(blocked.status).toBe(429)
      expect(String(blocked.json.error)).toBe('Mint budget exceeded')
      expectNoChainOrKey(chainBefore, keyBefore)
      expect(signingKeyReadCount()).toBe(signingBefore)

      now.mockReturnValue(1_700_000_000_000 + 1000)
      const laterId = nextId()
      const laterHash = nextId()
      stub.containers.set(laterId.toLowerCase(), registryContainer(laterId, laterHash))
      const later = await mint(signedMint(laterId, laterHash, address(32), expiresAt), {
        ...authHeader(),
        'x-forwarded-for': '10.30.0.3',
      })
      expect(later.status).toBe(200)
      expect(stub.mints).toEqual([id, laterId])
    } finally {
      now.mockRestore()
    }
  })

  it('counts auto-mint in the global budget and blocks the next mint before the chain', async () => {
    process.env.MINT_GLOBAL_BUDGET = '1'
    const tx = await autoMintVortex(sampleVortex(nextId(), nextId()), 'budget')
    expect(tx).toBe('0x' + '22'.repeat(32))
    const chainBefore = stub.chainCalls
    const keyBefore = stub.keyReads
    const signingBefore = signingKeyReadCount()
    const id = nextId()
    const hash = nextId()
    stub.containers.set(id.toLowerCase(), registryContainer(id, hash))
    const blocked = await mint(signedMint(id, hash, address(40)), {
      ...authHeader(),
      'x-forwarded-for': '10.40.0.1',
    })
    expect(blocked.status).toBe(429)
    expect(String(blocked.json.error)).toBe('Mint budget exceeded')
    expectNoChainOrKey(chainBefore, keyBefore)
    expect(signingKeyReadCount()).toBe(signingBefore)
    expect(stub.mints).toEqual([])
  })

  it('refuses a user mint after the same container was auto-minted to the treasury', async () => {
    const id = nextId()
    const hash = nextId()
    stub.containers.set(id.toLowerCase(), registryContainer(id, hash))
    const tx = await autoMintVortex(sampleVortex(id, hash), 'treasury')
    expect(tx).toBe('0x' + '22'.repeat(32))
    expect(stub.autoMints).toEqual([id])
    const chainBefore = stub.chainCalls
    const keyBefore = stub.keyReads
    const signingBefore = signingKeyReadCount()
    const user = await mint(signedMint(id, hash, address(41)), {
      ...authHeader(),
      'x-forwarded-for': '10.41.0.1',
    })
    expect(user.status).toBe(409)
    expect(String(user.json.error)).toContain('already')
    expectNoChainOrKey(chainBefore, keyBefore)
    expect(signingKeyReadCount()).toBe(signingBefore)
    expect(stub.mints).toEqual([])
  })

  it('refuses a signed mint after auto-mint and a simulated restart, with no second mint call', async () => {
    const id = nextId()
    const hash = nextId()
    stub.containers.set(id.toLowerCase(), registryContainer(id, hash))
    const tx = await autoMintVortex(sampleVortex(id, hash), 'treasury')
    expect(tx).toBe('0x' + '22'.repeat(32))
    expect(stub.autoMints).toEqual([onChainMintId(id)])
    expect(onChainMintId(id).toLowerCase()).not.toBe(hash.toLowerCase())
    resetWriteGuardsForTests()
    const mintsBefore = stub.mints.length
    const signed = await mint(signedMint(id, hash, VORTEX_TREASURY), {
      ...authHeader(),
      'x-forwarded-for': '10.50.0.1',
    })
    expect(signed.status).toBe(409)
    expect(String(signed.json.error)).toContain('already')
    expect(stub.mints).toHaveLength(mintsBefore)
    expect(stub.keyReads).toBe(1)
    expect(counters.deployerKeyReads).toBe(0)
    expect(counters.directChainCalls).toBe(0)

    const routeId = nextId()
    const routeHash = nextId()
    const autoId = nextId()
    const autoHash = nextId()
    stub.containers.set(routeId.toLowerCase(), registryContainer(routeId, routeHash))
    stub.containers.set(autoId.toLowerCase(), registryContainer(autoId, autoHash))
    stub.mintedOnChain.set(routeId.toLowerCase(), '1')
    stub.mintedOnChain.set(autoHash.toLowerCase(), '2')
    resetWriteGuardsForTests()
    const afterCheck = stub.mints.length
    const routeMint = await mint(signedMint(routeId, routeHash, VORTEX_TREASURY), {
      ...authHeader(),
      'x-forwarded-for': '10.50.0.2',
    })
    const hashMint = await mint(signedMint(autoId, autoHash, VORTEX_TREASURY), {
      ...authHeader(),
      'x-forwarded-for': '10.50.0.3',
    })
    expect(routeMint.status).toBe(409)
    expect(hashMint.status).toBe(409)
    expect(stub.mints).toHaveLength(afterCheck)
    expect(counters.deployerKeyReads).toBe(0)
    expect(counters.directChainCalls).toBe(0)
  })

  it('a container evicted from dynamo:containers still gets its hash checked, and 409s if hash-keyed', async () => {
    const redis = new MemoryRedis()
    setRedisClientForTests(redis)
    const id = nextId()
    const registryHash = nextId()
    const decoyHash = nextId()
    stub.containers.set(id.toLowerCase(), registryContainer(id, registryHash))
    stub.mintedOnChain.set(registryHash.toLowerCase(), '4')
    await redis.lpush('dynamo:containers', JSON.stringify(sampleVortex(id, decoyHash)))
    const listed = await redis.lrange('dynamo:containers', 0, -1)
    expect(listed.join('\n')).not.toContain(registryHash)
    const signed = await mint(signedMint(id, registryHash, address(80)), {
      ...authHeader(),
      'x-forwarded-for': '10.80.0.1',
    })
    expect(signed.status).toBe(409)
    expect(String(signed.json.error)).toContain('already')
    expect(stub.mints).toEqual([])
    const checked = stub.existingMintPairs.find((pair) => pair.containerId.toLowerCase() === id.toLowerCase())
    expect(checked?.containerHash.toLowerCase()).toBe(registryHash.toLowerCase())
    expect(stub.existingMintPairs.some((pair) => pair.containerHash.toLowerCase() === decoyHash.toLowerCase())).toBe(false)
  })

  it('a concurrent auto-mint plus signed mint for the same container gives exactly one mint', async () => {
    const id = nextId()
    const hash = nextId()
    stub.containers.set(id.toLowerCase(), registryContainer(id, hash))
    let release: () => void = () => {}
    stub.existingHold = new Promise<void>((resolve) => {
      release = () => {
        stub.existingHold = null
        resolve()
      }
    })
    const pending = autoMintVortex(sampleVortex(id, hash), 'race')
    try {
      for (let i = 0; i < 20 && stub.existingWaiters < 1; i += 1) await flushTicks(1)
      expect(stub.existingWaiters).toBe(1)
      const signed = await mint(signedMint(id, hash, address(70)), {
        ...authHeader(),
        'x-forwarded-for': '10.70.0.1',
      })
      expect(signed.status).toBe(409)
      expect(String(signed.json.error)).toContain('already')
      expect(stub.mints).toEqual([])
      expect(stub.autoMints).toEqual([])
      release()
      expect(await pending).toBe('0x' + '22'.repeat(32))
      expect(stub.autoMints).toEqual([onChainMintId(id)])
      expect(stub.mints).toEqual([])
    } finally {
      release()
      await pending.catch(() => {})
    }
  })

  it('a failed chain read refuses the mint', async () => {
    const redis = new MemoryRedis()
    setRedisClientForTests(redis)
    const signedId = nextId()
    const signedHash = nextId()
    const autoId = nextId()
    const autoHash = nextId()
    stub.containers.set(signedId.toLowerCase(), registryContainer(signedId, signedHash))
    stub.existingMintErrorIds.add(signedId.toLowerCase())
    stub.existingMintErrorIds.add(autoId.toLowerCase())
    const logs: string[] = []
    const logSpy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message))
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const refused = await mint(signedMint(signedId, signedHash, address(81)), {
        ...authHeader(),
        'x-forwarded-for': '10.81.0.1',
      })
      expect(refused.status).toBe(500)
      expect(stub.mints).toEqual([])
      expect(stub.autoMints).toEqual([])
      expect(await redis.lindex(MINT_BACKLOG_KEY, 0)).toBeNull()

      stub.existingMintErrorIds.delete(signedId.toLowerCase())
      const allowed = await mint(signedMint(signedId, signedHash, address(81)), {
        ...authHeader(),
        'x-forwarded-for': '10.81.0.2',
      })
      expect(allowed.status).toBe(200)
      expect(stub.mints).toEqual([onChainMintId(signedId)])

      const skipped = await autoMintVortex(sampleVortex(autoId, autoHash), 'rpc-down')
      expect(skipped).toBeNull()
      expect(stub.autoMints).toEqual([])
      const stored = JSON.parse(String(await redis.lindex(MINT_BACKLOG_KEY, 0))) as {
        containerId: string
        containerHash: string
        skippedAt: string
        reason: string
      }
      expect(stored.containerId).toBe(autoId)
      expect(stored.containerHash).toBe(autoHash)
      expect(stored.skippedAt.length).toBeGreaterThan(0)
      expect(stored.reason).toContain('rpc down')
      expect(logs.some((line) => line.includes(`containerId=${autoId}`))).toBe(true)
      expect(stub.mints).toEqual([onChainMintId(signedId)])
    } finally {
      logSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })

  it('replay mints an auto-mint whose chain read failed', async () => {
    const redis = new MemoryRedis()
    setRedisClientForTests(redis)
    const id = nextId()
    const hash = nextId()
    const vortex = sampleVortex(id, hash)
    rememberContainerForTests(vortex)
    stub.existingMintErrorIds.add(id.toLowerCase())
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      expect(await autoMintVortex(vortex, 'rpc-down')).toBeNull()
      expect(stub.autoMints).toEqual([])
      expect(String(await redis.lindex(MINT_BACKLOG_KEY, 0))).toContain(id)
      stub.existingMintErrorIds.delete(id.toLowerCase())
      await replayMintBacklog()
      expect(stub.autoMints).toEqual([onChainMintId(id)])
      expect(await redis.lindex(MINT_BACKLOG_KEY, 0)).toBeNull()
    } finally {
      errorSpy.mockRestore()
      logSpy.mockRestore()
    }
  })

  it('an entry whose token is hash-keyed is skipped', async () => {
    const redis = new MemoryRedis()
    setRedisClientForTests(redis)
    const id = nextId()
    const hash = nextId()
    rememberContainerForTests(sampleVortex(id, hash))
    stub.mintedOnChain.set(hash.toLowerCase(), '2')
    await redis.rpush(MINT_BACKLOG_KEY, JSON.stringify({
      containerId: id,
      containerHash: hash,
      skippedAt: new Date().toISOString(),
      reason: 'rpc down',
    }))
    const logs: string[] = []
    const spy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message))
    })
    try {
      await replayMintBacklog()
      expect(stub.autoMints).toEqual([])
      expect(await redis.lindex(MINT_BACKLOG_KEY, 0)).toBeNull()
      expect(logs.some((line) => line.includes('backlog skip') && line.includes(id))).toBe(true)
    } finally {
      spy.mockRestore()
    }
  })

  it('a drain that errors mid-list keeps the rest', async () => {
    const redis = new MemoryRedis()
    setRedisClientForTests(redis)
    const firstId = nextId()
    const secondId = nextId()
    const thirdId = nextId()
    const firstHash = nextId()
    const secondHash = nextId()
    const thirdHash = nextId()
    rememberContainerForTests(sampleVortex(firstId, firstHash))
    rememberContainerForTests(sampleVortex(secondId, secondHash))
    rememberContainerForTests(sampleVortex(thirdId, thirdHash))
    for (const entry of [
      { containerId: firstId, containerHash: firstHash },
      { containerId: secondId, containerHash: secondHash },
      { containerId: thirdId, containerHash: thirdHash },
    ]) {
      await redis.rpush(MINT_BACKLOG_KEY, JSON.stringify({
        ...entry,
        skippedAt: new Date().toISOString(),
        reason: 'rpc down',
      }))
    }
    stub.existingMintErrorIds.add(secondId.toLowerCase())
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      await replayMintBacklog()
      expect(stub.autoMints).toEqual([onChainMintId(firstId)])
      const rest = await redis.lrange(MINT_BACKLOG_KEY, 0, -1)
      expect(rest.map((raw) => (JSON.parse(raw) as { containerId: string }).containerId)).toEqual([secondId, thirdId])
    } finally {
      errorSpy.mockRestore()
      logSpy.mockRestore()
    }
  })

  it('a server restart with the same Redis list still replays it', async () => {
    const redis = new MemoryRedis()
    setRedisClientForTests(redis)
    const id = nextId()
    const hash = nextId()
    const vortex = sampleVortex(id, hash)
    stub.existingMintErrorIds.add(id.toLowerCase())
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      expect(await autoMintVortex(vortex, 'rpc-down')).toBeNull()
      expect(stub.autoMints).toEqual([])
      expect(String(await redis.lindex(MINT_BACKLOG_KEY, 0))).toContain(id)
      await redis.lpush('dynamo:containers', JSON.stringify(vortex))
      resetBootMemoryForTests()
      resetWriteGuardsForTests()
      stub.existingMintErrorIds.delete(id.toLowerCase())
      stub.autoMints = []
      await replayMintBacklog()
      expect(stub.autoMints).toEqual([onChainMintId(id)])
      expect(await redis.lindex(MINT_BACKLOG_KEY, 0)).toBeNull()
    } finally {
      errorSpy.mockRestore()
      logSpy.mockRestore()
    }
  })

  it('two concurrent drains over [X,Y] mint both and lose nothing', async () => {
    const redis = new MemoryRedis()
    setRedisClientForTests(redis)
    const idX = nextId()
    const hashX = nextId()
    const idY = nextId()
    const hashY = nextId()
    rememberContainerForTests(sampleVortex(idX, hashX))
    rememberContainerForTests(sampleVortex(idY, hashY))
    for (const entry of [
      { containerId: idX, containerHash: hashX },
      { containerId: idY, containerHash: hashY },
    ]) {
      await redis.rpush(MINT_BACKLOG_KEY, JSON.stringify({
        ...entry,
        skippedAt: new Date().toISOString(),
        reason: 'rpc down',
        proposalText: 'kept',
      }))
    }
    let release: () => void = () => {}
    stub.autoMintHold = new Promise<void>((resolve) => {
      release = () => {
        stub.autoMintHold = null
        resolve()
      }
    })
    const first = replayMintBacklog()
    try {
      for (let i = 0; i < 20 && stub.autoMintEntered < 1; i += 1) await flushTicks(1)
      expect(stub.autoMintEntered).toBe(1)
      const second = replayMintBacklog()
      await flushTicks(4)
      expect(stub.autoMintEntered).toBe(1)
      expect(stub.autoMints).toEqual([])
      release()
      await first
      await second
      expect(stub.autoMints).toEqual([onChainMintId(idX), onChainMintId(idY)])
      expect(await redis.lrange(MINT_BACKLOG_KEY, 0, -1)).toEqual([])
    } finally {
      release()
      await first.catch(() => {})
    }
  })

  it('replay writes the original truncated proposal text', async () => {
    const redis = new MemoryRedis()
    setRedisClientForTests(redis)
    const id = nextId()
    const hash = nextId()
    const vortex = sampleVortex(id, hash)
    rememberContainerForTests(vortex)
    const original = 'governed proposal '.repeat(20)
    const expected = original.slice(0, 140)
    expect(expected.length).toBe(140)
    stub.existingMintErrorIds.add(id.toLowerCase())
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(await autoMintVortex(vortex, original)).toBeNull()
      const stored = JSON.parse(String(await redis.lindex(MINT_BACKLOG_KEY, 0))) as { proposalText: string }
      expect(stored.proposalText).toBe(expected)
      stub.existingMintErrorIds.delete(id.toLowerCase())
      stub.proposalTexts = []
      await replayMintBacklog()
      expect(stub.proposalTexts).toEqual([expected])
      expect(stub.autoMints).toEqual([onChainMintId(id)])
    } finally {
      logSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })

  it('a reverted replay removes the entry when a token exists and keeps it when none does', async () => {
    const redis = new MemoryRedis()
    setRedisClientForTests(redis)
    const landedId = nextId()
    const landedHash = nextId()
    const missedId = nextId()
    const missedHash = nextId()
    rememberContainerForTests(sampleVortex(landedId, landedHash))
    rememberContainerForTests(sampleVortex(missedId, missedHash))
    await redis.rpush(MINT_BACKLOG_KEY, JSON.stringify({
      containerId: landedId,
      containerHash: landedHash,
      skippedAt: new Date().toISOString(),
      reason: 'rpc down',
      proposalText: 'landed',
    }))
    stub.nextReceiptStatus = 'reverted'
    stub.revertLeavesToken = true
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      await replayMintBacklog()
      expect(stub.autoMints).toEqual([])
      expect(await redis.lindex(MINT_BACKLOG_KEY, 0)).toBeNull()

      await redis.rpush(MINT_BACKLOG_KEY, JSON.stringify({
        containerId: missedId,
        containerHash: missedHash,
        skippedAt: new Date().toISOString(),
        reason: 'rpc down',
        proposalText: 'missed',
      }))
      stub.nextReceiptStatus = 'reverted'
      stub.revertLeavesToken = false
      await replayMintBacklog()
      expect(stub.autoMints).toEqual([])
      expect(String(await redis.lindex(MINT_BACKLOG_KEY, 0))).toContain(missedId)
    } finally {
      errorSpy.mockRestore()
      logSpy.mockRestore()
    }
  })

  it('a bad head entry is dead-lettered and the drain continues', async () => {
    const redis = new MemoryRedis()
    setRedisClientForTests(redis)
    const missingId = nextId()
    const missingHash = nextId()
    const goodId = nextId()
    const goodHash = nextId()
    rememberContainerForTests(sampleVortex(goodId, goodHash))
    await redis.rpush(MINT_BACKLOG_KEY, '{not json')
    await redis.rpush(MINT_BACKLOG_KEY, JSON.stringify({
      containerId: missingId,
      containerHash: missingHash,
      skippedAt: new Date().toISOString(),
      reason: 'rpc down',
      proposalText: 'gone',
    }))
    await redis.rpush(MINT_BACKLOG_KEY, JSON.stringify({
      containerId: goodId,
      containerHash: goodHash,
      skippedAt: new Date().toISOString(),
      reason: 'rpc down',
      proposalText: 'kept',
    }))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      await replayMintBacklog()
      expect(stub.autoMints).toEqual([onChainMintId(goodId)])
      expect(await redis.lrange(MINT_BACKLOG_KEY, 0, -1)).toEqual([])
      const dead = await redis.lrange('vortex:mint:backlog:dead', 0, -1)
      expect(dead).toHaveLength(2)
      expect(dead[0]).toContain('invalid json')
      expect(dead[1]).toContain('missing container')
      expect(dead[1]).toContain(missingId)
    } finally {
      errorSpy.mockRestore()
      logSpy.mockRestore()
    }
  })

  it('an entry whose container was evicted from dynamo:containers replays with its saved text', async () => {
    const redis = new MemoryRedis()
    setRedisClientForTests(redis)
    const id = nextId()
    const hash = nextId()
    const vortex = sampleVortex(id, hash)
    rememberContainerForTests(vortex)
    const original = 'saved at skip '.repeat(12)
    const saved = original.slice(0, 140)
    await redis.lpush('dynamo:containers', JSON.stringify(sampleVortex(nextId(), nextId())))
    const listed = await redis.lrange('dynamo:containers', 0, -1)
    expect(listed.join('\n')).not.toContain(id)
    expect(listed.join('\n')).not.toContain(saved)
    stub.existingMintErrorIds.add(id.toLowerCase())
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(await autoMintVortex(vortex, original)).toBeNull()
      const stored = JSON.parse(String(await redis.lindex(MINT_BACKLOG_KEY, 0))) as { proposalText: string }
      expect(stored.proposalText).toBe(saved)
      stub.existingMintErrorIds.delete(id.toLowerCase())
      stub.proposalTexts = []
      await replayMintBacklog()
      expect(stub.proposalTexts).toEqual([saved])
      expect(stub.autoMints).toEqual([onChainMintId(id)])
    } finally {
      logSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })

  it('a failing replay releases the global mint budget', async () => {
    process.env.MINT_GLOBAL_BUDGET = '1'
    const redis = new MemoryRedis()
    setRedisClientForTests(redis)
    const id = nextId()
    const hash = nextId()
    rememberContainerForTests(sampleVortex(id, hash))
    await redis.rpush(MINT_BACKLOG_KEY, JSON.stringify({
      containerId: id,
      containerHash: hash,
      skippedAt: new Date().toISOString(),
      reason: 'rpc down',
      proposalText: 'retry',
    }))
    stub.nextReceiptStatus = 'reverted'
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      await replayMintBacklog()
      expect(String(await redis.lindex(MINT_BACKLOG_KEY, 0))).toContain(id)
      expect(stub.autoMints).toEqual([])
      const otherId = nextId()
      const otherHash = nextId()
      stub.containers.set(otherId.toLowerCase(), registryContainer(otherId, otherHash))
      const signed = await mint(signedMint(otherId, otherHash, address(90)), {
        ...authHeader(),
        'x-forwarded-for': '10.90.0.1',
      })
      expect(signed.status).toBe(200)
      expect(stub.mints).toEqual([onChainMintId(otherId)])
    } finally {
      errorSpy.mockRestore()
      logSpy.mockRestore()
    }
  })

  it('a registry RPC error returns 500 and a missing container returns 404', async () => {
    const id = nextId()
    const hash = nextId()
    stub.containers.set(id.toLowerCase(), registryContainer(id, hash))
    stub.readError = new Error('rpc down')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const failed = await mint(signedMint(id, hash, address(91)), {
        ...authHeader(),
        'x-forwarded-for': '10.91.0.1',
      })
      expect(failed.status).toBe(500)
      expect(stub.mints).toEqual([])
      const missing = await mint(signedMint(nextId(), nextId(), address(92)), {
        ...authHeader(),
        'x-forwarded-for': '10.91.0.2',
      })
      expect(missing.status).toBe(404)
      expect(String(missing.json.error)).toContain('not found')
      expect(stub.mints).toEqual([])
      const retried = await mint(signedMint(id, hash, address(91)), {
        ...authHeader(),
        'x-forwarded-for': '10.91.0.3',
      })
      expect(retried.status).toBe(200)
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('does not export redis test hooks from the production pubsub module', async () => {
    const pubsub = await import('../../mcp/pubsub')
    expect('setRedisClientForTests' in pubsub).toBe(false)
    expect('clearRedisClientForTests' in pubsub).toBe(false)
  })

  it('does not burn the container on a bad signature, and a later valid mint succeeds', async () => {
    const id = nextId()
    const hash = nextId()
    const to = address(60)
    stub.containers.set(id.toLowerCase(), registryContainer(id, hash))
    const nonString = await mint({
      containerId: id,
      containerHash: hash,
      to,
      expiresAt: futureExpiry(),
      signature: 12345,
    }, authHeader())
    expect(nonString.status).toBe(400)
    expectNoChainOrKey()

    const short = await mint({
      containerId: id,
      containerHash: hash,
      to,
      expiresAt: futureExpiry(),
      signature: 'abcd',
    }, authHeader())
    expect(short.status).toBe(400)
    expectNoChainOrKey()

    const tooFar = await mint({
      containerId: id,
      containerHash: hash,
      to,
      expiresAt: Math.floor(Date.now() / 1000) + MINT_SIGNATURE_MAX_AHEAD_SECONDS + 5,
      signature: 'ab'.repeat(32),
    }, authHeader())
    expect(tooFar.status).toBe(400)
    expect(String(tooFar.json.error)).toMatch(/1 hour/i)
    expectNoChainOrKey()

    const millis = await mint({
      containerId: id,
      containerHash: hash,
      to,
      expiresAt: Date.now(),
      signature: 'cd'.repeat(32),
    }, authHeader())
    expect(millis.status).toBe(400)
    expectNoChainOrKey()

    throwOnNextVerifyForTests(new Error('verify exploded'))
    const exploded = await mint(signedMint(id, hash, to), authHeader())
    expect(exploded.status).toBe(401)
    expect(String(exploded.json.error)).toMatch(/invalid vortex signature/i)
    expectNoChainOrKey()

    const ok = await mint(signedMint(id, hash, to), authHeader())
    expect(ok.status).toBe(200)
    expect(stub.mints).toEqual([onChainMintId(id)])
    expect(counters.deployerKeyReads).toBe(0)
  })

  it('does not lock the container when the chain mint throws, and that attempt still uses budget', async () => {
    process.env.MINT_GLOBAL_BUDGET = '2'
    const id = nextId()
    const hash = nextId()
    const to = address(61)
    stub.containers.set(id.toLowerCase(), registryContainer(id, hash))
    stub.failNextMint = true
    const failed = await mint(signedMint(id, hash, to), {
      ...authHeader(),
      'x-forwarded-for': '10.61.0.1',
    })
    expect(failed.status).toBe(500)
    expect(stub.mints).toEqual([])

    const retry = await mint(signedMint(id, hash, to), {
      ...authHeader(),
      'x-forwarded-for': '10.61.0.2',
    })
    expect(retry.status).toBe(200)
    expect(stub.mints).toEqual([onChainMintId(id)])

    const otherId = nextId()
    const otherHash = nextId()
    stub.containers.set(otherId.toLowerCase(), registryContainer(otherId, otherHash))
    const blocked = await mint(signedMint(otherId, otherHash, address(62)), {
      ...authHeader(),
      'x-forwarded-for': '10.61.0.3',
    })
    expect(blocked.status).toBe(429)
    expect(String(blocked.json.error)).toBe('Mint budget exceeded')
    expect(stub.mints).toEqual([onChainMintId(id)])
  })
})

describe('write-route auth', () => {
  it('fails closed on /vortex/persist, /vortex/mint, and /dev/seed-containers', async () => {
    delete process.env.MCP_WRITE_API_KEY
    const persist = await postJson('/vortex/persist', { containerId: nextId() })
    expect(persist.status).toBe(503)
    expectNoChainOrKey()
    expect(signingKeyReadCount()).toBe(0)

    process.env.MCP_WRITE_API_KEY = WRITE_KEY
    const wrong = await postJson('/vortex/persist', { containerId: nextId() }, authHeader('nope'))
    expect(wrong.status).toBe(401)
    expectNoChainOrKey()
    expect(signingKeyReadCount()).toBe(0)

    const mintMissing = await mint({
      containerId: nextId(),
      containerHash: nextId(),
      to: address(7),
      expiresAt: futureExpiry(),
      signature: 'ab'.repeat(32),
    })
    expect(mintMissing.status).toBe(401)
    expectNoChainOrKey()
    expect(signingKeyReadCount()).toBe(0)

    process.env.ALLOW_SEED_ROUTE = '1'
    delete process.env.MCP_WRITE_API_KEY
    const seed = await postJson('/dev/seed-containers', {})
    expect(seed.status).toBe(503)
    expectNoChainOrKey()
    expect(signingKeyReadCount()).toBe(0)

    process.env.MCP_WRITE_API_KEY = WRITE_KEY
    delete process.env.VORTEX_SIGNING_KEY
    const seedNoSign = await postJson('/dev/seed-containers', {}, authHeader())
    expect(seedNoSign.status).toBe(503)
    expectNoChainOrKey()
    expect(stub.persists).toBe(0)
    expect(stub.mints).toEqual([])
  })

  it('keeps the dev seed route closed in production with 0 chain calls and 0 key reads', async () => {
    const previous = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    process.env.ALLOW_SEED_ROUTE = '1'
    try {
      const seed = await postJson('/dev/seed-containers', {}, authHeader())
      expect(seed.status).toBe(403)
      expectNoChainOrKey()
      expect(signingKeyReadCount()).toBe(0)
    } finally {
      process.env.NODE_ENV = previous
    }
  })

  it('requires the API key only when govern_with_solar persists, and read-only stays open', async () => {
    delete process.env.MCP_WRITE_API_KEY
    const locked = await postJson('/govern_with_solar', { persistToChain: true, proposal: 'Deploy the array' })
    expect(locked.status).toBe(503)
    expectNoChainOrKey()
    expect(signingKeyReadCount()).toBe(0)

    process.env.MCP_WRITE_API_KEY = WRITE_KEY
    const wrong = await postJson('/govern_with_solar', { persistToChain: true, proposal: 'Deploy the array' }, authHeader('nope'))
    expect(wrong.status).toBe(401)
    expectNoChainOrKey()
    expect(signingKeyReadCount()).toBe(0)

    delete process.env.VORTEX_SIGNING_KEY
    const unsigned = await postJson('/govern_with_solar', {
      persistToChain: true,
      proposal: 'Deploy the array',
      sunNeuralEmbedding: [0.2],
    }, authHeader())
    expect(unsigned.status).toBe(503)
    expectNoChainOrKey()

    const open = await postJson('/govern_with_solar', {
      proposal: 'Read the field without writing',
      persistToChain: false,
      sunNeuralEmbedding: [0.2],
    })
    expect(open.status).toBe(200)
    expect(open.json.success).toBe(true)
    expectNoChainOrKey()
    expect(stub.persists).toBe(0)
    expect(stub.autoMints).toEqual([])
  })

  it('keeps the 60s auto-mint cooldown and does not call the chain on the limited request', async () => {
    expect(PERSIST_COOLDOWN_MS).toBe(60_000)
    const original = dynamoSolarGovernance.enhanceGovernanceDecision.bind(dynamoSolarGovernance)
    const spy = vi.spyOn(dynamoSolarGovernance, 'enhanceGovernanceDecision').mockImplementation(async (...args) => {
      const real = await original(...args)
      return { ...real, recommendation: 'PASS', fullBox7DVerdict: 'PASS' }
    })
    try {
      const body = {
        proposal: 'Persist one signed vortex and then wait',
        persistToChain: true,
        sunNeuralEmbedding: [0.2],
      }
      const invalid = await postJson('/govern_with_solar', { persistToChain: true, proposal: '   ' }, authHeader())
      expect(invalid.status).toBe(400)
      expectNoChainOrKey()

      const first = await postJson('/govern_with_solar', body, authHeader())
      expect(first.status).toBe(200)
      expect(typeof first.json.finalRecommendation).toBe('string')
      expect(stub.persists).toBe(1)
      await waitForAutoMint(1)
      const chainBefore = stub.chainCalls
      const keyBefore = stub.keyReads
      const second = await postJson('/govern_with_solar', body, authHeader())
      expect(second.status).toBe(200)
      expect(typeof second.json.finalRecommendation).toBe('string')
      expect(String((second.json.temporalContainer as { onChainError?: string })?.onChainError)).toContain('60s cooldown')
      expectNoChainOrKey(chainBefore, keyBefore)
      expect(counters.deployerKeyReads).toBe(0)
      expect(counters.directChainCalls).toBe(0)
    } finally {
      spy.mockRestore()
    }
  }, 30_000)
})
