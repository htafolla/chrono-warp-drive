import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  containerOriginHashField,
  containerOriginRecord,
  containerReviewFlag,
  devSeedRouteAllowed,
  isExcludedSeed,
  matchesRandomMetricSeedShape,
  REDIS_CONTAINER_ORIGIN_KEY,
  SEED_ROUTE_SOURCE,
  tagContainerOrigin,
  type RedisHashWriter,
} from '../../mcp/lib/containerOrigin'
import { containerToContractParams, type ContainerVortex } from '../../mcp/lib/temporalContainer'
import { TemporalManifold } from '../../mcp/lib/temporalManifold'
import { DEV_SEED_DISABLED_ERROR, mountDevSeedRoute } from '../../mcp/lib/devSeedRoute'
import { EVIDENCE_SEED_IDS } from '../../mcp/lib/evidenceSeedIds'
import { EVIDENCE_UNKNOWN_IDS } from '../../mcp/lib/evidenceUnknownIds'
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

const evidenceSeedId = EVIDENCE_SEED_IDS.values().next().value as string
const evidenceUnknownId = EVIDENCE_UNKNOWN_IDS.values().next().value as string
const realContainerId = '0x' + '22'.repeat(32)

function randomMetricSeedContainer(containerId: string, timestamp: number) {
  const base = manifoldContainer({ containerId, timestamp, resonance: 0.8, proposalHash: '0x' + 'ab'.repeat(32) })
  const score = 0.8
  return {
    ...base,
    hammerReason: 'Strong alignment verified',
    solarSnapshot: {
      ...base.solarSnapshot,
      activityLevel: 'moderate',
      xrayFlux: 1e-6,
      kpIndex: 3,
      protonFlux: 40,
      magnetometer: -12,
      solarTdf: 2,
    },
    resonanceProfile: {
      ...base.resonanceProfile,
      fullBox7DComposite: score,
      fullBox7DVerdict: 'PASS',
      waveProximity: score,
      phaseAlignment: score,
      calibratedVortex: score,
      calibratedSync: score,
      neuralProximity: score,
      neuralVortex: score,
      gematriaResonance: score,
      structuralResonance: score,
      verdict: 'PASS',
      confidence: 0.5,
    },
    moralOverlay: {
      ...base.moralOverlay,
      trinitariumMoralScore: 0.55,
      virtueAlignment: 0.55,
      moralSafety: 0.55,
      intentAlignment: 0.55,
      trinitariumGematriaFusion: 0.5,
      moralNumerologicalTension: 'Mild',
    },
  }
}

