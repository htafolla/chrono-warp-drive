/**
 * Read-only classification of TemporalContainerRegistry containers.
 * Chain calls are eth_call (containerCount, listContainers, getContainer).
 * Redis, when REDIS_URL is set, is HGETALL only. This file never writes
 * a transaction or a Redis key.
 *
 *   node mcp/scripts/audit-container-seeds.mjs
 *   node mcp/scripts/audit-container-seeds.mjs --from-raw /path/to/normalized.json
 */
import { createHash } from 'crypto'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createPublicClient, http, fallback } from 'viem'
import { base } from 'viem/chains'
import { readFileSync, writeFileSync } from 'fs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(scriptDir, '../..')
const ABI = JSON.parse(readFileSync(join(scriptDir, '../lib/abi/TemporalContainerRegistry.json'), 'utf8'))
const OUT_JSON = join(repoRoot, 'docs/empirical/container-seed-audit.json')
const OUT_MD = join(repoRoot, 'docs/empirical/container-seed-audit.md')
const REGISTRY = '0xCB418F081D4fDAD6B2b17027294865B26cb26855'
const RPCS = ['https://mainnet.base.org', 'https://base-rpc.publicnode.com']
const ORIGIN_KEY = 'dynamo:containers:origin'

const Q = 10n ** 14n
const FLOAT_SLOP = 64n
const ROUND_SLACK = Q + FLOAT_SLOP

const SEED_HAMMER = {
  PASS: 'Strong alignment verified',
  NEEDS_REVISION: 'Partial alignment detected',
  FAIL: 'Poor alignment - major revision needed',
}
const REAL_HAMMERS = new Set([
  'Solar alignment neutral',
  'Strong resonance with current solar conditions',
  'Good alignment with solar field',
  'Moderate resonance — needs refinement',
  'Low resonance with the sun — misaligned',
  'Solar storm in progress — caution applied',
])
const SEED_TENSION = new Set(['Mild', 'Low', 'Moderate', 'High'])
const REAL_TENSION = new Set(['Aligned', 'Mild', 'Significant', 'Critical'])
const SEED_ACTIVITY = new Set(['quiet', 'moderate', 'high'])
const REAL_ACTIVITY = new Set(['quiet', 'moderate', 'active', 'storm'])
const REAL_VERDICT = new Set(['PASS', 'NEEDS_REVISION', 'REJECT'])

const SCORE_FIELDS = [
  'fullBox7DComposite',
  'waveProximity',
  'phaseAlignment',
  'calibratedVortex',
  'calibratedSync',
  'neuralProximity',
  'neuralVortex',
  'gematriaResonance',
  'structuralResonance',
  'confidence',
]
const MORAL_FIELDS = [
  'trinitariumMoralScore',
  'virtueAlignment',
  'moralSafety',
  'intentAlignment',
  'trinitariumGematriaFusion',
]

function scale1e18(decimalStr) {
  const [whole, frac = ''] = decimalStr.split('.')
  const padded = (frac + '0'.repeat(18)).slice(0, 18)
  return BigInt(whole + padded)
}

function nearScaled(value, decimalStr) {
  const target = scale1e18(decimalStr)
  const diff = value > target ? value - target : target - value
  return diff <= FLOAT_SLOP
}

function isFourDecimal(value) {
  const mod = value < 0n ? -value % Q : value % Q
  const dist = mod < Q - mod ? mod : Q - mod
  return dist <= FLOAT_SLOP
}

function withinJitter(sub, base, halfRangeDecimal) {
  if (nearScaled(sub, '0.01') || nearScaled(sub, '0.99')) return true
  const half = scale1e18(halfRangeDecimal)
  const diff = sub > base ? sub - base : base - sub
  return diff <= half + ROUND_SLACK
}

function inClosedRange(value, minDec, maxDec) {
  const min = scale1e18(minDec) - FLOAT_SLOP
  const max = scale1e18(maxDec) + FLOAT_SLOP
  return value >= min && value <= max
}

