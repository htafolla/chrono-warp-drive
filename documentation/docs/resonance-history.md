---
sidebar_position: 7
---

# Resonance History & Momentum

Dynamo maintains a per-proposal ring buffer for tracking resonance over time.

## Ring Buffer

Each unique proposal (normalized by text) has its own history:

- **Capacity**: 10 entries per proposal
- **Window**: Rolling 3-minute window
- **Eviction**: Oldest entry removed when capacity exceeded

Normalization collapses whitespace, lowercases, strips non-alphanumeric characters, and truncates to 80 characters — so the same words always map to the same history bucket.

## Smoothed Resonance

The rolling average of resonance scores within the 3-minute window:

```
smoothedResonance = sum(scores in window) / count
```

Only computed when 3 or more samples exist within the window.

## Trend Detection

Compares the oldest and newest score in the window:

```
diff = newestScore - oldestScore
trend = diff > 0.05  → "rising"
        diff < -0.05 → "falling"
        otherwise    → "stable"
```

The 0.05 threshold prevents noise from triggering false trends.

## Momentum (dR/dt)

The rate of change of resonance per minute:

```
momentum = (newestScore - oldestScore) / elapsedMinutes
```

Positive momentum means resonance is increasing. Negative means declining. Requires at least 2 samples in the window.

## Peak Forecast

When momentum is positive (rising), the system estimates when resonance will peak:

```
ceiling = 0.95
minutesToPeak = (ceiling - currentResonance) / |momentum|
estimatedPeak = min(0.98, currentResonance + momentum × minutesToPeak)
```

Window quality depends on current resonance and solar activity:

| Condition | Window Quality |
|-----------|---------------|
| Rising, current ≥ 0.78 | optimal |
| Rising, current < 0.78 | good |
| Falling, current ≥ 0.78 | good |
| Falling, current < 0.78 | declining |
| Storm (any) | declining |

## Confidence

Momentum and peak forecast are **display-only** — they inform the user but do not modify the governance verdict. The decision is based on the current resonance score and adaptive thresholds alone.
