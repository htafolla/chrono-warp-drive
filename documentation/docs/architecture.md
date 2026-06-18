---
sidebar_position: 2
---

# Architecture

Dynamo has three independent subsystems that converge in the governance verdict: solar resonance (7D), neural quantification, and moral alignment (TMO).

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
        [gematriaEngine.ts]  ← numerological encoding (EO/FR/RO density + DR smoothing)
                │
        [SolarGovernanceIntegration]  ← 7D: 6D×0.88 + gematria×0.12
                │
        [Trinitarium Moral Overlay]  ← virtue/concern scoring + negation awareness
                │
        [DynamoSolarGovernance]  ← adaptive thresholds, momentum, verdict
                │
                ▼
   PASS / NEEDS_REVISION / REJECT
   + TMO overlay (Aligned / Mild / Significant / Critical)
```

## NeuralFusion Integration

**NeuralFusion** (TensorFlow.js) is a 3-layer autoencoder (200→48→24→16 bottleneck) that reconstructs NOAA spectrum data. Its `spectralQuality` output (0–1, based on reconstruction error) was the 5th dimension in earlier versions. In the 7D Full Box model, two neural dimensions are used directly:

- **Neural Proximity** (per-dim MSE, exp(−MSE×5)) — 0.154 weight
- **Neural Vortex** (cosine similarity of 16-dim embeddings) — 0.154 weight

The `neuralContextUsed` flag tracks whether neural embeddings were available.

## The Seven Dimensions (Full Box 7D)

Resonance is calculated across seven dimensions, organized into four orthogonal axes:

| # | Dimension | Weight | Axis | What It Measures |
|---|-----------|--------|------|-------------------|
| 1 | Wave Proximity | 0.132 | Physical | exp(−MSE) across 3 active spectrum bands |
| 2 | Phase Alignment | 0.176 | Temporal | Kuramoto oscillator coherence (N=3, K=0.5) |
| 3 | Calibrated Vortex | 0.132 | Physical | pow(waveVortex, 0.25) with floor 0.05 |
| 4 | Calibrated Sync | 0.132 | Physical | 0.15 + 0.85 × pow(deltaDiff, 0.35) |
| 5 | Neural Proximity | 0.154 | Neural | Per-dim MSE between proposal and sun embeddings |
| 6 | Neural Vortex | 0.154 | Neural | Cosine similarity of raw 16-dim embedding vectors |
| 7 | Gematria Resonance | 0.120 | Numerological | EO/FR/RO density similarity + DR distance smoothing |

**7D Formula:**
```
fullBox7D = WaveProximity×0.132 + PhaseAlignment×0.176 + CalibratedVortex×0.132
          + CalibratedSync×0.132 + NeuralProximity×0.154 + NeuralVortex×0.154
          + GematriaResonance×0.120