const DEV_SCRIPT = [
  {
    label: 'celestial-test-container-1',
    source: 'human',
    hammerReason: 'Exceptional alignment score',
    verdict: 'PASS',
    activityLevel: 'high',
    xray: '0.0000012',
    kp: 700n,
    proton: 100n,
    mag: 50n,
    solarTdf: 3n,
    scores: {
      fullBox7DComposite: '0.97',
      waveProximity: '0.95',
      phaseAlignment: '0.96',
      calibratedVortex: '0.94',
      calibratedSync: '0.93',
      neuralProximity: '0.95',
      neuralVortex: '0.92',
      gematriaResonance: '0.96',
      structuralResonance: '0.94',
      confidence: '0.95',
    },
    moral: {
      trinitariumMoralScore: '0.92',
      virtueAlignment: '0.90',
      moralSafety: '0.88',
      intentAlignment: '0.91',
      trinitariumGematriaFusion: '0.85',
    },
    tension: 'Mild',
  },
  {
    label: 'resonant-test-container-1',
    source: 'agent',
    hammerReason: 'Strong resonant alignment',
    verdict: 'PASS',
    activityLevel: 'moderate',
    xray: '0.0000005',
    kp: 400n,
    proton: 50n,
    mag: 25n,
    solarTdf: 2n,
    scores: {
      fullBox7DComposite: '0.85',
      waveProximity: '0.82',
      phaseAlignment: '0.79',
      calibratedVortex: '0.81',
      calibratedSync: '0.78',
      neuralProximity: '0.83',
      neuralVortex: '0.80',
      gematriaResonance: '0.84',
      structuralResonance: '0.79',
      confidence: '0.82',
    },
    moral: {
      trinitariumMoralScore: '0.78',
      virtueAlignment: '0.75',
      moralSafety: '0.80',
      intentAlignment: '0.76',
      trinitariumGematriaFusion: '0.72',
    },
    tension: 'Low',
  },
  {
    label: 'unstable-test-container-1',
    source: 'ambient',
    hammerReason: 'Partial alignment detected',
    verdict: 'NEEDS_REVISION',
    activityLevel: 'quiet',
    xray: '0.0000002',
    kp: 200n,
    proton: 10n,
    mag: 5n,
    solarTdf: 1n,
    scores: {
      fullBox7DComposite: '0.65',
      waveProximity: '0.60',
      phaseAlignment: '0.58',
      calibratedVortex: '0.62',
      calibratedSync: '0.55',
      neuralProximity: '0.63',
      neuralVortex: '0.59',
      gematriaResonance: '0.61',
      structuralResonance: '0.57',
      confidence: '0.60',
    },
    moral: {
      trinitariumMoralScore: '0.55',
      virtueAlignment: '0.52',
      moralSafety: '0.58',
      intentAlignment: '0.50',
      trinitariumGematriaFusion: '0.45',
    },
    tension: 'Moderate',
  },
  {
    label: 'dissonant-test-container-1',
    source: 'ambient',
    hammerReason: 'Poor alignment - major revision needed',
    verdict: 'FAIL',
    activityLevel: 'quiet',
    xray: '0.0000001',
    kp: 100n,
    proton: 5n,
    mag: 2n,
    solarTdf: 0n,
    scores: {
      fullBox7DComposite: '0.38',
      waveProximity: '0.35',
      phaseAlignment: '0.30',
      calibratedVortex: '0.33',
      calibratedSync: '0.28',
      neuralProximity: '0.36',
      neuralVortex: '0.31',
      gematriaResonance: '0.34',
      structuralResonance: '0.29',
      confidence: '0.40',
    },
    moral: {
      trinitariumMoralScore: '0.30',
      virtueAlignment: '0.28',
      moralSafety: '0.35',
      intentAlignment: '0.25',
      trinitariumGematriaFusion: '0.20',
    },
    tension: 'High',
  },
  {
    label: 'system-test-container-1',
    source: 'human',
    hammerReason: 'System-validated exceptional alignment',
    verdict: 'PASS',
    activityLevel: 'high',
    xray: '0.0000015',
    kp: 800n,
    proton: 200n,
    mag: 100n,
    solarTdf: 4n,
    scores: {
      fullBox7DComposite: '0.96',
      waveProximity: '0.94',
      phaseAlignment: '0.95',
      calibratedVortex: '0.93',
      calibratedSync: '0.92',
      neuralProximity: '0.94',
      neuralVortex: '0.91',
      gematriaResonance: '0.95',
      structuralResonance: '0.93',
      confidence: '0.96',
    },
    moral: {
      trinitariumMoralScore: '0.90',
      virtueAlignment: '0.88',
      moralSafety: '0.86',
      intentAlignment: '0.89',
      trinitariumGematriaFusion: '0.83',
    },
    tension: 'Mild',
  },
].map((row) => ({
  ...row,
  containerId: '0x' + createHash('sha256').update(row.label).digest('hex'),
}))

