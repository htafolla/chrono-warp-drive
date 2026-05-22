// Neural Fusion Hook (Codex v4.7 Phase 3)
// Uses TensorFlow.js worker thread for Q_ent and cascade computations

import { useEffect, useRef, useState, useCallback } from 'react';
import { createNeuralWorker, type NeuralWorkerMessage, type NeuralWorkerResponse } from '@/lib/neuralWorker';
import type { SolarFeatures } from '@/lib/solarDataFetcher';

export interface NeuralFusionResult {
  q_ent: number;
  cascade_index: number;
  efficiency: number;
  compute_time: number;
  modulated?: { delta_phase: number; tau: number; solar_applied: boolean };
}

export const SOLAR_COUPLING = {
  DELTA_PHASE_UV_GAIN: 0.25,
  DELTA_PHASE_MAG_GAIN: 0.15,
  TAU_UV_GAIN: 0.06,
  TAU_MAG_GAIN: 0.08,
  TAU_MIN: 0.7,
  TAU_MAX: 0.95,
} as const;

function applySolarModulation(
  delta_phase: number,
  tau: number,
  solar?: SolarFeatures | null
): { delta_phase: number; tau: number; solar_applied: boolean } {
  if (!solar) return { delta_phase, tau, solar_applied: false };
  const uv = Math.max(-0.3, Math.min(1.0, solar.xrayUVLift));
  const mag = Math.max(0, Math.min(1, solar.magPerturbation));

  const dpFactor = 1 + SOLAR_COUPLING.DELTA_PHASE_UV_GAIN * uv
                     + SOLAR_COUPLING.DELTA_PHASE_MAG_GAIN * mag;
  const tauFactor = 1 + SOLAR_COUPLING.TAU_UV_GAIN * uv
                      - SOLAR_COUPLING.TAU_MAG_GAIN * mag;

  const dp = Math.max(0, Math.min(1, delta_phase * dpFactor));
  const t = Math.max(SOLAR_COUPLING.TAU_MIN, Math.min(SOLAR_COUPLING.TAU_MAX, tau * tauFactor));
  return { delta_phase: dp, tau: t, solar_applied: true };
}

export interface NeuralFusionOptions {
  enabled?: boolean;
  autoInitialize?: boolean;
}

export function useNeuralFusion(options: NeuralFusionOptions = {}) {
  const { enabled = true, autoInitialize = true } = options;
  const workerRef = useRef<Worker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [isTrained, setIsTrained] = useState(false);
  const [isFallback, setIsFallback] = useState(true);
  const [lastResult, setLastResult] = useState<Partial<NeuralFusionResult>>({});
  const pendingCallbacks = useRef<Map<string, (result: any) => void>>(new Map());

  useEffect(() => {
    if (!enabled) return;

    try {
      const worker = createNeuralWorker();
      workerRef.current = worker;

      const handleMessage = (e: MessageEvent<NeuralWorkerResponse>) => {
        const response = e.data;
        switch (response.type) {
          case 'initialized':
            setIsInitialized(true);
            if (response.data) {
              setIsTrained(response.data.trained ?? false);
              setIsFallback(response.data.fallbackMode ?? true);
            }
            break;

          case 'q-ent-result':
            if (response.data) {
              if (response.data.trained !== undefined) {
                setIsTrained(response.data.trained);
              }
              setLastResult(prev => ({
                ...prev,
                q_ent: response.data!.q_ent,
                compute_time: response.data!.compute_time,
              }));
              const cb = pendingCallbacks.current.get('q-ent');
              if (cb) {
                cb(response.data);
                pendingCallbacks.current.delete('q-ent');
              }
            }
            setIsComputing(false);
            break;

          case 'cascade-result':
            if (response.data) {
              setLastResult(prev => ({
                ...prev,
                cascade_index: response.data!.cascade_index,
                efficiency: response.data!.efficiency,
                compute_time: response.data!.compute_time,
              }));
              const cb = pendingCallbacks.current.get('cascade');
              if (cb) {
                cb(response.data);
                pendingCallbacks.current.delete('cascade');
              }
            }
            setIsComputing(false);
            break;

          case 'error':
            setIsComputing(false);
            break;
        }
      };

      if (worker) {
        worker.onmessage = handleMessage;
        if (autoInitialize) {
          worker.postMessage({ type: 'initialize' } as NeuralWorkerMessage);
        }
      }

      return () => {
        if (worker) {
          worker.terminate();
        }
        workerRef.current = null;
        setIsInitialized(false);
        setIsTrained(false);
        setIsFallback(true);
      };
    } catch {
      // Worker creation failed — formulas will be used as fallback
    }
  }, [enabled, autoInitialize]);

  const computeQEnt = useCallback(
    async (delta_phase: number, n: number, phi: number = 1.666, solarFeatures?: SolarFeatures | null): Promise<number> => {
      if (!workerRef.current) {
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
          data: { delta_phase, n, phi, solarFeatures: solarFeatures ?? undefined }
        } as NeuralWorkerMessage);
      });
    },
    []
  );

  const computeCascade = useCallback(
    async (
      tdf_value: number,
      n: number,
      tau: number = 0.865,
      phi: number = 1.666
    ): Promise<{ cascade_index: number; efficiency: number }> => {
      if (!workerRef.current) {
        const cascade_index = Math.floor(Math.PI / 7) + n;
        const target_tptt = 5.3e12;
        const safe_tdf = Math.max(1, Math.abs(tdf_value));
        const efficiency = Math.max(0, Math.min(1, Math.log10(safe_tdf) / Math.log10(target_tptt)));
        return { cascade_index, efficiency };
      }

      setIsComputing(true);

      return new Promise((resolve) => {
        pendingCallbacks.current.set('cascade', (result) => {
          resolve({
            cascade_index: result.cascade_index,
            efficiency: result.efficiency,
          });
        });

        workerRef.current!.postMessage({
          type: 'compute-cascade',
          data: { tdf_value, n, tau, phi }
        } as NeuralWorkerMessage);
      });
    },
    []
  );

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
        computeQEnt(mod.delta_phase, n, phi, solar),
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

      setLastResult(fullResult);
      return fullResult;
    },
    [computeQEnt, computeCascade]
  );

  return {
    isInitialized,
    isComputing,
    isTrained,
    isFallback,
    lastResult,
    computeQEnt,
    computeCascade,
    computeFull,
  };
}
