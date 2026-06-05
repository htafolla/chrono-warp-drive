import { createHash } from 'crypto'
import { solarDataFetcher } from './solarDataFetcher.js'
import { dynamoSolarGovernance, getPublicFeed } from './dynamoSolarGovernance.js'
import { isStructuredProposal, type StructuredDerivativeProposal } from './structuredProposal.js'
import { governanceToContainer, type ContainerVortex } from './temporalContainer.js'
import { persistContainerToChain } from './contractClient.js'
import { getRedisClient } from '../pubsub.js'
import { temporalManifold } from './temporalManifold.js'

const REDIS_CONTAINER_KEY = 'dynamo:containers'
const MAX_REDIS_CONTAINERS = 1000
const ECHO_SUFFIX = ' [echo]'

export interface AmbientActivityEntry {
  timestamp: number
  summary: string
  isEcho: boolean
  resonance7D: number
  previousResonance: number | null
  delta: number | null
  verdict: string
}

export interface FieldMomentum {
  recentVortexDensity: number
  meanResonance: number
  meanMoralScore: number
  momentum: number
  lastUpdate: string
  totalVortices: number
  persistentVortices: number
  persistenceRatio: number
}

interface AmbientFieldConfig {
  quietIntervalMs: number
  moderateIntervalMs: number
  activeIntervalMs: number
  stormIntervalMs: number
  kpDeltaThreshold: number
  xraySpikeThreshold: number
  momentumWindow: number
  selfReflectWindowMs: number
  selfReflectCandidates: number
  tier1Resonance: number
  tier1TmoMin: number
  tier2Resonance: number
  tier3Momentum: number
}

const DEFAULT_CONFIG: AmbientFieldConfig = {
  quietIntervalMs: 12 * 60 * 1000,
  moderateIntervalMs: 6 * 60 * 1000,
  activeIntervalMs: 4 * 60 * 1000,
  stormIntervalMs: 2 * 60 * 1000,
  kpDeltaThreshold: 0.5,
  xraySpikeThreshold: 1e-4,
  momentumWindow: 10,
  selfReflectWindowMs: 72 * 60 * 60 * 1000,
  selfReflectCandidates: 50,
  tier1Resonance: 0.88,
  tier1TmoMin: 0.55,
  tier2Resonance: 0.92,
  tier3Momentum: 0.75,
}

interface SolarSnapshot {
  kpIndex: number
  xrayLong: number
  activityLevel: string
  timestamp: string
}

export class AmbientField {
  private config: AmbientFieldConfig
  private timer: ReturnType<typeof setInterval> | null = null
  private lastSnapshot: SolarSnapshot | null = null
  private vortexCount = 0
  private recentVortices: Array<{ resonance7D: number; moralScore: number; timestamp: number }> = []
  private latestContainerHash = '0x' + '0'.repeat(64)
  private persistenceCount = 0
  private recentlySampledHashes: Set<string> = new Set()
  private activityLog: AmbientActivityEntry[] = []
  private lastAgedOut = 0

