# PHI = 5/3 behavior change

**After merge, governance is REJECT by default, and this needs Blaze's explicit acceptance.**

The formulas, the decision thresholds, and `cross_correlate` are unchanged. This file records what the PHI binding does to those unchanged formulas. The live deployed effect is **UNVERIFIED**. Nothing here was deployed, and this measurement does not set `persistToChain`.

`cross_correlate` strength is one constant for every input: `0.9524567885544127` on `origin/main`, `0.06480165906835389` on this branch. `evaluate_governance` on the 43 texts below is 43 PASS on main, and 34 REJECT plus 9 PASS on this branch. All 9 PASS rows pass only because the solar hammer is `>= 0.88`. `govern_with_solar`'s `recommendation`, the field that gates the on-chain write, flips on **0 of these 43**.

## How this was measured

`npx tsx scripts/phi-before-after.ts` runs `scripts/phi-governance-worker.ts` against `origin/main` (`dffb7520b918d7b00817937ef4e708ccddd3c31f`) and against this checkout. The worker imports each tree's own modules. Verdicts are printed from those processes. They are not stored in the script.

Clock: `Date.now` is pinned to `Date.UTC(2026, 8, 27, 21, 30, 0)`, which is `1790544600000` (`2026-09-27T21:30:00.000Z`). NOAA fetches return `[]`. The sun embedding and the isotopic-embedding fetch are fixed stubs. `sharp` is absent, so sentence embeddings use the FNV fallback on both trees. The script exits if `REDIS_URL` is set, so the governance history write cannot run.

The 43 texts are the `PROPOSALS` array in `scripts/phi-governance-worker.ts`. Every `/governance` call uses the same review sentence: `The review text is fixed and does not depend on the clock.`

## cross_correlate ignores the proposal text

`evaluate_governance` gets its strength from the tool handler. That handler, and the HTTP route, both build the two signals with fixed tdf values:

```850:851:mcp/index.ts
  const sigA = new TemporalBlurrnSignal({ content: contentA }, 5.781e12, 42)
  const sigB = new TemporalBlurrnSignal({ content: contentB ?? 'reference-signal' }, 5.782e12, 43)
```

```1421:1422:mcp/index.ts
    const sigA = new TemporalBlurrnSignal({ content: args.contentA }, 5.781e12, 42)
    const sigB = new TemporalBlurrnSignal({ content: args.contentB ?? 'reference-signal' }, 5.782e12, 43)
```

The content strings are stored on the signal. The strength is `tdf % sqrt(PHI)` in the constructor at `mcp/index.ts:212` and `mcp/lib/temporalBlurrnSignal.ts:22`. On `origin/main` that inlined class still has a decimal `PHI` literal. This branch imports `PHI` from `mcp/lib/tlmConstants.ts`, which is `5/3`. The constants module was already `5/3` on `origin/main`. The strength moves because the inlined copy changed.

Three content pairs, including two unrelated sentences and proposal 0 against proposal 1, produced one strength on each tree:

| checkout | strength |
| --- | ---: |
| `origin/main` | `0.9524567885544127` |
| this branch | `0.06480165906835389` |

That strength is the same for every input. Phase coherence on an emit at tdf `5.781e12` is `0.9201057634376291` before and `0.011784100280144108` after. Wave amplitude at `t=0.5`, `n=3`, isotope `Trinitarium-166` is `2` before and `-1.838502342895978` after.

## evaluate_governance applies to every proposal

`mcp/governance.ts:153` replaces resonance with the solar hammer when the hammer is `>= 0.88` or `<= 0.45`:

```153:155:mcp/governance.ts
      if (solarHammerRes >= 0.88 || solarHammerRes <= 0.45) {
        resonance = solarHammerRes // use hammer as the resonance for matrix
      }
```

Otherwise resonance is the cross strength above. The matrix then does: resonance `>= 0.90` is PASS at confidence `0.93`; `>= 0.80` is PASS at `0.86`; `>= 0.68` is NEEDS_REVISION at `0.76`; anything lower is REJECT at confidence `0.8`.

On this clock and these 43 texts:

- `origin/main`: **43 PASS**
- this branch: **34 REJECT** at confidence `0.8`, and **9 PASS**
- all 9 PASS rows have resonance equal to the hammer, and that hammer is `>= 0.88`
- the 34 REJECT rows keep resonance at `0.06480165906835389`, because their hammer sits inside `(0.45, 0.88)`

A hammer `<= 0.45` would also replace resonance, and that value is still REJECT at confidence `0.8`. The only way a call on this branch returns PASS is a hammer `>= 0.88`. The nine are `p01`, `p02`, `p05`, `p09`, `p10`, `p20`, `p29`, `p38`, and `p40`.

So after merge, every `/governance` call is REJECT at confidence `0.8` unless the solar hammer is high enough to take over. That is the whole input set, because the strength does not depend on the proposal text.

## govern_with_solar recommendation

The on-chain write reads `result.recommendation` before it persists:

```1756:1758:mcp/index.ts
    // Resonance gate: only persist non-REJECT verdicts
    const verdict = result.recommendation || result.fullBox7DVerdict
    if (verdict === 'REJECT') {
```

This run does not set `persistToChain`. It does record `recommendation` for the same 43 texts.

**Measured flips: 0 of 43.** Each id keeps the same enum. Both trees are 26 PASS, 9 NEEDS_REVISION, and 8 REJECT. Confidence does not change either. Structural resonance does move. The largest absolute change on this list is `p16`, from `0.8822461798282215` to `0.8684409931984414`. Both stay at PASS with confidence `0.93`. The stubbed solar context is using the quiet thresholds in `mcp/lib/dynamoSolarGovernance.ts` (`strong` `0.86`, `good` `0.78`, `weak` `0.64`): a resonance of `0.8765806774997267` (`p08`) is already PASS at confidence `0.93`, which sits under a `0.88` strong bar and on the `0.86` bar. None of the 43 crossed `0.86`, `0.78`, or `0.64`.

The chain-write gate for these 43 proposals is the same enum on both trees. The `/governance` verdict above is the one that becomes REJECT by default.

## Table

| checkout | evaluate_governance | govern_with_solar recommendation |
| --- | --- | --- |
| `origin/main` | 43 PASS | 26 PASS, 9 NEEDS_REVISION, 8 REJECT |
| this branch | 34 REJECT, 9 PASS | 26 PASS, 9 NEEDS_REVISION, 8 REJECT |

