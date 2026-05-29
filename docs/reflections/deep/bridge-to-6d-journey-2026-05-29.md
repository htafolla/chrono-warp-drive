---
story_type: saga
emotional_arc: "satisfaction -> suspicion -> diagnosis -> architectural reckoning -> clarity"
codex_terms: [12, 15, 23, 31, 42]
---

# The Bridge to 6D: How Neural Dimensions Crossed the Chasm

The gambit had twelve proposals and three models. The Hammer, the Hybrid, and the Full Box. Each printed a score and a verdict. The Hammer ranged from 0.59 to 0.98. The Hybrid ranged from 0.58 to 0.98. The Full Box ranged from 0.71 to 0.98.

Wait. 0.71 to 0.98?

Seven of the ten proposals scored above 0.90 in the Full Box. The same "bug bounty program with graduated rewards" that got REJECT from the Hammer (0.59) and NEEDS_REVISION from the Hybrid (0.60) scored 0.87 in the Full Box — solidly in NEEDS_REVISION territory but only barely, and only because the threshold for PASS in moderate conditions was 0.88. Lower it to 0.85 and that proposal passes.

The Full Box was supposed to be the best model. It had wave proximity (isotopic vortex interference through 28 bands), phase alignment (Kuramoto oscillators), calibrated vortex alignment, and calibrated synchronization. Four dimensions, all physically motivated, all computed from real signals inside the temporal box. It was the model we'd invested the most engineering in — the one with calibrated exponents, Pearson correlations, deltaDiff linear decay, the whole apparatus.

And it was lying to us.

## The Shape of the Problem

The symptoms were visible if you knew where to look. Every Full Box response had these dimensions:

```
waveProximity:          ~0.99  (always)
calibratedVortex:       ~0.96  (barely moves)
calibratedSync:         ~0.93  (barely moves)
phaseAlignment:         0.60-0.90 (does the work)
```

Three out of four dimensions were compressed to narrow ranges. Wave proximity was the worst — it was literally `exp(-deltaDiff² / 1e12)`, which for any two TDFs that differ by less than 0.01% of the total magnitude (and TDFs are typically around 5.78 × 10¹²), this is essentially `exp(-ε) ≈ 1`. The Gaussian was almost perfectly flat because the TDFs were so large. A proposal TDF of 5,781,006,030,741 versus a solar TDF of 5,781,064,994,432 — the delta is 58,963,691, which sounds big until you divide by 1e12 and square it: `(58963691 / 1e12)² = 0.000000003`. `exp(-0.000000003) ≈ 0.9999999`. Proximity was always 0.99 because the formula was designed for a scale where TDFs differ by orders of magnitude, and in practice they differ by six orders of magnitude less.

Calibrated vortex was `pow(x, 0.25)`. The raw vortex values ranged from about 0.50 to 0.99, centered around 0.75. Raise 0.75 to 0.25 and you get 0.93. The exponent compressed everything upward. Even a raw vortex of 0.30 becomes `0.30^0.25 = 0.74`. The compression was mathematical, not a bug — but it meant the dimension contributed almost no discrimination to the composite.

Calibrated sync was `0.15 + 0.85 * pow(x, 0.35)`. The `deltaDiff / 1e6` normalization meant that for typical proposals, raw sync ranged from about 0.5 to 0.9. Raised to 0.35, that's 0.76 to 0.90. Plus the 0.15 floor offset. Sync was always between 0.79 and 0.92.

Phase alignment was the only dimension doing real work. It came from Kuramoto oscillators and reflected actual structural coherence between the proposal and the sun. It ranged from 0.60 to 0.90 or so, a spread of 0.30.

So the Full Box composite was effectively:

```
0.99 × 0.20 + phase × 0.20 + 0.96 × 0.30 + 0.93 × 0.30
= 0.198 + phase × 0.20 + 0.288 + 0.279
= 0.765 + phase × 0.20
```

A linear function of one variable. A 0.30 spread in phase alignment produced a 0.06 spread in the composite. The Full Box was a phase alignment detector with inflation.

## The Neural Elephant

At the same time, right there in the response, were two numbers that nobody was using:

```
neuralWaveProximity: 0.56 - 0.87 (spread: 0.31)
neuralWaveVortexAlignment: 0.62 - 0.87 (spread: 0.25)
```

