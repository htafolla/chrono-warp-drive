// Background Processing Manager for BLURRN v4.5 - Phase 9
// Manages Web Workers for neural, temporal, and mathematical computations

export interface BackgroundTask {
  id: string;
  type: 'NEURAL_FUSION' | 'TEMPORAL_CALC' | 'SPECTRUM_ANALYSIS' | 'MATHEMATICAL_OPS';
  data: any;
  priority: 'high' | 'medium' | 'low';
}

export interface BackgroundResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
}

export class BackgroundProcessingManager {
  private static instance: BackgroundProcessingManager;
  private workers: Map<string, Worker> = new Map();
  private taskQueue: BackgroundTask[] = [];
  private activePromises: Map<string, { resolve: Function; reject: Function }> = new Map();
  private workerPool: Worker[] = [];
  private maxWorkers = Math.min(navigator.hardwareConcurrency || 4, 8);
  private isInitialized = false;

  static getInstance(): BackgroundProcessingManager {
    if (!BackgroundProcessingManager.instance) {
      BackgroundProcessingManager.instance = new BackgroundProcessingManager();
    }
    return BackgroundProcessingManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create neural processing worker
      const neuralWorker = this.createNeuralWorker();
      this.workers.set('neural', neuralWorker);

      // Create temporal calculation worker
      const temporalWorker = this.createTemporalWorker();
      this.workers.set('temporal', temporalWorker);

      // Create mathematical operations worker
      const mathWorker = this.createMathWorker();
      this.workers.set('math', mathWorker);

      // Create general computation worker pool
      for (let i = 0; i < this.maxWorkers - 3; i++) {
        const worker = this.createGeneralWorker();
        this.workerPool.push(worker);
      }

      this.isInitialized = true;
      console.log(`Background Processing Manager initialized with ${this.maxWorkers} workers`);
    } catch (error) {
      console.error('Failed to initialize background processing:', error);
      throw error;
    }
  }

  async processTask<T>(task: BackgroundTask): Promise<T> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.activePromises.set(task.id, { resolve, reject });
      
      // Add to queue and process
      this.taskQueue.push(task);
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    // Sort by priority
    this.taskQueue.sort((a, b) => {
      const priorities = { high: 3, medium: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });

    const task = this.taskQueue.shift();
    if (!task) return;

    this.executeTask(task);
  }

  private executeTask(task: BackgroundTask): void {
    const startTime = performance.now();
    let worker: Worker | null = null;

    switch (task.type) {
      case 'NEURAL_FUSION':
        worker = this.workers.get('neural');
        break;
      case 'TEMPORAL_CALC':
        worker = this.workers.get('temporal');
        break;
      case 'MATHEMATICAL_OPS':
        worker = this.workers.get('math');
        break;
      case 'SPECTRUM_ANALYSIS':
        worker = this.getAvailableWorker();
        break;
    }

    if (!worker) {
      this.handleTaskError(task.id, 'No available worker', performance.now() - startTime);
      return;
    }

    const messageHandler = (e: MessageEvent) => {
      const { taskId, success, result, error } = e.data;
      
      if (taskId === task.id) {
        worker!.removeEventListener('message', messageHandler);
        
        if (success) {
          this.handleTaskSuccess(taskId, result, performance.now() - startTime);
        } else {
          this.handleTaskError(taskId, error, performance.now() - startTime);
        }

        // Process next task in queue
        this.processQueue();
      }
    };

    worker.addEventListener('message', messageHandler);
    worker.postMessage({
      taskId: task.id,
      type: task.type,
      data: task.data
    });
  }

  private handleTaskSuccess(taskId: string, result: any, executionTime: number): void {
    const promise = this.activePromises.get(taskId);
    if (promise) {
      promise.resolve(result);
      this.activePromises.delete(taskId);
    }
  }

  private handleTaskError(taskId: string, error: string, executionTime: number): void {
    const promise = this.activePromises.get(taskId);
    if (promise) {
      promise.reject(new Error(error));
      this.activePromises.delete(taskId);
    }
  }

  private getAvailableWorker(): Worker | null {
    return this.workerPool.length > 0 ? this.workerPool[0] : null;
  }

  private createNeuralWorker(): Worker {
    const workerCode = `
      // Neural Fusion Worker
      importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
      
      let spectralModel = null;
      let patternModel = null;
      let isInitialized = false;

      self.onmessage = async function(e) {
        const { taskId, type, data } = e.data;
        const startTime = performance.now();

        try {
          if (!isInitialized) {
            await initializeModels();
          }

          let result;
          switch (type) {
            case 'NEURAL_FUSION':
              result = await processNeuralFusion(data);
              break;
            default:
              throw new Error('Unknown neural operation');
          }

          self.postMessage({
            taskId,
            success: true,
            result,
            executionTime: performance.now() - startTime
          });
        } catch (error) {
          self.postMessage({
            taskId,
            success: false,
            error: error.message,
            executionTime: performance.now() - startTime
          });
        }
      };

      async function initializeModels() {
        try {
          await tf.ready();
          await tf.setBackend('cpu'); // Use CPU in worker

          // Create spectral model
          spectralModel = tf.sequential({
            layers: [
              tf.layers.dense({ inputShape: [200], units: 128, activation: 'relu' }),
              tf.layers.dropout({ rate: 0.3 }),
              tf.layers.dense({ units: 64, activation: 'relu' }),
              tf.layers.dropout({ rate: 0.2 }),
              tf.layers.dense({ units: 32, activation: 'relu' }),
              tf.layers.dense({ units: 16, activation: 'sigmoid' })
            ]
          });

          spectralModel.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['mse']
          });

          // Create pattern model
          patternModel = tf.sequential({
            layers: [
              tf.layers.dense({ inputShape: [8], units: 32, activation: 'tanh' }),
              tf.layers.dense({ units: 16, activation: 'relu' }),
              tf.layers.dense({ units: 8, activation: 'softmax' })
            ]
          });

          patternModel.compile({
            optimizer: 'adam',
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
          });

          isInitialized = true;
        } catch (error) {
          console.error('Model initialization failed:', error);
          throw error;
        }
      }

      async function processNeuralFusion(input) {
        // Process spectrum
        const sampledIntensities = sampleArray(input.spectrumData.intensities, 200);
        const normalized = normalizeArray(sampledIntensities);
        
        const inputTensor = tf.tensor2d([normalized]);
        const prediction = spectralModel.predict(inputTensor);
        const predictionData = await prediction.data();
        
        inputTensor.dispose();
        prediction.dispose();

        const neuralSpectra = expandNeuralSpectra(Array.from(predictionData));

        // Generate synaptic sequence
        const features = [
          ...input.temporalPhases.slice(0, 3),
          input.isotopeFactor,
          input.fractalToggle ? 1 : 0,
          input.spectrumData.granularity / 10,
          input.spectrumData.source === 'SDSS' ? 1 : 0,
          Math.random()
        ].slice(0, 8);

        while (features.length < 8) features.push(0);

        const featureTensor = tf.tensor2d([features]);
        const patternPrediction = patternModel.predict(featureTensor);
        const patternData = await patternPrediction.data();

        featureTensor.dispose();
        patternPrediction.dispose();

        const synapticSequence = mapToSynapticSequence(Array.from(patternData));

        // Calculate metrics
        const metamorphosisIndex = calculateMetamorphosisIndex(input, neuralSpectra);
        const confidenceScore = calculateConfidence(neuralSpectra, input);

        return {
          synapticSequence,
          neuralSpectra,
          metamorphosisIndex,
          confidenceScore
        };
      }

      function sampleArray(array, targetSize) {
        if (array.length <= targetSize) return array;
        const step = array.length / targetSize;
        const sampled = [];
        for (let i = 0; i < targetSize; i++) {
          sampled.push(array[Math.floor(i * step)]);
        }
        return sampled;
      }

      function normalizeArray(array) {
        const max = Math.max(...array);
        const min = Math.min(...array);
        const range = max - min;
        return range === 0 ? array.map(() => 0.5) : array.map(val => (val - min) / range);
      }

      function expandNeuralSpectra(compressed) {
        const expanded = [];
        const ratio = 100 / compressed.length;
        for (let i = 0; i < 100; i++) {
          const sourceIndex = i / ratio;
          const lowerIndex = Math.floor(sourceIndex);
          const upperIndex = Math.min(Math.ceil(sourceIndex), compressed.length - 1);
          const t = sourceIndex - lowerIndex;
          const interpolated = compressed[lowerIndex] * (1 - t) + compressed[upperIndex] * t;
          expanded.push(interpolated);
        }
        return expanded;
      }

      function mapToSynapticSequence(prediction) {
        const sequences = [
          "quantum entanglement matrix activated",
          "temporal phase coherence achieved",
          "spectral metamorphosis in progress",
          "dimensional flux stabilized",
          "neural pathway synchronized",
          "isotropic field harmonized",
          "chrono-spectral fusion initiated",
          "metamorphic resonance detected"
        ];
        const maxIndex = prediction.indexOf(Math.max(...prediction));
        return sequences[maxIndex] || sequences[0];
      }

      function calculateMetamorphosisIndex(input, neuralSpectra) {
        const spectralVariance = calculateVariance(input.spectrumData.intensities);
        const neuralVariance = calculateVariance(neuralSpectra);
        const phaseCoherence = calculatePhaseCoherence(input.temporalPhases);
        const granularityFactor = Math.min(input.spectrumData.granularity / 2, 1);
        
        let index = spectralVariance * 0.3 + neuralVariance * 0.3 + phaseCoherence * 0.2 + granularityFactor * 0.2;
        index *= input.isotopeFactor;
        if (input.fractalToggle) index *= 1.2;
        
        return Math.min(Math.max(index, 0), 1);
      }

      function calculateConfidence(neuralSpectra, input) {
        const neuralStrength = neuralSpectra.reduce((sum, val) => sum + Math.abs(val), 0) / neuralSpectra.length;
        const dataQuality = input.spectrumData.source === 'SDSS' ? 0.9 : 0.7;
        const granularityBonus = Math.min(input.spectrumData.granularity / 2, 0.2);
        return Math.min(neuralStrength * dataQuality + granularityBonus, 1);
      }

      function calculateVariance(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b) / values.length;
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b) / values.length;
      }

      function calculatePhaseCoherence(phases) {
        if (phases.length < 2) return 0;
        let sumCos = 0;
        let sumSin = 0;
        for (const phase of phases) {
          sumCos += Math.cos(phase);
          sumSin += Math.sin(phase);
        }
        const avgCos = sumCos / phases.length;
        const avgSin = sumSin / phases.length;
        return Math.sqrt(avgCos * avgCos + avgSin * avgSin);
      }
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }

  private createTemporalWorker(): Worker {
    const workerCode = `
      // Temporal Calculation Worker
      self.onmessage = async function(e) {
        const { taskId, type, data } = e.data;
        const startTime = performance.now();

        try {
          let result;
          switch (type) {
            case 'TEMPORAL_CALC':
              result = await calculateTemporalComponents(data);
              break;
            default:
              throw new Error('Unknown temporal operation');
          }

          self.postMessage({
            taskId,
            success: true,
            result,
            executionTime: performance.now() - startTime
          });
        } catch (error) {
          self.postMessage({
            taskId,
            success: false,
            error: error.message,
            executionTime: performance.now() - startTime
          });
        }
      };

      async function calculateTemporalComponents(data) {
        const { inputData, L, phi, c, delta_t } = data;
        
        // Calculate all temporal components
        const T_c = integrateA_m(inputData);
        const P_s = computeP_s(inputData);
        const E_t = computeE_t(inputData, c);
        const W_c = inputData.intensities.length > 0 ? 1 : 0;
        const C_m = computeC_m(inputData);
        const K_l = computeK_l(inputData);
        const F_r = computeF_r(inputData);
        const S_l = computeS_l(inputData);
        const Q_e = computeQ_e(inputData);
        const Sp_g = computeSp_g(inputData);
        const G_r = computeG_r(inputData);

        // Calculate tPTT value
        const tPTT_value = T_c * (P_s / E_t) * phi * (c / delta_t) * 
                          W_c * C_m * K_l * F_r * S_l * Q_e * Sp_g * G_r;

        return {
          tPTT_value,
          components: { T_c, P_s, E_t, W_c, C_m, K_l, F_r, S_l, Q_e, Sp_g, G_r }
        };
      }

      function integrateA_m(inputData) {
        if (!inputData || inputData.intensities.length === 0) return 1.0;
        const sum = inputData.intensities.reduce((acc, intensity) => acc + intensity, 0);
        return sum / inputData.intensities.length;
      }

      function computeP_s(inputData) {
        if (!inputData) return 1.0;
        const variance = calculateVariance(inputData.intensities);
        return Math.exp(-variance / 2);
      }

      function computeE_t(inputData, c) {
        if (!inputData) return 0.5;
        const energy = inputData.intensities.reduce((acc, intensity, i) => {
          const wavelength = inputData.wavelengths[i] || (3800 + i);
          return acc + intensity * (c / (wavelength * 1e-10));
        }, 0);
        return Math.min(energy / 1e15, 2.0);
      }

      function computeC_m(inputData) {
        if (!inputData) return 0.5;
        const autocorrelation = calculateAutocorrelation(inputData.intensities);
        return Math.min(autocorrelation, 1.0);
      }

      function computeK_l(inputData) {
        if (!inputData) return 0.7;
        const phaseCoherence = calculatePhaseCoherence(inputData.intensities);
        return 0.5 + (phaseCoherence * 0.5);
      }

      function computeF_r(inputData) {
        if (!inputData) return 0.9;
        const fractalDimension = estimateFractalDimension(inputData.intensities);
        return Math.min(fractalDimension / 2, 1.0);
      }

      function computeS_l(inputData) {
        if (!inputData) return 0.6;
        const crossCorr = calculateCrossBandCorrelation(inputData);
        return 0.3 + (crossCorr * 0.7);
      }

      function computeQ_e(inputData) {
        if (!inputData) return 0.4;
        const quantumAdaptFactor = 0.3;
        const entanglementMeasure = calculateQuantumEntanglement(inputData);
        return entanglementMeasure * (1 + quantumAdaptFactor);
      }

      function computeSp_g(inputData) {
        if (!inputData) return 1.0;
        const wavelengthRange = Math.max(...inputData.wavelengths) - Math.min(...inputData.wavelengths);
        return inputData.wavelengths.length / wavelengthRange;
      }

      function computeG_r(inputData) {
        if (!inputData) return 1.0;
        const dataQuality = assessDataQuality(inputData);
        const adaptiveGranularity = inputData.granularity / 5.0;
        return Math.min(dataQuality * adaptiveGranularity, 2.0);
      }

      // Mathematical helper functions
      function calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b) / values.length;
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b) / values.length;
      }

      function calculateAutocorrelation(data) {
        if (data.length < 2) return 0;
        const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
        const variance = calculateVariance(data);
        if (variance === 0) return 1;
        
        let autocorr = 0;
        const lag = Math.min(10, Math.floor(data.length / 4));
        for (let i = 0; i < data.length - lag; i++) {
          autocorr += (data[i] - mean) * (data[i + lag] - mean);
        }
        return Math.abs(autocorr / ((data.length - lag) * variance));
      }

      function calculatePhaseCoherence(data) {
        if (data.length < 4) return 0;
        const phases = data.map((val, i) => Math.atan2(val, data[(i + 1) % data.length]));
        let sumCos = 0;
        let sumSin = 0;
        for (const phase of phases) {
          sumCos += Math.cos(phase);
          sumSin += Math.sin(phase);
        }
        const avgCos = sumCos / phases.length;
        const avgSin = sumSin / phases.length;
        return Math.sqrt(avgCos * avgCos + avgSin * avgSin);
      }

      function estimateFractalDimension(data) {
        if (data.length < 8) return 1;
        let totalVariation = 0;
        for (let i = 1; i < data.length; i++) {
          totalVariation += Math.abs(data[i] - data[i - 1]);
        }
        const normalizedVariation = totalVariation / (Math.max(...data) - Math.min(...data));
        return 1 + Math.log(normalizedVariation) / Math.log(data.length);
      }

      function calculateCrossBandCorrelation(inputData) {
        if (!inputData || inputData.intensities.length < 100) return 0.5;
        const data = inputData.intensities;
        const segmentSize = Math.floor(data.length / 4);
        const segments = [
          data.slice(0, segmentSize),
          data.slice(segmentSize, 2 * segmentSize),
          data.slice(2 * segmentSize, 3 * segmentSize),
          data.slice(3 * segmentSize)
        ];
        
        let totalCorrelation = 0;
        let comparisons = 0;
        for (let i = 0; i < segments.length; i++) {
          for (let j = i + 1; j < segments.length; j++) {
            totalCorrelation += calculateCorrelation(segments[i], segments[j]);
            comparisons++;
          }
        }
        return comparisons > 0 ? Math.abs(totalCorrelation / comparisons) : 0.5;
      }

      function calculateQuantumEntanglement(inputData) {
        if (!inputData) return 0.4;
        const data = inputData.intensities;
        const probabilities = data.map(val => Math.abs(val) / data.reduce((sum, v) => sum + Math.abs(v), 0));
        let entropy = 0;
        probabilities.forEach(p => {
          if (p > 0) {
            entropy -= p * Math.log2(p);
          }
        });
        const maxEntropy = Math.log2(probabilities.length);
        return maxEntropy > 0 ? entropy / maxEntropy : 0;
      }

      function assessDataQuality(inputData) {
        if (!inputData) return 0.5;
        const data = inputData.intensities;
        const signal = data.reduce((sum, val) => sum + Math.abs(val), 0) / data.length;
        const noise = Math.sqrt(calculateVariance(data));
        const snr = noise > 0 ? signal / noise : 1;
        return Math.min(snr / 10, 1.0);
      }

      function calculateCorrelation(arr1, arr2) {
        const n = Math.min(arr1.length, arr2.length);
        if (n < 2) return 0;
        const mean1 = arr1.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
        const mean2 = arr2.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
        let numerator = 0, sumSq1 = 0, sumSq2 = 0;
        for (let i = 0; i < n; i++) {
          const diff1 = arr1[i] - mean1;
          const diff2 = arr2[i] - mean2;
          numerator += diff1 * diff2;
          sumSq1 += diff1 * diff1;
          sumSq2 += diff2 * diff2;
        }
        const denominator = Math.sqrt(sumSq1 * sumSq2);
        return denominator > 0 ? numerator / denominator : 0;
      }
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }

  private createMathWorker(): Worker {
    const workerCode = `
      // Mathematical Operations Worker
      self.onmessage = async function(e) {
        const { taskId, type, data } = e.data;
        const startTime = performance.now();

        try {
          let result;
          switch (type) {
            case 'MATHEMATICAL_OPS':
              result = await performMathematicalOperations(data);
              break;
            default:
              throw new Error('Unknown mathematical operation');
          }

          self.postMessage({
            taskId,
            success: true,
            result,
            executionTime: performance.now() - startTime
          });
        } catch (error) {
          self.postMessage({
            taskId,
            success: false,
            error: error.message,
            executionTime: performance.now() - startTime
          });
        }
      };

      async function performMathematicalOperations(data) {
        const { operation, values } = data;
        
        switch (operation) {
          case 'VARIANCE':
            return calculateVariance(values);
          case 'CORRELATION':
            return calculateCorrelation(values.arr1, values.arr2);
          case 'FFT':
            return performFFT(values);
          case 'STATISTICS':
            return calculateStatistics(values);
          default:
            throw new Error('Unknown math operation');
        }
      }

      function calculateVariance(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b) / values.length;
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b) / values.length;
      }

      function calculateCorrelation(arr1, arr2) {
        const n = Math.min(arr1.length, arr2.length);
        if (n < 2) return 0;
        const mean1 = arr1.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
        const mean2 = arr2.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
        let numerator = 0, sumSq1 = 0, sumSq2 = 0;
        for (let i = 0; i < n; i++) {
          const diff1 = arr1[i] - mean1;
          const diff2 = arr2[i] - mean2;
          numerator += diff1 * diff2;
          sumSq1 += diff1 * diff1;
          sumSq2 += diff2 * diff2;
        }
        const denominator = Math.sqrt(sumSq1 * sumSq2);
        return denominator > 0 ? numerator / denominator : 0;
      }

      function performFFT(values) {
        // Simple FFT implementation for spectral analysis
        const N = values.length;
        if (N <= 1) return values;
        
        // Simplified FFT for worker (full implementation would be more complex)
        const result = [];
        for (let k = 0; k < N; k++) {
          let real = 0, imag = 0;
          for (let n = 0; n < N; n++) {
            const angle = -2 * Math.PI * k * n / N;
            real += values[n] * Math.cos(angle);
            imag += values[n] * Math.sin(angle);
          }
          result.push({ real, imag, magnitude: Math.sqrt(real * real + imag * imag) });
        }
        return result;
      }

      function calculateStatistics(values) {
        if (values.length === 0) return {};
        
        const sorted = [...values].sort((a, b) => a - b);
        const mean = values.reduce((a, b) => a + b) / values.length;
        const variance = calculateVariance(values);
        const stdDev = Math.sqrt(variance);
        
        return {
          mean,
          median: sorted[Math.floor(sorted.length / 2)],
          variance,
          stdDev,
          min: Math.min(...values),
          max: Math.max(...values),
          range: Math.max(...values) - Math.min(...values),
          skewness: calculateSkewness(values, mean, stdDev),
          kurtosis: calculateKurtosis(values, mean, stdDev)
        };
      }

      function calculateSkewness(values, mean, stdDev) {
        if (stdDev === 0) return 0;
        const n = values.length;
        const sum = values.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0);
        return (n / ((n - 1) * (n - 2))) * sum;
      }

      function calculateKurtosis(values, mean, stdDev) {
        if (stdDev === 0) return 0;
        const n = values.length;
        const sum = values.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0);
        return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
      }
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }

  private createGeneralWorker(): Worker {
    const workerCode = `
      self.onmessage = async function(e) {
        const { taskId, type, data } = e.data;
        const startTime = performance.now();

        try {
          let result;
          switch (type) {
            case 'SPECTRUM_ANALYSIS':
              result = await analyzeSpectrum(data);
              break;
            default:
              throw new Error('Unknown operation');
          }

          self.postMessage({
            taskId,
            success: true,
            result,
            executionTime: performance.now() - startTime
          });
        } catch (error) {
          self.postMessage({
            taskId,
            success: false,
            error: error.message,
            executionTime: performance.now() - startTime
          });
        }
      };

      async function analyzeSpectrum(data) {
        const { wavelengths, intensities, operation } = data;
        
        switch (operation) {
          case 'DOWNSAMPLE':
            return downsampleSpectrum(intensities, data.targetSize);
          case 'SMOOTH':
            return smoothSpectrum(intensities, data.windowSize);
          case 'NORMALIZE':
            return normalizeSpectrum(intensities);
          default:
            throw new Error('Unknown spectrum operation');
        }
      }

      function downsampleSpectrum(intensities, targetSize) {
        if (intensities.length <= targetSize) return intensities;
        const step = intensities.length / targetSize;
        const downsampled = [];
        for (let i = 0; i < targetSize; i++) {
          const index = Math.floor(i * step);
          downsampled.push(intensities[index]);
        }
        return downsampled;
      }

      function smoothSpectrum(intensities, windowSize = 5) {
        const smoothed = [];
        const halfWindow = Math.floor(windowSize / 2);
        
        for (let i = 0; i < intensities.length; i++) {
          let sum = 0;
          let count = 0;
          
          for (let j = Math.max(0, i - halfWindow); j <= Math.min(intensities.length - 1, i + halfWindow); j++) {
            sum += intensities[j];
            count++;
          }
          
          smoothed.push(sum / count);
        }
        
        return smoothed;
      }

      function normalizeSpectrum(intensities) {
        const max = Math.max(...intensities);
        const min = Math.min(...intensities);
        const range = max - min;
        
        if (range === 0) return intensities.map(() => 0.5);
        
        return intensities.map(val => (val - min) / range);
      }
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }

  // Public API methods
  async processNeuralFusion(input: any): Promise<any> {
    const task: BackgroundTask = {
      id: `neural_${Date.now()}_${Math.random()}`,
      type: 'NEURAL_FUSION',
      data: input,
      priority: 'high'
    };

    return this.processTask(task);
  }

  async processTemporalCalculation(inputData: any, constants: any): Promise<any> {
    const task: BackgroundTask = {
      id: `temporal_${Date.now()}_${Math.random()}`,
      type: 'TEMPORAL_CALC',
      data: { inputData, ...constants },
      priority: 'high'
    };

    return this.processTask(task);
  }

  async processMathematicalOperation(operation: string, values: any): Promise<any> {
    const task: BackgroundTask = {
      id: `math_${Date.now()}_${Math.random()}`,
      type: 'MATHEMATICAL_OPS',
      data: { operation, values },
      priority: 'medium'
    };

    return this.processTask(task);
  }

  async processSpectrumAnalysis(data: any): Promise<any> {
    const task: BackgroundTask = {
      id: `spectrum_${Date.now()}_${Math.random()}`,
      type: 'SPECTRUM_ANALYSIS',
      data,
      priority: 'medium'
    };

    return this.processTask(task);
  }

  getStatus(): { 
    isInitialized: boolean; 
    activeWorkers: number; 
    queueLength: number;
    activePromises: number;
  } {
    return {
      isInitialized: this.isInitialized,
      activeWorkers: this.workers.size + this.workerPool.length,
      queueLength: this.taskQueue.length,
      activePromises: this.activePromises.size
    };
  }

  dispose(): void {
    // Terminate all workers
    this.workers.forEach(worker => worker.terminate());
    this.workerPool.forEach(worker => worker.terminate());
    
    // Clear all data structures
    this.workers.clear();
    this.workerPool = [];
    this.taskQueue = [];
    this.activePromises.clear();
    
    this.isInitialized = false;
    console.log('Background Processing Manager disposed');
  }
}
