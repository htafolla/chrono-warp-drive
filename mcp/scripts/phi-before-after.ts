/**
 * Before/after numeric table for the PHI = 5/3 change.
 *
 * Pins Date.now and blocks live network fetches so the only moving input
 * is the PHI binding inside the MCP modules.
 *
 * Run from the repo root:
 *   npx tsx mcp/scripts/phi-before-after.ts
 *
 * Clock sites (not changed by this script, only pinned):
 *   mcp/lib/solarGovernanceIntegration.ts temporalNonce uses Date.now
 *   mcp/stellar.ts isotopic embedding tdfValue and signalId use Date.now
 */
import { BEFORE_PATHS, BEFORE_VALUES } from './phi-before-snapshot.ts'

const FIXED_NOW_MS = Date.UTC(2026, 8, 27, 21, 30, 0)

Date.now = () => FIXED_NOW_MS

const BACKEND_BODY = {
  resonance: 0.85,
  isotopicRatio: 0.9,
  metamorphosisIndex: 0.5,
}

const SUN_EMBEDDING = Array.from({ length: 16 }, (_, i) => (i + 1) / 16)

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
  const url = String(input)
  if (url.includes('/isotopic-embedding') || url.includes('localhost:3001')) {
    return jsonResponse(BACKEND_BODY)
  }
  if (url.includes('process-current-sun') || url.includes('neural-fusion')) {
    return jsonResponse({ neuralEmbedding16: SUN_EMBEDDING })
  }
  if (url.includes('services.swpc.noaa.gov')) {
    return jsonResponse([])
  }
  throw new Error(`blocked fetch during PHI table: ${url}`)
}

const { app } = await import('../index.ts')
const stellarMod = await import('../stellar.ts')
const stellarApp = stellarMod.app
const { computeFullTDF } = await import('../lib/vortexMath.ts')
const { deterministicRandom } = await import('../lib/deterministicUtils.ts')
const { TemporalBlurrnSignal } = await import('../lib/temporalBlurrnSignal.ts')
const { PHI, L } = await import('../lib/tlmConstants.ts')

async function post(target: { request: (typeof app)['request'] }, path: string, body: unknown) {
  const res = await target.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let parsed: unknown = text
  try { parsed = JSON.parse(text) } catch { /* keep text */ }
  return { status: res.status, body: parsed }
}

type Leaf = { path: string; value: number | string | boolean | null }

function flatten(value: unknown, prefix: string, out: Leaf[]) {
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean' || value === null) {
    out.push({ path: prefix, value })
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => flatten(item, `${prefix}[${i}]`, out))
    return
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out)
    }
  }
}

const calls: Array<{ tool: string; clock: string; body: unknown }> = []

async function record(tool: string, clock: string, result: unknown) {
  calls.push({ tool, clock, body: result })
}

const dynamoPosts: Array<[string, unknown, string]> = [
  ['/compute_tdf', {}, 'no'],
  ['/compute_tptt', {}, 'no'],
  ['/black_hole_sequence', {}, 'no'],
  ['/harmonic_oscillator', {}, 'no'],
  ['/harmonic_oscillator', { t: 0.5 }, 'no'],
  ['/validate_tlm', {}, 'no'],
  ['/wave_function', {}, 'no'],
  ['/wave_function', { x: 1, t: 0.5, n: 3, isotope: 'Trinitarium-166', lambda: 0.53, phaseType: 'push' }, 'no'],
  ['/list_isotopes', {}, 'no'],
  ['/kuramoto_sync', { phases: [0, 1, 2], frequencies: [1, 1, 1], fractalToggle: false, isotope: 'C-12', phaseType: 'push', oscillatorIndex: 0 }, 'no'],
  ['/kuramoto_sync', { phases: [0, 1, 2], frequencies: [1, 1, 1], fractalToggle: true, isotope: 'Trinitarium-166', phaseType: 'push', oscillatorIndex: 0 }, 'no'],
  ['/emit_isotopic_signal', { content: 'phi-probe', tdf: 5.781e12, cascadeIndex: 42 }, 'signal id uses Date.now'],
  ['/cross_correlate', { contentA: 'alpha probe text', contentB: 'beta probe text' }, 'no'],
  ['/triangulate_signals', { signals: [{ content: 'alpha' }, { content: 'beta' }] }, 'no'],
  ['/fuse_symbiotic', { partners: [{ content: 'alpha' }, { content: 'beta' }] }, 'no'],
  ['/get_phase_coherence', { signalId: 'not-stored' }, 'no'],
  ['/explain_term', { term: 'BlackHole_Seq' }, 'no'],
  ['/govern_with_solar', { proposal: 'Fixed phi probe proposal for the engine triangulation study.', sharePublicly: false }, 'temporalNonce uses Date.now; NOAA fetch replaced with empty arrays'],
]

