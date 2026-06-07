import { createHash } from 'crypto'
import type { EnhancedGovernanceDecision } from './dynamoSolarGovernance.js'
import type { StructuredDerivativeProposal } from './structuredProposal.js'

export interface ContainerSolarSnapshot {
  timestamp: number
  activityLevel: string
  xrayFlux: number
  kpIndex: number
  protonFlux: number
  magnetometer: number
  solarTdf: number
}

export interface ContainerResonanceProfile {
  fullBox7DComposite: number
  fullBox7DVerdict: string
  waveProximity: number
  phaseAlignment: number
  calibratedVortex: number
  calibratedSync: number
  neuralProximity: number
  neuralVortex: number
  gematriaResonance: number
  structuralResonance: number
  verdict: string
  confidence: number
}

export interface ContainerMoralOverlay {
  trinitariumMoralScore: number
  virtueAlignment: number
  moralSafety: number
  intentAlignment: number
  trinitariumGematriaFusion: number
  moralNumerologicalTension: string
}

export interface ContainerVortex {
  containerId: string
  timestamp: number
  proposalHash: string
  solarSnapshot: ContainerSolarSnapshot
  resonanceProfile: ContainerResonanceProfile
  moralOverlay: ContainerMoralOverlay
  hammerReason: string
  vortexMessage?: string
  previousContainerHash: string
  containerHash: string
  source: 'human' | 'agent' | 'ambient'
}

const SCALE_1E18 = 1e18
const XRAY_SCALE = 1e9
const KP_SCALE = 1e2

function scaleToUint256(value: number): bigint {
  return BigInt(Math.round(value * SCALE_1E18))
}

function scaleXray(value: number): bigint {
  return BigInt(Math.round(value * XRAY_SCALE))
}

function scaleKp(value: number): bigint {
  return BigInt(Math.round(value * KP_SCALE))
}

export function governanceToContainer(
  decision: EnhancedGovernanceDecision,
  proposalText: string,
  source: 'human' | 'agent' | 'ambient' = 'human',
  previousHash?: string,
): ContainerVortex {
  const timestamp = Math.floor(Date.now() / 1000)
  const proposalHash = '0x' + createHash('sha256').update(proposalText).digest('hex')

  const solarSnapshot: ContainerSolarSnapshot = {
    timestamp,
    activityLevel: decision.solarContext?.solarActivityLevel ?? 'quiet',
    xrayFlux: decision.solarContext?.solarIsotopicResonance ?? 0,
    kpIndex: decision.solarContext?.solarActivityModifier ?? 0,
    protonFlux: 0,
    magnetometer: 0,
    solarTdf: decision.solarContext?.proposalTdf ?? 0,
  }

  const resonanceProfile: ContainerResonanceProfile = {
    fullBox7DComposite: decision.fullBox7DComposite ?? 0,
    fullBox7DVerdict: decision.fullBox7DVerdict ?? 'NEEDS_REVISION',
    waveProximity: decision.waveProximity ?? 0,
    phaseAlignment: decision.solarContext?.phaseAlignment as number ?? 0,
    calibratedVortex: decision.resonanceScore ?? decision.fullBoxVortexAlignment ?? 0,
    calibratedSync: decision.synchronization ?? 0,
    neuralProximity: decision.fullBoxNeuralProximity ?? 0,
    neuralVortex: decision.fullBoxNeuralVortex ?? 0,
    gematriaResonance: decision.gematriaResonance ?? decision.fullBoxGematriaResonance ?? 0,
    structuralResonance: decision.structuralResonance ?? 0,
    verdict: decision.recommendation ?? decision.finalRecommendation ?? 'NEEDS_REVISION',
    confidence: decision.confidence ?? 0.5,
  }

  const moralOverlay: ContainerMoralOverlay = {
    trinitariumMoralScore: decision.trinitariumMoralScore ?? 0.5,
    virtueAlignment: decision.trinitariumVirtueAlignment ?? 0.5,
    moralSafety: decision.trinitariumHarmPotential != null
      ? 1 - decision.trinitariumHarmPotential
      : 0.85,
    intentAlignment: decision.trinitariumIntentAlignment ?? 0.5,
    trinitariumGematriaFusion: decision.trinitariumGematriaFusion ?? 0,
    moralNumerologicalTension: decision.moralNumerologicalTension ?? 'Mild',
  }

  const containerId = '0x' + createHash('sha256')
    .update(proposalHash + timestamp.toString())
    .digest('hex')

  const containerHash = '0x' + createHash('sha256')
    .update(JSON.stringify({
      proposalHash,
      timestamp,
      resonance7D: resonanceProfile.fullBox7DComposite,
      gematria: resonanceProfile.gematriaResonance,
      moral: moralOverlay.trinitariumMoralScore,
      fusion: moralOverlay.trinitariumGematriaFusion,
    }))
    .digest('hex')

  return {
    containerId,
    timestamp,
    proposalHash,
    solarSnapshot,
    resonanceProfile,
    moralOverlay,
    hammerReason: decision.hammerReason ?? '',
    vortexMessage: decision.vortexMessage,
    previousContainerHash: previousHash ?? '0x' + '0'.repeat(64),
    containerHash,
    source,
  }
}