| id | governance before | confidence | resonance | hammer | governance after | confidence | resonance | hammer | govern_with_solar before | govern_with_solar after |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- | --- |
| p00 | PASS | 0.93 | 0.9524567885544127 | 0.8630983117062428 | REJECT | 0.8 | 0.06480165906835389 | 0.798626417089343 | PASS | PASS |
| p01 | PASS | 0.93 | 0.9499159659212001 | 0.9499159659212001 | PASS | 0.86 | 0.8890297583200387 | 0.8890297583200387 | PASS | PASS |
| p02 | PASS | 0.93 | 0.9015921699356451 | 0.9015921699356451 | PASS | 0.93 | 0.9192145339966564 | 0.9192145339966564 | PASS | PASS |
| p03 | PASS | 0.93 | 0.9524567885544127 | 0.8392224552100032 | REJECT | 0.8 | 0.06480165906835389 | 0.8316728349693114 | PASS | PASS |
| p04 | PASS | 0.93 | 0.9524567885544127 | 0.5447774529426719 | REJECT | 0.8 | 0.06480165906835389 | 0.5650205234472531 | REJECT | REJECT |
| p05 | PASS | 0.93 | 0.9524567885544127 | 0.8425761904972453 | PASS | 0.86 | 0.8820553945002687 | 0.8820553945002687 | PASS | PASS |
| p06 | PASS | 0.93 | 0.9524567885544127 | 0.860024089312734 | REJECT | 0.8 | 0.06480165906835389 | 0.870531188600725 | PASS | PASS |
| p07 | PASS | 0.93 | 0.9524567885544127 | 0.8085828554390915 | REJECT | 0.8 | 0.06480165906835389 | 0.8455707784778033 | PASS | PASS |
| p08 | PASS | 0.93 | 0.9524567885544127 | 0.8199097635600463 | REJECT | 0.8 | 0.06480165906835389 | 0.7748883554093584 | PASS | PASS |
| p09 | PASS | 0.93 | 0.9496265970931483 | 0.9496265970931483 | PASS | 0.86 | 0.8879481143676387 | 0.8879481143676387 | PASS | PASS |
| p10 | PASS | 0.93 | 0.9104607600817014 | 0.9104607600817014 | PASS | 0.86 | 0.8840303722753848 | 0.8840303722753848 | PASS | PASS |
| p11 | PASS | 0.93 | 0.9024286021171818 | 0.9024286021171818 | REJECT | 0.8 | 0.06480165906835389 | 0.8462860608437692 | PASS | PASS |
| p12 | PASS | 0.93 | 0.9524567885544127 | 0.5305551165170308 | REJECT | 0.8 | 0.06480165906835389 | 0.5081030290863059 | REJECT | REJECT |
| p13 | PASS | 0.93 | 0.9524567885544127 | 0.7322852370165178 | REJECT | 0.8 | 0.06480165906835389 | 0.7204458930907754 | NEEDS_REVISION | NEEDS_REVISION |
| p14 | PASS | 0.93 | 0.9524567885544127 | 0.6977855449792769 | REJECT | 0.8 | 0.06480165906835389 | 0.6351643068015391 | NEEDS_REVISION | NEEDS_REVISION |
| p15 | PASS | 0.93 | 0.9524567885544127 | 0.4764603278148156 | REJECT | 0.8 | 0.06480165906835389 | 0.5399278698896318 | REJECT | REJECT |
| p16 | PASS | 0.93 | 0.9524567885544127 | 0.8381656972771407 | REJECT | 0.8 | 0.06480165906835389 | 0.7471082706687171 | PASS | PASS |
| p17 | PASS | 0.93 | 0.9524567885544127 | 0.5621376220176543 | REJECT | 0.8 | 0.06480165906835389 | 0.548338986178972 | REJECT | REJECT |
| p18 | PASS | 0.93 | 0.9524567885544127 | 0.685809331060956 | REJECT | 0.8 | 0.06480165906835389 | 0.6437187481479515 | NEEDS_REVISION | NEEDS_REVISION |
| p19 | PASS | 0.93 | 0.9231859044768949 | 0.9231859044768949 | REJECT | 0.8 | 0.06480165906835389 | 0.8785405658794719 | PASS | PASS |
| p20 | PASS | 0.93 | 0.9154438771371969 | 0.9154438771371969 | PASS | 0.93 | 0.9161678229446337 | 0.9161678229446337 | PASS | PASS |
| p21 | PASS | 0.93 | 0.9524567885544127 | 0.6760448220941342 | REJECT | 0.8 | 0.06480165906835389 | 0.6478999898232909 | NEEDS_REVISION | NEEDS_REVISION |
| p22 | PASS | 0.93 | 0.9028967887212443 | 0.9028967887212443 | REJECT | 0.8 | 0.06480165906835389 | 0.8333362319817802 | PASS | PASS |
| p23 | PASS | 0.93 | 0.9524567885544127 | 0.7426074880261084 | REJECT | 0.8 | 0.06480165906835389 | 0.7420903253218529 | PASS | PASS |
| p24 | PASS | 0.93 | 0.9524567885544127 | 0.5746122959719795 | REJECT | 0.8 | 0.06480165906835389 | 0.4995686004971625 | REJECT | REJECT |
| p25 | PASS | 0.93 | 0.9524567885544127 | 0.8782372128523787 | REJECT | 0.8 | 0.06480165906835389 | 0.8477517901010405 | PASS | PASS |
| p26 | PASS | 0.93 | 0.9524567885544127 | 0.7429669418433462 | REJECT | 0.8 | 0.06480165906835389 | 0.7505048943450223 | PASS | PASS |
| p27 | PASS | 0.93 | 0.9524567885544127 | 0.681272265967148 | REJECT | 0.8 | 0.06480165906835389 | 0.6853957609265275 | NEEDS_REVISION | NEEDS_REVISION |
| p28 | PASS | 0.93 | 0.9524567885544127 | 0.7789367050033914 | REJECT | 0.8 | 0.06480165906835389 | 0.7292336979426164 | PASS | PASS |
| p29 | PASS | 0.93 | 0.9524567885544127 | 0.8265718913280418 | PASS | 0.86 | 0.8907903262133126 | 0.8907903262133126 | PASS | PASS |
| p30 | PASS | 0.93 | 0.9524567885544127 | 0.7068210070584534 | REJECT | 0.8 | 0.06480165906835389 | 0.6812445214273773 | NEEDS_REVISION | NEEDS_REVISION |
| p31 | PASS | 0.93 | 0.9524567885544127 | 0.7084797013560669 | REJECT | 0.8 | 0.06480165906835389 | 0.7043376104815855 | NEEDS_REVISION | NEEDS_REVISION |
| p32 | PASS | 0.93 | 0.9524567885544127 | 0.5313683585332574 | REJECT | 0.8 | 0.06480165906835389 | 0.541639498968405 | REJECT | REJECT |
| p33 | PASS | 0.93 | 0.9524567885544127 | 0.5510675078338085 | REJECT | 0.8 | 0.06480165906835389 | 0.544711069328866 | REJECT | REJECT |
| p34 | PASS | 0.93 | 0.9524567885544127 | 0.7648185485952627 | REJECT | 0.8 | 0.06480165906835389 | 0.6952501326325078 | PASS | PASS |
| p35 | PASS | 0.93 | 0.9524567885544127 | 0.8440094314106351 | REJECT | 0.8 | 0.06480165906835389 | 0.7869482961916658 | PASS | PASS |
| p36 | PASS | 0.93 | 0.9524567885544127 | 0.7614291722261844 | REJECT | 0.8 | 0.06480165906835389 | 0.7461616192632199 | PASS | PASS |
| p37 | PASS | 0.93 | 0.9524567885544127 | 0.6828859816266439 | REJECT | 0.8 | 0.06480165906835389 | 0.670469168778451 | NEEDS_REVISION | NEEDS_REVISION |
| p38 | PASS | 0.93 | 0.9118916015922807 | 0.9118916015922807 | PASS | 0.93 | 0.9129806197525883 | 0.9129806197525883 | PASS | PASS |
| p39 | PASS | 0.93 | 0.9524567885544127 | 0.6850602616439319 | REJECT | 0.8 | 0.06480165906835389 | 0.659492246763915 | NEEDS_REVISION | NEEDS_REVISION |
| p40 | PASS | 0.93 | 0.9524567885544127 | 0.84728898940219 | PASS | 0.86 | 0.8905939975838542 | 0.8905939975838542 | PASS | PASS |
| p41 | PASS | 0.86 | 0.898227124604554 | 0.898227124604554 | REJECT | 0.8 | 0.06480165906835389 | 0.876612499212901 | PASS | PASS |
| p42 | PASS | 0.93 | 0.9524567885544127 | 0.5324926365008572 | REJECT | 0.8 | 0.06480165906835389 | 0.4902869428019367 | REJECT | REJECT |