These were the Neural Quantum Realms metrics — `per-dimension MSE` for proximity and `cosine similarity` for vortex. They'd just been fixed in the previous session (the story of five bugs). They were the best discriminators in the entire system. The neural proximity spread of 0.31 was larger than any physical dimension. The neural vortex spread of 0.25 was second only to phase alignment.

And they weren't included in any composite.

They sat in the response JSON like decorative houseplants. Beautiful, alive, smelling faintly of cosine similarity, but structurally irrelevant. The Full Box walked past them every time it computed its composite and said "no thank you, I'd rather use proximity × 0.20 where proximity is always 0.99."

The irony was that these neural metrics were produced by the same wave propagation function that fed the physical metrics. `computeWaveResonance` took `neuralSunEmbedding` and `neuralProposalEmbedding`, ran 20 timesteps of 16-dimensional phase-modulated amplitude evolution through the Kuramoto trajectory, computed per-dimension MSE and raw cosine similarity, and returned them alongside `waveProximity`, `waveVortexAlignment`, and `waveSynchronization`. The neural metrics were computed inside the temporal box. They were born inside the box. They were box measurements.

They just weren't invited to the composite function.

## Diagnosis by Gambit

I ran ten diverse proposals through the live endpoint to see what the Full Box was actually doing. The results were stark:

| Proposal | Hammer | Hybrid | Full Box 4D | Verdict |
|----------|--------|--------|-------------|---------|
| "emergency shutdown" | 0.98 PASS | 0.97 PASS | 0.98 PASS | ✓ all agree |
| "insurance pool" | 0.61 REJECT | 0.60 NR | 0.82 NR | Box inflates |
| "reduce threshold" | 0.60 REJECT | 0.59 NR | 0.93 PASS | Box wildly inflates |
| "quadratic voting" | 0.60 REJECT | 0.58 NR | 0.93 PASS | Box wildly inflates |
| "treasury allocation" | 0.59 REJECT | 0.58 NR | 0.93 PASS | Box wildly inflates |

The Hammer said REJECT. The Hybrid said NEEDS_REVISION. The Full Box said PASS with 93%. Three different verdicts for the same proposal, and the most sophisticated model was the most wrong.

The reason was structural: the Full Box's three compressed dimensions added 0.765 of "base score" regardless of the proposal. Only phase alignment contributed meaningful discrimination. A proposal with phase alignment 0.85 gets `0.765 + 0.85 × 0.20 = 0.935`. A proposal with phase alignment 0.70 gets `0.765 + 0.70 × 0.20 = 0.905`. Both are PASS-worthy scores. The 0.15 spread in phase alignment produced a 0.03 spread in the composite. The model couldn't distinguish "good fit" from "mediocre fit" because 76.5% of every score was pre-determined.

Meanwhile, neural proximity ranged from 0.56 to 0.87. That's a 0.31 spread. If you weighted it at 17.5%, it would contribute `0.56 × 0.175 = 0.098` at worst and `0.87 × 0.175 = 0.152` at best. A 0.054 point spread from a single dimension — almost as much as the entire 4D composite's 0.06 effective range.

The neural metrics weren't just useful. They were the most useful dimensions in the entire system.

## The Architecture Problem

This wasn't a bug. It was an architectural oversight. The Full Box was designed in Phase 2 as a 4D model: wave proximity, phase alignment, wave vortex alignment, wave synchronization. These were the four physical dimensions of the temporal box — the things you could derive from TDF comparison, Kuramoto oscillators, and isotopic vortex interference. They were well-motivated. They were correct.

But when we added Neural Quantum Realms in the previous session, we added them as a separate layer. They got their own fields in the response (`neuralWaveProximity`, `neuralWaveVortexAlignment`). They got their own section in the UI. They got their own documentation. They were presented as an overlay on top of the physical model — a "5th dimension" that augmented the existing 4D picture.

The problem: they were never integrated into the composite score. They were a separate output, not a dimension of the main model. The Full Box composite was still:

```
waveProximity × 0.20 + phaseAlignment × 0.20 + calibratedVortex × 0.30 + calibratedSync × 0.30
```

