// mcp/lib/solarCoupling.ts
//
// Backend mirror of the frontend's SOLAR_COUPLING (src/hooks/useNeuralFusion.tsx).
// The frontend modulates the worker inputs (delta_phase, tau) before Q_ent is
// computed. The MCP backend doesn't expose those scalars — its NeuralFusion
// produces a metamorphosisIndex and confidenceScore directly. So we apply an
// analogous, contained modulation to the *outputs* using the same physics:
//
//   metamorphosisIndex ← amplified by xrayUVLift + magPerturbation
//                        (active Sun ⇒ stronger spectral metamorphosis signal)
//   confidenceScore    ← UV pumping raises confidence; geomagnetic
//                        decoherence lowers it
//
// Coefficients match the frontend v1 bump so the two paths feel comparable.
// This is option-(a) coupling: a starting point, not the final form. A later
// pass should make solar features a first-class neural input rather than a
// post-hoc multiplier.

export interface SolarFeaturesLike {
  xrayUVLift: number       // -0.3..1.0
  magPerturbation: number  // 0..1
}

export const SOLAR_COUPLING = {
  // metamorphosis modulation
  META_UV_GAIN: 0.25,
  META_MAG_GAIN: 0.15,
  // confidence modulation
  CONF_UV_GAIN: 0.06,
  CONF_MAG_GAIN: 0.08,
  // hard output clamps
  META_MIN: 0,
  META_MAX: 1,
  CONF_MIN: 0,
  CONF_MAX: 0.99,
} as const

export function applySolarOutputModulation(
  metamorphosisIndex: number,
  confidenceScore: number,
  solar?: SolarFeaturesLike | null,
): { metamorphosisIndex: number; confidenceScore: number; solar_applied: boolean } {
  if (!solar) return { metamorphosisIndex, confidenceScore, solar_applied: false }
  const uv = Math.max(-0.3, Math.min(1.0, solar.xrayUVLift))
  const mag = Math.max(0, Math.min(1, solar.magPerturbation))

  const metaShift = SOLAR_COUPLING.META_UV_GAIN * uv + SOLAR_COUPLING.META_MAG_GAIN * mag
  const confShift = SOLAR_COUPLING.CONF_UV_GAIN * uv - SOLAR_COUPLING.CONF_MAG_GAIN * mag

  const mi = Math.max(SOLAR_COUPLING.META_MIN, Math.min(SOLAR_COUPLING.META_MAX, metamorphosisIndex * (1 + metaShift)))
  const cs = Math.max(SOLAR_COUPLING.CONF_MIN, Math.min(SOLAR_COUPLING.CONF_MAX, confidenceScore * (1 + confShift)))

  return { metamorphosisIndex: mi, confidenceScore: cs, solar_applied: true }
}
