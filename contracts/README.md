# Dynamo Temporal Containers

On-chain registry for temporal resonance containers on **Base** (v5.2).

## Contract

`TemporalContainerRegistry` — stores a canonical, verifiable unit for each temporal resonance event:

- **SHA-256** container identity
- **Solar snapshot** (timestamp, activity level, NOAA metrics, solar TDF)
- **7D resonance profile** (waveProximity, phaseAlignment, calibratedVortex, calibratedSync, neuralProximity, neuralVortex, gematriaResonance + fullBox7DComposite)
- **Moral overlay** (trinitariumMoralScore, virtueAlignment, moralSafety, intentAlignment, trinitariumGematriaFusion, moralNumerologicalTension)
- **Proposal hash** + verdict + confidence + hammerReason
- **Chain linking** via `previousContainerHash` — each container references the previous, forming a temporal chain
- **Source tracking** — `"human" | "agent" | "ambient"`
- **Cryptographic integrity hash** for verification
- **Ancestor traversal** — `getAncestors()` for temporal manifold navigation

## Deploy

```bash
# install foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# build
forge build

# test
forge test

# deploy to Base Sepolia
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify

# deploy to Base mainnet
forge script script/Deploy.s.sol --rpc-url base --broadcast --verify
```

### Environment Variables

```
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_key
DEPLOYER_PRIVATE_KEY=your_key
```

## Gas

~200k–280k gas per `storeContainer` call (~$0.001–0.005 on Base at current prices).

## Architecture

```
Off-chain (Dynamo API)                          On-chain (Base)
───────────────────────────────                  ────────────────
/govern_with_solar?persistToChain                TemporalContainerRegistry
  → full 7D resonance + TMO                       ├─ storeContainer()
  → governanceToContainer()                        ├─ getContainer()
  → chain-link to latest                          ├─ verifyContainer()
  → store in memory container store                ├─ containerCount()
  → return containerId + hash                      ├─ listContainers()
                                                    ├─ getPreviousContainer()
GET /containers                                    ├─ getAncestors()
GET /containers/:id                                └─ latestContainerHash()

Ambient daemon (background):
  → field momentum tracking
  → self-adjusting sampling rate
  → GET /ambient/status (momentum, density, vortices)
```

## Chain Linking

Each container stores the `containerHash` of the previous one via `previousContainerHash`.
The contract tracks `latestContainerHash` so new containers are automatically chained.
This creates an immutable temporal chain: `container[0] → container[1] → ... → container[N]`.

## Migration Path

- **v5.2 (Base)**: TMO fields, chain linking, source tracking, momentum-driven ambient sampling
- **v0.2+ (Multi-chain)**: IPFS + on-chain hash pattern enables portability to Arbitrum, Optimism, or sovereign chain