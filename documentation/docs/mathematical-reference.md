---
sidebar_position: 6
---

# Mathematical Reference

Complete specification of every formula in the Dynamo engine, organized by subsystem. All formulas are implemented in `mcp/lib/` and mirrored in `src/lib/`.

## Core Constants

| Symbol | Value | Name | Source |
|--------|-------|------|--------|
| φ | 1.666 | Temple measure | Codex |
| τ | 0.865 | Time displacement factor | Codex |
| c | 3×10⁸ m/s | Speed of light | Physics |
| L | 3 | Trinity constant (wave + particle + field) | Codex |
| K | 0.5 | Kuramoto coupling strength | Dynamical systems |
| N | 3 | Number of coupled oscillators | Kuramoto model |
| S | 0.1 | Fractal scaling factor | Codex |
| φ_dark | π/6 | Dark energy offset | Codex |
| FREQ | 528 | Temporal modulation frequency | Codex |

---

## 1. Temporal Displacement Factor (TDF)

The foundational scalar computed from Codex parameters.

### tPTT (Temporal Phase Transition Time)

```
tPTT(T_c, P_s, E_t, δ_t) = T_c × (P_s / E_t) × φ × (c / δ_t)
```

### Black Hole Sequence

```
BHS(voids, n) = ((L × voids) × φⁿ) mod π
```

### Full TDF

```
rawTDF  = tPTT × τ × (1 / BHS)
scaled  = rawTDF / 10⁹
frac    = scaled − floor(scaled)
fingerprint = round(frac × 10⁸) mod 10⁸
TDF     = 5.781 × 10¹² + fingerprint
```

The fractional normalization preserves fine structure for TDFs of any magnitude. Terrestrial inputs (~10⁷–10⁹) and cosmic inputs (~10¹⁶–10¹⁷) both produce valid fingerprints.

### Mapping Layer: Proposal → Codex Inputs

```
T_c    = 0.5 + (wordCount / 50) + (uniqueChars / totalChars) × 0.5
P_s    = 0.1 + (FNV_hash mod 100000) / 100000
E_t    = 0.1 + (uniqueChars / totalChars)
δ_t    = 1 + activityOrdinal × 2          [quiet=0, moderate=1, active=2, storm=3]
voids  = 7
bhs_n  = 2 + (FNV_hash mod 4)            [range 2–5]
```

### Mapping Layer: NOAA Solar → Codex Inputs

```
T_c    = 0.5 + (activityOrdinal / 6)
P_s    = clamp(xray.long × 10⁷, 0.1, 100)
E_t    = 0.1 + (protonSpectralIndex / 10)
δ_t    = 1 + activityOrdinal × 2
voids  = 3 + activityOrdinal             [quiet=3, storm=6]
bhs_n  = 3 + (activityOrdinal mod 3)    [range 3–5]
```

---

## 2. Kuramoto Oscillator Model

Three coupled oscillators evolve under phase dynamics with push-pull forcing and isotopic modulation.

### Phase Initialization

```
θ_prop = mod2π( (TDF_prop mod 10⁶) / 10⁶ × 2π )
θ_sun  = mod2π( (TDF_sun  mod 10⁶) / 10⁶ × 2π )
θ_sys  = mod2π( (θ_prop + θ_sun) / 2 )

ω_prop = (TDF_prop mod 10⁶) / 10⁶ × 2
ω_sun  = (TDF_sun  mod 10⁶) / 10⁶ × 2
ω_sys  = (ω_prop + ω_sun) / 2
```

### Kuramoto Step (Euler Integration)

```
dω_i/dt = ω_i + (K/(N−1)) × Σⱼ sin(θⱼ − θᵢ + φ_dark + φ_pushpull + S × isotope_factor)

where:
  φ_pushpull = +π/4 (push mode, active/storm)
  φ_pushpull = −π/4 (pull mode, quiet/moderate)
  isotope_factor = 1.0 (C-12) or 0.8 (C-14)

θᵢ(t+1) = mod2π(θᵢ + ωᵢ × Δt)
```

