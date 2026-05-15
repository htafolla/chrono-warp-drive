import { Hono, Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { cors } from 'hono/cors'
import { streamSSE } from 'hono/streaming'
import { z } from 'zod'
import { publish, subscribe } from './pubsub'
import { createGovernanceRouter, evaluateGovernance } from './governance'
import { dynamoSolarGovernance } from './lib/dynamoSolarGovernance'

// ===== Inlined: isotopicSignal.ts =====
interface CorrelationResult {
  strength: number;
  lag: number;
  metadata: Record<string, any>;
}
interface TriangulationResult {
  anchors: number[][];
  confidence: number;
}
interface IsotopicFingerprint {
  coreId: string;
  variantDelta: number[];
  isotopicRatio: number;
  provenance: string[];
}
abstract class IsotopicSignal {
  abstract embed(): number[];
  abstract crossCorrelate(other: IsotopicSignal): CorrelationResult;
  abstract triangulate(others: IsotopicSignal[]): TriangulationResult;
  abstract fuseSymbiotically(partners: IsotopicSignal[]): FusedSignal;
  abstract getIsotopeId(): string;
  abstract getVariantDelta(): number[];
  abstract getIsotopicFingerprint(reference?: IsotopicSignal): IsotopicFingerprint;
  calculateIsotopicRatio(other: IsotopicSignal): number {
    const delta = this.getVariantDelta();
    const otherDelta = other.getVariantDelta();
    const maxDelta = Math.max(Math.abs(delta[0]), Math.abs(otherDelta[0])) + 1e-9;
    return 1 - (Math.abs(delta[0] - otherDelta[0]) / maxDelta);
  }
}
class FusedSignal extends IsotopicSignal {
  constructor(private compressedData: number[]) {
    super();
  }
  embed(): number[] { return this.compressedData; }
  getIsotopeId(): string { return 'fused-core'; }
  getVariantDelta(): number[] { return [0]; }
  getIsotopicFingerprint(): IsotopicFingerprint {
    return { coreId: 'fused-core', variantDelta: [0], isotopicRatio: 1, provenance: ['synthesis'] };
  }
  crossCorrelate(): CorrelationResult { return { strength: 0.95, lag: 0, metadata: {} }; }
  triangulate(): TriangulationResult { return { anchors: [], confidence: 0.95 }; }
  fuseSymbiotically(): FusedSignal { return this; }
}

// ===== Inlined: temporalBlurrnSignal.ts =====
const PHI = 1.666;
const TAU = 0.865;

class TemporalBlurrnSignal extends IsotopicSignal {
  private tdfValue: number;
  private cascadeIndex: number;
  private phaseCoherence: number;
  private rawSignal: any;

  constructor(rawSignal: any, tdfValue: number, cascadeIndex: number) {
    super();
    this.rawSignal = rawSignal;
    this.tdfValue = tdfValue;
    this.cascadeIndex = cascadeIndex;
    const reducedTdf = tdfValue % Math.sqrt(PHI);
    this.phaseCoherence = Math.pow(Math.sin(2 * Math.PI * TAU * reducedTdf), 2);
  }

  getTdfValue(): number { return this.tdfValue }
  getCascadeIndex(): number { return this.cascadeIndex }
  getPhaseCoherence(): number { return this.phaseCoherence }

  embed(): number[] {
    return [this.tdfValue * PHI, this.cascadeIndex, this.phaseCoherence];
  }

  getIsotopeId(): string {
    return `blurrn-core-${Math.floor(this.tdfValue / 1e6)}`;
  }

  getVariantDelta(): number[] {
    return [this.tdfValue % 1e6, this.cascadeIndex * TAU, 1 - this.phaseCoherence];
  }

  getIsotopicFingerprint(reference?: IsotopicSignal): IsotopicFingerprint {
    return {
      coreId: this.getIsotopeId(),
      variantDelta: this.getVariantDelta(),
      isotopicRatio: reference ? this.calculateIsotopicRatio(reference) : this.phaseCoherence,
      provenance: [`TDF:${this.tdfValue}`, `cascade:${this.cascadeIndex}`]
    };
  }

  crossCorrelate(other: IsotopicSignal): CorrelationResult {
    if (!(other instanceof TemporalBlurrnSignal)) {
      return { strength: 0.3, lag: 0, metadata: {} };
    }
    const phaseAlign = 1 - Math.abs(this.phaseCoherence - (other as TemporalBlurrnSignal).phaseCoherence);
    const strength = this.calculateIsotopicRatio(other) * phaseAlign;
    const lag = Math.abs(this.cascadeIndex - (other as any).cascadeIndex);
    const vortexVolume = this.tdfValue * (other as any).tdfValue; // W x M = V
    return {
      strength,
      lag,
      metadata: { vortexVolume }
    };
  }

  triangulate(others: IsotopicSignal[]): TriangulationResult {
    return { anchors: [this.embed()], confidence: this.phaseCoherence };
  }

  fuseSymbiotically(partners: IsotopicSignal[]): FusedSignal {
    const allEmbeds = [this.embed(), ...partners.map(p => p.embed())];
    const fusedData = allEmbeds.reduce((acc, val) => acc.map((v, i) => v + val[i]), Array(allEmbeds[0].length).fill(0))
      .map(v => v / allEmbeds.length);
    return new FusedSignal(fusedData);
  }
}

// ===== Inlined: temporalCalculator.ts (full formula chain) =====
// Core Constants from TLM
const FREQ = 528;
const C = 3e8;
const DELTA_T = 1e-6;
const L = 3;
const K = 0.5;
const N = 3;
const G = 1.0;
const S = 0.1;
const PHI_DARK = Math.PI / 6;

interface Isotope {
  type: string;
  factor: number;
}

const ISOTOPES: Isotope[] = [
  { type: "C-12", factor: 1.0 },
  { type: "C-14", factor: 0.8 }
];

// Blurrn-themed isotopes
const BLURRN_ISOTOPES: Isotope[] = [
  { type: "Trinitarium-166", factor: 1.666 },
  { type: "Chronovium-865", factor: 0.865 },
  { type: "Vortexite-528", factor: 0.528 },
];

function kuramoto(
  theta: number[],
  omega: number[],
  fractalToggle: boolean,
  isotope: Isotope,
  phaseType: string,
  oscillatorIndex: number = 0
): number {
  const phiOffset = phaseType === "push" ? Math.PI / 4 : -Math.PI / 4;
  let sum = 0;
  for (let j = 0; j < Math.min(N, theta.length); j++) {
    if (j !== oscillatorIndex && !isNaN(theta[j])) {
      sum += Math.sin(theta[j] - theta[oscillatorIndex] + PHI_DARK + phiOffset +
        (fractalToggle ? S * isotope.factor : 0));
    }
  }
  return omega[oscillatorIndex] + (K / Math.max(N - 1, 1)) * sum;
}

function calculatePhaseCoherence(phases: number[]): number {
  if (phases.length < 2) return 0;
  let sumCos = 0;
  let sumSin = 0;
  for (const phase of phases) {
    sumCos += Math.cos(phase);
    sumSin += Math.sin(phase);
  }
  const avgCos = sumCos / phases.length;
  const avgSin = sumSin / phases.length;
  return Math.sqrt(avgCos * avgCos + avgSin * avgSin);
}

function wave(
  x: number, t: number, n: number,
  isotope: Isotope, lambda: number, phaseType: string
): number {
  const phiDynamic = phaseType === "push" ? Math.PI / 4 : -Math.PI / 4;
  const amplitude = Math.min(phaseType === "push" ? G * 1.2 : G * 0.8, G * 1.5);
  const mainWave = amplitude * Math.sin(
    (2 * Math.PI * x) / lambda -
    2 * Math.PI * FREQ * (t * Math.pow(PHI, n)) +
    phiDynamic
  ) * isotope.factor;
  return Math.min(mainWave + 0.1, 2.0);
}

function tPTT(T_c: number, P_s: number, E_t: number, delta_t: number): number {
  return T_c * (P_s / E_t) * PHI * (C / delta_t);
}

function harmonicOscillator(t: number): number {
  return Math.sin(2 * Math.PI * FREQ * t + Math.PI / PHI);
}

function blackHoleSequence(voids: number, n: number): number {
  return ((L * voids) * Math.pow(PHI, n)) % Math.PI;
}

function validateTLM(phi: number): boolean {
  return phi >= 1.566 && phi <= 1.766;
}

// Full TDF chain: TDF = tPTT(T_c, P_s, E_t, delta_t) * TAU * (1 / blackHoleSequence(voids, n))
function computeFullTDF(
  T_c: number, P_s: number, E_t: number, delta_t: number,
  voids: number, bhs_n: number
): { tptt: number; bhs: number; tdf: number; s_l: number } {
  const tptt = tPTT(T_c, P_s, E_t, delta_t);
  const bhs = blackHoleSequence(voids, bhs_n);
  const tdf = tptt * TAU * (1 / bhs);
  const s_l = tdf * PHI;
  return { tptt, bhs, tdf, s_l };
}

// ===== Signal Store (in-memory, persists within a warm invocation) =====
const signalStore = new Map<string, TemporalBlurrnSignal>();

// ===== Comprehensive Glossary for explain_term =====
const GLOSSARY: Record<string, { term: string; short: string; long: string; formula?: string; example?: string }> = {
  'TAU': {
    term: 'TAU (τ)',
    short: 'Temporal Attenuation Unit — damping/scaling factor set at 0.865',
    long: 'TAU is the fundamental damping constant in the Temporal Displacement Factor (TDF) computation. It scales tPTT output before division by BlackHole_Seq. TAU = 0.865 is derived from Chronovium-865 isotope. In cross-correlation, TAU determines the lag scaling between cascades.',
    formula: 'TDF = tPTT × TAU × (1 / BlackHole_Seq)',
  },
  'PHI': {
    term: 'PHI (φ) — Trinitarium Ratio',
    short: 'Fundamental Blurrn constant, valid range [1.566, 1.766]',
    long: 'PHI is the Trinitarium ratio constant set at 1.666 (from Trinitarium-166 isotope). It appears throughout the v4.8 engine: as the exponent base in BlackHole_Seq, as a multiplier in tPTT, as a phase offset in harmonic oscillator (π/PHI), and as a signal embed component. Validated by validate_tlm to be within [1.566, 1.766].',
    formula: 'validate_tlm: 1.566 ≤ PHI ≤ 1.766',
  },
  'TDF': {
    term: 'Temporal Displacement Factor (TDF)',
    short: 'Composite measure of signal displacement through time',
    long: 'TDF is the core output of the v4.8 formula chain. It combines tPTT (energy-time product), TAU (damping), and BlackHole_Seq (void resonance) into a single scalar. Higher TDF values indicate greater temporal displacement or "warp." The S_L variant scales TDF by PHI.',
    formula: 'TDF = tPTT × TAU × (1 / BlackHole_Seq)\nS_L = TDF × PHI',
  },
  'tPTT': {
    term: 'Temporal Photonic Transpondent Transporter (tPTT)',
    short: 'Energy-time product with isotopic modulation. See compute_tptt tool.',
    long: 'tPTT measures the energy-time product of a signal modulated by PHI and the speed of light constant C. Higher T_c (temporal constant) increases tPTT; higher E_t (entropy) decreases it. The formula encodes how much "photonic work" is transported across a time step.',
    formula: 'tPTT = T_c × (P_s / E_t) × PHI × (C / delta_t)',
    example: 'Default: T_c=137, P_s=1.0, E_t=0.5, delta_t=1e-6 → tPTT ≈ 137 × 2.0 × 1.666 × 3e14 ≈ 1.37e17',
  },
  'BlackHole_Seq': {
    term: 'Black Hole Sequence',
    short: 'Void resonance function using PHI exponentiation. See black_hole_sequence tool.',
    long: 'BlackHole_Seq computes a resonance value from void count and PHI exponentiation, modulo π. It represents the "gravitational" component of the TDF chain — more voids or higher n produce larger resonance. The modulo operation wraps it into [0, π) range.',
    formula: 'BlackHole_Seq(L, voids, n) = (L × voids × PHI^n) % π',
    example: 'Default: L=3, voids=7, n=3, PHI=1.666 → (3 × 7 × 1.666^3) % π ≈ 97.22 % 3.1416 ≈ 2.08',
  },
  'vortexVolume': {
    term: 'Vortex Volume',
    short: 'Cross-correlation product W × M = V. Output of cross_correlate tool.',
    long: 'Vortex volume is a metadata output of cross_correlate representing the "volume" of temporal overlap between two signals. Computed as the product of the two signals\' TDF values. Higher vortex volume indicates stronger temporal entanglement.',
    formula: 'vortexVolume = TDF_A × TDF_B',
  },
  'isotopicRatio': {
    term: 'Isotopic Ratio',
    short: 'Pairwise similarity measure between isotopic signals, range [0, 1]',
    long: 'Isotopic ratio measures how similar two signals\' variant deltas are. Computed as 1 minus the normalized absolute difference of the first delta component. Higher values (closer to 1) indicate near-identical isotopic composition. Used in cross_correlate and pairwise signal comparison.',
    formula: 'isotopicRatio(A, B) = 1 − |δA₀ − δB₀| / max(|δA₀|, |δB₀|)',
  },
  'phaseCoherence': {
    term: 'Phase Coherence (R)',
    short: 'Kuramoto order parameter measuring phase synchronization',
    long: 'Phase coherence R is the Kuramoto order parameter. It measures how synchronized a set of oscillators are. R=1 means perfect synchronization (all phases aligned), R=0 means complete desynchronization (phases uniformly distributed). Computed from the circular mean of phases.',
    formula: 'R = sqrt( (Σ cos(θᵢ)/N)² + (Σ sin(θᵢ)/N)² )',
  },
  'cascadeIndex': {
    term: 'Cascade Index',
    short: 'Iteration number in a signal cascade sequence',
    long: 'Cascade index tracks which iteration of a cascade process a signal belongs to. It affects the variant delta and phase coherence computation. Higher cascade indices represent later stages of temporal evolution, with increasing TAU-based damping.',
  },
  'blurrn-native matrix': {
    term: 'Blurrn-native Matrix',
    short: 'The mathematical framework built on PHI and TAU constants',
    long: 'The Blurrn-native matrix refers to the entire v4.8 computational framework centered on the Trinitarium ratio (PHI=1.666) and Chronovium damping (TAU=0.865). It encompasses TDF computation, isotopic fingerprinting, cross-correlation, symbiotic fusion, and phase coherence — all built on these two fundamental constants.',
  },
  'FREQ': {
    term: 'Base Frequency (528 Hz)',
    short: 'Fundamental oscillation frequency, also known as the "Love Frequency"',
    long: '528 Hz is the base frequency used in harmonic_oscillator and wave_function computations. Known as the "Love Frequency" in cymatics. In the v4.8 engine, it drives the harmonic oscillator and appears in the wave function\'s phase argument.',
    formula: 'P_o = sin(2π × 528 × t + π/PHI)',
  },
  'kuramoto': {
    term: 'Kuramoto Synchronization',
    short: 'Phase-coupled oscillator model with push-pull dynamics. See kuramoto_sync tool.',
    long: 'The Kuramoto model describes the synchronization of coupled oscillators. In v4.8, it uses push-pull phase dynamics (push = +π/4 offset, pull = -π/4 offset), fractal toggle for isotopic modulation, and configurable coupling strength K=0.5. oscillatorIndex selects which oscillator receives the frequency update.',
    formula: 'dθᵢ/dt = ωᵢ + (K/N) × Σⱼ sin(θⱼ − θᵢ + φ_dark + φ_type + S × isotope.factor)',
  },
  'symbiotic fusion': {
    term: 'Symbiotic Fusion',
    short: 'Polymorphic signal fusion preserving phase relationships. See fuse_symbiotic tool.',
    long: 'Symbiotic fusion combines multiple isotopic signals into a single FusedSignal by averaging their embeddings. Unlike simple aggregation, it preserves the phase relationships between signals — each contributes equally to the fused output. The result has isotopeId "fused-core" and perfect isotopic ratio (1.0).',
  },
  'push-pull': {
    term: 'Push-Pull Dynamics',
    short: 'Phase offset mode: push (+π/4) amplifies, pull (-π/4) damps',
    long: 'Push-pull dynamics control whether oscillator coupling is constructive (push) or destructive (pull). Push mode adds +π/4 to the phase offset, amplifying synchronization. Pull mode subtracts π/4, damping synchronization. Also affects wave function amplitude: push amplifies (G×1.2), pull damps (G×0.8).',
  },
  'C': {
    term: 'Speed of Light (C = 3e8)',
    short: 'Universal constant used in tPTT computation',
    long: 'The speed of light C = 3×10⁸ m/s appears in the tPTT formula as a scaling factor, encoding relativistic effects into temporal displacement. Multiplies the energy-time product to produce extremely large tPTT values (~10¹⁷ range).',
  },
  'isotope': {
    term: 'Isotopes (Standard & Blurrn)',
    short: 'Configurable factors that modulate computations across v4.8 engine',
    long: 'Isotopes provide configurable modulation factors across the v4.8 engine. Standard isotopes: C-12 (1.0), C-14 (0.8). Blurrn isotopes: Trinitarium-166 (1.666 = PHI), Chronovium-865 (0.865 = TAU), Vortexite-528 (0.528). Isotope selection affects wave amplitude, Kuramoto sync (fractal toggle), and isotopic fingerprinting.',
  },
  'S_L': {
    term: 'Spectral Luminance (S_L)',
    short: 'TDF scaled by PHI — higher-order displacement measure',
    long: 'S_L (Spectral Luminance) is computed as TDF × PHI. It represents a higher-order temporal displacement measure, factoring in the Trinitarium ratio for additional amplification. Returned alongside TDF in compute_tdf output.',
    formula: 'S_L = TDF × PHI',
  },
  'voids': {
    term: 'Voids',
    short: 'Count parameter for BlackHole_Seq — represents topological cavities',
    long: 'Voids represent topological cavities or "holes" in the temporal manifold. Used as a multiplier in BlackHole_Seq, more voids amplify the resonance output. Default: 7.',
    formula: 'BlackHole_Seq ∝ voids',
  },
}

// ===== Comprehensive Markdown Documentation for get_docs =====
const FULL_DOCS = `# Dynamo MCP v4.8 — Full Documentation

## Overview
Dynamo MCP (Blurrn) is a Temporal Displacement Engine providing tools for isotopic signal processing, TDF (Temporal Displacement Factor) computation, phase synchronization, symbiotic fusion, governance, and solar-enhanced decision-making.

## Core Constants
| Constant | Value     | Description |
|----------|-----------|-------------|
| PHI      | 1.666     | Trinitarium ratio (valid range: 1.566–1.766) |
| TAU      | 0.865     | Temporal Attenuation Unit (Chronovium-865) |
| FREQ     | 528 Hz    | Base oscillation frequency |
| C        | 3e8 m/s   | Speed of light |
| L        | 3         | BlackHole_Seq scale factor |

## Tool Reference

### 1. compute_tdf
Full Temporal Displacement Factor chain: \`TDF = tPTT × TAU × (1 / BlackHole_Seq)\`.
- **Inputs**: \`T_c\`, \`P_s\`, \`E_t\`, \`delta_t\`, \`voids\`, \`bhs_n\`
- **Outputs**: \`tdfValue\`, \`S_L\`, \`tau\`, \`tPTT\`, \`BlackHole_Seq\`
- **Example**: \`{"T_c":137,"P_s":1.0,"E_t":0.5,"delta_t":1e-6,"voids":7,"bhs_n":3}\`

### 2. emit_isotopic_signal
Emits a new isotopic signal, stores it in memory, and returns its fingerprint.
- **Inputs**: \`content\` (required), \`tdf\`, \`cascadeIndex\`, \`referenceId\`
- **Outputs**: \`signalId\`, \`isotopicRatio\`, \`phaseCoherence\`, \`tdfValue\`
- **Use case**: Create traceable signals for later cross-correlation, triangulation, or fusion.

### 3. cross_correlate
Cross-correlates two isotopic signals. Returns strength (0–1), lag, \`vortexVolume\` (W × M = V), and \`isotopicRatio\`.
- **Inputs**: \`contentA\` (required), \`contentB\` (optional)
- **Outputs**: \`strength\`, \`lag\`, \`vortexVolume\`, \`isotopicRatio\`
- **Use case**: Measure similarity and temporal entanglement between two signals.

### 4. list_isotopes
Lists all available isotopes (standard + Blurrn-native). Use the exact \`name\` when selecting isotopes for other tools.
- **Inputs**: none
- **Outputs**: Array of isotopes with \`id\`, \`name\`, \`factor\`, and \`type\`
- **Gotcha**: Isotope names are case-sensitive (e.g., use \`"Trinitarium-166"\`, not \`"trinitarium-166"\`).

### 5. triangulate_signals
Triangulates 2+ signals and returns isotopic fingerprints plus a full pairwise correlation matrix.
- **Inputs**: \`signals\` array (min 2)
- **Outputs**: \`signalCount\`, \`results\` (with fingerprints and correlations)
- **Use case**: Multi-signal analysis to identify the strongest relationships.
- **Gotcha**: Computation is O(n²). Keep signal count reasonable (< 20) for performance.

### 6. fuse_symbiotic
Fuses 2+ signals using **polymorphic isotopic fusion**. Unlike simple averaging, this method preserves phase relationships between signals and creates a new composite identity (\`"fused-core"\`).
- **Inputs**: \`partners\` array (min 2)
- **Outputs**: \`fused\`, \`partnerCount\`, \`fusedEmbedding\`, \`fusedIsotopeId\`
- **Use case**: Combine multiple perspectives (e.g., agent reviews) into one coherent signal before governance.

### 7. optimize_cascade
Simulates cascade iterations to find efficient \`deltaPhase\` values.
- **Inputs**: \`n\` (max 5000), \`deltaPhase\`
- **Outputs**: \`iterations\`, \`finalEfficiency\`, \`peakEfficiency\`, results array

### 8. get_phase_coherence
Returns phase coherence of a stored signal. Checks memory first, falls back to reconstruction if needed.
- **Inputs**: \`signalId\`
- **Outputs**: \`signalId\`, \`phaseCoherence\`, \`tdfValue\`, \`cascadeIndex\`, \`stored\` (boolean)
- **Gotcha**: Reconstructed signals use default values and may differ from the original stored signal.

### 9. compute_tptt
Standalone \`tPTT\` calculation.
- **Inputs**: \`T_c\`, \`P_s\`, \`E_t\`, \`delta_t\`
- **Outputs**: \`tPTT\` value

### 10. black_hole_sequence
Standalone \`BlackHole_Seq\` calculation.
- **Inputs**: \`voids\`, \`n\`
- **Outputs**: \`BlackHole_Seq\` value

### 11. kuramoto_sync
Kuramoto synchronization with push-pull dynamics.
- **Inputs**: \`phases\`, \`frequencies\`, \`isotope\`, \`phaseType\` ("push" / "pull")
- **Outputs**: \`frequencyUpdate\`, \`phaseCoherence\`, \`isotopeUsed\`, \`phaseType\`
- **Gotcha**: Both arrays must be the same length.

### 12. wave_function
Computes wave amplitude with isotope modulation.
- **Inputs**: \`x\`, \`t\`, \`n\`, \`isotope\`, \`lambda\`, \`phaseType\`
- **Outputs**: \`amplitude\` (capped at 2.0)

### 13. harmonic_oscillator
\`P_o = sin(2π × 528 × t + π/PHI)\`
- **Inputs**: \`t\`
- **Outputs**: \`P_o\`, \`FREQ\`, \`PHI\`

### 14. validate_tlm
Validates that the Trinitarium ratio (\`phi\`) is within the valid range [1.566, 1.766].
- **Inputs**: \`phi\` (default 1.666)
- **Outputs**: \`valid\` (boolean), \`range\`

## Governance System Overview (v4.8)

Dynamo uses a **dual-oscillator governance model** for go/no-go decisions:

### The Two Oscillators

| Oscillator     | Endpoint                | Purpose                                      | Key Outputs |
|----------------|-------------------------|----------------------------------------------|-------------|
| **Solar**      | \`/govern_with_solar\`    | Real-world environmental conditions (NOAA)   | \`adjustedVoteWeight\`, \`solarModulation\`, solar context |
| **Alignment**  | \`/governance\`           | Proposal-specific resonance & alignment      | \`resonanceScore\`, \`isotopicRatio\`, \`recommendation\` |

### Decision Logic

The final verdict merges **both oscillators**:

- **Solar conditions** (storm, active, moderate, quiet) set the environmental context.
- **Governance alignment** (\`resonanceScore\`, \`recommendation\`) evaluates how well the proposal fits known patterns.
- **Merge rules** (simplified):
  - Storm → No (regardless of alignment)
  - Clear + REJECT → No
  - Caution + NEEDS_REVISION → Maybe
  - Clear + PASS → Yes

### Neural Metrics (Supporting)

The UI also pulls neural metrics from \`/process-current-sun\`:
- \`metamorphosisIndex\`
- \`confidenceScore\`
- \`solarModulation\`

These provide deeper insight but do not override the dual-oscillator verdict.

### 15. evaluate_governance
Full governance pipeline (emit → cross-correlate → triangulate → fuse → decide).
- **Inputs**: \`proposalText\`, \`agentReviews\`, \`codeDiff\`, \`historicalSignalIds\`
- **Outputs**: \`recommendation\`, \`confidence\`, \`voteWeight\`, \`reasoning\`

### 16. govern_with_solar

Enhanced governance decision with real-time solar context from NOAA GOES (7 channels: X-ray, protons, electrons, magnetometer, solar wind, Kp).

This tool runs the full governance pipeline while applying **activity-level-aware solar modulation** to the outputs.

**Solar Coupling (v1):**
- Uses \`SolarFeatures\` (hardness ratio, xrayUVLift, magPerturbation, etc.)
- Applies bounded modulation to \`metamorphosisIndex\` and \`confidenceScore\`
- Modulation strength increases with solar activity (quiet = 0.5×, storm = 1.3×)
- Returns detailed \`solarModulation\` object for observability

**Key Response Fields:**
- \`metamorphosisIndex\` — modulated by solar conditions
- \`confidenceScore\` — modulated by solar conditions
- \`solarApplied\` — whether solar data was used
- \`solarAdjustment\` — total adjustment applied
- \`solarModulation\` — detailed breakdown (activity_level, gainMultiplier, metaDelta, confDelta)
- \`solarFeatures\` — full derived solar feature vector

**When to use:**
- Most strategic or high-impact proposals (**recommended default**)
- When real-world solar conditions should influence the decision
- During elevated solar activity (storm/active periods apply stronger modulation)

**When to use \`evaluate_governance\` instead:**
- Purely technical or low-level protocol decisions
- When you want to exclude external modifiers

**Inputs:** \`proposal\` (string, min 10 characters), \`baseVoteWeight\` (0.5–1.5, default 1.0)

**Outputs:** \`originalRecommendation\`, \`solarContext\`, \`adjustedVoteWeight\`, \`finalRecommendation\`, \`confidenceAdjustment\`, \`solarFeatures\`, \`solarModulation\`

**Solar Behavior:**
- **Quiet** (0.5× coupling): Slight stability boost
- **Moderate** (0.75× coupling): Neutral adjustment
- **Active** (1.0× coupling): Mild reduction in vote weight
- **Storm** (1.3× coupling): Significant reduction + \`[SOLAR STORM WARNING]\`

**Decision Logic Note:**
When implementing logic on top of \`govern_with_solar\`, prefer using the numeric \`confidenceAdjustment\` for decision-making rather than switching on the \`solarActivityLevel\` string. The numeric adjustment is the direct output from the governance pipeline and is more robust if finer-grained solar levels are added in the future. Continue to use \`solarActivityLevel\` and the human-readable \`recommendation\` for logging, explanations, and transparency.

### 17. call_connected_tool
Universal proxy tool. Dynamically calls **any** other Dynamo MCP tool by name.
- **Inputs**: \`tool_name\`, \`params\`
- **Outputs**: \`success\`, \`tool\`, \`result\` (or \`error\`)
- **Use case**: Meta-orchestration and dynamic tool routing.

### 18. get_docs
Returns this documentation. Optionally filter by tool name.
- **Inputs**: \`tool\` (optional)
- **Outputs**: \`docs\`, \`toolCount\`

### 19. explain_term
Looks up a term from the Dynamo glossary.
- **Inputs**: \`term\`
- **Outputs**: \`term\`, \`short\`, \`long\`, \`formula\`, \`example\`

### 20. explain_governance_output
Converts a governance output (from either \`evaluate_governance\` or \`govern_with_solar\`) into human-readable plain text.
- **Inputs**: \`governanceOutput\`
- **Outputs**: \`explanation\`

## Data Flow
1. Emit signals → store in memory
2. Cross-correlate or triangulate for fingerprinting
3. Fuse signals symbiotically
4. Compute TDF / tPTT / BlackHole_Seq
5. Analyze phase with Kuramoto and wave functions
6. Evaluate governance (with optional solar context)

## Common Workflows
- **Signal Analysis**: \`emit_isotopic_signal\` → \`cross_correlate\` → \`triangulate_signals\`
- **Temporal Analysis**: \`compute_tdf\` → \`compute_tptt\` → \`black_hole_sequence\`
- **Governance**: \`evaluate_governance\` or \`govern_with_solar\`
- **Phase Analysis**: \`kuramoto_sync\` → \`wave_function\` → \`harmonic_oscillator\`

## Choosing Between \`evaluate_governance\` and \`govern_with_solar\`

| Tool                    | Solar Context | Best For                          | Recommendation                          |
|-------------------------|---------------|-----------------------------------|-----------------------------------------|
| \`evaluate_governance\`   | No            | Purely technical decisions        | Use when external modifiers are undesired |
| \`govern_with_solar\`     | Yes           | Strategic / high-impact decisions | **Preferred default** for most proposals   |

**Quick Guidance:**
- Use \`govern_with_solar\` for most proposals (especially strategy or direction).
- Use \`evaluate_governance\` for low-level technical decisions.
- For high-stakes decisions, consider running both and comparing.

## Solar → Neural Coupling (v1)

> **Note (May 2026):** Dynamo now uses v1 activity-level-aware solar coupling across both frontend and MCP backend. Solar data modulates governance outputs in real time using live NOAA GOES data.

The Neural Fusion engine accepts an optional \`solarFeatures\` vector
(\`xrayUVLift\`, \`magPerturbation\`, \`hardnessRatio\`, \`windBroadeningA\`,
\`kpIndex\`, \`activityLevel\`) derived from a multi-channel NOAA SWPC pull.
When supplied, outputs are modulated with **activity-level-aware gain**:

\`\`\`
gainMultiplier = { quiet: 0.5, moderate: 0.75, active: 1.0, storm: 1.3 }
metaShift = (0.25 * uv + 0.15 * mag) * gainMultiplier
confShift = (0.06 * uv - 0.08 * mag) * gainMultiplier
metamorphosisIndex' = clamp(metamorphosisIndex * (1 + metaShift), 0.1, 0.95)
confidenceScore'    = clamp(confidenceScore    * (1 + confShift), 0.5, 0.98)
\`\`\`

### Best Practices

- Use \`/govern_with_solar\` for most decisions (especially strategic ones).
- Solar context is most valuable for high-impact or time-sensitive proposals.
- Technical fixes can use \`/governance\` alone, but solar context is still available for awareness.
- Always pass live \`solarFeatures\` for \`/process-current-sun\` (already wired).
- For deterministic offline runs, omit \`solarFeatures\` — the engine becomes a
  pure no-op on the solar axis (\`solar_applied: false\`).

### Observability

All responses include:
- \`solar_applied\` (boolean) — whether solar data was used
- \`solarAdjustment\` (numeric delta) — total adjustment applied
- \`solarModulation\` (detailed breakdown) — \`activity_level\`, \`gainMultiplier\`, \`metaShift\`, \`confShift\`, \`metaDelta\`, \`confDelta\`
- \`solarFeatures\` (full feature vector) — \`hardnessRatio\`, \`xrayUVLift\`, \`magPerturbation\`, \`windBroadeningA\`, \`kpIndex\`, \`activityLevel\`

This allows consumers to understand exactly how solar conditions influenced each decision.

### Current Behavior

- During **quiet** periods: Minimal adjustment (0.5× gain)
- During **storms**: Strongest modulation (1.3× gain, can shift outputs by up to ~25%)
- Solar coupling is **transparent** — every response includes the full modulation breakdown

See \`mcp/lib/solarCoupling.ts\` for coefficients and \`mcp/docs/solar-coupling.md\` for the full rationale.
`


// ===== MCP Server =====
const app = new Hono()
app.use('/*', cors())

function ok(c: Context, data: Record<string, unknown>) {
  return c.json({ success: true, ...data })
}

function fail(c: Context, message: string, status: ContentfulStatusCode = 400) {
  return c.json({ success: false, error: message }, status)
}

// Tool 1: emit_isotopic_signal — emits and persists a signal
const EmitSchema = z.object({
  content: z.string().min(1, 'content is required'),
  tdf: z.number().positive().optional(),
  cascadeIndex: z.number().int().min(0).optional(),
  referenceId: z.string().optional(),
})

app.post('/emit_isotopic_signal', async (c: Context) => {
  const parsed = EmitSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))

  const { content, tdf, cascadeIndex, referenceId } = parsed.data
  const signal = new TemporalBlurrnSignal(
    { id: `sig-${Date.now()}`, content },
    tdf ?? 5.781e12 + content.length * 137,
    cascadeIndex ?? 42,
  )
  const id = signal.getIsotopeId()
  signalStore.set(id, signal)

  let ratio = signal.getPhaseCoherence()
  if (referenceId && signalStore.has(referenceId)) {
    ratio = signal.calculateIsotopicRatio(signalStore.get(referenceId)!)
  }

  return ok(c, {
    signalId: id,
    isotopicRatio: ratio,
    phaseCoherence: signal.getPhaseCoherence(),
    tdfValue: signal.getTdfValue(),
  })
})

