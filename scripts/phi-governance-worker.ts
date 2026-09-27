/**
 * Measure one checkout. Verdicts are not stored in this file.
 *
 *   npx tsx scripts/phi-governance-worker.ts <repo-root> <out.json>
 *
 * Refuses to start when REDIS_URL is set. Pins Date.now and replaces
 * fetch before the MCP modules load. Does not pass persistToChain.
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

if (process.env.REDIS_URL) {
  console.error('REDIS_URL is set. Refusing to run so this audit cannot write Redis history.')
  process.exit(2)
}

const root = process.argv[2]
const outPath = process.argv[3]
if (!root || !outPath) {
  console.error('usage: phi-governance-worker.ts <repo-root> <out.json>')
  process.exit(2)
}

const FIXED_NOW_MS = Date.UTC(2026, 8, 27, 21, 30, 0)
Date.now = () => FIXED_NOW_MS

const SUN_EMBEDDING = Array.from({ length: 16 }, (_, i) => (i + 1) / 16)
const REVIEW = 'The review text is fixed and does not depend on the clock.'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
  const url = String(input)
  if (url.includes('/isotopic-embedding') || url.includes('localhost:3001')) {
    return jsonResponse({ resonance: 0.85, isotopicRatio: 0.9, metamorphosisIndex: 0.5 })
  }
  if (url.includes('process-current-sun') || url.includes('neural-fusion')) {
    return jsonResponse({
      neuralEmbedding16: SUN_EMBEDDING,
      neuralOutput: { neuralEmbedding16: SUN_EMBEDDING },
    })
  }
  if (url.includes('services.swpc.noaa.gov') || url.includes('noaa')) {
    return jsonResponse([])
  }
  throw new Error(`blocked fetch during PHI measurement: ${url}`)
}

/**
 * Forty-three fixed proposal texts. Both checkouts receive this list.
 * Verdicts are not stored here.
 */
export const PROPOSALS = [
  'Adopt the temple ratio as the only proportion for the transport cascade and publish the witness log.',
  'Archive the vortex ledger before the next quiet solar window and keep the prior hash.',
  'Freeze isotope registration for thirty days while the cascade index is audited.',
  'Rotate the public feed key and retain the last fifty shared proposals.',
  'Attest that the on-chain write stays closed unless the recommendation is not a rejection.',
  'Compare the two black-hole sequences at cascade index twenty-nine and record both.',
  'Publish the phase-coherence remainder for the default vortex base without changing the formula.',
  'Bind the glossary example to the same BlackHole sequence the tools compute.',
  'Hold c at three hundred million meters per second and do not apply the SI exact value.',
  'Record that the live servers were not updated by this measurement.',
  'Require every proposal to name its source as human, agent, ambient, or system.',
  'Keep Redis history writes disabled for this audit by refusing a set REDIS_URL.',
  'Sample the manifold once and store the container only in memory.',
  'Leave vortexMath.ts untouched because another change owns that file.',
  'Do not rewrite the mill-local pointer sentence in the app constants module.',
  'Show the counterfactual chain for the exact speed of light and mark it not applied.',
  'Pin the clock to the same UTC instant on both checkouts before importing the server.',
  'Replace NOAA replies with an empty array so solar activity is the stub, not the network.',
  'Use the FNV sentence embedding when the image transformer cannot load.',
  'Call cross correlation with two unrelated texts and expect one strength.',
  'Call cross correlation again with the first two proposals and expect that same strength.',
  'Evaluate governance with one fixed review sentence that does not mention the clock.',
  'Ask govern_with_solar for a recommendation and do not set persistToChain.',
  'Skip the chain client when the recommendation would reject the proposal.',
  'Measure sync efficiency for seven voids and n equal to twenty-nine.',
  'Leave the dual-black-hole formula as it stands and only report the number.',
  'Document that a hammer at or above the high bar can still pass a weak cross strength.',
  'Document that a hammer at or below the low bar also replaces the cross strength.',
  'State that the decision matrix was not edited.',
  'State that the correlation handler still ignores the proposal text.',
  'List every solar recommendation that differs between the two checkouts.',
  'Keep the pull request a draft until Blaze accepts the governance default.',
  'Search the old expression grammar again only as history, including roots and logs.',
  'Drop percentile labels from the candidate list and call nothing a derivation.',
  'Allow the eight Codex files that still quote the historical decimal.',
  'Scan the other Codex files, which do not contain that historical decimal.',
  'Generate the numeric before column by running origin/main, not from a frozen table.',
  'Refuse to start this worker when a Redis URL is present in the environment.',
  'Import the displacement helper from each tree so the default parameter is that tree.',
  'Print confidence with full JSON digits so zero point eight stays exact.',
  'Separate the evaluate_governance verdict from the solar percent tag.',
  'Remember that the percent tag is not the field the chain write checks.',
  'Close the audit by writing both flips into the pull request and the checked-in note.',
]

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