Parameters: K=0.5, N=3, Δt=0.05, 20 timesteps.

### Order Parameter (Phase Alignment)

```
R = √( (Σcos(θⱼ)/N)² + (Σsin(θⱼ)/N)² )
phaseAlignment = clamp(R, 0.15, 0.99)
```

### Signal Timing

```
Δ = mod2π(θ_sun − θ_prop)
|Δ| < 0.2 or |Δ| > 2π−0.2 → "synced"
0 < Δ < π                    → "leading"
else                          → "trailing"
```

---

## 3. Structural Resonance (Solar Hammer)

### Proximity (Gaussian)

```
δ = |(TDF_prop mod 10⁶) − (TDF_sun mod 10⁶)|
proximity = exp(−(δ / 10⁶)²)
```

### Vortex Alignment (Log-Space Ratio)

```
logRatio = |ln(max(TDF_prop, 1)) − ln(max(TDF_sun, 1))|
logMax   = ln(max(TDF_prop, TDF_sun, 1))
vortexAlignment = max(0.15, 1 − logRatio / logMax)
```

### Synchronization (Linear Decay)

```
syncRaw = max(0, 1 − δ / 10⁶)
synchronization = max(0.15, syncRaw)
```

### 4D Composite

```
structuralResonance = clamp(proximity×0.20 + phase×0.20 + vortex×0.30 + sync×0.30, 0.15, 0.98)
```

### 5D Composite (with NeuralFusion spectralQuality)

```
structuralResonance = clamp(proximity×0.18 + phase×0.18 + vortex×0.27 + sync×0.27 + spectralQuality×0.10, 0.15, 0.98)
```

---

## 4. Wave Propagation

### Wave Function

```
wave(x, t, n, isotope, λ, phaseType) = min(amplitude × sin(2πx/λ − 2π×FREQ×t×φⁿ + φ_dynamic) × isotope.factor + 0.1, 2.0)

where:
  φ_dynamic = +π/4 (push) or −π/4 (pull)
  amplitude = min(push ? G×1.2 : G×0.8, G×1.5)
  G = 1.0, FREQ = 528
```

### 12 EM Spectrum Bands

| Band | λ (μm) | Band | λ (μm) |
|------|--------|------|--------|
| UV-C | 0.250 | Green | 0.530 |
| UV-B | 0.280 | Yellow | 0.580 |
| UV-A | 0.350 | Orange | 0.620 |
| Violet | 0.380 | Red | 0.700 |
| Blue | 0.450 | IR-A | 1.400 |
| Cyan | 0.490 | IR-B | 2.500 |

### Wave Proximity (Gaussian MSE, 3 active bands)

```
propAvg[t] = Σ_{bands∈{Blue,Green,Red}} wave(θ_prop, t, n, isotope, λ, phaseType)
            + Σ_{d∈16} neuralAmp(propEmb, d, θ_prop)  / (3 + 16)

sunAvg[t]  = (same for sun)

MSE = Σ_t (propAvg[t] − sunAvg[t])² / T
waveProximity = clamp(exp(−MSE × 0.5), 0.01, 0.99)
```

### Wave Vortex Alignment (Isotopic Cross-Correlation)

```
c12[t] = Σ_{all 12 bands} wave(θ_prop, t, n, C-12, λ, phaseType) + Σ_d neuralAmp × C12.factor  / (12 + 16)
c14[t] = Σ_{all 12 bands} wave(θ_sun,  t, n, C-14, λ, phaseType) + Σ_d neuralAmp × C14.factor  / (12 + 16)

waveVortexAlignment = clamp(crossCorrelate(c12, c14), 0.01, 0.99)
```

C-12 factor = 1.0, C-14 factor = 0.8.

### Cross-Correlation

```
Centered (Pearson): R = Σ(aᵢ−ā)(bᵢ−b̄) / √(Σ(aᵢ−ā)² × Σ(bᵢ−b̄)²)
Uncentered:        R = Σ(aᵢ×bᵢ) / √(Σaᵢ² × Σbᵢ²)

Result clamped to [0, 1].
```