const DEV_BY_ID = new Map(DEV_SCRIPT.map((row) => [row.containerId.toLowerCase(), row]))

function xrayScaled(decimalFlux) {
  // scaleXray = round(value * 1e9). Compare via integer micro-units.
  const as1e18 = scale1e18(decimalFlux)
  return as1e18 / 10n ** 9n
}

function matchesDevScript(row, c) {
  const id = String(c.containerId).toLowerCase()
  if (id !== row.containerId.toLowerCase()) return false
  const r = c.resonanceProfile
  const m = c.moralOverlay
  const s = c.solarSnapshot
  if (c.hammerReason !== row.hammerReason) return false
  if (c.source !== row.source) return false
  if (r.verdict !== row.verdict) return false
  if (r.fullBox7DVerdict !== row.verdict) return false
  if (m.moralNumerologicalTension !== row.tension) return false
  if (s.activityLevel !== row.activityLevel) return false
  if (BigInt(s.kpIndex) !== row.kp) return false
  if (BigInt(s.protonFlux) !== row.proton) return false
  if (BigInt(s.magnetometer) !== row.mag) return false
  if (BigInt(s.solarTdf) !== row.solarTdf) return false
  const xray = BigInt(s.xrayFlux)
  const expectedXray = xrayScaled(row.xray)
  const xdiff = xray > expectedXray ? xray - expectedXray : expectedXray - xray
  if (xdiff > 2n) return false
  for (const key of Object.keys(row.scores)) {
    if (!nearScaled(BigInt(r[key]), row.scores[key])) return false
  }
  for (const key of Object.keys(row.moral)) {
    if (!nearScaled(BigInt(m[key]), row.moral[key])) return false
  }
  return true
}

