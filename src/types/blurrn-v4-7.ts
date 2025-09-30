// BLURRN v4.7 Chrono Transport Cascade Type Definitions
// Dual Black Hole Time Transport with CTI Cascade Enumeration

import { TPTTv4_6Result, TDFComponents, TimeShiftMetrics } from './blurrn-v4-6';

/**
 * Dual Black Hole Sequence Result
 */
export interface DualBlackHoleSequence {
  seq1: number;           // First black hole sequence
  seq2: number;           // Second black hole sequence (offset)
  total: number;          // Combined sequence for TDF calculation
  syncEfficiency: number; // Synchronization efficiency (0-1)
}

/**
 * Chrono Transport Interview (CTI) Components
 */
export interface CTIComponents {
  CTI_value: number;          // XOR-based CTI result
  cascade_index: number;      // floor(π / voids) + n
  q_ent: number;             // Quantum entanglement metric
  delta_phase: number;        // Phase adjustment (0.25-0.3)
  n: number;                 // Cascade enumeration (25-34)
}

/**
 * Chrono Transport Result
 */
export interface ChronoTransportResult {
  status: 'Approved' | 'Pending' | 'Failed';
  score: number;              // Overall system score (0-1)
  q_ent: number;             // Quantum entanglement strength
  efficiency: number;         // Transport efficiency percentage
  cascadeIndex: number;       // Computed cascade index
  dualBlackHole: DualBlackHoleSequence;
}

/**
 * v4.7 Enhanced TPTTv4 Result with CTI Cascade
 */
export interface TPTTv4_7Result extends TPTTv4_6Result {
  v47_components: CTIComponents;
  chronoTransport: ChronoTransportResult;
  oscillator: {
    p_o: number;             // Oscillator value at 3e8 m/s
    frequency: number;        // Light-speed rhythm
    phase: number;           // Current phase
  };
}

/**
 * v4.7 Configuration extending v4.6
 */
export interface BlurrnV47Config {
  growth_rate_multiplier: number;
  tau: number;                    // 0.865
  oscillator_frequency: number;   // 3e8 (c-rhythm)
  tdf_overflow_clamp: number;
  ethics_score_threshold: number;
  voids: number;
  delta_phase: number;            // 0.25-0.3
  cascade_n_min: number;          // 25
  cascade_n_max: number;          // 34
  target_tptt: number;            // 5.3e12 for 100% efficiency
}

/**
 * Cascade Parameters for UI Controls
 */
export interface CascadeParameters {
  delta_phase: number;   // 0.25-0.3
  n: number;            // 25-34
  voids: number;        // Distance-compensated voids
  tptt: number;         // Target tPTT value
}
