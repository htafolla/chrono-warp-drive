// mcp/lib/dynamoSolarGovernance.ts
// Enhanced Dynamo Governance with real-time Solar Context

import { solarGovernance } from './solarGovernanceIntegration.js'
import { getRedisClient } from '../pubsub.js'

const REDIS_HISTORY_KEY = 'dynamo:history'
const REDIS_FEED_KEY = 'dynamo:feed'
const MAX_REDIS_ENTRIES = 10000
const MAX_FEED_REDIS_ENTRIES = 500

function normalizeKey(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)
}

export interface EnhancedGovernanceDecision {
  originalRecommendation: string
  solarContext: {
    solarActivityLevel: string
    solarActivityModifier: number
    recommendation: string
    solarIsotopicResonance?: number
    proposalTdf?: number
    solarReferenceTdf?: number
  }
  adjustedVoteWeight: number
  finalRecommendation: string
  confidenceAdjustment: number
  resonanceScore?: number
  structuralResonance?: number
  proximity?: number
  phaseAlignment?: number
  vortexAlignment?: number
  crossCorrelationLag?: number
  signalTiming?: 'leading' | 'trailing' | 'synced'
  synchronization?: number
  smoothedResonance?: number
  trend?: 'rising' | 'falling' | 'stable'
  momentum?: number
  peakForecast?: {
    estimatedPeakResonance: number
    minutesToPeak: number
    windowQuality: 'optimal' | 'good' | 'declining'
  }
  adaptiveThresholds?: {
    strong: number
    good: number
    weak: number
  }
  recommendation?: 'PASS' | 'NEEDS_REVISION' | 'REJECT'
  confidence?: number
  isSolarHammer?: boolean
  hammerReason?: string
  resonanceHistory?: Array<{ score: number; timestamp: string }>
  spectralQuality?: number
  neuralContextUsed: boolean
  waveProximity: number
  waveVortexAlignment: number
  waveSynchronization: number
  hybridVortexAlignment: number
  hybrid4DComposite: number
  hybridVerdict: 'PASS' | 'NEEDS_REVISION' | 'REJECT'
  fullWave4DComposite: number
  calibratedWave4DComposite: number
  fullBoxProximity: number
  fullBoxVortexAlignment: number
  fullBoxSynchronization: number
  fullBox4DComposite: number
  fullBoxVerdict: 'PASS' | 'NEEDS_REVISION' | 'REJECT'
}

export interface PublicFeedEntry {
  proposal: string
  resonanceScore: number
  recommendation: string
  activityLevel: string
  timestamp: string
}

export interface HistoryEntry {
  proposal: string
  timestamp: string
  response: EnhancedGovernanceDecision
}

const MAX_FEED_ENTRIES = 50
const publicFeed: PublicFeedEntry[] = []

const MAX_HISTORY_PER_PROPOSAL = 10
const HISTORY_WINDOW_MS = 3 * 60 * 1000
const MIN_SAMPLES_FOR_TREND = 3
const resonanceHistory: Map<string, Array<{ score: number; timestamp: string }>> = new Map()

// ── Redis-backed history (durable across deploys) ──

/** Push a full query+response entry to Redis history. */
async function storeInRedis(entry: HistoryEntry): Promise<void> {
  try {
    const client = await getRedisClient()
    if (!client) return
    const raw = JSON.stringify(entry)
    await client.multi()
      .lpush(REDIS_HISTORY_KEY, raw)
      .ltrim(REDIS_HISTORY_KEY, 0, MAX_REDIS_ENTRIES - 1)
      .exec()
  } catch {
    // Redis unavailable — silently degrade
  }
}

/** Push a feed entry to Redis. */
async function storeFeedInRedis(entry: PublicFeedEntry): Promise<void> {
  try {
    const client = await getRedisClient()
    if (!client) return
    const raw = JSON.stringify(entry)
    await client.multi()
      .lpush(REDIS_FEED_KEY, raw)
      .ltrim(REDIS_FEED_KEY, 0, MAX_FEED_REDIS_ENTRIES - 1)
      .exec()
  } catch {
    // Redis unavailable — silently degrade
  }
}

