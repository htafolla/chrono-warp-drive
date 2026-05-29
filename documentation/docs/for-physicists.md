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

Proposal and sun reference TDFs are cross-correlated using `TemporalBlurrnSignal.crossCorrelate()`:

```
strength = calculateIsotopicRatio(other) × phaseAlign
lag = |cascade₁ - cascade₂|
```

Where `cascade` is derived from TDF fine structure (`⌊(TDF % 1e6) / 10000⌋ % 100`). The `strength` is a UI display value; `lag` measures coarse structural offset.

Note: signalTiming (leading/trailing/synced) is no longer derived from cross-correlation lag. It comes from the Kuramoto oscillator phase ordering, which captures true temporal dynamics rather than content-hash orientation.

## Four Dimensions of Resonance

### 1. Proximity (Gaussian)

```
deltaDiff = |(proposalTdf % 1e6) - (solarRefTdf % 1e6)|
proximity = exp(-deltaDiff² / 1e12)
```

A Gaussian (normal) kernel applied to the TDF fine-structure difference. The 1e12 denominator gives a half-width at half-maximum of ~833,000 — meaning a deltaDiff of ~583,000 yields proximity ~0.71. This is tight enough to discriminate among close TDFs while providing a smooth gradient.

### 2. Phase Alignment (Kuramoto Oscillator Coupling)

```
(orderParameter from N=3 Kuramoto model, clamped to [0.15, 0.99])
```

Replaces the static `|proposalCoherence - sunCoherence|` difference with a coupled-oscillator model. Three oscillators (proposal φ_p, sun φ_s, system φ_sys = (φ_p + φ_s)/2) evolve for 20 timesteps at K=0.5 coupling. The order parameter R = |⟨e^(iθ)⟩| measures how synchronized the oscillators are after evolution.

A value of 0.99 means all three oscillators are phase-locked. A value of 0.15 means near-random phases (no coupling). The Kuramoto model actually captures temporal dynamics — drift rates, entrainment, detuning — that a static absolute difference cannot express.

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

## Kuramoto Oscillator Coupling

Kuramoto replaces three broken calculations with one coupled-oscillator model:

| Replaced Value | Old Formula | Problem | Kuramoto Replacement |
|---------------|-------------|---------|---------------------|
| `phaseAlignment` | `1 - \|pc₁ - pc₂\|` | Noise floor at 13–24% (static, no temporal info) | Order parameter R from oscillator evolution |
| `signalTiming` | `\|cascade₁ - cascade₂\| < 2` | Content-hash noise, arbitrary threshold | Phase ordering: φ_sun - φ_proposal |
| `phaseCoherence*` | `sin²(2π·TAU·(TDF%√PHI))` | Purely TDF-dependent, no temporal dynamics | cos(φ) from evolved oscillator phase |

### The Model

Three coupled oscillators (N=3) with coupling strength K=0.5:

```
dθ_i/dt = ω_i + (K/2) Σ_j sin(θ_j - θ_i + φ_dark + φ_pushpull + S × isotope_factor)
```

Where:
- θ_0 = proposal phase (seeded from `(TDF % 1e6) / 1e6 × 2π`)
- θ_1 = sun phase (seeded similarly from solar reference TDF)
- θ_2 = system phase (seeded at `(θ_0 + θ_1) / 2`)
- ω_i = natural frequencies (derived from TDF fine structure)
- φ_dark = π/6 (dark energy offset from Codex)
- φ_pushpull = **+π/4 (push)** or **-π/4 (pull)** — toggled by solar activity
- S = 0.1 (fractal scaling), modulated by isotope factor
- isotope_factor = **1.0 (C-12)** or **0.8 (C-14)**
- N = 3 oscillators, K = 0.5 coupling strength
- Timesteps: 20 iterations at Δt = 0.05

### Order Parameter

After evolution, the order parameter R measures synchronization:

```
R = orderParameter = sqrt( (Σcos(θ_j)/N)² + (Σsin(θ_j)/N)² )
```

R ranges from 0 (uniform random phases) to 1 (perfect phase lock). The result is clamped to [0.15, 0.99].

### Signal Timing from Phase Ordering

The phase difference Δ = θ_sun - θ_proposal determines signal timing:

- |Δ| < 0.2 rad or |Δ| > 2π - 0.2 rad → **synced**
- 0 < Δ < π → proposal is **leading** the sun
- -π < Δ < 0 → proposal is **trailing** the sun

### Why Kuramoto

The prior approach had three independent heuristics for related temporal phenomena:

1. **PhaseAlignment** used a static `1 - |PC₁ - PC₂|` difference. This is a snapshot — it tells you nothing about whether the two signals are drifting together, toward each other, or apart. PhaseCoherence itself is a deterministic function of TDF (`sin²(2π·TAU·(TDF%√PHI))`), so alignment was just a remapping of the same TDF values with extra squashing.