export function containerToContractParams(container: ContainerVortex) {
  return {
    containerId: container.containerId,
    timestamp: BigInt(Math.floor(container.timestamp)),
    proposalHash: container.proposalHash,
    solarSnapshot: {
      timestamp: BigInt(container.solarSnapshot.timestamp),
      activityLevel: container.solarSnapshot.activityLevel,
      xrayFlux: scaleXray(container.solarSnapshot.xrayFlux),
      kpIndex: scaleKp(container.solarSnapshot.kpIndex),
      protonFlux: BigInt(Math.round(container.solarSnapshot.protonFlux)),
      magnetometer: BigInt(Math.round(container.solarSnapshot.magnetometer)),
      solarTdf: BigInt(Math.round(container.solarSnapshot.solarTdf)),
    },
    resonanceProfile: {
      fullBox7DComposite: scaleToUint256(container.resonanceProfile.fullBox7DComposite),
      fullBox7DVerdict: container.resonanceProfile.fullBox7DVerdict,
      waveProximity: scaleToUint256(container.resonanceProfile.waveProximity),
      phaseAlignment: scaleToUint256(container.resonanceProfile.phaseAlignment),
      calibratedVortex: scaleToUint256(container.resonanceProfile.calibratedVortex),
      calibratedSync: scaleToUint256(container.resonanceProfile.calibratedSync),
      neuralProximity: scaleToUint256(container.resonanceProfile.neuralProximity),
      neuralVortex: scaleToUint256(container.resonanceProfile.neuralVortex),
      gematriaResonance: scaleToUint256(container.resonanceProfile.gematriaResonance),
      structuralResonance: scaleToUint256(container.resonanceProfile.structuralResonance),
      verdict: container.resonanceProfile.verdict,
      confidence: scaleToUint256(container.resonanceProfile.confidence),
    },
    moralOverlay: {
      trinitariumMoralScore: scaleToUint256(container.moralOverlay.trinitariumMoralScore),
      virtueAlignment: scaleToUint256(container.moralOverlay.virtueAlignment),
      moralSafety: scaleToUint256(container.moralOverlay.moralSafety),
      intentAlignment: scaleToUint256(container.moralOverlay.intentAlignment),
      trinitariumGematriaFusion: scaleToUint256(container.moralOverlay.trinitariumGematriaFusion),
      moralNumerologicalTension: container.moralOverlay.moralNumerologicalTension,
    },
    hammerReason: container.hammerReason,
    containerHash: container.containerHash,
    source: container.source,
  }
}

export function determineSource(
  input: string | StructuredDerivativeProposal,
): 'human' | 'agent' | 'ambient' {
  if (typeof input === 'string') return 'human'
  return (input.source ?? 'human') as 'human' | 'agent' | 'ambient'
}