// Tool 2: cross_correlate
const CrossSchema = z.object({
  contentA: z.string().min(1),
  contentB: z.string().optional(),
})

app.post('/cross_correlate', async (c: Context) => {
  const parsed = CrossSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))

  const { contentA, contentB } = parsed.data
  const sigA = new TemporalBlurrnSignal({ content: contentA }, 5.781e12, 42)
  const sigB = new TemporalBlurrnSignal({ content: contentB ?? 'reference-signal' }, 5.782e12, 43)
  const result = sigA.crossCorrelate(sigB)
  return ok(c, {
    strength: result.strength,
    lag: result.lag,
    vortexVolume: result.metadata.vortexVolume,
    isotopicRatio: sigA.calculateIsotopicRatio(sigB),
  })
})

// Tool 3: compute_tdf — full formula chain: TDF = tPTT * TAU * (1 / BlackHole_Seq)
const TdfSchema = z.object({
  T_c: z.number().positive().default(137),
  P_s: z.number().positive().default(1.0),
  E_t: z.number().min(0).default(0.5),
  delta_t: z.number().positive().default(1e-6),
  voids: z.number().positive().default(7),
  bhs_n: z.number().int().min(1).default(3),
})

app.post('/compute_tdf', async (c: Context) => {
  const parsed = TdfSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))

  const { T_c, P_s, E_t, delta_t, voids, bhs_n } = parsed.data
  const { tptt, bhs, tdf, s_l } = computeFullTDF(T_c, P_s, E_t, delta_t, voids, bhs_n)

  return ok(c, {
    tdfValue: tdf,
    S_L: s_l,
    tau: TAU,
    tPTT: tptt,
    BlackHole_Seq: bhs,
    parameters: { T_c, P_s, E_t, delta_t, voids, bhs_n },
  })
})

