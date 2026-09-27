import containerClasses from '../data/container-classes.json' with { type: 'json' }

interface ContainerClassRow {
  id: string
  class: string
}

function loadEvidenceUnknownIds(rows: readonly ContainerClassRow[]): ReadonlySet<string> {
  const ids = new Set<string>()
  for (const row of rows) {
    if (row.class === 'unknown' && typeof row.id === 'string') ids.add(row.id.toLowerCase())
  }
  return ids
}

const EVIDENCE_UNKNOWN_IDS = loadEvidenceUnknownIds(containerClasses)

/**
 * Off-chain origin tags for temporal containers.
 * Redis hash of container id -> origin JSON. Never added to ContainerVortex,
 * containerToContractParams, or storeContainer args.
 * A hash has no per-field TTL. EXPIRE on this key would drop every origin tag, so none is set.
 */
export const REDIS_CONTAINER_ORIGIN_KEY = 'dynamo:containers:origin'

/** Dev route that writes random-metric containers. */
export const SEED_ROUTE_SOURCE = '/dev/seed-containers'

export type ContainerOrigin = 'seed' | 'real'

export interface ContainerOriginRecord {
  origin: ContainerOrigin
  /** Present only for seed-route writes. Identifies which route produced the container. */
  seedSource?: string
}

export interface RedisHashWriter {
  hset(key: string, field: string, value: string): Promise<unknown>
}

export function containerOriginRecord(
  origin: ContainerOrigin,
  seedSource?: string,
): ContainerOriginRecord {
  if (origin === 'seed') {
    return { origin: 'seed', seedSource: seedSource ?? SEED_ROUTE_SOURCE }
  }
  return { origin: 'real' }
}

export function containerOriginHashField(
  containerId: string,
  origin: ContainerOrigin,
  seedSource?: string,
): { key: string; field: string; value: string } {
  return {
    key: REDIS_CONTAINER_ORIGIN_KEY,
    field: containerId.toLowerCase(),
    value: JSON.stringify(containerOriginRecord(origin, seedSource)),
  }
}

/**
 * Dev seed route is off unless this process is explicitly not production
 * and ALLOW_SEED_ROUTE=1. Either condition failing is a 403.
 */
export function devSeedRouteAllowed(env?: {
  NODE_ENV?: string
  ALLOW_SEED_ROUTE?: string
}): boolean {
  const nodeEnv = env ? env.NODE_ENV : process.env.NODE_ENV
  const allowSeedRoute = env ? env.ALLOW_SEED_ROUTE : process.env.ALLOW_SEED_ROUTE
  return nodeEnv !== 'production' && allowSeedRoute === '1'
}

/** Fields the dev seed route writes onto a container before Redis or the contract. */
export interface RandomMetricSeedShape {
  hammerReason?: string
  source?: string
  solarSnapshot?: {
    activityLevel?: string
    xrayFlux?: number
    kpIndex?: number
    protonFlux?: number
    magnetometer?: number
    solarTdf?: number
  }
  resonanceProfile?: {
    fullBox7DComposite?: number
    fullBox7DVerdict?: string
    waveProximity?: number
    phaseAlignment?: number
    calibratedVortex?: number
    calibratedSync?: number
    neuralProximity?: number
    neuralVortex?: number
    gematriaResonance?: number
    structuralResonance?: number
    verdict?: string
    confidence?: number
  }
  moralOverlay?: {
    trinitariumMoralScore?: number
    virtueAlignment?: number
    moralSafety?: number
    intentAlignment?: number
    trinitariumGematriaFusion?: number
    moralNumerologicalTension?: string
  }
}

const SEED_HAMMER_BY_VERDICT: Record<string, string> = {
  PASS: 'Strong alignment verified',
  NEEDS_REVISION: 'Partial alignment detected',
  FAIL: 'Poor alignment - major revision needed',
}

