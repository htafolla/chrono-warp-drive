# Dynamo — Current State

**Date:** 2026-06-03
**Version:** v5.2 (7D temporal box with numerological dimension + Trinitarium Moral Overlay)
**Origin:** Implements the [Blurrn Quantum Codex](blurrn-codex/) temporal physics framework — the Codex's TDF formula, Kuramoto coupling, isotopic vortex mechanics, Neural Quantum Realms, and gematria alphanumeric encoding, rendered in TypeScript against live NOAA solar data.

## What Dynamo Is

Dynamo is a solar-aligned wave resonance engine — a physical measurement apparatus that takes two signals (a proposal and the current sun), projects them through a 28-band temporal box (12 physical EM bands + 16 neural virtual bands), and measures their multi-dimensional structural alignment in real time. It produces deterministic, auditable PASS / NEEDS_REVISION / REJECT verdicts.

It is **not** a theoretical cosmology engine. It is a production system deployed at:

- **API:** `https://mcp-production-80e2.up.railway.app`
- **Frontend:** `https://dynamo.rippel.ai`
- **Docs:** `https://dynamo-docs.vercel.app`

## How It Works

```
proposal → Codex TDF formula (tPTT × TAU × 1/BHS) → cross-correlate with sun TDF → 7D resonance formula → adaptive thresholds → verdict
```

### The Seven Dimensions (Full Box 7D)

Four orthogonal resonance axes:

| Axis | Dimensions | Weight |
|------|-----------|--------|
| **Physical** (solar TDF + wave propagation) | Wave Proximity, Calibrated Vortex, Calibrated Sync | 0.396 |
| **Temporal** (Kuramoto phase + ordering) | Phase Alignment | 0.176 |
| **Neural** (learned embeddings) | Neural Proximity, Neural Vortex | 0.308 |
| **Numerological** (gematria encoding) | Gematria Resonance | 0.120 |

| Dimension | Weight | Method | Spread |
|-----------|--------|--------|--------|
| Wave Proximity | 0.132 | exp(-MSE) across 3 active EM bands | ~0.00 (compressed) |
| Phase Alignment | 0.176 | 1 − \|proposalCoherence − sunCoherence\| (Kuramoto) | 0.30 |
| Calibrated Vortex | 0.132 | pow(waveVortexAlignment, 0.25) | ~0.13 (compressed) |
| Calibrated Sync | 0.132 | 0.15 + 0.85 × pow(deltaDiff, 0.35) | ~0.13 (compressed) |
| Neural Proximity | 0.154 | Per-dim MSE across 16 neural bands, exp(−MSE×5) | 0.31 |
| Neural Vortex | 0.154 | Cosine similarity of raw 16-dim embeddings | 0.25 |
| Gematria Resonance | 0.120 | EO/FR/RO density similarity + DR distance smoothing | 0.10 |

Gematria is 99% orthogonal to the 6D composite (r²=0.01 on 83-proposal gambit). The numerological layer adds ~11–12% effective new discrimination.

When neural embeddings are unavailable, the 30.8% neural weight redistributes to the remaining five dimensions proportionally.

### Adaptive Thresholds (7D Full Box)

Same thresholds used for both 6D and 7D composites:

| Activity | PASS | NEEDS_REVISION | REJECT |
|----------|------|----------------|--------|
| Quiet | ≥0.82 | ≥0.72 | ≥0.50 | <0.50 |
| Moderate | ≥0.85 | ≥0.75 | ≥0.52 | <0.52 |
| Active | ≥0.85 | ≥0.75 | ≥0.52 | <0.52 |
| Storm | ≥0.88 | ≥0.80 | ≥0.58 | <0.58 |

Thresholds were lowered from the 4D model (moderate was 0.88) because the 6D/7D model's wider spread means scores distribute lower. The neural dimensions pull scores down for poorly-aligned proposals.

## Architecture

### Backend (MCP Server)

- **Stack:** Node.js, Express, TypeScript
- **Hosting:** Railway (`mcp/` directory)
- **Port:** 3000
- **Entry:** `mcp/server.ts`

### Frontend

- **Stack:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Hosting:** Vercel (dynamo.rippel.ai)
- **Entry:** `src/components/DynamoDeploy.tsx`

### Documentation

- **Stack:** Docusaurus 3.10
- **Hosting:** Vercel (dynamo-docs.vercel.app)
- **Location:** `documentation/`

