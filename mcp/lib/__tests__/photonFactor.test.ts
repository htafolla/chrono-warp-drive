import { describe, expect, it } from 'vitest'
import { PHOTON_FACTOR } from '../tlmConstants.js'
import { TemporalBlurrnSignal } from '../temporalBlurrnSignal.js'

describe('Phase 6 PHOTON_FACTOR', () => {
  it('is exactly 4/9', () => {
    expect(PHOTON_FACTOR).toBeCloseTo(4 / 9)
    expect(PHOTON_FACTOR).toBeGreaterThan(0.4)
    expect(PHOTON_FACTOR).toBeLessThan(0.5)
  })

  it('modulates phase coherence without producing NaN', () => {
    const sig = new TemporalBlurrnSignal({ content: 'test' }, 5.781e12, 29)
    expect(Number.isFinite(sig.phaseCoherence)).toBe(true)
    expect(sig.phaseCoherence).toBeGreaterThanOrEqual(0)
    expect(sig.phaseCoherence).toBeLessThanOrEqual(1)
  })
})
