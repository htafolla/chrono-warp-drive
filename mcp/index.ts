import { createHash } from 'crypto'
import { Hono, Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { cors } from 'hono/cors'
import { streamSSE } from 'hono/streaming'
import { z } from 'zod'
import { createWalletClient, createPublicClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { publish, subscribe, getRedisClient } from './pubsub'
import { createGovernanceRouter, evaluateGovernance } from './governance'
import { dynamoSolarGovernance, getPublicFeed, getHistory } from './lib/dynamoSolarGovernance.js'
import { isStructuredProposal, extractProposalText } from './lib/structuredProposal.js'
import { ambientField } from './lib/ambientField.js'
import { governanceToContainer, containerToContractParams, determineSource } from './lib/temporalContainer.js'
import type { ContainerVortex } from './lib/temporalContainer.js'
import { persistContainerToChain, baseMainnet, getPrivateKey, CONTRACT_ADDRESS, buildFallbackTransport, buildReadTransport } from './lib/contractClient.js'
import { temporalManifold } from './lib/temporalManifold.js'

const NEURAL_FUSION_URL = process.env.NEURAL_FUSION_URL || 'https://neural-fusion-backend-production.up.railway.app'

const containerStore: ContainerVortex[] = []
let latestContainerHash = '0x' + '0'.repeat(64)

const REDIS_CONTAINER_KEY = 'dynamo:containers'
const MAX_REDIS_CONTAINERS = 1000
const REDIS_VORTEX_KEY_MINT = 'dynamo:vortex:mint'

// Bootstrap: load containers from Redis on module init
;(async () => {
  try {
    const client = await getRedisClient()
    if (!client) return
    const raw = await client.lrange(REDIS_CONTAINER_KEY, 0, -1)
    for (const entry of raw.reverse()) {
      try {
        const c = JSON.parse(entry) as ContainerVortex
        containerStore.push(c)
        if (c.containerHash && c.containerHash !== '0x' + '0'.repeat(64)) {
          latestContainerHash = c.containerHash
        }
      } catch { /* skip corrupt */ }
    }
  } catch { /* Redis unavailable */ }
})()

// Rate-limit for manual persistToChain: 1 per 10 seconds globally
let lastPersistTime = 0
const PERSIST_COOLDOWN_MS = 10_000

function temporalManifoldProposalHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

async function fetchSunNeuralEmbedding(): Promise<number[] | undefined> {
  try {
    const res = await fetch(`${NEURAL_FUSION_URL}/process-current-sun`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return undefined
    const data = await res.json() as any
    return data?.neuralOutput?.neuralEmbedding16 ?? data?.neuralEmbedding16 ?? undefined
  } catch {
    return undefined
  }
}

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

This tool runs the **Solar Isotopic Hammer (v2)** — a multi-dimensional resonance calculation inside the isotopic temporal vortex.

**Structural Resonance Formula:**
The hammer computes a composite score from **four dimensions**:

| Dimension | Weight (4D) | Weight (5D with neural) | Description |
|-----------|-------------|------------------------|-------------|
| Proximity | 0.20 | 0.18 | Gaussian similarity between proposal and sun TDF deltas |
| Phase Alignment | 0.20 | 0.18 | Structural coherence match (1 - |proposalCoherence - sunCoherence|) |
| Vortex Alignment (Volume) | 0.30 | 0.27 | Energy volume fit, log-space ratio (protects small heroes) |
| Synchronization | 0.30 | 0.27 | Temporal cascade alignment — equal weight with volume |
| Spectral Quality | — | 0.10 | NeuralFusion reconstruction quality — how well the model understands this solar state |

**Signal Timing:**
- **Leading** (↑): Proposal cascade is ahead of the sun — anticipatory signal
- **Trailing** (↓): Proposal cascade is behind the sun — reactive signal
- **Synced** (→): Proposal and sun cascades are within 2 steps — aligned
**4D formula: resonanceScore = proximity × 0.20 + phaseAlignment × 0.20 + vortexAlignment × 0.30 + synchronization × 0.30**
**5D formula (when spectralQuality provided): resonanceScore = proximity × 0.18 + phaseAlignment × 0.18 + vortexAlignment × 0.27 + synchronization × 0.27 + spectralQuality × 0.10**

Clamped to [0.15, 0.98]. Sync weight at 0.30 — temporal alignment now equals volume in importance, preventing poor timing from being carried by high proximity alone.

**Key Response Fields:**
- \`structuralResonance\` — composite score (0–1), 4D or 5D resonance
- \`proximity\` — Gaussian similarity of proposal vs sun TDF deltas (0–1)
- \`phaseAlignment\` — coherence match between proposal and sun phase structures (0–1)
- \`vortexAlignment\` — energy volume fit, log-space ratio (0–1, protects small heroes)
- \`synchronization\` — temporal cascade alignment, exponential decay from lag=0 (0–1)
- \`spectralQuality\` — present when NeuralFusion context was provided (0–1)
- \`neuralContextUsed\` — boolean, true if spectralQuality was used in the calculation
- \`crossCorrelationLag\` — absolute cascade index offset between proposal and sun
- \`signalTiming\` — "leading", "trailing", or "synced"
- \`recommendation\` — PASS, NEEDS_REVISION, or REJECT (thresholds depend on solar activity — see adaptive thresholds below)
- \`confidence\` — hammer confidence (0.72–0.93)
- \`solarContext\` — activity level, modification, NOAA timestamp
- \`hammerReason\` — human-readable explanation
- \`adjustedVoteWeight\` — solar-adjusted vote weight (0.5–1.5)
- \`smoothedResonance\` — 3-minute rolling average (if 3+ samples)
- \`trend\` — "rising", "falling", or "stable"
- \`momentum\` — display-only: rate of change per minute (dR/dt)
- \`adaptiveThresholds\` — the decision thresholds applied for this solar activity level:
  - \`strong\` — minimum resonance for strong PASS
  - \`good\` — minimum resonance for good PASS
  - \`weak\` — minimum resonance for NEEDS_REVISION

**Adaptive Decision Thresholds:**
Thresholds shift dynamically based on solar activity level:

| Solar Activity | Strong PASS | Good PASS | NEEDS_REVISION | Effect |
|----------------|-------------|-----------|----------------|--------|
| Quiet          | ≥ 0.82      | ≥ 0.72    | ≥ 0.58         | Easier to PASS — stable conditions |
| Moderate       | ≥ 0.88      | ≥ 0.78    | ≥ 0.62         | Standard thresholds |
| Active         | ≥ 0.88      | ≥ 0.78    | ≥ 0.62         | Standard + confidence penalty |
| Storm          | ≥ 0.92      | ≥ 0.84    | ≥ 0.70         | Harder to PASS — unstable conditions |

Storm override: PASS → NEEDS_REVISION regardless of score, confidence drops 0.12.

**Important notes:**
- Sync weight (0.30) is now equal to volume — prevents proposals with poor timing from being carried by proximity alone
- Log-space vortex alignment means proposals with very different TDF magnitudes aren't unfairly penalized by raw ratio
- \`momentum\` and \`peakForecast\` are display-only — computed for transparency but do not modify confidence or recommendations
- \`spectralQuality\` is an optional 5th dimension from NeuralFusion. When provided, weights automatically rebalance to 0.18/0.18/0.27/0.27/0.10. When absent, the original 4D formula applies. Check \`neuralContextUsed\` in the response to know which was used.

**Input:** \`proposal\` (string), \`baseVoteWeight\` (0.5–1.5, default 1.0), \`sharePublicly\` (boolean, default false — if true, adds proposal to public feed), \`spectralQuality\` (number 0–1, optional — NeuralFusion spectral quality as 5th resonance dimension)

**When to use:**
- Most strategic or high-impact proposals (**recommended default**)
- When real-world solar conditions should influence the decision
- For agentic AI governance, multi-agent policy approval, and autonomous decision gates

**When to use \`evaluate_governance\` instead:**
- Purely technical or low-level protocol decisions
- When you want to exclude external modifiers

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

## HTTP Endpoints (non-tool)

### /public_feed (GET)
Returns the most recent proposals shared publicly via \`govern_with_solar\` (up to 50 entries).
- **Method**: GET
- **Outputs**: \`{ success: true, entries: [{ proposal, resonanceScore, recommendation, activityLevel, timestamp }] }\`
- **Use case**: Display recent governance activity on dashboards.

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

## Solar Isotopic Hammer (v2)

> **Note (May 2026):** Dynamo uses the Solar Isotopic Hammer for per-proposal resonance scoring. The old v1 neural modulation (activity-level-aware gain on metamorphosis/confidence) has been replaced with a direct Gaussian similarity score against live NOAA solar data.

The Solar Isotopic Hammer computes a per-proposal resonance score by:
1. Normalizing proposal text (lowercase, strip punctuation/stop words)
2. Computing per-word FNV-1a fingerprints (mod 999983)
3. XOR-combining word fingerprints into a single proposal delta
4. Comparing against the sun's real-time reference delta (from NOAA GOES data)
5. Applying Gaussian similarity: \`score = exp(-(deltaDiff / 1e6)^2)\`
6. Clamping to [0.15, 0.98] with a fallback of 0.80 on error

Short proposals (< 3 words) are padded with anchor words (\`general\`, \`proposal\`, \`matter\`) for stability.

### Why XOR + Gaussian?

Previous versions used FNV whole-string avalanche hash (which destroyed semantic similarity) and \`calculateIsotopicRatio\` (which floored any delta > ~360k to 0.15). The bag-of-words XOR combiner preserves semantic similarity — related proposals produce related deltas. The Gaussian similarity function gives smooth 0–1 scores across the full delta range.

### Public Feed

When \`sharePublicly: true\` is passed to \`govern_with_solar\`, the proposal and its resonance score are stored in an in-memory ring buffer (max 50 entries). Access via \`GET /public_feed\`.

### Observability

All govern_with_solar responses include:
- \`resonanceScore\` — primary Gaussian similarity (0–1)
- \`recommendation\` — PASS / NEEDS_REVISION / REJECT
- \`confidence\` — hammer confidence level
- \`hammerReason\` — human-readable explanation
- \`solarContext\` — full NOAA activity level, reference TDF, proposal TDF
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

  let ratio = 0.85
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

  const strengths = sigs.flatMap((s, i) =>
    sigs.filter((_, j) => j !== i).map(o => s.crossCorrelate(o).strength)
  )

  const coreResonance = strengths.length > 0
    ? strengths.reduce((sum, s) => sum + s, 0) / strengths.length
    : 0.78

  const volumes = sigs.flatMap((s, i) =>
    sigs.filter((_, j) => j !== i).map(o => {
      const meta = s.crossCorrelate(o).metadata
      return meta?.vortexVolume ?? 1.0e24
    })
  )

  const vortexVolume = volumes.length > 0
    ? volumes.reduce((sum, v) => sum + v, 0) / volumes.length
    : 3.0e25

  return ok(c, {
    signalCount: sigs.length,
    results,
    coreResonance: Math.min(0.99, Math.max(0.5, coreResonance)),
    vortexVolume,
  })
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
      GET: ['/', '/health', '/docs', '/list_isotopes', '/compute_tdf', '/compute_tptt', '/black_hole_sequence', '/validate_tlm', '/harmonic_oscillator', '/get_docs', '/explain_term', '/explain_governance_output', '/public_feed'],
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
    description: 'Enhanced governance with real-time solar context from NOAA GOES. Uses the Solar Isotopic Hammer (bag-of-words XOR + Gaussian similarity) for per-proposal resonance scoring. Optionally accepts spectralQuality from NeuralFusion as a 5th resonance dimension. Accepts a raw proposal string OR a structuredDerivativeProposal object (with summary field).',
    inputSchema: { type: 'object', properties: { proposal: { type: 'string', minLength: 10, description: 'Governance proposal text (alternative to structuredProposal)' }, structuredProposal: { type: 'object', description: 'Structured derivative proposal with summary, intent, stateDelta (alternative to proposal string)' }, baseVoteWeight: { type: 'number', default: 1.0, description: 'Base vote weight (0.5-1.5)' }, sharePublicly: { type: 'boolean', default: false, description: 'If true, adds this proposal to the public feed (GET /public_feed)' },     spectralQuality: { type: 'number', description: 'Optional NeuralFusion spectral quality (0-1). When provided, used as 5th resonance dimension at 10% weight. Weights rebalance to 0.18/0.18/0.27/0.27/0.10. When absent, 4D formula 0.20/0.20/0.30/0.30 applies.' } }, required: [] },
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
    let ratio = 0.85
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
    const rawProposal = args?.proposal ?? args?.structuredProposal
    if (!rawProposal) return { error: 'Either proposal (string) or structuredProposal (object with summary) is required.' }

    const proposalText = extractProposalText(
      isStructuredProposal(rawProposal) ? rawProposal : String(rawProposal)
    )
    if (!proposalText || proposalText.length < 10) return { error: 'Proposal text must be at least 10 characters.' }

    const baseVoteWeight = Math.max(0.5, Math.min(1.5, Number(args?.baseVoteWeight ?? 1)))
    const sharePublicly = args?.sharePublicly === true
    const spectralQuality = args?.spectralQuality !== undefined ? Number(args.spectralQuality) : undefined
    const sunNeuralEmbedding = args?.sunNeuralEmbedding !== undefined ? args.sunNeuralEmbedding : await fetchSunNeuralEmbedding()

    return dynamoSolarGovernance.enhanceGovernanceDecision(proposalText, baseVoteWeight, sharePublicly, spectralQuality, sunNeuralEmbedding)
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

    const normalizedRec = rec.replace(/ /g, '_')
    if (normalizedRec === 'PASS') {
      lines.push('This proposal PASSED governance. The recommendation is to approve and proceed.')
    } else if (normalizedRec === 'REJECT') {
      lines.push('This proposal was REJECTED by governance. The recommendation is to decline and revisit.')
    } else if (normalizedRec === 'NEEDS_REVISION') {
      lines.push('This proposal NEEDS_REVISION. The recommendation is to revise based on the reasoning provided and resubmit.')
    }

    if (solarCtx) {
      lines.push('')
      lines.push('Solar context:')
      lines.push(`  Activity level: ${solarCtx.solarActivityLevel ?? 'unknown'}`)
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
    description: 'Enhanced governance with real-time solar context from NOAA GOES. Uses the Solar Isotopic Hammer (bag-of-words XOR + Gaussian similarity) for per-proposal resonance scoring. Accepts a raw proposal string OR a structured derivative proposal.',
    method: 'POST',
    url: 'https://mcp-production-80e2.up.railway.app/govern_with_solar',
    parameters: {
      proposal: { type: 'string', required: false, minLength: 10, description: 'Governance proposal text (alternative to structuredProposal)' },
      structuredProposal: { type: 'object', required: false, description: 'Structured derivative proposal with summary, intent, stateDelta' },
      baseVoteWeight: { type: 'number', required: false, default: 1.0, min: 0.5, max: 1.5, description: 'Base vote weight (0.5-1.5)' },
      sharePublicly: { type: 'boolean', required: false, default: false, description: 'If true, adds this proposal to the public feed (GET /public_feed)' },
      spectralQuality: { type: 'number', required: false, description: 'Optional NeuralFusion spectral quality (0-1). When provided, used as 5th resonance dimension at 10% weight. Weights rebalance to 0.18/0.18/0.27/0.27/0.10. When absent, 4D formula 0.20/0.20/0.30/0.30 applies.' },
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
    outputs: ['originalRecommendation', 'solarContext', 'adjustedVoteWeight', 'finalRecommendation', 'confidenceAdjustment', 'spectralQuality', 'neuralContextUsed'],
    example: {
      request: '{"proposal":"Deploy new solar observatory","baseVoteWeight":1.0,"spectralQuality":0.82}',
      response: {
        success: true,
        originalRecommendation: 'Deploy new solar observatory',
        solarContext: {
          solarActivityLevel: 'storm',
          solarActivityModifier: -0.15,
          recommendation: 'Solar storm detected - recommend delayed or weighted decisions',
        },
        adjustedVoteWeight: 0.85,
        finalRecommendation: 'Deploy new solar observatory [SOLAR STORM WARNING]',
        confidenceAdjustment: -0.15,
        spectralQuality: 0.82,
        neuralContextUsed: true,
      },
    },
  })
})

app.post('/govern_with_solar', async (c: Context) => {
  const body = await c.req.json()
  const rawProposal = body.proposal ?? body.structuredProposal
  if (!rawProposal || (typeof rawProposal === 'string' && !rawProposal.trim())) {
    return c.json({ success: false, error: 'proposal or structuredProposal required' }, 400)
  }
  const proposalText = extractProposalText(isStructuredProposal(body.structuredProposal) ? body.structuredProposal : String(rawProposal))
  if (!proposalText || !proposalText.trim()) {
    return c.json({ success: false, error: 'proposal text cannot be empty' }, 400)
  }
  const spectralQuality = body.spectralQuality !== undefined ? Number(body.spectralQuality) : undefined
  const sunNeuralEmbedding = body.sunNeuralEmbedding !== undefined ? body.sunNeuralEmbedding : await fetchSunNeuralEmbedding()
  const result = await dynamoSolarGovernance.enhanceGovernanceDecision(proposalText, body.baseVoteWeight ?? 1.0, body.sharePublicly === true, spectralQuality, sunNeuralEmbedding)

  const persistToChain = body.persistToChain === true
  if (persistToChain) {
    // Rate-limit: 1 persist per 60 seconds globally
    const now = Date.now()
    if (now - lastPersistTime < PERSIST_COOLDOWN_MS) {
      const remaining = Math.ceil((PERSIST_COOLDOWN_MS - (now - lastPersistTime)) / 1000)
      return c.json({
        success: true,
        ...result,
        temporalContainer: {
          onChainError: `Rate-limited. Try again in ${remaining}s.`,
        },
      })
    }

    // Resonance gate: only persist non-REJECT verdicts
    const verdict = result.recommendation || result.fullBox7DVerdict
    if (verdict === 'REJECT') {
      return c.json({
        success: true,
        ...result,
        temporalContainer: {
          onChainError: 'Proposal rejected — cannot persist to chain.',
        },
      })
    }

    lastPersistTime = now
    const source = determineSource(isStructuredProposal(body.structuredProposal) ? body.structuredProposal : String(rawProposal))
    const container = governanceToContainer(result, proposalText, source, latestContainerHash)
    containerStore.push(container)
    latestContainerHash = container.containerHash

    // Feed into Temporal Manifold
    temporalManifold.addFromContainer(container, proposalText)

    // Persist container to Redis for durability across deploys
    ;(async () => {
      try {
        const client = await getRedisClient()
        if (client) {
          await client.multi()
            .lpush(REDIS_CONTAINER_KEY, JSON.stringify(container))
            .ltrim(REDIS_CONTAINER_KEY, 0, MAX_REDIS_CONTAINERS - 1)
            .exec()
        }
      } catch { /* Redis unavailable */ }
    })()

    let onChain: { txHash: string } | null = null
    try {
      onChain = await persistContainerToChain(container)
    } catch (err: any) {
      return c.json({
        success: true,
        ...result,
        temporalContainer: {
          containerId: container.containerId,
          containerHash: container.containerHash,
          source: container.source,
          timestamp: container.timestamp,
        },
        onChainError: err.message,
      })
    }

    // Auto-mint vortex token on v4 (fire-and-forget)
    ;(async () => {
      await autoMintVortex(container, proposalText)
    })()

    return c.json({
      success: true,
      ...result,
      temporalContainer: {
        containerId: container.containerId,
        containerHash: container.containerHash,
        source: container.source,
        timestamp: container.timestamp,
        onChainTx: onChain.txHash,
        explorerUrl: `https://basescan.org/tx/${onChain.txHash}`,
      },
    })
  }

  // Feed non-persisted governance result into Temporal Manifold
  temporalManifold.addPoint({
    timestamp: Date.now(),
    proposalHash: temporalManifoldProposalHash(proposalText),
    source: 'human',
    solarActivity: result.solarContext?.solarActivityLevel ?? 'quiet',
    resonance7D: result.fullBox7DComposite ?? 0.5,
    phaseAlignment: result.phaseAlignment ?? 0.5,
    vortexAlignment: result.calibratedVortex ?? 0.5,
    synchronization: result.synchronization ?? 0.5,
    gematriaResonance: result.gematriaResonance ?? 0.5,
    tmoScore: result.trinitariumMoralScore ?? 0.5,
    verdict: result.recommendation ?? result.fullBox7DVerdict ?? 'NEEDS_REVISION',
  }, proposalText)

  return c.json({ success: true, ...result })
})