### Proposal text

- `p00`: Adopt the temple ratio as the only proportion for the transport cascade and publish the witness log.
- `p01`: Archive the vortex ledger before the next quiet solar window and keep the prior hash.
- `p02`: Freeze isotope registration for thirty days while the cascade index is audited.
- `p03`: Rotate the public feed key and retain the last fifty shared proposals.
- `p04`: Attest that the on-chain write stays closed unless the recommendation is not a rejection.
- `p05`: Compare the two black-hole sequences at cascade index twenty-nine and record both.
- `p06`: Publish the phase-coherence remainder for the default vortex base without changing the formula.
- `p07`: Bind the glossary example to the same BlackHole sequence the tools compute.
- `p08`: Hold c at three hundred million meters per second and do not apply the SI exact value.
- `p09`: Record that the live servers were not updated by this measurement.
- `p10`: Require every proposal to name its source as human, agent, ambient, or system.
- `p11`: Keep Redis history writes disabled for this audit by refusing a set REDIS_URL.
- `p12`: Sample the manifold once and store the container only in memory.
- `p13`: Leave vortexMath.ts untouched because another change owns that file.
- `p14`: Do not rewrite the mill-local pointer sentence in the app constants module.
- `p15`: Show the counterfactual chain for the exact speed of light and mark it not applied.
- `p16`: Pin the clock to the same UTC instant on both checkouts before importing the server.
- `p17`: Replace NOAA replies with an empty array so solar activity is the stub, not the network.
- `p18`: Use the FNV sentence embedding when the image transformer cannot load.
- `p19`: Call cross correlation with two unrelated texts and expect one strength.
- `p20`: Call cross correlation again with the first two proposals and expect that same strength.
- `p21`: Evaluate governance with one fixed review sentence that does not mention the clock.
- `p22`: Ask govern_with_solar for a recommendation and do not set persistToChain.
- `p23`: Skip the chain client when the recommendation would reject the proposal.
- `p24`: Measure sync efficiency for seven voids and n equal to twenty-nine.
- `p25`: Leave the dual-black-hole formula as it stands and only report the number.
- `p26`: Document that a hammer at or above the high bar can still pass a weak cross strength.
- `p27`: Document that a hammer at or below the low bar also replaces the cross strength.
- `p28`: State that the decision matrix was not edited.
- `p29`: State that the correlation handler still ignores the proposal text.
- `p30`: List every solar recommendation that differs between the two checkouts.
- `p31`: Keep the pull request a draft until Blaze accepts the governance default.
- `p32`: Search the old expression grammar again only as history, including roots and logs.
- `p33`: Drop percentile labels from the candidate list and call nothing a derivation.
- `p34`: Allow the eight Codex files that still quote the historical decimal.
- `p35`: Scan the other Codex files, which do not contain that historical decimal.
- `p36`: Generate the numeric before column by running origin/main, not from a frozen table.
- `p37`: Refuse to start this worker when a Redis URL is present in the environment.
- `p38`: Import the displacement helper from each tree so the default parameter is that tree.
- `p39`: Print confidence with full JSON digits so zero point eight stays exact.
- `p40`: Separate the evaluate_governance verdict from the solar percent tag.
- `p41`: Remember that the percent tag is not the field the chain write checks.
- `p42`: Close the audit by writing both flips into the pull request and the checked-in note.

