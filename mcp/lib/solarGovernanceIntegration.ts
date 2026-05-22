// mcp/lib/solarGovernanceIntegration.ts
// Integrates real-time solar data into Dynamo governance decisions

import { fetchCurrentSolarData, SolarData } from './solarDataFetcher.js'
import { TemporalBlurrnSignal } from './temporalBlurrnSignal.js'

// Solar-Isotopic Hammer now models EXACTLY the deep researched isotopic-vortex implementation.
// We create proper TemporalBlurrnSignal instances for both the proposal and the current sun,
// then use the canonical crossCorrelate / calculateIsotopicRatio / phase logic from the vortex form.
function hashProposalToTdf(proposal: string): number {
  let h = 2166136261 >>> 0 // FNV-1a 32-bit (stable content fingerprint)
  for (let i = 0; i < proposal.length; i++) {
    h ^= proposal.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  const norm = (h % 100000000) / 1e8
  return 5.781e12 + norm * 137000000
}

function getSolarReferenceTdf(solarData: SolarData): number {
  const ts = Date.parse(solarData.timestamp || new Date().toISOString())
  const kp = (solarData.kpIndex || 3) * 100000
  const xray = Math.floor((solarData.xray?.long || 1e-6) * 1e15) % 10000000
  const seed = ((ts % 10000000) + kp + xray) % 100000000
  return 5.781e12 + seed
}

// Simple but deterministic cascade derivation (can be improved with full TDF param seeding later)
function deriveCascadeFromContent(content: string): number {
  let h = 0
  for (let i = 0; i < content.length; i++) h = (h * 31 + content.charCodeAt(i)) | 0
  return Math.abs(h) % 100
}

function deriveCascadeFromSolar(solarData: SolarData): number {
  return Math.floor((solarData.kpIndex || 3) * 7 + (solarData.xray?.hardnessRatio || 0) * 10) % 100
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

      // Generic solar context (activity level + modifier only).
      // The real per-proposal resonance is the calculated solar isotopic hammer
      // returned via getProposalSolarIsotopicResonance + resonanceScore.
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
        currentSunMetamorphosisIndex: 0.5, // legacy neutral placeholder (real resonance is the hammer)
        timestamp: solarData.timestamp,
        recommendation,
      }
    } catch (error) {
      console.error('Error getting solar governance context:', error)
      return {
        solarActivityLevel: 'moderate',
        solarActivityModifier: 0,
        currentSunMetamorphosisIndex: 0.5,
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
    // New: full vortex metrics from the canonical crossCorrelate
    crossCorrelationStrength?: number
    vortexVolume?: number
  }> {
    try {
      const solarData = await fetchCurrentSolarData()

      const propTdf = hashProposalToTdf(proposal || 'empty-proposal')
      const propCascade = deriveCascadeFromContent(proposal || 'empty-proposal')
      const proposalSignal = new TemporalBlurrnSignal(
        { content: proposal },
        propTdf,
        propCascade
      )

      const solarRefTdf = getSolarReferenceTdf(solarData)
      const sunCascade = deriveCascadeFromSolar(solarData)
      const sunSignal = new TemporalBlurrnSignal(
        { source: 'sun', ...solarData },
        solarRefTdf,
        sunCascade
      )

      // Exact isotopic-vortex calculation
      const correlation = proposalSignal.crossCorrelate(sunSignal)

      // The hammer resonance is the symbiotic strength from the real vortex form
      const solarIsotopicResonance = Math.max(0.15, Math.min(0.98, correlation.strength))

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
        phaseCoherenceProposal: proposalSignal.phaseCoherence,
        phaseCoherenceSun: sunSignal.phaseCoherence,
        activityModifier,
        crossCorrelationStrength: correlation.strength,
        vortexVolume: correlation.metadata?.vortexVolume,
      }
    } catch (error) {
      console.error('[SolarHammer] resonance computation failed, neutral fallback:', error)
      const fallbackTdf = 5.781e12 + 424242
      const fallbackCascade = 42
      const proposalSignal = new TemporalBlurrnSignal({ content: proposal }, fallbackTdf, fallbackCascade)
      const sunSignal = new TemporalBlurrnSignal({ source: 'sun' }, fallbackTdf + 1000, 43)
      const correlation = proposalSignal.crossCorrelate(sunSignal)

      return {
        solarIsotopicResonance: 0.67,
        solarActivityLevel: 'moderate',
        solarReferenceTdf: fallbackTdf,
        proposalTdf: fallbackTdf,
        phaseCoherenceProposal: proposalSignal.phaseCoherence,
        phaseCoherenceSun: sunSignal.phaseCoherence,
        activityModifier: 0,
        crossCorrelationStrength: correlation.strength,
        vortexVolume: correlation.metadata?.vortexVolume,
      }
    }
  }
}

export const solarGovernance = new SolarGovernanceIntegration()
