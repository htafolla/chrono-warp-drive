# Dynamo Temporal Containers

On-chain registry for temporal resonance containers on **Base** (v0.1).

## Contract

`TemporalContainerRegistry` — stores a canonical, verifiable unit for each temporal resonance event:
- **SHA-256** container identity
- **Solar snapshot** (timestamp, activity level, NOAA metrics, solar TDF)
- **6D resonance profile** (proximity, phase, vortex, sync, neuralProx, neuralVortex)
- **Proposal hash** + verdict + confidence
- **Cryptographic integrity hash** for verification

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

~180k–220k gas per `storeContainer` call (~$0.001–0.005 on Base at current prices).

## Schema

Full container JSON (off-chain, IPFS-referenced) mirrors the on-chain struct plus proposal text and metadata. See `docs/temporal-container-schema.md` for the complete JSON schema.

## Architecture

```
Off-chain (Dynamo API)                          On-chain (Base)
───────────────────────────────                  ────────────────
/govern_with_solar → full 6D                     TemporalContainerRegistry
  resonance profile                                ├─ storeContainer()
    ↓                                              ├─ getContainer()
  compute containerHash (SHA-256)                  ├─ verifyContainer()
  upload full JSON to IPFS                         └─ listContainers()
  call storeContainer(hash, ...)
```

## Migration Path

- **v0.1 (Base)**: Fast iteration, low cost, real usage data
- **v0.2+ (Multi-chain)**: IPFS + on-chain hash pattern enables portability to Arbitrum, Optimism, or sovereign chain
