# Constant triangulation (candidates only)

No engine value was changed for this note. Numbers come from `node mcp/scripts/constant-triangulation.mjs` (20,592 expressions). Relative error means `|candidate − constant| / |constant|`.

Atoms: `5/3`, `3`, `π`, `c = 3e8`, `c = 299792458`, `1/α = 137.035999`, `e`, `2.5`, `1.5`, `60`, `360`. Forms: each atom, `sqrt` / square / cube / reciprocal / `ln` / `log10`, every `a ∘ b`, and every `(a ∘ b) ∘ c` for `+ − * /`. Powers `a^b` only when `|b| ≤ 8`.

`2.5 / 1.5 = 5/3` exactly (`2.5/1.5 === 5/3` is true in this run). The Ark ratio in the allowed set is the same number as PHI. Whether Exodus 25 states those cubits is **UNVERIFIED** here; this file only checks the arithmetic.

A hit inside a 20,592-expression net is not a derivation. Expressions that are an atom plus or minus a term near `1/c` are float dust around that atom. Those are marked chance.

## Within 0.1%

| Constant | Candidate | Relative error | Note |
| --- | --- | ---: | --- |
| `T_c = 137` | `1/α = 137.035999` | `0.0002627664233576926` (0.02628%) | Closest atom. `trunc(1/α) = 137` exactly. The other 31 "unique" values inside 0.1% are `1/α` plus a small addend. **Chance / float dust**, except the atom itself. No commit in the provenance study cites the fine-structure constant. Intent **UNVERIFIED**. |
| `P_s = 1.0` | `ln(e)` and `a/a` (11 identities) | `0` | Tautologies. The near-1 ratios such as `(c+1.5)/c` are `1` plus dust. **No non-tautological candidate.** Placeholder. |
| `E_t = 0.5` | `3 − 2.5` | `0` | Also `1.5 / 3 = 0.5` exactly (named check). One unique value in the net. **Chance:** half has many exact writings, and the first commit is a UI `useState(0.5)` with no derivation. |
| `delta_t = 1e-6` | `(360 − 60) / c` with `c = 3e8` | `0` | `(360−60)/299792458` has relative error `0.0006922855944561054` (0.06923%), still inside 0.1%. Only these two expressions in the net land inside 0.1%. The exact hit uses the rounded `c`. Historical intent **UNVERIFIED**. |
| `voids = 7` | `((5/3) + 3) * 1.5` | `0` | One unique value. `(5/3 + 3) * 3/2 = 7`. **Chance:** a small integer is easy to assemble from this set. Intent **UNVERIFIED**. |
| `n = 3` | the atom `3` (`L`) | `0` | Other uniques are `3` plus a `1/c` speck. **Chance** that the exponent default repeats Trinity, or a copy. Intent **UNVERIFIED**. |
| `TAU = 0.865` | `e / π = 0.8652559794322651` | `0.0002959299794971958` (0.02959%) | Only one expression in the net is inside 0.1%. Still a single hit in 20,592 formulas, so **chance is open**. No repo citation. |

## Outside 0.1%

| Constant | Candidate | Relative error |
| --- | --- | ---: |
| `TAU = 0.865` | `sqrt(3) / 2 = 0.8660254037844386` | `0.0011840343019473797` (0.1184%) |
| `5.781e12` | `c * (1/α)^2 = 5633659506578.4` with `c = 3e8` | `0.02548702532807466` (2.549%) |
| `5.781e12` | `c^1.5` with `c = 3e8` | `0.10116719897826815` (10.12%) |
| `5.781e12` | `(c * 60) * 360` with `c = 3e8` | `0.1209133367929424` (12.09%) |

`sqrt(3)/2` is close to TAU and **misses** the 0.1% line. `e/π` is closer and inside it. Neither is a finding.

## Default chain vs `5.781e12`

Same script, default inputs `T_c=137`, `P_s=1`, `E_t=0.5`, `delta_t=1e-6`, `voids=7`, `n=3`, `TAU=0.865`, `c=3e8`.

| PHI | tPTT | BlackHole_Seq | raw TDF |
| --- | ---: | ---: | ---: |
| `1666/1000` | `136945200000000000` | `2.8578226083061864` | `41450297739162020` |
| `5/3` | `137000000000000000` | `2.974442614528435` | `39841077928742510` |

`5.781e12 / raw TDF` is `0.00013946823823506925` (truncated PHI) and `0.0001451014957562034` (`5/3`). Relative error of treating the base as that raw TDF is `0.9998605317617649` and `0.9998548985042438`. `raw TDF / base` is `7170.091288559422` and `6891.727716440497`. Those are not `5/3`, `3`, `π`, `60`, or `360`.

`base / TAU`, `base / BlackHole_Seq`, and `base / tPTT` are likewise not small-integer combinations of the known atoms (the search above already found nothing within 0.1%). With `voids=1`, `n=1`, BlackHole_Seq is `1.8564073464102062` (truncated PHI) and `1.8584073464102069` (`5/3`), not `5.781e12`.

`vortexMath.ts` adds the base to an 8-digit fingerprint of `rawTdf / 1e9`. The base is an anchor sitting next to the chain, not the chain's default output. **No candidate within 0.1%.**
