// Text-derived isotopic signal parameters.
// Standalone isotopic ratio is intentionally not computed: the Codex defines
// isotopicRatio only as a pairwise comparison. See "Needs Blaze" in the PR.

import { computeFullTDF } from './vortexMath.js'

/** φ = 1.666 — documentation/docs/mathematical-reference.md:13 */
const PHI = 1.666
/** τ = 0.865 — documentation/docs/mathematical-reference.md:14 */
const TAU = 0.865

/**
 * Missing solar activity falls back to ordinal 1 (moderate).
 * mcp/lib/solarGovernanceIntegration.ts:68
 * Ordinals: documentation/docs/for-physicists.md:51
 */
const DEFAULT_ACTIVITY_ORDINAL = 1

export interface ResolvedClock {
  timestampMs: number
  timestamp: string
}

export interface TextSignalParams {
  tdf: number
  cascadeIndex: number
}

export class TextDerivedSignal {
  readonly content: string
  readonly tdfValue: number
  readonly cascadeIndex: number
  readonly phaseCoherence: number

  constructor(content: string, options?: { tdf?: number; cascadeIndex?: number }) {
    const derived = deriveTextSignalParams(content)
    this.content = content
    this.tdfValue = options?.tdf ?? derived.tdf
    this.cascadeIndex = options?.cascadeIndex ?? cascadeFromTdf(this.tdfValue)
    // phaseCoherence = sin²(2π × τ × (TDF mod √φ))
    // documentation/docs/mathematical-reference.md:529-530
    const reducedTdf = this.tdfValue % Math.sqrt(PHI)
    this.phaseCoherence = Math.pow(Math.sin(2 * Math.PI * TAU * reducedTdf), 2)
  }

  getTdfValue(): number { return this.tdfValue }
  getCascadeIndex(): number { return this.cascadeIndex }
  getPhaseCoherence(): number { return this.phaseCoherence }

  getIsotopeId(): string {
    return `blurrn-core-${Math.floor(this.tdfValue / 1e6)}`
  }

  /** variantDelta[0] = TDF mod 10⁶ — documentation/docs/mathematical-reference.md:533 */
  variantDelta0(): number {
    return this.tdfValue % 1e6
  }

  /**
   * Pairwise only. documentation/docs/mathematical-reference.md:537-540
   * docs/blurrn-codex/V4.8-Isotopic-Temporal-Vortex-Spec.md:58
   */
  isotopicRatioWith(other: TextDerivedSignal): number {
    const delta = this.variantDelta0()
    const otherDelta = other.variantDelta0()
    const maxDelta = Math.max(Math.abs(delta), Math.abs(otherDelta)) + 1e-9
    return 1 - (Math.abs(delta - otherDelta) / maxDelta)
  }

  /** embed = [TDF × φ, cascadeIndex, phaseCoherence] — documentation/docs/mathematical-reference.md:532 */
  embed(): number[] {
    return [this.tdfValue * PHI, this.cascadeIndex, this.phaseCoherence]
  }
}

export interface CrossScore {
  strength: number
  lag: number
  vortexVolume: number
  isotopicRatio: number
}

export interface TriangulatedSignal {
  index: number
  content: string
  tdfValue: number
  phaseCoherence: number
  cascadeIndex: number
  fingerprint: {
    coreId: string
    variantDelta: number[]
    provenance: string[]
  }
  correlations: Array<{
    content: string
    strength: number
    lag: number
    vortexVolume: number
    isotopicRatio: number
  }>
}

export interface TriangulationScore {
  signalCount: number
  results: TriangulatedSignal[]
  coreResonance: number
  vortexVolume: number
}

/**
 * Explicit clock for a stored result. Defaults to now.
 * The documented text→TDF mapping does not consume this value.
 */
export function resolveTimestampMs(input?: number | string): ResolvedClock {
  if (input === undefined) {
    const timestampMs = Date.now()
    return { timestampMs, timestamp: new Date(timestampMs).toISOString() }
  }
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) {
      throw new Error('timestamp must be a finite number of milliseconds or an ISO-8601 string')
    }
    return { timestampMs: input, timestamp: new Date(input).toISOString() }
  }
  const timestampMs = Date.parse(input)
  if (Number.isNaN(timestampMs)) {
    throw new Error('timestamp must be a finite number of milliseconds or an ISO-8601 string')
  }
  return { timestampMs, timestamp: new Date(timestampMs).toISOString() }
}

/**
 * cascadeIndex = floor((TDF mod 10⁶) / 10000) mod 100
 * documentation/docs/mathematical-reference.md:552
 */
export function cascadeFromTdf(tdf: number): number {
  return Math.floor((tdf % 1e6) / 10000) % 100
}

/**
 * FNV-1a used by the proposal mapping layer.
 * documentation/docs/mathematical-reference.md:262-264
 * mcp/lib/solarGovernanceIntegration.ts:31-38
 */
function fnvHash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/**
 * Proposal text → Codex TDF inputs, then the TDF composition chain.
 * Mapping: documentation/docs/mathematical-reference.md:56-61
 *          documentation/docs/codex-formulas-and-proofs.md:381-386
 * TDF:     documentation/docs/mathematical-reference.md:43-48
 *          documentation/docs/codex-formulas-and-proofs.md:273-279
 *          mcp/lib/vortexMath.ts:19-38
 *
 * δ_t uses activityOrdinal 1 when the tool has no solar observation.
 * The raw string is hashed. The mapping section does not define a normalizer.
 */