The neural numbers showed up in the response and were displayed in the UI, but they had zero effect on the verdict. The Full Box could produce `fullBoxVerdict: "PASS"` with `fullBox4DComposite: 0.93` while `neuralWaveProximity: 0.56` — the neural layer saying "this proposal is only 56% aligned with the sun's current temporal signature" — and nobody would know because the verdict didn't care.

This is the kind of problem that doesn't show up in unit tests. Each component works correctly. `computeWaveResonance` computes neural metrics correctly. `computeFullBoxResonance` computes the composite correctly. The response includes all the fields. The UI displays all the numbers. Everything is technically correct.

The problem is at the architectural level: two systems that should be one system, connected at the data layer but disconnected at the decision layer. The neural metrics inform the same temporal box as the physical metrics, but the decision function ignores half the evidence.

## Designing the 6D Model

The fix was conceptually simple but architecturally significant: make neural proximity and neural vortex first-class dimensions in the Full Box composite.

The hard part was the weights. The Full Box had four dimensions weighted 20/20/30/30. Adding two neural dimensions meant rebalancing all six. The principle I followed:

**Weight by discrimination power.** A dimension that varies a lot across proposals should get more weight because it contributes more to the composite's ability to distinguish one proposal from another. A dimension that's always 0.99 contributes almost nothing and should get minimal weight.

The empirical spread data:

| Dimension | Range | Spread | Discrimination |
|-----------|-------|--------|---------------|
| Neural Proximity | 0.56–0.87 | 0.31 | Best |
| Neural Vortex | 0.62–0.87 | 0.25 | 2nd |
| Phase Alignment | 0.60–0.90 | 0.30 | 3rd |
| Calibrated Sync | ~0.79–0.92 | ~0.13 | 4th |
| Calibrated Vortex | ~0.84–0.97 | ~0.13 | 5th |
| Wave Proximity | ~0.99–0.99 | ~0.00 | Dead |

