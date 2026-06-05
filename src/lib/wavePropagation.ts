// src/lib/wavePropagation.ts
// Phase 2 prototype — frontend mirror of mcp/lib/wavePropagation.ts

import { KuramotoResult, PhaseType, Isotope, ISOTOPES } from './kuramotoOscillators'

const PHI = 1.666
const FREQ = 528
const G = 1.0

interface SpectrumBand {
  band: string
  lambda: number
}

const SPECTRUM_BANDS: SpectrumBand[] = [
  { band: 'UV-C', lambda: 0.250 },
  { band: 'UV-B', lambda: 0.280 },
  { band: 'UV-A', lambda: 0.350 },
  { band: 'Violet', lambda: 0.380 },
  { band: 'Blue', lambda: 0.450 },
  { band: 'Cyan', lambda: 0.490 },
  { band: 'Green', lambda: 0.530 },
  { band: 'Yellow', lambda: 0.580 },
  { band: 'Orange', lambda: 0.620 },
  { band: 'Red', lambda: 0.700 },
  { band: 'IR-A', lambda: 1.400 },
  { band: 'IR-B', lambda: 2.500 },
]

function wave(
  x: number,
  t: number,
  n: number,
  isotope: Isotope,
  lambda: number,
  phaseType: PhaseType,
): number {
  const phiDynamic = phaseType === 'push' ? Math.PI / 4 : -Math.PI / 4
  const amplitude = Math.min(phaseType === 'push' ? G * 1.2 : G * 0.8, G * 1.5)
  const mainWave = amplitude * Math.sin(
    (2 * Math.PI * x) / lambda -
    2 * Math.PI * FREQ * (t * Math.pow(PHI, n)) +
    phiDynamic,
  ) * isotope.factor
  return Math.min(mainWave + 0.1, 2.0)
}

function crossCorrelate(a: number[], b: number[], centered = false): number {
  if (a.length < 2 || b.length < 2) return 0.5
  const n = Math.min(a.length, b.length)
  let sum = 0
  let sumA = 0, sumB = 0
  for (let i = 0; i < n; i++) {
    sumA += a[i]
    sumB += b[i]
  }
  const meanA = sumA / n
  const meanB = sumB / n
  let num = 0, denA = 0, denB = 0
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA
    const db = b[i] - meanB
    if (centered) {
      num += da * db
      denA += da * da
      denB += db * db
    } else {
      num += a[i] * b[i]
      denA += a[i] * a[i]
      denB += b[i] * b[i]
    }
  }
  if (denA === 0 || denB === 0) return 0.5
  return Math.max(0, Math.min(1, num / Math.sqrt(denA * denB)))
}

const EMBEDDING_PRIMES = [997, 991, 983, 977, 971, 967, 953, 947, 941, 937, 929, 919, 911, 907, 887, 883]

export function tdfToEmbedding16(tdf: number): number[] {
  const intPart = Math.abs(Math.floor(tdf))
  return EMBEDDING_PRIMES.map((p) => (intPart % p) / p)
}

export function textToEmbedding16(text: string): number[] {
  const emb: number[] = new Array(16).fill(0)
  const cleaned = text.toLowerCase().replace(/[^\w\s]/g, ' ').trim()
  if (!cleaned) return emb
  const segLen = Math.max(1, Math.ceil(cleaned.length / 16))
  for (let d = 0; d < 16; d++) {
    const start = d * segLen
    if (start >= cleaned.length) break
    const end = Math.min(start + segLen, cleaned.length)
    const seg = cleaned.slice(start, end)
    let h = 2166136261
    for (let j = 0; j < seg.length; j++) {
      h ^= seg.charCodeAt(j)
      h = Math.imul(h, 16777619)
    }
    emb[d] = ((h >>> 0) % 100000) / 100000
  }
  return emb
}

const NEURAL_DIMS = 16

function neuralAmplitude(embedding: number[], dim: number, theta: number): number {
  return embedding[dim] * (0.5 + 0.5 * Math.sin(theta + dim * Math.PI / 8))
}
  const meanA = sumA / n
  const meanB = sumB / n
  let num = 0, denA = 0, denB = 0
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA
    const db = b[i] - meanB
    if (centered) {
      num += da * db
      denA += da * da
      denB += db * db
    } else {
      num += a[i] * b[i]
      denA += a[i] * a[i]
      denB += b[i] * b[i]
    }
  }
  if (denA === 0 || denB === 0) return 0.5
  return Math.max(0, Math.min(1, num / Math.sqrt(denA * denB)))
}

