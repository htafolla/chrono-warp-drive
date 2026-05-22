// TensorFlow.js Worker Thread for Neural Fusion
// Delegates to a Vite-bundled worker file (neural.worker.ts).

export interface SolarFeaturesLike {
  xrayUVLift: number;
  magPerturbation: number;
  kpIndex: number;
  hardnessRatio?: number;
  activityLevel?: string;
}

export interface NeuralWorkerMessage {
  type: 'compute-q-ent' | 'compute-cascade' | 'initialize';
  data?: {
    delta_phase?: number;
    n?: number;
    tdf_value?: number;
    tau?: number;
    phi?: number;
    solarFeatures?: SolarFeaturesLike;
  };
}

export interface NeuralWorkerResponse {
  type: 'q-ent-result' | 'cascade-result' | 'initialized' | 'error';
  data?: {
    q_ent?: number;
    cascade_index?: number;
    efficiency?: number;
    compute_time?: number;
    trained?: boolean;
    fallbackMode?: boolean;
  };
  error?: string;
}

/**
 * Create a neural fusion Web Worker (Vite-bundled).
 *
 * ## IIFE Bundling Contract (critical for maintenance)
 *
 * The worker source (`neural.worker.ts`) uses normal ESM `import` statements
 * from `./solarWorkerUtils`. This is only possible because:
 *
 *   vite.config.ts → worker: { format: 'iife' }
 *
 * Vite/Rollup then bundles the entire worker + all its imports into a
 * single classic IIFE (`(function(){...})()`) that is emitted as
 * `dist/assets/neural.worker-*.js`.
 *
 * Inside that IIFE the original `import` statements no longer exist;
 * everything is inlined. Therefore the worker can still call the classic
 * `self.importScripts(...)` to fetch TF.js from the CDN at runtime.
 *
 * This gives us the best of both worlds:
 *   - TypeScript + editor support + shared modules in source
 *   - Classic worker + importScripts for TF.js in the browser
 *
 * If you ever change the bundling format, the importScripts line in
 * neural.worker.ts will break. Keep this comment in sync with vite.config.ts.
 *
 * Returns null when the Vite worker transform is unavailable (tests, SSR, etc.).
 * The consuming hook then transparently falls back to the pure-JS analytic formulas.
 */
export function createNeuralWorker(): Worker | null {
  try {
    return new Worker(
      new URL('./neural.worker.ts', import.meta.url),
      { type: 'classic' },
    );
  } catch {
    return null;
  }
}
