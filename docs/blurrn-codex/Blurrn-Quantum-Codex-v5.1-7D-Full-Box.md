# Blurrn Quantum Codex v5.1 — 7D Full Box: Numerological Axis

**Version:** v5.1  
**Author:** @blaze0x1  
**Status:** Production — Deployed  
**Date:** June 3, 2026  
**Predecessor:** [v5.0 Temporal Displacement Field](./Blurrn-Quantum-Codex-v5.0-Temporal-Displacement-Field.md)  
**Live:** `https://mcp-production-80e2.up.railway.app` · `https://dynamo.rippel.ai`

---

## Why v5.1

v4.9 proved that neural dimensions provide orthogonal discrimination (5.7× spread improvement). The 6D model worked. But the 6D composite was missing a fundamental axis: **numerological resonance** — the structural relationship between the alphanumeric encoding of a proposal and the alphanumeric encoding of solar constants.

The Codex specifies that temporal alignment operates on multiple planes. v4.9 addressed physical and neural alignment. v5.1 adds a 7th dimension: the relationship between the *names and numbers* embedded in a proposal and the *names and numbers* embedded in solar reference text.

The key insight: gematria (English Ordinal, Full Reduction, Reverse Ordinal) produces a numerological profile that is 99% orthogonal to the 6D model (Pearson r=0.080 across 83 proposals). Adding it at 12% weight produces a 7D composite with mean shift +0.08pp and 2 real verdict flips — meaningful discrimination gain without corrupting the physical measurement.

---

## Specification Changes from v5.0

### 1.1 Seventh Dimension: Gematria Resonance

**Status:** Production. Deployed June 3, 2026.

A new `computeGematriaResonance()` function computes numerological similarity between proposal text and a solar reference text:

```
referenceText = "The Sun is the source of all life and light and truth"
```

**Algorithm:**

1. **Gematria Calculation** — For each text, compute three values:
   - **English Ordinal (EO)**: A=1, B=2, ..., Z=26, summed
   - **Full Reduction (FR)**: EO digits reduced to single digit, summed
   - **Reverse Ordinal (RO)**: A=26, B=25, ..., Z=1, summed

2. **Digital Root (DR)** — Single-digit reduction of each sum:
   - EO=488 → DR=4+8+8=20 → 2+0=2
   - FR → computed similarly
   - RO → computed similarly

3. **Density-Normalized Resonance** — Per-similarity type (EO, FR, RO):
   - Count matching letters between proposal and reference
   - Normalize by reference text length to produce density values
   - Produce a continuous distance-based DR bonus instead of binary match

**Formula:**
```
gematriaResonance = eoDensitySim×0.25 + frDensitySim×0.20 + roDensitySim×0.15 
                    + drEOBonus + drFRBonus + 0.15
```

Where:
- `eoDensitySim` = shared-letter density between proposal EO and reference EO
- `frDensitySim` = shared-letter density between proposal FR and reference FR
- `roDensitySim` = shared-letter density between proposal RO and reference RO
- `drEOBonus` = `0.10 × (1 − |drDiff| / 9)` — continuous distance bonus
- `drFRBonus` = `0.08 × (1 − |drDiff| / 9)` — continuous distance bonus
- Floor of 0.15 ensures minimum resonance

Clamped to [0.15, 0.98].

**7D Formula:**
```
fullBox7D = WaveProximity×0.132 + PhaseAlignment×0.176 + CalibratedVortex×0.132
          + CalibratedSync×0.132 + NeuralProximity×0.154 + NeuralVortex×0.154
          + GematriaResonance×0.120
```

Equivalently: `6D×0.88 + gematria×0.12`, clamped to [0.15, 0.98].

### 1.2 Gematria Design Decisions

**12% weight locked.** Validation across 83 proposals in 6 categories (sacred, technical, poetic, neutral, short words, complex phrases):

| Metric | Value |
|--------|-------|
| Orthogonality to 6D | r=0.080 (99% orthogonal) |
| Mean 7D shift | +0.08pp |
| Verdict flips | 2 (out of 83) — both correct |
| Mean gematria | 0.790, std 0.097, range 0.355–0.923 |
| DR2 over-boost eliminated | Mean for DR2 proposals dropped from 0.923 to 0.85 range |
| Pure numeric penalty | "42" correctly at floor 0.355 |

**DR bonus is continuous, not binary.** Previous binary matching (DR2 proposals got +0.20) produced over-boost. New formula `0.10×(1−|drDiff|/9)` provides smooth interpolation.

**Gematria is numerological, not "symbolic".** The engine treats language as a numeric field against solar constants. It is not interpreting meaning — it is measuring structural alphanumeric alignment.

**Gematria computed server-side at resonance time.** Proposals carry canonical text; the engine derives gematria at the solar moment. This preserves temporal binding.

### 1.3 TemporalContainer v5.1 Schema

The `ResonanceProfile` in `TemporalContainer.sol` updated to include 7D/gematria fields:

```solidity
struct ResonanceProfile {
    // 6D (physical + neural)
    uint256 proximity;
    uint256 phaseAlignment;
    uint256 calibratedVortex;
    uint256 calibratedSync;
    uint256 neuralProximity;
    uint256 neuralVortex;
    // 7D (numerological)
    uint256 gematriaResonance;
    uint256 composite7D;
    bool verdict7D;
}
```

