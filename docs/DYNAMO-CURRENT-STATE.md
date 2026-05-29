# Dynamo — Current State

**Date:** 2026-05-29
**Version:** v4.9 (6D temporal box with neural dimensions)
**Origin:** Derived from the [Blurrn Quantum Codex](legacy/) temporal physics framework

## What Dynamo Is

Dynamo is a solar-aligned wave resonance engine — a physical measurement apparatus that takes two signals (a proposal and the current sun), projects them through a 28-band temporal box (12 physical EM bands + 16 neural virtual bands), and measures their multi-dimensional structural alignment in real time. It produces deterministic, auditable PASS / NEEDS_REVISION / REJECT verdicts.

It is **not** a theoretical cosmology engine. It is a production system deployed at:

- **API:** `https://mcp-production-80e2.up.railway.app`
- **Frontend:** `https://dynamo.rippel.ai`
- **Docs:** `https://dynamo-docs.vercel.app`

## How It Works

```
proposal → Codex TDF formula (tPTT × TAU × 1/BHS) → cross-correlate with sun TDF → 6D resonance formula → adaptive thresholds → verdict
```

### The Six Dimensions (Full Box 6D)

| Dimension | Weight | Method | Spread |
|-----------|--------|--------|--------|
| Wave Proximity | 0.15 | exp(-MSE) across 3 active EM bands | ~0.00 (compressed) |
| Phase Alignment | 0.20 | 1 − |proposalCoherence − sunCoherence| (Kuramoto) | 0.30 |
| Calibrated Vortex | 0.15 | pow(waveVortexAlignment, 0.25) | ~0.13 (compressed) |
| Calibrated Sync | 0.15 | 0.15 + 0.85 × pow(deltaDiff, 0.35) | ~0.13 (compressed) |
| Neural Proximity | 0.175 | Per-dim MSE across 16 neural bands, exp(−MSE×5) | 0.31 |
| Neural Vortex | 0.175 | Cosine similarity of raw 16-dim embeddings | 0.25 |

When neural embeddings are unavailable, the 35% neural weight redistributes to the four physical dimensions (+8.75% each), yielding approximately the original 4D weights.

When NeuralFusion spectral quality is available (5D hammer mode), the structural resonance formula adds a 5th dimension: `proximity×0.18 + phase×0.18 + vortex×0.27 + sync×0.27 + spectralQuality×0.10`.

### Adaptive Thresholds (6D Full Box)

| Activity | PASS | NEEDS_REVISION | REJECT |
|----------|------|----------------|--------|
| Quiet | ≥0.82 | ≥0.72 | ≥0.50 | <0.50 |
| Moderate | ≥0.85 | ≥0.75 | ≥0.52 | <0.52 |
| Active | ≥0.85 | ≥0.75 | ≥0.52 | <0.52 |
| Storm | ≥0.88 | ≥0.80 | ≥0.58 | <0.58 |

Thresholds were lowered from the 4D model (moderate was 0.88) because the 6D model's wider spread means scores distribute lower. The neural dimensions pull scores down for poorly-aligned proposals.

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
| `src/components/DynamoDeploy.tsx` | UI — resonance breakdown, sparkline, trend, 6D display |
| `mcp/lib/wavePropagation.ts` | Phase 2 wave propagation, hybrid & 6D full box models, `textToEmbedding16()`, NQR |
| `src/lib/wavePropagation.ts` | Frontend mirror of wave propagation & NQR |
| `mcp/scripts/test-wave-propagation.ts` | Phase 2 A/B test harness |

## Key Design Decisions

- **NeuralFusion directly influences governance** — `spectralQuality` feeds into 5D hammer mode with 10% weight. The `neuralContextUsed` flag tracks whether 5D mode is active.
- **Full Box 6D model** — the primary composite includes 4 physical dimensions + 2 neural dimensions (neural proximity 17.5% + neural vortex 17.5%). Neural metrics are the best discriminators in the system (0.31 and 0.25 spread vs 0.00–0.30 for physical dims). Graceful degradation: when neural unavailable, 35% redistributes to physical dims (+8.75% each).
- **Sync uses deltaDiff linear decay**, not cascade-index-based lag (fixed a critical bug where cascade indices produced ~13% noise floor instead of real temporal alignment)
- **Redis-backed history** stores all governance calls (capped at 10k), with graceful fallback to in-memory
- **Three sync'd entry points**: MCP tool handler, POST /govern_with_solar, mcp/backend-server.ts Express route
- **TDF values stay below 2^53** (JS float64 safe integer range)
- **Kuramoto oscillators** (N=3, K=0.5) with push-pull dynamics (±π/4 offset) and fractal toggle for isotopic modulation

## Phase 2 — Wave Propagation & 6D Model

**Status:** Production. The 6D Full Box model is the primary composite, incorporating 2 neural dimensions alongside 4 physical wave dimensions.

### What It Is

