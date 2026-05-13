# Option A — Kill the v4.5 Neural Fusion placeholder layer

Goal: remove the dead `NeuralFusion` class and its hardcoded/random metric values, and make `tpttV4Result.neuralOutput` (the field every dashboard reads) carry **real** values from the v4.7 TF.js worker that's already running. No UI consumers need to be deleted — they just stop displaying theatre.

## Changes

### 1. Delete dead code
- **`src/lib/neuralFusion.ts`** — delete file. The `NeuralFusion` class is constructed once in `TPTTApp.tsx:162`, `initialize()` is called, and `processNeuralInput` is never invoked.
- **`src/types/sdss.ts`** — remove `NeuralInput` interface (zero constructors anywhere). Keep `NeuralOutput` shape (it's the dashboard contract) and `TPTTv4Result.neuralOutput`.

### 2. Stop generating fake neural output in the calculator
- **`src/lib/temporalCalculatorV4.ts`**:
  - Remove `neuralModel`, `initializeNeuralModel()`, the unused TF.js sequential model, and `computeNeuralFusion()`.
  - Remove `computeSynapticSequence()` (hash of hardcoded `"isotropic metamorphosis"`).
  - In `computeTPTTv4_5()`: drop the `neuralOutput` local; set `Syn_c = 0.8` (the existing fallback constant) and call `computeN_s(null)` (already returns `0.5` on null). Strip neural fields from the returned object — caller (`TPTTApp`) will inject real ones.
  - Simplify `generateEnhancedRippel` to drop the `neuralOutput` arg.

### 3. Inject real v4.7 neural output in TPTTApp
- **`src/components/TPTTApp.tsx`**:
  - Remove `import { NeuralFusion }`, the `useState(() => new NeuralFusion())`, and its `initialize()` call.
  - Already imports/uses `useNeuralFusion` indirectly via `CascadeOptimizationSystem` — promote the hook to `TPTTApp` itself (or expose its `lastResult` upward) so we have `{ q_ent, cascade_index, efficiency }` in scope.
  - After `computeTPTTv4_5` returns, build a real `neuralOutput`:
    ```ts
    neuralOutput = lastResult.q_ent != null ? {
      metamorphosisIndex: lastResult.q_ent,            // real Q_ent in [0..1]
      confidenceScore: lastResult.efficiency,          // real efficiency in [0..1]
      synapticSequence: synapticPhrase(cascade_index, isotope.type),
      neuralSpectra: spectrumData?.intensities.slice(0, 16) ?? []
    } : null;
    tpttV4Result = { ...tpttV4Result, neuralOutput };
    ```
  - `synapticPhrase(n, isotope)` is a tiny pure helper that picks a phrase by `cascade_index` band and appends the active isotope label — replaces the hardcoded `"isotropic metamorphosis"` hash.

### 4. Light cleanup of consumers
No structural change required — every consumer (`Dashboard`, `NeuralFusionDisplay`, `RippelDisplay`, `TransportSystem`, `AnalysisEngine`, `ReportGenerator`, `debugExporter`) already handles `neuralOutput == null` and reads the same four fields. They will start showing real numbers automatically.

- **`src/lib/temporalCalculatorV4_6.ts`** — drops the `NeuralOutput` import only if unused after the v4 changes; otherwise leave (it just re-exports).

## What this fixes

| Before | After |
|---|---|
| `metamorphosisIndex` = `0.8` or `0.3` (2-value step) | Real Q_ent from worker, continuous |
| `confidenceScore` = `random()*0.3 + 0.7` | Real efficiency from worker |
| `synapticSequence` = hash of literal `"isotropic metamorphosis"` (constant) | Phrase keyed to live cascade index + isotope |
| Dead `NeuralFusion` class allocating a TF model on init | Removed |
| Two parallel "neural" code paths | One source of truth (v4.7 worker) |

## Out of scope (intentionally)

- No new `NeuralInput` reconstruction — confirmed unused, deleted.
- No changes to v4.7 worker, `useNeuralFusion`, or cascade math.
- No changes to `solarDataFetcher` / `SolarFeatures` (separate thread).
- No UI redesign — consumers keep their current shape.

## Risk / verification

- Build must pass (TypeScript will flag any leftover `NeuralInput` import).
- Visual check: Neural Fusion Display panel should now show varying values as cascade params change, instead of pinned `80%` / `~85%`.
- Debug export keeps the same JSON shape.