  constructor(config?: Partial<AmbientFieldConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  get isRunning(): boolean {
    return this.timer !== null
  }

  get totalVortices(): number {
    return this.vortexCount
  }

  getRecentActivity(limit: number = 20): AmbientActivityEntry[] {
    return this.activityLog.slice(-limit)
  }

  getFieldMomentum(): FieldMomentum {
    const window = this.recentVortices.slice(-this.config.momentumWindow)
    if (window.length === 0) {
      return {
        recentVortexDensity: 0,
        meanResonance: 0,
        meanMoralScore: 0,
        momentum: 0,
        lastUpdate: new Date().toISOString(),
      }
    }

    const meanResonance = window.reduce((s, v) => s + v.resonance7D, 0) / window.length
    const meanMoralScore = window.reduce((s, v) => s + v.moralScore, 0) / window.length
    const now = Date.now()
    const hourMs = 60 * 60 * 1000
    const recentHour = window.filter(v => now - v.timestamp < hourMs)
    const density = recentHour.length

    const momentum = meanResonance * 0.5 + meanMoralScore * 0.3 + Math.min(density / this.config.momentumWindow, 1) * 0.2

    return {
      recentVortexDensity: density,
      meanResonance,
      meanMoralScore,
      momentum,
      lastUpdate: new Date().toISOString(),
      totalVortices: this.vortexCount,
      persistentVortices: this.persistenceCount,
      persistenceRatio: this.vortexCount > 0 ? this.persistenceCount / this.vortexCount : 0,
    }
  }

  forceTick(): Promise<void> {
    return this.tick()
  }

  start(): void {
    if (this.timer) return
    this.tick()
    this.timer = setInterval(() => this.tick(), this.getIntervalMs())
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private getIntervalMs(): number {
    try {
      const activity = this.lastSnapshot?.activityLevel
      const momentum = this.getFieldMomentum().momentum

      let base: number
      if (activity === 'storm') base = this.config.stormIntervalMs
      else if (activity === 'active' || momentum > 0.7) base = this.config.activeIntervalMs
      else if (activity === 'moderate' || momentum > 0.5) base = this.config.moderateIntervalMs
      else base = this.config.quietIntervalMs

      const maxMomentumShortening = 0.4
      const shortened = Math.floor(base * (1 - momentum * maxMomentumShortening))
      return Math.max(shortened, 60_000)
    } catch {
      return this.config.quietIntervalMs
    }
  }

  private pickFeedCandidate(): string | null {
    try {
      const feed = getPublicFeed()
      if (feed.length === 0) return null

      const available = feed.filter(e => !this.recentlySampledHashes.has(e.proposal))
      if (available.length === 0) return null

      const pick = available[Math.floor(Math.random() * available.length)]
      this.recentlySampledHashes.add(pick.proposal)
      return pick.proposal
    } catch {
      return null
    }
  }

  private pickSelfReflectionCandidate(): { summary: string; hash: string; originalResonance: number } | null {
    const candidates = temporalManifold.getSelfReflectionCandidates(
      this.config.selfReflectWindowMs,
      this.config.selfReflectCandidates,
    )

    const available = candidates.filter(c => !this.recentlySampledHashes.has(c.proposalHash))
    if (available.length === 0) {
      const ageReset = Date.now() - 24 * 60 * 60 * 1000
      const aged = candidates.filter(c => c.timestamp < ageReset)
      if (aged.length > 0) {
        aged.forEach(c => this.recentlySampledHashes.delete(c.proposalHash))
      }
      const retry = candidates.filter(c => !this.recentlySampledHashes.has(c.proposalHash))
      if (retry.length === 0 && candidates.length > 0) {
        this.recentlySampledHashes.clear()
        const fresh = candidates.filter(c => !this.recentlySampledHashes.has(c.proposalHash))
        if (fresh.length === 0) return null
        const pick = fresh[Math.floor(Math.random() * fresh.length)]
        this.recentlySampledHashes.add(pick.proposalHash)
        return { summary: pick.summary!, hash: pick.proposalHash, originalResonance: pick.resonance7D }
      }
      if (retry.length === 0) return null
      const pick = retry[Math.floor(Math.random() * retry.length)]
      this.recentlySampledHashes.add(pick.proposalHash)
      return { summary: pick.summary!, hash: pick.proposalHash, originalResonance: pick.resonance7D }
    }

    const weighted = available.map(c => ({ candidate: c, weight: c.resonance7D }))
    const totalWeight = weighted.reduce((s, w) => s + w.weight, 0)
    let roll = Math.random() * totalWeight
    for (const w of weighted) {
      roll -= w.weight
      if (roll <= 0) {
        this.recentlySampledHashes.add(w.candidate.proposalHash)
        return { summary: w.candidate.summary!, hash: w.candidate.proposalHash, originalResonance: w.candidate.resonance7D }
      }
    }
    const fallback = available[0]
    if (!fallback) return null
    this.recentlySampledHashes.add(fallback.proposalHash)
    return { summary: fallback.summary!, hash: fallback.proposalHash, originalResonance: fallback.resonance7D }
  }

  private async tick(): Promise<void> {
    try {
      const solarData = await solarDataFetcher.fetchCurrentSolarData()
      const xrayLong = solarData.xray?.long ?? 0
      const kpIndex = solarData.kpIndex ?? 0
      const activityLevel = solarData.activityLevel ?? 'quiet'

      const snapshot: SolarSnapshot = {
        kpIndex,
        xrayLong,
        activityLevel,
        timestamp: solarData.timestamp,
      }

      const shouldCreateVortex = this.evaluateTriggers(snapshot) || this.evaluateMomentum()

      this.lastSnapshot = snapshot

      if (!shouldCreateVortex) {
        this.reschedule()
        return
      }

      // Self-reflection: pick a strong recent waypoint to re-evaluate
      const candidate = this.pickSelfReflectionCandidate()

      let summary: string

      if (candidate) {
        summary = candidate.summary + ECHO_SUFFIX
      } else if (temporalManifold.getPointCount() < 10) {
        // Jump-start: sample from Redis public feed when Manifold is sparse
        const feedCandidate = this.pickFeedCandidate()
        summary = feedCandidate ?? 'Ambient solar field'
      } else {
        summary = 'Ambient solar field'
      }

      const result = await dynamoSolarGovernance.enhanceGovernanceDecision(
        summary,
        1.0,
        false,
        undefined,
        undefined,
      )

      const resonance7D = result.fullBox7DComposite ?? 0
      const prevResonance = candidate?.originalResonance ?? null
      const delta = prevResonance !== null ? resonance7D - prevResonance : null

      this.recentVortices.push({
        resonance7D,
        moralScore: result.trinitariumMoralScore ?? 0.5,
        timestamp: Date.now(),
      })

      if (this.recentVortices.length > this.config.momentumWindow * 2) {
        this.recentVortices = this.recentVortices.slice(-this.config.momentumWindow)
      }

      this.vortexCount++

      this.activityLog.push({
        timestamp: Date.now(),
        summary: summary.replace(ECHO_SUFFIX, ''),
        isEcho: !!candidate,
        resonance7D,
        previousResonance: prevResonance,
        delta,
        verdict: result.recommendation ?? result.fullBox7DVerdict ?? 'NEEDS_REVISION',
      })
      if (this.activityLog.length > 100) {
        this.activityLog = this.activityLog.slice(-100)
      }

      // Feed into Manifold
      temporalManifold.addPoint({
        timestamp: Date.now(),
        proposalHash: createHash('sha256').update(summary).digest('hex').slice(0, 16),
        source: 'ambient',
        solarActivity: result.solarContext?.solarActivityLevel ?? 'quiet',
        resonance7D: result.fullBox7DComposite ?? 0.5,
        phaseAlignment: result.phaseAlignment ?? 0.5,
        vortexAlignment: result.calibratedVortex ?? 0.5,
        synchronization: result.synchronization ?? 0.5,
        gematriaResonance: result.gematriaResonance ?? 0.5,
        tmoScore: result.trinitariumMoralScore ?? 0.5,
        verdict: result.recommendation ?? result.fullBox7DVerdict ?? 'NEEDS_REVISION',
      }, summary)

      // Auto-persist if exceptional alignment
      const momentum = this.getFieldMomentum().momentum
      const verdict = result.recommendation || result.fullBox7DVerdict
      const tmoScore = result.trinitariumMoralScore ?? 0.5
      const shouldPersist =
        (resonance7D >= this.config.tier1Resonance && tmoScore >= this.config.tier1TmoMin) ||
        resonance7D >= this.config.tier2Resonance ||
        momentum >= this.config.tier3Momentum

      if (shouldPersist && verdict !== 'REJECT') {
        try {
          const source = 'ambient' as const
          const container = governanceToContainer(result, summary, source, this.latestContainerHash)
          await persistContainerToChain(container)
          this.latestContainerHash = container.containerHash
          this.persistenceCount++

          try {
            const client = await getRedisClient()
            if (client) {
              await client.multi()
                .lpush(REDIS_CONTAINER_KEY, JSON.stringify(container))
                .ltrim(REDIS_CONTAINER_KEY, 0, MAX_REDIS_CONTAINERS - 1)
                .exec()
            }
          } catch { /* Redis unavailable */ }
        } catch {
          // on-chain persistence failed — continue
        }
      }

      this.reschedule()
    } catch {
      // Ambient tick failed — retry next interval
      this.reschedule()
    }
  }

  private reschedule(): void {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = setInterval(() => this.tick(), this.getIntervalMs())
  }

  private evaluateTriggers(current: SolarSnapshot): boolean {
    const last = this.lastSnapshot
    if (!last) return true

    const kpDelta = Math.abs(current.kpIndex - last.kpIndex)
    const xrayDelta = Math.abs(current.xrayLong - last.xrayLong)

    const kpSpike = kpDelta >= this.config.kpDeltaThreshold
    const xraySpike = xrayDelta >= this.config.xraySpikeThreshold

    return kpSpike || xraySpike
  }

  private evaluateMomentum(): boolean {
    const momentum = this.getFieldMomentum()
    return momentum.momentum > 0.65 && momentum.recentVortexDensity < this.config.momentumWindow
  }
}

export const ambientField = new AmbientField()
