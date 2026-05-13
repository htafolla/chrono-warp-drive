// Neural Fusion Hook (Codex v4.7 Phase 3)
// Uses TensorFlow.js worker thread for Q_ent and cascade computations

import { useEffect, useRef, useState, useCallback } from 'react';
import { createNeuralWorker, NeuralWorkerMessage, NeuralWorkerResponse } from '@/lib/neuralWorker';
import type { SolarFeatures } from '@/lib/solarDataFetcher';

export interface NeuralFusionResult {
  q_ent: number;
  cascade_index: number;
  efficiency: number;
  compute_time: number;
  // Echo of the (possibly solar-modulated) inputs the worker actually saw.
  // Lets the UI distinguish quiet-Sun runs from storm-driven shifts.
  modulated?: { delta_phase: number; tau: number; solar_applied: boolean };
}

/**
 * Solar → neural input modulation (Codex v4.7 option-a coupling).
 *
 * Rationale:
 *   The TF.js worker only consumes scalar cascade params. Rather than
 *   touching the model architecture, we *shift* the two scalars that have
 *   the clearest physical analog to chromospheric / geomagnetic forcing:
 *
 *     delta_phase  ← amplified by xrayUVLift (chromospheric UV response)
 *                    and magPerturbation (|dB/dt| proxy). Active Sun =
 *                    larger phase excursions reaching the cascade.
 *     tau          ← biased slightly by the same channels. xrayUVLift
 *                    raises coherence (more UV pumping); magPerturbation
 *                    lowers it (geomagnetic decoherence).
 *
 *   Coefficients are intentionally small and bounded so a quiet Sun
 *   (xrayUVLift≈0, magPerturbation≈0) is a no-op, and a storm-class
 *   forcing shifts each scalar by at most ~25%.
 */
function applySolarModulation(
  delta_phase: number,
  tau: number,
  solar?: SolarFeatures | null
): { delta_phase: number; tau: number; solar_applied: boolean } {
  if (!solar) return { delta_phase, tau, solar_applied: false };
  const uv = Math.max(-0.3, Math.min(1.0, solar.xrayUVLift));
  const mag = Math.max(0, Math.min(1, solar.magPerturbation));

  const dpFactor = 1 + 0.15 * uv + 0.10 * mag;          // 0.955 .. 1.25
  const tauFactor = 1 + 0.03 * uv - 0.05 * mag;          // 0.941 .. 1.03

  const dp = Math.max(0, Math.min(1, delta_phase * dpFactor));
  const t = Math.max(0.7, Math.min(0.95, tau * tauFactor));
  return { delta_phase: dp, tau: t, solar_applied: true };
}

export interface NeuralFusionOptions {
  enabled?: boolean;
  autoInitialize?: boolean;
}

/**
 * Neural Fusion hook using TensorFlow.js worker thread
 * Implements Codex v4.7 Phase 3: Neural Fusion Enhancement
 */
