# Solar → Neural Coupling (MCP Backend)

This document describes how live solar conditions influence the MCP backend's
Neural Fusion outputs. It mirrors, but is intentionally distinct from, the
frontend's `useNeuralFusion` solar coupling.

## Why two couplings?

| | Frontend (`src/hooks/useNeuralFusion.tsx`) | Backend (`mcp/lib/neuralFusion*.ts`) |
|---|---|---|
| Neural path | Web Worker computes `Q_ent` from `delta_phase`, `tau`, … | TF.js (or math fallback) computes `metamorphosisIndex` from a spectrum |
| Where solar enters | **Inputs**: bumps `delta_phase` and `tau` before `Q_ent` | **Outputs**: scales `metamorphosisIndex` and `confidenceScore` after the model |
| Coefficients | v1 (0.15× / 0.10× input bumps) | v1 (META_UV 0.25, META_MAG 0.15, CONF_UV 0.06, CONF_MAG 0.08) |

The two paths cannot share a coupling implementation because the frontend
exposes temporal scalars the backend does not have. The backend therefore
applies the analogous, contained modulation at the output stage. The
*observable behavior* (active Sun ⇒ stronger metamorphosis, geomagnetic
storms ⇒ lower confidence) is the same in both.

## Solar features

`SolarFeatures` is derived from a multi-channel NOAA SWPC pull
(`mcp/lib/solarDataFetcher.ts`):

| Field | Source | Range | Meaning |
|---|---|---|---|
| `xrayUVLift` | GOES X-ray (long) → log10 normalized | -0.3 … 1.0 | UV pumping proxy |
| `magPerturbation` | Kp-index normalized | 0 … 1 | Geomagnetic decoherence |
| `hardnessRatio` | GOES short / long | — | Flare hardness |
| `windBroadeningA` | ACE/DSCOVR solar wind speed | — | Line broadening proxy |
| `kpIndex` | NOAA Kp | 0 … 9 | Geomagnetic storm scale |
| `activityLevel` | derived | enum | quiet / moderate / active / storm |

## Modulation formula

Implemented in `mcp/lib/solarCoupling.ts`:

```
uv  = clamp(xrayUVLift, -0.3, 1.0)
mag = clamp(magPerturbation, 0, 1)

metaShift = 0.25 * uv + 0.15 * mag         // META_UV_GAIN, META_MAG_GAIN
confShift = 0.06 * uv - 0.08 * mag         // CONF_UV_GAIN, CONF_MAG_GAIN

metamorphosisIndex' = clamp(metamorphosisIndex * (1 + metaShift), 0, 1)
confidenceScore'    = clamp(confidenceScore    * (1 + confShift), 0, 0.99)
```

Worst-case shift bounds (with v1 coefficients):

- `metaShift` ∈ [-0.075, +0.40]
- `confShift` ∈ [-0.098, +0.06]

## Observability

Every NeuralOutput now carries an optional `solarModulation` block, surfaced
on `/process-current-sun`:

```json
{
  "solarFeatures": { "xrayUVLift": 0.42, "magPerturbation": 0.18, "...": "..." },
  "solarModulation": {
    "solar_applied": true,
    "metaShift": 0.132,
    "confShift": 0.0108,
    "metaDelta": 0.041,
    "confDelta": 0.0083
  },
  "metamorphosisIndex": 0.358,
  "confidenceScore": 0.789
}
```

- `solar_applied`: false when no `solarFeatures` was supplied (no-op path).
- `*Shift`: the unitless multiplier applied to the base output.
- `*Delta`: absolute (post − pre) change after clamping. Useful for plotting
  "how much did the Sun actually move this metric this tick?"

## Tests

See `mcp/lib/__tests__/solarCoupling.test.ts` for vitest coverage of:
- no-op when features missing
- quiet-Sun is identity
- active Sun lifts metamorphosis
- geomagnetic perturbation lowers confidence
- output clamping in storm conditions
- input clamping for out-of-range features

## Future work

- Promote `SolarFeatures` to a first-class neural input (concatenate to the
  spectral feature vector) instead of a post-hoc multiplicative shift.
- Calibrate v2 coefficients against historical SDSS + NOAA data once we have
  a few weeks of paired runs.
- Expose `solarModulation` in `/get_docs` "Best Practices" so consumers know
  the field is available.