function seedSignatureFailures(c) {
  const failures = []
  const r = c.resonanceProfile
  const m = c.moralOverlay
  const s = c.solarSnapshot
  const verdict = r.verdict
  const expectedHammer = SEED_HAMMER[verdict]
  if (!expectedHammer || c.hammerReason !== expectedHammer) {
    failures.push(`hammerReason ${JSON.stringify(c.hammerReason)} is not the /dev/seed-containers string for verdict ${verdict}`)
  }
  if (r.fullBox7DVerdict !== verdict) {
    failures.push('fullBox7DVerdict differs from verdict')
  }
  if (!SEED_ACTIVITY.has(s.activityLevel)) {
    failures.push(`activityLevel ${JSON.stringify(s.activityLevel)} is outside the seed generator set`)
  }
  if (!SEED_TENSION.has(m.moralNumerologicalTension)) {
    failures.push(`tension ${JSON.stringify(m.moralNumerologicalTension)} is outside the seed generator set`)
  }
  if (!['human', 'agent', 'ambient'].includes(c.source)) {
    failures.push(`source ${JSON.stringify(c.source)} is outside the seed generator set`)
  }
  const scaledScores = SCORE_FIELDS.map((k) => BigInt(r[k]))
  const scaledMoral = MORAL_FIELDS.map((k) => BigInt(m[k]))
  const notQuantized = []
  SCORE_FIELDS.forEach((k, i) => {
    if (!isFourDecimal(scaledScores[i])) notQuantized.push(k)
  })
  MORAL_FIELDS.forEach((k, i) => {
    if (!isFourDecimal(scaledMoral[i])) notQuantized.push(k)
  })
  if (notQuantized.length) {
    failures.push(`scores not 4-decimal quanta: ${notQuantized.join(', ')}`)
  }
  const composite = scaledScores[0]
  if (!inClosedRange(composite, '0.15', '0.99')) failures.push('composite outside [0.15, 0.99]')
  const windows = [
    ['waveProximity', scaledScores[1], '0.175'],
    ['phaseAlignment', scaledScores[2], '0.20'],
    ['calibratedVortex', scaledScores[3], '0.15'],
    ['calibratedSync', scaledScores[4], '0.19'],
    ['neuralProximity', scaledScores[5], '0.16'],
    ['neuralVortex', scaledScores[6], '0.14'],
    ['gematriaResonance', scaledScores[7], '0.18'],
    ['structuralResonance', scaledScores[8], '0.17'],
  ]
  for (const [name, value, half] of windows) {
    if (!withinJitter(value, composite, half)) failures.push(`${name} outside jitter window of composite`)
  }
  const confidence = scaledScores[9]
  if (!inClosedRange(confidence, '0.25', '0.99')) failures.push('confidence outside [0.25, 0.99]')
  const tmo = scaledMoral[0]
  if (!inClosedRange(tmo, '0.30', '0.80')) failures.push('trinitariumMoralScore outside [0.30, 0.80]')
  if (!withinJitter(scaledMoral[1], tmo, '0.15')) failures.push('virtueAlignment outside jitter of moral score')
  if (!withinJitter(scaledMoral[2], tmo, '0.175')) failures.push('moralSafety outside jitter of moral score')
  if (!withinJitter(scaledMoral[3], tmo, '0.14')) failures.push('intentAlignment outside jitter of moral score')
  if (!inClosedRange(scaledMoral[4], '0.225', '0.775')) failures.push('fusion outside [0.225, 0.775]')

  const kp = BigInt(s.kpIndex)
  const proton = BigInt(s.protonFlux)
  const mag = BigInt(s.magnetometer)
  const tdf = BigInt(s.solarTdf)
  const xray = BigInt(s.xrayFlux)
  if (kp < 0n || kp > 800n || kp % 100n !== 0n) failures.push(`kpIndex ${kp} is not scaleKp of an integer 0..8`)
  if (proton < 0n || proton > 199n) failures.push(`protonFlux ${proton} outside 0..199`)
  if (mag < -100n || mag > 99n) failures.push(`magnetometer ${mag} outside -100..99`)
  if (tdf < 0n || tdf > 4n) failures.push(`solarTdf ${tdf} outside 0..4`)
  if (xray < 10n || xray > 2010n) failures.push(`xrayFlux ${xray} outside seed scaleXray range 10..2010`)

  const sum = windows.reduce((acc, [, value]) => acc + value, 0n)
  const avg = sum / 8n
  const passLine = scale1e18('0.65')
  const reviseLine = scale1e18('0.42')
  if (verdict === 'PASS') {
    if (avg + ROUND_SLACK < passLine) failures.push('PASS verdict disagrees with sub-metric average')
  } else if (verdict === 'NEEDS_REVISION') {
    if (avg + ROUND_SLACK < reviseLine || avg > passLine + ROUND_SLACK) {
      failures.push('NEEDS_REVISION verdict disagrees with sub-metric average')
    }
  } else if (verdict === 'FAIL') {
    if (avg > reviseLine + ROUND_SLACK) failures.push('FAIL verdict disagrees with sub-metric average')
  } else {
    failures.push(`verdict ${verdict} is not produced by the seed generator`)
  }
  return failures
}

