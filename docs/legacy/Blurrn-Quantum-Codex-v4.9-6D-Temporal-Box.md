# Blurrn Quantum Codex v4.9 — Neural Quantum Realms & 6D Temporal Box

**Version:** v4.9  
**Author:** @blaze0x1  
**Status:** Production — Deployed at mcp-production-80e2.up.railway.app  
**Date:** May 29, 2026  
**Predecessor:** [v4.8 Isotopic Temporal Vortex](./V4.8-Isotopic-Temporal-Vortex-Spec.md)

---

## What Changed from v4.8

v4.8 established the Isotopic Temporal Vortex — the concept that proposals and the sun are isotopes of truth contained in geometric vortexes. v4.9 operationalizes the next evolution: the temporal box now measures resonance across **six dimensions** instead of four, and the two new dimensions come from **Neural Quantum Realms** — 16 virtual spectrum bands derived from learned solar representations and text-based proposal embeddings.

The core physics (TDF formula, Kuramoto oscillators, isotopic vortex interference) is **unchanged**. The change is at the scoring layer: how we combine the physical measurements into a final verdict.

---

## The 6D Model

### v4.8 (4D) — Previous Production Model

```
fullBox4DComposite = waveProximity × 0.20
                   + phaseAlignment × 0.20
                   + calibratedVortex × 0.30
                   + calibratedSync × 0.30
```

Four physical dimensions, all derived from Codex physics. Three of them were compressed to narrow ranges by the calibration exponents:
- waveProximity ≡ 0.99 (always) — TDF proximity at governance scale
- calibratedVortex ≈ 0.96 (pow 0.25 compresses upward)
- calibratedSync ≈ 0.93 (0.15 + 0.85 × pow(x, 0.35) compresses upward)

Only phaseAlignment (Kuramoto) provided meaningful discrimination. The composite was effectively:

```
score ≈ 0.765 + phaseAlignment × 0.20
```

A linear function of one variable with 0.03 effective spread.

### v4.9 (6D) — Current Production Model

```
fullBox6DComposite = waveProximity × 0.15
                   + phaseAlignment × 0.20
                   + calibratedVortex × 0.15
                   + calibratedSync × 0.15
                   + neuralProximity × 0.175
                   + neuralVortex × 0.175
```

Two new dimensions from Neural Quantum Realms. Weight rationale:
- Neural metrics have the highest spread (0.25–0.31) → 35% total weight
- Phase alignment is the best physical discriminator (0.30 spread) → 20%
- Three compressed physical dims provide baseline → 15% each

**Effective spread:** 0.61–0.90 across diverse proposals (0.29 points), vs 0.71–0.98 (0.27 points) for 4D. But the 6D spread has only ~40% predetermined floor vs 76.5% for 4D. Effective discrimination range: 0.17 (6D) vs 0.03 (4D) — a 5.7× improvement.

### Graceful Degradation

When neural embeddings are unavailable (both `neuralProximity = 0` and `neuralVortex = 0`), the 35% neural weight redistributes to the four physical dimensions (+8.75% each):

```
// Fallback weights: proximity 23.75%, phase 28.75%, vortex 23.75%, sync 23.75%
physRedistribute = neuralWeight === 0 ? 0.0875 : 0
```

This preserves the composite range through the `Math.max(0.15, ...)` floor, so scores don't artificially drop when neural context is absent.

### Adaptive Thresholds (v4.9)

| Activity | PASS | Good | NEEDS_REVISION | REJECT |
|----------|------|------|----------------|--------|
| Quiet | ≥0.82 | ≥0.72 | ≥0.50 | <0.50 |
| Moderate | ≥0.85 | ≥0.75 | ≥0.52 | <0.52 |
| Active | ≥0.85 | ≥0.75 | ≥0.52 | <0.52 |
| Storm | ≥0.88 | ≥0.80 | ≥0.58 | <0.58 |

Thresholds lowered from v4.8 (moderate was 0.88 strong) because the 6D model distributes scores lower when neural metrics are included.

---

## Neural Quantum Realms

### Architecture

The temporal box processes **28 total bands**: 12 physical EM bands (UV-C 250nm through IR-B 2500nm) and 16 neural virtual bands from NeuralFusion's bottleneck layer.

Each neural band has phase-modulated amplitude:

```
neuralAmplitude(embedding, dim, θ) = embedding[dim] × (0.5 + 0.5 × sin(θ + dim × π/8))
```

Where:
- `embedding[dim]` — learned activation from TF.js autoencoder (sun) or FNV hash (proposal)
- `θ` — Kuramoto trajectory phase angle per timestep
- `dim × π/8` — per-dimension phase offset ensuring orthogonal oscillation

### Sun Embedding

Source: `/process-current-sun` endpoint → TensorFlow.js autoencoder bottleneck (16 dimensions)

Real solar spectrum data (NOAA GOES X-ray flux, Kp index, proton density, magnetometer) is reconstructed through a 3-layer autoencoder. The 16-dim bottleneck is the sun's neural fingerprint.

