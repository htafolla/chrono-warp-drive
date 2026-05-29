# Dynamo — Current State

**Date:** 2026-05-28
**Version:** v1.0 (solar governance production)
**Origin:** Derived from the [Blurrn Quantum Codex](legacy/) temporal physics framework

## What Dynamo Is

Dynamo is a solar-aligned AI governance system. It evaluates proposals by measuring their resonance against the Sun's current electromagnetic and particle environment — using live data from NOAA GOES satellites. It is a deterministic, auditable governance hammer that produces PASS / NEEDS_REVISION / REJECT verdicts.

It is **not** a theoretical cosmology engine. It is a production system deployed at:

- **API:** `https://mcp-production-80e2.up.railway.app`
- **Frontend:** `https://dynamo.rippel.ai`
- **Docs:** `https://dynamo-docs.vercel.app`

## How It Works

```
proposal → Codex TDF formula (tPTT × TAU × 1/BHS) → cross-correlate with sun TDF → 4D resonance formula → adaptive thresholds → verdict
```

### The Four Dimensions

| Dimension | Weight | Formula |
|-----------|--------|---------|
| Proximity | 0.20 | exp(-deltaDiff² / 1e12) — Gaussian |
| Phase Alignment | 0.20 | 1 - \|proposalCoherence - sunCoherence\| |
| Vortex Alignment | 0.30 | max(0.15, 1 - logRatio / logMax) — log-space |
| Synchronization | 0.30 | max(0.15, 1 - deltaDiff / 1e6) — linear decay |

When NeuralFusion spectral quality is available (5D mode), weights rebalance to 0.18/0.18/0.27/0.27/0.10.

### Adaptive Thresholds

Thresholds shift by solar activity level (quiet/moderate/active/storm) — storms require higher resonance to pass.

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
| `mcp/lib/solarGovernanceIntegration.ts` | Solar hammer, 4D/5D formulas, deltaDiff sync |
| `src/lib/solarGovernanceIntegration.ts` | Frontend mirror |
| `mcp/lib/dynamoSolarGovernance.ts` | Adaptive thresholds, momentum, ring buffers, Redis history |
| `mcp/pubsub.ts` | Redis client (getRedisClient) |
| `mcp/index.ts` | Tool definitions, POST /govern_with_solar, GET /history |
| `src/components/DynamoDeploy.tsx` | UI — resonance breakdown, sparkline, trend |
| `mcp/lib/wavePropagation.ts` | Phase 2 wave propagation layer (A/B alongside TDF formulas) |
| `src/lib/wavePropagation.ts` | Frontend mirror |
| `mcp/scripts/test-wave-propagation.ts` | Phase 2 A/B test harness |

## Key Design Decisions

- **NeuralFusion directly influences governance** — its `spectralQuality` output feeds into the 5D resonance formula with 10% weight (`structuralResonance = proximity×0.18 + phase×0.18 + vortex×0.27 + sync×0.27 + spectralQuality×0.10`). The `neuralContextUsed` flag tracks whether 5D mode is active. It is a TensorFlow.js autoencoder that reconstructs NOAA spectrum data; low reconstruction error = model recognizes this solar state = higher spectral quality.
- **Sync uses deltaDiff linear decay**, not cascade-index-based lag (fixed a critical bug where cascade indices produced ~13% noise floor instead of real temporal alignment)
- **Redis-backed history** stores all governance calls (capped at 10k), with graceful fallback to in-memory
- **Three sync'd entry points**: MCP tool handler, POST /govern_with_solar, mcp/backend-server.ts Express route
- **TDF values stay below 2^53** (JS float64 safe integer range)
- **Kuramoto oscillators** (N=3, K=0.5) with push-pull dynamics (±π/4 offset) and fractal toggle for isotopic modulation

## Phase 2 — Wave Propagation Prototype

**Status:** Prototype complete. Wired as A/B alongside current TDF formulas. Not replacing anything yet.

### What It Is

The wave propagation layer ports the `wave()` function from `src/lib/temporalCalculator.ts` into a standalone module (`mcp/lib/wavePropagation.ts`). It uses the Kuramoto 20-timestep trajectory to compute resonance from wave interference patterns inside the temporal box — instead of from external TDF math.

### Three Wave Dimensions

| Dimension | Method | Spread vs Current |
|-----------|--------|-------------------|
| `waveProximity` | exp(-MSE(wave_θ₀ − wave_θ₁)) across 3 active bands | **2.0× wider** (0.249 vs 0.125) |
| `waveVortexAlignment` | Pearson correlation of C-12(θ₀) vs C-14(θ₁) across all 12 bands | **∞** (current = 0.000 spread, always 1.0) |
| `waveSynchronization` | Mean cos(θ₁−θ₀) over full trajectory | **2.5× wider** (0.928 vs 0.365) |

### Key Finding

The current `vortexAlignment` formula produces **1.0 for ALL proposals** — zero discrimination. The wave model produces real variance on all three dimensions. This is the strongest argument for eventually replacing the current TDF formulas with wave-based computation.

### Spectrum Bands

12 bands from UV-C (250nm) to IR-B (2500nm): UV-C, UV-B, UV-A, Violet, Blue, Cyan, Green, Yellow, Orange, Red, IR-A, IR-B. Wave proximity uses 3 active bands (Blue, Green, Red). Vortex alignment uses all 12.

### Files

- `mcp/lib/wavePropagation.ts` — Canonical implementation
- `src/lib/wavePropagation.ts` — Frontend mirror
- `mcp/scripts/test-wave-propagation.ts` — A/B test harness

### Known Issues

- waveSynchronization drops to ~0.01 for non-identical proposals — `cos(θ₁−θ₀)` metric may need recalibration
- Wave scores can't use current thresholds (0.72/0.78/0.88) — need their own calibration pass
- The 528 Hz temporal modulation in the wave function dominates over spatial phase differences, making raw amplitude correlation unstable

## Relationship to the Blurrn Quantum Codex

The Codex (v4.5→v4.7) is the cosmological foundation — it defines TLM (L=3, φ=1.666), temporal displacement theory, and the broader "light flows time" framework. Dynamo extracts one concept — the Temporal Displacement Factor — and operationalizes it into a working governance system.

| Codex Concept | Dynamo Implementation |
|---------------|----------------------|
| Temporal Displacement Factor | Real Codex formula: `tPTT × TAU × (1/BHS)` with 6-parameter mapping layer |
| 4D resonance | Proximity, phase, vortex, sync (deterministic) |
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

The biggest milestone: the Codex TDF formula (`tPTT × TAU × 1/BHS`) is now the production formula — replacing the original FNV-1a hash with the real temporal physics. The mapping layer bridges Codex parameters and NOAA solar data, making Dynamo the first system to operationalize the Blurrn formula against live satellite feeds.

The Codex lives on as the deep foundation. Dynamo is what it became when the theory met real-world data — a solar hammer that answers proposals with the Sun's current state.

---

**Docusaurus documentation site:** [dynamo-docs.vercel.app](https://dynamo-docs.vercel.app) — user-friendly guides, API reference, and architecture overview
