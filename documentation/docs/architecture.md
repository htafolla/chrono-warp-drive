---
sidebar_position: 2
---

# Architecture

Dynamo has two independent subsystems that converge in the governance verdict.

## Data Flow

```
NOAA GOES (7 feeds)
        │
        ├──→ [NeuralFusion]  ← TF.js autoencoder (200→16 bottleneck)
        │       │                  spectralQuality = f(reconstructionError)
        │       │
        │       └──→ spectralQuality ─────┐
        │                                 │
        └──→ [solarDataFetcher.ts]  ← 60s cache, classifies activity level
                │
        [TemporalBlurrnSignal]  ← computes TDF, phase coherence, vortex volume
                │
        [SolarGovernanceIntegration] ← 4D: 0.20/0.20/0.30/0.30
                │                       5D: 0.18/0.18/0.27/0.27/0.10 (with spectralQuality)
                │
        [DynamoSolarGovernance]  ← adaptive thresholds, momentum, verdict
                │
                ▼
   PASS / NEEDS_REVISION / REJECT
```

## NeuralFusion Integration

**NeuralFusion** (TensorFlow.js) is a 3-layer autoencoder (200→48→24→16 bottleneck) that reconstructs NOAA spectrum data. Its `spectralQuality` output (0–1, based on reconstruction error) directly feeds into the governance formula:

- **4D mode** (no NeuralFusion): `proximity×0.20 + phase×0.20 + volume×0.30 + sync×0.30`
- **5D mode** (with `spectralQuality`): `proximity×0.18 + phase×0.18 + volume×0.27 + sync×0.27 + spectralQuality×0.10`

When `spectralQuality` is provided, the weights rebalance by exactly 10% to accommodate it. The `neuralContextUsed` flag tracks which mode was active.

NeuralFusion also produces a `confidenceScore` (line 584) and `metamorphosisIndex` (line 552) for UI display, but these do not influence governance — only `spectralQuality` does.

## The Four Dimensions

Resonance is calculated across four dimensions. When NeuralFusion spectral quality is available, a fifth dimension is added.

| # | Dimension | Weight (4D) | Weight (5D) | What It Measures |
|---|-----------|-------------|-------------|-------------------|
| 1 | Proximity | 0.20 | 0.18 | Gaussian similarity between proposal and sun TDF deltas |
| 2 | Phase Alignment | 0.20 | 0.18 | Structural coherence match (1 - \|proposalCoherence - sunCoherence\|) |
| 3 | Vortex Alignment | 0.30 | 0.27 | Energy volume fit (log-space ratio) |
| 4 | Synchronization | 0.30 | 0.27 | Temporal cascade alignment (linear decay) |
| 5 | Spectral Quality | — | 0.10 | NeuralFusion reconstruction quality (optional) |

**4D Formula:**
```
structuralResonance = proximity × 0.20 + phaseAlignment × 0.20 + vortexAlignment × 0.30 + synchronization × 0.30
```

**5D Formula** (when spectralQuality is provided):
```
structuralResonance = proximity × 0.18 + phaseAlignment × 0.18 + vortexAlignment × 0.27 + synchronization × 0.27 + spectralQuality × 0.10
```

Both are clamped to [0.15, 0.98].

## Key Design Decisions

### Proximity uses Gaussian, Sync uses linear decay

Both dimensions operate on `deltaDiff = |(proposalTdf % 1e6) - (solarRefTdf % 1e6)|`.

- **Proximity**: `exp(-deltaDiff² / 1e12)` — tight bell curve. Discriminates among close TDFs.
- **Sync**: `max(0, 1 - deltaDiff / 1e6)` — broad linear ramp. Captures whether you're in the right ballpark.

They are complementary response curves on the same input, not redundant.

### Vortex Alignment uses log-space

```
logRatio = |ln(proposalTdf) - ln(solarRefTdf)|
vortexAlignment = max(0.15, 1 - logRatio / logMax)
```

Log-space protects small proposals. A proposal with TDF 1,000 vs sun TDF 500,000 gets ~0.53 instead of 0.002 with raw ratio. Orders of magnitude matter, not raw magnitude.

### Cascade indices are not temporal

The old implementation used cascade-index-based lag for synchronization. Cascade indices are content hashes — a text hash vs a solar physics constant produces random lag (~33 average) even with perfect TDF match. Sync now uses deltaDiff linear decay, which correctly scores 45–90% depending on actual TDF alignment. Cascade indices are retained only for signal timing labels (leading/trailing/synced).

## Further Reading

- [DYNAMO-CURRENT-STATE.md](https://github.com/htafolla/chrono-warp-drive/blob/main/docs/DYNAMO-CURRENT-STATE.md) — authoritative current-state document with all formulas, design decisions, and deployment notes
- [Blurrn Codex](/docs/blurrn-codex) — foundational cosmological research that inspired Dynamo (archived under `docs/legacy/`)