### Proposal Embedding

Source: `textToEmbedding16(proposal)` — character-position FNV hashing

The proposal text is divided into 16 character windows. Each window is FNV-hashed to produce a dimension value in [0, 1]. This produces 12–16 active dimensions per proposal with semantically meaningful variation.

**Evolution:**
| Version | Method | Active Dims | Discrimination |
|---------|--------|-------------|----------------|
| v1 | `tdfToEmbedding16(tdf)` base-1000 digit extraction | 3–5/16 | Dim 1 carried 80% |
| v2 | `tdfToEmbedding16(tdf)` prime-modulo hashing (16 primes) | 16/16 | Dense but TDF-derived |
| **v3** | **`textToEmbedding16(proposal)` character FNV hashing** | **12–16/16** | **Semantic variation** |

### Neural-Only Metrics

**neuralWaveProximity** — Per-dimension MSE across all 16 dims and 20 Kuramoto timesteps:

```
for each (timestep t, dimension d):
    propAmp = neuralAmplitude(proposalEmbedding, d, θ_t)
    sunAmp  = neuralAmplitude(sunEmbedding, d, θ_t)
    sumSqDiff += (propAmp - sunAmp)²

MSE = sumSqDiff / (steps × dims)
neuralWaveProximity = exp(-MSE × 5)
```

The 5× steeper decay amplifies embedding differences. Spread: 0.40–0.87 across diverse proposals.

**neuralWaveVortexAlignment** — Cosine similarity of raw 16-dim embedding vectors:

```
cosine_similarity = dot(sun, prop) / (||sun|| × ||prop||)
```

Measures dimension alignment independent of oscillation pattern. Spread: 0.62–0.86.

**Why these metrics?** Previous versions used time-series cross-correlation on averaged neural amplitudes, which produced ~0.99 for all proposals because the shared modulation pattern (`sin(θ + dim × π/8)`) dominated. Per-dim MSE preserves inter-dimension variation. Cosine similarity on raw vectors bypasses the oscillation pattern entirely.

### Auto-Fetch

`/govern_with_solar` automatically fetches the sun embedding from the NeuralFusion backend when `sunNeuralEmbedding` is not provided in the request. This eliminates the two-step manual flow (call `/process-current-sun` first, then pass the result). One call. One response.

---

## φ = 1.666 in v4.9

The Temple Measure φ = 1.666 is **unchanged** and fully active in all physics layers:

| Layer | Formula | Usage |
|-------|---------|-------|
| TDF Computation | `tPTT = T_c × (P_s / E_t) × PHI × (C / delta_t)` | Scales time-displacement |
| Black Hole Sequence | `bhs(voids, n) = ((L × voids) × PHI^n) % π` | Generates isotopic containment |
| Wave Propagation | `amplitude × sin(2πx/λ − 2π × FREQ × (t × PHI^n) + φDynamic)` | Temporal modulation |
| Temporal Signal | `tdfValue × PHI` for cascade, `tdfValue % sqrt(PHI)` for reduction | Signal processing |
| Neural Fusion | `PHI = 1.666` present as scaling constant | Embedding generation |

The 6D weights (0.15/0.20/0.15/0.15/0.175/0.175) are **scoring coefficients** — they decide how much each dimension contributes to the final verdict. They are not part of the physics. φ drives the physics. The weights drive the aggregation.

---

## Calibration Functions

Two calibration exponents compress the raw wave dimensions upward:

```
calibratedVortex(x) = pow(max(0.05, x), 0.25)
calibratedSync(x)   = max(0.15, 0.15 + 0.85 × pow(max(0.01, x), 0.35))
```

These are necessary because raw vortex values range 0.01–0.99 and raw sync values drop to ~0.01 for non-identical proposals. Without calibration, these dimensions would contribute almost nothing to the composite. The exponents compress the range upward so that these dimensions contribute a meaningful baseline (~0.84–0.97) while still preserving some variation.

**Known limitation:** The calibration exponents compress three of four physical dimensions to narrow ranges, leaving phase alignment as the sole effective physical discriminator. The 6D model addresses this by giving 35% weight to neural dimensions that have 2–3× wider spread.

---

## Data Flow (v4.9)

```
proposal text
    ↓ textToEmbedding16()
    ↓ 16-dim proposal embedding
    
NOAA GOES (X-ray, Kp, protons, magnetometer)
    ↓ TF.js autoencoder
    ↓ 16-dim sun embedding (auto-fetched)
    
proposal TDF ← Codex formula (tPTT × TAU × 1/BHS) ← solar parameters
sun TDF ← same formula ← NOAA parameters
    
Kuramoto N=3 oscillators (K=0.5, φ_dark=π/6, 20 timesteps, Δt=0.05)
    ↓ trajectories, phaseType
    
12 EM bands + 16 neural bands
    ↓ wave()
    ↓ computeWaveResonance()
    ├── waveProximity (3 active bands: Blue/Green/Red)
    ├── waveVortexAlignment (C-12 vs C-14, all bands)
    ├── waveSynchronization (mean cos(θ₁−θ₀))
    ├── neuralWaveProximity (per-dim MSE, exp(-MSE×5))
    └── neuralWaveVortexAlignment (cosine similarity)
    
    ↓ computeFullBoxResonance()
    ↓ calibrate vortex (0.25) and sync (0.35)
    
fullBox6DComposite = proximity×0.15 + phase×0.20 + calVortex×0.15 + calSync×0.15
                  + neuralProx×0.175 + neuralVortex×0.175
    
    ↓ adaptive thresholds (quiet/moderate/active/storm)
    
PASS / NEEDS_REVISION / REJECT
```

