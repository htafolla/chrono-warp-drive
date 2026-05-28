---
sidebar_position: 1
---

# What is Dynamo

Dynamo is a solar-aligned AI governance system. It evaluates proposals by measuring their resonance against the Sun's current electromagnetic and particle environment — using live data from NOAA GOES satellites.

Every governance proposal receives a resonance score from 0 to 1. The score reflects how well the proposal's temporal signature aligns with the Sun's current state. Higher scores mean stronger alignment.

## How It Works

1. You submit a proposal: `"Deploy model v3 to 10% of traffic"`
2. Dynamo fingerprints it into a Temporal Displacement Factor (TDF)
3. The TDF is cross-correlated against the Sun's current solar parameters
4. NeuralFusion (TF.js autoencoder) optionally produces a spectral quality score
5. A resonance score is calculated across 4 or 5 dimensions (spectral quality adds a 5th with 10% weight)
6. The score is compared against adaptive thresholds based on solar activity
7. You get a verdict: **PASS**, **NEEDS_REVISION**, or **REJECT**

```
proposal → TDF → cross-correlate with solar data → [NeuralFusion spectral quality] → resonance score → verdict
```

## Why This Matters

Existing AI governance is circular — human feedback loops back into the same system, constitutional AI evaluates itself, debate stays internal. No approach references anything outside the system.

Dynamo breaks circularity by using the Sun as an external, ungamable reference. No proposal can change solar weather. The reference is independent, verifiable, and continuously variable.

## Quick Start

```bash
curl -X POST https://mcp-production-80e2.up.railway.app/govern_with_solar \
  -H "Content-Type: application/json" \
  -d '{"proposal": "Deploy model v3 to 10% of traffic", "sharePublicly": true}'
```

Response:

```json
{
  "success": true,
  "recommendation": "PASS",
  "resonanceScore": 0.87,
  "solarContext": {
    "solarActivityLevel": "quiet",
    "solarIsotopicResonance": 0.87
  },
  "hammerReason": "Strong resonance with current solar conditions",
  "signalTiming": "synced"
}
```

A resonance score of 0.87 with quiet solar conditions and synced timing is a clean pass.

## Try It

Open [dynamo.rippel.ai](https://dynamo.rippel.ai) and type any proposal. The Sun answers immediately.

## Built By

[@blaze0x1](https://x.com/blaze0x1) — open source on [GitHub](https://github.com/htafolla/chrono-warp-drive).

## Current State

For a complete picture of what Dynamo is today — architecture, design decisions, deployment, and relationship to the Blurrn Quantum Codex — see [DYNAMO-CURRENT-STATE.md](https://github.com/htafolla/chrono-warp-drive/blob/main/docs/DYNAMO-CURRENT-STATE.md).

For the foundational cosmological research, see the [Blurrn Codex](/docs/blurrn-codex) page or the archived specs under `docs/legacy/` in the repository.
