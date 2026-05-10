import { Hono, Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { TemporalBlurrnSignal, FusedSignal } from '@/lib/temporalBlurrnSignal'
import { ISOTOPES } from '@/lib/temporalCalculator'

const app = new Hono()
app.use('/*', cors())

function ok(c: Context, data: Record<string, unknown>) {
  return c.json({ success: true, ...data })
}

function fail(c: Context, message: string, status: ContentfulStatusCode = 400) {
  return c.json({ success: false, error: message }, status)
}

// ===== Tool 1: emit_isotopic_signal =====
const EmitSchema = z.object({
  content: z.string().min(1, 'content is required'),
  tdf: z.number().positive().optional(),
  cascadeIndex: z.number().int().min(0).optional(),
})

app.post('/emit_isotopic_signal', async (c: Context) => {
  const parsed = EmitSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))

  const { content, tdf, cascadeIndex } = parsed.data
  const signal = new TemporalBlurrnSignal(
    { id: `sig-${Date.now()}`, content },
    tdf ?? 5.781e12 + content.length * 137,
    cascadeIndex ?? 42,
  )
  const fp = signal.getIsotopicFingerprint()
  return ok(c, {
    signalId: fp.coreId,
    isotopicRatio: fp.isotopicRatio,
    phaseCoherence: signal.getPhaseCoherence(),
    tdfValue: signal.getTdfValue(),
  })
})

// ===== Tool 2: cross_correlate =====
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
  })
})

// ===== Tool 3: compute_tdf =====
const TdfSchema = z.object({
  phi: z.number().min(1.566).max(1.766).default(1.666),
  delta_t: z.number().positive().default(1e-6),
  e_t: z.number().min(0).default(0.5),
})

app.post('/compute_tdf', async (c: Context) => {
  const parsed = TdfSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))

  const { phi, delta_t, e_t } = parsed.data
  const tdf = (phi * 5.781e12) / (delta_t * (1 + e_t))
  const BlackHole_Seq = (3 * 7 * Math.pow(phi, 2)) % Math.PI

  return ok(c, {
    tdfValue: tdf,
    S_L: tdf * phi,
    tau: 0.865,
    BlackHole_Seq,
  })
})

// ===== Tool 4: list_isotopes =====
app.post('/list_isotopes', async (c: Context) => {
  const isotopes = ISOTOPES.map((iso, i) => ({
    id: `isotope-${i}`,
    name: iso.type,
    factor: iso.factor,
  }))
  return ok(c, { isotopes })
})

// ===== Tool 5: triangulate_signals =====
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

// ===== Tool 6: fuse_symbiotic =====
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

// ===== Tool 7: optimize_cascade =====
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

// ===== Tool 8: get_phase_coherence =====
const CoherenceSchema = z.object({
  signalId: z.string().min(1),
})

app.post('/get_phase_coherence', async (c: Context) => {
  const parsed = CoherenceSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))

  const signal = new TemporalBlurrnSignal({ id: parsed.data.signalId }, 5.781e12, 42)
  return ok(c, { signalId: parsed.data.signalId, phaseCoherence: signal.getPhaseCoherence() })
})

// ===== Health =====
app.get('/health', (c: Context) => {
  return c.json({ status: 'ok', name: 'blurrn-mcp', version: '4.8.0', tools: 8 })
})

// ===== Vercel Edge Runtime =====
export const config = { runtime: 'edge' }
export default app.fetch
export { app }