export interface WaveResonanceResult {
  waveProximity: number
  waveVortexAlignment: number
  waveSynchronization: number
  neuralSunAmpSeries: number[]
  neuralPropAmpSeries: number[]
  neuralWaveProximity: number
  neuralWaveVortexAlignment: number
}

export interface HybridResonanceResult {
  hybridVortexAlignment: number
  hybrid4DComposite: number
  hybridVerdict: 'PASS' | 'NEEDS_REVISION' | 'REJECT'
  fullWave4DComposite: number
  calibratedWave4DComposite: number
}

export interface FullBoxResonanceResult {
  fullBoxProximity: number
  fullBoxVortexAlignment: number
  fullBoxSynchronization: number
  fullBoxNeuralProximity: number
  fullBoxNeuralVortex: number
  fullBox4DComposite: number
  fullBoxVerdict: 'PASS' | 'NEEDS_REVISION' | 'REJECT'
  fullBoxThresholds: { strong: number; good: number; weak: number }
  fullBoxGematriaResonance: number
  fullBox7DComposite: number
  fullBox7DVerdict: 'PASS' | 'NEEDS_REVISION' | 'REJECT'
  signalPurity: number
}

export function computeCalibratedWaveSync(rawSync: number): number {
  const clamped = Math.max(0.01, rawSync)
  return Math.max(0.15, 0.15 + 0.85 * Math.pow(clamped, 0.35))
}

export function computeCalibratedWaveVortex(rawVortex: number): number {
  return Math.pow(Math.max(0.05, rawVortex), 0.25)
}

export function computeFullBoxResonance(
  waveProximity: number,
  phaseAlignment: number,
  waveVortexAlignment: number,
  waveSynchronization: number,
  activityLevel: string,
  neuralProximity: number = 0,
  neuralVortex: number = 0,
  gematriaResonance: number = 0.80,
): FullBoxResonanceResult {
  const calVortex = computeCalibratedWaveVortex(waveVortexAlignment)
  const calSync = computeCalibratedWaveSync(waveSynchronization)

  const neuralWeight = (neuralProximity > 0 && neuralVortex > 0) ? 0.175 : 0
  const physRedistribute = neuralWeight === 0 ? 0.0875 : 0
  const fullBox4DComposite = Math.max(0.15, Math.min(0.98,
    waveProximity * (0.15 + physRedistribute) +
    phaseAlignment * (0.20 + physRedistribute) +
    calVortex * (0.15 + physRedistribute) +
    calSync * (0.15 + physRedistribute) +
    neuralProximity * neuralWeight +
    neuralVortex * neuralWeight
  ))

  const gematriaWeight = 0.12
  const reduce6D = 1 - gematriaWeight
  const fullBox7DComposite = Math.max(0.15, Math.min(0.98,
    waveProximity * (0.15 * reduce6D) +
    phaseAlignment * (0.20 * reduce6D) +
    calVortex * (0.15 * reduce6D) +
    calSync * (0.15 * reduce6D) +
    neuralProximity * (0.175 * reduce6D) +
    neuralVortex * (0.175 * reduce6D) +
    gematriaResonance * gematriaWeight
  ))

  // Diagnostic: signal purity = how consistently the 7 axes agree (low variance = clean signal)
  const sevenComponents = [waveProximity, phaseAlignment, calVortex, calSync, neuralProximity, neuralVortex, gematriaResonance]
  const mean = sevenComponents.reduce((a, b) => a + b, 0) / sevenComponents.length
  const variance = sevenComponents.reduce((a, b) => a + (b - mean) ** 2, 0) / sevenComponents.length
  const signalPurity = Math.max(0.05, 1 - variance * 2.5)

  const thresholds: Record<string, { strong: number; good: number; weak: number }> = {
    quiet:    { strong: 0.82, good: 0.72, weak: 0.50 },
    moderate: { strong: 0.85, good: 0.75, weak: 0.52 },
    active:   { strong: 0.85, good: 0.75, weak: 0.52 },
    storm:    { strong: 0.88, good: 0.80, weak: 0.58 },
  }
  const t = thresholds[activityLevel] || thresholds.moderate
  const verdict: 'PASS' | 'NEEDS_REVISION' | 'REJECT' =
    fullBox4DComposite >= t.strong ? 'PASS' :
    fullBox4DComposite >= t.weak ? 'NEEDS_REVISION' :
    'REJECT'

  const verdict7D: 'PASS' | 'NEEDS_REVISION' | 'REJECT' =
    fullBox7DComposite >= t.strong ? 'PASS' :
    fullBox7DComposite >= t.weak ? 'NEEDS_REVISION' :
    'REJECT'

  return {
    fullBoxProximity: waveProximity,
    fullBoxVortexAlignment: calVortex,
    fullBoxSynchronization: calSync,
    fullBoxNeuralProximity: neuralProximity,
    fullBoxNeuralVortex: neuralVortex,
    fullBox4DComposite,
    fullBoxVerdict: verdict,
    fullBoxThresholds: t,
    fullBoxGematriaResonance: gematriaResonance,
    fullBox7DComposite,
    fullBox7DVerdict: verdict7D,
    signalPurity,
  }
}