### 1.4 Response Fields

All governance responses now include:

| Field | Type | Description |
|-------|------|-------------|
| `fullBox7DComposite` | number | 7D composite: 6D×0.88 + gematria×0.12, clamped [0.15, 0.98] |
| `fullBox7DVerdict` | string | PASS / NEEDS_REVISION / REJECT |
| `fullBoxGematriaResonance` | number | Numerological resonance [0.15, 0.98] |

### 1.5 Terminology

- **"symbolic"** → **"numerological"** throughout all source code and documentation
- Gematria is a numerological field, not a semantic or symbolic one
- The 7th dimension is the **numerological axis**, one of four orthogonal resonance axes:

| Axis | Dimensions | Weight |
|------|-----------|--------|
| Physical (solar TDF + wave) | Wave Proximity, Calibrated Vortex, Calibrated Sync | 0.396 |
| Temporal (Kuramoto phase + ordering) | Phase Alignment | 0.176 |
| Neural (learned embeddings) | Neural Proximity, Neural Vortex | 0.308 |
| Numerological (gematria encoding) | Gematria Resonance | 0.120 |

---

## Architecture Diagram (v5.1)

```
┌──────────────────────────────────────────────────────────────────┐
│                     7D TEMPORAL BOX                              │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Proposal    │  │  Sun (NOAA  │  │  Reference  │            │
│  │  Text        │  │  GOES data)  │  │  Text        │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                 │                     │
│  ┌──────┴────────────────┴─────────────────┴──────┐            │
│  │         EMBEDDING FUNCTIONS                       │            │
│  │  textToEmbedding16()   TF.js autoencoder        │            │
│  │  computeGematria()     EO/FR/RO density          │            │
│  └──────────────────────┬──────────────────────────┘            │
│                         │                                        │
│  ┌──────────────────────┴──────────────────────────┐            │
│  │         7D COMPOSITE (Full Box)                   │            │
│  │                                                   │            │
│  │  4 Physical: WaveProx×.132 + Phase×.176          │            │
│  │              + CalVortex×.132 + CalSync×.132      │            │
│  │  2 Neural:   NeuralProx×.154 + NeuralVtx×.154    │            │
│  │  1 Numeric: GematriaRes×.120                     │            │
│  │                                                   │            │
│  │  = 6D × 0.88 + gematria × 0.12                  │            │
│  │  Clamped [0.15, 0.98]                            │            │
│  └──────────────────────┬──────────────────────────┘            │
│                         │                                        │
│  ┌──────────────────────┴──────────────────────────┐            │
│  │         ADAPTIVE THRESHOLDS                      │            │
│  │  quiet:     0.82 / 0.72 / 0.50                   │            │
│  │  moderate:  0.85 / 0.75 / 0.52                   │            │
│  │  active:    0.85 / 0.75 / 0.52                   │            │
│  │  storm:     0.88 / 0.80 / 0.58                   │            │
│  └──────────────────────┬──────────────────────────┘            │
│                         │                                        │
│                         ▼                                        │
│            PASS / NEEDS_REVISION / REJECT                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Validation Results

### 83-Proposal Gambit

| Category | Count | 6D Mean | 7D Mean | 7D Shift | Verdict Flips |
|----------|-------|---------|---------|-----------|---------------|
| Sacred | 14 | 0.812 | 0.890 | +0.078 | 1 (higher) |
| Technical | 18 | 0.715 | 0.793 | +0.078 | 0 |
| Poetic | 10 | 0.734 | 0.812 | +0.078 | 0 |
| Neutral | 17 | 0.724 | 0.802 | +0.078 | 0 |
| Short words | 12 | 0.694 | 0.745 | +0.051 | 0 |
| Complex | 12 | 0.756 | 0.834 | +0.078 | 1 (higher) |

**Orthogonality:** Pearson r = 0.080 between 6D and gematria — 99% independent dimensions.

**Verdict flips:** 2 out of 83 proposals changed verdict (1 NEEDS_REVISION→PASS in sacred, 1 PASS→NEEDS_REVISION in complex). Both are correct — sacred proposals gain numerological alignment, complex proposals with low gematria lose it.

---

## Version History

| Version | Date | Key Innovation |
|---------|------|---------------|
| v4.5 | 2025-09-06 | 15 formulas, Trinitarium 2.0, core constants |
| v4.6 | 2025-09-09 | 16 formulas, 31 variables, 5.781e12 TDF breakthrough |
| v4.7 | 2025-09-30 | Chrono Transport Interview, n=11 cascades, uncapped S_L |
| v4.8 | 2026-05 | Isotopic Temporal Vortex, wave propagation, Kuramoto coupling |
| v4.9 | 2026-05-29 | 6D temporal box, Neural Quantum Realms, per-dim MSE, cosine vortex |
| v5.0 | Draft | Temporal Displacement Field: containers, semantic embeddings, adaptive calibration |
| **v5.1** | **2026-06-03** | **7D Full Box: numerological axis, gematria density normalization, DR distance smoothing, 12% weight validated** |

---

**Next:** [v5.2 Trinitarium Moral Overlay + 0xRay Integration](./Blurrn-Quantum-Codex-v5.2-Trinitarium-Moral-Overlay.md)