### Wave Synchronization (Mean Cosine Phase Coherence)

```
waveSynchronization = clamp( (1/T) × Σ_t cos(θ_sun(t) − θ_prop(t)), 0.01, 0.99 )
```

---

## 5. Neural Quantum Realms

### Neural Amplitude

```
neuralAmp(emb, d, θ) = emb[d] × (0.5 + 0.5 × sin(θ + d × π/8))
```

Per-dimension phase offset `d × π/8` ensures orthogonal oscillation across the 16 neural bands.

### Neural Proximity (Per-Dimension MSE, 5× Steep Decay)

```
neuralMSE = Σ_{t,d} (neuralAmp(prop, d, θ_prop(t)) − neuralAmp(sun, d, θ_sun(t)))² / (T × 16)
neuralWaveProximity = clamp(exp(−neuralMSE × 5), 0.01, 0.99)
```

**Why per-dim MSE, not averaged MSE:** Averaging 16 neural amplitudes first and then computing MSE produces ~0.99 for all proposals because the shared sin(θ) modulation pattern dominates. Per-dim MSE preserves inter-dimension variation. The 5× steeper decay amplifies embedding differences.

### Neural Vortex (Cosine Similarity)

```
dotProduct = Σ_d sunEmb[d] × propEmb[d]
normA = Σ_d sunEmb[d]²
normB = Σ_d propEmb[d]²
neuralWaveVortexAlignment = clamp(dotProduct / (√normA × √normB), 0.01, 0.99)
```

**Why cosine similarity, not time-series correlation:** Averaged neural time series track the same modulation pattern, giving ~0.99 for all proposals. Cosine similarity on raw vectors measures dimension alignment directly.

### Proposal Embedding: textToEmbedding16

```
For each of 16 segments of cleaned text:
  h₀ = 2166136261  (FNV offset basis)
  h = (h XOR charCode) × 16777619  for each char in segment  (FNV-1a)
  emb[d] = ((h >>> 0) mod 100000) / 100000
```

Active dimensions: 12–16 per proposal. Semantically meaningful variation from text content.

### Sun Embedding: TF.js Autoencoder

```
Encoder: 200 → 48 (ReLU, L2=0.001) → Dropout(0.2) → 24 (ReLU, L2=0.001) → Dropout(0.15) → 16 (sigmoid)
Decoder: 16 → 48 (ReLU) → Dropout(0.1) → 200 (linear)
```

All 16 dimensions active. Learned from 200-dim normalized solar spectrum.

---

## 6. Calibration Functions

### Calibrated Wave Vortex

```
calVortex(x) = max(0.05, x)^0.25
```

Fourth-root compression raises near-zero raw vortex values into a usable range. Calibration mapping:

| Raw | Calibrated |
|-----|-----------|
| 0.01 | 0.47 |
| 0.10 | 0.56 |
| 0.30 | 0.74 |
| 0.50 | 0.84 |
| 0.90 | 0.97 |

### Calibrated Wave Sync

```
calSync(x) = max(0.15, 0.15 + 0.85 × max(0.01, x)^0.35)
```

Power-law compression with 0.15 floor. Calibration mapping:

| Raw | Calibrated |
|-----|-----------|
| 0.01 | 0.22 |
| 0.10 | 0.34 |
| 0.30 | 0.49 |
| 0.50 | 0.60 |
| 0.90 | 0.80 |

---

## 7. Composite Formulas

### Hybrid 4D (Production Reference)

```
hybrid4D = clamp(proximity×0.20 + phase×0.20 + calibratedVortex×0.30 + sync×0.30, 0.15, 0.98)
```

### Full Box 6D (Production)