export function deriveTextSignalParams(content: string): TextSignalParams {
  const words = content.split(/\s+/).filter((word) => word.length > 0)
  const wordCount = words.length
  const totalChars = content.length
  const uniqueChars = new Set(content).size
  const charRatio = totalChars > 0 ? uniqueChars / totalChars : 0
  // T_c = 0.5 + (wordCount / 50) + (uniqueChars / totalChars) × 0.5
  const T_c = 0.5 + (wordCount / 50) + charRatio * 0.5
  const hashVal = fnvHash(content)
  // P_s = 0.1 + (FNV_hash mod 100000) / 100000
  const P_s = 0.1 + (hashVal % 100000) / 100000
  // E_t = 0.1 + (uniqueChars / totalChars)
  const E_t = 0.1 + charRatio
  // δ_t = 1 + activityOrdinal × 2
  const delta_t = 1 + DEFAULT_ACTIVITY_ORDINAL * 2
  const voids = 7
  // bhs_n = 2 + (FNV_hash mod 4)
  const bhs_n = 2 + (hashVal % 4)
  const { tdf } = computeFullTDF({ T_c, P_s, E_t, delta_t, voids, bhs_n })
  return { tdf, cascadeIndex: cascadeFromTdf(tdf) }
}

/**
 * strength = isotopicRatio × phaseAlign
 * phaseAlign = 1 − |pc₁ − pc₂|
 * lag = |cascade₁ − cascade₂|
 * vortexVolume = TDF_A × TDF_B
 * documentation/docs/for-physicists.md:58-59
 * documentation/docs/for-physicists.md:140
 * mcp/index.ts:436
 * docs/blurrn-codex/V4.8-Isotopic-Temporal-Vortex-Spec.md:56
 */
export function crossTexts(contentA: string, contentB: string, options?: {
  tdfA?: number
  tdfB?: number
  cascadeA?: number
  cascadeB?: number
}): CrossScore {
  const sigA = new TextDerivedSignal(contentA, { tdf: options?.tdfA, cascadeIndex: options?.cascadeA })
  const sigB = new TextDerivedSignal(contentB, { tdf: options?.tdfB, cascadeIndex: options?.cascadeB })
  const isotopicRatio = sigA.isotopicRatioWith(sigB)
  const phaseAlign = 1 - Math.abs(sigA.phaseCoherence - sigB.phaseCoherence)
  return {
    strength: isotopicRatio * phaseAlign,
    lag: Math.abs(sigA.cascadeIndex - sigB.cascadeIndex),
    vortexVolume: sigA.tdfValue * sigB.tdfValue,
    isotopicRatio,
  }
}

function stableMean(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return sorted.reduce((sum, value) => sum + value, 0) / sorted.length
}

export function triangulateTexts(signals: Array<{ content: string; tdf?: number }>): TriangulationScore {
  const sigs = signals.map((signal) => new TextDerivedSignal(signal.content, { tdf: signal.tdf }))
  const results: TriangulatedSignal[] = sigs.map((signal, index) => ({
    index,
    content: signal.content,
    tdfValue: signal.tdfValue,
    phaseCoherence: signal.phaseCoherence,
    cascadeIndex: signal.cascadeIndex,
    fingerprint: {
      coreId: signal.getIsotopeId(),
      variantDelta: [
        signal.variantDelta0(),
        signal.cascadeIndex * TAU,
        1 - signal.phaseCoherence,
      ],
      provenance: [`TDF:${signal.tdfValue}`, `cascade:${signal.cascadeIndex}`],
    },
    correlations: sigs.filter((_, otherIndex) => otherIndex !== index).map((other) => {
      const score = crossTexts(signal.content, other.content, {
        tdfA: signal.tdfValue,
        tdfB: other.tdfValue,
        cascadeA: signal.cascadeIndex,
        cascadeB: other.cascadeIndex,
      })
      return { content: other.content, ...score }
    }),
  }))

  const strengths = results.flatMap((result) => result.correlations.map((correlation) => correlation.strength))
  const volumes = results.flatMap((result) => result.correlations.map((correlation) => correlation.vortexVolume))
  const coreResonance = stableMean(strengths)
  const vortexVolume = stableMean(volumes)

  return { signalCount: sigs.length, results, coreResonance, vortexVolume }
}

/**
 * fused[d] = (1/N) × Σ embed[d]
 * documentation/docs/mathematical-reference.md:545-546
 */
export function fuseTexts(contents: string[]): { fusedEmbedding: number[]; fusedIsotopeId: string } {
  const embeds = contents.map((content) => new TextDerivedSignal(content).embed())
  const width = embeds[0]?.length ?? 0
  const fusedEmbedding = Array.from({ length: width }, (_, dimension) => {
    const sum = embeds.reduce((acc, embed) => acc + embed[dimension], 0)
    return sum / embeds.length
  })
  const lead = fusedEmbedding[0] ?? 0
  const fusedIsotopeId = fusedEmbedding.length === 0
    ? 'blurrn-core-0'
    : `blurrn-core-${Math.floor(Math.abs(lead / PHI) / 1e6)}`
  return { fusedEmbedding, fusedIsotopeId }
}
