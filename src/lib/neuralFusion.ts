// Neural Fusion Engine for BLURRN v4.5
import * as tf from '@tensorflow/tfjs';
import { NeuralInput, NeuralOutput, SpectrumData } from '@/types/sdss';
import { deterministicRandom, deterministicSelect, generateCycle } from './deterministicUtils';

export class NeuralFusion {
  private spectralModel: tf.LayersModel | null = null;
  private patternModel: tf.LayersModel | null = null;
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    try {
      // Initialize TensorFlow.js with WebGL backend
      await tf.ready();
      
      // Set backend to WebGL with CPU fallback
      try {
        await tf.setBackend('webgl');
        console.log('TensorFlow.js WebGL backend initialized');
      } catch (webglError) {
        console.warn('WebGL backend failed, falling back to CPU:', webglError);
        await tf.setBackend('cpu');
      }
      
      // Initialize spectral analysis model
      this.spectralModel = await this.createSpectralModel();
      
      // Initialize pattern recognition model
      this.patternModel = await this.createPatternModel();
      
      this.isInitialized = true;
      console.log('Neural fusion engine initialized successfully');
    } catch (error) {
      console.error('Neural fusion initialization failed:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  private async createSpectralModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [200], // Downsampled spectrum input
          units: 128,
          activation: 'relu',
          kernelInitializer: 'randomNormal'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 16,
          activation: 'sigmoid' // Output neural spectra features
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mse']
    });

