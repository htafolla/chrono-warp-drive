import { solarDataFetcher } from './solarDataFetcher.js'
import { dynamoSolarGovernance } from './dynamoSolarGovernance.js'
import type { StructuredDerivativeProposal } from './structuredProposal.js'

interface AmbientFieldConfig {
  baseIntervalMs: number
  activeIntervalMs: number
  kpDeltaThreshold: number
  xraySpikeThreshold: number
}

const DEFAULT_CONFIG: AmbientFieldConfig = {
  baseIntervalMs: 20 * 60 * 1000,
  activeIntervalMs: 10 * 60 * 1000,
  kpDeltaThreshold: 0.5,
  xraySpikeThreshold: 1e-4,
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

  constructor(config?: Partial<AmbientFieldConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  get isRunning(): boolean {
    return this.timer !== null
  }

  get totalVortices(): number {
    return this.vortexCount
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
      if (activity === 'active' || activity === 'storm') {
        return this.config.activeIntervalMs
      }
    } catch {}
    return this.config.baseIntervalMs
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

      const shouldCreateVortex = this.evaluateTriggers(snapshot)

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

      await dynamoSolarGovernance.enhanceGovernanceDecision(
        summary,
        1.0,
        false,
        undefined,
        undefined,
      )

      this.vortexCount++
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

  private buildAmbientSummary(snapshot: SolarSnapshot): string {
    const adjectives: Record<string, string> = {
      quiet: 'Ambient solar field — stable',
      moderate: 'Ambient solar field — moderate activity',
      active: 'Ambient solar field — elevated activity',
      storm: 'Ambient solar field — geomagnetic storm',
    }
    const base = adjectives[snapshot.activityLevel] || 'Ambient solar field sampling'
    return `${base} (Kp=${snapshot.kpIndex.toFixed(1)})`
  }
}

export const ambientField = new AmbientField()