type Requester = {
  request: (
    path: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string },
  ) => Promise<Response>
}

async function post(target: Requester, path: string, body: unknown): Promise<{ status: number; body: Json }> {
  const res = await target.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let parsed: Json = text
  try {
    parsed = JSON.parse(text) as Json
  } catch {
    /* keep text */
  }
  return { status: res.status, body: parsed }
}

function asRecord(value: Json): Record<string, Json> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value
}

function readNumber(body: Json, key: string): number | null {
  const record = asRecord(body)
  if (!record) return null
  const value = record[key]
  return typeof value === 'number' ? value : null
}

function readString(body: Json, key: string): string | null {
  const record = asRecord(body)
  if (!record) return null
  const value = record[key]
  return typeof value === 'string' ? value : null
}

type Leaf = { path: string; value: number }

function flatten(value: unknown, prefix: string, out: Leaf[]) {
  if (typeof value === 'number') {
    out.push({ path: prefix, value })
    return
  }
  if (typeof value === 'string' || typeof value === 'boolean' || value === null) return
  if (Array.isArray(value)) {
    value.forEach((item, i) => flatten(item, `${prefix}[${i}]`, out))
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out)
    }
  }
}

const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()

const appMod = await import(pathToFileURL(join(root, 'mcp/index.ts')).href)
const stellarMod = await import(pathToFileURL(join(root, 'mcp/stellar.ts')).href)
const vortexMod = await import(pathToFileURL(join(root, 'mcp/lib/vortexMath.ts')).href)
const signalMod = await import(pathToFileURL(join(root, 'mcp/lib/temporalBlurrnSignal.ts')).href)
const seedMod = await import(pathToFileURL(join(root, 'mcp/lib/deterministicUtils.ts')).href)
const constantsMod = await import(pathToFileURL(join(root, 'mcp/lib/tlmConstants.ts')).href)
const dualMod = await import(pathToFileURL(join(root, 'src/lib/temporalDisplacementFactor.ts')).href)

const app = appMod.app as Requester
const stellarApp = stellarMod.app as Requester

const crossPairs = [
  { contentA: 'alpha probe text', contentB: 'beta probe text' },
  { contentA: 'wheat tariffs and canal locks for the northern ledger', contentB: 'a review about cedar shingles and nothing else' },
  { contentA: PROPOSALS[0], contentB: PROPOSALS[1] },
]

const cross: Array<{ contentA: string; contentB: string; strength: number | null }> = []
for (const pair of crossPairs) {
  const result = await post(app, '/cross_correlate', pair)
  if (result.status !== 200) {
    console.error('cross_correlate failed', result.status, result.body)
    process.exit(1)
  }
  cross.push({ ...pair, strength: readNumber(result.body, 'strength') })
}

const emit = await post(app, '/emit_isotopic_signal', { content: 'phi-probe', tdf: 5.781e12, cascadeIndex: 42 })
const wave = await post(app, '/wave_function', {
  x: 1,
  t: 0.5,
  n: 3,
  isotope: 'Trinitarium-166',
  lambda: 0.53,
  phaseType: 'push',
})

const dual = dualMod.computeDualBlackHoleSync(7, 29) as {
  seq1: number
  seq2: number
  total: number
  syncEfficiency: number
}

type GovRow = {
  id: string
  text: string
  recommendation: string | null
  confidence: number | null
  resonanceScore: number | null
  solarHammerResonance: number | null
  status: number
}

type SolarRow = {
  id: string
  text: string
  recommendation: string | null
  confidence: number | null
  resonanceScore: number | null
  status: number
}

const governance: GovRow[] = []
const solar: SolarRow[] = []

