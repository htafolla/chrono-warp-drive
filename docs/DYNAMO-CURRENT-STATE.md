# Dynamo — Current State

**Date:** 2026-05-28
**Version:** v1.0 (solar governance production)
**Origin:** Derived from the [Blurrn Quantum Codex](docs/legacy/) temporal physics framework

## What Dynamo Is

Dynamo is a solar-aligned AI governance system. It evaluates proposals by measuring their resonance against the Sun's current electromagnetic and particle environment — using live data from NOAA GOES satellites. It is a deterministic, auditable governance hammer that produces PASS / NEEDS_REVISION / REJECT verdicts.

It is **not** a theoretical cosmology engine. It is a production system deployed at:

- **API:** `https://mcp-production-80e2.up.railway.app`
- **Frontend:** `https://dynamo.rippel.ai`
- **Docs:** `https://dynamo-docs.vercel.app`

## How It Works

```
proposal → FNV-1a hash (TDF) → cross-correlate with sun TDF → 4D resonance formula → adaptive thresholds → verdict
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

## Key Design Decisions

- **NeuralFusion directly influences governance** — its `spectralQuality` output feeds into the 5D resonance formula with 10% weight (`structuralResonance = proximity×0.18 + phase×0.18 + vortex×0.27 + sync×0.27 + spectralQuality×0.10`). The `neuralContextUsed` flag tracks whether 5D mode is active. It is a TensorFlow.js autoencoder that reconstructs NOAA spectrum data; low reconstruction error = model recognizes this solar state = higher spectral quality.
- **Sync uses deltaDiff linear decay**, not cascade-index-based lag (fixed a critical bug where cascade indices produced ~13% noise floor instead of real temporal alignment)
- **Redis-backed history** stores all governance calls (capped at 10k), with graceful fallback to in-memory
- **Three sync'd entry points**: MCP tool handler, POST /govern_with_solar, mcp/backend-server.ts Express route
- **TDF values stay below 2^53** (JS float64 safe integer range)
- **Kuramoto oscillators** (N=3, K=0.5) with push-pull dynamics (±π/4 offset) and fractal toggle for isotopic modulation

## Relationship to the Blurrn Quantum Codex

The Codex (v4.5→v4.7) is the cosmological foundation — it defines TLM (L=3, φ=1.666), temporal displacement theory, and the broader "light flows time" framework. Dynamo extracts one concept — the Temporal Displacement Factor — and operationalizes it into a working governance system.

| Codex Concept | Dynamo Implementation |
|---------------|----------------------|
| Temporal Displacement Factor | FNV-1a hash × solar timestamp mod 2^53 |
| 4D resonance | Proximity, phase, vortex, sync (deterministic) |
| Spectral quality (5D) | NeuralFusion spectral reconstruction |
| Cascade cross-correlation | Signal timing (leading/trailing/synced) |
| Adaptive thresholds | Solar activity modulation |

The Codex formulas (S_L, PTT, tPTT, BlackHole_Seq, E_t_growth) are **not implemented** in Dynamo. They are the deep theoretical well from which the TDF concept was drawn.

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
- StringRay integration audited and corrected
- Adaptive thresholds calibrated to NOAA solar activity levels
- Frontend UI rebuilt with 3-column resonance breakdown + sparkline
- Deployed to Railway + Vercel with three sync'd endpoints

The Codex lives on as the deep foundation. Dynamo is what it became when the theory met real-world data — a solar hammer that answers proposals with the Sun's current state.

---

**Docusaurus documentation site:** [dynamo-docs.vercel.app](https://dynamo-docs.vercel.app) — user-friendly guides, API reference, and architecture overview
