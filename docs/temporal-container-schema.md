# Temporal Container JSON Schema v0.1

Canonical off-chain representation of a Dynamo temporal resonance event. Stored on IPFS with SHA-256 hash referenced on-chain.

```json
{
  "version": "0.1",
  "containerId": "0x...",
  "timestamp": "2026-05-31T13:54:00Z",

  "proposal": {
    "hash": "0x...",
    "text": "..."
  },

  "solarSnapshot": {
    "timestamp": "2026-05-31T13:54:00Z",
    "activityLevel": "moderate",
    "xrayFlux": 0.0000123,
    "kpIndex": 3.2,
    "protonFlux": 1240,
    "magnetometer": -12.4,
    "solarTdf": 5781045929080
  },

  "resonanceProfile": {
    "structuralResonance": 0.98,
    "proximity": 0.998,
    "phaseAlignment": 0.99,
    "vortexAlignment": 0.9999998,
    "synchronization": 0.956,
    "neuralProximity": 0.746,
    "neuralVortex": 0.773,
    "verdict": "PASS",
    "confidence": 0.93
  },

  "metadata": {
    "modelVersion": "v5.0",
    "hammerReason": "Strong resonance with current solar conditions",
    "resonanceHistory": [
      { "score": 0.98, "timestamp": "2026-05-31T13:54:00Z" }
    ]
  },

  "proof": {
    "containerHash": "0x...",
    "signature": "0x..."
  }
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `containerId` | `bytes32` | SHA-256 of entire container (excluding proof fields) |
| `proposal.hash` | `bytes32` | SHA-256 of proposal text |
| `solarSnapshot.*` | various | Immutable record of solar state at scoring moment |
| `resonanceProfile.*` | `uint256` (scaled) | Full 6D + verdict + confidence |
| `proof.containerHash` | `bytes32` | SHA-256 of container (excluding proof) — stored on-chain |
| `proof.signature` | `bytes` | Optional ECDSA/Ed25519 signature for future verification |

## On-Chain Mapping

On-chain struct stores only the fields needed for verification and audit:
- `containerId`, `timestamp`, `proposalHash`
- `solarSnapshot` (all fields)
- `resonanceProfile` (all fields, `uint256` scaled by 1e18)
- `containerHash`, `creator`, `blockNumber`

Full JSON lives off-chain (IPFS). The on-chain hash links the two.
