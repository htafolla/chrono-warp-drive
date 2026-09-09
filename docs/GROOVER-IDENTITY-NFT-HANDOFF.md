# Groover Identity NFT — Handoff

Deployed by the chrono-warp-drive (Dynamo) contract agent from the tech spec at
`groover/docs/GROOVER-IDENTITY-NFT-TECH-SPEC.md`.

```text
network:          base-sepolia
chainId:          84532
contract:         GrooverIdentityToken
name / symbol:    Groover Identity / GRVR
address:          0xFc644D08cd98f11BB952a4E9b04f5Ad0b312D683
admin:            0xd45CcF98D6db5A36E7CdD10ffae0b685BF27CE43
minter:           0xd45CcF98D6db5A36E7CdD10ffae0b685BF27CE43   # GROOVER_MINTER (Sepolia = deployer)
MAX_VARIANT:      16
identityKey:      keccak256(abi.encode(did, dna))
imageBase:        https://registry-production-e2c4.up.railway.app/identity/token-image/
explorer:         https://sepolia.basescan.org/address/0xFc644D08cd98f11BB952a4E9b04f5Ad0b312D683
abi:              contracts/out/GrooverIdentityToken.sol/GrooverIdentityToken.json
tx deploy:        0xd724d2c2d49798bb579cb0df952ee4534d4309288f61fa52c0923ca308d23d7d
forge:            forge script script/DeployGrooverIdentity.s.sol --rpc-url base_sepolia --broadcast --verify
```

## Source files (chrono-warp-drive)

| File | Purpose |
|------|---------|
| `contracts/GrooverIdentityToken.sol` | The contract (ERC721Enumerable + AccessControl) |
| `contracts/script/DeployGrooverIdentity.s.sol` | Deploy script (admin = deployer EOA, minter = `GROOVER_MINTER`) |
| `contracts/test/GrooverIdentityToken.t.sol` | 24 tests (reentrancy, escaping, DID/key rules) |

## Sepolia verification (done)

1. `forge test` — full suite green (24 Groover tests + 12 TemporalContainer = 36). ✅
2. Verified on Sepolia Basescan. ✅
3. `MINTER_ROLE` holds on `GROOVER_MINTER` (admin == minter == deployer on Sepolia). ✅
4. Test mint succeeded; duplicate mint reverted `AlreadyMinted`. ✅
5. `tokenURI(1)` image host is Groover Railway (`registry-production-e2c4.up.railway.app/identity/token-image/1`), NOT `mcp-production-80e2`. ✅
6. VRTX (`0x7E410f…`) and TemporalContainerRegistry (`0xCB418F…`) untouched. ✅

## Acceptance-test mint (Sepolia, token #1)

- DID: `did:groover:aaaaaaaaaaaaaaaa` (canonical 28-byte hex form)
- DNA: `0xe11c158aa8c88ed84cc7901ad52099ea43b67469e091d102887b27c619bf9995`
- Pack: `groover-identity`, variant 0
- Mint tx: `0xd41c967424fac6e5675220bc5c6547326194bf0b448c08e5e9965b14690c4a62`
- Duplicate mint reverted: `AlreadyMinted(0x41fd7459…)` (gas-estimate revert during duplicate `cast send`)
- Non-canonical DID (`did:groover:test0000000001`, 26 bytes) reverts `InvalidDid` as required.

> Deploy history: `0xB05227…` (v1, packed keys) → `0x68e4E5…` (CEI fix) →
> `0x862300…` (independent-review hardening) → **`0xFc644D…` (final: merged review
> hardening — `abi.encode` keys, exact-28 hex DIDs, control-byte pack rejection,
> forge CI)**. Repo source == deployed source == verified source.

## Review follow-up (merged + redeployed)

Deep review of PR #3 (reviewer `did:groover:93c6e9ee38baa90c`, Groover PoA 4-turn) tightened
the on-chain identity before Groover wires mint, and this deployment includes it:

1. **`identityKey` is `keccak256(abi.encode(did, dna))`**, not `encodePacked`. Packed
   concatenation of a variable-length string and `bytes32` can collide.
2. **DID must be exactly 28 bytes**: `did:groover:` + 16 hex (`[0-9a-fA-F]`). Matches
   Groover `didFromEd25519PublicKey`. `"did:groover:"` is 12 bytes.
3. **CEI:** effects + `IdentityMinted` happen before `_safeMint`. Reentrancy test
   covers a minter-role receiver.
4. **Control bytes (`< 0x20`) rejected in pack** so `tokenURI` JSON stays valid
   (did needs no such check: exact-28 + hex admits none).
5. **CI:** `contracts` job runs `forge test` via `foundry-toolchain`. Existing npm
   `test` / `mcp-test` / `mcp-typecheck` failures (`ioredis`, missing `mcp/tsconfig.json`)
   are **pre-existing on main**, not this collection.

## ⚠️ Spec notes

The original spec's acceptance mint `did:groover:test` is 16 bytes and **reverts**
(expected: only canonical 28-byte hex DIDs mint). Spec comment that the prefix is
13 bytes was wrong (it is 12); a 13-byte loop OOBs. `identityKey` is `abi.encode`,
not `encodePacked`, per review decision (Groover off-chain code must use the same).

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
- Pack whitelist stays application-side (contract accepts any non-empty pack ≤ 64 bytes, no control bytes).
- Image compositor will serve `{tokenId}` under the Groover Railway image route.
- ABI copied to `packages/identity/abi/GrooverIdentityToken.json` in the groover repo.