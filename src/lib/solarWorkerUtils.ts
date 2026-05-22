// Shared NOAA SWPC parsing utilities for the neural worker.
// Imported by neural.worker.ts (Vite-bundled) — avoids duplicating parse
// logic inside a template literal. Mirrors src/lib/solarDataFetcher.ts
// parse helpers (kept separate because the worker needs an importScripts-
// compatible module that doesn't depend on the full fetcher class).

export interface SolarSnapshot {
  xrayUVLift: number
  magPerturbation: number
  kpIndex: number
  hardnessRatio: number
  activityLevel: string
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

export function normalRandom(mean = 0, std = 1): number {
  const u = Math.random()
  const v = Math.random()
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const SWPC = 'https://services.swpc.noaa.gov'

export async function fetchJson(url: string): Promise<any> {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

export interface RawXray {
  short: number
  long: number
  hardnessRatio: number
  flareClass: string
}

export function parseXray(raw: any): RawXray {
  if (!Array.isArray(raw) || raw.length === 0)
    return { short: 1e-9, long: 1e-8, hardnessRatio: 0.1, flareClass: 'A' }
  const shortRows = raw.filter((r: any) => /0\.05/.test(r.energy))
  const longRows  = raw.filter((r: any) => /0\.1-0\.8/.test(r.energy))
  const short = Number(shortRows[shortRows.length - 1]?.flux ?? 1e-9)
  const long  = Number(longRows[longRows.length - 1]?.flux  ?? 1e-8)
  return {
    short,
    long,
    hardnessRatio: long > 0 ? short / long : 0,
    flareClass: long > 1e-4 ? 'X' : long > 1e-5 ? 'M' : long > 1e-6 ? 'C' : long > 1e-7 ? 'B' : 'A',
  }
}

export function parseKp(raw: any): number {
  if (!Array.isArray(raw) || raw.length === 0) return 0
  return Number(raw[raw.length - 1].kp_index ?? 0)
}

export function parseMag(raw: any): { perturbation: number } {
  if (!Array.isArray(raw) || raw.length < 2) return { perturbation: 0 }
  const last = raw[raw.length - 1]
  const prev = raw[raw.length - 6] || last
  const dHp = Number(last.Hp ?? 0) - Number(prev.Hp ?? 0)
  const dHe = Number(last.He ?? 0) - Number(prev.He ?? 0)
  const dHn = Number(last.Hn ?? 0) - Number(prev.Hn ?? 0)
  return { perturbation: Math.sqrt(dHp * dHp + dHe * dHe + dHn * dHn) }
}

export function classifyActivity(xrayLong: number, kp: number): string {
  if (xrayLong > 1e-4 || kp >= 7) return 'storm'
  if (xrayLong > 1e-5 || kp >= 5) return 'active'
  if (xrayLong > 1e-6 || kp >= 3) return 'moderate'
  return 'quiet'
}

export function deriveFeatures(xray: RawXray, kp: number, mag: { perturbation: number }): SolarSnapshot {
  return {
    xrayUVLift: clamp(Math.log10(Math.max(xray.long, 1e-9) / 1e-7) / 3, -0.3, 1.0),
    magPerturbation: clamp(mag.perturbation / 50, 0, 1),
    kpIndex: kp,
    hardnessRatio: xray.hardnessRatio,
    activityLevel: classifyActivity(xray.long, kp),
  }
}

export function computeSolarTarget(features: SolarSnapshot): number {
  const uvNorm = clamp((features.xrayUVLift + 0.3) / 1.3, 0, 1)
  const magNorm = features.magPerturbation
  const kpNorm = features.kpIndex / 9
  const activityBoost = (uvNorm + magNorm + kpNorm) / 3
  return clamp(0.25 + activityBoost * 0.55, 0.25, 0.85)
}

export async function fetchSolarSnapshot(): Promise<{
  features: SolarSnapshot
  target: number
}> {
  const [xrayRaw, kpRaw, magRaw] = await Promise.all([
    fetchJson(SWPC + '/json/goes/primary/xrays-6-hour.json'),
    fetchJson(SWPC + '/json/planetary_k_index_1m.json'),
    fetchJson(SWPC + '/json/goes/primary/magnetometers-6-hour.json'),
  ])
  const xray = parseXray(xrayRaw)
  const kp = parseKp(kpRaw)
  const mag = parseMag(magRaw)
  const features = deriveFeatures(xray, kp, mag)
  return { features, target: computeSolarTarget(features) }
}

export function generateTrainingData(solar: {
  features: SolarSnapshot
  target: number
}): Array<{ inputs: number[]; target: number }> {
  const data: Array<{ inputs: number[]; target: number }> = []
  const baseInputs = [solar.features.xrayUVLift, solar.features.magPerturbation, solar.features.kpIndex / 9]

  const deltaValues = [0.1, 0.25, 0.5, 0.75, 0.9]
  const nValues = [5, 15, 25, 34, 40]
  const phiValues = [1.5, 1.618, 1.666, 1.8, 2.0]

  for (let d = 0; d < deltaValues.length; d++) {
    for (let n = 0; n < nValues.length; n++) {
      const dp = deltaValues[d]
      const nv = nValues[n]
      const pv = phiValues[n % phiValues.length]

      const uvJitter = clamp(baseInputs[0] + normalRandom(0, 0.05), -0.3, 1.0)
      const magJitter = clamp(baseInputs[1] + normalRandom(0, 0.04), 0, 1)
      const kpJitter = clamp(baseInputs[2] + normalRandom(0, 0.03), 0, 1)

      const uvNorm = clamp((uvJitter + 0.3) / 1.3, 0, 1)
      const target = clamp(0.25 + (uvNorm + magJitter + kpJitter) / 3 * 0.55, 0.25, 0.85)

      data.push({
        inputs: [dp, nv / 34, pv / 2, uvJitter, magJitter, kpJitter],
        target: target + normalRandom(0, 0.015),
      })
    }
  }

  const activityLevels = ['quiet', 'moderate', 'active', 'storm']
  const actMult: Record<string, number> = { quiet: 0.3, moderate: 0.5, active: 0.7, storm: 0.9 }
  for (let a = 0; a < activityLevels.length; a++) {
    for (let s = 0; s < 4; s++) {
      const dp = Math.random()
      const nv = 10 + Math.random() * 30
      const baseTarget = actMult[activityLevels[a]]
      data.push({
        inputs: [dp, nv / 34, (1.5 + Math.random() * 0.5) / 2, baseTarget * 0.3, baseTarget * 0.2, baseTarget * 0.4],
        target: clamp(baseTarget + normalRandom(0, 0.03), 0.25, 0.85),
      })
    }
  }

  return data
}
