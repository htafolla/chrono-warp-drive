/**
 * Before/after table for the PHI = 5/3 change.
 *
 * Runs the worker against origin/main and against this checkout.
 * Verdicts are read from those processes. None are stored in this file.
 *
 *   npx tsx scripts/phi-before-after.ts
 *
 * Refuses to start when REDIS_URL is set. The worker also refuses.
 * PHI_MAIN_ROOT overrides the origin/main checkout (default /tmp/phi-main).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

if (process.env.REDIS_URL) {
  console.error('REDIS_URL is set. Refusing to run so this audit cannot write Redis history.')
  process.exit(2)
}

const repo = process.cwd()

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

function ensureMainCheckout(): string {
  const dest = process.env.PHI_MAIN_ROOT ?? '/tmp/phi-main'
  const originMain = git(['rev-parse', 'origin/main'], repo)
  if (!existsSync(join(dest, 'mcp/index.ts'))) {
    execFileSync('git', ['worktree', 'add', '--detach', dest, originMain], { cwd: repo, stdio: 'inherit' })
  }
  const sha = git(['rev-parse', 'HEAD'], dest)
  if (sha !== originMain) {
    console.error(`${dest} is ${sha}. origin/main is ${originMain}. Refresh that checkout before measuring.`)
    process.exit(1)
  }
  const modules = join(dest, 'node_modules')
  if (!existsSync(modules)) symlinkSync(join(repo, 'node_modules'), modules)
  return dest
}

type GovRow = {
  id: string
  text: string
  recommendation: string | null
  confidence: number | null
  resonanceScore: number | null
  solarHammerResonance: number | null
}

type SolarRow = {
  id: string
  text: string
  recommendation: string | null
  confidence: number | null
  resonanceScore: number | null
}

type Leaf = { path: string; value: number }

type Report = {
  sha: string
  clock: number
  phi: number
  cross: Array<{ contentA: string; contentB: string; strength: number | null }>
  phaseCoherence: number | null
  waveAmplitude: number | null
  dualBlackHole: { voids: number; n: number; seq1: number; seq2: number; total: number; syncEfficiency: number }
  governance: GovRow[]
  solar: SolarRow[]
  leaves: Leaf[]
}

function runWorker(root: string, outFile: string, extra?: Record<string, string>) {
  execFileSync('npx', ['tsx', join(repo, 'scripts/phi-governance-worker.ts'), root, outFile], {
    cwd: repo,
    stdio: 'inherit',
    env: extra ? { ...process.env, ...extra } : process.env,
  })
}

function load(outFile: string): Report {
  return JSON.parse(readFileSync(outFile, 'utf8')) as Report
}

const fmt = (n: number | null) => (n === null ? 'MISSING' : JSON.stringify(n))

function countBy(rows: Array<{ recommendation: string | null }>): string {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = row.recommendation ?? 'MISSING'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()].map(([key, n]) => `${n} ${key}`).join(', ')
}

function hammerDrives(hammer: number | null): boolean {
  return hammer !== null && (hammer >= 0.88 || hammer <= 0.45)
}

const mainRoot = ensureMainCheckout()
const outDir = join(tmpdir(), 'phi-measure')
mkdirSync(outDir, { recursive: true })
const beforeFile = join(outDir, 'before.json')
const afterFile = join(outDir, 'after.json')

console.error(`measuring origin/main at ${mainRoot}`)
runWorker(mainRoot, beforeFile)
console.error(`measuring HEAD at ${repo}`)
runWorker(repo, afterFile)

const before = load(beforeFile)
const after = load(afterFile)

if (before.governance.length !== 43 || after.governance.length !== 43) {
  console.error(`expected 43 governance rows, got ${before.governance.length} and ${after.governance.length}`)
  process.exit(1)
}

const beforeCross = new Set(before.cross.map((row) => row.strength))
const afterCross = new Set(after.cross.map((row) => row.strength))

console.log('# PHI before/after')
console.log(`Clock pinned at ${before.clock} (2026-09-27T21:30:00.000Z) via Date.now.`)
console.log(`Before checkout: ${before.sha} (origin/main).`)
console.log(`After checkout: ${after.sha} (this tree).`)
console.log('NOAA fetches return []. Sentence embeddings use whatever fallback the process has. The same review text is sent on every /governance call.')
console.log('persistToChain is not set. REDIS_URL must be unset or this script exits.')
console.log('')
console.log('## cross_correlate')
console.log('The handler builds both signals with fixed tdf values 5.781e12 and 5.782e12. The proposal text is not an input to that strength.')
console.log(`Distinct strengths on main across ${before.cross.length} content pairs: ${[...beforeCross].map((n) => fmt(n)).join(', ')}.`)
console.log(`Distinct strengths on head across ${after.cross.length} content pairs: ${[...afterCross].map((n) => fmt(n)).join(', ')}.`)
console.log(`Emit phase coherence at tdf 5.781e12: before ${fmt(before.phaseCoherence)}, after ${fmt(after.phaseCoherence)}.`)
console.log(`Wave amplitude t=0.5 n=3 Trinitarium-166: before ${fmt(before.waveAmplitude)}, after ${fmt(after.waveAmplitude)}.`)
console.log('')
console.log('## evaluate_governance')
console.log(`Before: ${countBy(before.governance)}.`)
console.log(`After: ${countBy(after.governance)}.`)
console.log('Head cross strength is below 0.68, so the matrix returns REJECT at confidence 0.8 unless the hammer replaces resonance. The hammer replaces resonance at >= 0.88 or <= 0.45. A hammer <= 0.45 is still REJECT. A head PASS requires a hammer >= 0.88.')
console.log('')
console.log('| proposal | before verdict | before confidence | before resonance | before hammer | after verdict | after confidence | after resonance | after hammer | solar before | solar after |')
console.log('| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- | --- |')

const solarFlips: string[] = []
let headPass = 0
let headPassViaHammer = 0
let headReject = 0

for (let i = 0; i < before.governance.length; i++) {
  const b = before.governance[i]
  const a = after.governance[i]
  const sb = before.solar[i]
  const sa = after.solar[i]
  if (!b || !a || !sb || !sa || b.id !== a.id || b.text !== a.text) {
    console.error('proposal mismatch', b?.id, a?.id)
    process.exit(1)
  }
  if (a.recommendation === 'PASS') {
    headPass += 1
    if (hammerDrives(a.solarHammerResonance)) headPassViaHammer += 1
  }
  if (a.recommendation === 'REJECT') headReject += 1
  if (sb.recommendation !== sa.recommendation) {
    solarFlips.push(`${a.id}: ${sb.recommendation} -> ${sa.recommendation} (${a.text})`)
  }
  console.log(`| ${a.id} | ${b.recommendation} | ${fmt(b.confidence)} | ${fmt(b.resonanceScore)} | ${fmt(b.solarHammerResonance)} | ${a.recommendation} | ${fmt(a.confidence)} | ${fmt(a.resonanceScore)} | ${fmt(a.solarHammerResonance)} | ${sb.recommendation} | ${sa.recommendation} |`)
}

console.log('')
console.log(`Head evaluate_governance PASS count: ${headPass}. Of those, hammer >= 0.88 or <= 0.45 accounts for ${headPassViaHammer}. REJECT count: ${headReject}. A hammer <= 0.45 still returns REJECT.`)
console.log('')
console.log('## govern_with_solar recommendation')
console.log('This field is result.recommendation. The on-chain path reads it before persistContainerToChain. This run does not set persistToChain.')
console.log(`This table uses PHI_SUN=present, a fixed 16-number sun embedding, at the one pinned second above. Flips: ${solarFlips.length} of ${before.solar.length}.`)
for (const line of solarFlips) console.log(`- ${line}`)
console.log('')
console.log('## computeDualBlackHoleSync(7, 29)')
console.log('Called with no phi argument, so each tree uses that function\'s default parameter. voids 7 is the Chrono Transport default.')
console.log(`Before syncEfficiency ${fmt(before.dualBlackHole.syncEfficiency)} seq1 ${fmt(before.dualBlackHole.seq1)} seq2 ${fmt(before.dualBlackHole.seq2)}.`)
console.log(`After syncEfficiency ${fmt(after.dualBlackHole.syncEfficiency)} seq1 ${fmt(after.dualBlackHole.seq1)} seq2 ${fmt(after.dualBlackHole.seq2)}.`)
console.log('')

const beforeLeaves = new Map(before.leaves.map((leaf) => [leaf.path, leaf.value]))
const afterLeaves = new Map(after.leaves.map((leaf) => [leaf.path, leaf.value]))
const moved: Array<{ path: string; before: number; after: number }> = []
let unchanged = 0
for (const [path, value] of afterLeaves) {
  if (!beforeLeaves.has(path)) continue
  const prior = beforeLeaves.get(path) as number
  if (prior === value) unchanged += 1
  else moved.push({ path, before: prior, after: value })
}
const onlyBefore = [...beforeLeaves.keys()].filter((path) => !afterLeaves.has(path))
const onlyAfter = [...afterLeaves.keys()].filter((path) => !beforeLeaves.has(path))
console.log(`## Numeric leaves measured on both trees`)
console.log(`Moved ${moved.length}. Unchanged ${unchanged}. Only-before paths ${onlyBefore.length}. Only-after paths ${onlyAfter.length}.`)
console.log('')
console.log('| path | before | after |')
console.log('| --- | ---: | ---: |')
for (const row of moved) {
  console.log(`| ${row.path} | ${fmt(row.before)} | ${fmt(row.after)} |`)
}

const SWEEP_MS = [
  Date.UTC(2026, 8, 27, 21, 30, 0),
  Date.UTC(2026, 8, 27, 21, 30, 1),
  Date.UTC(2026, 8, 27, 21, 30, 2),
  Date.UTC(2026, 8, 27, 21, 30, 3),
  Date.UTC(2026, 8, 27, 21, 30, 4),
  Date.UTC(2026, 8, 27, 21, 30, 5),
  Date.UTC(2026, 8, 27, 21, 30, 6),
  Date.UTC(2026, 8, 27, 21, 30, 7),
  Date.UTC(2026, 8, 27, 21, 30, 8),
  Date.UTC(2026, 8, 27, 21, 31, 0),
  Date.UTC(2026, 8, 27, 21, 45, 33),
  Date.UTC(2026, 8, 27, 22, 38, 29),
  Date.UTC(2026, 8, 28, 3, 12, 59),
  Date.UTC(2026, 8, 28, 12, 0, 17),
  Date.UTC(2026, 9, 1, 8, 8, 8),
]
const FLIP_MS = [
  Date.UTC(2026, 8, 27, 21, 30, 0),
  Date.UTC(2026, 8, 27, 21, 30, 7),
  Date.UTC(2026, 8, 27, 21, 31, 0),
]

type SweepFile = {
  sun: string
  clocks: Array<{ ms: number; governance: Array<string | null>; solar: Array<string | null> }>
}

function loadSweep(file: string): SweepFile {
  return JSON.parse(readFileSync(file, 'utf8')) as SweepFile
}

function tally(values: Array<string | null>): string {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value ?? 'MISSING', (counts.get(value ?? 'MISSING') ?? 0) + 1)
  return [...counts.entries()].map(([key, n]) => `${n} ${key}`).join(', ')
}

function rejectPass(values: Array<string | null>): { reject: number; pass: number } {
  return {
    reject: values.filter((value) => value === 'REJECT').length,
    pass: values.filter((value) => value === 'PASS').length,
  }
}

function flipsBetween(left: Array<string | null>, right: Array<string | null>): number {
  let n = 0
  for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) n += 1
  return n
}

function sweepPair(sun: 'present' | 'absent'): { before: SweepFile; after: SweepFile } {
  const tag = sun
  const beforePath = join(outDir, `sweep-${tag}-before.json`)
  const afterPath = join(outDir, `sweep-${tag}-after.json`)
  const clocks = SWEEP_MS.join(',')
  console.error(`sweep ${sun} on origin/main`)
  runWorker(mainRoot, beforePath, { PHI_SUN: sun, PHI_CLOCKS: clocks })
  console.error(`sweep ${sun} on HEAD`)
  runWorker(repo, afterPath, { PHI_SUN: sun, PHI_CLOCKS: clocks })
  return { before: loadSweep(beforePath), after: loadSweep(afterPath) }
}

const withEmbedding = sweepPair('present')
const withoutEmbedding = sweepPair('absent')

console.log('')
console.log('## govern_with_solar flips and the sun embedding')
console.log('PHI_SUN=present returns a fixed 16-number array from the neural-fusion fetch.')
console.log('PHI_SUN=absent throws on that fetch, so fetchSunNeuralEmbedding returns undefined, which is what production does when the neural-fusion backend is down.')
console.log('The flip count below is recommendation changes on the same 43 texts. persistToChain is not set.')
console.log('')
console.log('| pinned second | flips with embedding | flips with no embedding |')
console.log('| --- | ---: | ---: |')
for (const ms of FLIP_MS) {
  const presentBefore = withEmbedding.before.clocks.find((row) => row.ms === ms)
  const presentAfter = withEmbedding.after.clocks.find((row) => row.ms === ms)
  const absentBefore = withoutEmbedding.before.clocks.find((row) => row.ms === ms)
  const absentAfter = withoutEmbedding.after.clocks.find((row) => row.ms === ms)
  if (!presentBefore || !presentAfter || !absentBefore || !absentAfter) {
    console.error('missing clock', ms)
    process.exit(1)
  }
  const stamp = new Date(ms).toISOString()
  console.log(`| ${stamp} | ${flipsBetween(presentBefore.solar, presentAfter.solar)} | ${flipsBetween(absentBefore.solar, absentAfter.solar)} |`)
}

console.log('')
console.log('## evaluate_governance across pinned seconds')
console.log('The hammer nonce is floor(Date.now()/1000). Each row is one pinned second. The counts are from the PHI_SUN=present sweep. evaluate_governance calls enhanceGovernanceDecision without a sun embedding.')
console.log('Pinned seconds:')
for (const ms of SWEEP_MS) console.log(`- ${new Date(ms).toISOString()} (${ms})`)
console.log('')
console.log('| pinned second | main governance | head governance |')
console.log('| --- | --- | --- |')
const headRatios: Array<{ reject: number; pass: number }> = []
const mainPasses: number[] = []
for (const ms of SWEEP_MS) {
  const mainRow = withEmbedding.before.clocks.find((row) => row.ms === ms)
  const headRow = withEmbedding.after.clocks.find((row) => row.ms === ms)
  if (!mainRow || !headRow) {
    console.error('missing sweep clock', ms)
    process.exit(1)
  }
  const mainGov = rejectPass(mainRow.governance)
  const headGov = rejectPass(headRow.governance)
  headRatios.push(headGov)
  mainPasses.push(mainGov.pass)
  console.log(`| ${new Date(ms).toISOString()} | ${tally(mainRow.governance)} | ${tally(headRow.governance)} |`)
}
const fewestHeadRejects = headRatios.reduce((left, right) => (left.reject <= right.reject ? left : right))
const mostHeadRejects = headRatios.reduce((left, right) => (left.reject >= right.reject ? left : right))
console.log(`Head REJECT/PASS ranges from ${fewestHeadRejects.reject}/${fewestHeadRejects.pass} to ${mostHeadRejects.reject}/${mostHeadRejects.pass}.`)
console.log(`Main PASS ranges from ${Math.min(...mainPasses)} to ${Math.max(...mainPasses)}.`)
console.log('These seconds run from 21:30 on 2026-09-27 through 08:08 on 2026-10-01. The REJECT/PASS split varies across the day. One table is one pinned second.')
let governanceDiffers = 0
for (const ms of SWEEP_MS) {
  const presentHead = withEmbedding.after.clocks.find((row) => row.ms === ms)
  const absentHead = withoutEmbedding.after.clocks.find((row) => row.ms === ms)
  if (!presentHead || !absentHead) continue
  if (presentHead.governance.join('|') !== absentHead.governance.join('|')) governanceDiffers += 1
}
console.log(`Head evaluate_governance rows that differ between sun present and sun absent: ${governanceDiffers} of ${SWEEP_MS.length}.`)
