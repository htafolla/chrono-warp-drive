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

// Root — tool index
app.get('/', (c: Context) => {
  return c.json({
    name: 'blurrn-mcp',
    version: '4.8.3',
    tools: 17,
    endpoints: {
      GET: ['/', '/health', '/list_isotopes', '/compute_tdf', '/compute_tptt', '/black_hole_sequence', '/validate_tlm', '/harmonic_oscillator'],
      POST: ['/emit_isotopic_signal', '/cross_correlate', '/compute_tdf', '/list_isotopes', '/triangulate_signals', '/fuse_symbiotic', '/optimize_cascade', '/get_phase_coherence', '/compute_tptt', '/black_hole_sequence', '/kuramoto_sync', '/wave_function', '/harmonic_oscillator', '/validate_tlm', '/governance', '/govern_with_solar', '/call_connected_tool'],
    },
  })
})

// Health
app.get('/health', (c: Context) => {
  return c.json({
    status: 'ok',
    name: 'blurrn-mcp',
    version: '4.8.3',
    tools: 17,
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
    description: 'Compute TDF = tPTT(T_c, P_s, E_t, delta_t) * TAU * (1 / BlackHole_Seq(voids, n)). Full temporal displacement chain from the v4.8 spec.',
    inputSchema: { type: 'object', properties: { T_c: { type: 'number', default: 137, description: 'Temporal constant' }, P_s: { type: 'number', default: 1.0, description: 'Power spectral' }, E_t: { type: 'number', default: 0.5, description: 'Entropy' }, delta_t: { type: 'number', default: 1e-6, description: 'Time step' }, voids: { type: 'number', default: 7, description: 'Voids for BlackHole_Seq' }, bhs_n: { type: 'number', default: 3, description: 'Exponent for BlackHole_Seq' } } },
  },
  {
    name: 'emit_isotopic_signal',
    description: 'Emit and store an isotopic signal. Returns signalId, isotopicRatio, phaseCoherence, tdfValue. Optionally accepts referenceId for pairwise ratio.',
    inputSchema: { type: 'object', properties: { content: { type: 'string', description: 'Signal content' }, tdf: { type: 'number', default: 5.781e12, description: 'TDF value' }, cascadeIndex: { type: 'number', default: 42, description: 'Cascade index' }, referenceId: { type: 'string', description: 'Reference signal ID for pairwise isotopic ratio' } }, required: ['content'] },
  },
  {
    name: 'cross_correlate',
    description: 'Cross-correlate two isotopic signals. Returns strength, lag, vortexVolume (W x M = V), and pairwise isotopicRatio.',
    inputSchema: { type: 'object', properties: { contentA: { type: 'string', description: 'First signal content' }, contentB: { type: 'string', description: 'Second signal content (optional, defaults to reference)' } }, required: ['contentA'] },
  },
  {
    name: 'list_isotopes',
    description: 'List all available isotopes including standard (C-12, C-14) and Blurrn-themed (Trinitarium-166, Chronovium-865, Vortexite-528).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'triangulate_signals',
    description: 'Triangulate 2+ signals with fingerprinting and cross-correlation matrix.',
    inputSchema: { type: 'object', properties: { signals: { type: 'array', items: { type: 'object', properties: { content: { type: 'string' }, tdf: { type: 'number' } } }, minItems: 2 } }, required: ['signals'] },
  },
  {
    name: 'fuse_symbiotic',
    description: 'Fuse signals symbiotically (not aggregation — polymorphic fusion preserving phase relationships).',
    inputSchema: { type: 'object', properties: { partners: { type: 'array', items: { type: 'object', properties: { content: { type: 'string' } } }, minItems: 2 } }, required: ['partners'] },
  },
  {
    name: 'optimize_cascade',
    description: 'Optimize cascade iteration efficiency with configurable deltaPhase.',
    inputSchema: { type: 'object', properties: { n: { type: 'number', default: 100, description: 'Iteration count (max 5000)' }, deltaPhase: { type: 'number', default: 0.1, description: 'Phase delta' } } },
  },
  {
    name: 'get_phase_coherence',
    description: 'Get phase coherence of a stored signal by ID. Checks in-memory store first (from emit_isotopic_signal), falls back to reconstruction.',
    inputSchema: { type: 'object', properties: { signalId: { type: 'string', description: 'Signal ID from emit_isotopic_signal' } }, required: ['signalId'] },
  },
  {
    name: 'compute_tptt',
    description: 'Standalone tPTT = T_c * (P_s / E_t) * PHI * (C / delta_t). Temporal Photonic Transpondent Transporter.',
    inputSchema: { type: 'object', properties: { T_c: { type: 'number', default: 137 }, P_s: { type: 'number', default: 1.0 }, E_t: { type: 'number', default: 0.5 }, delta_t: { type: 'number', default: 1e-6 } } },
  },
  {
    name: 'black_hole_sequence',
    description: 'Standalone BlackHole_Seq = (L * voids * PHI^n) % PI. L=3, PHI=1.666.',
    inputSchema: { type: 'object', properties: { voids: { type: 'number', default: 7 }, n: { type: 'number', default: 3 } } },
  },
  {
    name: 'kuramoto_sync',
    description: 'Kuramoto phase synchronization with push-pull dynamics. Returns frequency update and phase coherence order parameter R.',
    inputSchema: { type: 'object', properties: { phases: { type: 'array', items: { type: 'number' }, minItems: 2 }, frequencies: { type: 'array', items: { type: 'number' }, minItems: 2 }, fractalToggle: { type: 'boolean', default: false }, isotope: { type: 'string', default: 'C-12' }, phaseType: { type: 'string', enum: ['push', 'pull'], default: 'push' }, oscillatorIndex: { type: 'number', default: 0 } }, required: ['phases', 'frequencies'] },
  },
  {
    name: 'wave_function',
    description: 'Compute wave amplitude with isotope modulation. Uses G=1.0, FREQ=528, PHI=1.666.',
    inputSchema: { type: 'object', properties: { x: { type: 'number', default: 1.0 }, t: { type: 'number', default: 0.0 }, n: { type: 'number', default: 1 }, isotope: { type: 'string', default: 'C-12' }, lambda: { type: 'number', default: 0.53 }, phaseType: { type: 'string', enum: ['push', 'pull'], default: 'push' } } },
  },
  {
    name: 'harmonic_oscillator',
    description: 'P_o = sin(2pi * 528 * t + pi / PHI). Harmonic oscillator frequency calculation.',
    inputSchema: { type: 'object', properties: { t: { type: 'number', default: 0.0, description: 'Time' } } },
  },
  {
    name: 'validate_tlm',
    description: 'Validate Trinitarium ratio is within [1.566, 1.766]. Returns boolean.',
    inputSchema: { type: 'object', properties: { phi: { type: 'number', default: 1.666, description: 'PHI to validate' } } },
  },
  {
    name: 'evaluate_governance',
    description: 'Evaluate a proposal through the Dynamo Governance Layer. Emits isotopic signal, cross-correlates with code diff, triangulates agent reviews, fuses symbiotically, and applies Blurrn-native decision matrix. Returns recommendation (PASS/REJECT/NEEDS REVISION), confidence, voteWeight, and reasoning.',
    inputSchema: { type: 'object', properties: { proposalId: { type: 'string', minLength: 3, description: 'Proposal identifier' }, proposalText: { type: 'string', minLength: 30, description: 'Full proposal text' }, codeDiff: { type: 'string', description: 'Optional code diff for correlation' }, agentReviews: { type: 'array', items: { type: 'string' }, minItems: 1, description: 'Agent review texts' }, historicalSignalIds: { type: 'array', items: { type: 'string' }, description: 'Past signal IDs for historical coherence' } }, required: ['proposalId', 'proposalText', 'agentReviews'] },
  },
  {
    name: 'govern_with_solar',
    description: 'Enhanced governance decision with real-time solar context from NOAA GOES. Fetches current solar activity level (quiet/moderate/active/storm), adjusts vote weight and confidence based on solar conditions, and returns enhanced recommendation with solar warnings.',
    inputSchema: { type: 'object', properties: { proposal: { type: 'string', minLength: 10, description: 'Governance proposal text' }, baseVoteWeight: { type: 'number', default: 1.0, description: 'Base vote weight (0.5-1.5)' } }, required: ['proposal'] },
  },
  {
    name: 'call_connected_tool',
    description: 'Universal tool dispatcher. Call any connected tool by name with its parameters. Acts as a proxy/router to all available tools.',
    inputSchema: { type: 'object', properties: { tool_name: { type: 'string', description: 'Name of the tool to call (e.g. compute_tdf, govern_with_solar, process_current_sun)' }, params: { type: 'object', description: 'Tool-specific parameters as a JSON object' } }, required: ['tool_name'] },
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
}

// ===== Governance Layer =====
app.route('/', createGovernanceRouter(TOOL_HANDLERS))

app.post('/govern_with_solar', async (c: Context) => {
  const body = await c.req.json()
  const result = await dynamoSolarGovernance.enhanceGovernanceDecision(body.proposal, body.baseVoteWeight ?? 1.0)
  return c.json({ success: true, ...result })
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

// SSE session store — uses Redis Pub/Sub (production) or in-memory EventEmitter (dev/test)
app.get('/sse', (c: Context) => {
  const sessionId = crypto.randomUUID()
  const channel = `session:${sessionId}`

  const cleanup = () => {
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
    return c.json({ error: 'Invalid or expired session' }, 400)
  }

  const body = await c.req.json()
  const result = await handleMCPMessage(sessionId, body)
  if (result) {
    const delivered = await publish(`session:${sessionId}`, JSON.stringify(result))
    if (!delivered) {
      return c.json({ error: 'Invalid or expired session' }, 400)
    }
  }

  return c.json({ ok: true })
})

export default app
export { app, TOOL_DEFINITIONS }
