// mcp/lib/solarDataFetcher.ts
// Fetches live solar data from NOAA GOES and converts to spectrum format

export interface SolarActivityData {
  timestamp: string
  xrayFlux: number
  xrayFluxString: string
  activityLevel: 'quiet' | 'moderate' | 'active' | 'storm'
  wavelengths: number[] // nm
  flux: number[]
  source: 'NOAA-GOES'
  metadata: {
    satellite: string
    dataType: string
    url: string
  }
}

// GOES X-ray flux classifications
const FLUX_LEVELS = [
  { threshold: 1e-7, level: 'storm' as const, label: 'X-class' },
  { threshold: 1e-6, level: 'active' as const, label: 'M-class' },
  { threshold: 1e-5, level: 'moderate' as const, label: 'C-class' },
  { threshold: 1e-4, level: 'quiet' as const, label: 'B-class' },
]

function determineActivityLevel(xrayFlux: number): SolarActivityData['activityLevel'] {
  for (const { threshold, level } of FLUX_LEVELS) {
    if (xrayFlux >= threshold) return level
  }
  return 'quiet'
}

// Convert X-ray flux to synthetic optical spectrum
function generateSolarSpectrum(xrayFlux: number, activityLevel: string): { wavelengths: number[]; flux: number[] } {
  // Solar spectrum roughly 300-1300nm
  const wavelengths = Array.from({ length: 50 }, (_, i) => 300 + i * 20)

  // Base solar blackbody at 5772K
  const baseFlux = wavelengths.map((w) => {
    const wm = w * 1e-9 // nm to m
    const h = 6.626e-34
    const c = 3e8
    const k = 1.381e-23
    const T = 5772
    return (2 * h * c * c) / (Math.pow(wm, 5) * (Math.exp((h * c) / (wm * k * T)) - 1))
  })

  // Normalize
  const maxBase = Math.max(...baseFlux)
  const normalized = baseFlux.map((f) => f / maxBase)

  // Activity modulation — higher activity = more UV/blue enhancement
  const activityMultiplier = activityLevel === 'storm' ? 1.3 :
    activityLevel === 'active' ? 1.15 :
    activityLevel === 'moderate' ? 1.05 : 1.0

  const flux = normalized.map((f, i) => {
    // Enhance shorter wavelengths (UV/blue) during high activity
    const uvBoost = i < 15 ? (activityMultiplier - 1) * 0.5 : 0
    return Math.min(f * activityMultiplier + uvBoost, 1.5)
  })

  return { wavelengths, flux }
}

export async function fetchCurrentSolarData(): Promise<SolarActivityData> {
  try {
    // NOAA GOES X-ray flux JSON (current 6 hours)
    const response = await fetch('https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json')

    if (!response.ok) {
      throw new Error(`NOAA API error: ${response.status}`)
    }

    const data: any[] = await response.json()

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No solar data available')
    }

    // Get latest reading
    const latest = data[data.length - 1]
    const xrayFlux = parseFloat(latest.flux) || 1e-7
    const timestamp = latest.time_tag || new Date().toISOString()
    const satellite = latest.satellite || 'GOES-16'

    const activityLevel = determineActivityLevel(xrayFlux)
    const { wavelengths, flux } = generateSolarSpectrum(xrayFlux, activityLevel)

    return {
      timestamp,
      xrayFlux,
      xrayFluxString: latest.flux || xrayFlux.toExponential(2),
      activityLevel,
      wavelengths,
      flux,
      source: 'NOAA-GOES',
      metadata: {
        satellite,
        dataType: 'X-ray flux + synthetic optical spectrum',
        url: 'https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json',
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