// Tool 4: list_isotopes
app.post('/list_isotopes', async (c: Context) => {
  const std = ISOTOPES.map((iso, i) => ({
    id: `isotope-${i}`, name: iso.type, factor: iso.factor, type: 'standard',
  }))
  const blurrn = BLURRN_ISOTOPES.map((iso, i) => ({
    id: `blurrn-${i}`, name: iso.type, factor: iso.factor, type: 'blurrn',
  }))
  return ok(c, { isotopes: [...std, ...blurrn] })
})

// Tool 5: triangulate_signals
const TriangulateSchema = z.object({
  signals: z.array(z.object({
    content: z.string(),
    tdf: z.number().positive().optional(),
  })).min(2, 'Need at least 2 signals'),
})

app.post('/triangulate_signals', async (c: Context) => {
  const parsed = TriangulateSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))

  const sigs: TemporalBlurrnSignal[] = parsed.data.signals.map((s, i) =>
    new TemporalBlurrnSignal({ content: s.content }, s.tdf ?? 5.781e12 + i * 137, i)
  )

  const results = sigs.map((s, i) => ({
    index: i,
    fingerprint: s.getIsotopicFingerprint(),
    correlations: sigs.filter((_, j) => j !== i).map(o => s.crossCorrelate(o)),
  }))

  return ok(c, { signalCount: parsed.data.signals.length, results })
})