app.get('/public_feed', (c: Context) => {
  return c.json({ success: true, entries: getPublicFeed() })
})

app.get('/containers', async (c: Context) => {
  const offset = parseInt(c.req.query('offset') || '0', 10)
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100)
  const page = containerStore.slice(offset, offset + limit)

  // Fetch proposal text from Temporal Manifold
  const points = temporalManifold.getAllPoints()
  const proposalMap = new Map<string, string>()
  for (const point of points) {
    if (point.proposalHash && point.summary) {
      proposalMap.set(point.proposalHash, point.summary)
    }
  }

  // Add proposalText to containers
  const containersWithText = page.map(container => ({
    ...container,
    proposalText: proposalMap.get(container.proposalHash) || undefined
  }))

  return c.json({ success: true, containers: containersWithText, total: containerStore.length, offset, limit })
})

app.get('/containers/:id', (c: Context) => {
  const id = c.req.param('id')
  const container = containerStore.find(v => v.containerId === id)
  if (!container) return c.json({ success: false, error: 'Container not found' }, 404)
  return c.json({ success: true, container })
})

app.get('/ambient/status', (c: Context) => {
  return c.json({
    success: true,
    isRunning: ambientField.isRunning,
    totalVortices: ambientField.totalVortices,
    momentum: ambientField.getFieldMomentum(),
  })
})

