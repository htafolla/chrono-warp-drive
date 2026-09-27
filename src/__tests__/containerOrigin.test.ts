import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import {
  containerOriginHashField,
  containerOriginRecord,
  REDIS_CONTAINER_ORIGIN_KEY,
  SEED_ROUTE_SOURCE,
  tagContainerOrigin,
  type RedisHashWriter,
} from '../../mcp/lib/containerOrigin'
import { containerToContractParams, type ContainerVortex } from '../../mcp/lib/temporalContainer'

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
