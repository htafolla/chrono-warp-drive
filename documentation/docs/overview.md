---
sidebar_position: 1
---

# What is Dynamo

Dynamo is a **Solar-Aligned Temporal Resonance Engine with Moral Discernment** — a system that produces self-authenticating, physically-grounded temporal documents bound to verifiable solar moments, with a separate moral overlay for full-spectrum governance.

Traditional systems produce: *"This happened at this time (according to our clock)."*

Dynamo produces: *"This happened at this solar moment, here is cryptographic proof of integrity, and the moral alignment is Significant — proceed with caution."*

## Primary Use Case

**To generate self-authenticating temporal documents that bind any input to a verifiable solar moment, with moral assessment as an independent interpretive layer.**

Everything else — governance, oracles, art, insurance, legal, research — flows from this core capability.

## How It Works

1. You submit an input (proposal, decision, event, text): `"Deploy model v3 to 10% of traffic"`
2. Dynamo fingerprints it into a Temporal Displacement Factor (TDF)
3. The TDF is cross-correlated against the Sun's current solar parameters (live NOAA GOES data)
4. A **7D resonance profile** is computed across 20 timesteps of Kuramoto phase evolution, including numerological (gematria) alignment
5. The **Trinitarium Moral Overlay** independently evaluates virtue/concern patterns with negation awareness
6. A verdict is returned alongside the full temporal record: proposal text, 7D profile, moral overlay, solar snapshot, and SHA-256 hash chain

```
input → TDF → cross-correlate with solar data → Kuramoto evolution → 7D resonance profile
                                                                      ↓
                                              Trinitarium Moral Overlay → moral score + tension label
                                                                      ↓
                                              verdict (PASS / NEEDS_REVISION / REJECT)
                                              + moral judgment (Aligned / Mild / Significant / Critical)
```

## Applications

The temporal document is a new primitive. Multiple use cases derive from it:

| Application | How It Uses the Core Capability |
|---|---|
| **Governance** | Uses the resonance score for PASS/NEEDS_REVISION/REJECT decisions, TMO tension for moral override |
| **Timestamping / Notarization** | Uses the solar-grounded timestamp + hash chain as a public, verifiable clock |
| **Decentralized Oracle** | Uses the 7D profile + solar snapshot as a physically-sourced entropy source |
| **Moral / Ethical Governance** | Uses TMO tension to block harmful proposals even when resonance is high |
| **Audit & Compliance** | Uses the hash chain and provenance for tamper-proof historical records |
| **Legal & Contracts** | Uses the self-authenticating record as evidence |
| **Insurance & Risk** | Uses the solar conditions at decision time for claims validation |
| **Pattern Mining** | Uses the growing time series of records to discover solar-decision correlations |
| **Generative Art** | Uses the 7D vector + phase trajectory as a creative seed with temporal provenance |
| **Smart Contracts** | Uses solar alignment + moral tension as real-world gate conditions |
| **AI Safety** | Uses the persistent, verifiable memory + moral overlay for long-term alignment |

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
  "fullBox7DComposite": 0.79,
  "fullBox7DVerdict": "NEEDS_REVISION",
  "fullBoxGematriaResonance": 0.76,
  "trinitariumMoralScore": 0.58,
  "moralNumerologicalTension": "Mild",
  "solarContext": {
    "solarActivityLevel": "quiet",
    "solarIsotopicResonance": 0.87
  },
  "hammerReason": "Strong resonance with current solar conditions",
  "signalTiming": "synced"
}
```

A resonance score of 0.87 with quiet solar conditions and synced timing — but "Mild" moral tension flags this as something to review carefully.

## Why Solar + Moral

Existing AI governance is circular — human feedback loops back into the same system, constitutional AI evaluates itself, debate stays internal. No approach references anything outside the system.

Dynamo breaks circularity in two ways:
1. **Solar grounding** — No proposal can change solar weather. The reference is independent, verifiable, and continuously variable.
2. **Moral overlay** — TMO is a deterministic, auditable, local-first moral assessment. "Delete production DB" gets 7D=0.90 (physically resonant) but TMO=0.39 Significant (morally concerning). The system surfaces the tension for human review.

## Try It

Open [dynamo.rippel.ai](https://dynamo.rippel.ai) and type any proposal. The Sun answers immediately. The moral overlay shows whether it aligns with virtue.

## Built By

[@blaze0x1](https://x.com/blaze0x1) — open source on [GitHub](https://github.com/htafolla/chrono-warp-drive).

## Current State

For a complete picture of what Dynamo is today — architecture, design decisions, deployment, and relationship to the Blurrn Quantum Codex — see [DYNAMO-CURRENT-STATE.md](https://github.com/htafolla/chrono-warp-drive/blob/main/docs/DYNAMO-CURRENT-STATE.md).

For the theoretical temporal physics framework that Dynamo implements, see the [Blurrn Codex](/docs/blurrn-codex) page or the versioned specs under `docs/blurrn-codex/` in the repository.

**Codex version lineage:** v4.5 (Trinitarium) → v4.6 (TDF breakthrough) → v4.7 (CTI) → v4.8 (Isotopic Temporal Vortex) → v4.9 (6D + NQR, production) → v5.0 (Temporal Displacement Field, draft spec) → v5.1 (7D + numerological axis) → **v5.2** (Trinitarium Moral Overlay + 0xRay integration)