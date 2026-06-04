import { solarDataFetcher } from './solarDataFetcher.js'
import { dynamoSolarGovernance } from './dynamoSolarGovernance.js'
import { isStructuredProposal, type StructuredDerivativeProposal } from './structuredProposal.js'
import { governanceToContainer, type ContainerVortex } from './temporalContainer.js'

export interface FieldMomentum {
  recentVortexDensity: number
  meanResonance: number
  meanMoralScore: number
  momentum: number
  lastUpdate: string
}

interface AmbientFieldConfig {
  baseIntervalMs: number
  activeIntervalMs: number
  stormIntervalMs: number
  kpDeltaThreshold: number
  xraySpikeThreshold: number
  momentumWindow: number
}

const DEFAULT_CONFIG: AmbientFieldConfig = {
  baseIntervalMs: 20 * 60 * 1000,
  activeIntervalMs: 10 * 60 * 1000,
  stormIntervalMs: 5 * 60 * 1000,
  kpDeltaThreshold: 0.5,
  xraySpikeThreshold: 1e-4,
  momentumWindow: 10,
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

  constructor(config?: Partial<AmbientFieldConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  get isRunning(): boolean {
    return this.timer !== null
  }

  get totalVortices(): number {
    return this.vortexCount
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
    }
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

      if (activity === 'storm') {
        return this.config.stormIntervalMs
      }

      if ((activity === 'active') || momentum > 0.7) {
        return this.config.activeIntervalMs
      }

      if (momentum > 0.5) {
        return Math.floor((this.config.baseIntervalMs + this.config.activeIntervalMs) / 2)
      }

      return this.config.baseIntervalMs
    } catch {
      return this.config.baseIntervalMs
    }
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

      if (!shouldCreateVortex) return

      const summary = this.buildAmbientSummary(snapshot)
      const structuredProposal: StructuredDerivativeProposal = {
        id: `ambient-${Date.now()}`,
        timestamp: new Date().toISOString(),
        summary,
        intent: 'ambient temporal field sampling',
        source: 'ambient',
        tags: ['ambient', activityLevel],
        riskLevel: 'low',
        confidence: 0.85,
      }

      const result = await dynamoSolarGovernance.enhanceGovernanceDecision(
        summary,
        1.0,
        false,
        undefined,
        undefined,
      )

      this.recentVortices.push({
        resonance7D: result.fullBox7DComposite ?? 0,
        moralScore: result.trinitariumMoralScore ?? 0.5,
        timestamp: Date.now(),
      })

      if (this.recentVortices.length > this.config.momentumWindow * 2) {
        this.recentVortices = this.recentVortices.slice(-this.config.momentumWindow)
      }

      this.vortexCount++

      if (this.timer) {
        clearInterval(this.timer)
        this.timer = setInterval(() => this.tick(), this.getIntervalMs())
      }
    } catch {
      // Ambient field tick failed — retry next interval
    }
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

  private buildAmbientSummary(snapshot: SolarSnapshot): string {
    return 'Ambient solar field'
  }
}

export const ambientField = new AmbientField()