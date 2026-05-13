// mcp/lib/solarDataFetcher.ts
//
// Multi-channel NOAA SWPC ingestion + SolarFeatures derivation, ported from
// src/lib/solarDataFetcher.ts so the MCP backend speaks the same physics as
// the frontend neural pipeline.
//
// Backwards-compat: the legacy `fetchCurrentSolarData()` function and
// `SolarActivityData` shape are preserved so existing consumers
// (backend-server.ts /process-current-sun, solarGovernanceIntegration.ts)
// keep working without a rewrite.

import type { SpectrumData } from '../types/sdss'

// ---------- Types ---------------------------------------------------------

export type ActivityLevel = 'quiet' | 'moderate' | 'active' | 'storm'

export interface XrayChannel {
  short: number          // 0.05–0.4 nm  W/m^2
  long: number           // 0.1–0.8 nm   W/m^2
  hardnessRatio: number  // short / long
  flareClass: 'A' | 'B' | 'C' | 'M' | 'X'
}

export interface ParticleChannel {
  protons: { ge1: number; ge5: number; ge10: number; ge30: number; ge50: number; ge100: number }
  electrons: { ge2MeV: number }
  spectralIndex: number
}

export interface MagnetometerChannel {
  hp: number
  he: number
  hn: number
  total: number
  perturbation: number
}

export interface SolarWindChannel {
  speed: number
  density: number
  temperature: number
  bz: number
  bt: number
}

export interface SolarData {
  timestamp: string
  source: 'NOAA_SWPC'
  xray: XrayChannel
  particles: ParticleChannel
  magnetometer: MagnetometerChannel
  solarWind: SolarWindChannel
  kpIndex: number
  activityLevel: ActivityLevel
  channelStatus: Record<'xray' | 'protons' | 'electrons' | 'mag' | 'wind' | 'kp', 'ok' | 'fallback'>
}

export interface SolarFeatures {
  hardnessRatio: number    // 0..2
  xrayUVLift: number       // -0.3..1.0
  magPerturbation: number  // 0..1
  windBroadeningA: number  // Å sigma for H-α
  kpIndex: number          // 0..9
  activityLevel: ActivityLevel
}

// ---------- Endpoints -----------------------------------------------------

const SWPC = 'https://services.swpc.noaa.gov'

const ENDPOINTS = {
  xray:       `${SWPC}/json/goes/primary/xrays-6-hour.json`,
  protons:    `${SWPC}/json/goes/primary/integral-protons-6-hour.json`,
  electrons:  `${SWPC}/json/goes/primary/integral-electrons-6-hour.json`,
  mag:        `${SWPC}/json/goes/primary/magnetometers-6-hour.json`,
  windPlasma: `${SWPC}/products/solar-wind/plasma-5-minute.json`,
  windMag:    `${SWPC}/products/solar-wind/mag-5-minute.json`,
  kp:         `${SWPC}/json/planetary_k_index_1m.json`,
} as const

// ---------- Fetcher -------------------------------------------------------

export class SolarDataFetcher {
  private cache: { data: SolarData; expiresAt: number } | null = null
  private readonly TTL_MS = 60_000

  async fetchCurrentSolarData(force = false): Promise<SolarData> {
    if (!force && this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.data
    }

    const status: SolarData['channelStatus'] = {
      xray: 'ok', protons: 'ok', electrons: 'ok', mag: 'ok', wind: 'ok', kp: 'ok',
    }

    const [xrayRaw, protonsRaw, electronsRaw, magRaw, plasmaRaw, windMagRaw, kpRaw] =
      await Promise.all([
        this.safeJson(ENDPOINTS.xray,       () => (status.xray = 'fallback')),
        this.safeJson(ENDPOINTS.protons,    () => (status.protons = 'fallback')),
        this.safeJson(ENDPOINTS.electrons,  () => (status.electrons = 'fallback')),
        this.safeJson(ENDPOINTS.mag,        () => (status.mag = 'fallback')),
        this.safeJson(ENDPOINTS.windPlasma, () => (status.wind = 'fallback')),
        this.safeJson(ENDPOINTS.windMag,    () => (status.wind = 'fallback')),
        this.safeJson(ENDPOINTS.kp,         () => (status.kp = 'fallback')),
      ])

    const xray = parseXray(xrayRaw)
    const particles = parseParticles(protonsRaw, electronsRaw)
    const magnetometer = parseMagnetometer(magRaw)
    const solarWind = parseSolarWind(plasmaRaw, windMagRaw)
    const kpIndex = parseKp(kpRaw)
    const activityLevel = classifyActivity(xray, particles, kpIndex)

    const data: SolarData = {
      timestamp: new Date().toISOString(),
      source: 'NOAA_SWPC',
      xray, particles, magnetometer, solarWind, kpIndex,
      activityLevel,
      channelStatus: status,
    }

    this.cache = { data, expiresAt: Date.now() + this.TTL_MS }
    return data
  }