export function computeHybridResonance(
  currentProximity: number,
  phaseAlignment: number,
  currentSync: number,
  waveVortexAlignment: number,
  waveSynchronization: number,
  activityLevel: string,
): HybridResonanceResult {
  const calibratedSync = computeCalibratedWaveSync(waveSynchronization)
  const calibratedVortex = computeCalibratedWaveVortex(waveVortexAlignment)

  const hybrid4DComposite = Math.max(0.15, Math.min(0.98,
    currentProximity * 0.20 + phaseAlignment * 0.20 + calibratedVortex * 0.30 + currentSync * 0.30
  ))

  const fullWave4DComposite = Math.max(0.15, Math.min(0.98,
    currentProximity * 0.20 + phaseAlignment * 0.20 + waveVortexAlignment * 0.30 + waveSynchronization * 0.30
  ))

  const calibratedWave4DComposite = Math.max(0.15, Math.min(0.98,
    currentProximity * 0.20 + phaseAlignment * 0.20 + calibratedVortex * 0.30 + calibratedSync * 0.30
  ))

  const thresholds: Record<string, { strong: number; good: number; weak: number }> = {
    quiet:    { strong: 0.82, good: 0.72, weak: 0.50 },
    moderate: { strong: 0.88, good: 0.78, weak: 0.54 },
    active:   { strong: 0.88, good: 0.78, weak: 0.54 },
    storm:    { strong: 0.92, good: 0.84, weak: 0.62 },
  }
  const t = thresholds[activityLevel] || thresholds.moderate
  const verdict: 'PASS' | 'NEEDS_REVISION' | 'REJECT' =
    hybrid4DComposite >= t.strong ? 'PASS' :
    hybrid4DComposite >= t.weak ? 'NEEDS_REVISION' :
    'REJECT'

  return {
    hybridVortexAlignment: calibratedVortex,
    hybrid4DComposite,
    hybridVerdict: verdict,
    fullWave4DComposite,
    calibratedWave4DComposite,
  }
}