/** Load feed entries from Redis into the in-memory cache. */
async function loadFeedFromRedis(): Promise<void> {
  try {
    const client = await getRedisClient()
    if (!client) return
    const entries = await client.lrange(REDIS_FEED_KEY, 0, MAX_FEED_ENTRIES - 1)
    for (const raw of entries) {
      try {
        const entry = JSON.parse(raw) as PublicFeedEntry
        publicFeed.push(entry)
      } catch { /* skip corrupt entries */ }
    }
  } catch {
    // Redis unavailable — start empty
  }
}

/** Load history entries from Redis. */
async function loadHistoryFromRedis(): Promise<HistoryEntry[]> {
  try {
    const client = await getRedisClient()
    if (!client) return []
    const entries = await client.lrange(REDIS_HISTORY_KEY, 0, 99)
    return entries.map((raw: string) => {
      try { return JSON.parse(raw) as HistoryEntry } catch { return null }
    }).filter(Boolean)
  } catch {
    return []
  }
}

// Bootstrap: load existing feed from Redis on module init
loadFeedFromRedis()

export function getPublicFeed(): PublicFeedEntry[] {
  return publicFeed
}

export function getResonanceHistory(key: string): Array<{ score: number; timestamp: string }> {
  return resonanceHistory.get(key) || []
}

/**
 * Return the N most recent full history entries from Redis.
 * Falls back to in-memory publicFeed if Redis unavailable.
 */
export async function getHistory(n: number = 100): Promise<HistoryEntry[]> {
  const redis = await loadHistoryFromRedis()
  if (redis.length > 0) return redis.slice(0, n)
  // Fallback: convert in-memory feed to history entries
  return publicFeed.slice(0, n).map(e => ({
    proposal: e.proposal,
    timestamp: e.timestamp,
    response: {
      originalRecommendation: e.proposal,
      solarContext: { solarActivityLevel: e.activityLevel, solarActivityModifier: 0, recommendation: '' },
      adjustedVoteWeight: 1,
      finalRecommendation: '',
      confidenceAdjustment: 0,
      resonanceScore: e.resonanceScore,
      structuralResonance: e.resonanceScore,
      recommendation: e.recommendation as 'PASS' | 'NEEDS_REVISION' | 'REJECT',
      neuralContextUsed: false,
    } as EnhancedGovernanceDecision,
  }))
}

export class DynamoSolarGovernance {

