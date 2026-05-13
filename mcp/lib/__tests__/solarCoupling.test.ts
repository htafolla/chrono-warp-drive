// Lightweight unit tests for the backend solar coupling layer.
// Run with: cd mcp && npx vitest run lib/__tests__/solarCoupling.test.ts
// (or whatever runner the mcp package uses).

import { describe, it, expect } from 'vitest'
import { applySolarOutputModulation, SOLAR_COUPLING } from '../solarCoupling'

const QUIET = { xrayUVLift: 0, magPerturbation: 0 }
const ACTIVE = { xrayUVLift: 0.8, magPerturbation: 0.2 }
const STORM = { xrayUVLift: 1.0, magPerturbation: 1.0 }

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
    const r = applySolarOutputModulation(0.5, 0.7, { xrayUVLift: 0, magPerturbation: 1 })
    // confShift = 0.06*0 - 0.08*1 = -0.08
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
    const r = applySolarOutputModulation(0.5, 0.7, { xrayUVLift: 99, magPerturbation: 99 })
    // Effective uv=1, mag=1 → metaShift = 0.25 + 0.15 = 0.40
    expect(r.modulation.metaShift).toBeCloseTo(0.4, 10)
  })
})
