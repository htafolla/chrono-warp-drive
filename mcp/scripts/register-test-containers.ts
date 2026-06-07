import { persistContainerToChain } from '../lib/contractClient.js'
import type { ContainerVortex } from '../lib/temporalContainer.js'
import { createHash } from 'crypto'

const containers: ContainerVortex[] = [
  {
    containerId: '0x' + createHash('sha256').update('celestial-test-container-1').digest('hex'),
    timestamp: Math.floor(Date.now() / 1000),
    proposalHash: '0x' + createHash('sha256').update('celestial-proposal').digest('hex'),
    solarSnapshot: { timestamp: Math.floor(Date.now() / 1000), activityLevel: 'high', xrayFlux: 1.2e-6, kpIndex: 7, protonFlux: 100, magnetometer: 50, solarTdf: 3 },
    resonanceProfile: { fullBox7DComposite: 0.97, fullBox7DVerdict: 'PASS', waveProximity: 0.95, phaseAlignment: 0.96, calibratedVortex: 0.94, calibratedSync: 0.93, neuralProximity: 0.95, neuralVortex: 0.92, gematriaResonance: 0.96, structuralResonance: 0.94, verdict: 'PASS', confidence: 0.95 },
    moralOverlay: { trinitariumMoralScore: 0.92, virtueAlignment: 0.90, moralSafety: 0.88, intentAlignment: 0.91, trinitariumGematriaFusion: 0.85, moralNumerologicalTension: 'Mild' },
    hammerReason: 'Exceptional alignment score',
    previousContainerHash: '0x' + '0'.repeat(64),
    containerHash: '0x' + createHash('sha256').update('celestial-container-data').digest('hex'),
    source: 'human',
  },
  {
    containerId: '0x' + createHash('sha256').update('resonant-test-container-1').digest('hex'),
    timestamp: Math.floor(Date.now() / 1000),
    proposalHash: '0x' + createHash('sha256').update('resonant-proposal').digest('hex'),
    solarSnapshot: { timestamp: Math.floor(Date.now() / 1000), activityLevel: 'moderate', xrayFlux: 5e-7, kpIndex: 4, protonFlux: 50, magnetometer: 25, solarTdf: 2 },
    resonanceProfile: { fullBox7DComposite: 0.85, fullBox7DVerdict: 'PASS', waveProximity: 0.82, phaseAlignment: 0.79, calibratedVortex: 0.81, calibratedSync: 0.78, neuralProximity: 0.83, neuralVortex: 0.80, gematriaResonance: 0.84, structuralResonance: 0.79, verdict: 'PASS', confidence: 0.82 },
    moralOverlay: { trinitariumMoralScore: 0.78, virtueAlignment: 0.75, moralSafety: 0.80, intentAlignment: 0.76, trinitariumGematriaFusion: 0.72, moralNumerologicalTension: 'Low' },
    hammerReason: 'Strong resonant alignment',
    previousContainerHash: '0x' + '0'.repeat(64),
    containerHash: '0x' + createHash('sha256').update('resonant-container-data').digest('hex'),
    source: 'agent',
  },
  {
    containerId: '0x' + createHash('sha256').update('unstable-test-container-1').digest('hex'),
    timestamp: Math.floor(Date.now() / 1000),
    proposalHash: '0x' + createHash('sha256').update('unstable-proposal').digest('hex'),
    solarSnapshot: { timestamp: Math.floor(Date.now() / 1000), activityLevel: 'quiet', xrayFlux: 2e-7, kpIndex: 2, protonFlux: 10, magnetometer: 5, solarTdf: 1 },
    resonanceProfile: { fullBox7DComposite: 0.65, fullBox7DVerdict: 'NEEDS_REVISION', waveProximity: 0.60, phaseAlignment: 0.58, calibratedVortex: 0.62, calibratedSync: 0.55, neuralProximity: 0.63, neuralVortex: 0.59, gematriaResonance: 0.61, structuralResonance: 0.57, verdict: 'NEEDS_REVISION', confidence: 0.60 },
    moralOverlay: { trinitariumMoralScore: 0.55, virtueAlignment: 0.52, moralSafety: 0.58, intentAlignment: 0.50, trinitariumGematriaFusion: 0.45, moralNumerologicalTension: 'Moderate' },
    hammerReason: 'Partial alignment detected',
    previousContainerHash: '0x' + '0'.repeat(64),
    containerHash: '0x' + createHash('sha256').update('unstable-container-data').digest('hex'),
    source: 'ambient',
  },
  {
    containerId: '0x' + createHash('sha256').update('dissonant-test-container-1').digest('hex'),
    timestamp: Math.floor(Date.now() / 1000),
    proposalHash: '0x' + createHash('sha256').update('dissonant-proposal').digest('hex'),
    solarSnapshot: { timestamp: Math.floor(Date.now() / 1000), activityLevel: 'quiet', xrayFlux: 1e-7, kpIndex: 1, protonFlux: 5, magnetometer: 2, solarTdf: 0 },
    resonanceProfile: { fullBox7DComposite: 0.38, fullBox7DVerdict: 'FAIL', waveProximity: 0.35, phaseAlignment: 0.30, calibratedVortex: 0.33, calibratedSync: 0.28, neuralProximity: 0.36, neuralVortex: 0.31, gematriaResonance: 0.34, structuralResonance: 0.29, verdict: 'FAIL', confidence: 0.40 },
    moralOverlay: { trinitariumMoralScore: 0.30, virtueAlignment: 0.28, moralSafety: 0.35, intentAlignment: 0.25, trinitariumGematriaFusion: 0.20, moralNumerologicalTension: 'High' },
    hammerReason: 'Poor alignment - major revision needed',
    previousContainerHash: '0x' + '0'.repeat(64),
    containerHash: '0x' + createHash('sha256').update('dissonant-container-data').digest('hex'),
    source: 'ambient',
  },
  {
    containerId: '0x' + createHash('sha256').update('system-test-container-1').digest('hex'),
    timestamp: Math.floor(Date.now() / 1000),
    proposalHash: '0x' + createHash('sha256').update('system-proposal').digest('hex'),
    solarSnapshot: { timestamp: Math.floor(Date.now() / 1000), activityLevel: 'high', xrayFlux: 1.5e-6, kpIndex: 8, protonFlux: 200, magnetometer: 100, solarTdf: 4 },
    resonanceProfile: { fullBox7DComposite: 0.96, fullBox7DVerdict: 'PASS', waveProximity: 0.94, phaseAlignment: 0.95, calibratedVortex: 0.93, calibratedSync: 0.92, neuralProximity: 0.94, neuralVortex: 0.91, gematriaResonance: 0.95, structuralResonance: 0.93, verdict: 'PASS', confidence: 0.96 },
    moralOverlay: { trinitariumMoralScore: 0.90, virtueAlignment: 0.88, moralSafety: 0.86, intentAlignment: 0.89, trinitariumGematriaFusion: 0.83, moralNumerologicalTension: 'Mild' },
    hammerReason: 'System-validated exceptional alignment',
    previousContainerHash: '0x' + '0'.repeat(64),
    containerHash: '0x' + createHash('sha256').update('system-container-data').digest('hex'),
    source: 'human',
  },
]

async function main() {
  console.log(`Registering ${containers.length} test containers...\n`)
  for (const c of containers) {
    try {
      const { txHash } = await persistContainerToChain(c)
      const verdict = c.resonanceProfile.verdict
      const composite = c.resonanceProfile.fullBox7DComposite
      const source = c.source
      console.log(`  ✅ ${c.containerId.slice(0, 20)}... | score=${composite} | verdict=${verdict} | source=${source}`)
      console.log(`     tx: ${txHash}`)
    } catch (err: any) {
      console.error(`  ❌ Failed to register ${c.containerId.slice(0, 20)}...: ${err.message ?? err}`)
    }
  }
  console.log('\nDone.')
}

main().catch(err => { console.error(err); process.exit(1) })