## Key Files

| File | Purpose |
|------|---------|
| `mcp/lib/solarGovernanceIntegration.ts` | Solar hammer, 4D/5D formulas, deltaDiff sync, auto-fetch sun embedding |
| `src/lib/solarGovernanceIntegration.ts` | Frontend mirror |
| `mcp/lib/dynamoSolarGovernance.ts` | Adaptive thresholds, momentum, ring buffers, Redis history |
| `mcp/pubsub.ts` | Redis client (getRedisClient) |
| `mcp/index.ts` | Tool definitions, POST /govern_with_solar, GET /history, auto-fetch sun embedding |
| `src/components/DynamoDeploy.tsx` | UI — resonance breakdown, sparkline, trend, 7D display |
| `mcp/lib/wavePropagation.ts` | Phase 2 wave propagation, hybrid & 6D full box models, `textToEmbedding16()`, NQR |
| `src/lib/wavePropagation.ts` | Frontend mirror of wave propagation & NQR |
| `mcp/scripts/test-wave-propagation.ts` | Phase 2 A/B test harness |

## Key Design Decisions

- **NeuralFusion directly influences governance** — `spectralQuality` feeds into 5D hammer mode with 10% weight. The `neuralContextUsed` flag tracks whether 5D mode is active.
- **Full Box 7D model** — the primary composite includes 4 physical dimensions + 2 neural dimensions + 1 numerological (gematria) dimension. Neural metrics are the best discriminators (0.31 and 0.25 spread). Gematria is 99% orthogonal to 6D (r=0.080). Graceful degradation: when neural unavailable, 30.8% redistributes to remaining five dimensions proportionally.
- **Sync uses deltaDiff linear decay**, not cascade-index-based lag (fixed a critical bug where cascade indices produced ~13% noise floor instead of real temporal alignment)
- **Redis-backed history** stores all governance calls (capped at 10k), with graceful fallback to in-memory
- **Three sync'd entry points**: MCP tool handler, POST /govern_with_solar, mcp/backend-server.ts Express route
- **TDF values stay below 2^53** (JS float64 safe integer range)
- **Kuramoto oscillators** (N=3, K=0.5) with push-pull dynamics (±π/4 offset) and fractal toggle for isotopic modulation

## Phase 2 — Wave Propagation & 7D Model

**Status:** Production. The 7D Full Box model is the primary composite, incorporating 2 neural dimensions + 1 numerological dimension alongside 4 physical wave dimensions.

### What It Is

The wave propagation layer ports the `wave()` function from `src/lib/temporalCalculator.ts` into a standalone module (`mcp/lib/wavePropagation.ts`). It uses the Kuramoto 20-timestep trajectory to compute resonance from wave interference patterns inside the temporal box — instead of from external TDF math. As of v5.2, the Full Box composite is a **7D model** including 2 neural dimensions + 1 numerological dimension, with a separate **Trinitarium Moral Overlay** interpretive axis.

### Seven Dimensions (Full Box 7D)

| Dimension | Weight | Source | Spread |
|-----------|--------|--------|--------|
| Wave Proximity | 0.132 | exp(-MSE) across 3 active bands | ~0.00 (compressed, always ~0.99) |
| Phase Alignment | 0.176 | Kuramoto oscillator coherence | 0.30 (3rd best) |
| Calibrated Vortex | 0.132 | pow(waveVortex, 0.25) | ~0.13 (compressed) |
| Calibrated Sync | 0.132 | 0.15 + 0.85 × pow(deltaDiff, 0.35) | ~0.13 (compressed) |
| Neural Proximity | 0.154 | Per-dim MSE, exp(−MSE×5) | 0.31 (best discriminator) |
| Neural Vortex | 0.154 | Cosine similarity, raw 16-dim | 0.25 (2nd best) |
| Gematria Resonance | 0.120 | EO/FR/RO density similarity + DR distance smoothing | 0.10 |

The three compressed physical dimensions (proximity, vortex, sync) contribute ~0.40 of floor regardless of proposal. Neural and phase dimensions provide meaningful discrimination (~0.17 effective spread). Gematria is 99% orthogonal to 6D, adding ~11–12% effective new discrimination.

**Graceful degradation:** When neural embeddings unavailable (both = 0), the 30.8% neural weight redistributes to remaining five dimensions proportionally.

