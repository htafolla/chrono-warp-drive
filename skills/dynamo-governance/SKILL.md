---
description: >-
  Use Dynamo to get AI-powered governance verdicts on proposals, informed by
  real-time solar activity, neural resonance analysis, Kuramoto coupling,
  and temporal vortex anchoring. Includes 20 MCP tools and VortexToken NFT
  minting on Base.
---

# Dynamo Governance

Use Dynamo to get AI-powered governance verdicts on proposals, informed by real-time solar activity, neural resonance analysis, and temporal field computation.

## Tools

### `governance`
Analyze a proposal and return a verdict (PASS / NEEDS_REVISION / FAIL) with resonance scores.

```json
{
  "proposalId": "ui-1712345678",
  "proposalText": "Should we deploy to production?",
  "agentReviews": ["UI submission"]
}
```

### `govern_with_solar`
Same as `governance`, but includes solar activity modulation (TDF, Kp index, x-ray flux) for solar-aware verdicts.

```json
{
  "proposal": "Should we deploy to production?",
  "baseVoteWeight": 1,
  "sharePublicly": true,
  "persistToChain": false,
  "spectralQuality": null
}
```

### Vortex (container + minting)
- `vortex.info` — total supply, donations, treasury
- `vortex.container` — single container status + on-chain data by containerId
- `vortex.statuses` — batch claimed/unclaimed for all containers
- `vortex.mint` — mint a container as a VortexToken on Base
- `vortex.persist` — save an offchain container to the on-chain registry

## Concepts

| Concept | Description |
|---------|-------------|
| **Isotope** | A temporal signal emitted by a proposal, carrying its semantic fingerprint |
| **TDF** | Temporal Displacement Factor — how far the proposal shifts from baseline |
| **Kuramoto Coupling** | Synchronization of oscillators representing different resonance dimensions |
| **Wave Propagation** | How the proposal's signal propagates through the temporal field |
| **Verdict** | PASS, NEEDS_REVISION, or FAIL based on resonance + moral alignment |
| **7D Resonance** | 7 dimensions of temporal resonance (wave proximity, phase alignment, calibrated vortex, etc.) |
| **TMO** | Trinitarium Moral Overlay — virtue, safety, intent, fusion alignment |
| **VortexToken** | ERC-721 token minted on Base representing an anchored container |
| **Celestial/Resonant/Unstable/Dissonant** | Rarity tiers based on composite score thresholds |
