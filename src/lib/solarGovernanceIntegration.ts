// src/lib/solarGovernanceIntegration.ts
// Integrates real-time solar data into Dynamo governance decisions

import { solarDataFetcher, SolarData } from './solarDataFetcher';
import { TemporalBlurrnSignal } from './temporalBlurrnSignal';

// Solar-Isotopic Hammer helpers (kept in sync with mcp/lib version)
function normalizeProposalText(text: string): string {
  let t = text.toLowerCase();
  t = t.replace(/[^\w\s?]/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  const stop = ['the', 'a', 'an', 'is', 'are', 'of', 'for', 'to', 'and', 'or', 'but', 'in', 'on', 'with', 'that', 'this'];
  return t.split(' ').filter(w => w && !stop.includes(w)).join(' ');
}

function wordFingerprint(word: string): number {
  let h = 2166136261;
  for (let i = 0; i < word.length; i++) {
    h ^= word.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 999983;
}

function computeProposalTdf(words: string[]): number {
  if (words.length === 0) return 5.781e12 + 500000;
  const avg = words.reduce((sum, w) => sum + wordFingerprint(w), 0) / words.length;
  return 5.781e12 + Math.round(avg);
}

function getSolarReferenceTdf(solarData: any): number {
  const ts = Date.parse(solarData.timestamp || new Date().toISOString())
  const kp = (solarData.kpIndex || 3) * 100000
  const xray = Math.floor((solarData.xray?.long || 1e-6) * 1e15) % 10000000
  const seed = ((ts % 10000000) + kp + xray) % 100000000
  return 5.781e12 + seed
}

// Vortex-style cascade derivation (kept in sync with mcp/lib)
function deriveCascadeFromContent(content: string): number {
  let h = 0
  for (let i = 0; i < content.length; i++) h = (h * 31 + content.charCodeAt(i)) | 0
  return Math.abs(h) % 100
}

function deriveCascadeFromSolar(solarData: any): number {
  return Math.floor((solarData.kpIndex || 3) * 7 + (solarData.xray?.hardnessRatio || 0) * 10) % 100
}

export interface SolarGovernanceContext {
  solarActivityLevel: string;
  solarActivityModifier: number; // -0.2 to +0.2
  currentSunMetamorphosisIndex: number;
  timestamp: string;
  recommendation: string;
  solarIsotopicResonance?: number;
  proposalTdf?: number;
  solarReferenceTdf?: number;
}

export class SolarGovernanceIntegration {
  
  async getSolarContextForGovernance(): Promise<SolarGovernanceContext> {
    try {
      // Fetch current solar data
      const solarData = await solarDataFetcher.fetchCurrentSolarData();
      
      // Generic solar context (activity level + modifier only).
      // The real per-proposal resonance is the calculated solar isotopic hammer.
      let activityModifier = 0;
      let recommendation = "Standard governance conditions";

      switch (solarData.activityLevel) {
        case 'quiet':
          activityModifier = 0.05;
          recommendation = "Calm solar conditions - high decision stability";
          break;
        case 'moderate':
          activityModifier = 0;
          recommendation = "Normal solar conditions";
          break;
        case 'active':
          activityModifier = -0.08;
          recommendation = "Elevated solar activity - consider increased caution";
          break;
        case 'storm':
          activityModifier = -0.15;
          recommendation = "Solar storm detected - recommend delayed or weighted decisions";
          break;
      }

      return {
        solarActivityLevel: solarData.activityLevel,
        solarActivityModifier: activityModifier,
        currentSunMetamorphosisIndex: 0.5, // legacy neutral placeholder (real resonance is the hammer)
        timestamp: solarData.timestamp,
        recommendation
      };

    } catch (error) {
      console.error('Error getting solar governance context:', error);
      
      // Fallback to neutral context
      return {
        solarActivityLevel: 'moderate',
        solarActivityModifier: 0,
        currentSunMetamorphosisIndex: 0.5,
        timestamp: new Date().toISOString(),
        recommendation: "Unable to fetch solar data - using neutral context"
      };
    }
  }

  /**
   * THE SOLAR ISOTOPIC HAMMER (src/lib mirror)
   * Direct sun-grounded resonance for the proposal text vs live NOAA solar phase.
   */
  async getProposalSolarIsotopicResonance(proposal: string): Promise<{
    solarIsotopicResonance: number
    solarActivityLevel: string
    solarReferenceTdf: number
    proposalTdf: number
    phaseCoherenceProposal: number
    phaseCoherenceSun: number
    activityModifier: number
    crossCorrelationStrength?: number
    vortexVolume?: number
  }> {
    try {
      const solarData = await solarDataFetcher.fetchCurrentSolarData()

      const normalized = normalizeProposalText(proposal || 'empty-proposal')
      const words = normalized ? normalized.split(/\s+/).filter(w => w.length > 0) : []
      const proposalTdf = computeProposalTdf(words)
      const propCascade = deriveCascadeFromContent(proposal || 'empty-proposal')

      const proposalSignal = new TemporalBlurrnSignal(
        { content: proposal },
        proposalTdf,
        propCascade
      )

      const solarRefTdf = getSolarReferenceTdf(solarData)
      const sunCascade = deriveCascadeFromSolar(solarData)
      const sunSignal = new TemporalBlurrnSignal(
        { source: 'sun', ...solarData },
        solarRefTdf,
        sunCascade
      )

      const correlation = proposalSignal.crossCorrelate(sunSignal)
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
        proposalTdf: proposalTdf,
        phaseCoherenceProposal: proposalSignal.phaseCoherence,
        phaseCoherenceSun: sunSignal.phaseCoherence,
        activityModifier,
        crossCorrelationStrength: correlation.strength,
        vortexVolume: correlation.metadata?.vortexVolume,
      }
    } catch (error) {
      console.error('[SolarHammer] src/lib resonance failed, neutral:', error)
      const fallbackTdf = 5.781e12 + 424242
      const proposalSignal = new TemporalBlurrnSignal({ content: proposal }, fallbackTdf, 42)
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

// Singleton
export const solarGovernance = new SolarGovernanceIntegration();