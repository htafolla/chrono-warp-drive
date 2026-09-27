import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  containerOriginHashField,
  containerOriginRecord,
  devSeedRouteAllowed,
  isExcludedSeed,
  REDIS_CONTAINER_ORIGIN_KEY,
  SEED_ROUTE_SOURCE,
  tagContainerOrigin,
  type RedisHashWriter,
} from '../../mcp/lib/containerOrigin'
import { containerToContractParams, type ContainerVortex } from '../../mcp/lib/temporalContainer'
import { TemporalManifold } from '../../mcp/lib/temporalManifold'
import { DEV_SEED_DISABLED_ERROR, mountDevSeedRoute } from '../../mcp/lib/devSeedRoute'
import { Hono } from 'hono'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const seedRouteSource = readFileSync(join(repoRoot, 'mcp/index.ts'), 'utf8')
const ambientSource = readFileSync(join(repoRoot, 'mcp/lib/ambientField.ts'), 'utf8')

function sampleContainer(containerId: string): ContainerVortex {
  return {
    containerId,
    timestamp: 1_700_000_000,
    proposalHash: '0x' + 'ab'.repeat(32),
    solarSnapshot: {
      timestamp: 1_700_000_000,
      activityLevel: 'moderate',
      xrayFlux: 1.2e-6,
      kpIndex: 3,
      protonFlux: 40,
      magnetometer: -12,
      solarTdf: 2,
    },
    resonanceProfile: {
      fullBox7DComposite: 0.8123,
      fullBox7DVerdict: 'PASS',
      waveProximity: 0.79,
      phaseAlignment: 0.81,
      calibratedVortex: 0.77,
      calibratedSync: 0.8,
      neuralProximity: 0.76,
      neuralVortex: 0.74,
      gematriaResonance: 0.83,
      structuralResonance: 0.78,
      verdict: 'PASS',
      confidence: 0.91,
    },
    moralOverlay: {
      trinitariumMoralScore: 0.66,
      virtueAlignment: 0.64,
      moralSafety: 0.7,
      intentAlignment: 0.62,
      trinitariumGematriaFusion: 0.41,
      moralNumerologicalTension: 'Mild',
    },
    hammerReason: 'Strong alignment verified',
    previousContainerHash: '0x' + '00'.repeat(32),
    containerHash: '0x' + 'cd'.repeat(32),
    source: 'human',
  }
}

function scoreSnapshot(container: ContainerVortex) {
  return {
    resonanceProfile: { ...container.resonanceProfile },
    moralOverlay: { ...container.moralOverlay },
    redisListPayload: JSON.stringify(container),
  }
}

class MemoryRedis implements RedisHashWriter {
  readonly hashes = new Map<string, Map<string, string>>()

  async hset(key: string, field: string, value: string): Promise<number> {
    const hash = this.hashes.get(key) ?? new Map<string, string>()
    hash.set(field, value)
    this.hashes.set(key, hash)
    return 1
  }
}

