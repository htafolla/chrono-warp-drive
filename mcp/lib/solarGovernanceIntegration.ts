// mcp/lib/solarGovernanceIntegration.ts
// Integrates real-time solar data into Dynamo governance decisions
// Uses the canonical Codex TDF formula (tPTT × TAU × 1/BHS) instead of FNV-1a.
// The mapping layer derives Codex parameters (T_c, P_s, E_t, delta_t, voids, bhs_n)
// from proposal text and NOAA solar data.

import { solarDataFetcher, fetchCurrentSolarData, SolarData } from './solarDataFetcher.js'
import { TemporalBlurrnSignal } from './temporalBlurrnSignal.js'
import { computeFullTDF, VortexTdfParams } from './vortexMath.js'
import { runKuramotoCoupling } from './kuramotoOscillators.js'
import { computeWaveResonance, computeHybridResonance, computeFullBoxResonance, computeCalibratedWaveVortex, tdfToEmbedding16, textToEmbedding16, sentenceToEmbedding16 } from './wavePropagation.js'
import { computeGematriaVortex, DEFAULT_SOLAR_GEMATRIA_TEXT } from './gematriaEngine.js'
import { computeTrinitariumOverlay, computeTrinitariumGematriaFusion } from './trinitariumMoralOverlay.js'

// Solar-Isotopic Hammer — Option 1 + Option 2 (complete stabilized implementation)
// Normalize first (Option 2), then seed real vortex parameters from normalized text (Option 1),
// compute rich TDF with canonical formulas, create proper TemporalBlurrnSignal objects,
// and derive resonance from the exact vortex crossCorrelate implementation.

const ACTIVITY_ORDINAL: Record<string, number> = { quiet: 0, moderate: 1, active: 2, storm: 3 }

function normalizeProposalText(text: string): string {
  let t = text.toLowerCase();
  t = t.replace(/[^\w\s]/g, ' ');
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
  // Temporal nonce: current second XORed with solar micro-variation.
  // Ensures a different TDF fingerprint for the same text at different moments,
  // making each vortex a unique record of "this exact instant."
  const temporalNonce = Math.floor(Date.now() / 1000) ^ Math.floor((solarData.xray?.long ?? 0) * 1e6)
  const hashVal = fnvHash(combined + String(temporalNonce))

  // T_c: Word count + character diversity. Dense text = larger time constant.
  const T_c = 0.5 + (wordCount / 50) + (uniqueChars / Math.max(totalChars, 1)) * 0.5

  // P_s: Power spectral from FNV hash (wider range for fine-grained variation)
  const P_s = 0.1 + (hashVal % 100000) / 100000

  // E_t: Entropy from character-level uniqueness (not just word-level)
  const E_t = 0.1 + (uniqueChars / Math.max(totalChars, 1))

  // delta_t: Solar-modulated time step (activity increases resolution)
  const activityOrdinal = ACTIVITY_ORDINAL[solarData.activityLevel] ?? 1
  const delta_t = 1 + activityOrdinal * 2

  // voids: Fixed at 7 for proposals (independent of solar context)
  const voids = 7

  // bhs_n: Content-dependent from hash (2–5 range), not just wordCount modulo
  const bhs_n = 2 + (hashVal % 4)

  return { T_c, P_s, E_t, delta_t, voids, bhs_n }
}

