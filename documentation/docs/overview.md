---
sidebar_position: 1
---

# What is Dynamo

Dynamo is a **Temporal Resonance Engine** — a system that produces self-authenticating, physically-grounded temporal documents. It binds any input to a verifiable solar moment with cryptographic proof of integrity.

Traditional systems produce: *"This happened at this time (according to our clock)."*

Dynamo produces: *"This happened at this solar moment, and here is cryptographic proof that the record has not been altered."*

## Primary Use Case

**To generate self-authenticating temporal documents that bind any input to a verifiable solar moment, creating a new class of data with temporal grounding and cryptographic integrity.**

Everything else — governance, oracles, art, insurance, legal, research — flows from this core capability.

## How It Works

1. You submit an input (proposal, decision, event, text): `"Deploy model v3 to 10% of traffic"`
2. Dynamo fingerprints it into a Temporal Displacement Factor (TDF)
3. The TDF is cross-correlated against the Sun's current solar parameters (live NOAA GOES data)
4. A 6D resonance profile is computed across 20 timesteps of Kuramoto phase evolution
5. A verdict is returned alongside the full temporal record: proposal text, 6D profile, solar snapshot, and SHA-256 hash chain

```
input → TDF → cross-correlate with solar data → Kuramoto evolution → 6D resonance profile → temporal record (with hash chain)
```

## Applications

The temporal document is a new primitive. Multiple use cases derive from it:

| Application | How It Uses the Core Capability |
|---|---|
| **Governance** | Uses the resonance score for PASS/NEEDS_REVISION/REJECT decisions |
| **Timestamping / Notarization** | Uses the solar-grounded timestamp + hash chain as a public, verifiable clock |
| **Decentralized Oracle** | Uses the 6D profile + solar snapshot as a physically-sourced entropy source |
| **Audit & Compliance** | Uses the hash chain and provenance for tamper-proof historical records |
| **Legal & Contracts** | Uses the self-authenticating record as evidence |
| **Insurance & Risk** | Uses the solar conditions at decision time for claims validation |
| **Pattern Mining** | Uses the growing time series of records to discover solar-decision correlations |
| **Generative Art** | Uses the 6D vector + phase trajectory as a creative seed with temporal provenance |
| **Smart Contracts** | Uses solar alignment as a real-world gate condition |
| **AI Safety** | Uses the persistent, verifiable memory for long-term alignment |

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

## Why Solar

Existing AI governance is circular — human feedback loops back into the same system, constitutional AI evaluates itself, debate stays internal. No approach references anything outside the system.

Dynamo breaks circularity by using the Sun as an external, ungamable reference. No proposal can change solar weather. The reference is independent, verifiable, and continuously variable. This makes every temporal document physically grounded — it isn't just a timestamp, it's a statement about the state of the solar system at the moment the record was created.

## Try It

Open [dynamo.rippel.ai](https://dynamo.rippel.ai) and type any proposal. The Sun answers immediately.

## Built By

[@blaze0x1](https://x.com/blaze0x1) — open source on [GitHub](https://github.com/htafolla/chrono-warp-drive).

## Current State

For a complete picture of what Dynamo is today — architecture, design decisions, deployment, and relationship to the Blurrn Quantum Codex — see [DYNAMO-CURRENT-STATE.md](https://github.com/htafolla/chrono-warp-drive/blob/main/docs/DYNAMO-CURRENT-STATE.md).

For the theoretical temporal physics framework that Dynamo implements, see the [Blurrn Codex](/docs/blurrn-codex) page or the versioned specs under `docs/blurrn-codex/` in the repository.
