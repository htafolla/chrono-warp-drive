---
sidebar_position: 3
---

# How to Use Dynamo

## From the Web App

Open [dynamo.rippel.ai](https://dynamo.rippel.ai). Type a proposal into the text area and submit. The response shows:

- **Resonance breakdown** — proximity, phase alignment, vortex alignment, synchronization scores
- **Signal timing** — whether the proposal leads, trails, or is synced with the sun
- **Trend** — rising, falling, or stable resonance (after 3+ evaluations)
- **Solar context** — current NOAA solar activity level and conditions

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
  "neuralContextUsed": false
}
```

### Field Guide

| Field | Meaning |
|-------|---------|
| `recommendation` | Verdict: PASS, NEEDS_REVISION, or REJECT |
| `resonanceScore` | Composite resonance (same as structuralResonance) |
| `proximity` | TDF similarity (0–1) |
| `phaseAlignment` | Structural coherence match (0–1) |
| `vortexAlignment` | Energy volume fit (0.15–1) |
| `synchronization` | Temporal alignment (0.15–1) |
| `signalTiming` | "leading", "trailing", or "synced" |
| `hammerReason` | Human-readable explanation of the verdict |
| `solarContext.solarActivityLevel` | NOAA GOES classification: quiet/moderate/active/storm |
| `neuralContextUsed` | Whether 5D mode was active |

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
  // proceed
}
```

## Next Steps

- Read the API reference for all available endpoints
- Check the adaptive thresholds to understand how solar activity affects your results
- Browse the public feed to see what others are asking

## Further Reading

- [DYNAMO-CURRENT-STATE.md](https://github.com/htafolla/chrono-warp-drive/blob/main/docs/DYNAMO-CURRENT-STATE.md) — authoritative current-state document with all design decisions and deployment notes