  private async safeJson(url: string, onFail: () => void): Promise<any> {
    try {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`${url} -> ${r.status}`)
      return await r.json()
    } catch (e) {
      console.warn('[solarDataFetcher] channel failed:', e)
      onFail()
      return null
    }
  }

  /** Compact, physically-meaningful feature vector — see frontend twin for rationale. */
  deriveSolarFeatures(solar: SolarData): SolarFeatures {
    return {
      hardnessRatio: clamp(solar.xray.hardnessRatio, 0, 2),
      xrayUVLift: clamp(Math.log10(Math.max(solar.xray.long, 1e-9) / 1e-7) / 3, -0.3, 1.0),
      magPerturbation: clamp(solar.magnetometer.perturbation / 50, 0, 1),
      windBroadeningA: clamp(solar.solarWind.speed / 800, 0.4, 2.5) * 8,
      kpIndex: solar.kpIndex,
      activityLevel: solar.activityLevel,
    }
  }

  /** 3800–9200 Å spectrum compatible with NeuralFusion. */
  solarDataToSpectrum(solar: SolarData, points = 256): SpectrumData {
    const lambdaStartA = 3800
    const lambdaEndA = 9200
    const f = this.deriveSolarFeatures(solar)

    const wavelengths = new Array<number>(points)
    const intensities = new Array<number>(points)

    for (let i = 0; i < points; i++) {
      const lambdaA = lambdaStartA + (lambdaEndA - lambdaStartA) * (i / (points - 1))

      let I = planckNormalized(lambdaA, 5778)
      const tilt = 1 + 0.35 * f.hardnessRatio * (5500 - lambdaA) / 5500
      I *= clamp(tilt, 0.6, 1.6)
      const blueWeight = Math.exp(-Math.pow((lambdaA - 3900) / 400, 2))
      I += f.xrayUVLift * blueWeight * 0.6
      I -= absorptionLine(lambdaA, 6563, f.windBroadeningA, 0.45)

      wavelengths[i] = lambdaA
      intensities[i] = clamp(I, 0, 2)
    }

    return {
      wavelengths,
      intensities,
      granularity: (lambdaEndA - lambdaStartA) / points,
      source: 'STELLAR_LIBRARY',
      metadata: { class: `Sun (${solar.activityLevel})` },
    }
  }
}

export const solarDataFetcher = new SolarDataFetcher()

// ---------- Helpers -------------------------------------------------------

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

function planckNormalized(lambdaA: number, T: number) {
  const h = 6.626e-34, c = 3e8, k = 1.38e-23
  const l = lambdaA * 1e-10
  const val = (2 * h * c * c) / (Math.pow(l, 5) * (Math.exp((h * c) / (l * k * T)) - 1))
  return val / 1.5e13
}

function absorptionLine(l: number, center: number, sigma: number, depth: number) {
  return depth * Math.exp(-Math.pow(l - center, 2) / (2 * sigma * sigma))
}

function linearSlope(points: number[][]) {
  const n = points.length
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
  for (const [x, y] of points) {
    sumX += x; sumY += y; sumXY += x * y; sumXX += x * x
  }
  return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
}

function classifyFlare(long: number): XrayChannel['flareClass'] {
  if (long > 1e-4) return 'X'
  if (long > 1e-5) return 'M'
  if (long > 1e-6) return 'C'
  if (long > 1e-7) return 'B'
  return 'A'
}

function classifyActivity(x: XrayChannel, _p: ParticleChannel, kp: number): ActivityLevel {
  if (x.long > 1e-4 || kp >= 7) return 'storm'
  if (x.long > 1e-5 || kp >= 5) return 'active'
  if (x.long > 1e-6 || kp >= 3) return 'moderate'
  return 'quiet'
}

function parseXray(raw: any): XrayChannel {
  if (!Array.isArray(raw) || raw.length === 0) return { short: 1e-9, long: 1e-8, hardnessRatio: 0.1, flareClass: 'A' }
  const shortRows = raw.filter((r: any) => /0\.05/.test(r.energy))
  const longRows  = raw.filter((r: any) => /0\.1-0\.8/.test(r.energy))
  const short = Number(shortRows[shortRows.length - 1]?.flux ?? 1e-9)
  const long  = Number(longRows[longRows.length - 1]?.flux  ?? 1e-8)
  return { short, long, hardnessRatio: long > 0 ? short / long : 0, flareClass: classifyFlare(long) }
}