function realSignatureFailures(c) {
  const failures = []
  const r = c.resonanceProfile
  const m = c.moralOverlay
  const s = c.solarSnapshot
  if (!REAL_HAMMERS.has(c.hammerReason)) {
    failures.push(`hammerReason ${JSON.stringify(c.hammerReason)} is not in the dynamoSolarGovernance set`)
  }
  if (BigInt(s.protonFlux) !== 0n) failures.push('protonFlux is not the governanceToContainer hardcode 0')
  if (BigInt(s.magnetometer) !== 0n) failures.push('magnetometer is not the governanceToContainer hardcode 0')
  if (!REAL_TENSION.has(m.moralNumerologicalTension)) {
    failures.push(`tension ${JSON.stringify(m.moralNumerologicalTension)} is outside computeTrinitariumGematriaFusion`)
  }
  if (!REAL_VERDICT.has(r.verdict)) failures.push(`verdict ${r.verdict} is not PASS|NEEDS_REVISION|REJECT`)
  if (!REAL_ACTIVITY.has(s.activityLevel)) {
    failures.push(`activityLevel ${JSON.stringify(s.activityLevel)} is outside the live solar classifier`)
  }
  return failures
}

function normalize(raw) {
  const c = raw
  return {
    containerId: String(c.containerId),
    timestamp: BigInt(c.timestamp).toString(),
    proposalHash: String(c.proposalHash),
    solarSnapshot: {
      timestamp: BigInt(c.solarSnapshot.timestamp).toString(),
      activityLevel: c.solarSnapshot.activityLevel,
      xrayFlux: BigInt(c.solarSnapshot.xrayFlux).toString(),
      kpIndex: BigInt(c.solarSnapshot.kpIndex).toString(),
      protonFlux: BigInt(c.solarSnapshot.protonFlux).toString(),
      magnetometer: BigInt(c.solarSnapshot.magnetometer).toString(),
      solarTdf: BigInt(c.solarSnapshot.solarTdf).toString(),
    },
    resonanceProfile: {
      fullBox7DComposite: BigInt(c.resonanceProfile.fullBox7DComposite).toString(),
      fullBox7DVerdict: c.resonanceProfile.fullBox7DVerdict,
      waveProximity: BigInt(c.resonanceProfile.waveProximity).toString(),
      phaseAlignment: BigInt(c.resonanceProfile.phaseAlignment).toString(),
      calibratedVortex: BigInt(c.resonanceProfile.calibratedVortex).toString(),
      calibratedSync: BigInt(c.resonanceProfile.calibratedSync).toString(),
      neuralProximity: BigInt(c.resonanceProfile.neuralProximity).toString(),
      neuralVortex: BigInt(c.resonanceProfile.neuralVortex).toString(),
      gematriaResonance: BigInt(c.resonanceProfile.gematriaResonance).toString(),
      structuralResonance: BigInt(c.resonanceProfile.structuralResonance).toString(),
      verdict: c.resonanceProfile.verdict,
      confidence: BigInt(c.resonanceProfile.confidence).toString(),
    },
    moralOverlay: {
      trinitariumMoralScore: BigInt(c.moralOverlay.trinitariumMoralScore).toString(),
      virtueAlignment: BigInt(c.moralOverlay.virtueAlignment).toString(),
      moralSafety: BigInt(c.moralOverlay.moralSafety).toString(),
      intentAlignment: BigInt(c.moralOverlay.intentAlignment).toString(),
      trinitariumGematriaFusion: BigInt(c.moralOverlay.trinitariumGematriaFusion).toString(),
      moralNumerologicalTension: c.moralOverlay.moralNumerologicalTension,
    },
    hammerReason: c.hammerReason,
    previousContainerHash: String(c.previousContainerHash),
    containerHash: String(c.containerHash),
    source: c.source,
    creator: String(c.creator),
    blockNumber: BigInt(c.blockNumber).toString(),
  }
}