// ── Temporal Manifold API ──

app.post('/manifold/sample-now', async (c: Context) => {
  try {
    await ambientField.forceTick()
    return c.json({ success: true, message: 'Ambient field tick forced' })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

app.get('/manifold/status', (c: Context) => {
  return c.json({
    success: true,
    ...temporalManifold.getStatus(),
  })
})

app.get('/manifold/trend', (c: Context) => {
  const hours = Math.min(parseInt(c.req.query('hours') || '24', 10) || 24, 720)
  const trend = temporalManifold.getFieldTrend(hours * 60 * 60 * 1000)
  return c.json({ success: true, trend })
})

app.get('/manifold/resonance-at', (c: Context) => {
  const ts = parseInt(c.req.query('timestamp') || '', 10)
  if (!ts) return c.json({ success: false, error: 'timestamp (ms) required' }, 400)
  const query = temporalManifold.interpolateAt(ts)
  return c.json({ success: true, query })
})

app.get('/manifold/strongest', (c: Context) => {
  const minRes = parseFloat(c.req.query('minResonance') || '0.75')
  const limit = Math.min(parseInt(c.req.query('limit') || '10', 10), 50)
  const points = temporalManifold.getStrongestMoments(minRes, limit)
  return c.json({ success: true, points, count: points.length })
})

app.get('/manifold/axioms', (c: Context) => {
  const minRes = parseFloat(c.req.query('minResonance') || '0.80')
  const minOcc = Math.max(1, parseInt(c.req.query('minOccurrences') || '3', 10))
  const axioms = temporalManifold.getAxioms(minRes, minOcc)
  return c.json({ success: true, axioms, count: axioms.length })
})

app.get('/manifold/ambient-activity', (c: Context) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100)
  const activity = ambientField.getRecentActivity(limit)
  return c.json({ success: true, activity, count: activity.length })
})

app.get('/manifold/points', (c: Context) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '100', 10), 1000)
  const points = temporalManifold.getAllPoints().slice(-limit)
  return c.json({ success: true, points, count: points.length, total: temporalManifold.getPointCount() })
})

