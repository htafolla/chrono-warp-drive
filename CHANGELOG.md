# Changelog

## v5.1 (2026-06-03) — 7D Full Box: Numerological Axis

### Added
- **7D Full Box model**: Four orthogonal resonance axes — physical, temporal, neural, numerological
- **Gematria engine** (`mcp/lib/gematriaEngine.ts`, `src/lib/gematriaEngine.ts`): English Ordinal, Full Reduction, Reverse Ordinal, digital roots, per-letter density normalization
- **Numerological resonance** as 7th dimension (12% weight) in Full Box composite
- **`fullBox7DComposite`, `fullBox7DVerdict`, `fullBoxGematriaResonance`** in all governance responses
- **TemporalContainer contract**: `ResonanceProfile` updated to 7D schema with gematria fields

### Changed
- Gematria DR bonus: binary match → distance-based smoothing (`0.10 × (1 − |drDiff| / 9)`)
- 83-proposal gambit validated across 6 categories: sacred, technical, poetic, neutral, short words, complex phrases
- All source code comments: "symbolic" → "numerological"

### Fixed
- Gematria resonance: raw sum → per-letter density comparison (short vs long text now fair)
- `StructuralResonanceResult` interface: 7D fields added for type safety
- Backend `dynamoSolarGovernance.ts` pass-through: missing 7D fields added

### Technical
- 12% gematria weight: 99% orthogonal to 6D, mean shift +0.08pp, verdict flips: 1 up / 1 down
- DR2 over-boost eliminated: mean gematria for DR2 proposals dropped from 0.923 → 0.85 range
- Pure numeric proposals correctly penalized: "42" gematria at floor 0.355