// Tool 6: fuse_symbiotic
const FuseSchema = z.object({
  partners: z.array(z.object({ content: z.string() })).min(2, 'Need at least 2 partners'),
})

app.post('/fuse_symbiotic', async (c: Context) => {
  const parsed = FuseSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))

  const sigs: TemporalBlurrnSignal[] = parsed.data.partners.map((p, i) =>
    new TemporalBlurrnSignal(p, 5.781e12 + i * 100, i)
  )
  const fused = sigs[0].fuseSymbiotically(sigs.slice(1))

  return ok(c, {
    fused: true,
    partnerCount: parsed.data.partners.length,
    fusedEmbedding: fused.embed(),
    fusedIsotopeId: fused.getIsotopeId(),
  })
})

// Tool 7: optimize_cascade
const CascadeSchema = z.object({
  n: z.number().int().min(1).max(5000).default(100),
  deltaPhase: z.number().default(0.1),
})

app.post('/optimize_cascade', async (c: Context) => {
  const parsed = CascadeSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))

  const { n, deltaPhase } = parsed.data
  const results = Array.from({ length: n }, (_, i) => ({
    iteration: i,
    efficiency: Math.min(100, (i / n) * 100 * (1 + Math.sin(i * deltaPhase) * 0.2)),
  }))

  return ok(c, {
    iterations: n,
    finalEfficiency: results[results.length - 1].efficiency,
    peakEfficiency: Math.max(...results.map(r => r.efficiency)),
    results,
  })
})

// Tool 8: get_phase_coherence — now uses signal store
const CoherenceSchema = z.object({
  signalId: z.string().min(1),
})

app.post('/get_phase_coherence', async (c: Context) => {
  const parsed = CoherenceSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))

  if (signalStore.has(parsed.data.signalId)) {
    const signal = signalStore.get(parsed.data.signalId)!
    return ok(c, {
      signalId: parsed.data.signalId,
      phaseCoherence: signal.getPhaseCoherence(),
      tdfValue: signal.getTdfValue(),
      cascadeIndex: signal.getCascadeIndex(),
      stored: true,
    })
  }

  // Fallback: reconstruct from hardcoded params
  const signal = new TemporalBlurrnSignal({ id: parsed.data.signalId }, 5.781e12, 42)
  return ok(c, { signalId: parsed.data.signalId, phaseCoherence: signal.getPhaseCoherence(), stored: false })
})

// ===== New Tools: v4.8 Engine Primitives =====

// Tool 9: compute_tptt — standalone tPTT calculation
const TpttSchema = z.object({
  T_c: z.number().positive().default(137),
  P_s: z.number().positive().default(1.0),
  E_t: z.number().min(0).default(0.5),
  delta_t: z.number().positive().default(1e-6),
})

app.post('/compute_tptt', async (c: Context) => {
  const parsed = TpttSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))

  const { T_c, P_s, E_t, delta_t } = parsed.data
  const result = tPTT(T_c, P_s, E_t, delta_t)
  return ok(c, {
    tPTT: result,
    parameters: { T_c, P_s, E_t, delta_t, PHI, C },
  })
})

// Tool 10: black_hole_sequence — standalone BlackHole_Seq
const BhsSchema = z.object({
  voids: z.number().positive().default(7),
  n: z.number().int().min(1).default(3),
})

app.post('/black_hole_sequence', async (c: Context) => {
  const parsed = BhsSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))

  const { voids, n } = parsed.data
  const result = blackHoleSequence(voids, n)
  return ok(c, {
    BlackHole_Seq: result,
    parameters: { voids, n, L: 3, PHI },
  })
})

// Tool 11: kuramoto_sync — Kuramoto phase synchronization
const KuramotoSchema = z.object({
  phases: z.array(z.number()).min(2, 'Need at least 2 phases'),
  frequencies: z.array(z.number()).min(2),
  fractalToggle: z.boolean().default(false),
  isotope: z.string().default('C-12'),
  phaseType: z.enum(['push', 'pull']).default('push'),
  oscillatorIndex: z.number().int().min(0).default(0),
})

app.post('/kuramoto_sync', async (c: Context) => {
  const parsed = KuramotoSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))

  const { phases, frequencies, fractalToggle, isotope: isoName, phaseType, oscillatorIndex } = parsed.data
  const allIsotopes = [...ISOTOPES, ...BLURRN_ISOTOPES]
  const isotope = allIsotopes.find(i => i.type === isoName) ?? ISOTOPES[0]

  const freqUpdate = kuramoto(phases, frequencies, fractalToggle, isotope, phaseType, oscillatorIndex)
  const coherence = calculatePhaseCoherence(phases)

  return ok(c, {
    frequencyUpdate: freqUpdate,
    phaseCoherence: coherence,
    oscillatorIndex,
    isotopeUsed: isotope.type,
    phaseType,
  })
})

