// BLURRN v4.5 Temporal Photonic Transpondent Transporter Calculator
// Enhanced with SDSS integration. Neural fusion is now sourced from the
// v4.7 TF.js worker in TPTTApp; the v4 calculator no longer fabricates
// neuralOutput here.
import { SpectrumData, TPTTv4Result } from '@/types/sdss';
import { PHI, FREQ, C, DELTA_T } from './temporalCalculator';

export class TemporalCalculatorV4 {
  private inputData: SpectrumData | null = null;

  // v4.5 Constants
  private readonly L = 3; // Trinity constant
  private readonly phi = PHI; // 1.666 Trinitarium ratio
  private readonly c = C; // Speed of light
  private readonly delta_t = DELTA_T; // Time step

  constructor(inputData?: SpectrumData) {
    this.inputData = inputData || null;
  }

  setInputData(data: SpectrumData): void {
    this.inputData = data;
  }

  // Enhanced tPTT calculation with v4.5 formula
  async computeTPTTv4_5(): Promise<TPTTv4Result> {
    if (!this.inputData) {
      throw new Error('No input data available for tPTT calculation');
    }

    // Core calculations
    const T_c = this.integrateA_m();
    const P_s = this.computeP_s();
    const E_t = this.computeE_t();

    // v4.5 Enhancement Factors
    const W_c = this.inputData.intensities.length > 0 ? 1 : 0; // Wavelength coverage
    const C_m = this.computeC_m(); // Coherence matrix - enhanced
    const K_l = this.computeK_l(); // Kuramoto linkage - enhanced
    const F_r = this.computeF_r(); // Fractal resonance - enhanced
    const S_l = this.computeS_l(); // Spectral linkage - enhanced
    const Q_e = this.computeQ_e(); // Quantum entanglement - enhanced with adaptation factor
    const Sp_g = this.computeSp_g(); // Spectral granularity
    const G_r = this.computeG_r(); // Granularity reactor - enhanced

    // Neural fusion is computed by the v4.7 worker in TPTTApp and
    // injected into neuralOutput by the caller. We use stable defaults here.
    const Syn_c = 0.8;
    const N_s = this.computeN_s(null);

    // v4.5 tPTT Formula
    const tPTT_value = T_c * (P_s / E_t) * this.phi * (this.c / this.delta_t) *
                       W_c * C_m * K_l * F_r * S_l * Syn_c * Q_e * Sp_g * N_s * G_r;

    // Generate rippel (neural decoration is appended later by caller if available)
    const rippel = this.generateRippel(tPTT_value, E_t);

    return {
      tPTT_value,
      components: { T_c, P_s, E_t, W_c, C_m, K_l, F_r, S_l, Syn_c, Q_e, Sp_g, N_s, G_r },
      rippel
    };
  }

  private integrateA_m(): number {
    if (!this.inputData || this.inputData.intensities.length === 0) return 1.0;
    
    // Amplitude modulation integration across spectrum
    const sum = this.inputData.intensities.reduce((acc, intensity) => acc + intensity, 0);
    return sum / this.inputData.intensities.length;
  }

  private computeP_s(): number {
    if (!this.inputData) return 1.0;
    
    // Phase synchronization based on spectral coherence
    const variance = this.calculateVariance(this.inputData.intensities);
    return Math.exp(-variance / 2);
  }

  private computeE_t(): number {
    if (!this.inputData) return 0.5;
    
    // Energy temporal based on spectral energy distribution
    const energy = this.inputData.intensities.reduce((acc, intensity, i) => {
      const wavelength = this.inputData!.wavelengths[i] || (3800 + i);
      return acc + intensity * (this.c / (wavelength * 1e-10)); // Convert Å to m
    }, 0);
    
    return Math.min(energy / 1e15, 2.0); // Normalize
  }

  private computeSp_g(): number {
    if (!this.inputData) return 1.0;
    
    // Spectral granularity: points per Å
    const wavelengthRange = Math.max(...this.inputData.wavelengths) - Math.min(...this.inputData.wavelengths);
    return this.inputData.wavelengths.length / wavelengthRange;
  }

  // Enhanced v4.5 component calculations
  private computeC_m(): number {
    if (!this.inputData) return 0.5;
    
    // Coherence matrix based on spectral coherence
    const intensities = this.inputData.intensities;
    const autocorrelation = this.calculateAutocorrelation(intensities);
    return Math.min(autocorrelation, 1.0);
  }

  private computeK_l(): number {
    if (!this.inputData) return 0.7;
    
    // Kuramoto linkage based on phase synchronization patterns
    const phaseCoherence = this.calculatePhaseCoherence(this.inputData.intensities);
    return 0.5 + (phaseCoherence * 0.5);
  }