describe('container origin tags', () => {
  it('seed route sets origin=seed and seedSource without changing scores or the on-chain payload', async () => {
    const container = sampleContainer('0x' + '11'.repeat(32))
    const before = scoreSnapshot(container)
    const paramsBefore = containerToContractParams(container)

    const redis = new MemoryRedis()
    const tagged = await tagContainerOrigin(redis, container.containerId, 'seed', SEED_ROUTE_SOURCE)
    const queued = containerOriginHashField(container.containerId, 'seed', SEED_ROUTE_SOURCE)

    expect(tagged).toEqual({ origin: 'seed', seedSource: SEED_ROUTE_SOURCE })
    expect(containerOriginRecord('seed', SEED_ROUTE_SOURCE)).toEqual({
      origin: 'seed',
      seedSource: '/dev/seed-containers',
    })
    expect(queued.key).toBe(REDIS_CONTAINER_ORIGIN_KEY)
    expect(queued.field).toBe(container.containerId)
    expect(JSON.parse(queued.value)).toEqual({ origin: 'seed', seedSource: '/dev/seed-containers' })
    expect(redis.hashes.get(REDIS_CONTAINER_ORIGIN_KEY)?.get(container.containerId)).toBe(queued.value)

    expect(container.resonanceProfile).toEqual(before.resonanceProfile)
    expect(container.moralOverlay).toEqual(before.moralOverlay)
    expect(JSON.stringify(container)).toBe(before.redisListPayload)
    expect(containerToContractParams(container)).toEqual(paramsBefore)
    expect(JSON.stringify(container)).not.toContain('"origin"')
    expect(seedRouteSource).toContain("containerOriginHashField(c.containerId, 'seed', SEED_ROUTE_SOURCE)")
  })

  it('real path sets origin=real without a seedSource and without changing scores or the on-chain payload', async () => {
    const container = sampleContainer('0x' + '22'.repeat(32))
    const before = scoreSnapshot(container)
    const paramsBefore = containerToContractParams(container)

    const redis = new MemoryRedis()
    const tagged = await tagContainerOrigin(redis, container.containerId, 'real')
    const queued = containerOriginHashField(container.containerId, 'real')

    expect(tagged).toEqual({ origin: 'real' })
    expect(queued.key).toBe(REDIS_CONTAINER_ORIGIN_KEY)
    expect(JSON.parse(queued.value)).toEqual({ origin: 'real' })
    expect(JSON.parse(queued.value).seedSource).toBeUndefined()
    expect(redis.hashes.get(REDIS_CONTAINER_ORIGIN_KEY)?.get(container.containerId.toLowerCase())).toBe(queued.value)

    expect(container.resonanceProfile).toEqual(before.resonanceProfile)
    expect(container.moralOverlay).toEqual(before.moralOverlay)
    expect(containerToContractParams(container)).toEqual(paramsBefore)
    expect(JSON.stringify(container)).toBe(before.redisListPayload)
    expect(seedRouteSource).toContain("containerOriginHashField(container.containerId, 'real')")
    expect(ambientSource).toContain("containerOriginHashField(container.containerId, 'real')")
  })
})

function manifoldContainer(overrides: {
  origin?: 'seed' | 'real'
  timestamp: number
  proposalHash?: string
  resonance?: number
}) {
  const resonance = overrides.resonance ?? 0.91
  return {
    containerId: '0x' + 'ab'.repeat(32),
    timestamp: overrides.timestamp,
    proposalHash: overrides.proposalHash ?? ('0x' + 'cd'.repeat(32)),
    source: 'human' as const,
    origin: overrides.origin,
    solarSnapshot: {
      timestamp: overrides.timestamp,
      activityLevel: 'moderate',
      xrayFlux: 1.2e-6,
      kpIndex: 3,
      protonFlux: 40,
      magnetometer: -12,
      solarTdf: 2,
    },
    resonanceProfile: {
      fullBox7DComposite: resonance,
      fullBox7DVerdict: 'PASS',
      waveProximity: resonance,
      phaseAlignment: resonance,
      calibratedVortex: resonance,
      calibratedSync: resonance,
      neuralProximity: resonance,
      neuralVortex: resonance,
      gematriaResonance: resonance,
      structuralResonance: resonance,
      verdict: 'PASS',
      confidence: resonance,
    },
    moralOverlay: {
      trinitariumMoralScore: resonance,
      virtueAlignment: resonance,
      moralSafety: resonance,
      intentAlignment: resonance,
      trinitariumGematriaFusion: resonance,
      moralNumerologicalTension: 'Mild',
    },
    hammerReason: 'Strong alignment verified',
    previousContainerHash: '0x' + '00'.repeat(32),
    containerHash: '0x' + 'ef'.repeat(32),
  }
}