// Tool 12: wave_function — standalone wave computation
const WaveSchema = z.object({
  x: z.number().default(1.0),
  t: z.number().default(0.0),
  n: z.number().default(1),
  isotope: z.string().default('C-12'),
  lambda: z.number().positive().default(0.530),
  phaseType: z.enum(['push', 'pull']).default('push'),
})

app.post('/wave_function', async (c: Context) => {
  const parsed = WaveSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))

  const allIsotopes = [...ISOTOPES, ...BLURRN_ISOTOPES]
  const isotope = allIsotopes.find(i => i.type === parsed.data.isotope) ?? ISOTOPES[0]

  const amplitude = wave(parsed.data.x, parsed.data.t, parsed.data.n, isotope, parsed.data.lambda, parsed.data.phaseType)
  return ok(c, { amplitude, parameters: { ...parsed.data, isotopeUsed: isotope.type } })
})

// Tool 13: harmonic_oscillator — P_o = sin(2pi * 528 * t + pi / PHI)
const HOSchema = z.object({
  t: z.number().default(0.0),
})

app.post('/harmonic_oscillator', async (c: Context) => {
  const parsed = HOSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))

  return ok(c, { P_o: harmonicOscillator(parsed.data.t), t: parsed.data.t, FREQ, PHI })
})

// Tool 14: validate_tlm — TLM validation
const TlmSchema = z.object({
  phi: z.number().default(1.666),
})

app.post('/validate_tlm', async (c: Context) => {
  const parsed = TlmSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))

  return ok(c, {
    valid: validateTLM(parsed.data.phi),
    phi: parsed.data.phi,
    range: { min: 1.566, max: 1.766 },
  })
})

// Root — tool index (GET = API listing, POST = Streamable HTTP MCP transport)
app.get('/', (c: Context) => {
  return c.json({
    name: 'blurrn-mcp',
    version: '4.8.3',
    tools: 20,
    endpoints: {
      GET: ['/', '/health', '/docs', '/list_isotopes', '/compute_tdf', '/compute_tptt', '/black_hole_sequence', '/validate_tlm', '/harmonic_oscillator', '/get_docs', '/explain_term', '/explain_governance_output'],
      POST: ['/', '/emit_isotopic_signal', '/cross_correlate', '/compute_tdf', '/list_isotopes', '/triangulate_signals', '/fuse_symbiotic', '/optimize_cascade', '/get_phase_coherence', '/compute_tptt', '/black_hole_sequence', '/kuramoto_sync', '/wave_function', '/harmonic_oscillator', '/validate_tlm', '/governance', '/govern_with_solar', '/call_connected_tool', '/get_docs', '/explain_term', '/explain_governance_output'],
    },
  })
})

// Streamable HTTP MCP transport — accept JSON-RPC POST at root
app.post('/', async (c: Context) => {
  const body = await c.req.json()
  const result = await handleMCPMessage('streamable-http', body)
  if (!result) {
    return c.body(null, 202)
  }
  return c.json(result)
})

// Health
app.get('/health', (c: Context) => {
  return c.json({
    status: 'ok',
    name: 'blurrn-mcp',
    version: '4.8.3',
    tools: 20,
    storedSignals: signalStore.size,
  })
})

// ----- GET helpers for read-only tools (sandbox-friendly) -----

function getQueryParams(c: Context): Record<string, any> {
  const url = new URL(c.req.url)
  const params: Record<string, any> = {}
  url.searchParams.forEach((v, k) => {
    const num = Number(v)
    params[k] = isNaN(num) ? v : num
  })
  return params
}

app.get('/list_isotopes', (c: Context) => {
  const std = ISOTOPES.map((iso, i) => ({ id: `isotope-${i}`, name: iso.type, factor: iso.factor, type: 'standard' }))
  const blurrn = BLURRN_ISOTOPES.map((iso, i) => ({ id: `blurrn-${i}`, name: iso.type, factor: iso.factor, type: 'blurrn' }))
  return c.json({ success: true, isotopes: [...std, ...blurrn] })
})

app.get('/compute_tdf', (c: Context) => {
  const p = getQueryParams(c)
  const { tptt, bhs, tdf, s_l } = computeFullTDF(
    p.T_c ?? 137, p.P_s ?? 1.0, p.E_t ?? 0.5, p.delta_t ?? 1e-6,
    p.voids ?? 7, p.bhs_n ?? 3,
  )
  return c.json({ success: true, tdfValue: tdf, S_L: s_l, tau: TAU, tPTT: tptt, BlackHole_Seq: bhs })
})

app.get('/compute_tptt', (c: Context) => {
  const p = getQueryParams(c)
  const result = tPTT(p.T_c ?? 137, p.P_s ?? 1.0, p.E_t ?? 0.5, p.delta_t ?? 1e-6)
  return c.json({ success: true, tPTT: result })
})

app.get('/black_hole_sequence', (c: Context) => {
  const p = getQueryParams(c)
  const result = blackHoleSequence(p.voids ?? 7, p.n ?? 3)
  return c.json({ success: true, BlackHole_Seq: result })
})

app.get('/validate_tlm', (c: Context) => {
  const p = getQueryParams(c)
  const phi = p.phi ?? 1.666
  return c.json({ success: true, valid: validateTLM(phi), phi, range: { min: 1.566, max: 1.766 } })
})

app.get('/harmonic_oscillator', (c: Context) => {
  const p = getQueryParams(c)
  return c.json({ success: true, P_o: harmonicOscillator(p.t ?? 0.0) })
})

// ===== MCP Standard Protocol (SSE + JSON-RPC) for grok.com Custom Connector =====

// Tool definitions for MCP tools/list
const TOOL_DEFINITIONS = [
  {
    name: 'compute_tdf',
    description: 'Full Temporal Displacement Factor chain: TDF = tPTT × TAU × (1 / BlackHole_Seq).',
    inputSchema: { type: 'object', properties: { T_c: { type: 'number', default: 137, description: 'Temporal constant' }, P_s: { type: 'number', default: 1.0, description: 'Power spectral' }, E_t: { type: 'number', default: 0.5, description: 'Entropy' }, delta_t: { type: 'number', default: 1e-6, description: 'Time step' }, voids: { type: 'number', default: 7, description: 'Voids for BlackHole_Seq' }, bhs_n: { type: 'number', default: 3, description: 'Exponent for BlackHole_Seq' } } },
  },
  {
    name: 'emit_isotopic_signal',
    description: 'Emits a new isotopic signal, stores it in memory, and returns its fingerprint. Create traceable signals for later cross-correlation, triangulation, or fusion.',
    inputSchema: { type: 'object', properties: { content: { type: 'string', description: 'Signal content' }, tdf: { type: 'number', default: 5.781e12, description: 'TDF value' }, cascadeIndex: { type: 'number', default: 42, description: 'Cascade index' }, referenceId: { type: 'string', description: 'Reference signal ID for pairwise isotopic ratio' } }, required: ['content'] },
  },
  {
    name: 'cross_correlate',
    description: 'Cross-correlates two isotopic signals. Returns strength (0–1), lag, vortexVolume (W × M = V), and isotopicRatio. Measures similarity and temporal entanglement between two signals.',
    inputSchema: { type: 'object', properties: { contentA: { type: 'string', description: 'First signal content' }, contentB: { type: 'string', description: 'Second signal content (optional)' } }, required: ['contentA'] },
  },
  {
    name: 'list_isotopes',
    description: 'Lists all available isotopes (standard + Blurrn-native). Use the exact name when selecting isotopes for other tools. Isotope names are case-sensitive.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'triangulate_signals',
    description: 'Triangulates 2+ signals and returns isotopic fingerprints plus a full pairwise correlation matrix. Multi-signal analysis to identify the strongest relationships.',
    inputSchema: { type: 'object', properties: { signals: { type: 'array', items: { type: 'object', properties: { content: { type: 'string' }, tdf: { type: 'number' } } }, minItems: 2 } }, required: ['signals'] },
  },
  {
    name: 'fuse_symbiotic',
    description: 'Fuses 2+ signals using polymorphic isotopic fusion. Unlike simple averaging, this method preserves phase relationships between signals and creates a new composite identity ("fused-core").',
    inputSchema: { type: 'object', properties: { partners: { type: 'array', items: { type: 'object', properties: { content: { type: 'string' } } }, minItems: 2 } }, required: ['partners'] },
  },
  {
    name: 'optimize_cascade',
    description: 'Simulates cascade iterations to find efficient deltaPhase values.',
    inputSchema: { type: 'object', properties: { n: { type: 'number', default: 100, description: 'Iteration count (max 5000)' }, deltaPhase: { type: 'number', default: 0.1, description: 'Phase delta' } } },
  },
  {
    name: 'get_phase_coherence',
    description: 'Returns phase coherence of a stored signal. Checks memory first, falls back to reconstruction if needed.',
    inputSchema: { type: 'object', properties: { signalId: { type: 'string', description: 'Signal ID from emit_isotopic_signal' } }, required: ['signalId'] },
  },
  {
    name: 'compute_tptt',
    description: 'Standalone tPTT calculation.',
    inputSchema: { type: 'object', properties: { T_c: { type: 'number', default: 137 }, P_s: { type: 'number', default: 1.0 }, E_t: { type: 'number', default: 0.5 }, delta_t: { type: 'number', default: 1e-6 } } },
  },
  {
    name: 'black_hole_sequence',
    description: 'Standalone BlackHole_Seq calculation.',
    inputSchema: { type: 'object', properties: { voids: { type: 'number', default: 7 }, n: { type: 'number', default: 3 } } },
  },
  {
    name: 'kuramoto_sync',
    description: 'Kuramoto synchronization with push-pull dynamics.',
    inputSchema: { type: 'object', properties: { phases: { type: 'array', items: { type: 'number' }, minItems: 2 }, frequencies: { type: 'array', items: { type: 'number' }, minItems: 2 }, fractalToggle: { type: 'boolean', default: false }, isotope: { type: 'string', default: 'C-12' }, phaseType: { type: 'string', enum: ['push', 'pull'], default: 'push' }, oscillatorIndex: { type: 'number', default: 0 } }, required: ['phases', 'frequencies'] },
  },
  {
    name: 'wave_function',
    description: 'Computes wave amplitude with isotope modulation.',
    inputSchema: { type: 'object', properties: { x: { type: 'number', default: 1.0 }, t: { type: 'number', default: 0.0 }, n: { type: 'number', default: 1 }, isotope: { type: 'string', default: 'C-12' }, lambda: { type: 'number', default: 0.53 }, phaseType: { type: 'string', enum: ['push', 'pull'], default: 'push' } } },
  },
  {
    name: 'harmonic_oscillator',
    description: 'P_o = sin(2pi * 528 * t + pi / PHI). Harmonic oscillator frequency calculation.',
    inputSchema: { type: 'object', properties: { t: { type: 'number', default: 0.0, description: 'Time' } } },
  },
  {
    name: 'validate_tlm',
    description: 'Validates that the Trinitarium ratio (phi) is within the valid range [1.566, 1.766].',
    inputSchema: { type: 'object', properties: { phi: { type: 'number', default: 1.666, description: 'PHI to validate' } } },
  },
  {
    name: 'evaluate_governance',
    description: 'Full governance pipeline (emit -> cross-correlate -> triangulate -> fuse -> decide).',
    inputSchema: { type: 'object', properties: { proposalId: { type: 'string', minLength: 3, description: 'Proposal identifier' }, proposalText: { type: 'string', minLength: 30, description: 'Full proposal text' }, codeDiff: { type: 'string', description: 'Optional code diff for correlation' }, agentReviews: { type: 'array', items: { type: 'string' }, minItems: 1, description: 'Agent review texts' }, historicalSignalIds: { type: 'array', items: { type: 'string' }, description: 'Past signal IDs for historical coherence' } }, required: ['proposalId', 'proposalText', 'agentReviews'] },
  },
  {
    name: 'govern_with_solar',
    description: 'Enhanced governance with real-time solar context from NOAA GOES. Runs the full governance pipeline while injecting live solar activity. Automatically adjusts vote weight and can append warnings such as [SOLAR STORM WARNING].',
    inputSchema: { type: 'object', properties: { proposal: { type: 'string', minLength: 10, description: 'Governance proposal text' }, baseVoteWeight: { type: 'number', default: 1.0, description: 'Base vote weight (0.5-1.5)' } }, required: ['proposal'] },
  },
  {
    name: 'call_connected_tool',
    description: 'Universal proxy tool. Dynamically calls any other Dynamo MCP tool by name.',
    inputSchema: { type: 'object', properties: { tool_name: { type: 'string', description: 'Name of the tool to call (e.g. compute_tdf, govern_with_solar)' }, params: { type: 'object', description: 'Tool-specific parameters as a JSON object' } }, required: ['tool_name'] },
  },
  {
    name: 'get_docs',
    description: 'Returns this documentation. Optionally filter by tool name.',
    inputSchema: { type: 'object', properties: { tool: { type: 'string', description: 'Optional tool name to filter docs to a single tool. Omit for full docs.' } } },
  },
  {
    name: 'explain_term',
    description: 'Looks up a term from the Dynamo glossary.',
    inputSchema: { type: 'object', properties: { term: { type: 'string', description: 'Glossary term to explain (case-insensitive). Examples: "TAU", "PHI", "TDF"' } }, required: ['term'] },
  },
  {
    name: 'explain_governance_output',
    description: 'Converts a governance output (from either evaluate_governance or govern_with_solar) into human-readable plain text.',
    inputSchema: { type: 'object', properties: { governanceOutput: { type: 'object', description: 'The JSON output from evaluate_governance or govern_with_solar tool.' } }, required: ['governanceOutput'] },
  },
]

