// Lightweight unit tests for the shared solar worker utilities.
// These run in Node (no real Worker or TF.js required) and give us
// regression coverage for the NOAA parsing + training data pipeline
// that powers the browser-side neural model.

import { describe, it, expect } from 'vitest'
import {
  parseXray,
  parseKp,
  parseMag,
  deriveFeatures,
  computeSolarTarget,
  generateTrainingData,
  classifyActivity,
  type SolarSnapshot,
} from '@/lib/solarWorkerUtils'

describe('solarWorkerUtils (shared with neural.worker.ts)', () => {
  const mockXrayRaw = [
    { energy: '0.05-0.4nm', flux: 1.2e-6 },
    { energy: '0.1-0.8nm', flux: 4.5e-6 },
  ]

  const mockKpRaw = [{ kp_index: 3.7 }]

  const mockMagRaw = [
    { Hp: 10, He: 5, Hn: 2 },
    { Hp: 12, He: 6, Hn: 3 },
  ]

  it('parseXray extracts short/long channels and derives flare class + hardness', () => {
    const x = parseXray(mockXrayRaw)
    expect(x.short).toBeCloseTo(1.2e-6)
    expect(x.long).toBeCloseTo(4.5e-6)
    expect(x.hardnessRatio).toBeCloseTo(1.2e-6 / 4.5e-6)
    expect(x.flareClass).toBe('C') // between 1e-6 and 1e-5
  })

  it('parseXray returns safe defaults on empty input', () => {
    const x = parseXray([])
    expect(x.short).toBe(1e-9)
    expect(x.flareClass).toBe('A')
  })

  it('parseKp returns last kp_index or 0', () => {
    expect(parseKp(mockKpRaw)).toBeCloseTo(3.7)
    expect(parseKp([])).toBe(0)
  })

  it('parseMag computes delta perturbation (falls back gracefully on short arrays)', () => {
    const m = parseMag(mockMagRaw)
    // Only 2 samples → prev falls back to last → zero delta
    expect(m.perturbation).toBe(0)
  })

  it('classifyActivity maps xray/kp to correct level strings (thresholds: xray>1e-6 or kp>=3 for moderate+)', () => {
    expect(classifyActivity(1e-3, 8)).toBe('storm')
    expect(classifyActivity(2e-5, 4)).toBe('active')
    expect(classifyActivity(5e-7, 2)).toBe('quiet')   // below both moderate thresholds
    expect(classifyActivity(2e-6, 2)).toBe('moderate') // crosses xray threshold
    expect(classifyActivity(1e-9, 0)).toBe('quiet')
  })

  it('deriveFeatures produces normalized SolarSnapshot in expected ranges', () => {
    const x = parseXray(mockXrayRaw)
    const kp = parseKp(mockKpRaw)
    const mag = parseMag(mockMagRaw)
    const f = deriveFeatures(x, kp, mag)

    expect(f.xrayUVLift).toBeGreaterThanOrEqual(-0.3)
    expect(f.xrayUVLift).toBeLessThanOrEqual(1.0)
    expect(f.magPerturbation).toBeGreaterThanOrEqual(0)
    expect(f.magPerturbation).toBeLessThanOrEqual(1)
    expect(f.kpIndex).toBeCloseTo(3.7)
    expect(['quiet', 'moderate', 'active', 'storm']).toContain(f.activityLevel)
  })

  it('computeSolarTarget returns a value in the trained target range [0.25, 0.85]', () => {
    const f: SolarSnapshot = {
      xrayUVLift: 0.6,
      magPerturbation: 0.4,
      kpIndex: 4,
      hardnessRatio: 0.3,
      activityLevel: 'active',
    }
    const t = computeSolarTarget(f)
    expect(t).toBeGreaterThanOrEqual(0.25)
    expect(t).toBeLessThanOrEqual(0.85)
  })

  it('generateTrainingData produces ~40+ samples with valid 6-element inputs and targets', () => {
    const solar = {
      features: {
        xrayUVLift: 0.4,
        magPerturbation: 0.25,
        kpIndex: 3,
        hardnessRatio: 0.2,
        activityLevel: 'moderate',
      } as SolarSnapshot,
      target: 0.55,
    }

    const data = generateTrainingData(solar)

    expect(data.length).toBeGreaterThanOrEqual(40)
    data.forEach((row, idx) => {
      expect(row.inputs).toHaveLength(6)
      expect(row.target).toBeGreaterThanOrEqual(0.25)
      expect(row.target).toBeLessThanOrEqual(0.85)
      // first three inputs are normalized Q_ent params
      expect(row.inputs[0]).toBeGreaterThanOrEqual(0)
      expect(row.inputs[0]).toBeLessThanOrEqual(1)
    })
  })
})
