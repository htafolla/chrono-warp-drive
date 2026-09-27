# Constant triangulation (candidates only)

No engine value was changed. Numbers come from `node scripts/constant-triangulation.mjs`. These rows are an exploratory list. They are no evidence of derivation. None of the constants below is shown to derive from TLM. That includes `delta_t`. Historical intent is **UNVERIFIED**.

## Revision history

`fcd4df31` searched a grammar that included addition and subtraction, plus products. Under that grammar, `voids = 7` matched `((5/3) + 3) * 1.5` with relative error 0. That commit's note treated several hits as inside a 0.1% band.

`2603fef` removed addition and subtraction. It kept products and quotients of at most 3 factors, exponents `{-2, -1, 1, 2}`, and it attached a control percentile. The words "fixed before the search" in that commit were false. The grammar was revised after `fcd4df31`.

This revision drops every percentile and every "notable" label. A smooth log-uniform control almost never lands on an exact product, so an exact hit scores in the extreme tail for that reason alone. Many small integers do the same. There is no correction for searching eight constants at once. A different set of building blocks produces a different closest expression. That procedure cannot tell a real match from chance.

## Current search

An expression is a product of `k` terms, `k` in `{1, 2, 3}`. A quotient is a negative exponent. Addition, subtraction, roots, and logarithms are outside this search.

Atoms: `5/3`, `3`, `π` (`Math.PI`), `c = 3e8`, `c_si = 299792458`, `inv_alpha = 137.035999`, `e` (`Math.E`), `2.5`, `1.5`, `60`, `360`.

Each term is one atom raised to an exponent in `{-2, -1, 1, 2}`. Exponent `0` is excluded because `a^0 = 1` deletes the atom. The same atom may appear more than once. Order does not matter: combinations with replacement of the 44 `(atom, exponent)` pairs.

Relative error is `|expression − target| / |target|`. The closest row is the smallest relative error, then fewer terms, then the lexicographic label.

Count: `C(44,1) + C(45,2) + C(46,3) = 16214`. This run has `nonFinite = 0`. Each constant is compared with those same **16214** expressions.

`2.5 / 1.5 = 5/3` is true in this runtime. That is arithmetic among atoms. Whether Exodus 25 states those cubits is **UNVERIFIED**.

## Closest expressions

| Constant | Expressions tried | Closest expression | Terms | Value | Relative error |
| --- | ---: | --- | ---: | ---: | ---: |
| `T_c = 137` | 16214 | `(inv_alpha)^1` | 1 | `137.035999` | `0.0002627664233576926` |
| `P_s = 1` | 16214 | `(1.5)^-1 * (1.5)^1` | 2 | `1` | `0` |
| `E_t = 0.5` | 16214 | `(3)^-1 * (1.5)^1` | 2 | `0.5` | `0` |
| `delta_t = 1e-6` | 16214 | `(5/3)^-2 * (5/3)^-2 * (360)^-2` | 3 | `0.000001` | `0` |
| `voids = 7` | 16214 | `(pi)^-1 * (inv_alpha)^1 * (2.5)^-2` | 3 | `6.979186119163529` | `0.0029734115480672635` |
| `n = 3` | 16214 | `(3)^1` | 1 | `3` | `0` |
| `TAU = 0.865` | 16214 | `(pi)^-1 * (e)^1` | 2 | `0.8652559794322651` | `0.0002959299794971958` |
| `vortex_base = 5.781e12` | 16214 | `(c)^2 * (c_si)^-1 * (inv_alpha)^2` | 3 | `5637559607898.876` | `0.024812384034098602` |

`P_s` lands on the identity `a^1 * a^-1 = 1`. Every atom has that identity. `E_t` equals `1.5 / 3` in this runtime. `n` is the atom `3`, which is `L`. `delta_t` equals `1e-6` in integer arithmetic: `(3/5)^4 / 360^2 = 81 / 81000000 = 1e-6`, and the script value `=== 1e-6`. Equality in this list is not a derivation from TLM.

`sqrt(3) / 2 = 0.8660254037844386` is `0.001185437901085093` from `TAU` under the same relative-error definition. Exponent `1/2` is outside this search, so that comparison is not one of the 16214 expressions.

## `5.781e12` next to the default chain

Separate from the expression list. Defaults `T_c=137`, `P_s=1`, `E_t=0.5`, `delta_t=1e-6`, `voids=7`, `n=3`, `TAU=0.865`, `c=3e8`, `L=3`.

| PHI | tPTT | BlackHole_Seq | raw TDF |
| --- | ---: | ---: | ---: |
| `1666/1000` | `136945200000000000` | `2.8578226083061864` | `41450297739162020` |
| `5/3` | `137000000000000000` | `2.974442614528435` | `39841077928742510` |

`raw TDF / 5.781e12` is `7170.091288559422` (`1666/1000`) and `6891.727716440497` (`5/3`). The base is not shown to be that default chain.