const SEED_TENSIONS = new Set(['Mild', 'Low', 'Moderate', 'High'])
const SEED_ACTIVITIES = new Set(['quiet', 'moderate', 'high'])
const SEED_SOURCES = new Set(['human', 'agent', 'ambient'])

/** Distance from a toFixed(4) value to the nearest 1e14 unit after * 1e18. */
function isFourDecimalQuantum(value: number): boolean {
  if (!Number.isFinite(value)) return false
  const scaled = Math.round(value * 1e18)
  const quantum = 1e14
  const nearest = Math.round(scaled / quantum) * quantum
  return Math.abs(scaled - nearest) <= 64
}

function withinJitterOrClamp(value: number, base: number, range: number): boolean {
  if (!Number.isFinite(value) || !Number.isFinite(base)) return false
  if (Math.abs(value - base) <= range / 2 + 5e-5) return true
  return value <= 0.01005 || value >= 0.98995
}

function verdictAgrees(verdict: string, average: number): boolean {
  const expected = average >= 0.65 ? 'PASS' : average >= 0.42 ? 'NEEDS_REVISION' : 'FAIL'
  if (expected === verdict) return true
  if (Math.abs(average - 0.65) <= 0.0001 && (verdict === 'PASS' || verdict === 'NEEDS_REVISION')) return true
  if (Math.abs(average - 0.42) <= 0.0001 && (verdict === 'NEEDS_REVISION' || verdict === 'FAIL')) return true
  return false
}

/**
 * True when the container matches the random-metric object built by
 * POST /dev/seed-containers. This does not read or write a score.
 * xrayFlux is the in-memory value (1e-8 .. 1e-8+2e-6) or that value after scaleXray (10 .. 2010).
 */
export function matchesRandomMetricSeedShape(container: RandomMetricSeedShape): boolean {
  const resonance = container.resonanceProfile
  const moral = container.moralOverlay
  const solar = container.solarSnapshot
  if (!resonance || !moral || !solar) return false
  const verdict = resonance.verdict
  if (verdict !== 'PASS' && verdict !== 'NEEDS_REVISION' && verdict !== 'FAIL') return false
  if (resonance.fullBox7DVerdict !== verdict) return false
  if (container.hammerReason !== SEED_HAMMER_BY_VERDICT[verdict]) return false
  if (!container.source || !SEED_SOURCES.has(container.source)) return false
  if (!moral.moralNumerologicalTension || !SEED_TENSIONS.has(moral.moralNumerologicalTension)) return false
  if (!solar.activityLevel || !SEED_ACTIVITIES.has(solar.activityLevel)) return false

  const scores = [
    resonance.fullBox7DComposite,
    resonance.waveProximity,
    resonance.phaseAlignment,
    resonance.calibratedVortex,
    resonance.calibratedSync,
    resonance.neuralProximity,
    resonance.neuralVortex,
    resonance.gematriaResonance,
    resonance.structuralResonance,
    resonance.confidence,
    moral.trinitariumMoralScore,
    moral.virtueAlignment,
    moral.moralSafety,
    moral.intentAlignment,
    moral.trinitariumGematriaFusion,
  ]
  if (scores.some(score => score == null || !isFourDecimalQuantum(score))) return false

  const composite = resonance.fullBox7DComposite as number
  if (composite < 0.15 - 5e-5 || composite > 0.99 + 5e-5) return false
  const subs = [
    [resonance.waveProximity, 0.35],
    [resonance.phaseAlignment, 0.40],
    [resonance.calibratedVortex, 0.30],
    [resonance.calibratedSync, 0.38],
    [resonance.neuralProximity, 0.32],
    [resonance.neuralVortex, 0.28],
    [resonance.gematriaResonance, 0.36],
    [resonance.structuralResonance, 0.34],
  ] as const
  if (subs.some(([value, range]) => value == null || !withinJitterOrClamp(value, composite, range))) return false

  const confidence = resonance.confidence as number
  if (confidence < 0.25 - 5e-5 || confidence > 0.99 + 5e-5) return false

  const moralScore = moral.trinitariumMoralScore as number
  if (moralScore < 0.30 - 5e-5 || moralScore > 0.80 + 5e-5) return false
  if (moral.virtueAlignment == null || !withinJitterOrClamp(moral.virtueAlignment, moralScore, 0.30)) return false
  if (moral.moralSafety == null || !withinJitterOrClamp(moral.moralSafety, moralScore, 0.35)) return false
  if (moral.intentAlignment == null || !withinJitterOrClamp(moral.intentAlignment, moralScore, 0.28)) return false
  const fusion = moral.trinitariumGematriaFusion as number
  if (fusion < 0.225 - 5e-5 || fusion > 0.775 + 5e-5) return false

  const average = subs.reduce((sum, [value]) => sum + (value as number), 0) / subs.length
  if (!verdictAgrees(verdict, average)) return false

  const kp = solar.kpIndex
  const proton = solar.protonFlux
  const magnetometer = solar.magnetometer
  const solarTdf = solar.solarTdf
  const xray = solar.xrayFlux
  if (kp == null || !Number.isInteger(kp) || kp < 0 || kp > 8) return false
  if (proton == null || !Number.isInteger(proton) || proton < 0 || proton > 199) return false
  if (magnetometer == null || !Number.isInteger(magnetometer) || magnetometer < -100 || magnetometer > 99) return false
  if (solarTdf == null || !Number.isInteger(solarTdf) || solarTdf < 0 || solarTdf > 4) return false
  if (xray == null || !Number.isFinite(xray)) return false
  const inMemoryXray = xray >= 1e-8 - 1e-12 && xray <= 1e-8 + 2e-6 + 1e-12
  const scaledXray = xray >= 10 && xray <= 2010
  if (!inMemoryXray && !scaledXray) return false
  return true
}