### Spectrum Bands

12 bands from UV-C (250nm) to IR-B (2500nm): UV-C, UV-B, UV-A, Violet, Blue, Cyan, Green, Yellow, Orange, Red, IR-A, IR-B. Wave proximity uses 3 active bands (Blue, Green, Red). Vortex alignment uses all 12.

### Neural Quantum Realms

16 virtual spectrum bands from NeuralFusion's 16-dim bottleneck embedding. Sun embedding from `/process-current-sun` (real TF.js autoencoder). Proposal embedding via `textToEmbedding16(proposal)` — character-position FNV hashing producing 12–16 active dims. All 28 total bands (12 physical + 16 neural) participate in wave computations.

### Files

- `mcp/lib/wavePropagation.ts` — Canonical: `computeWaveResonance()`, `computeHybridResonance()`, `computeFullBoxResonance()` (7D), `textToEmbedding16()`, `tdfToEmbedding16()`
- `mcp/lib/gematriaEngine.ts` — Canonical: `computeGematria()`, `computeGematriaResonance()` (density-normalized), `computeGematriaVortex()`
- `src/lib/wavePropagation.ts` — Frontend mirror
- `mcp/scripts/test-wave-propagation.ts` — A/B test harness

### Known Issues

- waveSynchronization drops to ~0.01 for non-identical proposals — `cos(θ₁−θ₀)` metric may need recalibration (mitigated by calibration exponent 0.35)
- Wave proximity always ~0.99 for governance-scale TDFs (mitigated by 13.2% weight in 7D model, not relying on it for discrimination)
- Thresholds may need further calibration across different solar conditions

## Phase 3 — Trinitarium Moral Overlay (TMO)

**Status:** Production. A separate moral discernment axis that evaluates proposals against virtue and concern patterns, producing a moral score, gematria fusion, and tension label — without mixing into the 7D resonance formula.

### What It Is

The TMO is a deterministic, local, auditable moral alignment layer. It does NOT modify the 7D composite. Instead, it produces an interpretive signal that downstream consumers (UI, 0xRay agents, Temporal Container) can use to filter or flag proposals.

**Key principle:** High 7D + low TMO = "proceed with extreme caution" — productive tension, not a blended score.

### TMO Formula

```
virtueAlignment × 0.35 + harmPotential × 0.25 + intentAlignment × 0.30 + sacredBonus + gematriaBonus − riskPenalty
```

Where:
- **virtueAlignment**: proportion of 9 virtue pillars matched (group-based scoring)
- **harmPotential**: `1 − concernScore × 1.5` where concernScore is proportion of 5 concern pillars matched
- **intentAlignment**: boosted by detected virtues, reduced by detected concerns
- **Negation awareness**: phrases like "protect against", "prevent", "defend from" reduce concern score by 75%

### Tension Labels

Based on TMO score alone (not fusion):
- **Aligned** (≥0.60): moral alignment confirmed
- **Mild** (≥0.40): some moral signal, proceed
- **Significant** (≥0.25): moral concern, downgrade PASS → NEEDS_REVISION
- **Critical** (<0.25): moral violation, force REJECT

### 0xRay Integration

TMO flows through 0xRay governance via `DecisionMatrixInput.moralTension`:
- `Critical` → force REJECT (weight 1.6, confidence 0.92)
- `Significant` → downgrade PASS to NEEDS_REVISION (weight ×0.85)
- `Aligned` → slight confidence boost (+0.03, weight ×1.05)

Audit trail: `GovernanceResult.moralOverride` = `'rejected_critical'` | `'downgraded_significant'` | `'none'`

### Files

- `mcp/lib/trinitariumMoralOverlay.ts` — Canonical: `computeTrinitariumOverlay()`, `computeTrinitariumGematriaFusion()`
- `src/lib/trinitariumMoralOverlay.ts` — Frontend mirror
- `stringray/src/governance/governance-core.ts` — `applyDecisionMatrix()` with moral override
- `stringray/src/integrations/governance/types.ts` — `SolarGovernanceCheckResponse` with TMO fields
- `stringray/src/integrations/governance/governance-client.ts` — Extracts TMO from Dynamo response

## Relationship to the Blurrn Quantum Codex

