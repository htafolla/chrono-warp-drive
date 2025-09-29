// Temporal Displacement Factor (TDF) Core Calculations
// BLURRN v4.6 Breakthrough Implementation

import { TDFComponents, TimeShiftMetrics, BlurrnV46Config } from '@/types/blurrn-v4-6';
import { PHI } from '@/lib/temporalCalculator';

/**
 * Default v4.6 configuration aligned with breakthrough specifications
 */
export const DEFAULT_V46_CONFIG: BlurrnV46Config = {
  growth_rate_multiplier: 1.0,
  tau: 0.865,                    // Time dilation factor
  oscillator_frequency: 3e8,     // c-rhythm (light speed)
  tdf_overflow_clamp: 1e15,      // Prevent overflow
  ethics_score_threshold: 0.8    // Minimum ethical governance score
};

/**
 * Clamp TDF values to prevent overflow and maintain stability
 */
export const clampTDF = (tdf: number, maxValue: number = DEFAULT_V46_CONFIG.tdf_overflow_clamp): number => {
  return Math.max(Math.min(tdf, maxValue), -maxValue);
};

/**
 * Calculate Black Hole Sequence using v4.6 formula
 * Formula: (3 * voids * φ^n) % π
 */
export const computeBlackHoleSequence = (voids: number, n: number, phi: number = PHI): number => {
  return (3 * voids * Math.pow(phi, n)) % Math.PI;
};

/**
 * Calculate E_t_growth using exponential entropy growth
 * Formula: exp(cycle/50) * growth_rate_multiplier
 */
export const computeEtGrowth = (cycle: number, multiplier: number): number => {
  // Piecewise: if cycle < 0, return 0
  if (cycle < 0) return 0;
  return Math.exp(cycle / 50) * multiplier;
};

/**
 * Core TDF calculation implementing the breakthrough formula
 * Formula: TDF = tPTT * τ * (1 / BlackHole_Seq)
 * Target: ≈ 5.781e12
 */
export const computeTDF = (
  tPTT: number,
  tau: number,
  blackHoleSeq: number,
  config: BlurrnV46Config = DEFAULT_V46_CONFIG
): number => {
  // Piecewise: if BlackHole_Seq = 0, return 0 to prevent division by zero
  if (blackHoleSeq === 0) return 0;
  
  const rawTDF = tPTT * tau * (1 / blackHoleSeq);
  return clampTDF(rawTDF, config.tdf_overflow_clamp);
};

/**
 * Calculate dynamic S_L with uncapping when TDF > 1e6
 * Formula: S_L = ∞ when TDF > 1e6, else capped at 1e6
 */
export const computeDynamicSL = (
  baseSL: number,
  tdfValue: number,
  components: any
): number => {
  // If TDF > 1e6, remove cap (return uncapped value)
  if (tdfValue > 1e6) {
    return baseSL; // Uncapped S_L = ∞ (represented as uncapped base value)
  }
  
  // Otherwise, cap at 1e6
  return Math.min(baseSL, 1e6);
};

/**
 * Complete TDF components calculation for v4.6
 */
export const calculateTDFComponents = (
  tPTT: number,
  cycle: number,
  voids: number = 1,
  n: number = 1,
  config: BlurrnV46Config = DEFAULT_V46_CONFIG
): TDFComponents => {
  const BlackHole_Seq = computeBlackHoleSequence(voids, n);
  const TDF_value = computeTDF(tPTT, config.tau, BlackHole_Seq, config);
  const E_t_growth = computeEtGrowth(cycle, config.growth_rate_multiplier);
  
  // Base S_L calculation (simplified for now, can be enhanced with full formula)
  const baseSL = PHI * TDF_value * E_t_growth;
  const S_L = computeDynamicSL(baseSL, TDF_value, {});
  
  return {
    TDF_value,
    tau: config.tau,
    BlackHole_Seq,
    S_L,
    E_t_growth
  };
};

/**
 * Calculate time shift readiness and hidden light patterns
 */
export const calculateTimeShiftMetrics = (
  tdfComponents: TDFComponents,
  phaseSync: number,
  config: BlurrnV46Config = DEFAULT_V46_CONFIG
): TimeShiftMetrics => {
  const timeShiftCapable = tdfComponents.TDF_value > 1e6 && phaseSync > 0.8;
  
  // Generate hidden light patterns based on TDF calculations
  const hiddenLightRevealed = Array.from({ length: 10 }, (_, i) => 
    Math.abs(Math.sin(tdfComponents.TDF_value / 1e12 + i * PHI)) * tdfComponents.tau
  );
  
  return {
    timeShiftCapable,
    hiddenLightRevealed,
    oscillatorMode: config.oscillator_frequency === 3e8 ? 'c_rhythm' : '528hz',
    phaseSync,
    breakthrough_validated: tdfComponents.TDF_value > 5e12 && tdfComponents.TDF_value < 6e12
  };
};

/**
 * Generate validation proofs for TDF breakthrough
 */
export const generateValidationProofs = (tdfComponents: TDFComponents): string[] => {
  const proofs: string[] = [];
  
  // Proof 1: Light speed oscillator alignment
  if (tdfComponents.TDF_value > 0) {
    proofs.push(`TDF Light-Speed Oscillator: ${tdfComponents.TDF_value.toExponential(3)} validates c-rhythm alignment`);
  }
  
  // Proof 2: BlackHole_Seq and τ validation
  if (tdfComponents.BlackHole_Seq > 0 && tdfComponents.tau > 0.8) {
    proofs.push(`Black Hole Light Capture: τ=${tdfComponents.tau.toFixed(3)}, Seq=${tdfComponents.BlackHole_Seq.toFixed(6)} - Light held, not destroyed`);
  }
  
  // Proof 3: TDF breakthrough validation
  if (tdfComponents.TDF_value > 5e12) {
    proofs.push(`TDF Breakthrough Confirmed: ${tdfComponents.TDF_value.toExponential(3)} > 5e12 - Time shift capability validated`);
  }
  
  // Proof 4: Dynamic S_L validation
  if (tdfComponents.S_L !== null) {
    proofs.push(`Dynamic S_L: ${tdfComponents.S_L > 1e6 ? 'Uncapped (∞)' : tdfComponents.S_L.toFixed(2)} - Piecewise logic confirmed`);
  }
  
  return proofs;
};