function classifyAll(containers) {
  const prelim = containers.map((c, index) => {
  const dev = DEV_BY_ID.get(c.containerId.toLowerCase())
  if (dev && matchesDevScript(dev, c)) {
    return {
      index,
      classification: 'seed',
      evidenceKind: 'dev-script',
      devLabel: dev.label,
      container: c,
    }
  }
  if (dev && !matchesDevScript(dev, c)) {
    return {
      index,
      classification: 'unknown',
      evidenceKind: 'dev-id-mismatch',
      devLabel: dev.label,
      container: c,
      seedFailures: seedSignatureFailures(c),
      realFailures: realSignatureFailures(c),
    }
  }
  const seedFailures = seedSignatureFailures(c)
  const realFailures = realSignatureFailures(c)
  if (seedFailures.length === 0 && realFailures.length > 0) {
    return { index, classification: 'seed', evidenceKind: 'seed-signature', container: c }
  }
  if (realFailures.length === 0 && seedFailures.length > 0) {
    return { index, classification: 'real', evidenceKind: 'real-signature', container: c }
  }
  return {
    index,
    classification: 'unknown',
    evidenceKind: 'unproven',
    container: c,
    seedFailures,
    realFailures,
  }
})

const burst = new Map()
for (const row of prelim) {
  if (row.classification !== 'seed' || row.evidenceKind !== 'seed-signature') continue
  const ts = row.container.timestamp
  burst.set(ts, (burst.get(ts) ?? 0) + 1)
}

  return prelim.map((row) => {
    const reason = row.classification === 'seed' && row.evidenceKind === 'dev-script'
      ? 'dev-test-script'
      : row.classification === 'seed'
        ? 'dev-seed-route'
        : row.classification === 'real'
          ? 'real-governance'
          : 'unproven'
    return {
      id: row.container.containerId.toLowerCase(),
      class: row.classification,
      reason,
    }
  })
}

function countsOf(rows) {
  const counts = { seed: 0, real: 0, unknown: 0 }
  const seedBreakdown = { devSeedRoute: 0, devTestScript: 0 }
  for (const row of rows) {
    counts[row.class] += 1
    if (row.reason === 'dev-seed-route') seedBreakdown.devSeedRoute += 1
    if (row.reason === 'dev-test-script') seedBreakdown.devTestScript += 1
  }
  return { counts, seedBreakdown }
}

function summaryMarkdown(report) {
  const { counts, seedBreakdown } = report
  return `# Container seed audit

Reproduce this split with a read-only chain read. The script sends no transaction and writes no Redis key.

\`\`\`bash
node mcp/scripts/audit-container-seeds.mjs
\`\`\`

Run it from the repository root after \`npm install\` so \`viem\` resolves. It calls \`containerCount\`, \`listContainers\`, and \`getContainer\` through public Base RPCs (\`https://mainnet.base.org\`, then \`https://base-rpc.publicnode.com\`).

Optional Redis read: set \`REDIS_URL\`. The script then \`HGETALL\`s \`${ORIGIN_KEY}\` and quits. It does not call a Redis write command, and a Redis tag does not change \`class\`. If \`REDIS_URL\` is unset, Redis is not contacted. The snapshot below was classified without a Redis read.

\`\`\`bash
node mcp/scripts/audit-container-seeds.mjs --from-raw path/to/normalized.json
\`\`\`

\`--from-raw\` classifies a previously saved normalized payload and does not open a socket to the chain. Either mode rewrites this file and \`docs/empirical/container-seed-audit.json\`.

## Counts

| class | count |
| --- | ---: |
| seed | ${counts.seed} |
| real | ${counts.real} |
| unknown | ${counts.unknown} |
| total | ${report.containerCount} |

Seed splits into ${seedBreakdown.devSeedRoute} containers matching the \`POST /dev/seed-containers\` random-metric signature (\`reason: dev-seed-route\`) and ${seedBreakdown.devTestScript} matching \`mcp/scripts/register-test-containers.ts\` (\`reason: dev-test-script\`).

## Checked-in data

\`docs/empirical/container-seed-audit.json\` stores one object per container: \`id\`, \`class\`, \`reason\`. The previous per-container evidence paragraphs and the TypeScript id-list modules are not checked in. Unknown ids in that JSON are what the Manifold flags with \`reviewFlag: unknown\`. They are not dropped.

## Method

A container is unknown unless a code-path invariant matches the on-chain payload. Seed, dev-route signature: the route hammer paired with verdict, 4-decimal score quanta, jitter windows, solar bounds, and verdict agreement with the sub-metric average. Seed, dev test script: container id is sha256 of a script label and the stored payload matches that script. Real: a dynamoSolarGovernance hammer, protonFlux and magnetometer 0, Trinitarium tension, verdict PASS|NEEDS_REVISION|REJECT, and a live solar activity class, and the seed signature does not also hold. Anything else is unknown. Bursts are not used to promote an unknown.

Registry \`${REGISTRY}\` on Base (chain id 8453). No score was changed. No contract call was a write.
`
}