## Dual black hole sync efficiency

`computeDualBlackHoleSync` is what the Chrono Transport UI calls, with no phi argument (`src/lib/chronoTransportInterface.ts:89`). The voids default on that screen is `7` (`src/lib/chronoTransportInterface.ts:26`, `src/components/TPTTApp.tsx:187`). The screen's initial `n` is `25` (`TPTTApp.tsx:186`). The v4.7 cascade range is 25 through 34, and `n=29` is inside it.

The worker calls `computeDualBlackHoleSync(7, 29)` on each tree, so the phi is that function's default parameter. On `origin/main` the default is a decimal literal. On this branch the default is `PHI` (`5/3`).

| call | origin/main | this branch |
| --- | ---: | ---: |
| `computeDualBlackHoleSync(7, 29)` | `1` | `-0.3099298206667471` |
| `computeDualBlackHoleSync(7, 25)` | `0.9174979526515221` | `0.48710023793237267` |

`n=29` goes from `1` to `-0.3099298206667471` (about `-0.310`). The formula allows a negative result: `1 - abs(seq1 - seq2) / π` is not clamped at 0. That is the visible UI change. The function was not edited to change the formula. The default parameter now follows `PHI`.

## Triangulation history

`docs/empirical/CONSTANT-TRIANGULATION.md` records the search history. `fcd4df31` searched 20,592 formulas, including square roots, natural logs, log10, and powers `a^b` when `|b| ≤ 8`, plus sums and products. `2603fef` removed addition, subtraction, roots, and logarithms. The words "fixed before the search" in that commit were false. The current list is an exploratory candidate list. None of the constants is shown to derive from TLM, and that includes `delta_t`.