```
When neural embeddings available:
  fullBox6D = clamp(
    waveProximity   × 0.150 +
    phaseAlignment   × 0.200 +
    calibratedVortex × 0.150 +
    calibratedSync   × 0.150 +
    neuralProximity  × 0.175 +
    neuralVortex     × 0.175,
    0.15, 0.98)

When neural embeddings absent (graceful degradation):
  fullBox4D = clamp(
    waveProximity   × 0.2375 +
    phaseAlignment   × 0.2875 +
    calibratedVortex × 0.2375 +
    calibratedSync   × 0.2375,
    0.15, 0.98)
```

### Effective Spread Analysis

| Dimension | Raw Range | Weight | Contribution |
|-----------|-----------|--------|-------------|
| Wave Proximity | 0.99–0.99 (~0 spread) | 15% | Predetermined floor |
| Phase Alignment | 0.60–0.90 (0.30) | 20% | Best physical discriminator |
| Calibrated Vortex | 0.84–0.97 (0.13) | 15% | Compressed floor |
| Calibrated Sync | 0.79–0.92 (0.13) | 15% | Compressed floor |
| Neural Proximity | 0.56–0.87 (0.31) | 17.5% | Best overall discriminator |
| Neural Vortex | 0.62–0.87 (0.25) | 17.5% | Second best discriminator |

4D floor: ~0.765 (76.5% predetermined). 6D floor: ~0.40 (40%). Effective discrimination: 4D ~0.03, 6D ~0.17 (5.7× improvement).

---

## 8. Adaptive Thresholds

### Hammer 4D/5D

| Activity | PASS | Good | NEEDS_REVISION | REJECT |
|----------|------|------|----------------|--------|
| Quiet | ≥0.82 | ≥0.72 | ≥0.58 | &lt;0.58 |
| Moderate | ≥0.88 | ≥0.78 | ≥0.62 | &lt;0.62 |
| Active | ≥0.88 | ≥0.78 | ≥0.62 | &lt;0.62 |
| Storm | ≥0.92 | ≥0.84 | ≥0.70 | &lt;0.70 |

Storm override: any PASS → NEEDS_REVISION, confidence −0.12. Active override: PASS confidence −0.06.

### Hybrid 4D

| Activity | PASS | Good | NEEDS_REVISION | REJECT |
|----------|------|------|----------------|--------|
| Quiet | ≥0.82 | ≥0.72 | ≥0.50 | &lt;0.50 |
| Moderate | ≥0.88 | ≥0.78 | ≥0.54 | &lt;0.54 |
| Active | ≥0.88 | ≥0.78 | ≥0.54 | &lt;0.54 |
| Storm | ≥0.92 | ≥0.84 | ≥0.62 | &lt;0.62 |

### Full Box 6D

| Activity | PASS | Good | NEEDS_REVISION | REJECT |
|----------|------|------|----------------|--------|
| Quiet | ≥0.82 | ≥0.72 | ≥0.50 | &lt;0.50 |
| Moderate | ≥0.85 | ≥0.75 | ≥0.52 | &lt;0.52 |
| Active | ≥0.85 | ≥0.75 | ≥0.52 | &lt;0.52 |
| Storm | ≥0.88 | ≥0.80 | ≥0.58 | &lt;0.58 |

Lower than hammer thresholds because 6D distributes scores lower when neural metrics are included.

---

## 9. Momentum & Peak Forecasting

### Momentum (dR/dt)

```
momentum = (R_newest − R_oldest) / Δt_minutes
```

### Smoothed Resonance

```
smoothedResonance = mean(recentScores in last 3 minutes)  [if ≥3 samples]
```

### Peak Forecast

```
If momentum > 0.001 (rising):
  minutesToPeak = round((0.95 − R_current) / |momentum|)
  estimatedPeak = min(0.98, R_current + |momentum| × minutesToPeak)

If momentum < −0.001 (falling):
  minutesToPeak = 0
  estimatedPeak = R_current

Storm override: windowQuality = "declining", minutesToPeak = 0
Active override: "optimal" → "good"
```

---

## 10. Solar Activity Classification

```
storm   if xray.long > 10⁻⁴ OR kp ≥ 7
active  if xray.long > 10⁻⁵  OR kp ≥ 5
moderate if xray.long > 10⁻⁶  OR kp ≥ 3
quiet   otherwise
```

