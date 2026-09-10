# Groover Identity NFT — Handoff

Deployed by the chrono-warp-drive (Dynamo) contract agent from the tech spec at
`groover/docs/GROOVER-IDENTITY-NFT-TECH-SPEC.md`.

## Base mainnet (8453) — LIVE v2 (Level trait)

```text
network:          base
chainId:          8453
contract:         GrooverIdentityToken (+OpenSea Level, PR #4)
name / symbol:    Groover Identity / GRVR
address:          0x7b184bf7B7054A7328a1D7851465c6001Bb2AFb3
admin:            0xd45CcF98D6db5A36E7CdD10ffae0b685BF27CE43
minter:           0x77E7A48609e9c8A77C7639172af9EEA0e5E80DF7   # Groover Railway GRVR_PRIVATE_KEY signer
MAX_VARIANT:      16
MAX_LEVEL:        5   # 0 Unknown, 1 Dissonant, 2 Unstable, 3 Resonant, 4 Celestial (Dynamo 7D buckets)
identityKey:      keccak256(abi.encode(did, dna))
imageBase:        https://registry-production-e2c4.up.railway.app/identity/token-image/
explorer:         https://basescan.org/address/0x7b184bf7B7054A7328a1D7851465c6001Bb2AFb3
abi:              contracts/abi/GrooverIdentityToken.json (this tree is v3 8-arg imageSvg; live chain is still v2 until redeploy)
tx deploy:        0x838645d2790a8f02385b07c296d17e72f00874037b8387f9ef5eeebf2bc66965
forge:            forge script script/DeployGrooverIdentity.s.sol --rpc-url base --broadcast --verify
```

Verified on Basescan ✅ · `hasRole(MINTER_ROLE, 0x77E7…)` == true ✅ · `totalSupply == 0`
(no test mint on mainnet). Railway vars point here now:
`GRVR_CONTRACT=0x7b184bf7B7054A7328a1D7851465c6001Bb2AFb3`, `GRVR_CHAIN_ID=8453`,
`GRVR_RPC_URL=https://mainnet.base.org`.

⚠️ **Mint signature (v2 live vs v3 source):** live v2 `0x7b184bf7…` is still 7-arg
`(to, did, dna, pack, variant, dynamoCitation, level)` until the other agent deploys v3
and Railway `GRVR_CONTRACT` flips. Source `mint()` now takes 8 args —
`(to, did, dna, pack, variant, dynamoCitation, level, imageSvg)`. `imageSvg` is 32–16384
bytes, no control chars `< 0x20`. `tokenURI.image` is `data:image/svg+xml;base64,...`;
`IMAGE_BASE` stays the Railway URL and is now `external_url` — do not change that string.
Deployer needs `DEPLOYER_PRIVATE_KEY` + `GROOVER_MINTER`. This Groover CLI cannot deploy
(no `DEPLOYER_PRIVATE_KEY`). Previous v1 mainnet contract `0x0abcd80C…` (6-arg mint) is
superseded — do not mint there.

## Base mainnet (8453) — v1 history (superseded)

```text
network:          base
chainId:          8453
contract:         GrooverIdentityToken
name / symbol:    Groover Identity / GRVR
address:          0x0abcd80C929Ff2f6c308958B112b7925801750D7
admin:            0xd45CcF98D6db5A36E7CdD10ffae0b685BF27CE43
minter:           0x77E7A48609e9c8A77C7639172af9EEA0e5E80DF7   # Groover Railway GRVR_PRIVATE_KEY signer
MAX_VARIANT:      16
identityKey:      keccak256(abi.encode(did, dna))
imageBase:        https://registry-production-e2c4.up.railway.app/identity/token-image/
explorer:         https://basescan.org/address/0x0abcd80C929Ff2f6c308958B112b7925801750D7
abi:              contracts/abi/GrooverIdentityToken.json
tx deploy:        0x24d7874b3ae2f499484fda8740b49ffbe8d76ed35678f63985a8849b8bfd600a
forge:            forge script script/DeployGrooverIdentity.s.sol --rpc-url base --broadcast --verify
```

Verified on Basescan ✅ · `hasRole(MINTER_ROLE, 0x77E7…)` == true ✅ · No test mint
on mainnet — Groover MCP mints the first real DID. Railway vars:
`GRVR_CONTRACT=0x0abcd80C929Ff2f6c308958B112b7925801750D7`, `GRVR_CHAIN_ID=8453`,
`GRVR_RPC_URL=https://mainnet.base.org`.