2. **SignalTiming** compared cascade indices (content hashes) with an arbitrary threshold of `< 2`. Content hashes encode proposal semantics and solar physics separately — they aren't a temporal signal. The threshold was pulled from nowhere.

3. **PhaseCoherence** values were purely TDF-dependent. They displayed the same information as the TDF itself, just through a sinusoidal lens.

The Kuramoto model replaces all three with one well-studied dynamical system. The oscillators' phases evolve under mutual coupling (K=0.5) and natural frequency differences. This captures:
- **Entrainment**: Do the proposal and sun tend to synchronize under the coupling?
- **Detuning**: How different are their natural frequencies?
- **Phase ordering**: Which oscillator leads, which trails?
- **Transient behavior**: After 20 timesteps, have they settled into a steady state?

This moves Dynamo from static TDF comparison to genuine temporal dynamics.

### Phase 1: Push/Pull Dynamics

The original simplified port used a fixed `φ_dark + S` offset. Phase 1 adds a push/pull toggle: when solar activity is quiet or moderate, the system runs in **pull** mode (-π/4, phase convergence, temporal contraction). When active or storm, it runs in **push** mode (+π/4, phase divergence, temporal expansion).

| Solar Activity | Mode | φ_pushpull | Effect on Box |
|---------------|------|-----------|---------------|
| quiet | pull | -π/4 | Phase convergence, stable trajectories |
| moderate | pull | -π/4 | Mild convergence |
| active | push | +π/4 | Phase divergence, volatile trajectories |
| storm | push | +π/4 | Maximum divergence |

This connects the oscillator coupling directly to real solar conditions — a storm literally pushes oscillator phases apart, making synchronization harder and raising the barrier for governance PASS.

### Isotope Factors

Two isotopes modulate the fractal coupling term:

- **C-12** (factor 1.0): Standard reference. Full fractal perturbation `S × 1.0 = 0.1`. Synchronizes readily.
- **C-14** (factor 0.8): Radiocarbon. Lighter perturbation `S × 0.8 = 0.08`. More phase-resistant.

The isotope factor enters the coupling sinusoid as `S × isotope.factor`, changing the effective entrainment strength. C-12 systems sync faster; C-14 resists sync, introducing temporal friction.

### Fractal Toggle

The fractal term `S × isotope.factor` can be disabled (`fractalToggle = false`), removing the perturbation from the coupling equation. This is a diagnostic mode — comparing fractal-on vs fractal-off reveals how much of the synchronization is driven by fractal dynamics vs pure Kuramoto coupling.

### 3D Trajectory Output

The oscillator evolution now returns **full 3D trajectory** — the complete path of `(θ₀, θ₁, θ₂, ω₀, ω₁, ω₂)` at every timestep, not just the final order parameter. This enables future trajectory-derived dimensions (proximity as trajectory distance integral, synchronization as phase velocity correlation) without breaking the current external formulas.

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

## Why Cascade Indices Failed

The original implementation used cascade-index-based lag for both synchronization and signal timing:

```
lag = |cascadeA_index - cascadeB_index|
sync = 1 / (1 + |lag| / 5)
```

Cascade indices were FNV-1a hashes derived from domain-specific seeds (text content vs solar physics constants). They encoded unrelated semantic information. Two proposals with identical TDFs could produce cascade indices differing by ~33.

**Sync fix (Round 1):** Replaced cascade lag with deltaDiff linear decay. Verified working at 43–91% range.

**Signal timing fix (Round 2 — Kuramoto):** Replaced cascade-index comparison for signalTiming (leading/trailing/synced) with oscillator phase lead/lag detection. Also replaced `1 - |phaseCoherence₁ - phaseCoherence₂|` with the Kuramoto order parameter. Cascade indices are now derived from TDF fine structure (not content hashes), used exclusively for cross-correlation lag display.

All three prior representations — static phaseAlignment, content-hash cascade indices, arbitrary threshold signalTiming — were replaced by the single Kuramoto oscillator model.

## What This Is

Dynamo is a deterministic prism. It refracts proposals through the Sun's current solar parameters. The output is a measure of structural resonance between two temporal signals — nothing more, nothing less.

NeuralFusion (TF.js) is a 3-layer autoencoder that produces `spectralQuality` — a measure of how well the model can reconstruct the current solar spectrum. This value directly enters the governance formula as a 5th dimension with 10% weight. Only `spectralQuality` influences governance; other outputs (confidenceScore, metamorphosisIndex) are display-only.

The core resonance formulas remain deterministic and auditable. NeuralFusion is a signal-quality lens, not a black-box decider.

## Further Reading

- [DYNAMO-CURRENT-STATE.md](https://github.com/htafolla/chrono-warp-drive/blob/main/docs/DYNAMO-CURRENT-STATE.md) — authoritative current-state document with all formulas, design decisions, and deployment notes
- [Architecture](/docs/architecture) — system data flow and NeuralFusion integration details
- [Blurrn Codex](/docs/blurrn-codex) — foundational cosmological research that inspired Dynamo
