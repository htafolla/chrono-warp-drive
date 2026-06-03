export interface GematriaResult {
  englishOrdinal: number
  fullReduction: number
  reverseOrdinal: number
  digitalRootEO: number
  digitalRootFR: number
  gematriaTDF: number
  letterCount: number
  eoDensity: number
  frDensity: number
  roDensity: number
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
  const len = clean.length || 1
  const gematriaTDF = eo * 1e8 + fr * 1e4 + ro
  return { englishOrdinal: eo, fullReduction: fr, reverseOrdinal: ro, digitalRootEO: drEO, digitalRootFR: drFR, gematriaTDF, letterCount: clean.length, eoDensity: eo / len, frDensity: fr / len, roDensity: ro / len }
}

export function computeGematriaResonance(
  proposalGematria: GematriaResult,
  solarGematria: GematriaResult,
): number {
  const eoDensitySim = 1 - Math.abs(proposalGematria.eoDensity - solarGematria.eoDensity) / (solarGematria.eoDensity + 1)
  const frDensitySim = 1 - Math.abs(proposalGematria.frDensity - solarGematria.frDensity) / (solarGematria.frDensity + 1)
  const roDensitySim = 1 - Math.abs(proposalGematria.roDensity - solarGematria.roDensity) / (solarGematria.roDensity + 1)

  const drEOMatch = proposalGematria.digitalRootEO === solarGematria.digitalRootEO ? 0.15 : 0
  const drFRMatch = proposalGematria.digitalRootFR === solarGematria.digitalRootFR ? 0.10 : 0

  const raw = eoDensitySim * 0.25 + frDensitySim * 0.20 + roDensitySim * 0.15 + drEOMatch + drFRMatch + 0.15
  return Math.max(0.15, Math.min(0.98, raw))
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
