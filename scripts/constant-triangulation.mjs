/**
 * Exploratory candidate list. Does not change any engine value.
 *
 * Revision history, also in docs/empirical/CONSTANT-TRIANGULATION.md:
 *   fcd4df31 searched 20,592 formulas, including square roots, logarithms, and powers.
 *   Under that grammar voids=7 matched ((5/3)+3)*1.5 with relative error 0.
 *   2603fef dropped addition, subtraction, roots, and logarithms.
 *   This file does not score controls and does not assign a verdict.
 *
 *   node scripts/constant-triangulation.mjs
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

const rows = TARGETS.map(([name, target]) => ({
  name,
  target,
  tried: expressions.length,
  nonFinite,
  closest: best(target),
}))

console.log(JSON.stringify({ // NOSONAR
  note: 'Exploratory candidates only. No evidence of derivation. No verdict.',
  exponents: EXPONENTS,
  maxTerms: MAX_TERMS,
  expressionsTried: expressions.length,
  nonFinite,
  rows,
}, null, 2))