export interface SeedExclusionInput {
  text?: string | null
  containerId?: string | null
  container?: RandomMetricSeedShape | null
}

/**
 * Pattern skip for the Manifold rebuild and the re-score candidate pick.
 * A container is skipped only when it has no proposal text and it matches
 * the random-metric seed shape. An evidence-list unknown is never skipped.
 * Origin tags and the seed id list are not a skip by themselves.
 */
export function isExcludedSeed(input: SeedExclusionInput): boolean {
  if (containerReviewFlag(input.containerId) === 'unknown') return false
  const text = input.text
  if (text != null && text.trim() !== '') return false
  if (!input.container) return false
  return matchesRandomMetricSeedShape(input.container)
}

/** Evidence-list unknowns stay in the loop with this flag. Seed and real ids are not flagged. */
export function containerReviewFlag(containerId?: string | null): 'unknown' | undefined {
  const id = containerId?.toLowerCase()
  if (id && EVIDENCE_UNKNOWN_IDS.has(id)) return 'unknown'
  return undefined
}

/** Read origin tags written by tagContainerOrigin. Unknown values are ignored. */
export function originFromRedisHash(
  entries: Record<string, string> | null | undefined,
): Map<string, ContainerOrigin> {
  const origins = new Map<string, ContainerOrigin>()
  if (!entries) return origins
  for (const [id, raw] of Object.entries(entries)) {
    try {
      const parsed = JSON.parse(raw) as { origin?: string }
      if (parsed.origin === 'seed' || parsed.origin === 'real') {
        origins.set(id.toLowerCase(), parsed.origin)
      }
    } catch { /* ignore malformed tag */ }
  }
  return origins
}

/** Write an origin tag. Does not read or modify the container or any on-chain payload. */
export async function tagContainerOrigin(
  client: RedisHashWriter,
  containerId: string,
  origin: ContainerOrigin,
  seedSource?: string,
): Promise<ContainerOriginRecord> {
  const record = containerOriginRecord(origin, seedSource)
  const field = containerOriginHashField(containerId, origin, seedSource)
  await client.hset(field.key, field.field, field.value)
  return record
}