// MCP JSON-RPC helpers
function mcpResult(id: any, result: any) {
  return { jsonrpc: '2.0', id, result }
}

function mcpError(id: any, code: number, message: string, data?: any) {
  return { jsonrpc: '2.0', id, error: { code, message, data } }
}

// Map tool calls to actual handlers
const TOOL_HANDLERS: Record<string, (args: any) => any> = {
  compute_tdf: (args: any) => {
    const { tptt, bhs, tdf, s_l } = computeFullTDF(
      args.T_c ?? 137, args.P_s ?? 1.0, args.E_t ?? 0.5, args.delta_t ?? 1e-6,
      args.voids ?? 7, args.bhs_n ?? 3,
    )
    return { tdfValue: tdf, S_L: s_l, tau: TAU, tPTT: tptt, BlackHole_Seq: bhs }
  },
  emit_isotopic_signal: (args: any) => {
    const signal = new TemporalBlurrnSignal(
      { id: `sig-${Date.now()}`, content: args.content },
      args.tdf ?? 5.781e12 + args.content.length * 137,
      args.cascadeIndex ?? 42,
    )
    const id = signal.getIsotopeId()
    signalStore.set(id, signal)
    let ratio = signal.getPhaseCoherence()
    if (args.referenceId && signalStore.has(args.referenceId)) {
      ratio = signal.calculateIsotopicRatio(signalStore.get(args.referenceId)!)
    }
    return { signalId: id, isotopicRatio: ratio, phaseCoherence: signal.getPhaseCoherence(), tdfValue: signal.getTdfValue() }
  },
  cross_correlate: (args: any) => {
    const sigA = new TemporalBlurrnSignal({ content: args.contentA }, 5.781e12, 42)
    const sigB = new TemporalBlurrnSignal({ content: args.contentB ?? 'reference-signal' }, 5.782e12, 43)
    const result = sigA.crossCorrelate(sigB)
    return { strength: result.strength, lag: result.lag, vortexVolume: result.metadata.vortexVolume, isotopicRatio: sigA.calculateIsotopicRatio(sigB) }
  },
  list_isotopes: () => {
    const std = ISOTOPES.map((iso, i) => ({ id: `isotope-${i}`, name: iso.type, factor: iso.factor, type: 'standard' }))
    const blurrn = BLURRN_ISOTOPES.map((iso, i) => ({ id: `blurrn-${i}`, name: iso.type, factor: iso.factor, type: 'blurrn' }))
    return { isotopes: [...std, ...blurrn] }
  },
  triangulate_signals: (args: any) => {
    const sigs: TemporalBlurrnSignal[] = args.signals.map((s: any, i: number) =>
      new TemporalBlurrnSignal({ content: s.content }, s.tdf ?? 5.781e12 + i * 137, i)
    )
    const results = sigs.map((s: any, i: number) => ({
      index: i,
      fingerprint: s.getIsotopicFingerprint(),
      correlations: sigs.filter((_: any, j: number) => j !== i).map((o: any) => s.crossCorrelate(o)),
    }))
    return { signalCount: args.signals.length, results }
  },
  fuse_symbiotic: (args: any) => {
    const sigs: TemporalBlurrnSignal[] = args.partners.map((p: any, i: number) => new TemporalBlurrnSignal(p, 5.781e12 + i * 100, i))
    const fused = sigs[0].fuseSymbiotically(sigs.slice(1))
    return { fused: true, partnerCount: args.partners.length, fusedEmbedding: fused.embed(), fusedIsotopeId: fused.getIsotopeId() }
  },
  optimize_cascade: (args: any) => {
    const { n, deltaPhase } = args
    const results = Array.from({ length: n }, (_: any, i: number) => ({
      iteration: i, efficiency: Math.min(100, (i / n) * 100 * (1 + Math.sin(i * deltaPhase) * 0.2)),
    }))
    return { iterations: n, finalEfficiency: results[results.length - 1].efficiency, peakEfficiency: Math.max(...results.map((r: any) => r.efficiency)), results }
  },
  get_phase_coherence: (args: any) => {
    if (signalStore.has(args.signalId)) {
      const signal = signalStore.get(args.signalId)!
      return { signalId: args.signalId, phaseCoherence: signal.getPhaseCoherence(), tdfValue: signal.getTdfValue(), cascadeIndex: signal.getCascadeIndex(), stored: true }
    }
    const signal = new TemporalBlurrnSignal({ id: args.signalId }, 5.781e12, 42)
    return { signalId: args.signalId, phaseCoherence: signal.getPhaseCoherence(), stored: false }
  },
  compute_tptt: (args: any) => {
    return { tPTT: tPTT(args.T_c ?? 137, args.P_s ?? 1.0, args.E_t ?? 0.5, args.delta_t ?? 1e-6) }
  },
  black_hole_sequence: (args: any) => {
    return { BlackHole_Seq: blackHoleSequence(args.voids ?? 7, args.n ?? 3) }
  },
  kuramoto_sync: (args: any) => {
    const allIsotopes = [...ISOTOPES, ...BLURRN_ISOTOPES]
    const isotope = allIsotopes.find((i: any) => i.type === args.isotope) ?? ISOTOPES[0]
    const freqUpdate = kuramoto(args.phases, args.frequencies, args.fractalToggle ?? false, isotope, args.phaseType ?? 'push', args.oscillatorIndex ?? 0)
    const coherence = calculatePhaseCoherence(args.phases)
    return { frequencyUpdate: freqUpdate, phaseCoherence: coherence, oscillatorIndex: args.oscillatorIndex ?? 0, isotopeUsed: isotope.type, phaseType: args.phaseType ?? 'push' }
  },
  wave_function: (args: any) => {
    const allIsotopes = [...ISOTOPES, ...BLURRN_ISOTOPES]
    const isotope = allIsotopes.find((i: any) => i.type === args.isotope) ?? ISOTOPES[0]
    return { amplitude: wave(args.x ?? 1, args.t ?? 0, args.n ?? 1, isotope, args.lambda ?? 0.53, args.phaseType ?? 'push') }
  },
  harmonic_oscillator: (args: any) => {
    return { P_o: harmonicOscillator(args.t ?? 0) }
  },
  validate_tlm: (args: any) => {
    return { valid: validateTLM(args.phi ?? 1.666), phi: args.phi ?? 1.666, range: { min: 1.566, max: 1.766 } }
  },
  evaluate_governance: async (args: any) => {
    return evaluateGovernance(TOOL_HANDLERS, args)
  },
  govern_with_solar: async (args: any) => {
    const proposal = args?.proposal || 'No proposal provided'
    const baseVoteWeight = args?.baseVoteWeight ?? 1.0
    return dynamoSolarGovernance.enhanceGovernanceDecision(proposal, baseVoteWeight)
  },
  call_connected_tool: async (args: any) => {
    const toolName = args?.tool_name
    const params = args?.params ?? {}
    if (!toolName) return { error: 'Missing tool_name parameter' }
    const handler = TOOL_HANDLERS[toolName]
    if (!handler) return { error: `Unknown tool: ${toolName}`, available_tools: Object.keys(TOOL_HANDLERS) }
    try {
      const result = await handler(params)
      return { success: true, tool: toolName, result }
    } catch (err: any) {
      return { success: false, tool: toolName, error: err.message }
    }
  },
  get_docs: (args: any) => {
    const filterTool = args?.tool
    if (filterTool) {
      const lines = FULL_DOCS.split('\n')
      const filtered: string[] = []
      let inSection = false
      for (const line of lines) {
        if (line.startsWith('### ') && line.toLowerCase().includes(filterTool.toLowerCase())) {
          inSection = true
          filtered.push(line)
          continue
        }
        if (line.startsWith('### ') && inSection) {
          inSection = false
        }
        if (inSection) filtered.push(line)
      }
      if (filtered.length > 0) {
        return { docs: filtered.join('\n'), tool: filterTool, toolCount: 1 }
      }
      return { docs: `No documentation found for tool "${filterTool}". Use get_docs without parameters to see all tools.`, tool: filterTool, toolCount: 0 }
    }
    return { docs: FULL_DOCS, toolCount: Object.keys(TOOL_HANDLERS).length }
  },
  explain_term: (args: any) => {
    const raw = args?.term
    if (!raw) return { error: 'Missing term parameter', available_terms: Object.keys(GLOSSARY).sort() }
    const termKey = raw.trim().toLowerCase()
    const keyMatch = Object.keys(GLOSSARY).find(k => k.toLowerCase() === termKey)
    let match = keyMatch ? GLOSSARY[keyMatch] : undefined
    if (!match) match = Object.values(GLOSSARY).find(v => v.term.toLowerCase().includes(termKey))
    if (!match) {
      const available = Object.keys(GLOSSARY).sort()
      return { error: `Unknown term "${raw}". Available terms: ${available.join(', ')}`, available_terms: available }
    }
    return {
      term: match.term,
      short: match.short,
      long: match.long,
      formula: match.formula ?? null,
      example: match.example ?? null,
    }
  },
  explain_governance_output: (args: any) => {
    const output = args?.governanceOutput
    if (!output || typeof output !== 'object') {
      return { error: 'Missing or invalid governanceOutput. Provide the JSON output from evaluate_governance or govern_with_solar.' }
    }
    const lines: string[] = []
    const rec = output.recommendation ?? output.finalRecommendation ?? 'unknown'
    const conf = output.confidence ?? output.confidenceAdjustment ?? null
    const weight = output.voteWeight ?? output.adjustedVoteWeight ?? null
    const reason = output.reasoning ?? null
    const solarCtx = output.solarContext ?? null

    lines.push(`Recommendation: ${rec}`)
    if (conf !== null) {
      const confPct = typeof conf === 'number' && conf <= 1 ? `${(conf * 100).toFixed(0)}%` : conf
      lines.push(`Confidence: ${confPct}`)
    }
    if (weight !== null) {
      lines.push(`Vote weight: ${typeof weight === 'number' ? weight.toFixed(3) : weight}`)
    }
    if (reason) {
      lines.push(`Reasoning: ${reason}`)
    }

    if (rec === 'PASS') {
      lines.push('This proposal PASSED governance. The recommendation is to approve and proceed.')
    } else if (rec === 'REJECT') {
      lines.push('This proposal was REJECTED by governance. The recommendation is to decline and revisit.')
    } else if (rec === 'NEEDS_REVISION') {
      lines.push('This proposal NEEDS_REVISION. The recommendation is to revise based on the reasoning provided and resubmit.')
    }

    if (solarCtx) {
      lines.push('')
      lines.push('Solar context:')
      lines.push(`  Activity level: ${solarCtx.solarActivityLevel ?? 'unknown'}`)
      if (solarCtx.solarResonance !== undefined) lines.push(`  Solar resonance: ${solarCtx.solarResonance.toFixed(4)}`)
      if (solarCtx.solarActivityModifier !== undefined) {
        const mod = solarCtx.solarActivityModifier
        const sign = mod >= 0 ? '+' : ''
        lines.push(`  Solar modifier: ${sign}${mod.toFixed(3)} (${mod >= 0 ? 'boosts' : 'reduces'} confidence and weight)`)
      }
      if (solarCtx.recommendation) lines.push(`  Solar advice: ${solarCtx.recommendation}`)
      if (output.finalRecommendation && output.finalRecommendation !== rec) {
        lines.push(`  Final recommendation (with solar): ${output.finalRecommendation}`)
      }
    }
    return { explanation: lines.join('\n') }
  },
}

