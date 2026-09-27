# Constant triangulation (candidates only)

No engine value was changed. Every number below is from `node mcp/scripts/constant-triangulation.mjs`. These rows are candidates. A derivation would need a citation in the repo. Historical intent is **UNVERIFIED**.

## Rules (fixed before the search)

An expression is a product of `k` terms, `k` in `{1, 2, 3}`. A quotient is a negative exponent. Addition, subtraction, roots, and logarithms are outside this grammar.

Atoms, in order, with the values the script uses:

| name | value |
| --- | --- |
| `5/3` | `5/3` |
| `3` | `3` |
| `pi` | `Math.PI` |
| `c` | `3e8` |
| `c_si` | `299792458` |
| `inv_alpha` | `137.035999` |
| `e` | `Math.E` |
| `2.5` | `2.5` |
| `1.5` | `1.5` |
| `60` | `60` |
| `360` | `360` |

Each term is one atom raised to an exponent in `{-2, -1, 1, 2}`. Exponent `0` is excluded: `a^0 = 1` deletes the atom. The same atom may appear more than once, including the same exponent twice.

Order does not matter. The script enumerates combinations with replacement of the `(atom, exponent)` pairs.

Relative error is `|expression − target| / |target|`. The winner is the smallest relative error, then the fewer terms, then the lexicographic label.

Count: `11 × 4 = 44` factors. Combinations with replacement give `C(44,1) + C(45,2) + C(46,3) = 44 + 990 + 15180 = 16214`. The script throws if `expressions + nonFinite` is anything else. This run has `nonFinite = 0`. Each constant is scored against those same **16214** expressions.

Controls, identical search: for each constant, **200** numbers (above the 20 required) drawn log-uniform on `[target / sqrt(10), target * sqrt(10)]` with `mulberry32`. The seed for target index `t` is `20260927 + t`, in the order `T_c`, `P_s`, `E_t`, `delta_t`, `voids`, `n`, `TAU`, `vortex_base`. Percentile is `100 * (controls whose best error is strictly greater than the constant's best error) / 200`. A constant is **notable** only when that percentile is at least **95**. Otherwise the verdict is **no better than chance**.

`2.5 / 1.5 = 5/3` is true in this runtime (`(2.5)^1 * (1.5)^-1`). That is arithmetic among atoms. Whether Exodus 25 states those cubits is **UNVERIFIED**.

## Results

| Constant | Expressions tried | Winner | Terms | Value | Relative error | Percentile | Verdict |
| --- | ---: | --- | ---: | ---: | ---: | ---: | --- |
| `T_c = 137` | 16214 | `(inv_alpha)^1` | 1 | `137.035999` | `0.0002627664233576926` | 87.5 | no better than chance |
| `P_s = 1` | 16214 | `(1.5)^-1 * (1.5)^1` | 2 | `1` | `0` | 100 | notable |
| `E_t = 0.5` | 16214 | `(3)^-1 * (1.5)^1` | 2 | `0.5` | `0` | 100 | notable |
| `delta_t = 1e-6` | 16214 | `(5/3)^-2 * (5/3)^-2 * (360)^-2` | 3 | `0.000001` | `0` | 100 | notable |
| `voids = 7` | 16214 | `(pi)^-1 * (inv_alpha)^1 * (2.5)^-2` | 3 | `6.979186119163529` | `0.0029734115480672635` | 11 | no better than chance |
| `n = 3` | 16214 | `(3)^1` | 1 | `3` | `0` | 100 | notable |
| `TAU = 0.865` | 16214 | `(pi)^-1 * (e)^1` | 2 | `0.8652559794322651` | `0.0002959299794971958` | 81 | no better than chance |
| `vortex_base = 5.781e12` | 16214 | `(c)^2 * (c_si)^-1 * (inv_alpha)^2` | 3 | `5637559607898.876` | `0.024812384034098602` | 13.5 | no better than chance |

`P_s` wins on the identity `a^1 * a^-1 = 1`. Every atom has that identity. No 1-term expression equals `1`. The percentile is 100 because every control's best error is above 0. That does not supply a derivation.

