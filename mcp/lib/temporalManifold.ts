import { createHash } from 'crypto'

// ── Data Types ──

const DIGITAL_ROOT_ARCHETYPES: Record<number, string> = {
  1: 'Unity', 2: 'Balance', 3: 'Creativity', 4: 'Stability',
  5: 'Change', 6: 'Harmony', 7: 'Wisdom', 8: 'Power', 9: 'Completion',
}

const VIRTUE_PATTERNS: { virtue: string; patterns: RegExp[] }[] = [
  { virtue: 'Love', patterns: [/love/i, /compassion/i, /kindness/i, /mercy/i, /heal/i, /nurture/i, /cherish/i, /embrace/i] },
  { virtue: 'Truth', patterns: [/truth/i, /honest/i, /integrity/i, /transparent/i, /trust/i, /faithful/i, /witness/i, /accountab/i] },
  { virtue: 'Stewardship', patterns: [/steward/i, /protect/i, /preserve/i, /sustain/i, /build/i, /create/i, /guard/i, /plant/i, /cultivate/i, /restore/i, /secure/i] },
  { virtue: 'Hope', patterns: [/hope/i, /peace/i, /pray/i, /reconcil/i, /healing/i, /wholeness/i, /shalom/i] },
  { virtue: 'Justice', patterns: [/justice/i, /righteous/i, /fair/i, /equit/i, /right/i, /judgment/i, /upright/i] },
  { virtue: 'Humility', patterns: [/humble/i, /serve/i, /service/i, /meek/i, /gentle/i, /patient/i] },
]

export interface GematriaDecomposition {
  englishOrdinal: number
  fullReduction: number
  reverseOrdinal: number
  digitalRoot: number
  primaryArchetype: string
  symbolicSignature: string
  virtueMatches: string[]
  strength: number
}

export interface ManifoldPoint {
  timestamp: number
  proposalHash: string
  source: 'ambient' | 'human' | 'agent'
  solarActivity: string
  resonance7D: number
  phaseAlignment: number
  vortexAlignment: number
  synchronization: number
  gematriaResonance: number
  tmoScore: number
  verdict: string
  gematriaDecomposition?: GematriaDecomposition
  summary?: string
}

export interface ResonanceSnapshot {
  resonance7D: number
  phaseAlignment: number
  vortexAlignment: number
  synchronization: number
  gematriaResonance: number
  tmoScore: number
  gematriaDecomposition?: GematriaDecomposition
}

export interface FieldTrend {
  direction: 'rising' | 'falling' | 'stable'
  avgResonance7D: number
  minResonance7D: number
  maxResonance7D: number
  pointCount: number
  durationMs: number
  momentum: number
}

export interface TemporalQuery {
  timestamp: number
  interpolated: boolean
  nearestPoint: ManifoldPoint | null
  interpolatedSnapshot: ResonanceSnapshot | null
  confidence: number
}

// ── Gematria Decomposition ──

const ALPHA = 'abcdefghijklmnopqrstuvwxyz'
const EO_MAP: Record<string, number> = {}
const FR_MAP: Record<string, number> = {}
const RO_MAP: Record<string, number> = {}
for (let i = 0; i < 26; i++) {
  const c = ALPHA[i]
  EO_MAP[c] = i + 1
  FR_MAP[c] = (i % 9) + 1
  RO_MAP[c] = 26 - i
}

function digitalRoot(n: number): number {
  while (n >= 10) {
    let s = 0
    while (n > 0) { s += n % 10; n = Math.floor(n / 10) }
    n = s
  }
  return n
}

export function computeFullGematriaDecomposition(text: string): GematriaDecomposition {
  const clean = text.toLowerCase().replace(/[^a-z ]/g, '').trim()
  if (!clean) {
    return {
      englishOrdinal: 0, fullReduction: 0, reverseOrdinal: 0,
      digitalRoot: 0, primaryArchetype: 'Void', symbolicSignature: 'Empty signal',
      virtueMatches: [], strength: 0,
    }
  }

  let eo = 0, fr = 0, ro = 0
  for (const ch of clean.replace(/ /g, '')) {
    eo += EO_MAP[ch] ?? 0
    fr += FR_MAP[ch] ?? 0
    ro += RO_MAP[ch] ?? 0
  }

  const dr = digitalRoot(eo)
  const primaryArchetype = DIGITAL_ROOT_ARCHETYPES[dr] ?? 'Unknown'

  const matchedVirtues: string[] = []
  for (const vp of VIRTUE_PATTERNS) {
    for (const p of vp.patterns) {
      if (p.test(clean)) {
        if (!matchedVirtues.includes(vp.virtue)) matchedVirtues.push(vp.virtue)
        break
      }
    }
  }

  const virtueTag = matchedVirtues.length > 0 ? matchedVirtues.slice(0, 2).join(' + ') : null
  const symbolicSignature = virtueTag
    ? `${primaryArchetype} / ${virtueTag}`
    : primaryArchetype

  const len = clean.replace(/ /g, '').length || 1
  const maxEo = len * 26
  const strength = Math.min(1, eo / maxEo * 1.5 + fr / (len * 9) * 0.5)

  return {
    englishOrdinal: eo, fullReduction: fr, reverseOrdinal: ro,
    digitalRoot: dr, primaryArchetype, symbolicSignature,
    virtueMatches: matchedVirtues, strength,
  }
}

