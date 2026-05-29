// mcp/scripts/monte-carlo-weights.ts
// Monte Carlo sweep over weight vectors to find Pareto frontier for 6D composite.
// Uses realistic proposal data via the actual TDF pipeline.

import { runKuramotoCoupling } from '../lib/kuramotoOscillators.js'
import { computeWaveResonance, computeFullBoxResonance, textToEmbedding16 } from '../lib/wavePropagation.js'
import { computeFullTDF } from '../lib/vortexMath.js'

// ---------- realistic proposal generator ----------

const PROPOSAL_TEXTS = [
  'increase funding for solar research and quantum computing infrastructure',
  'establish a carbon-neutral energy grid by 2040 with phased implementation',
  'create universal basic compute access for underserved communities',
  'fund deep ocean exploration and marine ecosystem preservation',
  'develop open-source AI safety frameworks with third-party auditing',
  'build lunar surface infrastructure for sustained scientific presence',
  'implement global early warning system for solar storm events',
  'establish quantum-resistant cryptography standards for public infrastructure',
  'create decentralized mesh network protocol for disaster response',
  'fund fusion energy research with international collaboration framework',
  'develop synthetic biology regulation framework with biosafety protocols',
  'establish polar research stations for climate monitoring network',
  'fund asteroid detection and planetary defense coordination',
  'create digital identity standard with privacy-preserving credentials',
  'develop modular nuclear reactor design for remote communities',
  'fund brain-computer interface research with ethical guidelines',
  'establish global carbon capture verification standards',
  'create open-source satellite imagery analysis platform for deforestation tracking',
  'fund high-altitude platform systems for affordable internet connectivity',
  'develop seawater desalination powered by renewable microgrids',
  'establish wildlife corridor network across major migration routes',
  'fund zero-emission cargo shipping with ammonia fuel cells',
  'create decentralized science funding DAO with peer review tokens',
  'develop quantum sensor network for geophysical monitoring',
  'fund stratospheric aerosol injection research with governance framework',
]

const ACTIVITY_LEVELS = ['quiet', 'moderate', 'active', 'storm']

// Solar TDFs for each activity level (generated from deriveSolarCodexParams)
const SOLAR_TDFS: Record<string, number> = {
  quiet:    5.781010000000e12,
  moderate: 5.781013364643e12,
  active:   5.781018000000e12,
  storm:    5.781025000000e12,
}

