// mcp/lib/wavePropagation.ts
// Phase 2 prototype: wave propagation layer for Dynamo governance.
// Ports wave() from temporalCalculator.ts, uses Kuramoto 20-timestep trajectory
// to compute proximity/vortexAlignment/synchronization from wave physics
// instead of external TDF math.
//
// A/B testable: runs in parallel, doesn't touch current formulas.

import { KuramotoResult, KuramotoTrajectoryPoint, PhaseType, Isotope, ISOTOPES } from './kuramotoOscillators.js'

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

function mod2pi(p: number): number {
  p = p % (2 * Math.PI)
  return p < 0 ? p + 2 * Math.PI : p
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

export interface WaveResonanceResult {
  waveProximity: number
  waveVortexAlignment: number
  waveSynchronization: number
}

export function computeWaveResonance(
  kuramoto: KuramotoResult,
  proposalTdf: number,
  solarRefTdf: number,
): WaveResonanceResult {
  const trajectory = kuramoto.trajectories
  const phaseType = kuramoto.phaseType
  const isotope = ISOTOPES[kuramoto.isotope] || ISOTOPES['C-12']

  if (trajectory.length < 2) {
    return { waveProximity: 0.5, waveVortexAlignment: 0.5, waveSynchronization: 0.5 }
  }

  // --- Wave-modulated proximity ---
  // For each timestep, compute wave amplitude for proposal (θ₀) and sun (θ₁)
  // averaged across the 3 active spectrum bands (Blue, Green, Red ~ visible).
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
    const propAvg = propSum / activeBands.length
    const sunAvg = sunSum / activeBands.length
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
    c12Series.push(c12Sum / SPECTRUM_BANDS.length)
    c14Series.push(c14Sum / SPECTRUM_BANDS.length)
  }

  const waveVortexAlignment = Math.max(0.01, Math.min(0.99, crossCorrelate(c12Series, c14Series)))

  // Wave synchronization: phase coherence over full trajectory
  // Measures how consistently the two oscillators maintain their phase relationship
  // averaged over all timesteps (not just final state).
  // cos(θ₁ - θ₀) ≈ 1 when oscillators evolve together, ≈ 0 when independent.
  let syncSum = 0
  for (const pt of trajectory) {
    syncSum += Math.cos(pt.theta[1] - pt.theta[0])
  }
  const waveSynchronization = Math.max(0.01, Math.min(0.99, syncSum / trajectory.length))

  return { waveProximity, waveVortexAlignment, waveSynchronization }
}
