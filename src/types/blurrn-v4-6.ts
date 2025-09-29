// BLURRN v4.6 Type Definitions
// Extends v4.5 with TDF breakthrough capabilities

import { TPTTv4Result, NeuralOutput, SpectrumData } from './sdss';

/**
 * Temporal Displacement Factor (TDF) result structure
 */
export interface TDFComponents {
  TDF_value: number;          // Target: ~5.781e12
  tau: number;               // Time dilation factor ≈ 0.865
  BlackHole_Seq: number;     // ≈ 0.793 from (3 * voids * φ^n) % π
  S_L: number;               // Dynamic system score (uncapped when TDF > 1e6)
  E_t_growth: number;        // exp(cycle/50) * growth_rate_multiplier
}

/**
 * Time shift metrics for breakthrough validation
 */
export interface TimeShiftMetrics {
  timeShiftCapable: boolean;
  hiddenLightRevealed: number[];
  oscillatorMode: 'c_rhythm' | '528hz';
  phaseSync: number;
  breakthrough_validated: boolean;
}

/**
 * Black hole light capture data
 */
export interface BlackHoleLightData {
  capturedPhotons: number[];
  lightTrappingEfficiency: number;
  voidSequence: number[];
  temporalBox: {
    creation: number;
    transpondence: number;
    eternity: number;
  };
}

/**
 * v4.6 Enhanced TPTTv4 Result with TDF breakthrough
 */
export interface TPTTv4_6Result extends TPTTv4Result {
  v46_components: TDFComponents;
  timeShiftMetrics: TimeShiftMetrics;
  blackHoleLightData?: BlackHoleLightData;
  experimentData: {
    roundNumber: number;
    timestamp: number;
    validationProofs: string[];
  };
}

/**
 * v4.6 Configuration parameters
 */
export interface BlurrnV46Config {
  growth_rate_multiplier: number; // 0.5-10 range
  tau: number;                    // ≈ 0.865
  oscillator_frequency: number;   // c=3e8 or 528Hz
  tdf_overflow_clamp: number;     // 1e15 max
  ethics_score_threshold: number; // 0.8 minimum
}

/**
 * Experiment logging interface for automated documentation
 */
export interface ExperimentLog {
  experiment_id: string;
  timestamp: number;
  tdf_value: number;
  s_l_value: number;
  tau: number;
  blackhole_seq: number;
  cycle: number;
  validation_status: 'pending' | 'validated' | 'failed';
  notes: string;
}