function textToTdf(text: string, activityLevel: string): number {
  const cleaned = text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const words = cleaned.split(' ').filter(w => w.length > 0)
  // Simulate deriveProposalCodexParams
  const wordCount = Math.max(words.length, 1)
  const combined = words.join(' ')
  const totalChars = combined.length
  const uniqueChars = new Set(combined).size
  
  // FNV hash for P_s and bhs_n
  let h = 2166136261
  for (let i = 0; i < combined.length; i++) {
    h ^= combined.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const hashVal = Math.abs(h)
  
  const T_c = 0.5 + (wordCount / 50) + (uniqueChars / Math.max(totalChars, 1)) * 0.5
  const P_s = 0.1 + (hashVal % 100000) / 100000
  const E_t = 0.1 + (uniqueChars / Math.max(totalChars, 1))
  const activityOrdinal = ACTIVITY_LEVELS.indexOf(activityLevel)
  const delta_t = 1 + activityOrdinal * 2
  const voids = 7
  const bhs_n = 2 + (hashVal % 4)
  
  return computeFullTDF({ T_c, P_s, E_t, delta_t, voids, bhs_n }).tdf
}

interface TestSample {
  name: string
  proposalTdf: number
  solarRefTdf: number
  activityLevel: string
  proximity: number
  phase: number
  vortex: number
  sync: number
  neuralProx: number
  neuralVortex: number
}

function generateRealisticSamples(): TestSample[] {
  const samples: TestSample[] = []
  for (const text of PROPOSAL_TEXTS) {
    for (const activity of ACTIVITY_LEVELS) {
      const propTdf = textToTdf(text, activity)
      const solTdf = SOLAR_TDFS[activity]
      const propEmb = textToEmbedding16(text)
      // Sun embedding simulated as fixed seed
      const sunEmb = textToEmbedding16('solar spectrum reference at current activity level')
      
      try {
        const kuramoto = runKuramotoCoupling(propTdf, solTdf, activity)
        const wave = computeWaveResonance(kuramoto, propTdf, solTdf, sunEmb, propEmb)
        
        samples.push({
          name: `${text.slice(0, 15)}..${activity}`,
          proposalTdf: propTdf,
          solarRefTdf: solTdf,
          activityLevel: activity,
          proximity: wave.waveProximity,
          phase: kuramoto.phaseAlignment,
          vortex: wave.waveVortexAlignment,
          sync: wave.waveSynchronization,
          neuralProx: wave.neuralWaveProximity,
          neuralVortex: wave.neuralWaveVortexAlignment,
        })
      } catch {
        // skip
      }
    }
  }
  return samples
}

// ---------- weight sweeper ----------

function computeComposite(dims: number[], weights: number[]): number {
  let sum = 0
  for (let i = 0; i < dims.length; i++) sum += dims[i] * weights[i]
  return Math.max(0.15, Math.min(0.98, sum))
}

function computeSpread(scores: number[]): number {
  return Math.max(...scores) - Math.min(...scores)
}

interface WeightResult {
  weights: number[]
  spread: number
  floorAvg: number
  label: string
}

// ---------- main ----------

const NUM_RANDOM_WEIGHTS = 50000

console.log('='.repeat(90))
console.log('MONTE CARLO WEIGHT OPTIMALITY ANALYSIS')
console.log('generating realistic samples from proposal texts...')
console.log('='.repeat(90))

const samples = generateRealisticSamples()
console.log(`generated ${samples.length} samples (${PROPOSAL_TEXTS.length} proposals × ${ACTIVITY_LEVELS.length} activity levels)`)
console.log()

// Per-dimension spreads
const dimNames = ['proximity', 'phase', 'vortex', 'sync', 'neuralProx', 'neuralVortex']
const allDims = samples.map(s => [s.proximity, s.phase, s.vortex, s.sync, s.neuralProx, s.neuralVortex])
const spreads = dimNames.map((_, d) => {
  const vals = allDims.map(r => r[d])
  return Math.max(...vals) - Math.min(...vals)
})

console.log('Dimension spreads (from realistic proposals):')
for (let d = 0; d < 6; d++) {
  const vals = allDims.map(r => r[d])
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  console.log(`  ${dimNames[d].padEnd(14)} spread=${spreads[d].toFixed(4)}  avg=${avg.toFixed(4)}  range=[${min.toFixed(4)}, ${max.toFixed(4)}]`)
}
console.log()

// Current weights
const currentWeights = [0.15, 0.20, 0.15, 0.15, 0.175, 0.175]
const currentScores = samples.map(s => computeComposite(
  [s.proximity, s.phase, s.vortex, s.sync, s.neuralProx, s.neuralVortex], currentWeights
))
const currentSpread = computeSpread(currentScores)
const currentAvg = currentScores.reduce((a, b) => a + b, 0) / currentScores.length

console.log(`Current weights (${currentWeights.map(w => w.toFixed(3)).join(', ')}):`)
console.log(`  Spread:  ${currentSpread.toFixed(4)}`)
console.log(`  Average: ${currentAvg.toFixed(4)}`)
console.log(`  Range:   [${Math.min(...currentScores).toFixed(4)}, ${Math.max(...currentScores).toFixed(4)}]`)
console.log()

// Monte Carlo sweep
console.log(`Sweeping ${NUM_RANDOM_WEIGHTS} random weight vectors...`)

const results: WeightResult[] = []
const seen = new Set<string>()

for (let i = 0; i < NUM_RANDOM_WEIGHTS; i++) {
  // Generate random weights summing to 1
  // w5 = w6 (neural equality) for 6D weights
  const r = Array(5).fill(0).map(() => Math.random())
  const s = r[0] + r[1] + r[2] + r[3] + r[4] * 2
  const w = [r[0] / s, r[1] / s, r[2] / s, r[3] / s, r[4] / s, r[4] / s]
  if (w.some(x => x <= 0 || x > 1)) continue

  const key = w.map(x => x.toFixed(4)).join(',')
  if (seen.has(key)) continue
  seen.add(key)

  const scores = samples.map(s => computeComposite(
    [s.proximity, s.phase, s.vortex, s.sync, s.neuralProx, s.neuralVortex], w
  ))
  const spread = computeSpread(scores)
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  results.push({ weights: w, spread, floorAvg: avg, label: '' })
}

console.log(`collected ${results.length} unique weight vectors`)

// Pareto frontier: sort by spread desc, keep those with increasing avg
results.sort((a, b) => b.spread - a.spread)
const pareto: WeightResult[] = []
let bestAvg = -Infinity
for (const r of results) {
  if (r.floorAvg > bestAvg) {
    pareto.push(r)
    bestAvg = r.floorAvg
  }
}

console.log(`\nPareto frontier: ${pareto.length} points`)
console.log()

// Top 15 Pareto points
console.log(`${'Rank'.padEnd(6)} ${'Weights (prox,phase,vort,sync,neural,neural)'.padEnd(52)} ${'Spread'.padEnd(10)} ${'Avg'.padEnd(10)}`)
console.log(`${'─'.repeat(6)} ${'─'.repeat(52)} ${'─'.repeat(10)} ${'─'.repeat(10)}`)
for (let i = 0; i < Math.min(15, pareto.length); i++) {
  const p = pareto[i]
  const wStr = p.weights.map(w => w.toFixed(3)).join(', ')
  console.log(`${(i+1).toString().padEnd(6)} [${wStr.padEnd(48)}] ${p.spread.toFixed(4).padEnd(10)} ${p.floorAvg.toFixed(4).padEnd(10)}`)
}

// Check if current weights are on frontier
let onPareto = false
let paretoRank = -1
let closestResult: WeightResult | null = null
let closestDist = Infinity

for (let i = 0; i < pareto.length; i++) {
  const p = pareto[i]
  const match = p.weights.every((w, j) => Math.abs(w - currentWeights[j]) < 0.01)
  if (match) { onPareto = true; paretoRank = i + 1 }
  
  const dist = p.weights.reduce((s, w, j) => s + (w - currentWeights[j]) ** 2, 0)
  if (dist < closestDist) { closestDist = dist; closestResult = p }
}

// Also check if any Pareto point is within 1% of current weights
const neighbors = pareto.filter(p => {
  const dist = p.weights.reduce((s, w, j) => s + (w - currentWeights[j]) ** 2, 0)
  return dist < 0.01
})

console.log(`\nCurrent weights ${onPareto ? 'ARE' : 'are NOT'} on the Pareto frontier${onPareto ? ` at rank #${paretoRank}` : ''}`)
if (!onPareto && closestResult) {
  console.log(`Closest Pareto point distance: ${closestDist.toFixed(4)}`)
  console.log(`  weights: [${closestResult.weights.map(w => w.toFixed(3)).join(', ')}]`)
  console.log(`  spread: ${closestResult.spread.toFixed(4)} (ours: ${currentSpread.toFixed(4)})`)
  console.log(`  avg:    ${closestResult.floorAvg.toFixed(4)} (ours: ${currentAvg.toFixed(4)})`)
  
  const delta = closestResult.weights.map((w, i) => (w - currentWeights[i]).toFixed(3)).join(', ')
  console.log(`  Δ:     [${delta}]`)
}
if (neighbors.length > 0) {
  console.log(`Pareto points within 1% of current weights: ${neighbors.length}`)
}

// A Pareto approximation check: is our spread/avg trade-off reasonable?
// Compute the "efficiency" ratio
const paretoEfficiency = neighbors.length > 0 ? 'within 1%' : 
  closestResult && closestDist < 0.05 ? 'within 5%' : 'far'

// Effective spread = Σ wᵢ × sᵢ
const effectiveSpread = currentWeights.reduce((s, w, i) => s + w * spreads[i], 0)
const maxNeuralE = spreads[4] + spreads[5]  // neural pair
const maxPhaseE = spreads[1]  // phase alone

console.log(`\nEffective spread (Σ wᵢ × sᵢ): ${effectiveSpread.toFixed(4)}`)
console.log(`Theoretical max E (all on neural): ${maxNeuralE.toFixed(4)}`)
console.log(`Theoretical max E (all on phase):  ${maxPhaseE.toFixed(4)}`)
console.log(`Efficiency: ${(effectiveSpread / Math.max(maxNeuralE, maxPhaseE) * 100).toFixed(1)}%`)
console.log()

// Show individual sample scores
console.log('Sample scores breakdown:')
console.log(`${'#'.padEnd(4)} ${'Activity'.padEnd(10)} ${'Prox'.padEnd(8)} ${'Phase'.padEnd(8)} ${'Vort'.padEnd(8)} ${'Sync'.padEnd(8)} ${'NProx'.padEnd(8)} ${'NVort'.padEnd(8)} ${'Score'.padEnd(8)} ${'Verdict'.padEnd(14)}`)
console.log('─'.repeat(90))
for (let i = 0; i < Math.min(20, samples.length); i++) {
  const s = samples[i]
  const score = computeComposite([s.proximity, s.phase, s.vortex, s.sync, s.neuralProx, s.neuralVortex], currentWeights)
  const thresholds: Record<string, { strong: number }> = {
    quiet: { strong: 0.82 }, moderate: { strong: 0.85 }, active: { strong: 0.85 }, storm: { strong: 0.88 }
  }
  const t = thresholds[s.activityLevel] || thresholds.moderate
  const verdict = score >= t.strong ? 'PASS' : score >= 0.50 ? 'NEEDS_REVISION' : 'REJECT'
  console.log(`${(i+1).toString().padEnd(4)} ${s.activityLevel.padEnd(10)} ${s.proximity.toFixed(3).padEnd(8)} ${s.phase.toFixed(3).padEnd(8)} ${s.vortex.toFixed(3).padEnd(8)} ${s.sync.toFixed(3).padEnd(8)} ${s.neuralProx.toFixed(3).padEnd(8)} ${s.neuralVortex.toFixed(3).padEnd(8)} ${score.toFixed(3).padEnd(8)} ${verdict}`)
}

console.log('\n' + '='.repeat(90))