for (let index = 0; index < PROPOSALS.length; index++) {
  const id = `p${String(index).padStart(2, '0')}`
  const text = PROPOSALS[index]
  const gov = await post(app, '/governance', {
    proposalId: id,
    proposalText: text,
    agentReviews: [REVIEW],
    source: 'human',
  })
  if (gov.status !== 200) {
    console.error('governance failed', id, gov.status, gov.body)
    process.exit(1)
  }
  governance.push({
    id,
    text,
    recommendation: readString(gov.body, 'recommendation'),
    confidence: readNumber(gov.body, 'confidence'),
    resonanceScore: readNumber(gov.body, 'resonanceScore'),
    solarHammerResonance: readNumber(gov.body, 'solarHammerResonance'),
    status: gov.status,
  })

  const solarResult = await post(app, '/govern_with_solar', { proposal: text, sharePublicly: false })
  if (solarResult.status !== 200) {
    console.error('govern_with_solar failed', id, solarResult.status, solarResult.body)
    process.exit(1)
  }
  solar.push({
    id,
    text,
    recommendation: readString(solarResult.body, 'recommendation'),
    confidence: readNumber(solarResult.body, 'confidence'),
    resonanceScore: readNumber(solarResult.body, 'resonanceScore'),
    status: solarResult.status,
  })
}

const calls: Array<{ tool: string; body: unknown }> = []
async function record(tool: string, result: unknown) {
  calls.push({ tool, body: result })
}

const dynamoPosts: Array<[string, unknown]> = [
  ['/compute_tdf', {}],
  ['/compute_tptt', {}],
  ['/black_hole_sequence', {}],
  ['/harmonic_oscillator', {}],
  ['/harmonic_oscillator', { t: 0.5 }],
  ['/validate_tlm', {}],
  ['/wave_function', {}],
  ['/wave_function', { x: 1, t: 0.5, n: 3, isotope: 'Trinitarium-166', lambda: 0.53, phaseType: 'push' }],
  ['/list_isotopes', {}],
  ['/kuramoto_sync', { phases: [0, 1, 2], frequencies: [1, 1, 1], fractalToggle: false, isotope: 'C-12', phaseType: 'push', oscillatorIndex: 0 }],
  ['/kuramoto_sync', { phases: [0, 1, 2], frequencies: [1, 1, 1], fractalToggle: true, isotope: 'Trinitarium-166', phaseType: 'push', oscillatorIndex: 0 }],
  ['/emit_isotopic_signal', { content: 'phi-probe', tdf: 5.781e12, cascadeIndex: 42 }],
  ['/cross_correlate', { contentA: 'alpha probe text', contentB: 'beta probe text' }],
  ['/triangulate_signals', { signals: [{ content: 'alpha' }, { content: 'beta' }] }],
  ['/fuse_symbiotic', { partners: [{ content: 'alpha' }, { content: 'beta' }] }],
  ['/get_phase_coherence', { signalId: 'not-stored' }],
  ['/explain_term', { term: 'BlackHole_Seq' }],
  ['/govern_with_solar', { proposal: 'Fixed phi probe proposal for the engine triangulation study.', sharePublicly: false }],
]

for (const [path, body] of dynamoPosts) {
  await record(`POST ${path} ${JSON.stringify(body)}`, await post(app, path, body))
}

const getTdf = await app.request('/compute_tdf', { method: 'GET' })
await record('GET /compute_tdf', { status: getTdf.status, body: await getTdf.json() })

const stellar = await post(stellarApp, '/stellar_isotopic_embedding', {
  wavelengths: [400, 450, 500, 550, 600],
  fluxes: [1, 1, 1, 1, 1],
  cascadeIndex: 0,
})
await record('POST /stellar_isotopic_embedding', stellar)

const vortex = vortexMod.computeFullTDF({ T_c: 137, P_s: 1, E_t: 0.5, delta_t: 1e-6, voids: 7, bhs_n: 3 })
await record('vortexMath.computeFullTDF defaults', vortex)

const libSignal = new signalMod.TemporalBlurrnSignal({ content: 'lib' }, 5.781e12, 42)
await record('lib TemporalBlurrnSignal', {
  phaseCoherence: libSignal.getPhaseCoherence(),
  embed: libSignal.embed(),
  variantDelta: libSignal.getVariantDelta(),
})

await record('deterministicRandom(12345, 1)', { value: seedMod.deterministicRandom(12345, 1) })
await record('module PHI and L', { PHI: constantsMod.PHI, L: constantsMod.L })

const leaves: Leaf[] = []
flatten(calls, '', leaves)

const report = {
  sha,
  root,
  clock: FIXED_NOW_MS,
  phi: constantsMod.PHI,
  cross,
  phaseCoherence: readNumber(emit.body, 'phaseCoherence'),
  waveAmplitude: readNumber(wave.body, 'amplitude'),
  dualBlackHole: { voids: 7, n: 29, ...dual },
  governance,
  solar,
  leaves,
}

writeFileSync(outPath, JSON.stringify(report))
console.error(`wrote ${outPath} sha=${sha} governance=${governance.length} leaves=${leaves.length}`)
