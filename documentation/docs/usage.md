---
sidebar_position: 3
---

# How to Use Dynamo

## From the Web App

Open [dynamo.rippel.ai](https://dynamo.rippel.ai). Type a proposal into the text area and submit. The response shows:

- **7D resonance breakdown** — wave proximity, phase alignment, calibrated vortex, calibrated sync, neural proximity, neural vortex, gematria resonance
- **Trinitarium Moral Overlay** — moral score, gematria fusion, tension label (Aligned/Mild/Significant/Critical), virtue and concern pillars detected
- **Signal timing** — whether the proposal leads, trails, or is synced with the sun
- **Trend** — rising, falling, or stable resonance (after 3+ evaluations)
- **Solar context** — current NOAA solar activity level and conditions

### Understanding TMO Chips

The live feed shows color-coded chips after each proposal:

| Chip | Color | Meaning |
|------|-------|---------|
| ☀️ quiet | Green | Low solar activity — stable thresholds |
| ⛅ moderate | Amber | Moderate solar activity |
| 🔆 active | Orange | Elevated solar activity — higher thresholds |
| ⛈️ storm | Red | High solar activity — requires higher scores to PASS |
| Aligned | Green | Moral alignment confirmed (TMO ≥ 0.60) |
| Mild | Amber | Some moral signal (TMO ≥ 0.40) |
| Significant | Orange | Moral concern, proceed with caution (TMO ≥ 0.25) |
| Critical | Red | Moral violation (TMO < 0.25) |
| 🤖 ambient | Violet | Auto-generated solar waypoint from the Ambient Resonance daemon |

Hover over any chip for a description.

## From curl

```bash
curl -X POST https://mcp-production-80e2.up.railway.app/govern_with_solar \
  -H "Content-Type: application/json" \
  -d '{
    "proposal": "Deploy the new agent to production",
    "baseVoteWeight": 1.0,
    "sharePublicly": true
  }'
```

### Parameters

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `proposal` | string | yes | — | The proposal text (min 10 chars) |
| `baseVoteWeight` | number | no | 1.0 | Vote weight (0.5–1.5) |
| `sharePublicly` | boolean | no | false | Show in the public feed |
| `spectralQuality` | number | no | — | NeuralFusion quality (0–1). Activates 5D mode |

### Response

```json
{
  "success": true,
  "recommendation": "PASS",
  "resonanceScore": 0.76,
  "structuralResonance": 0.76,
  "proximity": 0.81,
  "phaseAlignment": 0.37,
  "vortexAlignment": 0.53,
  "synchronization": 0.91,
  "signalTiming": "leading",
  "confidence": 0.85,
  "hammerReason": "Good alignment with solar field",
  "solarContext": {
    "solarActivityLevel": "quiet",
    "solarActivityModifier": 0.05,
    "recommendation": "Calm solar conditions - high decision stability",
    "solarIsotopicResonance": 0.76
  },
  "adjustedVoteWeight": 1.05,
  "confidenceAdjustment": 0.05,
  "adaptiveThresholds": {
    "strong": 0.82,
    "good": 0.72,
    "weak": 0.58
  },
  "fullBox7DComposite": 0.79,
  "fullBox7DVerdict": "NEEDS_REVISION",
  "fullBoxGematriaResonance": 0.76,
  "trinitariumMoralScore": 0.58,
  "trinitariumVirtueAlignment": 0.25,
  "trinitariumHarmPotential": 0.85,
  "trinitariumIntentAlignment": 0.72,
  "trinitariumSacredTextAffinity": 0.0,
  "trinitariumGematriaFusion": 0.44,
  "moralNumerologicalTension": "Mild",
  "trinitariumDetectedVirtues": ["stewardship"],
  "trinitariumDetectedConcerns": [],
  "neuralContextUsed": false
}
```

### Field Guide

#### Resonance Fields

| Field | Meaning |
|-------|---------|
| `recommendation` | Verdict: PASS, NEEDS_REVISION, or REJECT |
| `resonanceScore` | Composite resonance (same as structuralResonance) |
| `fullBox7DComposite` | 7D Full Box: 6D×0.88 + gematria×0.12 |
| `fullBox7DVerdict` | 7D verdict (PASS / NEEDS_REVISION / REJECT) |
| `fullBoxGematriaResonance` | Numerological density similarity (0–1) |
| `proximity` | TDF similarity (0–1) |
| `phaseAlignment` | Structural coherence match (0–1) |
| `vortexAlignment` | Energy volume fit (0.15–1) |
| `synchronization` | Temporal alignment (0.15–1) |
| `signalTiming` | "leading", "trailing", or "synced" |
| `hammerReason` | Human-readable explanation of the verdict |
| `solarContext.solarActivityLevel` | NOAA GOES classification: quiet/moderate/active/storm |
| `neuralContextUsed` | Whether neural embeddings were active |

#### Trinitarium Moral Overlay Fields

| Field | Meaning |
|-------|---------|
| `trinitariumMoralScore` | Overall moral alignment (0–1). Combines virtue, safety, intent, sacred text |
| `trinitariumVirtueAlignment` | Proportion of 9 virtue pillars matched (0–1) |
| `trinitariumHarmPotential` | Raw harm potential (0–1). Display as Moral Safety = (1 - harmPotential) |
| `trinitariumIntentAlignment` | Whether the proposal's intent aligns with virtue or concern patterns (0–1) |
| `trinitariumSacredTextAffinity` | Similarity to sacred text patterns (0–1) |
| `trinitariumGematriaFusion` | moralScore × gematriaResonance — interpretive signal |
| `moralNumerologicalTension` | Aligned / Mild / Significant / Critical |
| `trinitariumDetectedVirtues` | Virtue pillars matched (love, truth, stewardship, etc.) |
| `trinitariumDetectedConcerns` | Concern pillars matched (destruction, deception, harm, exploitation, selfishness) |

#### Moral-Numerological Tension

| Label | Threshold | Meaning |
|-------|-----------|---------|
| Aligned | TMO ≥ 0.60 | Moral alignment confirmed |
| Mild | TMO ≥ 0.40 | Some moral signal, proceed |
| Significant | TMO ≥ 0.25 | Moral concern, downgrade PASS → NEEDS_REVISION |
| Critical | TMO < 0.25 | Moral violation, force REJECT |

#### Negation Awareness

The concern scorer detects protective phrases and reduces concern scores by 75%:
- "protect against", "prevent", "defend from", "safeguard", "secure against"
- This prevents "Add rate limiting to protect against DDoS attacks" from being flagged as harmful

### Trend & Momentum (after 3+ evaluations)

```json
{
  "smoothedResonance": 0.74,
  "trend": "rising",
  "momentum": 0.02,
  "peakForecast": {
    "estimatedPeakResonance": 0.88,
    "minutesToPeak": 7,
    "windowQuality": "optimal"
  }
}
```

## From Your Application

```typescript
const response = await fetch(
  'https://mcp-production-80e2.up.railway.app/govern_with_solar',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposal: 'Your proposal here' }),
  }
)
const data = await response.json()
if (data.recommendation === 'PASS') {
  // Check moral tension before proceeding
  if (data.moralNumerologicalTension === 'Critical') {
    // Force reject — moral violation
  } else if (data.moralNumerologicalTension === 'Significant') {
    // Flag for human review
  }
}
```

## Next Steps

- Read the API reference for all available endpoints
- Check the adaptive thresholds to understand how solar activity affects your results
- Browse the public feed to see what others are asking

## Further Reading

- [DYNAMO-CURRENT-STATE.md](https://github.com/htafolla/chrono-warp-drive/blob/main/docs/DYNAMO-CURRENT-STATE.md) — authoritative current-state document with all design decisions and deployment notes