app.get('/history', async (c: Context) => {
  const n = Math.min(parseInt(c.req.query('n') || '100', 10) || 100, 1000)
  const entries = await getHistory(n)
  return c.json({ success: true, entries, count: entries.length })
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

  const normalizedRec = rec.replace(/ /g, '_')
  if (normalizedRec === 'PASS') lines.push('This proposal PASSED governance. The recommendation is to approve and proceed.')
  else if (normalizedRec === 'REJECT') lines.push('This proposal was REJECTED by governance. The recommendation is to decline and revisit.')
  else if (normalizedRec === 'NEEDS_REVISION') lines.push('This proposal NEEDS_REVISION. The recommendation is to revise based on the reasoning provided and resubmit.')

  if (solarCtx) {
    lines.push('')
    lines.push('Solar context:')
    lines.push(`  Activity level: ${solarCtx.solarActivityLevel ?? 'unknown'}`)
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

// ---------- Vortex Token endpoints ----------

const VORTEX_TOKEN_ADDRESS = '0x7E410f102Cc7320fd8B9601637f5A67AfDF40cF9'
const VORTEX_TREASURY = '0xd45CcF98D6db5A36E7CdD10ffae0b685BF27CE43'

function getVortexTokenClient() {
  const account = privateKeyToAccount(getPrivateKey())
  const walletClient = createWalletClient({
    account,
    chain: baseMainnet,
    transport: buildFallbackTransport(),
  })
  const publicClient = createPublicClient({
    chain: baseMainnet,
    transport: buildReadTransport(),
  })
  return { walletClient, publicClient, account }
}

app.get('/vortex/info', async (c: Context) => {
  try {
    const abi = (await import('./lib/abi/VortexTokenV41.json', { with: { type: 'json' } })).default as any[]
    const { publicClient } = getVortexTokenClient()
    const [totalSupply, totalDonations, treasury] = await Promise.all([
      publicClient.readContract({ address: VORTEX_TOKEN_ADDRESS, abi, functionName: 'totalSupply' }) as Promise<bigint>,
      publicClient.readContract({ address: VORTEX_TOKEN_ADDRESS, abi, functionName: 'totalDonations' }) as Promise<bigint>,
      publicClient.readContract({ address: VORTEX_TOKEN_ADDRESS, abi, functionName: 'treasury' }) as Promise<string>,
    ])
    return c.json({
      success: true,
      tokenAddress: VORTEX_TOKEN_ADDRESS,
      registryAddress: CONTRACT_ADDRESS,
      totalSupply: totalSupply.toString(),
      totalDonations: totalDonations.toString(),
      treasury,
      explorerUrl: `https://basescan.org/address/${VORTEX_TOKEN_ADDRESS}`,
    })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

app.get('/vortex/container/:containerId', async (c: Context) => {
  try {
    const containerId = c.req.param('containerId') as `0x${string}`
    const abi = (await import('./lib/abi/VortexTokenV41.json', { with: { type: 'json' } })).default as any[]
    const registryAbi = (await import('./lib/abi/TemporalContainerRegistry.json', { with: { type: 'json' } })).default as any[]
    const { publicClient } = getVortexTokenClient()

    // Check Redis cache first
    let hasToken = false
    let tokenId: bigint | null = null
    try {
      const client = await getRedisClient()
      if (client) {
        const cached = await client.hget(REDIS_VORTEX_KEY_MINT, containerId.toLowerCase()).catch(() => null) as string | null
        if (cached) {
          hasToken = true
          tokenId = BigInt(cached)
        }
      }
    } catch { /* Redis optional */ }

    if (!hasToken) {
      const tid = await publicClient.readContract({
        address: VORTEX_TOKEN_ADDRESS, abi,
        functionName: 'tokenByContainerId',
        args: [containerId],
      }).catch(() => 0n) as bigint
      hasToken = tid !== 0n
      tokenId = hasToken ? tid : null
    }

    // Always fetch container data from registry (needed for UI even if token exists)
    let containerData: Record<string, any> | null = null
    try {
      const registryClient = createPublicClient({ chain: baseMainnet, transport: buildReadTransport() })
      const container = await registryClient.readContract({
        address: CONTRACT_ADDRESS, abi: registryAbi,
        functionName: 'getContainer',
        args: [containerId],
      }) as any
      containerData = {
        containerId,
        timestamp: Number(container.timestamp),
        verdict: container.resonanceProfile.verdict,
        fullBox7DComposite: container.resonanceProfile.fullBox7DComposite.toString(),
        trinitariumMoralScore: container.moralOverlay.trinitariumMoralScore.toString(),
        moralTension: container.moralOverlay.moralNumerologicalTension,
        source: container.source,
      }
    } catch { /* container might not exist in this registry */ }

    return c.json({
      success: true,
      containerId,
      hasToken,
      tokenId: hasToken ? tokenId!.toString() : null,
      containerData,
      mintFunction: 'mintForDonation',
      contractAddress: VORTEX_TOKEN_ADDRESS,
      vortexUrl: hasToken ? `https://basescan.org/token/${VORTEX_TOKEN_ADDRESS}?a=${tokenId!.toString()}` : null,
    })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// Retro-mint a token for an existing registered container via v4 mint()
app.post('/vortex/mint', async (c: Context) => {
  try {
    const { containerId, to } = await c.req.json()
    if (!containerId) return c.json({ success: false, error: 'containerId required' }, 400)
    if (!to) return c.json({ success: false, error: 'recipient address (to) required' }, 400)

    const abi = (await import('./lib/abi/VortexTokenV41.json', { with: { type: 'json' } })).default as any[]
    const registryAbi = (await import('./lib/abi/TemporalContainerRegistry.json', { with: { type: 'json' } })).default as any[]
    const { walletClient, publicClient } = getVortexTokenClient()

    // Read container data from registry (or MCP store for non-registered containers)
    let container: any
    try {
      container = await publicClient.readContract({
        address: CONTRACT_ADDRESS, abi: registryAbi,
        functionName: 'getContainer',
        args: [containerId as `0x${string}`],
      }) as any
    } catch {
      // Not on-chain — look up in MCP container store and auto-register
      const stored = containerStore.find(c => c.containerId === containerId)
      if (!stored) return c.json({ success: false, error: 'Container not found in registry or MCP store' }, 404)
      await persistContainerToChain(stored)
      // Re-read after registration
      container = await publicClient.readContract({
        address: CONTRACT_ADDRESS, abi: registryAbi,
        functionName: 'getContainer',
        args: [containerId as `0x${string}`],
      }) as any
    }

    const mintArgs = [
      to as `0x${string}`,
      containerId as `0x${string}`,
      {
        containerId: containerId as `0x${string}`,
        timestamp: container.timestamp,
        verdict: container.resonanceProfile.verdict,
        fullBox7DComposite: container.resonanceProfile.fullBox7DComposite,
        trinitariumMoralScore: container.moralOverlay.trinitariumMoralScore,
        trinitariumGematriaFusion: container.moralOverlay.trinitariumGematriaFusion,
        moralTension: container.moralOverlay.moralNumerologicalTension,
        waveProximity: container.resonanceProfile.waveProximity,
        phaseAlignment: container.resonanceProfile.phaseAlignment,
        calibratedVortex: container.resonanceProfile.calibratedVortex,
        calibratedSync: container.resonanceProfile.calibratedSync,
        neuralProximity: container.resonanceProfile.neuralProximity,
        neuralVortex: container.resonanceProfile.neuralVortex,
        gematriaResonance: container.resonanceProfile.gematriaResonance,
        virtueAlignment: container.moralOverlay.virtueAlignment,
        moralSafety: container.moralOverlay.moralSafety,
        intentAlignment: container.moralOverlay.intentAlignment,
        source: container.source,
        containerHash: container.containerHash,
        hammerReason: container.hammerReason || '',
        proposalText: '',
      },
    ]

    const txHash = await walletClient.writeContract({
      address: VORTEX_TOKEN_ADDRESS,
      abi,
      functionName: 'mint',
      args: mintArgs,
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

    // Cache in Redis and get tokenId from receipt
    let tokenId: string | null = null
    try {
      const tid = await publicClient.readContract({
        address: VORTEX_TOKEN_ADDRESS, abi,
        functionName: 'tokenByContainerId',
        args: [containerId as `0x${string}`],
      }).catch(() => 0n)
      if (tid !== 0n) {
        tokenId = tid.toString()
        await storeVortexStatusInRedis(containerId, tokenId)
      }
    } catch { /* Redis optional */ }

    return c.json({
      success: true,
      tokenAddress: VORTEX_TOKEN_ADDRESS,
      containerId,
      to,
      tokenId,
      txHash: receipt.transactionHash,
      explorerUrl: `https://basescan.org/tx/${receipt.transactionHash}`,
    })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// Store a container→token mapping in Redis (for pre-minted tokens)
app.post('/vortex/store-mapping', async (c: Context) => {
  try {
    const { containerId, tokenId } = await c.req.json()
    if (!containerId || !tokenId) return c.json({ success: false, error: 'containerId and tokenId required' }, 400)
    await storeVortexStatusInRedis(containerId, tokenId.toString())
    return c.json({ success: true, containerId, tokenId })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// Batch vortex statuses — uses Redis cache with on-chain fallback
app.get('/vortex/statuses', async (c: Context) => {
  try {
    const abi = (await import('./lib/abi/VortexTokenV41.json', { with: { type: 'json' } })).default as any[]
    const { publicClient } = getVortexTokenClient()

    // Use all container IDs from the MCP's container store (not just on-chain ones)
    const containerIds = containerStore.map(c => c.containerId) as `0x${string}`[]
    const statuses: Record<string, { claimed: boolean; tokenId: string | null }> = {}

    // Try Redis batch
    let redisMap: Record<string, string> | null = null
    try {
      const client = await getRedisClient()
      if (client) {
        const entries = await client.hgetall(REDIS_VORTEX_KEY_MINT).catch(() => null) as Record<string, string> | null
        if (entries) redisMap = entries
      }
    } catch { /* Redis optional */ }

    for (const cid of containerIds) {
      const cidStr = cid.toLowerCase()
      if (redisMap?.[cidStr]) {
        statuses[cid] = { claimed: true, tokenId: redisMap[cidStr] }
      } else {
        const tid = await publicClient.readContract({
          address: VORTEX_TOKEN_ADDRESS, abi,
          functionName: 'tokenByContainerId',
          args: [cid],
        }).catch(() => 0n)
        statuses[cid] = tid !== 0n
          ? { claimed: true, tokenId: tid.toString() }
          : { claimed: false, tokenId: null }
      }
    }

    return c.json({ success: true, statuses })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// Generate SVG image for a vortex token
const VORTEX_SVG_COLORS: Record<string, string> = {
  'PASS': '#10b981',
  'NEEDS_REVISION': '#f59e0b',
  'FAIL': '#ef4444',
}
const VORTEX_TENSION_COLORS: Record<string, string> = {
  'Aligned': '#10b981',
  'Mild': '#f59e0b',
  'Significant': '#f97316',
}
function vortexSvgColor(verdict: string): string { return VORTEX_SVG_COLORS[verdict] || '#ef4444' }
function vortexTensionColor(tension: string): string { return VORTEX_TENSION_COLORS[tension] || '#ef4444' }
function vortexScoreColor(val: bigint): string {
  if (val >= 780000000000000000n) return '#10b981'
  if (val >= 500000000000000000n) return '#f59e0b'
  return '#ef4444'
}
function vortexPct(val: bigint): string {
  const pct = Number(val / 10n ** 16n)
  return Math.min(pct, 100).toString() + '%'
}
function vortexPctNum(val: bigint): number {
  return Math.min(Number(val / 10n ** 16n), 100)
}
function vortexShortId(cid: string): string {
  return (cid.startsWith('0x') ? cid.slice(2, 10) : cid.slice(0, 8)).toLowerCase()
}

function vortexSvg(tokenId: string, containerData: any): string {
  const parseBig = (v: any): bigint => v ? BigInt(v.toString()) : 0n
  const verdict = containerData.verdict || ''
  const tension = containerData.moralTension || ''
  const vc = vortexSvgColor(verdict)
  const tc = vortexTensionColor(tension)
  const source = containerData.source || ''
  const cid = containerData.containerId || ''
  const ts = containerData.timestamp ? Number(containerData.timestamp) * 1000 : 0
  const hammerReason = containerData.hammerReason || ''
  const sourceColor = source === 'ai' ? '#8b5cf6' : '#06b6d4'
  const sourceLabel = source === 'ai' ? 'AI' : 'Human'
  const badgeW = sourceLabel === 'AI' ? 36 : 52
  const dateStr = ts ? new Date(ts).toISOString().slice(0, 10) : ''

  const compositeVal = parseBig(containerData.fullBox7DComposite)
  const compositePct = Math.min(Number(compositeVal) / 1e16, 100)
  const compositeFmt = compositePct.toFixed(1)

  const tmoVal = parseBig(containerData.trinitariumMoralScore)
  const tmoPct = Math.min(Number(tmoVal) / 1e16, 100)
  const tmoFmt = tmoPct.toFixed(1)

  const ringR = 54
  const circ = 2 * Math.PI * ringR
  const dashOff = circ * (1 - compositePct / 100)

  const wrap = (text: string, max: number): string[] => {
    const words = text.split(' ')
    const lines: string[] = []
    let cur = ''
    for (const w of words) {
      const next = (cur + ' ' + w).trim()
      if (next.length > max && cur.length > 0) {
        lines.push(cur.trim())
        cur = w
      } else {
        cur = next
      }
    }
    if (cur.trim()) lines.push(cur.trim())
    return lines.slice(0, 3)
  }
  const msgLines = hammerReason ? wrap(hammerReason, 22) : []

  // Cosmic particles from tokenId
  const particles = Array.from({ length: 6 }, (_, i) => {
    const seed = (parseInt(tokenId) * (i + 1) * 7) % 360
    const angle = (seed * Math.PI) / 180
    const r = 40 + (seed % 141)
    const px = 175 + Math.cos(angle) * r
    const py = 175 + Math.sin(angle) * r
    const sz = 1 + (seed % 3)
    const op = (0.05 + (seed % 5) * 0.025).toFixed(2)
    return `<circle cx="${px.toFixed(0)}" cy="${py.toFixed(0)}" r="${sz}" fill="#fff" opacity="${op}"/>`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="350" viewBox="0 0 350 350">
<defs><radialGradient id="g"><stop offset="0%" stop-color="${vc}" stop-opacity=".08"/><stop offset="100%" stop-color="${vc}" stop-opacity="0"/></radialGradient></defs>
<rect width="350" height="350" fill="#16162a"/>
<circle cx="175" cy="185" r="115" fill="url(#g)"/>
${particles}
<circle cx="310" cy="35" r="18" fill="none" stroke="#f59e0b" stroke-width=".5" opacity=".08"/>
<line x1="310" y1="10" x2="310" y2="8" stroke="#f59e0b" stroke-width="1" opacity=".1"/>
<line x1="310" y1="60" x2="310" y2="62" stroke="#f59e0b" stroke-width="1" opacity=".1"/>
<line x1="285" y1="35" x2="283" y2="35" stroke="#f59e0b" stroke-width="1" opacity=".1"/>
<line x1="335" y1="35" x2="337" y2="35" stroke="#f59e0b" stroke-width="1" opacity=".1"/>
<line x1="292" y1="17" x2="290" y2="15" stroke="#f59e0b" stroke-width="1" opacity=".08"/>
<line x1="328" y1="53" x2="330" y2="55" stroke="#f59e0b" stroke-width="1" opacity=".08"/>
<line x1="292" y1="53" x2="290" y2="55" stroke="#f59e0b" stroke-width="1" opacity=".08"/>
<line x1="328" y1="17" x2="330" y2="15" stroke="#f59e0b" stroke-width="1" opacity=".08"/>
<text x="25" y="24" font-family="DejaVu Sans Mono, monospace" font-size="10" fill="#555" font-weight="bold">VORTEX #${tokenId} · ${dateStr}</text>
<rect x="${350 - badgeW - 16}" y="12" width="${badgeW}" height="16" rx="8" fill="${sourceColor}" opacity=".2"/>
<text x="${350 - badgeW / 2 - 16}" y="24" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="8" fill="${sourceColor}">${sourceLabel}</text>
${msgLines.map((l, i) => `<text x="175" y="${58 + i * 23}" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="16" font-weight="bold" fill="${vc}" opacity=".95">${l}</text>`).join('')}
<circle cx="175" cy="${msgLines.length ? 190 : 175}" r="${ringR + 6}" fill="none" stroke="${vc}" stroke-width="3" opacity=".08"/>
<circle cx="175" cy="${msgLines.length ? 190 : 175}" r="${ringR}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="7"/>
<circle cx="175" cy="${msgLines.length ? 190 : 175}" r="${ringR}" fill="none" stroke="${vc}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${dashOff}" transform="rotate(-90 175 ${msgLines.length ? 190 : 175})"/>
<text x="175" y="${(msgLines.length ? 190 : 175) + 2}" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="34" font-weight="bold" fill="#eee">${compositeFmt}%</text>
<text x="175" y="${(msgLines.length ? 190 : 175) + 22}" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="8" fill="#555">7D COMPOSITE</text>
<text x="175" y="${(msgLines.length ? 190 : 175) + 38}" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="8" fill="#444">TMO ${tmoFmt}%</text>
<rect x="22" y="278" width="130" height="28" rx="14" fill="${vc}" opacity=".32"/>
<text x="87" y="296" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="bold" fill="${vc}">${verdict}</text>
<rect x="198" y="278" width="130" height="28" rx="14" fill="${tc}" opacity=".12"/>
<text x="263" y="296" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="${tc}">${tension}</text>
<text x="175" y="335" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="8" fill="#2a2a40">Anchored on Base</text>
</svg>`
}

app.get('/vortex/token-image/:tokenId', async (c: Context) => {
  try {
    const tokenId = c.req.param('tokenId')
    const format = c.req.query('format') || 'png'
    const abi = (await import('./lib/abi/VortexTokenV41.json', { with: { type: 'json' } })).default as any[]
    const { publicClient } = getVortexTokenClient()
    const data = await publicClient.readContract({
      address: VORTEX_TOKEN_ADDRESS,
      abi,
      functionName: 'getContainerData',
      args: [BigInt(tokenId)],
    })
    const svg = vortexSvg(tokenId, data)
    if (format === 'png') {
      const sharp = (await import('sharp')).default
      const png = await sharp(Buffer.from(svg)).resize(350, 350).png().toBuffer()
      c.header('Content-Type', 'image/png')
      c.header('Cache-Control', 'public, max-age=86400')
      return c.body(png)
    }
    c.header('Content-Type', 'image/svg+xml')
    c.header('Cache-Control', 'public, max-age=86400')
    return c.body(svg)
  } catch (err: any) {
    return c.body(`<svg xmlns="http://www.w3.org/2000/svg" width="350" height="350"><rect width="350" height="350" fill="#1a1a2e"/><text x="175" y="180" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10" fill="#555">Token not found</text></svg>`, 200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=60' })
  }
})

async function storeVortexStatusInRedis(containerId: string, tokenId: string) {
  try {
    const client = await getRedisClient()
    if (client) await client.hset(REDIS_VORTEX_KEY_MINT, containerId.toLowerCase(), tokenId)
  } catch { /* Redis optional */ }
}

// Auto-mint token for newly governed containers (v4)
async function autoMintVortex(container: any, proposalText: string) {
  try {
    const abi = (await import('./lib/abi/VortexTokenV41.json', { with: { type: 'json' } })).default as any[]
    const { walletClient, publicClient } = getVortexTokenClient()
    const truncated = proposalText.slice(0, 140)

    const SCALE_1E18 = 1e18
    const s = (v: number) => BigInt(Math.round(v * SCALE_1E18))

    const txHash = await walletClient.writeContract({
      address: VORTEX_TOKEN_ADDRESS,
      abi,
      functionName: 'mint',
      args: [
        VORTEX_TREASURY,
        container.containerHash as `0x${string}`,
        {
          containerId: container.containerId,
          timestamp: BigInt(container.timestamp),
          verdict: container.resonanceProfile.verdict,
          fullBox7DComposite: s(container.resonanceProfile.fullBox7DComposite),
          trinitariumMoralScore: s(container.moralOverlay.trinitariumMoralScore),
          trinitariumGematriaFusion: s(container.moralOverlay.trinitariumGematriaFusion),
          moralTension: container.moralOverlay.moralNumerologicalTension,
          waveProximity: s(container.resonanceProfile.waveProximity),
          phaseAlignment: s(container.resonanceProfile.phaseAlignment),
          calibratedVortex: s(container.resonanceProfile.calibratedVortex),
          calibratedSync: s(container.resonanceProfile.calibratedSync),
          neuralProximity: s(container.resonanceProfile.neuralProximity),
          neuralVortex: s(container.resonanceProfile.neuralVortex),
          gematriaResonance: s(container.resonanceProfile.gematriaResonance),
          virtueAlignment: s(container.moralOverlay.virtueAlignment),
          moralSafety: s(container.moralOverlay.moralSafety),
          intentAlignment: s(container.moralOverlay.intentAlignment),
          source: container.source,
          containerHash: container.containerHash,
          hammerReason: container.hammerReason || '',
          proposalText: truncated,
        },
      ],
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

    // Cache tokenId in Redis
    ;(async () => {
      try {
        const tid = await publicClient.readContract({
          address: VORTEX_TOKEN_ADDRESS, abi,
          functionName: 'tokenByContainerId',
          args: [container.containerHash as `0x${string}`],
        }).catch(() => 0n)
        if (tid !== 0n) await storeVortexStatusInRedis(container.containerHash, tid.toString())
      } catch { /* Redis optional */ }
    })()

    console.log(`[vortex] Auto-minted v4 token for container ${container.containerHash.slice(0, 18)}… tx: ${receipt.transactionHash}`)
    return receipt.transactionHash
  } catch (err: any) {
    console.log(`[vortex] Auto-mint skipped: ${err.message}`)
    return null
  }
}

export default app
export { app, TOOL_DEFINITIONS }