The Codex (v4.5→v4.7) is the cosmological foundation — it defines TLM (L=3, φ=1.666), temporal displacement theory, and the broader "light flows time" framework. Dynamo extracts one concept — the Temporal Displacement Factor — and operationalizes it into a working governance system.

| Codex Concept | Dynamo Implementation |
|---------------|----------------------|
| Temporal Displacement Factor | Real Codex formula: `tPTT × TAU × (1/BHS)` with 6-parameter mapping layer |
| 4D resonance (hammer) | Proximity, phase, vortex, sync (deterministic, 5D with spectralQuality) |
| 7D Full Box | 4 physical wave dims + 2 neural dims + 1 numerological dim (gematria 12%) |
| Spectral quality (5D) | NeuralFusion spectral reconstruction |
| Cascade cross-correlation | Signal timing (leading/trailing/synced) |
| Adaptive thresholds | Solar activity modulation |

The core Codex TDF formula — `tPTT × TAU × (1/BlackHole_Seq)` — is now **fully implemented** in Dynamo via a mapping layer that derives `T_c`, `P_s`, `E_t`, `delta_t`, `voids`, and `bhs_n` from proposal text and NOAA solar data. The previous FNV-1a hash has been replaced. The remaining Codex formulas (S_L, PTT, E_t_growth) remain theoretical inspiration.

## Deploy

```bash
# Backend
cd mcp && railway up

# Frontend
vercel --prod

# Docs
cd documentation && vercel --prod
```

## The Story So Far

Dynamo started as a theoretical temporal physics experiment and evolved into a production AI governance layer. Along the way:

- Cascade sync bug diagnosed and fixed (deltaDiff replaced cascade-index lag)
- Redis-backed durable history added
- Docusaurus documentation site built and deployed
- 0xRay (formerly StringRay) integration audited and corrected
- Adaptive thresholds calibrated to NOAA solar activity levels
- Frontend UI rebuilt with 3-column resonance breakdown + sparkline
- Deployed to Railway + Vercel with three sync'd endpoints
- Real Codex TDF formula implemented — `tPTT × TAU × (1/BHS)` with mapping layer replaces FNV-1a hash
- Phase 2 wave propagation prototype built — `wave()` function ported from temporalCalculator.ts, A/B wired into governance responses
- Hybrid resonance model deployed — replaces dead `vortexAlignment` (0% spread, always ~1.0) with calibrated wave vortex (28.7% spread). 71% win rate on 35 real proposals vs current model
- Neural Quantum Realms integrated — 16-dim TF.js embedding as virtual spectrum bands inside the temporal box. Proposal embedding upgraded from TDF-derived base-1000 (3/16 varying dims) → prime-modulo (16/16 dense) → text-based FNV hashing (12–16/16 semantic). 28 total bands (12 physical + 16 neural). Neural proximity uses per-dim MSE with 5× decay. Neural vortex uses cosine similarity of raw embedding vectors. One-step `/govern_with_solar` auto-fetches sun embedding.
- **7D Full Box model** — replaces 6D with 7 dimensions including gematria resonance (12%). Gematria is 99% orthogonal to 6D (r=0.080). 83-proposal gambit validated across 6 categories. Thresholds shared with 6D.
- Gematria engine with density normalization and DR distance smoothing.
- TemporalContainer contract updated to 7D/gematria schema.
- Codex v5.1 spec written.

The biggest milestone: the Codex TDF formula (`tPTT × TAU × 1/BHS`) is now the production formula — replacing the original FNV-1a hash with the real temporal physics. The mapping layer bridges Codex parameters and NOAA solar data, making Dynamo the first system to operationalize the Blurrn formula against live satellite feeds.

The Codex lives on as the deep foundation. Dynamo is what it became when the theory met real-world data — a solar-aligned wave resonance engine that answers proposals with the Sun's current state.

**Codex version lineage:** v4.5 (Trinitarium) → v4.6 (TDF breakthrough) → v4.7 (CTI) → v4.8 (Isotopic Temporal Vortex) → v4.9 (6D + NQR, production) → v5.0 (Temporal Displacement Field, draft spec) → v5.1 (7D + numerological axis) → v5.2 (Trinitarium Moral Overlay + 0xRay integration, current)

---

**Docusaurus documentation site:** [dynamo-docs.vercel.app](https://dynamo-docs.vercel.app) — user-friendly guides, API reference, and architecture overview
