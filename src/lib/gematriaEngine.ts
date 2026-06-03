export interface GematriaResult {
  englishOrdinal: number
  fullReduction: number
  reverseOrdinal: number
  digitalRootEO: number
  digitalRootFR: number
  gematriaTDF: number
  letterCount: number
}

const EO: Record<string, number> = {}
const FR: Record<string, number> = {}
const RO: Record<string, number> = {}
const alphabet = 'abcdefghijklmnopqrstuvwxyz'
for (let i = 0; i < 26; i++) {
  const c = alphabet[i]
  EO[c] = i + 1
  FR[c] = (i % 9) + 1
  RO[c] = 26 - i
}

function digitalRoot(n: number): number {
  while (n >= 10) {
    let s = 0
    while (n > 0) { s += n % 10; n = Math.floor(n / 10) }
    n = s
  }
  return n
}

export function computeGematria(text: string): GematriaResult {
  const clean = text.toLowerCase().replace(/[^a-z]/g, '')
  let eo = 0, fr = 0, ro = 0
  for (const ch of clean) {
    eo += EO[ch] ?? 0
    fr += FR[ch] ?? 0
    ro += RO[ch] ?? 0
  }
  const drEO = digitalRoot(eo)
  const drFR = digitalRoot(fr)
  const gematriaTDF = eo * 1e8 + fr * 1e4 + ro
  return { englishOrdinal: eo, fullReduction: fr, reverseOrdinal: ro, digitalRootEO: drEO, digitalRootFR: drFR, gematriaTDF, letterCount: clean.length }
}

export function computeGematriaResonance(
  proposalGematria: GematriaResult,
  solarGematria: GematriaResult,
): number {
  const eoDiff = Math.abs(proposalGematria.englishOrdinal - solarGematria.englishOrdinal)
  const frDiff = Math.abs(proposalGematria.fullReduction - solarGematria.fullReduction)
  const roDiff = Math.abs(proposalGematria.reverseOrdinal - solarGematria.reverseOrdinal)
  const maxEO = Math.max(proposalGematria.englishOrdinal, solarGematria.englishOrdinal, 1)
  const maxFR = Math.max(proposalGematria.fullReduction, solarGematria.fullReduction, 1)
  const maxRO = Math.max(proposalGematria.reverseOrdinal, solarGematria.reverseOrdinal, 1)
  const eoSim = 1 - eoDiff / (maxEO + 1)
  const frSim = 1 - frDiff / (maxFR + 1)
  const roSim = 1 - roDiff / (maxRO + 1)
  return Math.max(0.15, Math.min(0.98, eoSim * 0.40 + frSim * 0.35 + roSim * 0.25))
}

export function computeGematriaVortex(
  proposalText: string,
  solarText: string,
): { gematriaResonance: number; gematriaTDF: number; proposal: GematriaResult; solar: GematriaResult } {
  const p = computeGematria(proposalText)
  const s = computeGematria(solarText)
  const gematriaResonance = computeGematriaResonance(p, s)
  return { gematriaResonance, gematriaTDF: p.gematriaTDF, proposal: p, solar: s }
}

export const DEFAULT_SOLAR_GEMATRIA_TEXT = 'The Sun is the source of all life and light and truth'
