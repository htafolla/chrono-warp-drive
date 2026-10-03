import { afterEach, describe, expect, it, vi } from 'vitest'
import { solarGovernance } from '../../mcp/lib/solarGovernanceIntegration'
import { TextDerivedSignal } from '../../mcp/lib/signalFromText'
import {
  fetchCurrentSolarData,
  resolveActivityLevel,
  SolarDataFetcher,
  SolarMeasurementMissing,
} from '../../mcp/lib/solarDataFetcher'
import { solarGovernance as appGovernance } from '../lib/solarGovernanceIntegration'
import { SolarDataFetcher as AppSolarDataFetcher, SolarMeasurementMissing as AppSolarMeasurementMissing } from '../lib/solarDataFetcher'

describe('solar verdict fail-closed', () => {
  it('treats a missing X-ray or Kp feed as a storm', () => {
    expect(resolveActivityLevel('quiet', 'fallback', 'ok')).toBe('storm')
    expect(resolveActivityLevel('quiet', 'ok', 'fallback')).toBe('storm')
    expect(resolveActivityLevel('moderate', 'ok', 'ok')).toBe('moderate')
  })
})

const measuredXray = [
  { energy: '0.05-0.4nm', flux: 1.2e-6 },
  { energy: '0.1-0.8nm', flux: 3.4e-6 },
]

function jsonBody(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}

function stubChannels(xray: unknown, kp: unknown) {
  vi.stubGlobal('fetch', async (url: string) => {
    const target = String(url)
    if (target.includes('xrays')) return jsonBody(xray)
    if (target.includes('planetary_k')) return jsonBody(kp)
    return jsonBody([])
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('missing solar measurement', () => {
  it('does not store an empty X-ray body as an A-class sun', async () => {
    stubChannels([], [{ kp_index: 4 }])
    const fetcher = new SolarDataFetcher()
    await expect(fetcher.fetchCurrentSolarData()).rejects.toBeInstanceOf(SolarMeasurementMissing)
    expect(fetcher.getRecentObservations()).toEqual([])
    await expect(fetchCurrentSolarData()).rejects.toBeInstanceOf(SolarMeasurementMissing)
  })

  it('does not store a missing Kp body as zero', async () => {
    stubChannels(measuredXray, [])
    const fetcher = new SolarDataFetcher()
    await expect(fetcher.fetchCurrentSolarData()).rejects.toBeInstanceOf(SolarMeasurementMissing)
    expect(fetcher.getRecentObservations()).toEqual([])
  })

  it('keeps a measured Kp of zero', async () => {
    stubChannels(measuredXray, [{ kp_index: 0 }])
    const solar = await new SolarDataFetcher().fetchCurrentSolarData()
    expect(solar.kpIndex).toBe(0)
    expect(solar.xray.flareClass).not.toBe('A')
    expect(solar.xray.long).toBe(3.4e-6)
  })

  it('rejects governance when the sun reading is missing', async () => {
    stubChannels([], [{ kp_index: 2 }])
    const context = await solarGovernance.getSolarContextForGovernance()
    expect(context.solarActivityLevel).toBe('storm')
    expect(context.recommendation).toBe('Solar data unavailable — fail closed')
    const hammer = await solarGovernance.getProposalSolarIsotopicResonance('upgrade the stellar module')
    expect(hammer.measurementFailed).toBe(true)
    expect(hammer.hybridVerdict).toBe('REJECT')
    expect(hammer.structuralResonance).toBe(0)
    expect(hammer.solarIsotopicResonance).toBe(0)
    expect(hammer.fullBox7DComposite).toBe(0)
    expect(hammer.isotope).toBe(new TextDerivedSignal('upgrade the stellar module').getIsotopeId())
  })

  it('rejects the app mirror when the sun reading is missing', async () => {
    stubChannels([], [{ kp_index: 2 }])
    const fetcher = new AppSolarDataFetcher()
    await expect(fetcher.fetchCurrentSolarData()).rejects.toBeInstanceOf(AppSolarMeasurementMissing)
    await expect(fetcher.fetchCurrentSolarData()).rejects.toBeInstanceOf(AppSolarMeasurementMissing)
    const context = await appGovernance.getSolarContextForGovernance()
    expect(context.solarActivityLevel).toBe('storm')
    expect(context.recommendation).toBe('Solar data unavailable — fail closed')
    const hammer = await appGovernance.getProposalSolarIsotopicResonance('upgrade the stellar module')
    expect(hammer.measurementFailed).toBe(true)
    expect(hammer.hybridVerdict).toBe('REJECT')
    expect(hammer.solarIsotopicResonance).toBe(0.10)
    expect(hammer.solarActivityLevel).toBe('storm')
  })
})