// ── Helpers ──

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function hashProposal(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

// ── Temporal Manifold ──

const MAX_POINTS = 5000
const MIN_POINTS_FOR_TREND = 3
const DEFAULT_SAMPLE_INTERVAL_MS = 20 * 60 * 1000
const HIGH_MOMENTUM_INTERVAL_MS = 5 * 60 * 1000
const MOMENTUM_THRESHOLD_HIGH = 0.65
const MOMENTUM_WINDOW = 20

export class TemporalManifold {
  private points: ManifoldPoint[] = []
  private momentumValues: number[] = []
  private lastSampleTime: number = 0
  private intervalMs: number = DEFAULT_SAMPLE_INTERVAL_MS
  private isRunning: boolean = false
  private timer: ReturnType<typeof setInterval> | null = null
  private manifoldId: string

  constructor() {
    this.manifoldId = 'tm-' + createHash('md5').update(String(Date.now())).digest('hex').slice(0, 8)
  }

  // ── Point Management ──

  addPoint(point: ManifoldPoint, proposalText?: string): void {
    if (proposalText) {
      point.gematriaDecomposition = computeFullGematriaDecomposition(proposalText)
      point.summary = proposalText
    }
    this.points.push(point)
    if (this.points.length > MAX_POINTS) {
      this.points = this.points.slice(-MAX_POINTS / 2)
    }
    const m = this.calcMomentum()
    this.momentumValues.push(m)
    if (this.momentumValues.length > MOMENTUM_WINDOW) {
      this.momentumValues = this.momentumValues.slice(-MOMENTUM_WINDOW)
    }
  }

  addFromContainer(container: {
    timestamp: number
    proposalHash: string
    source: string
    resonanceProfile: {
      fullBox7DComposite: number
      phaseAlignment: number
      calibratedVortex: number
      calibratedSync: number
      gematriaResonance: number
      verdict: string
    }
    moralOverlay: {
      trinitariumMoralScore: number
    }
  }, proposalText?: string): void {
    const point: ManifoldPoint = {
      timestamp: container.timestamp,
      proposalHash: container.proposalHash,
      source: container.source as 'ambient' | 'human' | 'agent',
      solarActivity: 'quiet',
      resonance7D: container.resonanceProfile.fullBox7DComposite,
      phaseAlignment: container.resonanceProfile.phaseAlignment,
      vortexAlignment: container.resonanceProfile.calibratedVortex,
      synchronization: container.resonanceProfile.calibratedSync,
      gematriaResonance: container.resonanceProfile.gematriaResonance,
      tmoScore: container.moralOverlay.trinitariumMoralScore,
      verdict: container.resonanceProfile.verdict,
    }
    this.addPoint(point, proposalText)
  }

  getPointCount(): number {
    return this.points.length
  }

  getAllPoints(): ManifoldPoint[] {
    return this.points
  }

  // ── Momentum ──

  private calcMomentum(): number {
    if (this.points.length < 2) return 0
    const recent = this.points.slice(-MOMENTUM_WINDOW)
    const meanRes = recent.reduce((s, p) => s + p.resonance7D, 0) / recent.length
    const meanTmo = recent.reduce((s, p) => s + p.tmoScore, 0) / recent.length
    const density = Math.min(1, recent.length / MOMENTUM_WINDOW)
    return clamp(meanRes * 0.5 + meanTmo * 0.3 + density * 0.2, 0, 1)
  }

  getMomentum(): number {
    if (this.momentumValues.length === 0) return 0
    return this.momentumValues[this.momentumValues.length - 1]
  }

  private calcTrend(): 'rising' | 'falling' | 'stable' {
    if (this.momentumValues.length < MIN_POINTS_FOR_TREND) return 'stable'
    const recent = this.momentumValues.slice(-5)
    const half = Math.floor(recent.length / 2)
    const firstHalf = recent.slice(0, half).reduce((s, v) => s + v, 0) / half
    const secondHalf = recent.slice(half).reduce((s, v) => s + v, 0) / (recent.length - half)
    const diff = secondHalf - firstHalf
    if (diff > 0.05) return 'rising'
    if (diff < -0.05) return 'falling'
    return 'stable'
  }

  // ── Interpolation (F(t)) ──

  interpolateAt(timestamp: number): TemporalQuery {
    if (this.points.length === 0) {
      return { timestamp, interpolated: false, nearestPoint: null, interpolatedSnapshot: null, confidence: 0 }
    }

    const sorted = this.points.slice().sort((a, b) => a.timestamp - b.timestamp)

    if (timestamp <= sorted[0].timestamp) {
      return {
        timestamp,
        interpolated: false,
        nearestPoint: sorted[0],
        interpolatedSnapshot: null,
        confidence: Math.min(1, this.points.length / 100),
      }
    }

    if (timestamp >= sorted[sorted.length - 1].timestamp) {
      return {
        timestamp,
        interpolated: false,
        nearestPoint: sorted[sorted.length - 1],
        interpolatedSnapshot: null,
        confidence: Math.min(1, this.points.length / 100),
      }
    }

    let before = sorted[0]
    let after = sorted[sorted.length - 1]
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].timestamp <= timestamp && sorted[i + 1].timestamp >= timestamp) {
        before = sorted[i]
        after = sorted[i + 1]
        break
      }
    }

    const alpha = (timestamp - before.timestamp) / (after.timestamp - before.timestamp)
    const tmoAlpha = alpha * (1 + (before.tmoScore + after.tmoScore) / 2 * 0.2)
    const clampedAlpha = clamp(alpha, 0, 1)
    const clampedTmoAlpha = clamp(tmoAlpha, 0, 1)

    const snap: ResonanceSnapshot = {
      resonance7D: lerp(before.resonance7D, after.resonance7D, clampedAlpha),
      phaseAlignment: lerp(before.phaseAlignment, after.phaseAlignment, clampedAlpha),
      vortexAlignment: lerp(before.vortexAlignment, after.vortexAlignment, clampedAlpha),
      synchronization: lerp(before.synchronization, after.synchronization, clampedAlpha),
      gematriaResonance: lerp(before.gematriaResonance, after.gematriaResonance, clampedAlpha),
      tmoScore: lerp(before.tmoScore, after.tmoScore, clampedTmoAlpha),
    }

    const timeGap = after.timestamp - before.timestamp
    const confidence = clamp(1 - timeGap / (24 * 60 * 60 * 1000), 0.1, 0.98)

    return { timestamp, interpolated: true, nearestPoint: before, interpolatedSnapshot: snap, confidence }
  }

  // ── Queries ──

  getFieldTrend(durationMs: number = 24 * 60 * 60 * 1000): FieldTrend {
    const cutoff = Date.now() - durationMs
    const window = this.points.filter(p => p.timestamp >= cutoff)
    if (window.length < MIN_POINTS_FOR_TREND) {
      const all = this.points.length > 0 ? this.points : []
      const avg = all.length > 0 ? all.reduce((s, p) => s + p.resonance7D, 0) / all.length : 0
      return {
        direction: 'stable',
        avgResonance7D: avg,
        minResonance7D: all.length > 0 ? Math.min(...all.map(p => p.resonance7D)) : 0,
        maxResonance7D: all.length > 0 ? Math.max(...all.map(p => p.resonance7D)) : 0,
        pointCount: all.length,
        durationMs: all.length > 0 ? Date.now() - all[0].timestamp : 0,
        momentum: this.getMomentum(),
      }
    }
    return {
      direction: this.calcTrend(),
      avgResonance7D: window.reduce((s, p) => s + p.resonance7D, 0) / window.length,
      minResonance7D: Math.min(...window.map(p => p.resonance7D)),
      maxResonance7D: Math.max(...window.map(p => p.resonance7D)),
      pointCount: window.length,
      durationMs,
      momentum: this.getMomentum(),
    }
  }

  getStrongestMoments(minResonance: number = 0.75, limit: number = 10): ManifoldPoint[] {
    return this.points
      .filter(p => p.resonance7D >= minResonance)
      .sort((a, b) => b.resonance7D - a.resonance7D)
      .slice(0, limit)
  }

  getSelfReflectionCandidates(windowMs: number = 72 * 60 * 60 * 1000, limit: number = 50): ManifoldPoint[] {
    const cutoff = Date.now() - windowMs
    return this.points
      .filter(p => p.timestamp > cutoff && p.resonance7D >= 0.65 && p.summary)
      .sort((a, b) => b.resonance7D - a.resonance7D)
      .slice(0, limit)
  }

  getAxioms(minResonance: number = 0.80, minOccurrences: number = 3): Array<{
    resonance7D: number
    tmoScore: number
    occurrences: number
    lastSeen: number
    proposalHashes: string[]
  }> {
    const grouped = new Map<string, {
      resonance7D: number
      tmoScore: number
      occurrences: number
      lastSeen: number
      proposalHashes: string[]
    }>()
    for (const p of this.points) {
      if (p.resonance7D < minResonance) continue
      const existing = grouped.get(p.proposalHash)
      if (existing) {
        existing.occurrences++
        existing.lastSeen = Math.max(existing.lastSeen, p.timestamp)
        existing.proposalHashes.push(p.proposalHash)
      } else {
        grouped.set(p.proposalHash, {
          resonance7D: p.resonance7D,
          tmoScore: p.tmoScore,
          occurrences: 1,
          lastSeen: p.timestamp,
          proposalHashes: [p.proposalHash],
        })
      }
    }
    return Array.from(grouped.values())
      .filter(g => g.occurrences >= minOccurrences)
      .sort((a, b) => b.resonance7D * b.tmoScore - a.resonance7D * a.tmoScore)
  }

  // ── Self-Adjusting Sample Interval ──

  private getAdaptiveIntervalMs(): number {
    const m = this.getMomentum()
    return m >= MOMENTUM_THRESHOLD_HIGH ? HIGH_MOMENTUM_INTERVAL_MS : DEFAULT_SAMPLE_INTERVAL_MS
  }

  // ── Sampling ──

  private async sample(
    governFn: (proposal: string) => Promise<{
      fullBox7DComposite?: number
      fullBox7DVerdict?: string
      recommendation?: string
      trinitariumMoralScore?: number
      phaseAlignment?: number
      calibratedVortex?: number
      calibratedSync?: number
      gematriaResonance?: number
      solarContext?: { solarActivityLevel?: string }
    } | null>
  ): Promise<void> {
    const now = Date.now()
    if (now - this.lastSampleTime < this.intervalMs) return
    this.lastSampleTime = now

    this.intervalMs = this.getAdaptiveIntervalMs()

    try {
      const proposal = `Temporal Manifold sample ${now}`
      const result = await governFn(proposal)
      if (!result) return

      this.addPoint({
        timestamp: now,
        proposalHash: hashProposal(proposal),
        source: 'ambient',
        solarActivity: result.solarContext?.solarActivityLevel ?? 'quiet',
        resonance7D: result.fullBox7DComposite ?? 0.5,
        phaseAlignment: result.phaseAlignment ?? 0.5,
        vortexAlignment: result.calibratedVortex ?? 0.5,
        synchronization: result.calibratedSync ?? 0.5,
        gematriaResonance: result.gematriaResonance ?? 0.5,
        tmoScore: result.trinitariumMoralScore ?? 0.5,
        verdict: result.recommendation ?? result.fullBox7DVerdict ?? 'NEEDS_REVISION',
      })
    } catch {
      // sample failed — retry next cycle
    }
  }

  // ── Start/Stop ──

  async start(
    governFn: (proposal: string) => Promise<{
      fullBox7DComposite?: number
      fullBox7DVerdict?: string
      recommendation?: string
      trinitariumMoralScore?: number
      phaseAlignment?: number
      calibratedVortex?: number
      calibratedSync?: number
      gematriaResonance?: number
      solarContext?: { solarActivityLevel?: string }
    } | null>
  ): Promise<void> {
    if (this.isRunning) return
    this.isRunning = true
    const tick = async () => {
      await this.sample(governFn)
      this.intervalMs = this.getAdaptiveIntervalMs()
    }
    await tick()
    this.timer = setInterval(tick, 60_000)
  }

  stop(): void {
    this.isRunning = false
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  getStatus(): {
    pointCount: number
    momentum: number
    trend: string
    intervalMs: number
    isRunning: boolean
    manifoldId: string
  } {
    const trend = this.calcTrend()
    return {
      pointCount: this.points.length,
      momentum: this.getMomentum(),
      trend,
      intervalMs: this.intervalMs,
      isRunning: true,
      manifoldId: this.manifoldId,
    }
  }
}

export const temporalManifold = new TemporalManifold()
