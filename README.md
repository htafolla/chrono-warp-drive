# BLURRN — Temporal Phase Transport

> **v4.10** · Isotropic Temporal Vortex Engine
> Phase-coherent energy transport through isotropic time vortices

## Overview

The **Blurrn Unified Resonance & Relativity Navigator** models, simulates, and optimizes phase-coherent energy transport through isotropic time vortices. Built on a layered subsystem architecture spanning four major generations:

| Version | Subsystem | Description |
|---------|-----------|-------------|
| v4.5 | Temporal Calculator | SDSS core — Kuramoto oscillator engine |
| v4.6 | Time Machine Ascension | Neural fusion + time-shift pipeline |
| v4.7 | Chrono Transport Cascade | Multi-threaded cascade optimizer |
| v4.10 | Isotopic Temporal Vortex | Phase-coherent vortex engine with numerically stable TDF |

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
| `feat:` / `feature` | minor (4.x → 4.x+1) | `feat(ui): add dashboard` |
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