describe('seed exclusion from manifold and axioms', () => {
  const seconds = 1_780_868_701

  it('does not let a tagged seed container into the manifold or the axioms', () => {
    const manifold = new TemporalManifold()
    const seed = manifoldContainer({ origin: 'seed', timestamp: seconds, resonance: 0.95 })
    const scores = { ...seed.resonanceProfile }
    manifold.populateFromContainers([seed, seed, seed])
    manifold.addFromContainer(seed)
    expect(manifold.getPointCount()).toBe(0)
    expect(manifold.getAxioms(0.8, 1)).toEqual([])
    expect(manifold.getSelfReflectionCandidates()).toEqual([])
    expect(seed.resonanceProfile).toEqual(scores)
  })

  it('drops an untagged container that has no text or a unix-seconds timestamp', () => {
    expect(isExcludedSeed({ text: '', timestamp: seconds })).toBe(true)
    expect(isExcludedSeed({ text: 'a real proposal', timestamp: seconds })).toBe(true)
    expect(isExcludedSeed({ origin: 'seed', text: 'labeled seed', timestamp: Date.now() })).toBe(true)

    const manifold = new TemporalManifold()
    manifold.populateFromContainers([
      manifoldContainer({ timestamp: seconds, resonance: 0.95 }),
    ])
    expect(manifold.getPointCount()).toBe(0)
    expect(manifold.getAxioms(0.8, 1)).toEqual([])
  })

  it('keeps a real run in the manifold and axioms without changing its scores', () => {
    const manifold = new TemporalManifold()
    const resonance = 0.91
    const real = manifoldContainer({
      origin: 'real',
      timestamp: seconds,
      resonance,
      proposalHash: '0x' + '11'.repeat(32),
    })
    const text = 'Deploy the observatory on a quiet day'
    manifold.populateFromContainers([real, real, real], new Map([[real.proposalHash, text]]))
    expect(manifold.getPointCount()).toBe(3)
    const axioms = manifold.getAxioms(0.8, 3)
    expect(axioms).toHaveLength(1)
    expect(axioms[0].resonance7D).toBe(resonance)
    expect(axioms[0].tmoScore).toBe(resonance)
    expect(axioms[0].occurrences).toBe(3)
    expect(real.resonanceProfile.fullBox7DComposite).toBe(resonance)

    const live = new TemporalManifold()
    live.addPoint({
      timestamp: Date.now(),
      proposalHash: 'abc',
      source: 'ambient',
      solarActivity: 'quiet',
      resonance7D: resonance,
      phaseAlignment: resonance,
      vortexAlignment: resonance,
      synchronization: resonance,
      gematriaResonance: resonance,
      tmoScore: resonance,
      verdict: 'PASS',
    }, text)
    expect(live.getPointCount()).toBe(1)
    expect(live.getSelfReflectionCandidates().map(p => p.proposalHash)).toEqual(['abc'])
  })
})

describe('dev seed route gate', () => {
  const previousNodeEnv = process.env.NODE_ENV
  const previousAllow = process.env.ALLOW_DEV_SEED

  afterEach(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
    if (previousAllow === undefined) delete process.env.ALLOW_DEV_SEED
    else process.env.ALLOW_DEV_SEED = previousAllow
  })

  it('returns 403 in production even when ALLOW_DEV_SEED=true', async () => {
    process.env.NODE_ENV = 'production'
    process.env.ALLOW_DEV_SEED = 'true'
    expect(devSeedRouteAllowed()).toBe(false)
    const app = new Hono()
    let handlerRan = false
    mountDevSeedRoute(app, async (c) => {
      handlerRan = true
      return c.json({ success: true })
    })
    const res = await app.request('/dev/seed-containers', { method: 'POST' })
    expect(res.status).toBe(403)
    const body = await res.json() as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe(DEV_SEED_DISABLED_ERROR)
    expect(handlerRan).toBe(false)
  })

  it('returns 403 when the dev flag is unset', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.ALLOW_DEV_SEED
    expect(devSeedRouteAllowed()).toBe(false)
    const app = new Hono()
    mountDevSeedRoute(app, async (c) => c.json({ success: true }))
    const res = await app.request('/dev/seed-containers?count=1', { method: 'POST' })
    expect(res.status).toBe(403)
  })

  it('allows the route only when both the dev flag and a non-production env are set', async () => {
    process.env.NODE_ENV = 'development'
    process.env.ALLOW_DEV_SEED = 'true'
    expect(devSeedRouteAllowed()).toBe(true)
    const app = new Hono()
    mountDevSeedRoute(app, async (c) => c.json({ success: true, reached: true }))
    const res = await app.request('/dev/seed-containers', { method: 'POST' })
    expect(res.status).toBe(200)
    const body = await res.json() as { reached: boolean }
    expect(body.reached).toBe(true)

    process.env.NODE_ENV = 'production'
    expect(devSeedRouteAllowed()).toBe(false)
    expect(seedRouteSource).toContain('mountDevSeedRoute(app, async (c: Context) => {')
  })
})