    return model;
  }

  private async createPatternModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [8], // Phase + isotope + fractal features
          units: 32,
          activation: 'tanh'
        }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 8,
          activation: 'softmax' // Pattern classification
        })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  async processNeuralInput(input: NeuralInput): Promise<NeuralOutput> {
    if (!this.isInitialized || !this.spectralModel || !this.patternModel) {
      return this.getFallbackOutput(input);
    }

    try {
      // Process spectrum through neural network
      const neuralSpectra = await this.processSpectrum(input.spectrumData);
      
      // Generate synaptic sequence from patterns
      const synapticSequence = await this.generateSynapticSequence(input);
      
      // Calculate metamorphosis index
      const metamorphosisIndex = this.calculateMetamorphosisIndex(input, neuralSpectra);
      
      // Calculate confidence score
      const confidenceScore = this.calculateConfidence(neuralSpectra, input);

      return {
        synapticSequence,
        neuralSpectra,
        metamorphosisIndex,
        confidenceScore
      };
    } catch (error) {
      console.warn('Neural processing failed, using fallback:', error);
      return this.getFallbackOutput(input);
    }
  }

  private async processSpectrum(spectrumData: SpectrumData): Promise<number[]> {
    if (!this.spectralModel) {
      throw new Error('Spectral model not initialized');
    }

    // Downsample spectrum to 200 points for neural processing
    const sampledIntensities = this.sampleArray(spectrumData.intensities, 200);
    
    // Normalize intensities
    const normalized = this.normalizeArray(sampledIntensities);
    
    // Create tensor and predict
    const inputTensor = tf.tensor2d([normalized]);
    const prediction = this.spectralModel.predict(inputTensor) as tf.Tensor;
    const predictionData = await prediction.data();
    
    // Cleanup tensors
    inputTensor.dispose();
    prediction.dispose();
    
    // Convert to neural spectra (expand back to useful size)
    return this.expandNeuralSpectra(Array.from(predictionData));
  }

  private async generateSynapticSequence(input: NeuralInput): Promise<string> {
    if (!this.patternModel) {
      return this.getFallbackSynapticSequence();
    }

    try {
      // Create feature vector from input
      const features = [
        ...input.temporalPhases, // 3 phase values
        input.isotopeFactor,
        input.fractalToggle ? 1 : 0,
        input.spectrumData.granularity / 10, // Normalized granularity
        input.spectrumData.source === 'SDSS' ? 1 : 0,
        deterministicRandom(generateCycle(), 0) // Add deterministic entropy
      ];

      // Pad or trim to exactly 8 features
      while (features.length < 8) features.push(0);
      features.splice(8);

      const inputTensor = tf.tensor2d([features]);
      const prediction = this.patternModel.predict(inputTensor) as tf.Tensor;
      const predictionData = await prediction.data();

      // Cleanup
      inputTensor.dispose();
      prediction.dispose();

      // Map prediction to synaptic sequences
      return this.mapToSynapticSequence(Array.from(predictionData));
    } catch (error) {
      console.warn('Synaptic sequence generation failed:', error);
      return this.getFallbackSynapticSequence();
    }
  }

  private calculateMetamorphosisIndex(input: NeuralInput, neuralSpectra: number[]): number {
    // Calculate based on spectral complexity and neural response
    const spectralVariance = this.calculateVariance(input.spectrumData.intensities);
    const neuralVariance = this.calculateVariance(neuralSpectra);
    
    const phaseCoherence = this.calculatePhaseCoherence(input.temporalPhases);
    const granularityFactor = Math.min(input.spectrumData.granularity / 2, 1);
    
    let index = (spectralVariance * 0.3 + neuralVariance * 0.3 + phaseCoherence * 0.2 + granularityFactor * 0.2);
    
    // Apply isotope and fractal modulations
    index *= input.isotopeFactor;
    if (input.fractalToggle) {
      index *= 1.2;
    }
    
    return Math.min(Math.max(index, 0), 1);
  }

  private calculateConfidence(neuralSpectra: number[], input: NeuralInput): number {
    // Base confidence on neural activation strength and input quality
    const neuralStrength = neuralSpectra.reduce((sum, val) => sum + Math.abs(val), 0) / neuralSpectra.length;
    const dataQuality = input.spectrumData.source === 'SDSS' ? 0.9 : 0.7;
    const granularityBonus = Math.min(input.spectrumData.granularity / 2, 0.2);
    
    return Math.min(neuralStrength * dataQuality + granularityBonus, 1);
  }

  private expandNeuralSpectra(compressed: number[]): number[] {
    // Expand 16 neural features to 100-point spectra using interpolation
    const expanded: number[] = [];
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

  private mapToSynapticSequence(prediction: number[]): string {
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
    
    // Find the highest activation
    const maxIndex = prediction.indexOf(Math.max(...prediction));
    return sequences[maxIndex] || sequences[0];
  }

  private getFallbackOutput(input: NeuralInput): NeuralOutput {
    return {
      synapticSequence: this.getFallbackSynapticSequence(),
      neuralSpectra: this.generateFallbackSpectra(input.spectrumData.intensities.length),
      metamorphosisIndex: 0.5 + deterministicRandom(generateCycle(), 0) * 0.3,
      confidenceScore: 0.6 + deterministicRandom(generateCycle(), 1) * 0.2
    };
  }

  private getFallbackSynapticSequence(): string {
    const fallbacks = [
      "neural pathways synchronizing",
      "quantum field harmonics detected",
      "temporal flux stabilizing",
      "spectral coherence achieved"
    ];
    return deterministicSelect(fallbacks, generateCycle(), 0);
  }

  private generateFallbackSpectra(size: number): number[] {
    const spectra: number[] = [];
    for (let i = 0; i < Math.min(size, 100); i++) {
      spectra.push(deterministicRandom(generateCycle(), i) * 0.8 + 0.1);
    }
    return spectra;
  }

  // Utility methods
  private sampleArray(array: number[], targetSize: number): number[] {
    if (array.length <= targetSize) return array;
    
    const step = array.length / targetSize;
    const sampled: number[] = [];
    
    for (let i = 0; i < targetSize; i++) {
      const index = Math.floor(i * step);
      sampled.push(array[index]);
    }
    
    return sampled;
  }

  private normalizeArray(array: number[]): number[] {
    const max = Math.max(...array);
    const min = Math.min(...array);
    const range = max - min;
    
    if (range === 0) return array.map(() => 0.5);
    
    return array.map(val => (val - min) / range);
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b) / values.length;
  }

  private calculatePhaseCoherence(phases: number[]): number {
    if (phases.length < 2) return 0;
    
    // Use standardized Kuramoto order parameter
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

  dispose(): void {
    if (this.spectralModel) {
      this.spectralModel.dispose();
    }
    if (this.patternModel) {
      this.patternModel.dispose();
    }
  }
}