# 0xRay Integration Guide

## Dynamo Governance Endpoint (`/governance`)

This guide explains how **0xRay** should call and interpret the Dynamo governance endpoint.

---

## Overview

The `/governance` endpoint turns any proposal into a **high-signal, traceable decision** using the Blurrn Isotopic Temporal Vortex.

Instead of simple majority voting, it uses:
- **Symbiotic signal compression**
- **Isotopic ratio** (truth fidelity)
- **Vortex Volume** (W × M = V)
- **Historical coherence** (consistency with past decisions)

---

## How to Call the Endpoint

**URL:** `https://mcp-production-80e2.up.railway.app/governance` (or your deployed Dynamo URL)

**Method:** `POST`

### Request Format

```json
{
  "proposalId": "prop-042",
  "proposalText": "We should upgrade the stellar module to use real TensorFlow.js models for better spectrum analysis.",
  "codeDiff": "diff --git a/mcp/stellar.ts ...",     // optional
  "agentReviews": [
    "This is a strong technical improvement.",
    "The performance impact needs evaluation."
  ],
  "historicalSignalIds": ["governance-001", "governance-017"]   // optional
}
```

---

## Response Format

```json
{
  "success": true,
  "proposalId": "prop-042",
  "governanceIsotopeId": "governance-1747000000000",
  "resonanceScore": 0.93,
  "isotopicRatio": 0.96,
  "vortexVolume": 3.41e25,
  "historicalCoherence": 0.91,
  "recommendation": "PASS",
  "confidence": 0.97,
  "voteWeight": 1.4,
  "reasons": [
    "High symbiotic resonance (PHI-aligned)",
    "Strong continuity with previous governance"
  ]
}
```

### Key Fields Explained

| Field                  | Meaning                                      | How 0xRay Should Use It                  |
|------------------------|----------------------------------------------|----------------------------------------------|
| `recommendation`       | PASS / NEEDS REVISION / REJECT               | Primary decision                             |
| `confidence`           | 0.0 – 1.0 (trust in the signal)              | Weight your final vote                       |
| `voteWeight`           | 1.0 – 1.5+ (how strongly to support)         | Multiply your vote strength                  |
| `reasons`              | Array of specific insights                   | Use for explanation / logging                |
| `historicalCoherence`  | Alignment with past decisions                | Higher = more consistent governance          |
| `vortexVolume`         | Inertial mass (W × M = V)                 | Very high = strong, stable proposal          |

---

## Recommended Decision Logic for 0xRay

```javascript
// Example logic 0xRay can use

if (response.recommendation === "PASS" && response.confidence > 0.90) {
  return {
    vote: "YES",
    weight: response.voteWeight,
    reason: response.reasons.join("; ")
  };
}

if (response.recommendation === "REJECT") {
  return {
    vote: "NO",
    weight: 1.0,
    reason: response.reasons.join("; ")
  };
}

// NEEDS REVISION
return {
  vote: "ABSTAIN",
  weight: 0.8,
  reason: "Proposal needs refinement: " + response.reasons.join("; ")
};
```

---

## Full Example Flow

1. **0xRay receives a proposal**
2. **Calls `/governance`** with proposal text + reviews
3. **Receives response** with `recommendation`, `confidence`, `voteWeight`
4. **Applies decision logic** (above)
5. **Casts weighted vote** in the DAO / governance system
6. **Logs** the `governanceIsotopeId` for traceability

---

## Best Practices

- Always include at least 2 `agentReviews` for better triangulation
- Send `historicalSignalIds` when available to maintain consistency
- Use `voteWeight` to give stronger proposals more influence
- Store the `governanceIsotopeId` for audit trails
- If `historicalCoherence` is low, consider slowing down the decision

---

**This system favors high-quality, high-inertia proposals over loud but low-signal ones.**

**Small heroes can win.**

---

*Blurrn Quantum Codex v4.8.3 — Glory to the Architect.*
