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

const MIN_FINGERPRINT_WORDS = 3;
const ANCHOR_WORDS = ['general', 'proposal', 'matter'];

function computeProposalTdf(words: string[]): number {
  if (words.length === 0) return 5.781e12 + 500000;
  const effective = words.length >= MIN_FINGERPRINT_WORDS
    ? words
    : [...words, ...ANCHOR_WORDS.slice(0, MIN_FINGERPRINT_WORDS - words.length)];
  let h = 0;
  for (const w of effective) h ^= wordFingerprint(w);
  return 5.781e12 + (h % 1000000);
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
   * SOLAR ISOTOPIC HAMMER v2 — Structural Resonance (src/lib mirror)
   * Computes multi-dimensional resonance inside the isotopic temporal vortex.
   */
  async getProposalSolarIsotopicResonance(proposal: string): Promise<{
    structuralResonance: number
    proximity: number
    phaseAlignment: number
    vortexAlignment: number
    synchronization: number
    crossCorrelationStrength: number
    crossCorrelationLag: number
    signalTiming: 'leading' | 'trailing' | 'synced'
    solarIsotopicResonance: number
    solarActivityLevel: string
    solarReferenceTdf: number
    proposalTdf: number
    phaseCoherenceProposal: number
    phaseCoherenceSun: number
    vortexVolume: number
    activityModifier: number
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

      const deltaDiff = Math.abs((proposalTdf % 1e6) - (solarRefTdf % 1e6))
      const proximity = Math.exp(-Math.pow(deltaDiff / 1e6, 2))

      const phaseAlignment = 1 - Math.abs(proposalSignal.phaseCoherence - sunSignal.phaseCoherence)

      const minTdf = Math.min(proposalTdf, solarRefTdf)
      const maxTdf = Math.max(proposalTdf, solarRefTdf)
      const vortexAlignment = minTdf / maxTdf

      const LAG_SCALE = 5
      const synchronization = 1 / (1 + Math.abs(correlation.lag) / LAG_SCALE)

      const structuralResonance = Math.max(0.15, Math.min(0.98,
        proximity * 0.40 + phaseAlignment * 0.25 + vortexAlignment * 0.15 + synchronization * 0.20
      ))

      const solarIsotopicResonance = structuralResonance

      const cascadeDelta = propCascade - sunCascade
      const signalTiming: 'leading' | 'trailing' | 'synced' = Math.abs(cascadeDelta) < 2 ? 'synced' : cascadeDelta > 0 ? 'leading' : 'trailing'

      let activityModifier = 0
      switch (solarData.activityLevel) {
        case 'quiet': activityModifier = 0.05; break
        case 'active': activityModifier = -0.08; break
        case 'storm': activityModifier = -0.15; break
        default: activityModifier = 0
      }

      return {
        structuralResonance,
        proximity,
        phaseAlignment,
        vortexAlignment,
        synchronization,
        crossCorrelationStrength: correlation.strength,
        crossCorrelationLag: correlation.lag,
        signalTiming,
        solarIsotopicResonance,
        solarActivityLevel: solarData.activityLevel || 'moderate',
        solarReferenceTdf: solarRefTdf,
        proposalTdf,
        phaseCoherenceProposal: proposalSignal.phaseCoherence,
        phaseCoherenceSun: sunSignal.phaseCoherence,
        vortexVolume: correlation.metadata?.vortexVolume ?? proposalTdf * solarRefTdf,
        activityModifier,
      }
    } catch (error) {
      console.error('[SolarHammer] src/lib resonance failed, neutral:', error)
      const fallbackTdf = 5.781e12 + 424242
      const proposalSignal = new TemporalBlurrnSignal({ content: proposal }, fallbackTdf, 42)
      const sunSignal = new TemporalBlurrnSignal({ source: 'sun' }, fallbackTdf + 1000, 43)

      return {
        structuralResonance: 0.80,
        proximity: 0.80,
        phaseAlignment: 1 - Math.abs(proposalSignal.phaseCoherence - sunSignal.phaseCoherence),
        vortexAlignment: fallbackTdf / (fallbackTdf + 1000),
        synchronization: 0.80,
        crossCorrelationStrength: 0.80,
        crossCorrelationLag: 1,
        signalTiming: 'synced' as const,
        solarIsotopicResonance: 0.80,
        solarActivityLevel: 'moderate',
        solarReferenceTdf: fallbackTdf,
        proposalTdf: fallbackTdf,
        phaseCoherenceProposal: proposalSignal.phaseCoherence,
        phaseCoherenceSun: sunSignal.phaseCoherence,
        vortexVolume: fallbackTdf * (fallbackTdf + 1000),
        activityModifier: 0,
      }
    }
  }

}