for (const [path, body, clock] of dynamoPosts) {
  const result = await post(app, path, body)
  await record(`POST ${path} ${JSON.stringify(body)}`, clock, result)
}

const getTdf = await app.request('/compute_tdf', { method: 'GET' })
await record('GET /compute_tdf', 'no', { status: getTdf.status, body: await getTdf.json() })

const stellar = await post(
  stellarApp,
  '/stellar_isotopic_embedding',
  { wavelengths: [400, 450, 500, 550, 600], fluxes: [1, 1, 1, 1, 1], cascadeIndex: 0 },
)
await record(
  'POST /stellar_isotopic_embedding fixed backend resonance 0.85',
  'tdfValue and signalId use Date.now; backend fetch is the fixed mock',
  stellar,
)

const vortex = computeFullTDF({ T_c: 137, P_s: 1, E_t: 0.5, delta_t: 1e-6, voids: 7, bhs_n: 3 })
await record('vortexMath.computeFullTDF defaults', 'no', vortex)

const libSignal = new TemporalBlurrnSignal({ content: 'lib' }, 5.781e12, 42)
await record('lib TemporalBlurrnSignal', 'no', {
  phaseCoherence: libSignal.getPhaseCoherence(),
  embed: libSignal.embed(),
  variantDelta: libSignal.getVariantDelta(),
})

await record('deterministicRandom(12345, 1)', 'no', { value: deterministicRandom(12345, 1) })
await record('module PHI and L', 'no', { PHI, L })

const LABELS = [
  'POST /compute_tdf {}',
  'POST /compute_tptt {}',
  'POST /black_hole_sequence {}',
  'POST /harmonic_oscillator {}',
  'POST /harmonic_oscillator {t:0.5}',
  'POST /validate_tlm {}',
  'POST /wave_function {}',
  'POST /wave_function {t:0.5,n:3,isotope:Trinitarium-166}',
  'POST /list_isotopes {}',
  'POST /kuramoto_sync {C-12, fractal:false}',
  'POST /kuramoto_sync {Trinitarium-166, fractal:true}',
  'POST /emit_isotopic_signal',
  'POST /cross_correlate',
  'POST /triangulate_signals',
  'POST /fuse_symbiotic',
  'POST /get_phase_coherence',
  'POST /explain_term BlackHole_Seq',
  'POST /govern_with_solar',
  'GET /compute_tdf',
  'POST /stellar_isotopic_embedding',
  'vortexMath.computeFullTDF defaults',
  'lib TemporalBlurrnSignal',
  'deterministicRandom(12345, 1)',
  'tlmConstants PHI,L',
]

function labelFor(path: string): string {
  const m = /^\[(\d+)\](.*)$/.exec(path)
  if (!m) return path
  const idx = Number(m[1])
  const rest = m[2].replace(/^\.body\.body\./, '.').replace(/^\.body\./, '.')
  return `${LABELS[idx] ?? idx}${rest}`
}

const leaves: Leaf[] = []
flatten(calls, '', leaves)
const afterNums = leaves.filter((leaf): leaf is { path: string; value: number } => typeof leaf.value === 'number')

if (afterNums.length !== BEFORE_VALUES.length) {
  console.error(`shape changed: after ${afterNums.length} numbers, snapshot ${BEFORE_VALUES.length}`)
  process.exit(1)
}

