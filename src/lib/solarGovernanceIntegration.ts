// src/lib/solarGovernanceIntegration.ts
// Integrates real-time solar data into Dynamo governance decisions
// Uses the canonical Codex TDF formula (tPTT × TAU × 1/BHS) instead of FNV-1a.

import { solarDataFetcher, SolarData } from './solarDataFetcher';
import { TemporalBlurrnSignal } from './temporalBlurrnSignal';
import { computeFullTDF, VortexTdfParams } from './vortexMath';
import { runKuramotoCoupling } from './kuramotoOscillators';

// Solar-Isotopic Hammer helpers (kept in sync with mcp/lib version)
const ACTIVITY_ORDINAL: Record<string, number> = { quiet: 0, moderate: 1, active: 2, storm: 3 }

function normalizeProposalText(text: string): string {
  let t = text.toLowerCase();
  t = t.replace(/[^\w\s?]/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  const stop = ['the', 'a', 'an', 'is', 'are', 'of', 'for', 'to', 'and', 'or', 'but', 'in', 'on', 'with', 'that', 'this'];
  return t.split(' ').filter(w => w && !stop.includes(w)).join(' ');
}

function fnvHash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const MIN_FINGERPRINT_WORDS = 3;
const ANCHOR_WORDS = ['general', 'proposal', 'matter'];

function deriveProposalCodexParams(words: string[], solarData: SolarData): VortexTdfParams {
  const effective = words.length >= MIN_FINGERPRINT_WORDS
    ? words
    : [...words, ...ANCHOR_WORDS.slice(0, MIN_FINGERPRINT_WORDS - words.length)];
  const wordCount = Math.max(effective.length, 1)
  const combined = effective.join(' ')
  const totalChars = combined.length
  const uniqueChars = new Set(combined).size
  const hashVal = fnvHash(combined)

  const T_c = 0.5 + (wordCount / 50) + (uniqueChars / Math.max(totalChars, 1)) * 0.5
  const P_s = 0.1 + (hashVal % 100000) / 100000
  const E_t = 0.1 + (uniqueChars / Math.max(totalChars, 1))
  const activityOrdinal = ACTIVITY_ORDINAL[solarData.activityLevel] ?? 1
  const delta_t = 1 + activityOrdinal * 2
  const voids = 7
  const bhs_n = 2 + (hashVal % 4)

  return { T_c, P_s, E_t, delta_t, voids, bhs_n }
}

function deriveSolarCodexParams(solarData: SolarData): VortexTdfParams {
  const activityOrdinal = ACTIVITY_ORDINAL[solarData.activityLevel] ?? 1

  const T_c = 0.5 + (activityOrdinal / 6)
  const P_s = Math.max(Math.min(solarData.xray.long * 1e7, 100), 0.1)
  const E_t = 0.1 + ((solarData.particles.spectralIndex || 0) / 10)
  const delta_t = 1 + activityOrdinal * 2
  const voids = 3 + activityOrdinal
  const bhs_n = 3 + (activityOrdinal % 3)

  return { T_c, P_s, E_t, delta_t, voids, bhs_n }
}

function computeProposalTdf(words: string[], solarData: SolarData): number {
  const params = deriveProposalCodexParams(words, solarData)
  return computeFullTDF(params).tdf
}

function getSolarReferenceTdf(solarData: SolarData): number {
  const params = deriveSolarCodexParams(solarData)
  return computeFullTDF(params).tdf
}

// Cascade index for cross-correlation lag — derived from TDF fine structure,
// not content hash (content hashes are now replaced by Kuramoto oscillators).
function tdfCascade(tdf: number): number {
  return Math.floor((tdf % 1e6) / 10000) % 100;
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
  async getProposalSolarIsotopicResonance(proposal: string, spectralQuality?: number): Promise<{
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
    spectralQuality?: number
    neuralContextUsed: boolean
  }> {
    try {
      const solarData = await solarDataFetcher.fetchCurrentSolarData()

      const normalized = normalizeProposalText(proposal || 'empty-proposal')
      const words = normalized ? normalized.split(/\s+/).filter(w => w.length > 0) : []
      const proposalTdf = computeProposalTdf(words, solarData)
      const propCascade = tdfCascade(proposalTdf)

      const proposalSignal = new TemporalBlurrnSignal(
        { content: proposal },
        proposalTdf,
        propCascade
      )

      const solarRefTdf = getSolarReferenceTdf(solarData)
      const sunCascade = tdfCascade(solarRefTdf)
      const sunSignal = new TemporalBlurrnSignal(
        { source: 'sun', ...solarData },
        solarRefTdf,
        sunCascade
      )

      const kuramoto = runKuramotoCoupling(proposalTdf, solarRefTdf)

      const correlation = proposalSignal.crossCorrelate(sunSignal)

      const deltaDiff = Math.abs((proposalTdf % 1e6) - (solarRefTdf % 1e6))
      const proximity = Math.exp(-Math.pow(deltaDiff / 1e6, 2))

      const phaseAlignment = kuramoto.phaseAlignment

      const logRatio = Math.abs(Math.log(Math.max(proposalTdf, 1)) - Math.log(Math.max(solarRefTdf, 1)))
      const logMax = Math.log(Math.max(proposalTdf, solarRefTdf, 1))
      const vortexAlignment = Math.max(0.15, 1 - logRatio / logMax)

      const syncRaw = Math.max(0, 1 - deltaDiff / 1e6)
      const synchronization = Math.max(0.15, syncRaw)

      const neuralContextUsed = spectralQuality !== undefined
      const structuralResonance = neuralContextUsed
        ? Math.max(0.15, Math.min(0.98,
            proximity * 0.18 + phaseAlignment * 0.18 + vortexAlignment * 0.27 + synchronization * 0.27 + spectralQuality! * 0.10
          ))
        : Math.max(0.15, Math.min(0.98,
            proximity * 0.20 + phaseAlignment * 0.20 + vortexAlignment * 0.30 + synchronization * 0.30
          ))

      const solarIsotopicResonance = structuralResonance

      const signalTiming = kuramoto.signalTiming

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
        phaseCoherenceProposal: kuramoto.phaseCoherenceProposal,
        phaseCoherenceSun: kuramoto.phaseCoherenceSun,
        vortexVolume: correlation.metadata?.vortexVolume ?? proposalTdf * solarRefTdf,
        activityModifier,
        spectralQuality: neuralContextUsed ? spectralQuality : undefined,
        neuralContextUsed,
      }
    } catch (error) {
      console.error('[SolarHammer] src/lib resonance failed, neutral:', error)
      const fallbackTdf = 5.781e12 + 424242

      return {
        structuralResonance: 0.80,
        proximity: 0.80,
        phaseAlignment: 0.80,
        vortexAlignment: Math.max(0.15, 1 - Math.abs(Math.log(Math.max(fallbackTdf, 1)) - Math.log(Math.max(fallbackTdf + 1000, 1))) / Math.log(Math.max(fallbackTdf, fallbackTdf + 1000, 1))),
        synchronization: 0.80,
        crossCorrelationStrength: 0.80,
        crossCorrelationLag: 1,
        signalTiming: 'synced' as const,
        solarIsotopicResonance: 0.80,
        solarActivityLevel: 'moderate',
        solarReferenceTdf: fallbackTdf,
        proposalTdf: fallbackTdf,
        phaseCoherenceProposal: 0.75,
        phaseCoherenceSun: 0.75,
        vortexVolume: fallbackTdf * (fallbackTdf + 1000),
        activityModifier: 0,
        spectralQuality: undefined,
        neuralContextUsed: false,
      }
    }
  }

}