  private computeF_r(): number {
    if (!this.inputData) return 0.9;
    
    // Fractal resonance based on self-similarity in spectrum
    const fractalDimension = this.estimateFractalDimension(this.inputData.intensities);
    return Math.min(fractalDimension / 2, 1.0);
  }

  private computeS_l(): number {
    if (!this.inputData) return 0.6;
    
    // Spectral linkage based on cross-correlations between different bands
    const crossCorr = this.calculateCrossBandCorrelation();
    return 0.3 + (crossCorr * 0.7);
  }

  private computeQ_e(): number {
    if (!this.inputData) return 0.4;
    
    // Quantum entanglement with v4.5 quantum adaptation factor
    const quantumAdaptFactor = 0.3; // v4.5 enhancement
    const entanglementMeasure = this.calculateQuantumEntanglement();
    return entanglementMeasure * (1 + quantumAdaptFactor);
  }

  private computeG_r(): number {
    if (!this.inputData) return 1.0;
    
    // Granularity reactor based on adaptive data quality assessment
    const dataQuality = this.assessDataQuality();
    const adaptiveGranularity = this.inputData.granularity / 5.0; // Normalized to Pickles 5Å
    return Math.min(dataQuality * adaptiveGranularity, 2.0);
  }

  private computeN_s(neuralOutput: any): number {
    if (!neuralOutput) return 0.5;
    
    // Neural synchronization based on neural network output confidence and coherence
    const confidence = neuralOutput.confidenceScore || 0.5;
    const synchronization = neuralOutput.neuralSpectra ? 
      (neuralOutput.neuralSpectra.length / 100) * confidence : 0.5;
    return Math.min(synchronization, 1.0);
  }

  // Advanced mathematical methods for v4.5 components
  private calculateAutocorrelation(data: number[]): number {
    if (data.length < 2) return 0;
    
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    
    if (variance === 0) return 1;
    
    let autocorr = 0;
    const lag = Math.min(10, Math.floor(data.length / 4));
    
    for (let i = 0; i < data.length - lag; i++) {
      autocorr += (data[i] - mean) * (data[i + lag] - mean);
    }
    
    return Math.abs(autocorr / ((data.length - lag) * variance));
  }

  private calculatePhaseCoherence(data: number[]): number {
    if (data.length < 4) return 0;
    
    // Use standardized Kuramoto order parameter for spectral phases
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

  private estimateFractalDimension(data: number[]): number {
    if (data.length < 8) return 1;
    
    // Box-counting method approximation
    let totalVariation = 0;
    for (let i = 1; i < data.length; i++) {
      totalVariation += Math.abs(data[i] - data[i - 1]);
    }
    
    const normalizedVariation = totalVariation / (Math.max(...data) - Math.min(...data));
    return 1 + Math.log(normalizedVariation) / Math.log(data.length);
  }

  private calculateCrossBandCorrelation(): number {
    if (!this.inputData || this.inputData.intensities.length < 100) return 0.5;
    
    const data = this.inputData.intensities;
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
        totalCorrelation += this.calculateCorrelation(segments[i], segments[j]);
        comparisons++;
      }
    }
    
    return comparisons > 0 ? Math.abs(totalCorrelation / comparisons) : 0.5;
  }

  private calculateQuantumEntanglement(): number {
    if (!this.inputData) return 0.4;
    
    // Quantum entanglement measure based on spectral entanglement entropy
    const data = this.inputData.intensities;
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

  private assessDataQuality(): number {
    if (!this.inputData) return 0.5;
    
    // Assess data quality based on signal-to-noise ratio estimation
    const data = this.inputData.intensities;
    const signal = data.reduce((sum, val) => sum + Math.abs(val), 0) / data.length;
    const noise = Math.sqrt(this.calculateVariance(data));
    
    const snr = noise > 0 ? signal / noise : 1;
    return Math.min(snr / 10, 1.0); // Normalize SNR to 0-1 range
  }

  private calculateCorrelation(arr1: number[], arr2: number[]): number {
    const n = Math.min(arr1.length, arr2.length);
    if (n < 2) return 0;
    
    const mean1 = arr1.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    const mean2 = arr2.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;
    
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

  private generateRippel(tPTT: number, E_t: number): string {
    const words = ["surge", "pivot", "chrono", "flux", "phase", "neural"];
    const word = words[Math.floor(Date.now()) % words.length];
    return `a ${word}. ${word} bends spacetime. tPTT: ${tPTT.toFixed(2)}, E_t: ${E_t.toFixed(3)} ~ zap 🌠`;
  }

  // Utility methods
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b) / values.length;
  }

  // No-op for API compatibility (no TF model held here anymore)
  dispose(): void {}
}