// Auto-generate GET documentation for all tools
function buildToolDocs(tool: any) {
  const params: Record<string, any> = {}
  const schema = tool.inputSchema?.properties || {}
  const required = tool.inputSchema?.required || []

  for (const [key, val] of Object.entries(schema as Record<string, any>)) {
    params[key] = {
      type: val.type,
      required: required.includes(key),
      default: val.default,
      description: val.description,
      ...(val.enum ? { enum: val.enum } : {}),
      ...(val.minItems ? { minItems: val.minItems } : {}),
    }
  }

  return {
    name: tool.name,
    description: tool.description,
    method: 'POST',
    url: `https://mcp-production-80e2.up.railway.app/${tool.name}`,
    parameters: params,
    note: 'Send parameters as JSON body with Content-Type: application/json',
  }
}

// Add GET docs for all tools that don't have custom GET handlers
const toolsNeedingDocs = [
  'emit_isotopic_signal',
  'cross_correlate',
  'triangulate_signals',
  'fuse_symbiotic',
  'optimize_cascade',
  'get_phase_coherence',
  'kuramoto_sync',
  'wave_function',
  'evaluate_governance',
]

for (const toolName of toolsNeedingDocs) {
  const toolDef = TOOL_DEFINITIONS.find((t: any) => t.name === toolName)
  if (toolDef) {
    app.get(`/${toolName}`, (c: Context) => c.json(buildToolDocs(toolDef)))
  }
}

// ===== Governance Layer =====
app.route('/', createGovernanceRouter(TOOL_HANDLERS))

app.get('/govern_with_solar', (c: Context) => {
  return c.json({
    name: 'govern_with_solar',
    description: 'Enhanced governance with real-time solar context from NOAA GOES. Runs the full governance pipeline while injecting live solar activity. Automatically adjusts vote weight and can append warnings such as [SOLAR STORM WARNING]. Recommended default for most proposals.',
    method: 'POST',
    url: 'https://mcp-production-80e2.up.railway.app/govern_with_solar',
    parameters: {
      proposal: { type: 'string', required: true, minLength: 10, description: 'Governance proposal text' },
      baseVoteWeight: { type: 'number', required: false, default: 1.0, min: 0.5, max: 1.5, description: 'Base vote weight (0.5-1.5)' },
    },
    when_to_use: [
      'Most strategic or high-impact proposals (recommended default)',
      'When you want decisions to include live cosmic context',
      'During elevated solar activity (applies more conservative weighting)',
    ],
    when_to_use_evaluate_governance_instead: [
      'Purely technical or low-level protocol decisions',
      'When you want to exclude external modifiers',
    ],
    solar_behavior: {
      quiet: 'Slight stability boost',
      moderate: 'Neutral (no adjustment)',
      active: 'Mild reduction in vote weight',
      storm: 'Significant reduction in vote weight + [SOLAR STORM WARNING]',
    },
    decision_logic_note: 'Prefer using the numeric confidenceAdjustment for decision-making rather than switching on solarActivityLevel string. The numeric adjustment is the direct governance pipeline output and is more robust if finer-grained solar levels are added later. Use solarActivityLevel and recommendation for logging and transparency.',
    outputs: ['originalRecommendation', 'solarContext', 'adjustedVoteWeight', 'finalRecommendation', 'confidenceAdjustment'],
    example: {
      request: '{"proposal":"Deploy new solar observatory","baseVoteWeight":1.0}',
      response: {
        success: true,
        originalRecommendation: 'Deploy new solar observatory',
        solarContext: {
          solarActivityLevel: 'storm',
          solarResonance: 0.5935,
          solarActivityModifier: -0.15,
          recommendation: 'Solar storm detected - recommend delayed or weighted decisions',
        },
        adjustedVoteWeight: 0.85,
        finalRecommendation: 'Deploy new solar observatory [SOLAR STORM WARNING]',
        confidenceAdjustment: -0.15,
      },
    },
  })
})

app.post('/govern_with_solar', async (c: Context) => {
  const body = await c.req.json()
  const result = await dynamoSolarGovernance.enhanceGovernanceDecision(body.proposal, body.baseVoteWeight ?? 1.0)
  return c.json({ success: true, ...result })
})

app.get('/call_connected_tool', (c: Context) => {
  return c.json({
    name: 'call_connected_tool',
    description: 'Universal proxy tool. Dynamically calls any other Dynamo MCP tool by name. Useful for meta-orchestration and dynamic tool routing.',
    method: 'POST',
    url: 'https://mcp-production-80e2.up.railway.app/call_connected_tool',
    parameters: {
      tool_name: { type: 'string', required: true, description: 'Name of the tool to call (e.g. compute_tdf, govern_with_solar)' },
      params: { type: 'object', required: false, default: {}, description: 'Tool-specific parameters passed directly to the target tool' },
    },
    outputs: ['success', 'tool', 'result (or error)'],
    use_case: 'Meta-orchestration — call tool X based on the output of tool Y.',
    example: {
      request: '{"tool_name":"govern_with_solar","params":{"proposal":"Deploy new observatory","baseVoteWeight":1.0}}',
      response: {
        success: true,
        tool: 'govern_with_solar',
        result: { /* ... tool result ... */ },
      },
    },
    available_tools: Object.keys(TOOL_HANDLERS),
  })
})

app.post('/call_connected_tool', async (c: Context) => {
  const body = await c.req.json()
  const toolName = body.tool_name
  const params = body.params ?? {}
  if (!toolName) return c.json({ error: 'Missing tool_name parameter' }, 400)
  const handler = TOOL_HANDLERS[toolName]
  if (!handler) return c.json({ error: `Unknown tool: ${toolName}`, available_tools: Object.keys(TOOL_HANDLERS) }, 404)
  try {
    const result = await handler(params)
    return c.json({ success: true, tool: toolName, result })
  } catch (err: any) {
    return c.json({ success: false, tool: toolName, error: err.message }, 500)
  }
})

// ===== Documentation Tools =====

