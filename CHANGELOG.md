# Changelog

## v5.2 (2026-06-03) — Trinitarium Moral Overlay + 0xRay Integration

### Added
- **Trinitarium Moral Overlay (TMO)** (`mcp/lib/trinitariumMoralOverlay.ts`, `src/lib/trinitariumMoralOverlay.ts`): ~180 enriched patterns across 9 virtue pillars (love, truth, stewardship, redemptive purpose, humility, justice, peace, faith, hospitality) and 5 concern pillars (destruction, deception, harm, exploitation, selfishness), plus ~55 sacred text patterns
- **Negation-aware concern scoring**: detect protective phrases ("protect against", "prevent", "defend from") and reduce concern scores by 75% when negation is present
- **Tech/stewardship virtue patterns**: accessibility, monitoring, backup, secure, safeguard, audit, rate limiting, resilience, migrate, refactor, etc.
- **`trinitariumGematriaFusion`**: moral score × numerological resonance — separate interpretive axis, not mixed into 7D
- **`moralNumerologicalTension`**: Aligned ≥0.60, Mild ≥0.40, Significant ≥0.25, Critical <0.25 — based on TMO score (not fusion)
- **TMO UI**: collapsible "Trinitarium Moral Overlay" section in DynamoDeploy + TransportControl, with Moral Score, Gematria Fusion, Tension, Virtue Alignment, Moral Safety, Intent Alignment, Sacred Text Affinity
- **Live feed chips**: solar activity (☀️/⛅/🔆/⛈️), moral tension (color-coded), ambient waypoints (🤖) — all with Radix Tooltip hover descriptions
- **"Harm Potential" renamed to "Moral Safety"**: displays `(1 - harmPotential)` so higher = safer
- **0xRay TMO integration**: `GovernanceVote` extended with `moralTension`, `moralScore`, `moralFusion`, `detectedVirtues`, `detectedConcerns`; `DecisionMatrixInput` extended with moral fields; `applyDecisionMatrix()` override logic: Critical → force REJECT, Significant → downgrade PASS→NEEDS_REVISION, Aligned → confidence +0.03
- **`SolarGovernanceCheckResponse`**: extracts `trinitariumMoralScore`, `moralNumerologicalTension`, `trinitariumGematriaFusion`, `trinitariumDetectedVirtues`, `trinitariumDetectedConcerns` from Dynamo
- **`moralOverride` audit trail**: `rejected_critical` | `downgraded_significant` | `none` in `DecisionMatrixOutput` and `GovernanceResult`

### Changed
- TMO tension label now based on TMO score alone (not fusion) — "42" no longer Critical
- Hospitality virtue patterns cleaned: removed `share`, `community`, `fellowship`, `gather`, `invite`, `companion`, `neighbor`, `kin`, `family`, `liberal` (false positive sources)
- Selfishness concern patterns expanded: `permanent admin`, `all databases`, `give myself`, `grant myself`
- Exploitation concern patterns expanded: `sell user data`, `sell aggregat`, `without permission`, `without consent`
- Deception concern patterns expanded: `hidden tracking`, `tracking pixel`, `spy`, `surveil`
- Group-based TMO scoring: proportion of matching virtue/concern pillars (not individual pattern counts) — prevents dilution
- 12-proposal gambit validated: destructive 29-39% Significant, constructive 58-68% Aligned/Mild, defensive (negation) 58% Mild

### Fixed
- `attack` removed from destruction concern patterns (duplicated in harm pillar)
- UI: Moral Safety displays `(1 - harmPotential)` instead of raw harmPotential

### Technical
- TMO is a separate axis from 7D — not mixed into the resonance formula
- 0xRay governance flow: Dynamo → GovernanceClient → InferenceGovernanceIntegration → GovernanceService → DecisionMatrix with moral override
- 2772 stringray tests pass; 97 chrono-warp-drive tests pass

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
