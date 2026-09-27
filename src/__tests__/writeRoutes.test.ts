import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChainExecutor, RegistryContainer } from '../../mcp/lib/chainPort'
import type { ContainerVortex } from '../../mcp/lib/temporalContainer'

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

import { app, autoMintVortex } from '../../mcp/index'
import { setChainExecutorForTests } from '../../mcp/lib/chainPort'
import { VORTEX_TREASURY } from '../../mcp/lib/chainPort'
import {
  DEFAULT_MINT_GLOBAL_BUDGET,
  DEFAULT_MINT_GLOBAL_WINDOW_MS,
  MINT_ADDRESS_CAP,
  MINT_RATE_LIMIT,
  PERSIST_COOLDOWN_MS,
  mintGlobalBudget,
  mintGlobalWindowMs,
  resetWriteGuardsForTests,
  signVortex,
  signingKeyReadCount,
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

  async readContainerExact(containerId: string): Promise<RegistryContainer | null> {
    this.chainCalls += 1
    this.reads.push(containerId)
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
    this.mints.push(input.containerId)
    return { txHash: '0x' + '11'.repeat(32), tokenId: '7' }
  }

  async autoMint(container: ContainerVortex): Promise<{ txHash: string }> {
    this.keyReads += 1
    this.chainCalls += 1
    this.autoMints.push(container.containerId)
    return { txHash: '0x' + '22'.repeat(32) }
  }
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
    const body = {
      proposal: 'Persist one signed vortex and then wait',
      persistToChain: true,
      sunNeuralEmbedding: [0.2],
    }
    const first = await postJson('/govern_with_solar', body, authHeader())
    expect(first.status).toBe(200)
    const chainBefore = stub.chainCalls
    const keyBefore = stub.keyReads
    const second = await postJson('/govern_with_solar', body, authHeader())
    expect(second.status).toBe(200)
    expect(String((second.json.temporalContainer as { onChainError?: string })?.onChainError)).toContain('60s cooldown')
    expectNoChainOrKey(chainBefore, keyBefore)
    expect(counters.deployerKeyReads).toBe(0)
    expect(counters.directChainCalls).toBe(0)
  }, 30_000)
})
