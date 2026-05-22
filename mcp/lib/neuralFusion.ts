import * as tf from '@tensorflow/tfjs';
import { NeuralInput, NeuralOutput } from '../types/sdss';
import { deterministicRandom, generateCycle } from './deterministicUtils';
import { applySolarOutputModulation } from './solarCoupling';
import { stellarLibrary, StellarSpectrum } from './stellarLibraryLoader';
import { solarDataFetcher, SolarData } from './solarDataFetcher';

const PHI = 1.666;
const SEQUENCES = [
  'quantum entanglement matrix activated',
  'temporal phase coherence achieved',
  'spectral metamorphosis in progress',
  'dimensional flux stabilized',
  'neural pathway synchronized',
  'isotropic field harmonized',
  'chrono-spectral fusion initiated',
  'metamorphic resonance detected',
];

function normalRandom(mean = 0, std = 1): number {
  const u = Math.random();
  const v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function normalizeArray(arr: number[]): number[] {
  const mx = Math.max(...arr);
  const mn = Math.min(...arr);
  const range = mx - mn || 1;
  return arr.map(v => (v - mn) / range);
}

function sampleArray(arr: number[], target: number): number[] {
  if (arr.length === target) return arr;
  if (arr.length > target) {
    const step = arr.length / target;
    return Array.from({ length: target }, (_, i) => arr[Math.floor(i * step)]);
  }
  const result = [...arr];
  while (result.length < target) {
    const last = result[result.length - 1];
    const prev = result[result.length - 2] ?? last;
    result.push((last + prev) / 2);
  }
  return result;
}

function activityLevelNum(level: string): number {
  const map: Record<string, number> = { quiet: 0.25, moderate: 0.5, active: 0.75, storm: 1.0 };
  return map[level] ?? 0.5;
}

function flareClassNum(cls: string): number {
  const map: Record<string, number> = { A: 0.1, B: 0.3, C: 0.5, M: 0.75, X: 1.0 };
  return map[cls] ?? 0.1;
}

function computeSolarTargets(solarData: SolarData): number[] {
  const normXrayLong = clamp(Math.log10(Math.max(solarData.xray.long, 1e-9)) / -4, 0, 1);
  const normXrayShort = clamp(Math.log10(Math.max(solarData.xray.short, 1e-9)) / -4, 0, 1);
  const normKp = solarData.kpIndex / 9;
  const normProton = clamp(Math.log10(Math.max(solarData.particles.protons.ge10, 1)) / 5, 0, 1);
  const normWind = clamp(solarData.solarWind.speed / 1000, 0, 1);
  const normMag = clamp(solarData.magnetometer.perturbation / 100, 0, 1);
  const actNum = activityLevelNum(solarData.activityLevel);
  const flareNum = flareClassNum(solarData.xray.flareClass);
  const meta = clamp(0.3 + actNum * 0.6 + flareNum * 0.1, 0.1, 0.95);
  const conf = clamp(0.6 + (1 - normMag) * 0.3 - (actNum > 0.7 ? 0.15 : 0), 0.5, 0.98);

  return [
    clamp(5778 / 50000, 0, 1),
    actNum,
    flareNum,
    normXrayLong,
    normXrayShort,
    normKp,
    normProton,
    normWind,
    normMag,
    clamp(solarData.xray.hardnessRatio / 2, 0, 1),
    clamp(solarData.particles.spectralIndex / 3, 0, 1),
    clamp(solarData.solarWind.bz / 20 + 0.5, 0, 1),
    meta,
    conf,
    0,
    0,
  ];
}

/**
 * Generate a small "historical" set of distinct solar regimes for training.
 * This is the key first improvement over the previous "one real snapshot + 40 augmentations".
 * We now synthesize a representative distribution (quiet → extreme storm) that is
 * internally consistent with the activity classification used by the solar hammer.
 */
function generateDiverseSolarScenarios(base: SolarData, count = 6): SolarData[] {
  const regimes: Array<Partial<SolarData>> = [
    { xray: { ...base.xray, long: 5e-8, short: 8e-9, flareClass: 'A' }, kpIndex: 1, magnetometer: { ...base.magnetometer, perturbation: 7 } },
    { xray: { ...base.xray, long: 4e-7, short: 6e-8, flareClass: 'B' }, kpIndex: 3, magnetometer: { ...base.magnetometer, perturbation: 20 } },
    { xray: { ...base.xray, long: 3e-6, short: 5e-7, flareClass: 'C' }, kpIndex: 5, magnetometer: { ...base.magnetometer, perturbation: 42 } },
    { xray: { ...base.xray, long: 1.2e-5, short: 2e-6, flareClass: 'M' }, kpIndex: 6, magnetometer: { ...base.magnetometer, perturbation: 60 }, solarWind: { ...base.solarWind, speed: 650 } },
    { xray: { ...base.xray, long: 5e-5, short: 9e-6, flareClass: 'X' }, kpIndex: 8, magnetometer: { ...base.magnetometer, perturbation: 95 }, solarWind: { ...base.solarWind, speed: 810 } },
    { xray: { ...base.xray, long: 1.1e-4, short: 2.5e-5, flareClass: 'X' }, kpIndex: 9, magnetometer: { ...base.magnetometer, perturbation: 135 }, solarWind: { ...base.solarWind, speed: 880 } },
  ];

  return regimes.slice(0, count).map((v, i) => {
    const d: SolarData = {
      ...base,
      timestamp: new Date(Date.now() - i * 4 * 3600_000).toISOString(),
      xray: { ...base.xray, ...v.xray },
      kpIndex: v.kpIndex ?? base.kpIndex,
      magnetometer: { ...base.magnetometer, ...v.magnetometer },
      solarWind: { ...base.solarWind, ...v.solarWind },
      particles: v.particles ? { ...base.particles, ...v.particles } : base.particles,
    };
    d.activityLevel = (d.xray.long > 1e-4 || d.kpIndex >= 7) ? 'storm'
                    : (d.xray.long > 1e-5 || d.kpIndex >= 5) ? 'active'
                    : (d.xray.long > 1e-6 || d.kpIndex >= 3) ? 'moderate'
                    : 'quiet';
    return d;
  });
}

function computeStellarTargets(star: StellarSpectrum): number[] {
  const normTemp = clamp(star.temperature / 50000, 0, 1);
  const spectralType = star.spectralType.charAt(0).toUpperCase();
  const typeNum: Record<string, number> = { O: 0, B: 0.15, A: 0.3, F: 0.45, G: 0.6, K: 0.75, M: 0.9 };
  const stellarClass = typeNum[spectralType] ?? 0.5;
  const fluxNorm = normalizeArray(star.flux);
  const slope = fluxNorm.length >= 2 ? fluxNorm[fluxNorm.length - 1] - fluxNorm[0] : 0;
  const meta = clamp(star.temperature / 30000, 0.1, 0.95);
  const conf = clamp(0.5 + (star.temperature < 6000 ? 0.3 : 0.1), 0.5, 0.95);

  return [
    normTemp,
    stellarClass,
    star.temperature < 4000 ? 0.1 : star.temperature < 6000 ? 0.3 : 0.8,
    clamp(0.5 + slope, 0, 1),
    clamp(1 - star.temperature / 50000, 0, 1),
    star.temperature < 4000 ? 0.8 : star.temperature < 6000 ? 0.5 : 0.1,
    star.temperature < 4000 ? 0.6 : 0.1,
    clamp(Math.log10(Math.max(star.temperature, 1)) / 5, 0, 1),
    clamp((star.wavelengths[star.wavelengths.length - 1] - star.wavelengths[0]) / 10000, 0, 1),
    stellarClass,
    star.temperature > 10000 ? 0.7 : star.temperature > 6000 ? 0.4 : 0.1,
    star.temperature > 10000 ? 0.8 : 0.2,
    meta,
    conf,
    0,
    0,
  ];
}

function interpolateFlux(star: StellarSpectrum, points = 200): number[] {
  const wlMin = star.wavelengths[0];
  const wlMax = star.wavelengths[star.wavelengths.length - 1];
  const wls = star.wavelengths;
  const fluxes = star.flux;
  const result: number[] = [];
  for (let i = 0; i < points; i++) {
    const twl = wlMin + (wlMax - wlMin) * (i / (points - 1));
    if (twl <= wls[0]) result.push(fluxes[0]);
    else if (twl >= wls[wls.length - 1]) result.push(fluxes[fluxes.length - 1]);
    else {
      let hi = wls.findIndex(w => w >= twl);
      if (hi === -1) hi = wls.length - 1;
      const lo = Math.max(0, hi - 1);
      const t = (twl - wls[lo]) / (wls[hi] - wls[lo] || 1);
      result.push(fluxes[lo] + t * (fluxes[hi] - fluxes[lo]));
    }
  }
  return normalizeArray(result);
}

function augmentSpectrum(base: number[], noiseStd = 0.03): number[] {
  return base.map(v => clamp(v + normalRandom(0, noiseStd), 0, 1.5));
}

export class NeuralFusion {
  private spectralModel: tf.LayersModel | null = null;   // Encoder (16-dim bottleneck)
  private decoderModel: tf.LayersModel | null = null;    // Cheap reconstruction head
  private patternModel: tf.LayersModel | null = null;
  private isInitialized = false;
  private isTrained = false;

  async initialize(): Promise<void> {
    try {
      await tf.ready();
      await tf.setBackend('cpu');
      console.log(`[NeuralFusion] TF.js backend: ${tf.getBackend()}`);

      this.spectralModel = this.createSpectralModel();
      this.decoderModel = this.createDecoderModel();
      this.patternModel = this.createPatternModel();

      const testTensor = tf.tensor2d([Array(200).fill(0.5)]);
      const testResult = this.spectralModel.predict(testTensor) as tf.Tensor;
      console.log(`[NeuralFusion] Spectral model OK, output: ${testResult.shape}`);
      testTensor.dispose();
      testResult.dispose();

      this.isInitialized = true;
    } catch (error) {
      console.error('[NeuralFusion] init failed:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  private createSpectralModel(): tf.LayersModel {
    // Encoder (bottleneck) - this is what we expose as the "spectral embedding"
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [200], units: 48, activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }) }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 24, activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }) }),
        tf.layers.dropout({ rate: 0.15 }),
        tf.layers.dense({ units: 16, activation: 'sigmoid' }),
      ],
    });
    // We compile the encoder mainly for the auxiliary targets during training.
    // The real reconstruction loss will be handled via the decoder.
    model.compile({ optimizer: tf.train.adam(0.005), loss: 'meanSquaredError', metrics: ['mse'] });
    return model;
  }

  private createDecoderModel(): tf.LayersModel {
    // Cheap decoder head - 16-dim bottleneck back to 200-dim spectrum
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [16], units: 48, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.1 }),
        tf.layers.dense({ units: 200, activation: 'linear' }),
      ],
    });
    model.compile({ optimizer: tf.train.adam(0.003), loss: 'meanSquaredError', metrics: ['mse'] });
    return model;
  }

  private createPatternModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [8], units: 16, activation: 'tanh' }),
        tf.layers.dense({ units: 12, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'softmax' }),
      ],
    });
    model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
    return model;
  }

  async trainOnSolarData(): Promise<void> {
    if (!this.isInitialized || !this.spectralModel || !this.patternModel) {
      throw new Error('Models not initialized');
    }

    // === Current training philosophy (stabilized phase) ===
    // Primary objective: Learn a good 16-dim solar spectrum embedding that can be reconstructed.
    // This makes reconstructionError a real, honest signal of "how familiar is this solar state?"
    // We combine:
    //   - Real recent NOAA observations (from the rolling buffer)
    //   - Synthetic diverse regimes (quiet → storm)
    //   - Reconstruction loss via the cheap decoder head
    // The old auxiliary solar metadata targets are kept as a light secondary signal.

    const baseSolar = await solarDataFetcher.fetchCurrentSolarData(true);

    // === Lightweight historical buffer + synthetic diversity (user-chosen path A) ===
    const realHistory = solarDataFetcher.getRecentObservations(12)
    const synthetic = generateDiverseSolarScenarios(baseSolar, 6)

    // Prefer real recent data when available, fall back to synthetic regimes
    const scenarios = realHistory.length >= 4 ? realHistory : synthetic

    const trainInputs: number[][] = [];
    const trainTargets: number[][] = [];

    for (const scenario of scenarios) {
      const spectrum = solarDataFetcher.solarDataToSpectrum(scenario, 200);
      const solarBase = normalizeArray(spectrum.intensities);
      const solarTargets = computeSolarTargets(scenario);

      for (let aug = 0; aug < 8; aug++) {
        trainInputs.push(augmentSpectrum(solarBase, 0.015 + aug * 0.002));
        const t = solarTargets.slice();
        // lighter noise because we already have real regime diversity
        t[1] = clamp(solarTargets[1] + normalRandom(0, 0.06), 0.1, 1);
        t[2] = clamp(solarTargets[2] + normalRandom(0, 0.08), 0.05, 1);
        t[5] = clamp(solarTargets[5] + normalRandom(0, 0.06), 0, 1);
        t[12] = clamp(solarTargets[12] + normalRandom(0, 0.03), 0.05, 0.95);
        trainTargets.push(t);
      }
    }

    const patternInputs: number[][] = [];
    const patternTargets: number[][] = [];

    // Use the same diverse regimes for the pattern model
    for (const scenario of scenarios) {
      const t = computeSolarTargets(scenario);
      for (let aug = 0; aug < 5; aug++) {
        const actNum = clamp(t[1] + normalRandom(0, 0.08), 0, 1);
        const flareNum = clamp(t[2] + normalRandom(0, 0.12), 0, 1);
        patternInputs.push([
          actNum,
          t[3] + normalRandom(0, 0.04),
          t[5] + normalRandom(0, 0.08),
          t[7] + normalRandom(0, 0.04),
          Math.random(),
          Math.random() * 0.5,
          Math.random() * 0.3,
          Math.random() * 0.2,
        ]);
        const seqIdx = Math.min(7, Math.floor(actNum * 7 + flareNum * 1.5));
        const oneHot = Array(8).fill(0);
        oneHot[Math.min(7, seqIdx)] = 1;
        patternTargets.push(oneHot);
      }
    }

    const spectra = stellarLibrary.getAllSpectra();
    console.log(`[NeuralFusion] Adding ${spectra.length} stellar spectra for diversity`);
    for (const star of spectra) {
      const baseFlux = interpolateFlux(star, 200);
      const stellarTargets = computeStellarTargets(star);
      trainInputs.push(baseFlux);
      trainTargets.push(stellarTargets.slice(0, 14).concat([0, 0]));

      for (let aug = 0; aug < 6; aug++) {
        trainInputs.push(augmentSpectrum(baseFlux, 0.02 + aug * 0.01));
        const t = stellarTargets.slice();
        t[12] = clamp(stellarTargets[12] + normalRandom(0, 0.03), 0.05, 0.95);
        trainTargets.push(t.slice(0, 14).concat([0, 0]));
      }
    }

    console.log(`[NeuralFusion] Spectral training samples: ${trainInputs.length} (real history: ${realHistory.length}, synthetic regimes used: ${realHistory.length < 4})`);

    const xs = tf.tensor2d(trainInputs);
    const ys = tf.tensor2d(trainTargets);

    await this.spectralModel.fit(xs, ys, {
      epochs: 50,
      batchSize: Math.min(24, trainInputs.length),
      shuffle: true,
      validationSplit: 0.15,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`[NeuralFusion] Solar-trained epoch ${epoch}: loss=${logs?.loss?.toFixed(6)}, val_loss=${logs?.val_loss?.toFixed(6)}`);
          }
        },
      },
    });

    xs.dispose();
    ys.dispose();

    // === Train cheap decoder on reconstruction ===
    if (this.decoderModel && this.spectralModel) {
      console.log('[NeuralFusion] Training decoder head for reconstruction quality...');

      // Create reconstruction targets = the original normalized spectra
      const reconTargets = trainInputs; // same as inputs for autoencoder-style training

      const encOut = this.spectralModel.predict(tf.tensor2d(trainInputs)) as tf.Tensor;
      const decXs = encOut; // 16-dim embeddings

      const decYs = tf.tensor2d(reconTargets);

      await this.decoderModel.fit(decXs, decYs, {
        epochs: 35,
        batchSize: Math.min(32, trainInputs.length),
        shuffle: true,
        validationSplit: 0.1,
      });

      decXs.dispose();
      decYs.dispose();
      encOut.dispose();

      console.log('[NeuralFusion] Decoder training complete');
    }

    console.log(`[NeuralFusion] Pattern training samples: ${patternInputs.length}`);

    const pxs = tf.tensor2d(patternInputs);
    const pys = tf.tensor2d(patternTargets);

    await this.patternModel.fit(pxs, pys, {
      epochs: 30,
      batchSize: Math.min(16, patternInputs.length),
      shuffle: true,
      validationSplit: 0.15,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`[NeuralFusion] Pattern epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, acc=${logs?.acc?.toFixed(4)}`);
          }
        },
      },
    });

    pxs.dispose();
    pys.dispose();

    this.isTrained = true;
    console.log('[NeuralFusion] Training complete — reconstruction-aware solar embedding (phase stabilized)');
  }

  exportWeights(): Record<string, number[][]> {
    if (!this.spectralModel || !this.patternModel) return {};
    const weights: Record<string, number[][]> = {};
    this.spectralModel.getWeights().forEach((t, i) => {
      const data = Array.from(t.dataSync());
      const rows = t.shape[0];
      const cols = t.shape[1] || 1;
      weights[`spectral_${i}`] = Array.from({ length: rows }, (_, r) =>
        data.slice(r * cols, (r + 1) * cols));
    });
    this.patternModel.getWeights().forEach((t, i) => {
      const data = Array.from(t.dataSync());
      const rows = t.shape[0];
      const cols = t.shape[1] || 1;
      weights[`pattern_${i}`] = Array.from({ length: rows }, (_, r) =>
        data.slice(r * cols, (r + 1) * cols));
    });
    return weights;
  }

  async processNeuralInput(input: NeuralInput): Promise<NeuralOutput> {
    if (!this.isInitialized || !this.spectralModel || !this.patternModel) {
      return this.getFallbackOutput(input);
    }

    try {
      const spectrumResult = await this.processSpectrum(input.spectrumData);
      const neuralSpectra = spectrumResult.embedding;           // 100-dim expanded (for backward compat)
      const reconstructionError = spectrumResult.reconstructionError;
      const reconQuality = 1 - Math.min(reconstructionError / 0.8, 1.0); // 0–1

      const synapticSequence = await this.generateSynapticSequence(input);
      const metamorphosisIndex = this.calculateMetamorphosisIndex(input, neuralSpectra);
      const confidenceScore = this.calculateConfidence(neuralSpectra, input, reconstructionError);

      const { metamorphosisIndex: mi, confidenceScore: cs, modulation } = applySolarOutputModulation(
        metamorphosisIndex, confidenceScore, input.solarFeatures
      );

      return {
        synapticSequence,
        neuralSpectra,
        metamorphosisIndex: mi,
        confidenceScore: cs,
        solarModulation: modulation,
        // New honest signals (lightweight reconstruction-based)
        reconstructionError,
        spectralQuality: reconQuality, // 0–1, higher = model understands this solar state better
      };
    } catch (error) {
      console.warn('[NeuralFusion] processing failed, fallback:', error);
      return this.getFallbackOutput(input);
    }
  }

  private async processSpectrum(sd: { intensities: number[]; granularity: number }): Promise<{
    embedding: number[];
    reconstructionError: number;
  }> {
    if (!this.spectralModel) throw new Error('No model');

    const sampled = sampleArray(sd.intensities, 200);
    const normalized = normalizeArray(sampled);
    const inputTensor = tf.tensor2d([normalized]);

    // Run encoder → 16-dim bottleneck
    const embeddingTensor = this.spectralModel.predict(inputTensor) as tf.Tensor;
    const embedding16 = await embeddingTensor.data();
    const embeddingArray = Array.from(embedding16);

    let reconstructionError = 0.5; // neutral default

    if (this.decoderModel) {
      try {
        const reconTensor = this.decoderModel.predict(embeddingTensor) as tf.Tensor;
        const reconData = await reconTensor.data();
        const reconArray = Array.from(reconData);

        // Mean squared reconstruction error (0 = perfect, higher = worse)
        let mse = 0;
        for (let i = 0; i < normalized.length; i++) {
          const diff = normalized[i] - reconArray[i];
          mse += diff * diff;
        }
        reconstructionError = mse / normalized.length;

        reconTensor.dispose();
      } catch (e) {
        // decoder failed — keep neutral error
      }
    }

    embeddingTensor.dispose();
    inputTensor.dispose();

    // Keep the expanded 100-dim version for existing consumers (neuralSpectra)
    const expanded = this.expandNeuralSpectra(embeddingArray);

    return {
      embedding: expanded,
      reconstructionError: Math.min(Math.max(reconstructionError, 0), 2),
    };
  }

  private async generateSynapticSequence(input: NeuralInput): Promise<string> {
    if (!this.patternModel) return this.getFallbackSynapticSequence();
    try {
      const features = [
        ...input.temporalPhases,
        input.isotopeFactor,
        input.fractalToggle ? 1 : 0,
        input.spectrumData.granularity / 10,
        input.spectrumData.source === 'SDSS' ? 1 : 0,
        deterministicRandom(generateCycle(), 0),
      ];
      while (features.length < 8) features.push(0);
      features.splice(8);

      const inputTensor = tf.tensor2d([features]);
      const prediction = this.patternModel.predict(inputTensor) as tf.Tensor;
      const data = await prediction.data();
      inputTensor.dispose();
      prediction.dispose();
      return this.mapToSynapticSequence(Array.from(data));
    } catch (error) {
      console.warn('[NeuralFusion] sequence gen failed:', error);
      return this.getFallbackSynapticSequence();
    }
  }

  private calculateMetamorphosisIndex(input: NeuralInput, neuralSpectra: number[]): number {
    const spectralVariance = this.calculateVariance(input.spectrumData.intensities);
    const neuralVariance = this.calculateVariance(neuralSpectra);
    const phaseCoherence = this.calculatePhaseCoherence(input.temporalPhases);
    const granularityFactor = Math.min(input.spectrumData.granularity / 2, 1);
    let index = spectralVariance * 0.3 + neuralVariance * 0.3 + phaseCoherence * 0.2 + granularityFactor * 0.2;
    index *= input.isotopeFactor;
    if (input.fractalToggle) index *= 1.2;
    return Math.min(Math.max(index, 0), 1);
  }

  private calculateConfidence(
    neuralSpectra: number[],
    input: NeuralInput,
    reconstructionError: number = 0.5
  ): number {
    // === Primary signal: reconstruction quality ===
    // Lower reconstruction error = model understands this solar state well
    // We normalize error (typical good < 0.15, bad > 0.6)
    const reconQuality = 1 - Math.min(reconstructionError / 0.8, 1.0);

    // Secondary: activation strength of the embedding
    const strength = neuralSpectra.reduce((s, v) => s + Math.abs(v), 0) / neuralSpectra.length;

    // Tertiary: solar regime (we now train on diverse conditions)
    let solarFactor = 1.0;
    if (input.solarFeatures?.activityLevel) {
      const act = input.solarFeatures.activityLevel;
      if (act === 'storm') solarFactor = 0.88;
      else if (act === 'active') solarFactor = 0.95;
      else if (act === 'quiet') solarFactor = 1.06;
    }

    const quality = input.spectrumData.source === 'SDSS' ? 0.95 : 0.82;
    const granularityBonus = Math.min(input.spectrumData.granularity / 2, 0.12);

    // Heavily weight reconstruction quality — this is the honest "I know this sun" signal
    let conf = (reconQuality * 0.55) + (strength * quality * 0.25) + (solarFactor * 0.12) + granularityBonus;

    return Math.min(Math.max(conf, 0.28), 0.96);
  }

  private expandNeuralSpectra(compressed: number[]): number[] {
    const expanded: number[] = [];
    const ratio = 100 / compressed.length;
    for (let i = 0; i < 100; i++) {
      const src = i / ratio;
      const lo = Math.floor(src);
      const hi = Math.min(Math.ceil(src), compressed.length - 1);
      const t = src - lo;
      expanded.push(compressed[lo] * (1 - t) + compressed[hi] * t);
    }
    return expanded;
  }

  private mapToSynapticSequence(prediction: number[]): string {
    const idx = prediction.indexOf(Math.max(...prediction));
    return SEQUENCES[idx] || SEQUENCES[0];
  }

  private getFallbackOutput(input: NeuralInput): NeuralOutput {
    // Better fallback that still reacts to solar conditions
    let baseMeta = 0.48 + deterministicRandom(generateCycle(), 0) * 0.28;
    let baseConf = 0.55;

    if (input.solarFeatures?.activityLevel === 'storm') {
      baseConf = 0.42;
      baseMeta *= 0.9;
    } else if (input.solarFeatures?.activityLevel === 'quiet') {
      baseConf = 0.68;
    }

    const { metamorphosisIndex, confidenceScore, modulation } = applySolarOutputModulation(
      baseMeta, baseConf, input.solarFeatures
    );
    return {
      synapticSequence: this.getFallbackSynapticSequence(),
      neuralSpectra: this.generateFallbackSpectra(input.spectrumData.intensities.length),
      metamorphosisIndex,
      confidenceScore,
      solarModulation: modulation,
      reconstructionError: 0.65,
      spectralQuality: 0.42,
    };
  }

  private getFallbackSynapticSequence(): string {
    const fbs = ['neural pathways synchronizing', 'quantum field harmonics detected', 'temporal flux stabilizing', 'spectral coherence achieved'];
    return fbs[Math.floor(deterministicRandom(generateCycle(), 0) * fbs.length)];
  }

  private generateFallbackSpectra(size: number): number[] {
    return Array.from({ length: Math.min(size, 100) }, (_, i) => deterministicRandom(generateCycle(), i) * 0.8 + 0.1);
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private calculatePhaseCoherence(phases: number[]): number {
    if (phases.length < 2) return 0;
    let sumCos = 0, sumSin = 0;
    for (const p of phases) { sumCos += Math.cos(p); sumSin += Math.sin(p); }
    return Math.sqrt((sumCos / phases.length) ** 2 + (sumSin / phases.length) ** 2);
  }

  dispose(): void {
    if (this.spectralModel) this.spectralModel.dispose();
    if (this.patternModel) this.patternModel.dispose();
  }

  get isTrainedModel(): boolean { return this.isTrained; }
}