const moved: Array<{ label: string; before: number; after: number }> = []
const unchanged: Array<{ label: string; value: number }> = []
for (let i = 0; i < afterNums.length; i++) {
  const path = afterNums[i].path
  if (path !== BEFORE_PATHS[i]) {
    console.error(`path mismatch at ${i}: ${path} vs ${BEFORE_PATHS[i]}`)
    process.exit(1)
  }
  const before = BEFORE_VALUES[i]
  const after = afterNums[i].value
  const row = { label: labelFor(path), before, after }
  if (before === after) unchanged.push({ label: row.label, value: after })
  else moved.push(row)
}

const fmt = (n: number) => JSON.stringify(n)

console.log(`# PHI before/after`)
console.log(`Clock pinned at ${FIXED_NOW_MS} (2026-09-27T21:30:00.000Z) via Date.now.`)
console.log(`Before snapshot: commit 55e934b03914a52c12c5b113d81ba45314626fdc.`)
console.log(`Moved ${moved.length}. Unchanged numbers ${unchanged.length}.`)
console.log('')
console.log('| output | before | after |')
console.log('| --- | ---: | ---: |')
for (const row of moved) {
  console.log(`| ${row.label} | ${fmt(row.before)} | ${fmt(row.after)} |`)
}
const govern = calls.find(c => c.tool.startsWith('POST /govern_with_solar'))
const recommendation = (govern?.body as { body?: { finalRecommendation?: string } } | undefined)?.body?.finalRecommendation
console.log(`| POST /govern_with_solar.finalRecommendation | PASS @ 93% | ${recommendation?.includes('92%') ? 'PASS @ 92%' : recommendation} |`)

console.log('')
console.log('## Unchanged highlights')
const highlight = [
  'vortexMath.computeFullTDF defaults.tptt',
  'vortexMath.computeFullTDF defaults.bhs',
  'vortexMath.computeFullTDF defaults.tdf',
  'POST /govern_with_solar.solarContext.proposalTdf',
  'POST /govern_with_solar.solarContext.solarReferenceTdf',
  'POST /compute_tdf {}.tau',
  'POST /wave_function {}.amplitude',
  'POST /kuramoto_sync {C-12, fractal:false}.frequencyUpdate',
  'POST /stellar_isotopic_embedding.tdfValue',
  'POST /govern_with_solar.adjustedVoteWeight',
  'POST /govern_with_solar.proximity',
  'tlmConstants PHI,L.PHI',
  'tlmConstants PHI,L.L',
]
for (const row of unchanged) {
  if (highlight.some(h => row.label.includes(h) || row.label === h)) {
    console.log(`- ${row.label} = ${fmt(row.value)}`)
  }
}

const C = 3e8
const C_EXACT = 299792458
const TAU = 0.865
function chain(c: number) {
  const tptt = 137 * (1 / 0.5) * PHI * (c / 1e-6)
  const bhs = ((L * 7) * Math.pow(PHI, 3)) % Math.PI
  const tdf = tptt * TAU * (1 / bhs)
  const s_l = tdf * PHI
  return { tptt, bhs, tdf, s_l }
}
const kept = chain(C)
const exact = chain(C_EXACT)
console.log('')
console.log('## c = 299792458 counterfactual (NOT applied)')
console.log(`Engine c stays ${C}. Replacing it with ${C_EXACT} would scale tPTT, TDF, and S_L by ${C_EXACT / C}. BlackHole_Seq does not use c.`)
console.log(`| field | c = 3e8 (applied) | c = 299792458 (not applied) |`)
console.log(`| --- | ---: | ---: |`)
for (const key of ['tptt', 'bhs', 'tdf', 's_l'] as const) {
  console.log(`| ${key} | ${fmt(kept[key])} | ${fmt(exact[key])} |`)
}

const example = (calls.find(c => c.tool.startsWith('POST /explain_term'))?.body as { body?: { example?: string } })?.body?.example
console.log('')
console.log('## Glossary BlackHole_Seq example')
console.log(example ?? 'MISSING')
