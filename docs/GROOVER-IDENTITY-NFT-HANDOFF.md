# Groover Identity NFT — Handoff

Deployed by the chrono-warp-drive (Dynamo) contract agent from the tech spec at
`groover/docs/GROOVER-IDENTITY-NFT-TECH-SPEC.md`.

```text
network:          base-sepolia
chainId:          84532
contract:         GrooverIdentityToken
name / symbol:    Groover Identity / GRVR
address:          0x68e4E58f66bF332ce5aF704D16B97BAA3c26e8E5
admin:            0xd45CcF98D6db5A36E7CdD10ffae0b685BF27CE43
minter:           0xd45CcF98D6db5A36E7CdD10ffae0b685BF27CE43   # GROOVER_MINTER (Sepolia = deployer)
MAX_VARIANT:      16
identityKey:      keccak256(abi.encode(did, dna))   # v2 source; Sepolia 0x68e4 is v1 encodePacked
imageBase:        https://registry-production-e2c4.up.railway.app/identity/token-image/
explorer:         https://sepolia.basescan.org/address/0x68e4E58f66bF332ce5aF704D16B97BAA3c26e8E5
abi:              contracts/out/GrooverIdentityToken.sol/GrooverIdentityToken.json
tx deploy:        0xedcc55462ee05941b7d78f1880fd27a53f16c204e5ccb4087f484e952690071f
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
- Mint tx: `0xc320ec1ee7a26adfd9f01c43288a0d3ee62bcf31ed675b2ad0205826ff640da1`
- Duplicate mint reverted: `AlreadyMinted(0xe863e933…)` (gas-estimate revert during duplicate `cast send`)

> Note: an earlier Sepolia deployment (`0xB05227…`) was superseded after review found a
> checks-effects-interactions ordering issue in `mint()` (writes now happen before
> `_safeMint` so a malicious receiver cannot re-enter and double-mint). The address
> above is the redeploy with the fix; repo source == deployed source == verified source.

## Review follow-up (v2 source — not yet redeployed)

Deep review of PR #3 (reviewer `did:groover:93c6e9ee38baa90c`, Groover PoA 4-turn) tightened
the on-chain identity before Groover wires mint:

1. **`identityKey` is `keccak256(abi.encode(did, dna))`**, not `encodePacked`. Packed
   concatenation of a variable-length string and `bytes32` can collide. Sepolia **v1**
   at `0x68e4E58f…` used packed and minted token #1 with DID `did:groover:test0000000001`
   (26 bytes). **Do not mint further on v1. Redeploy Sepolia after this commit** so
   repo source == deployed source.
2. **DID must be exactly 28 bytes**: `did:groover:` + 16 hex (`[0-9a-fA-F]`). Matches
   Groover `didFromEd25519PublicKey`. `"did:groover:"` is 12 bytes.
3. **CEI:** effects + `IdentityMinted` happen before `_safeMint`. Reentrancy test
   covers a minter-role receiver.
4. **CI:** `contracts` job runs `forge test` via `foundry-toolchain`. Existing npm
   `test` / `mcp-test` / `mcp-typecheck` failures (`ioredis`, missing `mcp/tsconfig.json`)
   are **pre-existing on main**, not this collection.

## ⚠️ Spec notes

The original spec's acceptance mint `did:groover:test` is 16 bytes and **reverts**.
Canonical Groover DID is 28 bytes. Spec comment that the prefix is 13 bytes was wrong
(it is 12); a 13-byte loop OOBs.

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