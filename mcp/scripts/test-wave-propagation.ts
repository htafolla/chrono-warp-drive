// mcp/scripts/test-wave-propagation.ts
// Phase 2 A/B test: wave-based resonance vs current external TDF formulas.

import { runKuramotoCoupling } from '../lib/kuramotoOscillators.js'
import { computeWaveResonance } from '../lib/wavePropagation.js'

// Exact replicas of the formulas in solarGovernanceIntegration.ts
function currentProximity(propTdf: number, solTdf: number): number {
  const deltaDiff = Math.abs((propTdf % 1e6) - (solTdf % 1e6))
  return Math.exp(-Math.pow(deltaDiff / 1e6, 2))
}

function currentVortexAlignment(propTdf: number, solTdf: number): number {
  const logRatio = Math.abs(Math.log(Math.max(propTdf, 1)) - Math.log(Math.max(solTdf, 1)))
  const logMax = Math.log(Math.max(propTdf, solTdf, 1))
  return Math.max(0.15, 1 - logRatio / logMax)
}

function currentSynchronization(propTdf: number, solTdf: number): number {
  const deltaDiff = Math.abs((propTdf % 1e6) - (solTdf % 1e6))
  const syncRaw = Math.max(0, 1 - deltaDiff / 1e6)
  return Math.max(0.15, syncRaw)
}

interface TestCase {
  name: string
  proposalTdf: number
  solarRefTdf: number
  activityLevel?: string
}

const testCases: TestCase[] = [
  {
    name: 'A: Average proposal',
    proposalTdf: 5.781013364643e12,
    solarRefTdf: 5.781000000000e12,
    activityLevel: 'moderate',
  },
  {
    name: 'B: Close alignment',
    proposalTdf: 5.781013300000e12,
    solarRefTdf: 5.781013364643e12,
    activityLevel: 'quiet',
  },
  {
    name: 'C: Far alignment',
    proposalTdf: 5.781023136388e12,
    solarRefTdf: 5.781000000000e12,
    activityLevel: 'active',
  },
  {
    name: 'D: Perfect match',
    proposalTdf: 5.781013364643e12,
    solarRefTdf: 5.781013364643e12,
    activityLevel: 'moderate',
  },
  {
    name: 'E: Wide delta (storm)',
    proposalTdf: 5.781100000000e12,
    solarRefTdf: 5.781000000000e12,
    activityLevel: 'storm',
  },
]

console.log('='.repeat(130))
console.log('PHASE 2 — WAVE PROPAGATION A/B TEST vs CURRENT EXTERNAL FORMULAS')
console.log('='.repeat(130))

interface ABRow {
  dim: string
  current: number
  wave: number
  delta: string
}

const allRows: ABRow[] = []

for (const tc of testCases) {
  console.log(`\n--- ${tc.name} ---`)
  console.log(`  TDF proposal: ${tc.proposalTdf.toFixed(6)}  solar: ${tc.solarRefTdf.toFixed(6)}`)

  const kuramoto = runKuramotoCoupling(tc.proposalTdf, tc.solarRefTdf, tc.activityLevel)
  const wave = computeWaveResonance(kuramoto, tc.proposalTdf, tc.solarRefTdf)

  const cProx = currentProximity(tc.proposalTdf, tc.solarRefTdf)
  const cVort = currentVortexAlignment(tc.proposalTdf, tc.solarRefTdf)
  const cSync = currentSynchronization(tc.proposalTdf, tc.solarRefTdf)

  console.log(`  Kuramoto: R=${kuramoto.phaseAlignment.toFixed(4)}  signal=${kuramoto.signalTiming}  type=${kuramoto.phaseType}`)
  console.log(`  Trajectory: ${kuramoto.trajectories.length} pts`)
  console.log()
  console.log(`  ${'Dim'.padEnd(18)} ${'Current'.padEnd(12)} ${'Wave'.padEnd(12)} ${'Δ'.padEnd(10)} ${'Notes'}`)
  console.log(`  ${'─'.repeat(18)} ${'─'.repeat(12)} ${'─'.repeat(12)} ${'─'.repeat(10)} ${'─'.repeat(30)}`)

  const rows = [
    { dim: 'proximity', cur: cProx, wav: wave.waveProximity },
    { dim: 'vortexAlignment', cur: cVort, wav: wave.waveVortexAlignment },
    { dim: 'synchronization', cur: cSync, wav: wave.waveSynchronization },
  ]

  for (const row of rows) {
    const delta = row.wav - row.cur
    const note = Math.abs(delta) < 0.05 ? '~same' :
      delta > 0 ? `${(delta*100).toFixed(0)}% ↑` : `${(-delta*100).toFixed(0)}% ↓`
    console.log(`  ${row.dim.padEnd(18)} ${row.cur.toFixed(4).padEnd(12)} ${row.wav.toFixed(4).padEnd(12)} ${delta.toFixed(4).padEnd(10)} ${note}`)
    allRows.push({ dim: `${tc.name[0]}:${row.dim}`, current: row.cur, wave: row.wav, delta: note })
  }

  const w4d = wave.waveProximity * 0.25 + kuramoto.phaseAlignment * 0.25 + wave.waveVortexAlignment * 0.25 + wave.waveSynchronization * 0.25
  const c4d = cProx * 0.20 + kuramoto.phaseAlignment * 0.20 + cVort * 0.30 + cSync * 0.30
  const wavePass = w4d >= (tc.activityLevel === 'storm' ? 0.84 : tc.activityLevel === 'active' ? 0.78 : 0.72)
  const currentPass = c4d >= (tc.activityLevel === 'storm' ? 0.84 : tc.activityLevel === 'active' ? 0.78 : 0.72)
  console.log(`  ${'─'.repeat(18)} ${'─'.repeat(12)} ${'─'.repeat(12)} ${'─'.repeat(10)} ${'─'.repeat(30)}`)
  console.log(`  ${'4D composite'.padEnd(18)} ${c4d.toFixed(4).padEnd(12)} ${w4d.toFixed(4).padEnd(12)} ${(w4d-c4d).toFixed(4).padEnd(10)} ${currentPass ? 'PASS' : 'needs revision'.padEnd(14)} | wave: ${wavePass ? 'PASS' : 'needs revision'}`)
}

console.log('\n' + '='.repeat(130))
console.log('DISCRIMINATION ANALYSIS')
console.log('='.repeat(130))

const dims = ['proximity', 'vortexAlignment', 'synchronization']
for (const dim of dims) {
  const curVals = allRows.filter(r => r.dim.endsWith(`:${dim}`)).map(r => r.current)
  const wavVals = allRows.filter(r => r.dim.endsWith(`:${dim}`)).map(r => r.wave)
  const curSpread = Math.max(...curVals) - Math.min(...curVals)
  const wavSpread = Math.max(...wavVals) - Math.min(...wavVals)
  const better = wavSpread > curSpread ? 'WIDER ↑ better discrimination' : 'narrower ↓'
  console.log(`  ${dim.padEnd(20)} current spread: ${curSpread.toFixed(3)}  wave spread: ${wavSpread.toFixed(3)}  → ${better}`)
}

console.log('\n' + '='.repeat(130))
console.log('VERDICT: Does wave physics improve discrimination?')
console.log('  If wave spreads are wider → wave model better')
console.log('  If wave spreads are narrower → current TDF formulas better')
console.log('  If similar → no clear winner, keep both for A/B')
console.log('='.repeat(130))