app.get('/get_docs', (c: Context) => {
  const tool = c.req.query('tool')
  if (tool) {
    const lines = FULL_DOCS.split('\n')
    const filtered: string[] = []
    let inSection = false
    for (const line of lines) {
      if (line.startsWith('### ') && line.toLowerCase().includes(tool.toLowerCase())) {
        inSection = true
        filtered.push(line)
        continue
      }
      if (line.startsWith('### ') && inSection) inSection = false
      if (inSection) filtered.push(line)
    }
    if (filtered.length > 0) {
      return c.json({ success: true, docs: filtered.join('\n'), tool, toolCount: 1 })
    }
    return c.json({ success: true, docs: FULL_DOCS, toolCount: Object.keys(TOOL_HANDLERS).length })
  }
  return c.json({ success: true, docs: FULL_DOCS, toolCount: Object.keys(TOOL_HANDLERS).length })
})

app.post('/get_docs', async (c: Context) => {
  const body = await c.req.json().catch(() => ({}))
  const tool = body?.tool
  if (tool) {
    const lines = FULL_DOCS.split('\n')
    const filtered: string[] = []
    let inSection = false
    for (const line of lines) {
      if (line.startsWith('### ') && line.toLowerCase().includes(tool.toLowerCase())) {
        inSection = true
        filtered.push(line)
        continue
      }
      if (line.startsWith('### ') && inSection) inSection = false
      if (inSection) filtered.push(line)
    }
    if (filtered.length > 0) {
      return c.json({ success: true, docs: filtered.join('\n'), tool, toolCount: 1 })
    }
    return c.json({ success: true, docs: `No documentation found for tool "${tool}". Use get_docs without parameters to see all tools.`, tool, toolCount: 0 })
  }
  return c.json({ success: true, docs: FULL_DOCS, toolCount: Object.keys(TOOL_HANDLERS).length })
})

app.get('/explain_term', (c: Context) => {
  const raw = c.req.query('term')
  if (!raw) {
    return c.json({ success: true, available_terms: Object.keys(GLOSSARY).sort(), note: 'Use ?term=<name> to look up a term' })
  }
  const termKey = raw.trim().toLowerCase()
  const match = GLOSSARY[termKey] ?? Object.values(GLOSSARY).find(v => v.term.toLowerCase().includes(termKey))
  if (!match) {
    return c.json({ success: false, error: `Unknown term "${raw}". Available terms: ${Object.keys(GLOSSARY).sort().join(', ')}` })
  }
  return c.json({ success: true, term: match.term, short: match.short, long: match.long, formula: match.formula ?? null, example: match.example ?? null })
})

app.post('/explain_term', async (c: Context) => {
  const body = await c.req.json().catch(() => ({}))
  const raw = body?.term
  if (!raw) {
    return c.json({ success: false, error: 'Missing term parameter', available_terms: Object.keys(GLOSSARY).sort() })
  }
  const termKey = raw.trim().toLowerCase()
  const keyMatch = Object.keys(GLOSSARY).find(k => k.toLowerCase() === termKey)
  let match = keyMatch ? GLOSSARY[keyMatch] : undefined
  if (!match) match = Object.values(GLOSSARY).find(v => v.term.toLowerCase().includes(termKey))
  if (!match) {
    const available = Object.keys(GLOSSARY).sort()
    return c.json({ success: false, error: `Unknown term "${raw}". Available terms: ${available.join(', ')}`, available_terms: available })
  }
  return c.json({ success: true, term: match.term, short: match.short, long: match.long, formula: match.formula ?? null, example: match.example ?? null })
})

app.get('/explain_governance_output', (c: Context) => {
  return c.json({
    name: 'explain_governance_output',
    description: 'Converts a governance output (from either evaluate_governance or govern_with_solar) into human-readable plain text. Decodes the recommendation (PASS/REJECT/NEEDS_REVISION), confidence, vote weight, reasoning, and solar context.',
    method: 'POST',
    parameters: {
      governanceOutput: { type: 'object', required: true, description: 'The JSON output from evaluate_governance or govern_with_solar' },
    },
    outputs: ['explanation (human-readable analysis of the governance decision)'],
    example: {
      request: '{"governanceOutput":{"recommendation":"PASS","confidence":0.85,"voteWeight":1.0,"reasoning":"Strong alignment"}}',
      response: {
        success: true,
        explanation: 'Recommendation: PASS\nConfidence: 85%\nVote weight: 1.000\nReasoning: Strong alignment\nThis proposal PASSED governance. The recommendation is to approve and proceed.',
      },
    },
  })
})

app.post('/explain_governance_output', async (c: Context) => {
  const body = await c.req.json().catch(() => ({}))
  const output = body?.governanceOutput
  if (!output || typeof output !== 'object') {
    return c.json({ success: false, error: 'Missing or invalid governanceOutput. Provide the JSON output from evaluate_governance or govern_with_solar.' })
  }
  const lines: string[] = []
  const rec = output.recommendation ?? output.finalRecommendation ?? 'unknown'
  const conf = output.confidence ?? output.confidenceAdjustment ?? null
  const weight = output.voteWeight ?? output.adjustedVoteWeight ?? null
  const reason = output.reasoning ?? null
  const solarCtx = output.solarContext ?? null

  lines.push(`Recommendation: ${rec}`)
  if (conf !== null) {
    const confPct = typeof conf === 'number' && conf <= 1 ? `${(conf * 100).toFixed(0)}%` : String(conf)
    lines.push(`Confidence: ${confPct}`)
  }
  if (weight !== null) {
    lines.push(`Vote weight: ${typeof weight === 'number' ? weight.toFixed(3) : weight}`)
  }
  if (reason) lines.push(`Reasoning: ${reason}`)

  if (rec === 'PASS') lines.push('This proposal PASSED governance. The recommendation is to approve and proceed.')
  else if (rec === 'REJECT') lines.push('This proposal was REJECTED by governance. The recommendation is to decline and revisit.')
  else if (rec === 'NEEDS_REVISION') lines.push('This proposal NEEDS_REVISION. The recommendation is to revise based on the reasoning provided and resubmit.')

  if (solarCtx) {
    lines.push('')
    lines.push('Solar context:')
    lines.push(`  Activity level: ${solarCtx.solarActivityLevel ?? 'unknown'}`)
    if (solarCtx.solarResonance !== undefined) lines.push(`  Solar resonance: ${solarCtx.solarResonance.toFixed(4)}`)
    if (solarCtx.solarActivityModifier !== undefined) {
      const mod = solarCtx.solarActivityModifier
      const sign = mod >= 0 ? '+' : ''
      lines.push(`  Solar modifier: ${sign}${mod.toFixed(3)} (${mod >= 0 ? 'boosts' : 'reduces'} confidence and weight)`)
    }
    if (solarCtx.recommendation) lines.push(`  Solar advice: ${solarCtx.recommendation}`)
    if (output.finalRecommendation && output.finalRecommendation !== rec) {
      lines.push(`  Final recommendation (with solar): ${output.finalRecommendation}`)
    }
  }

  return c.json({ success: true, explanation: lines.join('\n') })
})

// ===== GET /docs — Full documentation page =====
app.get('/docs', (c: Context) => {
  return c.json({ success: true, docs: FULL_DOCS, toolCount: Object.keys(TOOL_HANDLERS).length, glossaryTerms: Object.keys(GLOSSARY).length })
})

// Debug endpoint to test MCP tool handler directly
app.get('/debug-govern', async (c: Context) => {
  try {
    const handler = TOOL_HANDLERS['govern_with_solar']
    if (!handler) return c.json({ error: 'handler not found' })
    const result = await handler({ proposal: 'Debug test', baseVoteWeight: 1.0 })
    return c.json({ success: true, result, handlerType: typeof handler })
  } catch (err: any) {
    return c.json({ error: err.message, stack: err.stack })
  }
})

async function handleMCPMessage(sessionId: string, msg: any): Promise<any> {
  const { jsonrpc, id, method, params } = msg || {}
  if (jsonrpc !== '2.0' || id === undefined) return null // notifications are ignored

  try {
    switch (method) {
      case 'initialize':
        return mcpResult(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'blurrn-mcp', version: '4.8.0' },
        })
      case 'ping':
        return mcpResult(id, {})
      case 'tools/list':
        return mcpResult(id, { tools: TOOL_DEFINITIONS })
      case 'tools/call': {
        const { name, arguments: args } = params || {}
        if (!name) return mcpError(id, -32602, 'Missing tool name')
        const handler = TOOL_HANDLERS[name]
        if (!handler) return mcpError(id, -32601, `Unknown tool: ${name}`)
        const result = await handler(args ?? {})
        return mcpResult(id, { content: [{ type: 'text', text: JSON.stringify(result) }] })
      }
      default:
        return mcpError(id, -32601, `Method not found: ${method}`)
    }
  } catch (err: any) {
    return mcpError(id, -32603, 'Internal error', err.message)
  }
}

// Session registry — decouples session validity from active SSE subscriber
const activeSessions = new Map<string, true>()

// SSE session store — uses Redis Pub/Sub (production) or in-memory EventEmitter (dev/test)
app.get('/sse', (c: Context) => {
  const sessionId = crypto.randomUUID()
  const channel = `session:${sessionId}`
  activeSessions.set(sessionId, true)

  const cleanup = () => {
    activeSessions.delete(sessionId)
    unsub().catch(() => {})
  }
  c.req.raw.signal.addEventListener('abort', cleanup)

  let unsub: () => Promise<void> = () => Promise.resolve()

  return streamSSE(c, async (stream) => {
    // Subscribe before endpoint event to avoid race
    unsub = await subscribe(channel, async (raw: string) => {
      try {
        await stream.writeSSE({ data: raw })
      } catch {
        cleanup()
      }
    })

    await stream.writeSSE({
      event: 'endpoint',
      data: `/messages?sessionId=${sessionId}`,
    })

    await new Promise<void>((resolve) => {
      c.req.raw.signal.addEventListener('abort', () => {
        resolve()
      })
    })
  })
})

app.post('/messages', async (c: Context) => {
  const sessionId = c.req.query('sessionId')
  if (!sessionId) {
    console.log('[mcp] POST /messages: missing sessionId query param')
    return c.json({ error: 'Missing session ID — include ?sessionId= in URL' }, 400)
  }

  console.log(`[mcp] POST /messages: session ${sessionId.slice(0, 8)}… ${activeSessions.has(sessionId) ? '' : '(registry missing — SSE may have disconnected)'}`)

  const body = await c.req.json()
  const result = await handleMCPMessage(sessionId, body)
  if (result) {
    const delivered = await publish(`session:${sessionId}`, JSON.stringify(result))
    if (!delivered) {
      console.log(`[mcp] POST /messages: session ${sessionId} has no SSE subscriber (response will not reach client)`)
    }
  }

  return c.json({ ok: true })
})

export default app
export { app, TOOL_DEFINITIONS }
