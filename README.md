# BLURRN — Temporal Phase Transport

> **v4.8** · Isotopic Temporal Vortex Engine
> Signals as isotopes of truth — phase-coherent energy transport through isotropic time vortices

## Overview

The **Blurrn Unified Resonance & Relativity Navigator** models, simulates, and optimizes phase-coherent energy transport through isotropic time vortices. Built on a layered subsystem architecture evolving across five major generations:

| Version | Subsystem | Description |
|---------|-----------|-------------|
| v4.5 | Temporal Calculator | SDSS core — Kuramoto oscillator engine |
| v4.6 | Time Machine Ascension | Neural fusion + time-shift pipeline |
| v4.7 | Chrono Transport Cascade | Multi-threaded cascade optimizer |
| v4.8 | **Isotopic Temporal Vortex** | Signals as isotopes of truth — symbiotic cross-correlation, W×M=V vortex volume, phase-coherent TDF |

> **Build v0.3.1** is the current CI release. App version only bumps on actual feature work (use `--app-minor` / `--app-major`).

## Documentation

**Current system:** [DYNAMO-CURRENT-STATE.md](docs/DYNAMO-CURRENT-STATE.md) — what Dynamo actually is today.

**Blurrn Quantum Codex:** The [versioned specifications](docs/blurrn-codex/) of the theoretical temporal physics framework that Dynamo implements — TLM, TDF, isotopic vortex mechanics, Kuramoto phase coupling, and Neural Quantum Realms.

## Quick Start

```sh
npm ci
npm run dev        # dev server with hot reload
npm run typecheck  # TypeScript type checking
npm test           # vitest (7 tests)
npm run build      # production build
```

## CI/CD

GitHub Actions runs on every push to `main`:

1. **lint** — ESLint (continue-on-error, ~114 pre-existing warnings)
2. **typecheck** — `tsc --noEmit`
3. **test** — `vitest run` (7 tests)
4. **build** — `vite build`
5. **deploy** (main only) — bumps version, tags, pushes `[skip ci]`

### Version Bumps

| Commit type | Bump | Example |
|-------------|------|---------|
| `feat:` (touching `src/`) | app minor (4.8 → 4.9) | Requires `--app-minor` flag |
| `fix:` | patch (0.0.x → 0.0.x+1) | `fix: correct TDF overflow` |
| `breaking` / `!:` | major | `feat!: redesign engine` |

## Project Structure

```
src/
├── lib/               # Core engine (temporal calculators, vortex, version)
├── components/        # React components (ui/, panels, visualizers)
├── pages/             # Route pages (Index, About, NotFound)
├── types/             # TypeScript type definitions
├── hooks/             # Custom React hooks
├── __tests__/         # Test setup
bin/version-manager.mjs  # Auto-bump on deploy
.github/workflows/ci.yml # CI/CD pipeline
```

## Tech Stack

- **Runtime**: React 18 + Vite
- **Language**: TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Testing**: Vitest + jsdom
- **CI/CD**: GitHub Actions

## Deployed

[https://chrono-warp-drive.lovable.app](https://chrono-warp-drive.lovable.app)
