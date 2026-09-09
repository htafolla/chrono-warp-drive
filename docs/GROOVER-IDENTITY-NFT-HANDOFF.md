# Groover Identity NFT — Handoff

Deployed by the chrono-warp-drive (Dynamo) contract agent from the tech spec at
`groover/docs/GROOVER-IDENTITY-NFT-TECH-SPEC.md`.

```text
network:          base-sepolia
chainId:          84532
contract:         GrooverIdentityToken
name / symbol:    Groover Identity / GRVR
address:          0x862300BE81F3f7a4A6166c1E3468EA7845f2E524
admin:            0xd45CcF98D6db5A36E7CdD10ffae0b685BF27CE43
minter:           0xd45CcF98D6db5A36E7CdD10ffae0b685BF27CE43   # GROOVER_MINTER (Sepolia = deployer)
MAX_VARIANT:      16
identityKey:      keccak256(abi.encodePacked(did, dna))
imageBase:        https://registry-production-e2c4.up.railway.app/identity/token-image/
explorer:         https://sepolia.basescan.org/address/0x862300BE81F3f7a4A6166c1E3468EA7845f2E524
abi:              contracts/out/GrooverIdentityToken.sol/GrooverIdentityToken.json
tx deploy:        0xb6a4cb032027cd02441ab326efe0c7535c56fd072533a8ce1af0ae7db664d17c
forge:            forge script script/DeployGrooverIdentity.s.sol --rpc-url base_sepolia --broadcast --verify
```

## Source files (chrono-warp-drive)

| File | Purpose |
|------|---------|
| `contracts/GrooverIdentityToken.sol` | The contract (ERC721Enumerable + AccessControl) |
| `contracts/script/DeployGrooverIdentity.s.sol` | Deploy script (admin = deployer EOA, minter = `GROOVER_MINTER`) |
| `contracts/test/GrooverIdentityToken.t.sol` | 13 tests, all green (25 total in repo incl. TemporalContainer) |

## Sepolia verification (done)

1. `forge test` — full suite green (13 new Groover tests + 12 existing). ✅
2. Verified on Sepolia Basescan. ✅
3. `MINTER_ROLE` holds on `GROOVER_MINTER` (admin == minter == deployer on Sepolia). ✅
4. Test mint succeeded; duplicate mint reverted `AlreadyMinted`. ✅
5. `tokenURI(1)` image host is Groover Railway (`registry-production-e2c4.up.railway.app/identity/token-image/1`), NOT `mcp-production-80e2`. ✅
6. VRTX (`0x7E410f…`) and TemporalContainerRegistry (`0xCB418F…`) untouched. ✅

## Acceptance-test mint (Sepolia, token #1)

- DID: `did:groover:test0000000001`
- DNA: `0xac0822c2ea23a7ed642faf1429347ab984822960c3b1e0146b8631b50e270f7b`
- Pack: `groover-identity`, variant 0
- Mint tx: `0x9e7c7a7cd6f319abb1d6368a838db2fc486d71363d20579770f43de15c556ef6`
- Duplicate mint reverted: `AlreadyMinted(0xe863e933…)` (gas-estimate revert during duplicate `cast send`)

> Deploy history: an earlier Sepolia deployment (`0xB05227…`) was superseded after
> review found a checks-effects-interactions ordering issue in `mint()`; a second
> deployment (`0x68e4E5…`) was then superseded after an independent review pass
> (control bytes `< 0x20` now rejected in did/pack so `tokenURI` JSON stays valid,
> DID length capped at 128, dead prefix-guard removed, `tokenByIdentity` 0-sentinel
> documented, 7 more tests). The address above is the final build; repo source ==
> deployed source == verified source. Test suite: 32/32 green (20 Groover + 12 Temporal).

## ⚠️ Spec deviation worth noting (DID length)

The spec's acceptance criterion (9.4) says mint with `did:groover:test`. That DID is
16 bytes and **reverts `InvalidDid`** because the contract enforces `len >= 25` AND prefix
`did:groover:`. Note `"did:groover:"` is **12 bytes, not 13** (the spec comment miscounted;
a 13-byte comparison caused an array-OOB bug during dev, fixed to 12). Canonical DID
`did:groover:<16 hex>` = 28 bytes. Use pad-short test DIDs to ≥ 25 bytes, or full `did:groover:` + 16 hex.

## Before Base mainnet

- **Blocked on Groover:** deployer must confirm the Groover Railway signer key IS the
  `GROOVER_MINTER` address to grant. On Sepolia, minter == deployer EOA
  (`0xd45CcF…43`). Do **not** run the `base` deploy until Groover supplies the real
  Railway minter address.
- Update `contracts/.env`: `GROOVER_MINTER=<railway signer>`, then:
  ```bash
  forge script script/DeployGrooverIdentity.s.sol --rpc-url base --broadcast --verify
  ```
- Verify `hasRole(MINTER_ROLE, GROOVER_MINTER)` on-chain before handoff if they differ.
- Base mainnet explorer becomes `https://basescan.org/address/<addr>`; do not mint the
  test token on mainnet — Groover's MCP mints real DIDs.

## Groover-side integration (not in this repo)

- Call `mint(address to, string did, bytes32 dna, string pack, uint8 variant, bytes32 dynamoCitation)` as the `GROOVER_MINTER` key.
- `to` = the holder address; `dynamoCitation = bytes32(0)` if none.
- Pack whitelist stays application-side (contract accepts any non-empty pack ≤ 64 bytes).
- Image compositor will serve `{tokenId}` under the Groover Railway image route.
- ABI copied to `packages/identity/abi/GrooverIdentityToken.json` in the groover repo.