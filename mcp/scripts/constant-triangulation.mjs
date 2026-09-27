/**
 * Fixed-grammar candidate search. Does not change any engine value.
 *
 *   node mcp/scripts/constant-triangulation.mjs
 *
 * Rules are duplicated in docs/empirical/CONSTANT-TRIANGULATION.md.
 * This file is the implementation of those rules. Edit the rules in both
 * places together. The search runs only after the grammar below is fixed.
 */

const ATOMS = [
  ['5/3', 5 / 3],
  ['3', 3],
  ['pi', Math.PI],
  ['c', 3e8],
  ['c_si', 299792458],
  ['inv_alpha', 137.035999],
  ['e', Math.E],
  ['2.5', 2.5],
  ['1.5', 1.5],
  ['60', 60],
  ['360', 360],
]

const EXPONENTS = [-2, -1, 1, 2]
const MAX_TERMS = 3
const CONTROL_N = 200
const CONTROL_SEED = 20260927
const NOTABLE_PERCENTILE = 95

const TARGETS = [
  ['T_c', 137],
  ['P_s', 1.0],
  ['E_t', 0.5],
  ['delta_t', 1e-6],
  ['voids', 7],
  ['n', 3],
  ['TAU', 0.865],
  ['vortex_base', 5.781e12],
]

function mulberry32(seed) {
  let a = seed >>> 0
  return function rng() {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function logUniform(rng, lo, hi) {
  const u = rng()
  return Math.exp(Math.log(lo) + u * (Math.log(hi) - Math.log(lo)))
}

function rel(expr, target) {
  return Math.abs(expr - target) / Math.abs(target)
}

const factors = []
for (const [name, value] of ATOMS) {
  for (const exp of EXPONENTS) {
    factors.push({
      label: `(${name})^${exp}`,
      value: value ** exp,
    })
  }
}

function combinationsWithReplacement(n, k) {
  const out = []
  function rec(start, prefix) {
    if (prefix.length === k) {
      out.push(prefix.slice())
      return
    }
    for (let i = start; i < n; i++) {
      prefix.push(i)
      rec(i, prefix)
      prefix.pop()
    }
  }
  rec(0, [])
  return out
}

const expressions = []
let nonFinite = 0
for (let k = 1; k <= MAX_TERMS; k++) {
  for (const idxs of combinationsWithReplacement(factors.length, k)) {
    let value = 1
    const labels = []
    for (const idx of idxs) {
      value *= factors[idx].value
      labels.push(factors[idx].label)
    }
    if (!Number.isFinite(value) || value === 0) {
      nonFinite += 1
      continue
    }
    expressions.push({ label: labels.join(' * '), value, terms: k })
  }
}

function expectedCount(nFactors, maxTerms) {
  let total = 0
  for (let k = 1; k <= maxTerms; k++) {
    let num = 1
    let den = 1
    for (let i = 0; i < k; i++) {
      num *= nFactors + k - 1 - i
      den *= i + 1
    }
    total += num / den
  }
  return total
}

const expected = expectedCount(factors.length, MAX_TERMS)
if (expressions.length + nonFinite !== expected) {
  throw new Error(`grammar count ${expressions.length}+${nonFinite} != ${expected}`)
}

function best(target) {
  let winner = null
  for (const expr of expressions) {
    const err = rel(expr.value, target)
    if (
      winner === null ||
      err < winner.err ||
      (err === winner.err && expr.terms < winner.terms) ||
      (err === winner.err && expr.terms === winner.terms && expr.label < winner.label)
    ) {
      winner = { label: expr.label, value: expr.value, err, terms: expr.terms }
    }
  }
  return winner
}

function quantile(sorted, p) {
  if (sorted.length === 0) return NaN
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo)
}

const rows = []
for (let t = 0; t < TARGETS.length; t++) {
  const [name, target] = TARGETS[t]
  const winner = best(target)
  const lo = target / Math.sqrt(10)
  const hi = target * Math.sqrt(10)
  const rng = mulberry32(CONTROL_SEED + t)
  const controlErrors = []
  for (let i = 0; i < CONTROL_N; i++) {
    const control = logUniform(rng, lo, hi)
    controlErrors.push(best(control).err)
  }
  controlErrors.sort((a, b) => a - b)
  const worse = controlErrors.filter((err) => err > winner.err).length
  const percentile = (100 * worse) / CONTROL_N
  const verdict = percentile >= NOTABLE_PERCENTILE ? 'notable' : 'no better than chance'
  rows.push({
    name,
    target,
    tried: expressions.length,
    nonFinite,
    winner,
    band: [lo, hi],
    seed: CONTROL_SEED + t,
    controls: CONTROL_N,
    controlBestError: {
      min: controlErrors[0],
      p05: quantile(controlErrors, 0.05),
      p25: quantile(controlErrors, 0.25),
      p50: quantile(controlErrors, 0.50),
      p75: quantile(controlErrors, 0.75),
      p95: quantile(controlErrors, 0.95),
      max: controlErrors[controlErrors.length - 1],
    },
    percentile,
    verdict,
  })
}

const report = {
  atoms: ATOMS.map(([name, value]) => ({ name, value })),
  exponents: EXPONENTS,
  maxTerms: MAX_TERMS,
  factorCount: factors.length,
  expressionsTried: expressions.length,
  nonFinite,
  expected,
  controlN: CONTROL_N,
  controlSeedBase: CONTROL_SEED,
  notablePercentile: NOTABLE_PERCENTILE,
  rows,
}

console.log(JSON.stringify(report, null, 2))
