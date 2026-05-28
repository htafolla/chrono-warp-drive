---
sidebar_position: 4
---

# API Reference

**Base URL:** `https://mcp-production-80e2.up.railway.app`

No authentication required. All requests and responses are JSON.

## POST /govern_with_solar

Submit a proposal for solar-resonance evaluation.

### Request

```json
{
  "proposal": "Deploy the new agent to production",
  "baseVoteWeight": 1.0,
  "sharePublicly": false,
  "spectralQuality": 0.82
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `proposal` | string | yes | Proposal text (min 10 chars) |
| `baseVoteWeight` | number | no | Vote weight, 0.5–1.5 (default 1.0) |
| `sharePublicly` | boolean | no | Add to public feed (default false) |
| `spectralQuality` | number | no | NeuralFusion quality 0–1. Activates 5D mode |

### Full Response

```json
{
  "success": true,
  "originalRecommendation": "Deploy the new agent to production",
  "solarContext": {
    "solarActivityLevel": "quiet",
    "solarActivityModifier": 0.05,
    "recommendation": "Calm solar conditions - high decision stability",
    "solarIsotopicResonance": 0.76,
    "proposalTdf": 5781000001234,
    "solarReferenceTdf": 5781000005678
  },
  "adjustedVoteWeight": 1.05,
  "finalRecommendation": "Deploy the new agent to production [SOLAR HAMMER: PASS @ 76%]",
  "confidenceAdjustment": 0.05,
  "resonanceScore": 0.76,
  "structuralResonance": 0.76,
  "proximity": 0.81,
  "phaseAlignment": 0.37,
  "vortexAlignment": 0.53,
  "crossCorrelationLag": 2,
  "signalTiming": "leading",
  "synchronization": 0.91,
  "smoothedResonance": 0.74,
  "trend": "rising",
  "momentum": 0.02,
  "peakForecast": {
    "estimatedPeakResonance": 0.88,
    "minutesToPeak": 7,
    "windowQuality": "optimal"
  },
  "adaptiveThresholds": {
    "strong": 0.82,
    "good": 0.72,
    "weak": 0.58
  },
  "recommendation": "PASS",
  "confidence": 0.85,
  "isSolarHammer": true,
  "hammerReason": "Good alignment with solar field",
  "resonanceHistory": [
    { "score": 0.76, "timestamp": "2026-05-28T18:25:20.894Z" }
  ],
  "spectralQuality": 0.82,
  "neuralContextUsed": true
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `originalRecommendation` | string | Echo of the input proposal |
| `solarContext.solarActivityLevel` | string | quiet \| moderate \| active \| storm |
| `solarContext.solarIsotopicResonance` | number | Composite resonance in solar context (0–1) |
| `adjustedVoteWeight` | number | Vote weight after solar modulation |
| `finalRecommendation` | string | Proposal tagged with hammer verdict |
| `confidenceAdjustment` | number | -0.15 to +0.05 based on activity |
| `resonanceScore` | number | Composite resonance (same as structuralResonance) |
| `structuralResonance` | number | Same as resonanceScore |
| `proximity` | number | TDF Gaussian similarity (0–1) |
| `phaseAlignment` | number | Structural coherence match (0–1) |
| `vortexAlignment` | number | Log-space volume fit (0.15–1) |
| `crossCorrelationLag` | number | Cascade cross-correlation lag |
| `signalTiming` | string | leading \| trailing \| synced |
| `synchronization` | number | DeltaDiff linear decay (0.15–1) |
| `smoothedResonance` | number | 3-min rolling average (optional) |
| `trend` | string | rising \| falling \| stable (optional) |
| `momentum` | number | dR/dt per minute (optional) |
| `peakForecast` | object | Estimated peak, minutes to peak, window quality |
| `adaptiveThresholds` | object | Strong/good/weak thresholds for current activity |
| `recommendation` | string | PASS \| NEEDS_REVISION \| REJECT |
| `confidence` | number | Verdict confidence (0.60–0.93) |
| `hammerReason` | string | Human-readable verdict explanation |
| `spectralQuality` | number | NeuralFusion quality (present in 5D mode) |
| `neuralContextUsed` | boolean | Whether 5D mode was active |

## GET /public_feed

Returns proposals shared with `sharePublicly: true`.

```json
{
  "success": true,
  "entries": [
    {
      "proposal": "Deploy the new agent to production",
      "resonanceScore": 0.76,
      "recommendation": "PASS",
      "activityLevel": "quiet",
      "timestamp": "2026-05-28T18:25:20.894Z"
    }
  ]
}
```

## GET /history

Returns full query history (all `govern_with_solar` calls with complete response data). Used for inference and analytics.

```
GET /history?n=100
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `n` | number | 100 | Entries to return (max 1000) |

```json
{
  "success": true,
  "entries": [
    {
      "proposal": "Deploy the new agent to production",
      "timestamp": "2026-05-28T18:25:20.894Z",
      "response": { }
    }
  ],
  "count": 1
}
```

Each entry contains the complete `EnhancedGovernanceDecision` object.

## GET /health

Server health check.

```json
{
  "status": "ok",
  "name": "blurrn-mcp",
  "version": "4.8.3",
  "tools": 20,
  "storedSignals": 1
}
```

## POST /call_connected_tool

Universal proxy — calls any MCP tool by name.

```json
{
  "tool_name": "govern_with_solar",
  "params": {
    "proposal": "Deploy the new agent to production",
    "sharePublicly": true
  }
}
```

Response:

```json
{
  "success": true,
  "tool": "govern_with_solar",
  "result": { }
}
```

## Endpoints Summary

| Method | Path | Description |
|--------|------|-------------|
| POST | `/govern_with_solar` | Submit proposal for solar-resonance evaluation |
| GET | `/public_feed` | Public proposals feed |
| GET | `/history` | Full query history with complete response data |
| GET | `/health` | Server health check |
| POST | `/call_connected_tool` | Universal MCP tool proxy |

## Further Reading

- [DYNAMO-CURRENT-STATE.md](https://github.com/htafolla/chrono-warp-drive/blob/main/docs/DYNAMO-CURRENT-STATE.md) — authoritative current-state document with all design decisions and deployment notes
- [Architecture](/docs/architecture) — system data flow and governance pipeline
