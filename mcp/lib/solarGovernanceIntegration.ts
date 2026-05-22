// mcp/lib/solarGovernanceIntegration.ts
// Integrates real-time solar data into Dynamo governance decisions

import { fetchCurrentSolarData } from './solarDataFetcher.js'

// Solar-Isotopic Hammer: proposal content -> stable tdf fingerprint, aligned to live NOAA sun phase
// This makes resonance a direct, solar-grounded score that can override review-based governance.
function hashProposalToTdf(proposal: string): number {
  let h = 2166136261 >>> 0 // FNV-1a 32-bit
  for (let i = 0; i < proposal.length; i++) {
    h ^= proposal.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  const norm = (h % 100000000) / 1e8 // 0..1
  return 5.781e12 + norm * 137000000 // spread in the Blurrn tdf range
}

function getPhaseCoherence(tdf: number): number {
  const PHI = 1.666
  const TAU = 0.865
  const reducedTdf = tdf % Math.sqrt(PHI)
  return Math.pow(Math.sin(2 * Math.PI * TAU * reducedTdf), 2)
}

function calculateIsotopicRatio(tdfA: number, tdfB: number): number {
  const deltaA = tdfA % 1e6
  const deltaB = tdfB % 1e6
  const maxDelta = Math.max(Math.abs(deltaA), Math.abs(deltaB)) + 1e-9
  return 1 - Math.abs(deltaA - deltaB) / maxDelta
}

function getSolarReferenceTdf(solarData: any): number {
  // NOAA-grounded reference phase for "the sun right now"
  const ts = Date.parse(solarData.timestamp || new Date().toISOString())
  const kp = (solarData.kpIndex || 3) * 100000
  const xray = Math.floor((solarData.xray?.long || 1e-6) * 1e15) % 10000000
  const seed = ((ts % 10000000) + kp + xray) % 100000000
  return 5.781e12 + seed
}

export interface SolarGovernanceContext {
  solarActivityLevel: string
  solarActivityModifier: number // -0.15 to +0.05
  currentSunMetamorphosisIndex: number
  timestamp: string
  recommendation: string
  // New: per-proposal isotopic resonance from the sun (the hammer)
  solarIsotopicResonance?: number
  proposalTdf?: number
  solarReferenceTdf?: number
}

export class SolarGovernanceIntegration {

  async getSolarContextForGovernance(): Promise<SolarGovernanceContext> {
    try {
      const solarData = await fetchCurrentSolarData()

      // Use actual solar activity from NOAA
      const baseResonance = 0.6735

      let activityModifier = 0
      let recommendation = 'Standard governance conditions'

      switch (solarData.activityLevel) {
        case 'quiet':
          activityModifier = 0.05
          recommendation = 'Calm solar conditions - high decision stability'
          break
        case 'moderate':
          activityModifier = 0
          recommendation = 'Normal solar conditions'
          break
        case 'active':
          activityModifier = -0.08
          recommendation = 'Elevated solar activity - consider increased caution'
          break
        case 'storm':
          activityModifier = -0.15
          recommendation = 'Solar storm detected - recommend delayed or weighted decisions'
          break
      }

      return {
        solarActivityLevel: solarData.activityLevel,
        solarActivityModifier: activityModifier,
        currentSunMetamorphosisIndex: baseResonance,
        timestamp: solarData.timestamp,
        recommendation,
      }
    } catch (error) {
      console.error('Error getting solar governance context:', error)
      return {
        solarActivityLevel: 'moderate',
        solarActivityModifier: 0,
        currentSunMetamorphosisIndex: 0.6735,
        timestamp: new Date().toISOString(),
        recommendation: 'Unable to fetch solar data - using neutral context',
      }
    }
  }

  /**
   * THE SOLAR ISOTOPIC HAMMER
   * Computes direct resonance between this proposal's Blurrn isotopic fingerprint
   * and the current real-time solar conditions (NOAA SWPC).
   * This score is proposal-specific, sun-grounded, and intended to act as an
   * overriding yes/no decision force (can bypass or heavily weight review correlations).
   */
  async getProposalSolarIsotopicResonance(proposal: string): Promise<{
    solarIsotopicResonance: number
    solarActivityLevel: string
    solarReferenceTdf: number
    proposalTdf: number
    phaseCoherenceProposal: number
    phaseCoherenceSun: number
    activityModifier: number
  }> {
    try {
      const solarData = await fetchCurrentSolarData()
      const solarRefTdf = getSolarReferenceTdf(solarData)
      const propTdf = hashProposalToTdf(proposal || 'empty-proposal')

      const pPhase = getPhaseCoherence(propTdf)
      const sPhase = getPhaseCoherence(solarRefTdf)
      const phaseAlign = 1 - Math.abs(pPhase - sPhase)
      const isoR = calculateIsotopicRatio(propTdf, solarRefTdf)

      let rawRes = isoR * phaseAlign
      // Clamp to meaningful governance range
      const solarIsotopicResonance = Math.max(0.15, Math.min(0.98, rawRes))

      // activity still provides modifier for downstream
      let activityModifier = 0
      switch (solarData.activityLevel) {
        case 'quiet': activityModifier = 0.05; break
        case 'active': activityModifier = -0.08; break
        case 'storm': activityModifier = -0.15; break
        default: activityModifier = 0
      }

      return {
        solarIsotopicResonance,
        solarActivityLevel: solarData.activityLevel || 'moderate',
        solarReferenceTdf: solarRefTdf,
        proposalTdf: propTdf,
        phaseCoherenceProposal: pPhase,
        phaseCoherenceSun: sPhase,
        activityModifier,
      }
    } catch (error) {
      console.error('[SolarHammer] resonance computation failed, neutral fallback:', error)
      const fallbackTdf = 5.781e12 + 424242
      return {
        solarIsotopicResonance: 0.67,
        solarActivityLevel: 'moderate',
        solarReferenceTdf: fallbackTdf,
        proposalTdf: hashProposalToTdf(proposal),
        phaseCoherenceProposal: getPhaseCoherence(hashProposalToTdf(proposal)),
        phaseCoherenceSun: getPhaseCoherence(fallbackTdf),
        activityModifier: 0,
      }
    }
  }
}

export const solarGovernance = new SolarGovernanceIntegration()
