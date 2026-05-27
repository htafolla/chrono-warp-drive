// mcp/lib/solarGovernanceIntegration.ts
// Integrates real-time solar data into Dynamo governance decisions

import { fetchCurrentSolarData, SolarData } from './solarDataFetcher.js'
import { TemporalBlurrnSignal } from './temporalBlurrnSignal.js'

// Solar-Isotopic Hammer — Option 1 + Option 2 (complete stabilized implementation)
// Normalize first (Option 2), then seed real vortex parameters from normalized text (Option 1),
// compute rich TDF with canonical formulas, create proper TemporalBlurrnSignal objects,
// and derive resonance from the exact vortex crossCorrelate implementation.

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

function deriveCascadeFromContent(content: string): number {
  const norm = normalizeProposalText(content);
  let h = 0;
  for (let i = 0; i < norm.length; i++) h = (h * 31 + norm.charCodeAt(i)) | 0;
  return Math.abs(h) % 100;
}

function getSolarReferenceTdf(solarData: SolarData): number {
  const ts = Date.parse(solarData.timestamp || new Date().toISOString())
  const kp = (solarData.kpIndex || 3) * 100000
  const xray = Math.floor((solarData.xray?.long || 1e-6) * 1e15) % 10000000
  const seed = ((ts % 10000000) + kp + xray) % 100000000
  return 5.781e12 + seed
}

function deriveCascadeFromSolar(solarData: SolarData): number {
  return Math.floor((solarData.kpIndex || 3) * 7 + (solarData.xray?.hardnessRatio || 0) * 10) % 100;
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

/**
 * SOLAR ISOTOPIC HAMMER v2 — Structural Resonance
 * Computes multi-dimensional resonance inside the isotopic temporal vortex.
 * The proposal and sun each form a TemporalBlurrnSignal (a point inside the triangle).
 * Resonance is now measured across three legs of the isosceles triangle:
 *   - Proximity (delta distance between vertices) — the original Gaussian
 *   - Phase Alignment (structural coherence between proposal and sun)
 *   - Vortex Alignment (energy volume alignment — does the proposal fit the container?)
 */
export interface StructuralResonanceResult {
  structuralResonance: number
  proximity: number
  phaseAlignment: number
  vortexAlignment: number
  crossCorrelationStrength: number
  crossCorrelationLag: number
  solarIsotopicResonance: number
  solarActivityLevel: string
  solarReferenceTdf: number
  proposalTdf: number
  phaseCoherenceProposal: number
  phaseCoherenceSun: number
  vortexVolume: number
  activityModifier: number
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
   * THE SOLAR ISOTOPIC HAMMER v2 — Structural Resonance
   * Computes multi-dimensional resonance inside the isotopic temporal vortex.
   * Uses the Blurrn crossCorrelate to get phase alignment, cross-correlation lag,
   * and vortex volume — then combines them with proximity into a composite score.
   */
  async getProposalSolarIsotopicResonance(proposal: string): Promise<StructuralResonanceResult> {
    try {
      const solarData = await fetchCurrentSolarData()

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

      // Cross-correlate for full structural comparison
      const correlation = proposalSignal.crossCorrelate(sunSignal)

      // === TRIANGLE LEG 1: Proximity (delta distance between vertices) ===
      const deltaDiff = Math.abs((proposalTdf % 1e6) - (solarRefTdf % 1e6))
      const proximity = Math.exp(-Math.pow(deltaDiff / 1e6, 2))

      // === TRIANGLE LEG 2: Phase Alignment (structural coherence) ===
      // How similar are the internal structures of proposal and sun signals?
      // 1.0 = perfectly aligned structures, 0.0 = completely misaligned
      const phaseAlignment = 1 - Math.abs(proposalSignal.phaseCoherence - sunSignal.phaseCoherence)

      // === TRIANGLE LEG 3: Vortex Alignment (energy volume fit) ===
      // Does the proposal's energy fit inside the sun's container?
      // Normalized by comparing TDF magnitudes: ratio of the smaller to the larger
      const minTdf = Math.min(proposalTdf, solarRefTdf)
      const maxTdf = Math.max(proposalTdf, solarRefTdf)
      const vortexAlignment = minTdf / maxTdf

      // === COMPOSITE: Structural Resonance (inside the vortex) ===
      // Proximity × 0.5 + Phase Alignment × 0.3 + Vortex Alignment × 0.2
      const structuralResonance = Math.max(0.15, Math.min(0.98,
        proximity * 0.5 + phaseAlignment * 0.3 + vortexAlignment * 0.2
      ))

      // Backward-compatible: solarIsotopicResonance is now the composite
      const solarIsotopicResonance = structuralResonance

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
        crossCorrelationStrength: correlation.strength,
        crossCorrelationLag: correlation.lag,
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
      console.error('[SolarHammer] resonance computation failed, neutral fallback:', error)
      const fallbackTdf = 5.781e12 + 424242
      const proposalSignal = new TemporalBlurrnSignal({ content: proposal }, fallbackTdf, 42)
      const sunSignal = new TemporalBlurrnSignal({ source: 'sun' }, fallbackTdf + 1000, 43)

      return {
        structuralResonance: 0.80,
        proximity: 0.80,
        phaseAlignment: 1 - Math.abs(proposalSignal.phaseCoherence - sunSignal.phaseCoherence),
        vortexAlignment: fallbackTdf / (fallbackTdf + 1000),
        crossCorrelationStrength: 0.80,
        crossCorrelationLag: 1,
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

export const solarGovernance = new SolarGovernanceIntegration()
