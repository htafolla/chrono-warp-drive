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
// Activity-level-aware: storm/active conditions apply stronger coupling,
// quiet conditions apply lighter coupling. This prevents over-amplifying
// weak solar signals while ensuring storm conditions genuinely shift outputs.

export interface SolarFeaturesLike {
  xrayUVLift: number       // -0.3..1.0
  magPerturbation: number  // 0..1
  activityLevel?: 'quiet' | 'moderate' | 'active' | 'storm'
}

export const SOLAR_COUPLING = {
  // Base modulation gains
  META_UV_GAIN: 0.25,
  META_MAG_GAIN: 0.15,
  CONF_UV_GAIN: 0.06,
  CONF_MAG_GAIN: 0.08,
  // Activity-level multiplier on base gains
  // storm: strongest coupling, quiet: lightest
  ACTIVITY_MULTIPLIER: {
    quiet: 0.5,
    moderate: 0.75,
    active: 1.0,
    storm: 1.3,
  } as const,
  // hard output clamps
  META_MIN: 0.1,
  META_MAX: 0.95,
  CONF_MIN: 0.5,
  CONF_MAX: 0.98,
} as const

export interface SolarModulation {
  solar_applied: boolean
  activityLevel: string
  gainMultiplier: number
  // Multiplicative shifts actually applied (post-clamp on inputs, pre-clamp on outputs).
  metaShift: number
  confShift: number
  // Absolute output deltas: post - pre. Useful for UI/observability.
  metaDelta: number
  confDelta: number
}

function getActivityMultiplier(level?: string): number {
  if (!level) return SOLAR_COUPLING.ACTIVITY_MULTIPLIER.moderate
  return SOLAR_COUPLING.ACTIVITY_MULTIPLIER[level as keyof typeof SOLAR_COUPLING.ACTIVITY_MULTIPLIER]
    ?? SOLAR_COUPLING.ACTIVITY_MULTIPLIER.moderate
}

export function applySolarOutputModulation(
  metamorphosisIndex: number,
  confidenceScore: number,
  solar?: SolarFeaturesLike | null,
): { metamorphosisIndex: number; confidenceScore: number; modulation: SolarModulation } {
  if (!solar) {
    return {
      metamorphosisIndex,
      confidenceScore,
      modulation: {
        solar_applied: false,
        activityLevel: 'none',
        gainMultiplier: 0,
        metaShift: 0,
        confShift: 0,
        metaDelta: 0,
        confDelta: 0,
      },
    }
  }

  const uv = Math.max(-0.3, Math.min(1.0, solar.xrayUVLift))
  const mag = Math.max(0, Math.min(1, solar.magPerturbation))
  const gainMultiplier = getActivityMultiplier(solar.activityLevel)

  const metaShift = (SOLAR_COUPLING.META_UV_GAIN * uv + SOLAR_COUPLING.META_MAG_GAIN * mag) * gainMultiplier
  const confShift = (SOLAR_COUPLING.CONF_UV_GAIN * uv - SOLAR_COUPLING.CONF_MAG_GAIN * mag) * gainMultiplier

  const mi = Math.max(SOLAR_COUPLING.META_MIN, Math.min(SOLAR_COUPLING.META_MAX, metamorphosisIndex * (1 + metaShift)))
  const cs = Math.max(SOLAR_COUPLING.CONF_MIN, Math.min(SOLAR_COUPLING.CONF_MAX, confidenceScore * (1 + confShift)))

  return {
    metamorphosisIndex: mi,
    confidenceScore: cs,
    modulation: {
      solar_applied: true,
      activityLevel: solar.activityLevel ?? 'moderate',
      gainMultiplier,
      metaShift,
      confShift,
      metaDelta: mi - metamorphosisIndex,
      confDelta: cs - confidenceScore,
    },
  }
}