## Base Sepolia (84532) — v2 history (Level trait)

```text
address:          0x6C61feb8389c99EBf00576E7A110140866C5D9fF
explorer:         https://sepolia.basescan.org/address/0x6C61feb8389c99EBf00576E7A110140866C5D9fF
tx deploy:        0x1984892255034490e57778dc9fbde10f22ba01e069caf4679bfd9804fff40fd5
mint test tx:     0x8a9ef90ada6eedd969256fc8bc98ef7800dcd370cf7f539a386f38e3041b1cfc  (level 3 = Resonant)
```

Acceptance: `tokenURI(1)` carries `{"trait_type":"Level","value":"Resonant"}` ✅;
level 5 reverts `InvalidLevel` ✅; deployer temp-grant used for the test mint then
revoked (final: minter = Railway only) ✅.

## Base Sepolia (84532) — v1 history

```text
network:          base-sepolia
chainId:          84532
contract:         GrooverIdentityToken
name / symbol:    Groover Identity / GRVR
address:          0xFc644D08cd98f11BB952a4E9b04f5Ad0b312D683
admin:            0xd45CcF98D6db5A36E7CdD10ffae0b685BF27CE43
minter:           0xd45CcF98D6db5A36E7CdD10ffae0b685BF27CE43   # deployer (Sepolia admin+minter)
railway minter:   0x77E7A48609e9c8A77C7639172af9EEA0e5E80DF7   # granted MINTER_ROLE, tx 0x6a45bf…0e2057
MAX_VARIANT:      16
identityKey:      keccak256(abi.encode(did, dna))
imageBase:        https://registry-production-e2c4.up.railway.app/identity/token-image/
explorer:         https://sepolia.basescan.org/address/0xFc644D08cd98f11BB952a4E9b04f5Ad0b312D683
abi:              contracts/abi/GrooverIdentityToken.json
tx deploy:        0xd724d2c2d49798bb579cb0df952ee4534d4309288f61fa52c0923ca308d23d7d
forge:            forge script script/DeployGrooverIdentity.s.sol --rpc-url base_sepolia --broadcast --verify
```

## Source files (chrono-warp-drive)

| File | Purpose |
|------|---------|
| `contracts/GrooverIdentityToken.sol` | The contract (ERC721Enumerable + AccessControl) |
| `contracts/script/DeployGrooverIdentity.s.sol` | Deploy script (admin = deployer EOA, minter = `GROOVER_MINTER`) |
| `contracts/test/GrooverIdentityToken.t.sol` | 32 tests (reentrancy, escaping, DID/key rules, on-chain SVG) |
| `contracts/abi/GrooverIdentityToken.json` | Committed ABI (`out/` is gitignored) |

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

- Call `mint(address to, string did, bytes32 dna, string pack, uint8 variant, bytes32 dynamoCitation, uint8 level, string imageSvg)` as the `GROOVER_MINTER` key (v3). Live v2 is 7-arg until deploy + `GRVR_CONTRACT` flip.
- `to` = the holder address; `dynamoCitation = bytes32(0)` if none. `imageSvg` is compositor SVG compacted (no chars `< 0x20`).
- `level`: 0 Unknown (no Dynamo), 1 Dissonant, 2 Unstable, 3 Resonant, 4 Celestial (OpenSea trait `Level`). From Dynamo 7D: ≥0.95 / ≥0.78 / ≥0.50 / scored-else Dissonant. Missing sun is Unknown, not Dissonant. This is a **new deploy**; Sepolia `0xFc644D…` and mainnet `0x0abcd80C…` do not have `level`.
- Pack whitelist stays application-side (contract accepts any non-empty pack ≤ 64 bytes, no control bytes).
- Image compositor still serves `{tokenId}` under the Groover Railway image route (v2 `image`; v3 `external_url`).
- Live v2 ABI stays at groover `packages/identity/abi/GrooverIdentityToken.json`. v3 ABI is `packages/identity/abi/GrooverIdentityToken.v3.json` (from `out/GrooverIdentityToken.sol/GrooverIdentityToken.json` `.abi`). Do not overwrite the v2 ABI.
- Round-2 check: local runtime bytecode matches Sepolia `0xFc644D…` **except** the solc metadata hash (CBOR tail). Opcodes identical; no redeploy needed for this commit.