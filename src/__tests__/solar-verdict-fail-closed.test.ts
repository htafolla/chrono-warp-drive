import { describe, expect, it } from 'vitest'
import { deriveProposalCodexParams } from '../../mcp/lib/solarGovernanceIntegration'
import { resolveActivityLevel, type SolarData } from '../../mcp/lib/solarDataFetcher'

const quietSun = {
  activityLevel: 'quiet',
  xray: { short: 1e-9, long: 1e-8, hardnessRatio: 0.1, flareClass: 'A' },
} as SolarData

describe('solar verdict fail-closed', () => {
  it('keeps the same proposal fingerprint across calls', () => {
    const words = ['upgrade', 'the', 'stellar', 'module']
    const first = deriveProposalCodexParams(words, quietSun)
    const second = deriveProposalCodexParams(words, quietSun)
    expect(second).toEqual(first)
  })

  it('treats a missing X-ray or Kp feed as a storm', () => {
    expect(resolveActivityLevel('quiet', 'fallback', 'ok')).toBe('storm')
    expect(resolveActivityLevel('quiet', 'ok', 'fallback')).toBe('storm')
    expect(resolveActivityLevel('moderate', 'ok', 'ok')).toBe('moderate')
  })
})
