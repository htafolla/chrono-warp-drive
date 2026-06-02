# Dynamo — Temporal Resonance Engine

> **v5.0** · Self-authenticating temporal documents grounded in live solar physics
> Every decision or event becomes a living, verifiable temporal record — cryptographically bound to the actual state of the Sun at the moment it occurred.

## Primary Use Case

**To generate self-authenticating temporal documents that bind any input to a verifiable solar moment, creating a new class of data with temporal grounding and cryptographic integrity.**

Traditional systems produce: *"This happened at this time (according to our clock)."*

Dynamo produces: *"This happened at this solar moment, and here is cryptographic proof that the record has not been altered."*

| Derivative Use Case | How It Builds on the Primary |
|---|---|
| Governance | Uses the temporal document to make PASS/NEEDS_REVISION/REJECT decisions |
| Timestamping / Notarization | Uses the solar-grounded timestamp as a public, verifiable clock |
| Decentralized Oracle | Uses the 6D profile + solar snapshot as a real-world entropy source |
| Audit & Compliance | Uses the hash chain and provenance for tamper-proof historical records |
| Legal & Contracts | Uses the self-authenticating record as evidence |
| Insurance & Risk | Uses the solar conditions at decision time for claims validation |
| Pattern Mining | Uses the growing time series of records to discover solar-decision correlations |
| Generative Art | Uses the 6D vector + phase trajectory as a creative seed with temporal provenance |
| Smart Contracts | Uses solar alignment as a real-world gate condition |
| AI Safety | Uses the persistent, verifiable memory for long-term alignment |

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