function deriveSolarCodexParams(solarData: SolarData): VortexTdfParams {
  const activityOrdinal = ACTIVITY_ORDINAL[solarData.activityLevel] ?? 1

  // T_c: Solar activity scales the perceived time constant
  const T_c = 0.5 + (activityOrdinal / 6)

  // P_s: X-ray flux as power spectral (clamped to 0.1–100 range)
  const P_s = Math.max(Math.min(solarData.xray.long * 1e7, 100), 0.1)

  // E_t: Proton spectral index as entropy (higher index = more energetic = higher entropy)
  const E_t = 0.1 + ((solarData.particles.spectralIndex || 0) / 10)

  // delta_t: Activity-modulated time step
  const delta_t = 1 + activityOrdinal * 2

  // voids: Activity-dependent black hole voids (quiet=3, moderate=4, active=5, storm=6)
  const voids = 3 + activityOrdinal

  // bhs_n: Sequence index from KP index for solar variability
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
  phaseType: 'push' | 'pull'
  isotope: string
  waveProximity: number
  waveVortexAlignment: number
  waveSynchronization: number
  hybridVortexAlignment: number
  hybrid4DComposite: number
  hybridVerdict: 'PASS' | 'NEEDS_REVISION' | 'REJECT'
  fullWave4DComposite: number
  calibratedWave4DComposite: number
  fullBoxProximity: number
  fullBoxVortexAlignment: number
  fullBoxSynchronization: number
  fullBoxNeuralProximity: number
  fullBoxNeuralVortex: number
  fullBox4DComposite: number
  fullBoxVerdict: 'PASS' | 'NEEDS_REVISION' | 'REJECT'
  fullBoxThresholds: { strong: number; good: number; weak: number }
  fullBoxGematriaResonance: number
  fullBox7DComposite: number
  fullBox7DVerdict: 'PASS' | 'NEEDS_REVISION' | 'REJECT'
  signalPurity: number
  neuralSunEmbedding?: number[]
  neuralProposalEmbedding?: number[]
  neuralWaveProximity: number
  neuralWaveVortexAlignment: number
  gematriaEnglishOrdinal: number
  gematriaFullReduction: number
  gematriaReverseOrdinal: number
  gematriaDigitalRootEO: number
  gematriaDigitalRootFR: number
  gematriaResonance: number
  gematriaTDF: number
  trinitariumMoralScore?: number
  trinitariumVirtueAlignment?: number
  trinitariumHarmPotential?: number
  trinitariumIntentAlignment?: number
  trinitariumSacredTextAffinity?: number
  trinitariumDetectedVirtues?: string[]
  trinitariumDetectedConcerns?: string[]
  trinitariumGematriaFusion?: number
  moralNumerologicalTension?: string
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
   *
   * Optionally accepts spectralQuality from NeuralFusion as a 5th dimension (weight 0.10).
   * When provided, the 4D weights rebalance to 0.18/0.18/0.27/0.27 to make room.
   * When absent, the original 4D formula (0.20/0.20/0.30/0.30) is used.
   */
  async getProposalSolarIsotopicResonance(proposal: string, spectralQuality?: number, sunNeuralEmbedding?: number[]): Promise<StructuralResonanceResult> {
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

      // Kuramoto coupled-oscillator model replaces cascade-based signalTiming,
      // static phaseCoherence difference, and content-hash cascade indices.
      const kuramoto = runKuramotoCoupling(proposalTdf, solarRefTdf, solarData.activityLevel)

      // Phase 2: Derive proposal neural embedding from proposal text (MiniLM semantic)
      // Falls back to FNV hashing when transformer unavailable
      const proposalEmbedding = await sentenceToEmbedding16(proposal)

      // Phase 2 wave propagation (A/B alongside current TDF formulas)
      // Neural embedding from NeuralFusion becomes 16 virtual spectrum bands inside the box
      const waveResonance = computeWaveResonance(kuramoto, proposalTdf, solarRefTdf, sunNeuralEmbedding, proposalEmbedding)

      // Gematria vortex — numerological resonance dimension
      const gematriaVortex = computeGematriaVortex(proposal || 'empty-proposal', DEFAULT_SOLAR_GEMATRIA_TEXT)

      // Trinitarium Moral Overlay — separate axis, not mixed into 7D
      const trinitarium = computeTrinitariumOverlay({
        proposalText: proposal || '',
        gematriaResonance: gematriaVortex.gematriaResonance,
      })

      const { trinitariumGematriaFusion, moralNumerologicalTension } = computeTrinitariumGematriaFusion(
        trinitarium.trinitariumMoralScore,
        gematriaVortex.gematriaResonance,
      )

      // Cross-correlate for full structural comparison (strength + lag + vortexVolume)
      const correlation = proposalSignal.crossCorrelate(sunSignal)

      // === TRIANGLE LEG 1: Proximity (delta distance between vertices) ===
      const deltaDiff = Math.abs((proposalTdf % 1e6) - (solarRefTdf % 1e6))
      const proximity = Math.exp(-Math.pow(deltaDiff / 1e6, 2))

      // === TRIANGLE LEG 2: Phase Alignment (Kuramoto oscillator coupling) ===
      // Replaces static phaseCoherence difference with N=3 coupled oscillator dynamics.
      // Order parameter R measures phase synchronization across proposal, sun, and system.
      const phaseAlignment = kuramoto.phaseAlignment

      // === TETRAHEDRON FACE 4: Synchronization (temporal alignment) ===
      // Uses the same deltaDiff as proximity, but with a linear decay instead of Gaussian.
      // This makes sync broader: high sync even when proximity is moderate,
      // but penalizes when TDFs are very far apart.
      // Proximity = tight Gaussian — discriminates among close TDFs
      // Sync = linear — captures "are we in the right ballpark?"
      // Together they're complementary (not redundant) response curves on the same input.
      const syncRaw = Math.max(0, 1 - deltaDiff / 1e6)
      const synchronization = Math.max(0.15, syncRaw)

      // Replace dead vortexAlignment (always ~1.0) with calibrated wave vortex
      const calibratedVortex = computeCalibratedWaveVortex(waveResonance.waveVortexAlignment)

      const hybrid = computeHybridResonance(
        proximity,
        phaseAlignment,
        synchronization,
        waveResonance.waveVortexAlignment,
        waveResonance.waveSynchronization,
        solarData.activityLevel,
      )

      // Full Box: 7D model — 4 physical dims + 2 neural dims + 1 numerological dim
      const fullBox = computeFullBoxResonance(
        waveResonance.waveProximity,
        phaseAlignment,
        waveResonance.waveVortexAlignment,
        waveResonance.waveSynchronization,
        solarData.activityLevel,
        waveResonance.neuralWaveProximity,
        waveResonance.neuralWaveVortexAlignment,
        gematriaVortex.gematriaResonance,
      )

      // === COMPOSITE: Structural Resonance (inside the vortex) ===
      // 4D formula (no neural context): proximity×0.20 + phase×0.20 + volume×0.30 + sync×0.30
      // 5D formula (with spectralQuality): proximity×0.18 + phase×0.18 + volume×0.27 + sync×0.27 + spectralQuality×0.10
      // Sync weight at 0.30 — temporal alignment now equals volume in importance.
      // vortexAlignment was dead (always 1.0) — replaced with live calibratedVortex.
      const neuralContextUsed = spectralQuality !== undefined
      const structuralResonance = neuralContextUsed
        ? Math.max(0.15, Math.min(0.98,
            proximity * 0.18 + phaseAlignment * 0.18 + calibratedVortex * 0.27 + synchronization * 0.27 + spectralQuality! * 0.10
          ))
        : Math.max(0.15, Math.min(0.98,
            proximity * 0.20 + phaseAlignment * 0.20 + calibratedVortex * 0.30 + synchronization * 0.30
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

      // === Signal Timing (Kuramoto oscillator phase ordering) ===
      // Replaces cascade-index comparison with oscillator phase lead/lag detection.
      // synced = phases within 0.2 rad, leading = proposal ahead of sun, trailing = behind.
      const signalTiming = kuramoto.signalTiming

      return {
        structuralResonance,
        proximity,
        phaseAlignment,
        vortexAlignment: calibratedVortex,
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
        phaseType: kuramoto.phaseType,
        isotope: kuramoto.isotope,
        waveProximity: waveResonance.waveProximity,
        waveVortexAlignment: waveResonance.waveVortexAlignment,
        waveSynchronization: waveResonance.waveSynchronization,
        hybridVortexAlignment: hybrid.hybridVortexAlignment,
        hybrid4DComposite: hybrid.hybrid4DComposite,
        hybridVerdict: hybrid.hybridVerdict,
        fullWave4DComposite: hybrid.fullWave4DComposite,
        calibratedWave4DComposite: hybrid.calibratedWave4DComposite,
        fullBoxProximity: fullBox.fullBoxProximity,
        fullBoxVortexAlignment: fullBox.fullBoxVortexAlignment,
        fullBoxSynchronization: fullBox.fullBoxSynchronization,
        fullBoxNeuralProximity: fullBox.fullBoxNeuralProximity,
        fullBoxNeuralVortex: fullBox.fullBoxNeuralVortex,
        fullBox4DComposite: fullBox.fullBox4DComposite,
        fullBoxVerdict: fullBox.fullBoxVerdict,
        fullBoxThresholds: fullBox.fullBoxThresholds,
        fullBoxGematriaResonance: fullBox.fullBoxGematriaResonance,
        fullBox7DComposite: fullBox.fullBox7DComposite,
        fullBox7DVerdict: fullBox.fullBox7DVerdict,
        signalPurity: fullBox.signalPurity,
        neuralSunEmbedding: sunNeuralEmbedding,
        neuralProposalEmbedding: proposalEmbedding,
        neuralWaveProximity: waveResonance.neuralWaveProximity,
        neuralWaveVortexAlignment: waveResonance.neuralWaveVortexAlignment,
        gematriaEnglishOrdinal: gematriaVortex.proposal.englishOrdinal,
        gematriaFullReduction: gematriaVortex.proposal.fullReduction,
        gematriaReverseOrdinal: gematriaVortex.proposal.reverseOrdinal,
        gematriaDigitalRootEO: gematriaVortex.proposal.digitalRootEO,
        gematriaDigitalRootFR: gematriaVortex.proposal.digitalRootFR,
        gematriaResonance: gematriaVortex.gematriaResonance,
        gematriaTDF: gematriaVortex.gematriaTDF,
        trinitariumMoralScore: trinitarium.trinitariumMoralScore,
        trinitariumVirtueAlignment: trinitarium.virtueAlignment,
        trinitariumHarmPotential: trinitarium.harmPotential,
        trinitariumIntentAlignment: trinitarium.intentAlignment,
        trinitariumSacredTextAffinity: trinitarium.sacredTextAffinity,
        trinitariumDetectedVirtues: trinitarium.details.detectedVirtues,
        trinitariumDetectedConcerns: trinitarium.details.detectedConcerns,
        trinitariumGematriaFusion,
        moralNumerologicalTension,
      }
    } catch (error) {
      console.error('[SolarHammer] resonance computation failed, neutral fallback:', error)
      const fallbackTdf = 5.781e12 + 424242

      return {
        structuralResonance: 0.80,
        proximity: 0.80,
        phaseAlignment: 0.80,
        vortexAlignment: 0.80,
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
        phaseType: 'pull',
        isotope: 'C-12',
        waveProximity: 0.80,
        waveVortexAlignment: 0.80,
        waveSynchronization: 0.80,
        hybridVortexAlignment: 0.80,
        hybrid4DComposite: 0.80,
        hybridVerdict: 'PASS' as const,
        fullWave4DComposite: 0.80,
        calibratedWave4DComposite: 0.80,
        fullBoxProximity: 0.80,
        fullBoxVortexAlignment: 0.80,
        fullBoxSynchronization: 0.80,
        fullBoxNeuralProximity: 0.80,
        fullBoxNeuralVortex: 0.80,
        fullBox4DComposite: 0.80,
        fullBoxVerdict: 'PASS' as const,
        fullBoxThresholds: { strong: 0.85, good: 0.75, weak: 0.52 },
        fullBoxGematriaResonance: 0.80,
        fullBox7DComposite: 0.80,
        fullBox7DVerdict: 'PASS' as const,
        signalPurity: 0.85,
        neuralSunEmbedding: undefined,
        neuralProposalEmbedding: undefined,
        neuralWaveProximity: 0.80,
        neuralWaveVortexAlignment: 0.80,
        gematriaEnglishOrdinal: 0,
        gematriaFullReduction: 0,
        gematriaReverseOrdinal: 0,
        gematriaDigitalRootEO: 0,
        gematriaDigitalRootFR: 0,
        gematriaResonance: 0.80,
        gematriaTDF: 0,
        trinitariumMoralScore: 0.70,
        trinitariumVirtueAlignment: 0.70,
        trinitariumHarmPotential: 0.80,
        trinitariumIntentAlignment: 0.70,
        trinitariumSacredTextAffinity: 0.50,
        trinitariumDetectedVirtues: [],
        trinitariumDetectedConcerns: [],
        trinitariumGematriaFusion: 0.56,
        moralNumerologicalTension: 'Mild',
      }
    }
  }
}

export const solarGovernance = new SolarGovernanceIntegration()