```

Clamped to [0.15, 0.98].

Earlier models are preserved in every response:
- **4D Hammer**: proximity×0.20 + phase×0.20 + volume×0.30 + sync×0.30
- **5D (with spectralQuality)**: adds spectralQuality×0.10
- **6D Full Box**: same dimensions as 7D without gematria
- **7D Full Box**: 6D×0.88 + gematria×0.12

### Four Orthogonal Axes

| Axis | Dimensions | Weight |
|------|-----------|--------|
| **Physical** (solar TDF + wave) | Wave Proximity, Calibrated Vortex, Calibrated Sync | 0.396 |
| **Temporal** (Kuramoto phase + ordering) | Phase Alignment | 0.176 |
| **Neural** (learned embeddings) | Neural Proximity, Neural Vortex | 0.308 |
| **Numerological** (gematria encoding) | Gematria Resonance | 0.120 |

Gematria is 99% orthogonal to the 6D model (r=0.080), adding ~11–12% effective new discrimination without corrupting the physical measurement.

## Trinitarium Moral Overlay (TMO)

A separate moral discernment axis that does **not** modify the 7D resonance score. TMO evaluates proposals against virtue and concern patterns, producing:

- **Moral Score** (0–1): `virtueAlignment×0.35 + harmPotential×0.25 + intentAlignment×0.30 + sacredBonus + gematriaBonus − riskPenalty`
- **Gematria Fusion**: `tmoScore × gematriaResonance` — interpretive signal for downstream consumers
- **Moral-Numerological Tension**: Aligned (&ge;0.60) / Mild (&ge;0.40) / Significant (&ge;0.25) / Critical (&lt;0.25)

### Virtue Pillars (9)

love, truth, stewardship, redemptive purpose, humility, justice, peace, faith, hospitality

### Concern Pillars (5)

destruction, deception, harm, exploitation, selfishness

### Negation Awareness

The concern scorer detects protective phrases ("protect against", "prevent", "defend from", "safeguard") and reduces concern scores by 75%. This prevents "Add rate limiting to protect against DDoS attacks" from being flagged as harmful.

### TMO Override in 0xRay

When TMO flows into the 0xRay governance pipeline:

| Tension | Effect |
|---------|--------|
| **Critical** | Force REJECT (weight 1.6, confidence 0.92) |
| **Significant** | Downgrade PASS → NEEDS_REVISION (weight ×0.85) |
| **Aligned** | Slight confidence boost (+0.03, weight ×1.05) |
| **Mild** | No override |

The `GovernanceResult` carries `moralOverride` for audit: `'rejected_critical'` | `'downgraded_significant'` | `'none'`.

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

Log-space protects small proposals. A proposal with TDF 1,000 vs sun TDF 500,000 gets ~0.53 instead of 0.002 with raw ratio.

### Cascade indices are not temporal

The old implementation used cascade-index-based lag for synchronization. Cascade indices are content hashes — a text hash vs a solar physics constant produces random lag (~33 average) even with perfect TDF match. Sync now uses deltaDiff linear decay, which correctly scores 45–90% depending on actual TDF alignment.

### Gematria is numerological, not symbolic

The gematria engine treats language as a numeric field against solar constants. It uses English Ordinal, Full Reduction, and Reverse Ordinal density normalization with digital root distance smoothing. The reference text is `"The Sun is the source of all life and light and truth"` (EO=488, DR=2).

## 0xRay Governance Boundary

[0xRay](https://www.npmjs.com/package/0xray) (formerly StringRay) is a multi-agent orchestration framework that uses Dynamo as its solar governance boundary. It provides:

- **3-agent voting committee** — agents deliberate and cast weighted votes on proposals
- **Governance boundary enforcement** — 0xRay routes proposals through Dynamo's solar resonance check before final decisions
- **Moral override** — TMO tension flows through the governance pipeline: Critical → force REJECT, Significant → downgrade PASS
- **Automatic decision routing** — proposals that score below threshold are automatically flagged for revision
- **Cross-session consistency** — historical coherence tracking across agent sessions

Dynamo serves as the external, ungamable signal layer. 0xRay consumes that signal to inform agent voting behavior, creating a self-healing governance loop where the Sun is the ultimate arbiter.

> Package: [`0xray` on npm](https://www.npmjs.com/package/0xray) · GitHub: [0xRayAI/xray](https://github.com/0xRayAI/xray)

## Wave Propagation Layer (Phase 2 Prototype)

**File:** `mcp/lib/wavePropagation.ts`

A Phase 2 prototype that computes three resonance dimensions from wave interference patterns in the Kuramoto oscillator trajectory (20-timestep), rather than from external TDF formulas.

**How it fits:** The wave layer runs in parallel with the existing SolarGovernanceIntegration. It does not replace any current formula — the three wave dimensions are additive A/B fields in the API response, providing an informative overlay for analysis and comparison.

**Three wave dimensions:**

| Dimension | Formula | Description |
|-----------|---------|-------------|
| `waveProximity` | `exp(−MSE × 0.5)` | Gaussian decay on wave-amplitude mismatch between θ₀ and θ₁ across Blue/Green/Red bands |
| `waveVortexAlignment` | `crossCorrelate(C12(θ₀), C14(θ₁))` | Pearson cross-correlation of C-12 proposal wave vs C-14 sun wave across all 12 spectrum bands |
| `waveSynchronization` | `mean(cos(θ₁ − θ₀))` | Trajectory-averaged phase coherence — measures dynamic phase coupling over time |

A/B test results show wave spreads 2–2.5× wider than current TDF formulas for proximity and synchronization, and the current vortexAlignment produces 0% spread (1.0 for all proposals) while the wave version achieves 0.980 spread.

## Further Reading

- [DYNAMO-CURRENT-STATE.md](https://github.com/htafolla/chrono-warp-drive/blob/main/docs/DYNAMO-CURRENT-STATE.md) — authoritative current-state document with all formulas, design decisions, and deployment notes
- [Blurrn Codex](/docs/blurrn-codex) — the theoretical temporal physics framework that Dynamo implements (versioned specs under `docs/blurrn-codex/`)