function manifoldContainer(overrides: {
  origin?: 'seed' | 'real'
  timestamp: number
  proposalHash?: string
  resonance?: number
  containerId?: string
}) {
  const resonance = overrides.resonance ?? 0.91
  return {
    containerId: overrides.containerId ?? realContainerId,
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

describe('seed exclusion from manifold and re-score candidates', () => {
  const seconds = 1_780_868_701
  const proposalText = 'Deploy the observatory on a quiet day'

  it('recognizes containers built with the seed route formulas', () => {
    const fix = (value: number) => Number(value.toFixed(4))
    for (let n = 1; n <= 40; n++) {
      let state = n * 997
      const r = () => {
        state = (state * 16807) % 2147483647
        return (state - 1) / 2147483646
      }
      const jitter = (base: number, range: number) => Math.max(0.01, Math.min(0.99, base + (r() - 0.5) * range))
      const compRaw = r() * 0.5 + r() * 0.3 + r() * 0.2
      const compositeRaw = Math.min(0.99, 0.15 + compRaw * 0.85)
      const waveRaw = jitter(compositeRaw, 0.35)
      const phaseRaw = jitter(compositeRaw, 0.40)
      const vortexRaw = jitter(compositeRaw, 0.30)
      const syncRaw = jitter(compositeRaw, 0.38)
      const neuralProximityRaw = jitter(compositeRaw, 0.32)
      const neuralVortexRaw = jitter(compositeRaw, 0.28)
      const gematriaRaw = jitter(compositeRaw, 0.36)
      const structuralRaw = jitter(compositeRaw, 0.34)
      const avgSub = (waveRaw + phaseRaw + vortexRaw + syncRaw + neuralProximityRaw + neuralVortexRaw + gematriaRaw + structuralRaw) / 8
      const verdict = avgSub >= 0.65 ? 'PASS' : avgSub >= 0.42 ? 'NEEDS_REVISION' : 'FAIL'
      const agreement = 1 - Math.abs(avgSub - compositeRaw)
      const confidenceRaw = Math.min(0.99, Math.max(0.25, agreement * 0.5 + r() * 0.4))
      const moralRaw = jitter(0.55, 0.50)
      const virtueRaw = jitter(moralRaw, 0.30)
      const safetyRaw = jitter(moralRaw, 0.35)
      const intentRaw = jitter(moralRaw, 0.28)
      const fusionRaw = jitter(0.50, 0.55)
      const solarScore = r()
      const container = {
        source: 'agent' as const,
        hammerReason: verdict === 'PASS' ? 'Strong alignment verified'
          : verdict === 'NEEDS_REVISION' ? 'Partial alignment detected'
          : 'Poor alignment - major revision needed',
        solarSnapshot: {
          activityLevel: solarScore > 0.7 ? 'high' : solarScore > 0.4 ? 'moderate' : 'quiet',
          xrayFlux: 1e-8 + r() * 2.0e-6,
          kpIndex: Math.floor(r() * 9),
          protonFlux: Math.floor(r() * 200),
          magnetometer: Math.floor((r() - 0.5) * 200),
          solarTdf: Math.floor(r() * 5),
        },
        resonanceProfile: {
          fullBox7DComposite: fix(compositeRaw),
          fullBox7DVerdict: verdict,
          waveProximity: fix(waveRaw),
          phaseAlignment: fix(phaseRaw),
          calibratedVortex: fix(vortexRaw),
          calibratedSync: fix(syncRaw),
          neuralProximity: fix(neuralProximityRaw),
          neuralVortex: fix(neuralVortexRaw),
          gematriaResonance: fix(gematriaRaw),
          structuralResonance: fix(structuralRaw),
          verdict,
          confidence: fix(confidenceRaw),
        },
        moralOverlay: {
          trinitariumMoralScore: fix(moralRaw),
          virtueAlignment: fix(virtueRaw),
          moralSafety: fix(safetyRaw),
          intentAlignment: fix(intentRaw),
          trinitariumGematriaFusion: fix(fusionRaw),
          moralNumerologicalTension: 'Low',
        },
      }
      expect(matchesRandomMetricSeedShape(container)).toBe(true)
    }
  })

  it('matches the unstable dev-script payload and rejects the dissonant one', () => {
    const unstable = randomMetricSeedContainer(realContainerId, seconds)
    unstable.hammerReason = 'Partial alignment detected'
    unstable.resonanceProfile = {
      ...unstable.resonanceProfile,
      fullBox7DComposite: 0.65,
      fullBox7DVerdict: 'NEEDS_REVISION',
      waveProximity: 0.60,
      phaseAlignment: 0.58,
      calibratedVortex: 0.62,
      calibratedSync: 0.55,
      neuralProximity: 0.63,
      neuralVortex: 0.59,
      gematriaResonance: 0.61,
      structuralResonance: 0.57,
      verdict: 'NEEDS_REVISION',
      confidence: 0.60,
    }
    unstable.moralOverlay = {
      ...unstable.moralOverlay,
      trinitariumMoralScore: 0.55,
      virtueAlignment: 0.52,
      moralSafety: 0.58,
      intentAlignment: 0.50,
      trinitariumGematriaFusion: 0.45,
      moralNumerologicalTension: 'Moderate',
    }
    unstable.solarSnapshot = { ...unstable.solarSnapshot, activityLevel: 'quiet', xrayFlux: 2e-7, kpIndex: 2, protonFlux: 10, magnetometer: 5, solarTdf: 1 }
    expect(matchesRandomMetricSeedShape(unstable)).toBe(true)

    const dissonant = randomMetricSeedContainer(realContainerId, seconds)
    dissonant.moralOverlay = { ...dissonant.moralOverlay, trinitariumGematriaFusion: 0.20 }
    expect(matchesRandomMetricSeedShape(dissonant)).toBe(false)
  })

  it('drops a container only when it has no text and matches the random-metric seed shape', () => {
    const shaped = randomMetricSeedContainer(realContainerId, Date.now())
    expect(matchesRandomMetricSeedShape(shaped)).toBe(true)
    expect(isExcludedSeed({ container: shaped })).toBe(true)
    expect(isExcludedSeed({ text: proposalText, container: shaped })).toBe(false)
    expect(isExcludedSeed({ containerId: evidenceSeedId })).toBe(false)

    const manifold = new TemporalManifold()
    const scores = { ...shaped.resonanceProfile }
    manifold.populateFromContainers([shaped])
    manifold.addFromContainer(shaped)
    expect(manifold.getPointCount()).toBe(0)
    expect(manifold.getSelfReflectionCandidates()).toEqual([])
    expect(shaped.resonanceProfile).toEqual(scores)
  })

  it('never skips a real container that has text, and leaves its scores unchanged', () => {
    const manifold = new TemporalManifold()
    const shaped = randomMetricSeedContainer(realContainerId, Date.now())
    shaped.origin = 'real'
    shaped.proposalHash = 'abc'
    const scores = { ...shaped.resonanceProfile }
    manifold.populateFromContainers([shaped], new Map([[shaped.proposalHash, proposalText]]))
    manifold.addFromContainer(shaped, proposalText)
    expect(manifold.getPointCount()).toBe(2)
    const point = manifold.getAllPoints()[0]
    expect(point.resonance7D).toBe(shaped.resonanceProfile.fullBox7DComposite)
    expect(point.phaseAlignment).toBe(shaped.resonanceProfile.phaseAlignment)
    expect(point.vortexAlignment).toBe(shaped.resonanceProfile.calibratedVortex)
    expect(point.synchronization).toBe(shaped.resonanceProfile.calibratedSync)
    expect(point.gematriaResonance).toBe(shaped.resonanceProfile.gematriaResonance)
    expect(point.tmoScore).toBe(shaped.moralOverlay.trinitariumMoralScore)
    expect(point.verdict).toBe(shaped.resonanceProfile.verdict)
    expect(point.reviewFlag).toBeUndefined()
    expect(shaped.resonanceProfile).toEqual(scores)
    expect(manifold.getSelfReflectionCandidates().map(p => p.proposalHash)).toEqual(['abc', 'abc'])
    expect(seedRouteSource).toContain('temporalManifold.addFromContainer(container, proposalText)')
    expect(seedRouteSource).not.toContain("addFromContainer({ ...container, origin: 'real' }")
  })

  it('keeps an unknown container and flags it, including when it has no text', () => {
    expect(EVIDENCE_UNKNOWN_IDS.size).toBe(94)
    expect(EVIDENCE_SEED_IDS.size).toBe(786)
    expect(containerReviewFlag(evidenceUnknownId)).toBe('unknown')
    expect(containerReviewFlag(evidenceSeedId)).toBeUndefined()
    expect(containerReviewFlag(realContainerId)).toBeUndefined()

    const shaped = randomMetricSeedContainer(evidenceUnknownId, seconds)
    expect(matchesRandomMetricSeedShape(shaped)).toBe(true)
    expect(isExcludedSeed({ containerId: evidenceUnknownId, container: shaped })).toBe(false)

    const manifold = new TemporalManifold()
    manifold.populateFromContainers([shaped])
    expect(manifold.getPointCount()).toBe(1)
    expect(manifold.getAllPoints()[0].reviewFlag).toBe('unknown')
    expect(manifold.getAllPoints()[0].resonance7D).toBe(shaped.resonanceProfile.fullBox7DComposite)

    const live = new TemporalManifold()
    const withText = randomMetricSeedContainer(evidenceUnknownId, Date.now())
    withText.proposalHash = 'unknown-hash'
    live.addFromContainer(withText, proposalText)
    expect(live.getAllPoints()[0].reviewFlag).toBe('unknown')
    expect(live.getSelfReflectionCandidates().map(p => p.proposalHash)).toEqual(['unknown-hash'])
  })

  it('keeps a real container that has no text when it does not match the seed shape', () => {
    const manifold = new TemporalManifold()
    const real = manifoldContainer({
      origin: 'real',
      timestamp: seconds,
      resonance: 0.91,
      proposalHash: '0x' + '11'.repeat(32),
    })
    expect(matchesRandomMetricSeedShape(real)).toBe(false)
    expect(isExcludedSeed({ container: real, containerId: real.containerId })).toBe(false)
    manifold.populateFromContainers([real])
    expect(manifold.getPointCount()).toBe(1)
    expect(manifold.getAllPoints()[0].reviewFlag).toBeUndefined()
    expect(manifold.getAllPoints()[0].resonance7D).toBe(0.91)
  })
})

describe('dev seed route gate', () => {
  const previousNodeEnv = process.env.NODE_ENV
  const previousAllow = process.env.ALLOW_SEED_ROUTE

  afterEach(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
    if (previousAllow === undefined) delete process.env.ALLOW_SEED_ROUTE
    else process.env.ALLOW_SEED_ROUTE = previousAllow
  })

  it('returns 403 in production even when ALLOW_SEED_ROUTE=1', async () => {
    process.env.NODE_ENV = 'production'
    process.env.ALLOW_SEED_ROUTE = '1'
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
    delete process.env.ALLOW_SEED_ROUTE
    expect(devSeedRouteAllowed()).toBe(false)
    const app = new Hono()
    mountDevSeedRoute(app, async (c) => c.json({ success: true }))
    const res = await app.request('/dev/seed-containers?count=1', { method: 'POST' })
    expect(res.status).toBe(403)
  })

  it('allows the route only when ALLOW_SEED_ROUTE=1 and the process is not production', async () => {
    process.env.NODE_ENV = 'development'
    process.env.ALLOW_SEED_ROUTE = 'true'
    expect(devSeedRouteAllowed()).toBe(false)

    process.env.ALLOW_SEED_ROUTE = '1'
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
