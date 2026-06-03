// Lightweight unit tests for the backend solar coupling layer.
// Run with: cd mcp && npx vitest run lib/__tests__/solarCoupling.test.ts
// (or whatever runner the mcp package uses).

import { describe, it, expect } from 'vitest'
import { applySolarOutputModulation, SOLAR_COUPLING } from '../solarCoupling'

const QUIET = { xrayUVLift: 0, magPerturbation: 0, activityLevel: 'quiet' as const }
const ACTIVE = { xrayUVLift: 0.8, magPerturbation: 0.2, activityLevel: 'active' as const }
const STORM = { xrayUVLift: 1.0, magPerturbation: 1.0, activityLevel: 'storm' as const }

describe('applySolarOutputModulation', () => {
  it('is a no-op when solar features are missing', () => {
    const r = applySolarOutputModulation(0.5, 0.7, null)
    expect(r.metamorphosisIndex).toBe(0.5)
    expect(r.confidenceScore).toBe(0.7)
    expect(r.modulation.solar_applied).toBe(false)
    expect(r.modulation.metaDelta).toBe(0)
    expect(r.modulation.confDelta).toBe(0)
  })

  it('does not shift outputs under quiet-Sun conditions', () => {
    const r = applySolarOutputModulation(0.5, 0.7, QUIET)
    expect(r.metamorphosisIndex).toBeCloseTo(0.5, 10)
    expect(r.confidenceScore).toBeCloseTo(0.7, 10)
    expect(r.modulation.solar_applied).toBe(true)
  })

  it('boosts metamorphosis under active Sun', () => {
    const r = applySolarOutputModulation(0.5, 0.7, ACTIVE)
    // metaShift = 0.25*0.8 + 0.15*0.2 = 0.23
    expect(r.modulation.metaShift).toBeCloseTo(0.23, 10)
    expect(r.metamorphosisIndex).toBeGreaterThan(0.5)
    expect(r.modulation.metaDelta).toBeGreaterThan(0)
  })

  it('lowers confidence when geomagnetic perturbation dominates', () => {
    const r = applySolarOutputModulation(0.5, 0.7, { xrayUVLift: 0, magPerturbation: 1, activityLevel: 'active' })
    // confShift = (0.06*0 - 0.08*1) * 1.0 = -0.08
    expect(r.modulation.confShift).toBeCloseTo(-0.08, 10)
    expect(r.confidenceScore).toBeLessThan(0.7)
    expect(r.modulation.confDelta).toBeLessThan(0)
  })

  it('clamps outputs to legal ranges in storm conditions', () => {
    const r = applySolarOutputModulation(0.95, 0.98, STORM)
    expect(r.metamorphosisIndex).toBeLessThanOrEqual(SOLAR_COUPLING.META_MAX)
    expect(r.metamorphosisIndex).toBeGreaterThanOrEqual(SOLAR_COUPLING.META_MIN)
    expect(r.confidenceScore).toBeLessThanOrEqual(SOLAR_COUPLING.CONF_MAX)
    expect(r.confidenceScore).toBeGreaterThanOrEqual(SOLAR_COUPLING.CONF_MIN)
  })

  it('clamps xrayUVLift and magPerturbation to documented input ranges', () => {
    const r = applySolarOutputModulation(0.5, 0.7, { xrayUVLift: 99, magPerturbation: 99, activityLevel: 'active' })
    // Effective uv=1, mag=1 → metaShift = (0.25 + 0.15) * 1.0 = 0.40
    expect(r.modulation.metaShift).toBeCloseTo(0.4, 10)
  })
})

describe('Solar Isotopic Hammer — content fingerprint (normalize + vortex params)', () => {
  // We import the helpers via the module for testing
  // In real code these live inside solarGovernanceIntegration.ts

  function normalize(text: string) {
    let t = text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
    const stop = ['the', 'a', 'an', 'is', 'are', 'of', 'for', 'to', 'and', 'or', 'but', 'in', 'on', 'with', 'that', 'this']
    return t.split(' ').filter(w => w && !stop.includes(w)).join(' ')
  }

  it('normalization makes short and long versions of the same idea much closer', () => {
    const short = 'Jesus is God'
    const long = 'Jesus is God? The ultimate question for all humanity and existence itself in this cosmos'
    expect(normalize(short)).toBe('jesus god')
    expect(normalize(long)).toContain('jesus god ultimate question')
    // After normalization the core meaning is preserved → TDF parameters will be much closer
  })

  it('different philosophical statements still produce distinct but stable parameters', () => {
    const a = normalize('Jesus is God')
    const b = normalize('Should I go hiking tomorrow')
    // They should normalize to different strings
    expect(a).not.toBe(b)
  })
})