  async enhanceGovernanceDecision(
    originalRecommendation: string,
    baseVoteWeight: number = 1.0,
    sharePublicly: boolean = false,
    spectralQuality?: number,
  ): Promise<EnhancedGovernanceDecision> {
    const solarContext = await solarGovernance.getSolarContextForGovernance()

    const hammer = await solarGovernance.getProposalSolarIsotopicResonance(originalRecommendation, spectralQuality)

    const adjustedVoteWeight = Math.max(0.5, Math.min(1.5, baseVoteWeight + solarContext.solarActivityModifier + hammer.activityModifier * 0.5))

    let confidenceAdjustment = 0
    if (solarContext.solarActivityLevel === 'storm') {
      confidenceAdjustment = -0.15
    } else if (solarContext.solarActivityLevel === 'active') {
      confidenceAdjustment = -0.08
    } else if (solarContext.solarActivityLevel === 'quiet') {
      confidenceAdjustment = 0.05
    }

    // === Phase 4: Adaptive Solar Governance ===
    // Decision thresholds shift based on solar activity level
    // Quiet sun: easier to PASS (lower thresholds)
    // Storm sun: harder to PASS (higher thresholds)
    // Moderate/active: standard thresholds
    const adaptiveThresholds = {
      quiet:    { strong: 0.82, good: 0.72, weak: 0.58 },
      moderate: { strong: 0.88, good: 0.78, weak: 0.62 },
      active:   { strong: 0.88, good: 0.78, weak: 0.62 },
      storm:    { strong: 0.92, good: 0.84, weak: 0.70 },
    }
    const activityKey = solarContext.solarActivityLevel as keyof typeof adaptiveThresholds
    const thresholds = adaptiveThresholds[activityKey] || adaptiveThresholds.moderate

    const r = hammer.structuralResonance
    let hammerRec: 'PASS' | 'NEEDS_REVISION' | 'REJECT' = 'NEEDS_REVISION'
    let hammerConf = 0.72
    let hammerReason = 'Solar alignment neutral'

    if (r >= thresholds.strong) {
      hammerRec = 'PASS'
      hammerConf = 0.93
      hammerReason = 'Strong resonance with current solar conditions'
    } else if (r >= thresholds.good) {
      hammerRec = 'PASS'
      hammerConf = 0.85
      hammerReason = 'Good alignment with solar field'
    } else if (r >= thresholds.weak) {
      hammerRec = 'NEEDS_REVISION'
      hammerConf = 0.74
      hammerReason = 'Moderate resonance — needs refinement'
    } else {
      hammerRec = 'REJECT'
      hammerConf = 0.81
      hammerReason = 'Low resonance with the sun — misaligned'
    }

    // Storm override already built into thresholds, but still downgrade PASS
    if (solarContext.solarActivityLevel === 'storm') {
      if (hammerRec === 'PASS') hammerRec = 'NEEDS_REVISION'
      hammerConf = Math.max(0.60, hammerConf - 0.12)
      hammerReason = 'Solar storm in progress — caution applied'
    } else if (solarContext.solarActivityLevel === 'active' && hammerRec === 'PASS') {
      hammerConf = Math.max(0.70, hammerConf - 0.06)
    }

    // Store resonance history keyed by normalized proposal text
    const now = new Date()
    const key = normalizeKey(originalRecommendation)
    const history = resonanceHistory.get(key) || []
    history.unshift({ score: r, timestamp: now.toISOString() })
    if (history.length > MAX_HISTORY_PER_PROPOSAL) history.pop()
    resonanceHistory.set(key, history)

    // Compute smoothed resonance and trend from 3-minute window
    const windowStart = now.getTime() - HISTORY_WINDOW_MS
    const recentScores = history.filter(h => new Date(h.timestamp).getTime() >= windowStart)
    const smoothedResonance = recentScores.length >= MIN_SAMPLES_FOR_TREND
      ? recentScores.reduce((sum, h) => sum + h.score, 0) / recentScores.length
      : undefined
    let trend: 'rising' | 'falling' | 'stable' | undefined
    if (recentScores.length >= MIN_SAMPLES_FOR_TREND) {
      const first = recentScores[recentScores.length - 1].score
      const last = recentScores[0].score
      const diff = last - first
      trend = diff > 0.05 ? 'rising' : diff < -0.05 ? 'falling' : 'stable'
    }

    // === Phase 3: Resonance Momentum (dR/dt) ===
    // Rate of change per minute, computed from the 3-minute window
    let momentum: number | undefined
    if (recentScores.length >= 2) {
      const newest = recentScores[0]
      const oldest = recentScores[recentScores.length - 1]
      const dtMinutes = (new Date(newest.timestamp).getTime() - new Date(oldest.timestamp).getTime()) / 60000
      if (dtMinutes > 0) {
        momentum = (newest.score - oldest.score) / dtMinutes
      }
    }

    // === Phase 3: Peak Forecast ===
    // Predicts when resonance will peak based on current momentum and solar activity
    let peakForecast: EnhancedGovernanceDecision['peakForecast']
    if (momentum !== undefined && recentScores.length >= MIN_SAMPLES_FOR_TREND) {
      const currentR = r
      const momentumPerMin = Math.abs(momentum)
      // Estimate peak: if rising, extrapolate to cap (0.98); if falling, peak is now or past
      let estimatedPeakResonance: number
      let minutesToPeak: number
      let windowQuality: 'optimal' | 'good' | 'declining'

      if (momentum > 0.001) {
        // Rising: estimate time to reach near-cap
        const ceiling = 0.95
        const delta = ceiling - currentR
        minutesToPeak = delta > 0 && momentumPerMin > 0 ? Math.round(delta / momentumPerMin) : 0
        estimatedPeakResonance = Math.min(0.98, currentR + momentumPerMin * minutesToPeak)
        windowQuality = currentR >= 0.78 ? 'optimal' : 'good'
      } else if (momentum < -0.001) {
        // Falling: resonance is declining — best window is now or already passed
        minutesToPeak = 0
        estimatedPeakResonance = currentR
        windowQuality = currentR >= 0.78 ? 'good' : 'declining'
      } else {
        // Stable: this is the plateau
        minutesToPeak = 0
        estimatedPeakResonance = currentR
        windowQuality = currentR >= 0.78 ? 'optimal' : 'good'
      }

      // Solar activity modifier: storms collapse windows
      if (solarContext.solarActivityLevel === 'storm') {
        windowQuality = 'declining'
        minutesToPeak = 0
      } else if (solarContext.solarActivityLevel === 'active' && windowQuality === 'optimal') {
        windowQuality = 'good'
      }

      peakForecast = { estimatedPeakResonance, minutesToPeak, windowQuality }
    }

    const finalRec = hammerRec === 'PASS' ? 'PASS' : hammerRec === 'REJECT' ? 'REJECT' : 'NEEDS_REVISION'
    const tagged = `${originalRecommendation} [SOLAR HAMMER: ${finalRec} @ ${(r*100).toFixed(0)}%]`

    if (sharePublicly && originalRecommendation.length >= 3) {
      const feedEntry: PublicFeedEntry = {
        proposal: originalRecommendation,
        resonanceScore: r,
        recommendation: finalRec,
        activityLevel: solarContext.solarActivityLevel,
        timestamp: now.toISOString(),
      }
      publicFeed.unshift(feedEntry)
      if (publicFeed.length > MAX_FEED_ENTRIES) publicFeed.pop()
      storeFeedInRedis(feedEntry)
    }

    const result: EnhancedGovernanceDecision = {
      originalRecommendation,
      solarContext: {
        solarActivityLevel: solarContext.solarActivityLevel,
        solarActivityModifier: solarContext.solarActivityModifier,
        recommendation: solarContext.recommendation,
        solarIsotopicResonance: hammer.solarIsotopicResonance,
        proposalTdf: hammer.proposalTdf,
        solarReferenceTdf: hammer.solarReferenceTdf,
      },
      adjustedVoteWeight,
      finalRecommendation: tagged,
      confidenceAdjustment,
      resonanceScore: hammer.structuralResonance,
      structuralResonance: hammer.structuralResonance,
      proximity: hammer.proximity,
      phaseAlignment: hammer.phaseAlignment,
      vortexAlignment: hammer.vortexAlignment,
      crossCorrelationLag: hammer.crossCorrelationLag,
      signalTiming: hammer.signalTiming,
      synchronization: hammer.synchronization,
      smoothedResonance,
      trend,
      momentum,
      peakForecast,
      adaptiveThresholds: thresholds,
      recommendation: finalRec,
      confidence: hammerConf,
      isSolarHammer: true,
      hammerReason,
      resonanceHistory: history.length > 1 ? history : undefined,
      spectralQuality: hammer.spectralQuality,
      neuralContextUsed: hammer.neuralContextUsed,
      phaseType: hammer.phaseType,
      isotope: hammer.isotope,
      waveProximity: hammer.waveProximity,
      waveVortexAlignment: hammer.waveVortexAlignment,
      waveSynchronization: hammer.waveSynchronization,
      hybridVortexAlignment: hammer.hybridVortexAlignment,
      hybrid4DComposite: hammer.hybrid4DComposite,
      hybridVerdict: hammer.hybridVerdict,
      fullWave4DComposite: hammer.fullWave4DComposite,
      calibratedWave4DComposite: hammer.calibratedWave4DComposite,
      fullBoxProximity: hammer.fullBoxProximity,
      fullBoxVortexAlignment: hammer.fullBoxVortexAlignment,
      fullBoxSynchronization: hammer.fullBoxSynchronization,
      fullBox4DComposite: hammer.fullBox4DComposite,
      fullBoxVerdict: hammer.fullBoxVerdict,
    }

    // Persist every query+response to Redis for durable history
    storeInRedis({
      proposal: originalRecommendation,
      timestamp: now.toISOString(),
      response: result,
    })

    return result
  }
}

export const dynamoSolarGovernance = new DynamoSolarGovernance()
