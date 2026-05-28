---
sidebar_position: 5
---

# For Physicists & Deep Thinkers

This section explains the mathematical foundations and design rationale for the solar-resonance governance model.

## The Circularity Problem

Any governance system that references only itself will eventually optimize for its own reflection. This is well understood in control theory (feedback loop stability), game theory (self-referential equilibria), and computer science (Gödelian incompleteness).

Dynamo introduces an external reference frame: the Sun's electromagnetic and particle environment. The reference is physically external to the AI system, continuously variable, globally verifiable, and ungamable.

## Temporal Displacement Factor (TDF)

Dynamo computes TDF using the real Codex formula (`tPTT × TAU × 1/BlackHole_Seq`) instead of a simple FNV-1a hash. A mapping layer derives the 6 Codex inputs (`T_c`, `P_s`, `E_t`, `delta_t`, `voids`, `bhs_n`) from proposal text and live NOAA solar data.

The raw formula can produce values from 10^7 (terrestrial-scale inputs) up to 10^17+ (cosmic-scale inputs). The fingerprint is extracted from the fractional part of (rawTDF / 10^9), preserving fine structure regardless of overall magnitude:

```
scaled = rawTDF / 10^9
fingerprint = round(frac(scaled) × 10^8) % 10^8
TDF = 5.781e12 + fingerprint
```

This ensures that even small relative differences between proposals produce distinct fingerprints. The last 6 digits (mod 1e6) carry the normalized fine structure used for proximity and synchronization calculations.

### Mapping Layer: Proposal → Codex Inputs

| Parameter | Derivation | Physical Meaning |
|-----------|------------|------------------|
| `T_c` | `0.5 + (wordCount/50) + (uniqueChars/totalChars) × 0.5` | Time constant — word count + character density |
| `P_s` | `0.1 + (FNV_hash % 100000) / 100000` | Power spectral — 100k-level granularity from FNV hash |
| `E_t` | `0.1 + (uniqueChars / totalChars)` | Entropy — character-level uniqueness ratio |
| `delta_t` | `1 + activityOrdinal × 2` | Time step — solar activity modulates temporal resolution |
| `voids` | `7` (fixed) | Black hole voids — proposal-independent constant |
| `bhs_n` | `2 + (FNV_hash % 4)` | Sequence exponent — content-dependent (2–5 range) |

### Mapping Layer: Sun → Codex Inputs

| Parameter | Derivation | Physical Meaning |
|-----------|------------|------------------|
| `T_c` | `0.5 + (activityOrdinal / 6)` | Time constant — solar activity scales perceived temporal scope |
| `P_s` | `clamp(xray.long × 10^7, 0.1, 100)` | Power spectral — GOES X-ray flux as raw electromagnetic power |
| `E_t` | `0.1 + (protonSpectralIndex / 10)` | Entropy — proton energy distribution width |
| `delta_t` | `1 + activityOrdinal × 2` | Time step — storm = longer steps, quiet = fine-grained |
| `voids` | `3 + activityOrdinal` | Black hole voids — quiet=3, storm=6 (activity opens more voids) |
| `bhs_n` | `3 + (activityOrdinal % 3)` | Sequence exponent — solar variability from activity level |

*activityOrdinal: quiet=0, moderate=1, active=2, storm=3*

## Cross-Correlation

Proposal and sun reference TDFs are cross-correlated using a sliding window:

```
strength = |proposalTDF - solarRefTDF| / maxRange
lag = argmax over shifts of correlation(proposalTDF_shifted, solarRefTDF)
```

The lag determines signal timing orientation: positive lag means the proposal leads the sun, negative means it trails, near-zero means synced.

## Four Dimensions of Resonance

### 1. Proximity (Gaussian)

```
deltaDiff = |(proposalTdf % 1e6) - (solarRefTdf % 1e6)|
proximity = exp(-deltaDiff² / 1e12)
```

A Gaussian (normal) kernel applied to the TDF fine-structure difference. The 1e12 denominator gives a half-width at half-maximum of ~833,000 — meaning a deltaDiff of ~583,000 yields proximity ~0.71. This is tight enough to discriminate among close TDFs while providing a smooth gradient.

### 2. Phase Alignment (Linear)

```
phaseAlignment = 1 - |proposalCoherence - sunCoherence|
```

Structural coherence is the ratio of the proposal's TDF to a solar reference seed. The linear difference penalizes deviation proportionally. A perfect match yields 1.0; a deltaCoherence of 0.08 yields 0.92.

### 3. Vortex Alignment (Log-Space)

```
logRatio = |ln(max(proposalTdf, 1)) - ln(max(solarRefTdf, 1))|
logMax = ln(max(proposalTdf, solarRefTdf, 1))
vortexAlignment = max(0.15, 1 - logRatio / logMax)
```

