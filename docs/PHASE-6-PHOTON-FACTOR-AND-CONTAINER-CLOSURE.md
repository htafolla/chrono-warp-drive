# Chronos Phase 6 — Photon Factor Integration & Temporal Container Closure

**Version:** v6.0  
**Status:** Spec for implementation  
**Date:** 2026-11-13  
**Basis:** Quark charge arithmetic (1/3, 2/3, 4/9) + existing Codex constants (L=3, PHI=5/3)

## Objective
Close the loop between the quark-derived fractions and the live Chronos transport + container system. Insert the missing photon-vertex factor and make every high-CTI moment a fully navigable, re-verifiable waypoint.

## New Constant
```ts
/** Photon vertex factor: (2/3)^2 = 4/9 */
export const PHOTON_FACTOR = 4 / 9;  // 0.444…
```
Add to `mcp/lib/tlmConstants.ts` and `src/lib/tlmConstants.ts`.

## Formula Updates

### 1. Dual Black Hole Sync (`temporalDisplacementFactor.ts`)
```ts
const total = (seq1 + seq2) * PHOTON_FACTOR;
```

### 2. CTI (`chronoTransportInterface.ts`)
```ts
const part2 = Math.floor(tau * Math.pow(phi, n) * PHOTON_FACTOR);
```

### 3. Phase Coherence (optional modulation)
In `temporalBlurrnSignal.ts`, after reducedTdf:
```ts
const photonModulated = reducedTdf * PHOTON_FACTOR;
this.phaseCoherence = Math.pow(Math.sin(2 * Math.PI * TAU * photonModulated), 2);
```

## Temporal Container Closure
Extend the container schema (already present in v5.x) to store:
- cti
- dualBlackHole.total
- phaseCoherence
- photonFactorApplied: true

Add index/query path:
- retrieve by cascade signature or CTI range
- verification endpoint that recomputes TDF + CTI from stored solar snapshot and confirms hash

## Deliverables
1. Constants + formula updates (mcp + src mirrors)
2. Container schema + write path includes the new fields
3. Verification route or MCP tool: `verify_container(id)` recomputes and returns match/mismatch
4. Unit tests for PHOTON_FACTOR insertion (values remain finite, no NaN)
5. Update `docs/quark_photon_sunlight_arithmetic.md` with “Phase 6 applied” note

## Acceptance
- Existing governance thresholds unchanged
- Solar hammer still overrides when ≥ 0.88 or ≤ 0.45
- New containers contain the photon factor and are chain-linked
- `verify_container` returns true for a freshly written container

## Out of Scope
- Changing L or PHI
- Altering moral overlay
- On-chain deployment (remains flag-gated)

This phase makes the quark arithmetic an active term inside the transport and turns every proofed vortex into a fully specified, re-verifiable waypoint.