The wave propagation layer ports the `wave()` function from `src/lib/temporalCalculator.ts` into a standalone module (`mcp/lib/wavePropagation.ts`). It uses the Kuramoto 20-timestep trajectory to compute resonance from wave interference patterns inside the temporal box — instead of from external TDF math. As of v4.9, the Full Box composite is a **6D model** including 2 neural dimensions.

### Six Dimensions (Full Box 6D)

| Dimension | Weight | Source | Spread |
|-----------|--------|--------|--------|
| Wave Proximity | 0.15 | exp(-MSE) across 3 active bands | ~0.00 (compressed, always ~0.99) |
| Phase Alignment | 0.20 | Kuramoto oscillator coherence | 0.30 (3rd best) |
| Calibrated Vortex | 0.15 | pow(waveVortex, 0.25) | ~0.13 (compressed) |
| Calibrated Sync | 0.15 | 0.15 + 0.85 × pow(deltaDiff, 0.35) | ~0.13 (compressed) |
| Neural Proximity | 0.175 | Per-dim MSE, exp(−MSE×5) | 0.31 (best discriminator) |
| Neural Vortex | 0.175 | Cosine similarity, raw 16-dim | 0.25 (2nd best) |

The three compressed physical dimensions (proximity, vortex, sync) contribute ~0.40 of floor regardless of proposal. Neural and phase dimensions provide meaningful discrimination (~0.17 effective spread).

**Graceful degradation:** When neural embeddings unavailable (both = 0), each physical dim receives +8.75% weight, yielding approximately the original 4D distribution.

### Spectrum Bands

12 bands from UV-C (250nm) to IR-B (2500nm): UV-C, UV-B, UV-A, Violet, Blue, Cyan, Green, Yellow, Orange, Red, IR-A, IR-B. Wave proximity uses 3 active bands (Blue, Green, Red). Vortex alignment uses all 12.

### Neural Quantum Realms

16 virtual spectrum bands from NeuralFusion's 16-dim bottleneck embedding. Sun embedding from `/process-current-sun` (real TF.js autoencoder). Proposal embedding via `textToEmbedding16(proposal)` — character-position FNV hashing producing 12–16 active dims. All 28 total bands (12 physical + 16 neural) participate in wave computations.

### Files

- `mcp/lib/wavePropagation.ts` — Canonical: `computeWaveResonance()`, `computeHybridResonance()`, `computeFullBoxResonance()` (6D), `textToEmbedding16()`, `tdfToEmbedding16()`
- `src/lib/wavePropagation.ts` — Frontend mirror
- `mcp/scripts/test-wave-propagation.ts` — A/B test harness

### Known Issues

- waveSynchronization drops to ~0.01 for non-identical proposals — `cos(θ₁−θ₀)` metric may need recalibration (mitigated by calibration exponent 0.35)
- Wave proximity always ~0.99 for governance-scale TDFs (mitigated by 15% weight in 6D model, not relying on it for discrimination)
- Thresholds may need further calibration across different solar conditions

## Relationship to the Blurrn Quantum Codex

The Codex (v4.5→v4.7) is the cosmological foundation — it defines TLM (L=3, φ=1.666), temporal displacement theory, and the broader "light flows time" framework. Dynamo extracts one concept — the Temporal Displacement Factor — and operationalizes it into a working governance system.

| Codex Concept | Dynamo Implementation |
|---------------|----------------------|
| Temporal Displacement Factor | Real Codex formula: `tPTT × TAU × (1/BHS)` with 6-parameter mapping layer |
| 4D resonance (hammer) | Proximity, phase, vortex, sync (deterministic, 5D with spectralQuality) |
| 6D Full Box | 4 physical wave dims + 2 neural dims (proximity 15%, phase 20%, vortex 15%, sync 15%, neuralProx 17.5%, neuralVortex 17.5%) |
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
- **6D Full Box model** — replaces 4D composite with 6 dimensions including neural proximity (17.5%) and neural vortex (17.5%). Neural metrics are the best discriminators: proximity spread 0.31, vortex spread 0.25 vs 0.00–0.30 for physical dims. Graceful degradation when neural unavailable. Thresholds recalibrated: moderate 0.85 (was 0.88).
- Three compressed physical dimensions (proximity ≡ 0.99, calibrated vortex ≈ 0.96, calibrated sync ≈ 0.93) produce ~0.40 predetermined floor. Neural and phase dimensions drive the remaining 0.17 effective spread. Previous 4D model had only 0.03 effective spread.

The biggest milestone: the Codex TDF formula (`tPTT × TAU × 1/BHS`) is now the production formula — replacing the original FNV-1a hash with the real temporal physics. The mapping layer bridges Codex parameters and NOAA solar data, making Dynamo the first system to operationalize the Blurrn formula against live satellite feeds.

The Codex lives on as the deep foundation. Dynamo is what it became when the theory met real-world data — a solar hammer that answers proposals with the Sun's current state.

---

**Docusaurus documentation site:** [dynamo-docs.vercel.app](https://dynamo-docs.vercel.app) — user-friendly guides, API reference, and architecture overview