`E_t` is `(1.5) / 3 = 0.5` in this runtime. `n` is the atom `3`, which is `L`. `delta_t` is exact in integer arithmetic: `(3/5)^4 / 360^2 = 81 / (625 * 129600) = 81 / 81000000 = 1e-6`, and the script value `=== 1e-6`. Intent for each exact hit is **UNVERIFIED**.

`sqrt(3) / 2 = 0.8660254037844386` sits `0.001185437901085093` away from `TAU` under the same relative-error definition. Exponent `1/2` and a bare factor `2` are outside the grammar, so that comparison is not a search hit. The in-grammar winner `e / π` is **no better than chance** (percentile 81). One control in that band has best error `0.000018027318869462717`, tighter than `0.0002959299794971958`.

## Control best-error distribution

Each row is the best relative error of 200 log-uniform controls. Quantiles are linear interpolation on the sorted sample (`(n − 1) * p`).

| Constant | Seed | Band | min | p05 | p25 | p50 | p75 | p95 | max |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `T_c` | 20260927 | `[43.3232039443068, 433.232039443068]` | `0.000005335407384145536` | `0.00012349577163559905` | `0.0005663394937515354` | `0.0013953339307952862` | `0.0027002249870094774` | `0.005395781615873046` | `0.007320217521624294` |
| `P_s` | 20260928 | `[0.31622776601683794, 3.1622776601683795]` | `0.000007267380985441219` | `0.0000998129346029036` | `0.0003617840701575432` | `0.0009307425820240807` | `0.001938425834852589` | `0.0033576299139270404` | `0.004984331478088237` |
| `E_t` | 20260929 | `[0.15811388300841897, 1.5811388300841898]` | `0.0000033734682390577055` | `0.00010385484884655396` | `0.00043655100169979534` | `0.0012392414909350416` | `0.002241213877399793` | `0.004012327411469985` | `0.006498669287096275` |
| `delta_t` | 20260930 | `[3.162277660168379e-7, 0.000003162277660168379]` | `0.000013384200918749834` | `0.00020347942276791284` | `0.0013231671747885826` | `0.003289350599220153` | `0.005676493298260928` | `0.011226859901286657` | `0.020139531994119955` |
| `voids` | 20260931 | `[2.2135943621178655, 22.135943621178658]` | `0.000003629708437304248` | `0.00007858728149593478` | `0.0003831662197177213` | `0.0008954719954605457` | `0.0020110400032784526` | `0.0038434151406348646` | `0.00737369345563832` |
| `n` | 20260932 | `[0.9486832980505138, 9.486832980505138]` | `0.000012418768422690284` | `0.00009117352155749064` | `0.0004501023760298342` | `0.001072216026283938` | `0.001990062569483426` | `0.004321733009148172` | `0.006320853147467418` |
| `TAU` | 20260933 | `[0.2735370176045648, 2.7353701760456484]` | `0.000018027318869462717` | `0.00006591143867011958` | `0.0004660059795229415` | `0.0010115033091304066` | `0.001955209823761337` | `0.0031185832601224833` | `0.004908584117886306` |
| `vortex_base` | 20260934 | `[1828112715343.34, 18281127153433.402]` | `0.0000317467424358035` | `0.0003495659856844722` | `0.0036013077012642075` | `0.00982944075767318` | `0.017447126678067006` | `0.03510634525149339` | `0.04914261726014441` |

## `5.781e12` against the default chain

Separate from the grammar. Defaults `T_c=137`, `P_s=1`, `E_t=0.5`, `delta_t=1e-6`, `voids=7`, `n=3`, `TAU=0.865`, `c=3e8`, `L=3`.

| PHI | tPTT | BlackHole_Seq | raw TDF |
| --- | ---: | ---: | ---: |
| `1666/1000` | `136945200000000000` | `2.8578226083061864` | `41450297739162020` |
| `5/3` | `137000000000000000` | `2.974442614528435` | `39841077928742510` |

`raw TDF / 5.781e12` is `7170.091288559422` (`1666/1000`) and `6891.727716440497` (`5/3`). `5.781e12 / raw TDF` is `0.00013946823823506925` and `0.0001451014957562034`. The grammar search on the base itself is **no better than chance** (percentile 13.5).