async function readRedisOrigins() {
  if (!process.env.REDIS_URL) {
    console.log('REDIS_URL unset; Redis not contacted')
    return null
  }
  let Redis
  try {
    Redis = (await import('ioredis')).default
  } catch {
    console.log('REDIS_URL is set but ioredis is not installed; Redis not contacted. No write was attempted.')
    return null
  }
  const client = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
  })
  await client.connect()
  const origins = await client.hgetall(ORIGIN_KEY)
  await client.quit()
  const count = origins ? Object.keys(origins).length : 0
  console.log(`redis HGETALL ${ORIGIN_KEY} fields=${count} (not used to assign class)`)
  return origins
}

async function loadFromChain() {
  const client = createPublicClient({
    chain: base,
    transport: fallback(RPCS.map((url) => http(url, { timeout: 20_000 })), { rank: false }),
  })
  const count = await client.readContract({
    address: REGISTRY,
    abi: ABI,
    functionName: 'containerCount',
  })
  console.log('containerCount', count.toString())
  const ids = []
  const pageSize = 100n
  for (let offset = 0n; offset < count; offset += pageSize) {
    const [page] = await client.readContract({
      address: REGISTRY,
      abi: ABI,
      functionName: 'listContainers',
      args: [offset, pageSize],
    })
    ids.push(...page)
  }
  if (BigInt(ids.length) !== count) {
    throw new Error(`list length ${ids.length} != count ${count}`)
  }
  const containers = []
  const batch = 25
  for (let i = 0; i < ids.length; i += batch) {
    const slice = ids.slice(i, i + batch)
    const results = await client.multicall({
      contracts: slice.map((id) => ({
        address: REGISTRY,
        abi: ABI,
        functionName: 'getContainer',
        args: [id],
      })),
      allowFailure: false,
    })
    for (const raw of results) containers.push(normalize(raw))
  }
  return containers
}

function writeReports(rows) {
  const { counts, seedBreakdown } = countsOf(rows)
  const report = {
    registry: REGISTRY,
    chainId: 8453,
    readOnly: true,
    containerCount: rows.length,
    counts,
    seedBreakdown,
    containers: rows,
  }
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n')
  writeFileSync(OUT_MD, summaryMarkdown(report))
  console.log(counts, seedBreakdown)
  console.log('wrote', OUT_JSON)
  console.log('wrote', OUT_MD)
}

const rawFlag = process.argv.indexOf('--from-raw')
let containers
if (rawFlag !== -1) {
  const rawPath = process.argv[rawFlag + 1]
  if (!rawPath) throw new Error('--from-raw requires a path')
  containers = JSON.parse(readFileSync(rawPath, 'utf8'))
  console.log('classifying saved payload', containers.length)
} else {
  containers = await loadFromChain()
}
await readRedisOrigins()
writeReports(classifyAll(containers))