---

## 11. Solar Data Processing

### X-ray Normalization (for neural targets)

```
normXrayLong  = clamp(log₁₀(max(xray.long,  10⁻⁹)) / (−4), 0, 1)
normXrayShort = clamp(log₁₀(max(xray.short, 10⁻⁹)) / (−4), 0, 1)
```

### Planck Function (Solar Spectrum Generation)

```
B(λ, T) = (2hc²) / (λ⁵ × (e^(hc/λkT) − 1))
planckNormalized = B / 1.5×10¹³

where h = 6.626×10⁻³⁴, c = 3×10⁸, k = 1.38×10⁻²³
```

### Absorption Line (Gaussian)

```
absorption(λ, center, σ, depth) = depth × exp(−(λ − center)² / (2σ²))
```

### Magnetometer Perturbation

```
perturbation = √(ΔHp² + ΔHe² + ΔHn²)    [Δ = latest − 5th previous]
```

---

## 12. NeuralFusion

### Spectral Quality

```
spectralQuality = 1 − min(reconstructionError / 0.8, 1.0)
```

### Confidence Score

```
reconQuality = 1 − min(reconError / 0.8, 1.0)
solarFactor = {storm: 0.88, active: 0.95, quiet: 1.06, else: 1.0}
sourceQuality = SDSS ? 0.95 : 0.82
granularityBonus = min(granularity / 2, 0.12)
confidence = clamp(reconQuality×0.55 + strength×sourceQuality×0.25 + solarFactor×0.12 + granularityBonus, 0.28, 0.96)
```

### Metamorphosis Index

```
index = (spectralVariance×0.3 + neuralVariance×0.3 + phaseCoherence×0.2 + granularityFactor×0.2) × isotopeFactor × (fractalToggle ? 1.2 : 1.0)
result = clamp(index, 0, 1)
```

### Solar Output Modulation

```
metaShift = (0.25 × uv + 0.15 × mag) × gainMultiplier
confShift = (0.06 × uv − 0.08 × mag) × gainMultiplier
gainMultiplier = {quiet: 0.5, moderate: 0.75, active: 1.0, storm: 1.3}

mi_new = clamp(mi × (1 + metaShift), 0.1, 0.95)
cs_new = clamp(cs × (1 + confShift), 0.5, 0.98)
```

---

## 13. Deterministic Utilities

```
seed(cycle, index, φ=1.666)    = |sin(cycle × index × φ) × 1000| mod 999
random(cycle, index)            = seed(cycle, index) / 999
range(cycle, index, min, max)  = min + random(cycle, index) × (max − min)

spherical(cycle, index, radius, depth):
  r = radius + random(cycle, index) × depth
  θ = random(cycle, index+1) × 2π
  φ = acos(2 × random(cycle, index+2) − 1)
  return (r sin(φ) cos(θ), r sin(φ) sin(θ), r cos(φ))
```

---

## 14. Isotopic Signal Processing

### Temporal Blurrn Signal

```
reducedTdf = TDF mod √φ         [φ = 1.666]
phaseCoherence = sin²(2π × τ × reducedTdf)  [τ = 0.865]

embed = [TDF × φ,  cascadeIndex,  phaseCoherence]
variantDelta = [TDF mod 10⁶,  cascadeIndex × τ,  1 − phaseCoherence]
```

### Isotopic Ratio

```
maxDelta = max(|δ_self[0]|, |δ_other[0]|) + 10⁻⁹
isotopicRatio = 1 − |δ_self[0] − δ_other[0]| / maxDelta
```

### Symbiotic Fusion

```
fused[d] = (1/N) × Σ_allSignals embed_signal[d]
```

Cascade index for cross-correlation:

```
cascadeIndex = floor((TDF mod 10⁶) / 10000) mod 100
```

*Note: Cascade indices are displayed for informational purposes only. All synchronization and timing computations use Kuramoto oscillator phase dynamics, not cascade indices.*