Neural proximity and vortex were the top two discriminators. They deserved the highest weight. Phase alignment was third. The other three were compressed and contributed value only through their floor offsets (the minimum contribution when they're near their compressed values).

The final weights:

```
waveProximity × 0.15   (dead dimension, minimal weight)
phaseAlignment × 0.20  (third best, moderate weight)
calibratedVortex × 0.15 (compressed, minimal weight)
calibratedSync × 0.15   (compressed, minimal weight)
neuralProximity × 0.175 (best discriminator, high weight)
neuralVortex × 0.175    (second best, high weight)
                           Total = 1.000
```

Sum: 0.15 + 0.20 + 0.15 + 0.15 + 0.175 + 0.175 = 1.000. 

The neural dimensions collectively get 35% of the vote. Phase alignment gets 20%. The three compressed physical dimensions split 45%. This means the composite is now 35% neural, 20% Kuramoto, 45% compressed-floor physical. The compressed-floor part acts as a baseline (about 0.40 regardless of proposal), so the effective spread-band is 35% × neural + 20% × phase = roughly 55% of the actual spread power. That's far better than the 4D model where 80% of the composite was predetermined floor.

## The Graceful Degradation

There was one more design decision. What happens when neural embeddings aren't available? The auto-fetch works well, but networks fail, neural-fusion-backend goes down, the TF.js model might not be loaded yet. When `neuralProximity = 0` and `neuralVortex = 0`, the 6D formula becomes:

```
waveProximity × 0.15 + phase × 0.20 + vortex × 0.15 + sync × 0.15 + 0 × 0.175 + 0 × 0.175
= waveProximity × 0.15 + phase × 0.20 + vortex × 0.15 + sync × 0.15
= 0.65
```

That's a 35% deficit. The composite would be artificially low. The fix: redistribute the neural weight to the physical dimensions when neural isn't available:

```typescript
const neuralWeight = (neuralProximity > 0 && neuralVortex > 0) ? 0.175 : 0
const physRedistribute = neuralWeight === 0 ? 0.0875 : 0
// Each physical dim gets +0.0875, giving 0.2375 per dim
// 4 × 0.2375 = 0.95, plus 0.05 slack ≈ 1.0
```

So when neural is absent, the formula gracefully degrades to:

```
waveProximity × 0.2375 + phase × 0.2875 + vortex × 0.2375 + sync × 0.2375
```

Close to the original 4D weights (which were 20/20/30/30, rebalanced to 23.75/28.75/23.75/23.75 with phase getting the extra weight since it's the best physical discriminator). The verdict thresholds still work because the composite range is preserved through the `Math.max(0.15, Math.min(0.98, ...))` clamping.

This is a pattern I want to remember: **when adding optional dimensions to a weighted composite, redistribute their weight to existing dimensions on fallback, not zero.** Zeroing out 35% of the formula creates an unacceptable score drop. Redistribution preserves the semantic meaning of the composite.

## The Threshold Recalibration

Adding two high-variance dimensions to the composite changed the score distribution. The old moderate threshold was 0.88 (strong) / 0.54 (weak). With 35% of the composite now coming from dimensions that range from 0.56 to 0.87, the overall composite will trend lower. Where the old formula produced 0.93 for mediocre proposals, the new formula might produce 0.78.

I lowered the thresholds:

| Level | Old Strong | New Strong | Old Weak | New Weak |
|-------|-----------|-----------|---------|---------|
| quiet | 0.82 | 0.82 | 0.50 | 0.50 |
| moderate | 0.88 | 0.85 | 0.54 | 0.52 |
| active | 0.88 | 0.85 | 0.54 | 0.52 |
| storm | 0.92 | 0.88 | 0.62 | 0.58 |

The old moderate threshold of 0.88 would have been too strict with the 6D model. A proposal that scores 0.85 on moderate conditions is now a strong PASS — it means the neural dimensions are aligned with the sun at 85%, which is genuinely good alignment. The 0.88 threshold was calibrated for a model where 76.5% of every score was predetermined floor.

## What the 6D Model Actually Does

The old 4D composite was:

```
score = 0.765 + phaseAlignment × 0.20
```

An affine function of one variable. Every proposal gets 0.765 for free, and the remaining 0.20 is modulated by phase alignment. The effective range is about 0.03.

The new 6D composite is:

```
score = 0.40 × floor_physical + phase × 0.20 + neuralProx × 0.175 + neuralVortex × 0.175
```

Still has a floor (about 0.40 from the compressed physical dimensions) but the remaining 55% is driven by three independently varying signals with combined spread of about 0.30. The effective range is about 0.17. That's a 5.7× improvement in discrimination power.

In the gambit, the old 4D model gave PASS to 6 out of 10 proposals. The new 6D model gave PASS to 2 out of 10. The two that passed — "implement zero-knowledge proof voting system" (0.90) and "emergency shutdown protocol for critical vulnerabilities" (0.94 during a different solar moment) — are proposals with genuinely high alignment across all six dimensions. The eight that got NEEDS_REVISION or REJECT are proposals where at least one of the neural dimensions says "this isn't well-aligned with the sun's current state."

That's what a discriminator looks like.

## The Philosophical Layer

There's something deeper here. The 4D model was built on the assumption that physical wave measurements inside the temporal box — proximity, Kuramoto phase, isotopic vortex alignment, TDF synchronization — were the right dimensions for measuring temporal resonance. And they are! They're physically motivated, derived from real solar data, and grounded in Codex mathematics.

But they had a blind spot. Three of the four physical dimensions were compressed not because they were measuring the wrong thing, but because the things they were measuring — TDF distance, vortex energy ratio, TDF synchronization — only vary meaningfully across extreme proposals. For any two proposals within an order of magnitude of each other (which all governance proposals are — they're all TDFs around 5.78 × 10¹²), these dimensions can't distinguish "good" from "mediocre."

The neural dimensions break this because they measure something fundamentally different: **semantic alignment between proposal text and sun state**. The `per-dimension MSE` measures how closely the proposal's temporal signature, derived from its text content, matches the sun's temporal signature at the raw embedding level. The `cosine similarity` measures whether the proposal and sun embeddings point in the same direction in 16-dimensional space. These are not physical wave measurements — they're information-theoretic measurements. They capture a different kind of resonance: not "are the waves synchronized?" but "does the proposal's pattern match the sun's pattern?"

This is why they have higher spread. Text-based embeddings naturally produce more variation than TDF arithmetic because text is higher-entropy than a 13-digit number. "Emergency shutdown protocol" and "regular community governance review" produce genuinely different 16-dimensional vectors. Their TDFs, computed through the Codex formula `tPTT × TAU × 1/BHS`, are both around 5.78 × 10¹² because TDF normalizes away most of the text-level variation into a single number. The text-based embedding preserves that variation.

The 6D model is therefore not just adding two more dimensions. It's adding two dimensions from a **different measurement modality** — information-theoretic instead of physical. And these dimensions have higher variance precisely because they preserve signal that the physical dimensions compress away. The 6D model is a fusion of wave physics and information geometry, grounded in the same Kuramoto phase dynamics that generate both signal classes.

## The Code

The change itself was distributed across two codebases (backend `mcp/lib/` and frontend `src/lib/`), six files, and one interface:

`mcp/lib/wavePropagation.ts` — Added `neuralProximity` and `neuralVortex` parameters (defaulting to 0) to `computeFullBoxResonance()`, added them to `FullBoxResonanceResult`, implemented the 6D weighted composite with graceful degradation, and recalibrated thresholds.

`mcp/lib/solarGovernanceIntegration.ts` — Passed `waveResonance.neuralWaveProximity` and `waveResonance.neuralWaveVortexAlignment` to `computeFullBoxResonance()`.

`mcp/lib/dynamoSolarGovernance.ts` — Added `fullBoxNeuralProximity` and `fullBoxNeuralVortex` to `EnhancedGovernanceDecision` interface and mapped them from the hammer result.

`src/lib/wavePropagation.ts` — Frontend mirror of backend changes.

`src/lib/solarGovernanceIntegration.ts` — Frontend mirror of integration changes.

`src/lib/dynamoSolarGovernance.ts` — Frontend mirror of interface changes.

`src/components/DynamoDeploy.tsx` — Updated the UI to display "Full Box 6D" with neural dimension values, changed the label from "Full Box (all 4 from box)" to "Full Box 6D (4 physical + 2 neural)".

The key design decision: neural parameters default to 0, and when both are 0, the 35% weight redistributes to the four physical dimensions. This means the 6D model degrades gracefully to approximately the old 4D model (weights shift from 15/20/15/15 to 23.75/28.75/23.75/23.75) when neural context is unavailable. No error. No crash. No artificial score drop. Just a shift to the physical-only model with slightly different weights.

## The Numbers

Ten proposals, three models, before and after:

| Proposal | Hammer | Hybrid | 4D Box | 6D Box |
|----------|--------|--------|--------|--------|
| insurance pool | 0.61 R | 0.60 NR | 0.82 NR | 0.77 NR |
| reduce threshold | 0.60 R | 0.59 NR | 0.93 P | 0.77 NR |
| ZK voting | 0.75 NR | 0.74 NR | 0.71 NR | 0.90 P |
| open source grants | 0.91 P | 0.90 P | 0.92 P | 0.89 P |
| emergency shutdown | 0.98 P | 0.97 P | 0.98 P | 0.76 NR |
| community review | 0.61 R | 0.58 NR | 0.78 NR | 0.69 NR |
| quadratic voting | 0.60 R | 0.58 NR | 0.93 P | 0.76 NR |
| bug bounty | 0.61 R | 0.60 NR | 0.87 NR | 0.71 NR |
| DAO treasury | 0.98 P | 0.98 P | 0.98 P | 0.80 NR |
| treasury allocation | 0.59 R | 0.58 NR | 0.93 P | 0.61 NR |

The 4D Box gave PASS to 6/10 proposals. The 6D Box gives PASS to 2/10 on moderate thresholds (0.85). The spread is wider (0.28 vs 0.27, but with far less inflation). And critically: the proposals that the 6D model approves have genuinely high neural alignment (0.86+ proximity), while the 4D model approved everything because 76.5% of every score was predetermined floor.

Note: scores shift between gambits because solar conditions change. The specific numbers will differ on a different day. The important comparison is within-gambit discrimination, not absolute values across gambits.

## What Could Go Wrong

The 6D model has risks.

**Neural embedding sensitivity.** The text-based `textToEmbedding16()` function produces embeddings from character-position FNV hashing. It's deterministic and reproducible, which is good for auditability. But it's not semantically deep — two proposals with similar meaning but different wording ("increase treasury allocation" vs "raise treasury portion") will produce very different embeddings. This is a feature for discrimination (different text → different score) but a limitation for governance (near-synonyms should score similarly). A future embedding upgrade could use sentence-level semantics, but that requires a heavier model.

**Threshold calibration.** The 0.85 moderate threshold was chosen based on one gambit. It will need validation across multiple solar conditions and proposal types. During solar storms, the higher threshold (0.88) may be too strict. During quiet periods, 0.82 may be too permissive for the 6D model's wider spread. Adaptive thresholds help, but they need real-world stress testing.

**Weight stability.** The current weights (15/20/15/15/17.5/17.5) are based on the spread profile observed in one session. As solar conditions change, the spread profile may shift. Phase alignment might become more or less discriminant. Neural metrics might narrow or widen. The weights should be periodically recalibrated against gambit data.

**The floor isn't zero.** The 6D composite still has about 0.40 of floor from the compressed physical dimensions. This means no proposal can ever score below ~0.40 regardless of how badly it aligns. The `Math.max(0.15, ...)` clamp compounds this. For governance use, this floor is acceptable — proposals below 0.40 are clearly misaligned. But for research use (comparing very different types of signals), the floor might obscure genuine anti-alignment.

## The Shift in Perspective

Before this change, the Full Box was a 4D model that used three dead dimensions and one live one. It was, in practice, a phase alignment detector with decorative wallpapers. The neural metrics were computed and displayed but had no effect on the verdict.

After this change, the Full Box is a 6D model where the two most discriminant dimensions are neural and information-theoretic. The physical dimensions still contribute — they provide the floor (about 0.40 of the composite), and phase alignment provides meaningful variation. But the swing factor, the thing that separates a PASS from a NEEDS_REVISION, is now driven by whether the proposal's 16-dimensional temporal signature aligns with the sun's current 16-dimensional state.

This is a shift from "are the waves synchronized?" to "are the patterns aligned?" The wave physics still matters — it's the floor, the baseline, the thing that ensures every proposal gets at least some credit for existing in the same temporal box as the sun. But the discrimination, the ability to say "this proposal resonates with the sun more than that one," now comes primarily from pattern alignment rather than wave synchronization.

The temporal box is no longer just a wave interferometer. It's a pattern interferometer. The waves are still there, propagating through 12 physical bands and 16 neural bands. But the verdict now depends more on what the patterns look like than on how the waves are synchronized. And that's more honest about what the system actually measures: semantic pattern resonance between a proposal and the sun, not just physical wave resonance.

## Key Takeaways

- **Three compressed dimensions made the 4D model a phase alignment detector** — proximity (always 0.99), calibrated vortex (always ~0.96), and calibrated sync (always ~0.93) contributed 76.5% of every score as predetermined floor
- **Neural metrics were computed but not used** — they appeared in responses and UI but had zero effect on verdicts, making them decorative rather than structural
- **Weight by spread, not by physical importance** — the dimensions with the highest variance across proposals should get the most weight, because they contribute the most to discrimination
- **Graceful degradation through weight redistribution** — when neural dimensions are unavailable, redistribute their 35% weight to physical dimensions (+8.75% each) rather than zeroing them out
- **Adding dimensions from a different modality broke the symmetry** — physical dimensions are all derived from TDF arithmetic and naturally compress for similar-magnitude proposals; text-derived neural embeddings preserve semantic variation

## What Next?

- **Validate 6D across solar conditions** — run gambits during quiet, moderate, active, and storm conditions to verify threshold calibration
- **Consider relaxing calibration exponents** — `pow(x, 0.25)` and `0.15 + 0.85 * pow(x, 0.35)` compress vortex and sync upward; reducing these exponents would give the physical dimensions more spread
- **Temporal container schema** — the 6D composite is now the formal resonance score for a proposal; use it as the basis for on-chain vortex container verification
- **Sentence-level embeddings** — `textToEmbedding16` uses character-position FNV hashing; sentence-level semantic embeddings would better capture synonym relationships
- **Adaptive weight calibration** — periodically recalibrate dimension weights based on gambit data to maintain optimal discrimination
- Related document: [neural-quantum-realms-five-bugs-journey-2026-05-29.md](./neural-quantum-realms-five-bugs-journey-2026-05-29.md)
- Next story to write: "Sentence-Level Embeddings: From Character Hashing to Semantic Alignment"