export function useNeuralFusion(options: NeuralFusionOptions = {}) {
  const { enabled = true, autoInitialize = true } = options;
  const workerRef = useRef<Worker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [lastResult, setLastResult] = useState<Partial<NeuralFusionResult>>({});
  const pendingCallbacks = useRef<Map<string, (result: any) => void>>(new Map());

  // Initialize worker
  useEffect(() => {
    if (!enabled) return;

    try {
      const worker = createNeuralWorker();
      workerRef.current = worker;

      // Handle worker messages
      worker.onmessage = (e: MessageEvent<NeuralWorkerResponse>) => {
        const response = e.data;

        switch (response.type) {
          case 'initialized':
            setIsInitialized(true);
            console.log('[Neural Fusion] Worker initialized successfully');
            break;

          case 'q-ent-result':
            if (response.data) {
              console.log('[Neural Fusion] Q_ent result received:', response.data.q_ent);
              setLastResult(prev => ({
                ...prev,
                q_ent: response.data!.q_ent,
                compute_time: response.data!.compute_time
              }));
              const callback = pendingCallbacks.current.get('q-ent');
              if (callback) {
                callback(response.data);
                pendingCallbacks.current.delete('q-ent');
              }
            }
            setIsComputing(false);
            break;

          case 'cascade-result':
            if (response.data) {
              console.log('[Neural Fusion] Cascade result received:', {
                cascade_index: response.data.cascade_index,
                efficiency: response.data.efficiency
              });
              setLastResult(prev => ({
                ...prev,
                cascade_index: response.data!.cascade_index,
                efficiency: response.data!.efficiency,
                compute_time: response.data!.compute_time
              }));
              const callback = pendingCallbacks.current.get('cascade');
              if (callback) {
                callback(response.data);
                pendingCallbacks.current.delete('cascade');
              }
            }
            setIsComputing(false);
            break;

          case 'error':
            console.error('[Neural Fusion] Worker error:', response.error);
            setIsComputing(false);
            break;
        }
      };

      // Auto-initialize if enabled
      if (autoInitialize) {
        worker.postMessage({ type: 'initialize' } as NeuralWorkerMessage);
      }

      return () => {
        worker.terminate();
        workerRef.current = null;
        setIsInitialized(false);
      };
    } catch (error) {
      console.error('[Neural Fusion] Failed to create worker:', error);
    }
  }, [enabled, autoInitialize]);

  /**
   * Compute quantum entanglement (Q_ent) using neural model
   */
  const computeQEnt = useCallback(
    async (delta_phase: number, n: number, phi: number = 1.666): Promise<number> => {
      if (!workerRef.current || !isInitialized) {
        console.warn('[Neural Fusion] Worker not initialized, using fallback calculation');
        // Fallback calculation
        const phase_factor = Math.abs(Math.cos(phi * n / 2) / Math.PI);
        const cascade_factor = Math.sin(phi * n / 4) * Math.exp(-n / 20);
        const delta_weight = delta_phase * (1 + (n - 25) / 10);
        return Math.max(0, Math.min(1, phase_factor * cascade_factor * delta_weight * Math.log(n + 1)));
      }

      setIsComputing(true);

      return new Promise((resolve) => {
        pendingCallbacks.current.set('q-ent', (result) => {
          resolve(result.q_ent);
        });

        workerRef.current!.postMessage({
          type: 'compute-q-ent',
          data: { delta_phase, n, phi }
        } as NeuralWorkerMessage);
      });
    },
    [isInitialized]
  );

  /**
   * Compute cascade index and efficiency
   */
  const computeCascade = useCallback(
    async (
      tdf_value: number,
      n: number,
      tau: number = 0.865,
      phi: number = 1.666
    ): Promise<{ cascade_index: number; efficiency: number }> => {
      if (!workerRef.current || !isInitialized) {
        console.warn('[Neural Fusion] Worker not initialized, using fallback calculation');
        // Fallback calculation - efficiency normalized to [0..1]
        const cascade_index = Math.floor(Math.PI / 7) + n;
        const target_tptt = 5.3e12;
        const efficiency = Math.min(1, tdf_value / target_tptt);
        return { cascade_index, efficiency };
      }

      setIsComputing(true);

      return new Promise((resolve) => {
        pendingCallbacks.current.set('cascade', (result) => {
          resolve({
            cascade_index: result.cascade_index,
            efficiency: result.efficiency
          });
        });

        workerRef.current!.postMessage({
          type: 'compute-cascade',
          data: { tdf_value, n, tau, phi }
        } as NeuralWorkerMessage);
      });
    },
    [isInitialized]
  );

  /**
   * Compute full neural fusion result
   */
  const computeFull = useCallback(
    async (
      delta_phase: number,
      n: number,
      tdf_value: number,
      tau: number = 0.865,
      phi: number = 1.666,
      solar?: SolarFeatures | null
    ): Promise<NeuralFusionResult> => {
      const startTime = performance.now();

      const mod = applySolarModulation(delta_phase, tau, solar);

      const [q_ent_result, cascade_result] = await Promise.all([
        computeQEnt(mod.delta_phase, n, phi),
        computeCascade(tdf_value, n, mod.tau, phi),
      ]);

      const compute_time = performance.now() - startTime;

      const fullResult: NeuralFusionResult = {
        q_ent: q_ent_result,
        cascade_index: cascade_result.cascade_index,
        efficiency: cascade_result.efficiency,
        compute_time,
        modulated: mod,
      };

      // Ensure UI gets updated even if messages are delayed
      setLastResult(fullResult);

      return fullResult;
    },
    [computeQEnt, computeCascade]
  );

  return {
    isInitialized,
    isComputing,
    lastResult,
    computeQEnt,
    computeCascade,
    computeFull
  };
}