function parseParticles(protonRaw: any, electronRaw: any): ParticleChannel {
  const protons = { ge1: 0, ge5: 0, ge10: 0, ge30: 0, ge50: 0, ge100: 0 }
  if (Array.isArray(protonRaw)) {
    const energyMap: Record<string, keyof typeof protons> = { '>=1 MeV': 'ge1', '>=5 MeV': 'ge5', '>=10 MeV': 'ge10', '>=30 MeV': 'ge30', '>=50 MeV': 'ge50', '>=100 MeV': 'ge100' }
    for (const key of Object.keys(energyMap)) {
      const rows = protonRaw.filter((r: any) => r.energy === key)
      const last = rows[rows.length - 1]
      if (last?.flux != null) protons[energyMap[key]] = Number(last.flux)
    }
  }
  const electronRows = Array.isArray(electronRaw) ? electronRaw.filter((r: any) => /2 MeV/.test(r.energy)) : []
  const ge2MeV = Number(electronRows[electronRows.length - 1]?.flux ?? 0)
  const energies = [1, 5, 10, 30, 50, 100]
  const fluxes = [protons.ge1, protons.ge5, protons.ge10, protons.ge30, protons.ge50, protons.ge100]
  const valid = energies.map((e, i) => [Math.log10(e), Math.log10(Math.max(fluxes[i], 1e-6))])
  const spectralIndex = -linearSlope(valid)
  return { protons, electrons: { ge2MeV }, spectralIndex }
}

function parseMagnetometer(raw: any): MagnetometerChannel {
  if (!Array.isArray(raw) || raw.length === 0) return { hp: 0, he: 0, hn: 0, total: 0, perturbation: 0 }
  const last = raw[raw.length - 1]
  const prev = raw[Math.max(0, raw.length - 6)] ?? last
  const hp = Number(last.Hp ?? 0), he = Number(last.He ?? 0), hn = Number(last.Hn ?? 0)
  const total = Math.sqrt(hp*hp + he*he + hn*hn)
  const dHp = hp - Number(prev.Hp ?? hp)
  const dHe = he - Number(prev.He ?? he)
  const dHn = hn - Number(prev.Hn ?? hn)
  const perturbation = Math.sqrt(dHp*dHp + dHe*dHe + dHn*dHn)
  return { hp, he, hn, total, perturbation }
}

function parseSolarWind(plasmaRaw: any, windMagRaw: any): SolarWindChannel {
  let speed = 400, density = 5, temperature = 1e5, bz = 0, bt = 0
  if (Array.isArray(plasmaRaw) && plasmaRaw.length > 1) {
    const last = plasmaRaw[plasmaRaw.length - 1]
    density = Number(last[1]) || density
    speed = Number(last[2]) || speed
    temperature = Number(last[3]) || temperature
  }
  if (Array.isArray(windMagRaw) && windMagRaw.length > 1) {
    const last = windMagRaw[windMagRaw.length - 1]
    bz = Number(last[3]) || 0
    bt = Number(last[6]) || Math.abs(bz)
  }
  return { speed, density, temperature, bz, bt }
}

function parseKp(raw: any): number {
  if (!Array.isArray(raw) || raw.length === 0) return 0
  return Number(raw[raw.length - 1].kp_index ?? 0)
}

// ---------- Legacy compat shim -------------------------------------------
// Old call sites expected a flat SolarActivityData with synthetic 50-pt
// 300–1300 nm spectrum. Keep them working by delegating to the new fetcher
// and reshaping the output.

export interface SolarActivityData {
  timestamp: string
  xrayFlux: number
  xrayFluxString: string
  activityLevel: ActivityLevel
  wavelengths: number[]  // nm (legacy)
  flux: number[]
  source: 'NOAA-GOES' | 'NOAA-GOES (fallback)'
  metadata: { satellite: string; dataType: string; url: string }
}

export async function fetchCurrentSolarData(): Promise<SolarActivityData> {
  try {
    const solar = await solarDataFetcher.fetchCurrentSolarData()
    const spec = solarDataFetcher.solarDataToSpectrum(solar, 50)
    return {
      timestamp: solar.timestamp,
      xrayFlux: solar.xray.long,
      xrayFluxString: solar.xray.long.toExponential(2),
      activityLevel: solar.activityLevel,
      // Convert Å → nm for legacy consumers
      wavelengths: spec.wavelengths.map((a) => a / 10),
      flux: spec.intensities,
      source: solar.channelStatus.xray === 'ok' ? 'NOAA-GOES' : 'NOAA-GOES (fallback)',
      metadata: {
        satellite: 'GOES-16',
        dataType: 'synthetic fallback',
        url: 'https://services.swpc.noaa.gov',
      },
    }
  } catch (error: any) {
    console.error('Failed to fetch solar data:', error.message)
    // Return fallback synthetic data
    const { wavelengths, flux } = generateSolarSpectrum(1e-7, 'quiet')
    return {
      timestamp: new Date().toISOString(),
      xrayFlux: 1e-7,
      xrayFluxString: '1.0e-7',
      activityLevel: 'quiet',
      wavelengths,
      flux,
      source: 'NOAA-GOES (fallback)',
      metadata: {
        satellite: 'GOES-16',
        dataType: 'synthetic fallback',
        url: 'https://services.swpc.noaa.gov',
      },
    }
  }
}