export function computeWaveResonance(
  kuramoto: KuramotoResult,
  proposalTdf: number,
  solarRefTdf: number,
  neuralSunEmbedding?: number[],
  neuralProposalEmbedding?: number[],
): WaveResonanceResult {
  const trajectory = kuramoto.trajectories
  const phaseType = kuramoto.phaseType
  const isotope = ISOTOPES[kuramoto.isotope] || ISOTOPES['C-12']

  if (trajectory.length < 2) {
    return {
      waveProximity: 0.5, waveVortexAlignment: 0.5, waveSynchronization: 0.5,
      neuralSunAmpSeries: [], neuralPropAmpSeries: [],
      neuralWaveProximity: 0.5, neuralWaveVortexAlignment: 0.5,
    }
  }

  const activeBands = SPECTRUM_BANDS.filter(b =>
    b.band === 'Blue' || b.band === 'Green' || b.band === 'Red'
  )
  let sumSqDiff = 0
  const proposalWaveSeries: number[] = []
  const sunWaveSeries: number[] = []

  for (let step = 0; step < trajectory.length; step++) {
    const pt = trajectory[step]
    const t = step * 0.05
    let propSum = 0
    let sunSum = 0
    for (let bi = 0; bi < activeBands.length; bi++) {
      propSum += wave(pt.theta[0], t, bi, isotope, activeBands[bi].lambda, phaseType)
      sunSum += wave(pt.theta[1], t, bi, isotope, activeBands[bi].lambda, phaseType)
    }
    if (neuralSunEmbedding && neuralProposalEmbedding) {
      for (let d = 0; d < NEURAL_DIMS; d++) {
        propSum += neuralAmplitude(neuralProposalEmbedding, d, pt.theta[0])
        sunSum += neuralAmplitude(neuralSunEmbedding, d, pt.theta[1])
      }
    }
    const propAvg = propSum / (activeBands.length + (neuralSunEmbedding ? NEURAL_DIMS : 0))
    const sunAvg = sunSum / (activeBands.length + (neuralSunEmbedding ? NEURAL_DIMS : 0))
    sumSqDiff += (propAvg - sunAvg) ** 2
    proposalWaveSeries.push(propAvg)
    sunWaveSeries.push(sunAvg)
  }

  const mse = sumSqDiff / trajectory.length
  const waveProximity = Math.max(0.01, Math.min(0.99, Math.exp(-mse * 0.5)))

  const isotopeC12 = ISOTOPES['C-12']
  const isotopeC14 = ISOTOPES['C-14']
  const c12Series: number[] = []
  const c14Series: number[] = []

  for (let step = 0; step < trajectory.length; step++) {
    const pt = trajectory[step]
    const t = step * 0.05
    let c12Sum = 0
    let c14Sum = 0
    for (let bi = 0; bi < SPECTRUM_BANDS.length; bi++) {
      c12Sum += wave(pt.theta[0], t, bi, isotopeC12, SPECTRUM_BANDS[bi].lambda, phaseType)
      c14Sum += wave(pt.theta[1], t, bi, isotopeC14, SPECTRUM_BANDS[bi].lambda, phaseType)
    }
    if (neuralSunEmbedding && neuralProposalEmbedding) {
      for (let d = 0; d < NEURAL_DIMS; d++) {
        c12Sum += neuralAmplitude(neuralProposalEmbedding, d, pt.theta[0]) * ISOTOPES['C-12'].factor
        c14Sum += neuralAmplitude(neuralSunEmbedding, d, pt.theta[1]) * ISOTOPES['C-14'].factor
      }
    }
    c12Series.push(c12Sum / (SPECTRUM_BANDS.length + (neuralSunEmbedding ? NEURAL_DIMS : 0)))
    c14Series.push(c14Sum / (SPECTRUM_BANDS.length + (neuralSunEmbedding ? NEURAL_DIMS : 0)))
  }

  const waveVortexAlignment = Math.max(0.01, Math.min(0.99, crossCorrelate(c12Series, c14Series)))

  let syncSum = 0
  for (const pt of trajectory) {
    syncSum += Math.cos(pt.theta[1] - pt.theta[0])
  }
  const waveSynchronization = Math.max(0.01, Math.min(0.99, syncSum / trajectory.length))

  // Neural-only proximity and vortex from the neural bands alone.
  // Per-dimension comparison: compute amplitude difference for each of 16 dims
  // at each timestep, then aggregate. This preserves inter-dimension variation
  // instead of averaging it away.
  let neuralSumSqDiff = 0
  const neuralPropSeries: number[] = []
  const neuralSunSeries: number[] = []
  if (neuralSunEmbedding && neuralProposalEmbedding) {
    for (let step = 0; step < trajectory.length; step++) {
      const pt = trajectory[step]
      let propTotal = 0
      let sunTotal = 0
      for (let d = 0; d < NEURAL_DIMS; d++) {
        const propAmp = neuralAmplitude(neuralProposalEmbedding, d, pt.theta[0])
        const sunAmp = neuralAmplitude(neuralSunEmbedding, d, pt.theta[1])
        neuralSumSqDiff += (propAmp - sunAmp) ** 2
        propTotal += propAmp
        sunTotal += sunAmp
      }
      neuralPropSeries.push(propTotal / NEURAL_DIMS)
      neuralSunSeries.push(sunTotal / NEURAL_DIMS)
    }
  }
  const neuralMse = neuralSunEmbedding ? neuralSumSqDiff / (trajectory.length * NEURAL_DIMS) : 0.15
  const neuralWaveProximity = neuralSunEmbedding
    ? Math.max(0.01, Math.min(0.99, Math.exp(-neuralMse * 5)))
    : 0.5
  // Neural vortex: cosine similarity of raw embedding vectors.
  // Measures whether the embedding dimensions align between sun and proposal,
  // independent of time-series averaging that collapses discrimination.
  let neuralWaveVortexAlignment = 0.5
  if (neuralSunEmbedding && neuralProposalEmbedding) {
    let dotProd = 0, normA = 0, normB = 0
    for (let d = 0; d < NEURAL_DIMS; d++) {
      dotProd += neuralSunEmbedding[d] * neuralProposalEmbedding[d]
      normA += neuralSunEmbedding[d] ** 2
      normB += neuralProposalEmbedding[d] ** 2
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB)
    neuralWaveVortexAlignment = denom > 0 ? Math.max(0.01, Math.min(0.99, dotProd / denom)) : 0.5
  }

  return {
    waveProximity,
    waveVortexAlignment,
    waveSynchronization,
    neuralSunAmpSeries: neuralSunSeries,
    neuralPropAmpSeries: neuralPropSeries,
    neuralWaveProximity,
    neuralWaveVortexAlignment,
  }
}