The log transform compresses the dynamic range. A ratio of 500:1 (proposal/sun) gives logRatio ≈ 6.2, while raw ratio would give ~0.002. This prevents large-TDF proposals from dominating and small-TDF proposals from being invisible. The 0.15 clamp prevents the score from reaching zero.

Mathematically, this is equivalent to measuring whether the proposal's energy volume is within the same order of magnitude as the sun's current container.

### 4. Synchronization (Linear Decay)

```
syncRaw = max(0, 1 - deltaDiff / 1e6)
synchronization = max(0.15, syncRaw)
```

DeltaDiff of 0 → sync 1.0. DeltaDiff of 500,000 → sync 0.5. DeltaDiff of 1,000,000 → sync 0.0.

This is the broadest response curve of the four dimensions. While proximity uses a Gaussian (which drops off quickly), sync uses a linear ramp — capturing whether the proposal is in the right temporal ballpark rather than how perfect the match is.

### Why Proximity and Sync Are Not Redundant

Both operate on `deltaDiff`, but with complementary response curves:

| deltaDiff | Proximity (Gaussian) | Sync (Linear) |
|-----------|---------------------|---------------|
| 0 | 1.000 | 1.00 |
| 250,000 | 0.939 | 0.75 |
| 500,000 | 0.779 | 0.50 |
| 750,000 | 0.570 | 0.25 |
| 1,000,000 | 0.368 | 0.00 |

Proximity discriminates among close values. Sync penalizes extreme deltas. Together they provide both fine-grained and coarse-grained temporal alignment.

## 5D Extension

When NeuralFusion spectral quality is available, the weights rebalance:

```
structuralResonance_5D = 0.18·proximity + 0.18·phase + 0.27·vortex + 0.27·sync + 0.10·spectralQuality
```

Each 4D weight is reduced by exactly 10% to accommodate the fifth dimension. This preserves the relative proportions of the original four dimensions.

## Adaptive Thresholds

The decision thresholds shift as a function of solar activity:

| Activity | Strong PASS | Good PASS | Weak (Revision) | Reject |
|----------|-------------|-----------|-----------------|--------|
| Quiet | ≥0.82 | ≥0.72 | ≥0.58 | &lt;0.58 |
| Moderate | ≥0.88 | ≥0.78 | ≥0.62 | &lt;0.62 |
| Active | ≥0.88 | ≥0.78 | ≥0.62 | &lt;0.62 |
| Storm | ≥0.92 | ≥0.84 | ≥0.70 | &lt;0.70 |

The underlying principle: when the reference signal is noisy (storm), require higher resonance to pass. When it's stable (quiet), lower thresholds suffice.

## Momentum and Peak Forecasting

Momentum is the first derivative of resonance with respect to time:

```
dR/dt = (R_newest - R_oldest) / Δt_minutes
```

Peak forecast extrapolates linearly to a ceiling of 0.95:

```
minutesToPeak = (0.95 - R_current) / dR/dt   [when dR/dt > 0]
estimatedPeak = 0.95   [capped at 0.98]
```

Window quality classifies the opportunity:
- **Optimal**: rising, current ≥ 0.78
- **Good**: rising but below 0.78, or stable at plateau, or falling but still ≥ 0.78
- **Declining**: falling below 0.78, or any condition during storm activity

## Why Cascade Indices Failed for Sync

The original implementation used cascade-index-based lag for synchronization:

```
lag = |cascadeA_index - cascadeB_index|
sync = 1 / (1 + |lag| / 5)
```

Cascade indices are FNV-1a hashes derived from domain-specific seeds (text content vs solar physics constants). They encode unrelated semantic information. Two proposals with identical TDFs can produce cascade indices differing by ~33 on average — a noise floor of ~13% sync even with perfect temporal alignment.

The fix replaced cascade lag with deltaDiff linear decay, which correctly scores 45–90% depending on actual TDF alignment. Cascade indices are retained only for signalTiming labels (leading/trailing/synced), where orientation — not alignment quality — is the relevant information.

## What This Is

Dynamo is a deterministic prism. It refracts proposals through the Sun's current solar parameters. The output is a measure of structural resonance between two temporal signals — nothing more, nothing less.

NeuralFusion (TF.js) is a 3-layer autoencoder that produces `spectralQuality` — a measure of how well the model can reconstruct the current solar spectrum. This value directly enters the governance formula as a 5th dimension with 10% weight. Only `spectralQuality` influences governance; other outputs (confidenceScore, metamorphosisIndex) are display-only.

The core resonance formulas remain deterministic and auditable. NeuralFusion is a signal-quality lens, not a black-box decider.

## Further Reading

- [DYNAMO-CURRENT-STATE.md](https://github.com/htafolla/chrono-warp-drive/blob/main/docs/DYNAMO-CURRENT-STATE.md) — authoritative current-state document with all formulas, design decisions, and deployment notes
- [Architecture](/docs/architecture) — system data flow and NeuralFusion integration details
- [Blurrn Codex](/docs/blurrn-codex) — foundational cosmological research that inspired Dynamo
