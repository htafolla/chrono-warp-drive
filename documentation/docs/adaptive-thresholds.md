---
sidebar_position: 6
---

# Adaptive Solar Thresholds

Decision thresholds shift dynamically based on the Sun's current activity level. A proposal that barely passes during quiet conditions may be rejected during a solar storm.

## Thresholds by Activity

| Activity | Strong PASS | Good PASS | NEEDS_REVISION | REJECT |
|----------|-------------|-----------|----------------|--------|
| Quiet | ≥ 0.82 | ≥ 0.72 | ≥ 0.58 | < 0.58 |
| Moderate | ≥ 0.88 | ≥ 0.78 | ≥ 0.62 | < 0.62 |
| Active | ≥ 0.88 | ≥ 0.78 | ≥ 0.62 | < 0.62 |
| Storm | ≥ 0.92 | ≥ 0.84 | ≥ 0.70 | < 0.70 |

## Confidence Adjustments

Solar activity modifies the final confidence value:

| Activity | Adjustment | Effect |
|----------|-----------|--------|
| Quiet | +0.05 | Confidence boosted |
| Moderate | 0 | No change |
| Active | -0.08 | Confidence reduced |
| Storm | -0.15 | Confidence heavily reduced |

## Storm Overrides

During storms, additional safety measures activate:

- A PASS verdict is downgraded to NEEDS_REVISION
- Confidence is reduced by an additional 0.12 (minimum 0.60)

## Active Overrides

During active conditions with a PASS verdict:

- Confidence is reduced by 0.06 (minimum 0.70)

## Why It Matters

The same proposal yields different results at different solar phases. This is not a bug — it is the point. The external reference changed, not the system.

A proposal that scores 0.80 resonance:

| Activity | Threshold (Good) | Verdict | Confidence |
|----------|-----------------|---------|------------|
| Quiet | 0.72 | PASS | 0.85 |
| Moderate | 0.78 | PASS | 0.85 |
| Active | 0.78 | PASS | 0.79 (after -0.06) |
| Storm | 0.84 | NEEDS_REVISION | 0.73 (storm override) |

The system becomes more conservative when the Sun is volatile and more permissive when it is stable.