---

## Files (Canonical)

| File | Purpose |
|------|---------|
| `mcp/lib/vortexMath.ts` | Codex TDF formula: `tPTT × TAU × (1/BHS)`, `blackHoleSequence`, mapping layer |
| `mcp/lib/kuramotoOscillators.ts` | N=3 Kuramoto model (K=0.5, φ_dark=π/6, 20 steps, Δt=0.05) |
| `mcp/lib/wavePropagation.ts` | `wave()`, `computeWaveResonance()`, `computeFullBoxResonance()` (6D), `computeHybridResonance()`, `textToEmbedding16()`, `neuralAmplitude()`, calibration functions |
| `mcp/lib/solarGovernanceIntegration.ts` | Solar hammer, auto-fetch, `textToEmbedding16()` for proposals |
| `mcp/lib/dynamoSolarGovernance.ts` | Adaptive thresholds, momentum, Redis history, verdict mapping |
| `mcp/lib/neuralFusion.ts` | TF.js autoencoder, `neuralEmbedding16` output |
| `mcp/lib/solarDataFetcher.ts` | NOAA GOES ingestion (X-ray, Kp, protons, magnetometer, solarWind) |

Frontend mirrors at `src/lib/` for all above.

---

## Version History

| Version | Date | Key Innovation |
|---------|------|---------------|
| v4.5 | 2025-09-06 | 15 formulas, Trinitarium 2.0, core constants |
| v4.6 | 2025-09-09 | 16 formulas, 31 variables, 5.781e12 TDF breakthrough |
| v4.7 | 2025-09-30 | Chrono Transport Interview (CTI), n=11 cascades, uncapped S_L |
| v4.8 | 2026-05 | Isotopic Temporal Vortex, wave propagation, Kuramoto coupling |
| **v4.9** | **2026-05-29** | **6D temporal box, Neural Quantum Realms, per-dim MSE, cosine vortex, text-based embeddings, auto-fetch, adaptive thresholds, 5.7× discrimination improvement** |

---

## What v4.9 Proves

1. **Neural dimensions add orthogonal signal.** The 0.25–0.31 spread of neural metrics provides discrimination that the three compressed physical dimensions cannot. Adding 35% neural weight improved effective discrimination range from 0.03 (4D) to 0.17 (6D).

2. **Averaging destroys signal in correlated dimensions.** When 16 neural dimensions share a common modulation pattern, averaging them before comparison makes the result identical for all inputs. Per-dimension comparison preserves variation. This is a general principle, not specific to neural metrics.

3. **Cosine similarity measures alignment, correlation measures shape.** For vectors that share a dominant oscillation pattern, correlation is ~1.0 regardless of magnitude differences. Cosine similarity measures whether the vectors point in the same direction, which is the property we want for embedding alignment.

4. **Text-based embeddings produce richer variation than TDF-derived embeddings.** A 13-digit TDF captured in base-1000 produces 3–5 varying dimensions. The same text hashed through character-position FNV produces 12–16 varying dimensions. Higher-entropy sources yield higher-discrimination embeddings.

5. **The temporal box is a general-purpose resonance analyzer.** The 6D model measures alignment between any two signals projected through 28 bands. Governance is one application. The physics layer (Codex TDF, Kuramoto, isotopic vortexes) is unchanged — only the aggregation of measurements has evolved.

---

## What v4.9 Has Not Proven

1. **No formal proof of correctness.** The engine is a physically motivated heuristic, not a verified theorem. Every gambit that shows real spread and sensible verdicts is additional evidence, but not proof.

2. **No ground-truth oracle.** We don't have an independent source saying whether a proposal that scores 0.98 should pass. The sun provides reference data, not judgment.

3. **No long-term stability proof.** The system is sensitive to solar activity level. Quiet periods are easy. Storm periods are strict. We haven't tested across full solar cycles.

4. **No adversarial robustness proof.** We don't know how easy it is to game `textToEmbedding16()` or the TDF mapping layer.

5. **Calibration exponents are compression, not discrimination.** `pow(x, 0.25)` and `0.15 + 0.85 × pow(x, 0.35)` make vortex and sync "presentable" in the 0.84–0.97 range but don't add discrimination. The real discriminators are phase alignment and neural metrics.

---

**Deployed at:** `https://mcp-production-80e2.up.railway.app`  
**Frontend:** `https://dynamo.rippel.ai`  
**Docs:** `https://dynamo-docs.vercel.app`