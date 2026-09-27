/**
 * Candidate expressions for unjustified MCP constants.
 * Prints relative errors. Does not change any engine value.
 *
 *   node mcp/scripts/constant-triangulation.mjs
 *
 * The old truncated PHI decimal is written as 1666/1000.
 */
const PHI_TRUNC = 1666 / 1000
const atoms = [
  ['5/3', 5 / 3],
  ['3', 3],
  ['pi', Math.PI],
  ['c', 3e8],
  ['c_exact', 299792458],
  ['inv_alpha', 137.035999],
  ['e', Math.E],
  ['2.5', 2.5],
  ['1.5', 1.5],
  ['60', 60],
  ['360', 360],
]

const targets = [
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

const exprs = []
function add(label, value) {
  if (!Number.isFinite(value)) return
  exprs.push([label, value])
}

for (const [n, v] of atoms) add(n, v)
for (const [n, v] of atoms) {
  add(`sqrt(${n})`, Math.sqrt(v))
  add(`(${n})^2`, v * v)
  add(`(${n})^3`, v * v * v)
  add(`1/(${n})`, 1 / v)
  add(`ln(${n})`, Math.log(v))
  add(`log10(${n})`, Math.log10(v))
}
for (let i = 0; i < atoms.length; i++) {
  for (let j = 0; j < atoms.length; j++) {
    const [an, av] = atoms[i]
    const [bn, bv] = atoms[j]
    add(`(${an}+${bn})`, av + bv)
    add(`(${an}-${bn})`, av - bv)
    add(`(${an}*${bn})`, av * bv)
    add(`(${an}/${bn})`, av / bv)
    if (Math.abs(bv) <= 8) add(`(${an}^${bn})`, Math.pow(av, bv))
  }
}
for (let i = 0; i < atoms.length; i++) {
  for (let j = 0; j < atoms.length; j++) {
    for (let k = 0; k < atoms.length; k++) {
      const [an, av] = atoms[i]
      const [bn, bv] = atoms[j]
      const [cn, cv] = atoms[k]
      const pairs = [
        [`((${an}+${bn})+${cn})`, (av + bv) + cv],
        [`((${an}+${bn})-${cn})`, (av + bv) - cv],
        [`((${an}+${bn})*${cn})`, (av + bv) * cv],
        [`((${an}+${bn})/${cn})`, (av + bv) / cv],
        [`((${an}-${bn})+${cn})`, (av - bv) + cv],
        [`((${an}-${bn})*${cn})`, (av - bv) * cv],
        [`((${an}-${bn})/${cn})`, (av - bv) / cv],
        [`((${an}*${bn})+${cn})`, (av * bv) + cv],
        [`((${an}*${bn})-${cn})`, (av * bv) - cv],
        [`((${an}*${bn})*${cn})`, (av * bv) * cv],
        [`((${an}*${bn})/${cn})`, (av * bv) / cv],
        [`((${an}/${bn})+${cn})`, (av / bv) + cv],
        [`((${an}/${bn})-${cn})`, (av / bv) - cv],
        [`((${an}/${bn})*${cn})`, (av / bv) * cv],
        [`((${an}/${bn})/${cn})`, (av / bv) / cv],
      ]
      for (const [label, value] of pairs) add(label, value)
    }
  }
}

function isIdentity(label) {
  return /^\(([^()]+)\/\1\)$/.test(label)
}

console.log(`expressions=${exprs.length}`)
console.log('')

for (const [name, target] of targets) {
  const ranked = exprs
    .map(([label, value]) => ({ label, value, err: rel(value, target), identity: isIdentity(label) }))
    .filter(row => Number.isFinite(row.err))
    .sort((a, b) => a.err - b.err)
  const within = ranked.filter(row => row.err <= 0.001 && !row.identity)
  const identities = ranked.filter(row => row.identity && row.err === 0)
  console.log(`## ${name} = ${target}`)
  console.log(`within 0.1% (excluding a/a identities): ${within.length}`)
  console.log(`exact a/a identities: ${identities.length}`)
  const shown = []
  const seen = new Set()
  for (const row of ranked) {
    if (row.identity) continue
    const key = `${row.err.toExponential(8)}:${row.value}`
    if (seen.has(key)) continue
    seen.add(key)
    shown.push(row)
    if (shown.length >= 6) break
  }
  for (const row of shown) {
    console.log(`  ${row.label} = ${row.value}  rel=${row.err}`)
  }
  if (within.length > 6) {
    console.log(`  ... ${within.length} non-identity expressions are within 0.1%`)
  }
  const unique = new Map()
  for (const row of within) {
    const key = row.value.toPrecision(12)
    const prev = unique.get(key)
    if (!prev || row.label.length < prev.label.length) unique.set(key, row)
  }
  console.log(`  unique values within 0.1%: ${unique.size}`)
  for (const row of unique.values()) {
    console.log(`  UNIQUE ${row.label} = ${row.value} rel=${row.err}`)
  }
  console.log('')
}

const sqrt3over2 = Math.sqrt(3) / 2
console.log('## named checks')
console.log(`sqrt(3)/2 = ${sqrt3over2}`)
console.log(`TAU vs sqrt(3)/2 rel = ${rel(0.865, sqrt3over2)}`)
console.log(`2.5/1.5 = ${2.5 / 1.5} equals 5/3? ${2.5 / 1.5 === 5 / 3}`)
console.log(`1.5/3 = ${1.5 / 3} equals 0.5? ${1.5 / 3 === 0.5}`)
console.log(`trunc(inv_alpha) = ${Math.trunc(137.035999)}`)
console.log(`T_c vs inv_alpha rel = ${rel(137, 137.035999)}`)
console.log(`e/pi = ${Math.E / Math.PI} rel vs TAU = ${rel(Math.E / Math.PI, 0.865)}`)

function chain(phi) {
  const tptt = 137 * (1 / 0.5) * phi * (3e8 / 1e-6)
  const bhs = ((3 * 7) * Math.pow(phi, 3)) % Math.PI
  const tdf = tptt * 0.865 * (1 / bhs)
  return { tptt, bhs, tdf }
}
const old = chain(PHI_TRUNC)
const neu = chain(5 / 3)
const base = 5.781e12
console.log('default chain PHI trunc', old)
console.log('default chain PHI 5/3', neu)
console.log('base/oldTdf', base / old.tdf, 'rel', rel(base, old.tdf))
console.log('base/newTdf', base / neu.tdf, 'rel', rel(base, neu.tdf))
console.log('oldTdf/base', old.tdf / base)
console.log('newTdf/base', neu.tdf / base)
console.log('base/TAU', base / 0.865)
console.log('base/oldBHS', base / old.bhs)
console.log('base/newBHS', base / neu.bhs)
console.log('base/oldTptt', base / old.tptt)
console.log('base/newTptt', base / neu.tptt)

function bhs(phi, voids, n) {
  return ((3 * voids) * Math.pow(phi, n)) % Math.PI
}
console.log('BHS voids=1 n=1 PHI trunc', bhs(PHI_TRUNC, 1, 1))
console.log('BHS voids=1 n=1 PHI 5/3', bhs(5 / 3, 1, 1))
