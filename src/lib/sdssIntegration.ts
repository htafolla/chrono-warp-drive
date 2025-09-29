// SDSS Data Integration for BLURRN v4.5
import Papa from 'papaparse';
import { SDSSSpectrum, SpectrumData } from '@/types/sdss';
import { deterministicRandom, generateCycle } from './deterministicUtils';

export class SDSSIntegration {
  private static readonly KAGGLE_DATASET_URL = 'https://raw.githubusercontent.com/fedesoriano/stellar-classification-dataset-sdss17/main/star_classification.csv';
  private static readonly WAVELENGTH_MIN = 3800; // Å
  private static readonly WAVELENGTH_MAX = 9200; // Å
  private static readonly TARGET_GRANULARITY = 1; // Å per pixel

  private cache: Map<string, SpectrumData> = new Map();
  private isInitialized: boolean = false;
  private fallbackData: SpectrumData | null = null;

  async initialize(): Promise<void> {
    try {
      // Generate fallback synthetic data first
      this.fallbackData = this.generateSyntheticSpectrum();
      
      // Attempt to fetch real SDSS data
      await this.fetchSDSSData();
      this.isInitialized = true;
    } catch (error) {
      console.warn('SDSS initialization failed, using synthetic data:', error);
      this.isInitialized = true;
    }
  }

  async fetchSDSSData(): Promise<SDSSSpectrum[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(SDSSIntegration.KAGGLE_DATASET_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const sdssData = this.processSDSSResults(results.data);
            resolve(sdssData);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  private processSDSSResults(data: any[]): SDSSSpectrum[] {
    return data.slice(0, 100).map((row: any) => ({ // Limit to 100 objects for demo
      objid: row.objid || 'unknown',
      ra: parseFloat(row.ra) || 0,
      dec: parseFloat(row.dec) || 0,
      u: parseFloat(row.u) || 0,
      g: parseFloat(row.g) || 0,
      r: parseFloat(row.r) || 0,
      i: parseFloat(row.i) || 0,
      z: parseFloat(row.z) || 0,
      run: parseInt(row.run) || 0,
      rerun: parseInt(row.rerun) || 0,
      camcol: parseInt(row.camcol) || 0,
      field: parseInt(row.field) || 0,
      specobjid: row.specobjid,
      class: row.class as 'STAR' | 'GALAXY' | 'QSO' || 'STAR',
      redshift: parseFloat(row.redshift) || undefined,
      plate: parseInt(row.plate) || undefined,
      mjd: parseInt(row.mjd) || undefined,
      fiberid: parseInt(row.fiberid) || undefined
    }));
  }

  generateSpectrumFromSDSS(sdssObject: SDSSSpectrum): SpectrumData {
    const cacheKey = `sdss_${sdssObject.objid}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Generate high-granularity spectrum from SDSS photometry
    const wavelengthRange = SDSSIntegration.WAVELENGTH_MAX - SDSSIntegration.WAVELENGTH_MIN;
    const numPoints = Math.floor(wavelengthRange / SDSSIntegration.TARGET_GRANULARITY);
    
    const wavelengths: number[] = [];
    const intensities: number[] = [];

    // SDSS filter central wavelengths (Å)
    const filterWavelengths = {
      u: 3543,
      g: 4770,
      r: 6231,
      i: 7625,
      z: 9134
    };

    const filterMagnitudes = [sdssObject.u, sdssObject.g, sdssObject.r, sdssObject.i, sdssObject.z];

    for (let i = 0; i < numPoints; i++) {
      const wavelength = SDSSIntegration.WAVELENGTH_MIN + (i * SDSSIntegration.TARGET_GRANULARITY);
      wavelengths.push(wavelength);

      // Interpolate intensity based on nearby SDSS filters
      let intensity = this.interpolateFromFilters(wavelength, filterWavelengths, filterMagnitudes);
      
      // Add stellar type characteristics
      intensity = this.applyObjectClassModification(intensity, wavelength, sdssObject.class);
      
      // Add some realistic noise and variations
      intensity *= (0.9 + deterministicRandom(generateCycle(), i) * 0.2);
      
      intensities.push(Math.max(0, intensity));
    }

    const spectrumData: SpectrumData = {
      wavelengths,
      intensities,
      granularity: SDSSIntegration.TARGET_GRANULARITY,
      source: 'SDSS',
      metadata: {
        objid: sdssObject.objid,
        class: sdssObject.class,
        redshift: sdssObject.redshift
      }
    };

    this.cache.set(cacheKey, spectrumData);
    return spectrumData;
  }

  private interpolateFromFilters(wavelength: number, filterWaves: any, magnitudes: number[]): number {
    // Convert magnitudes to flux (simplified)  
    const fluxes = magnitudes.map(mag => Math.pow(10, -0.4 * (mag - 20))); // Normalize around mag 20
    
    // Find closest filters and interpolate
    const filterWaveArray = [filterWaves.u, filterWaves.g, filterWaves.r, filterWaves.i, filterWaves.z];
    
    let closestIdx = 0;
    let minDiff = Math.abs(wavelength - filterWaveArray[0]);
    
    for (let i = 1; i < filterWaveArray.length; i++) {
      const diff = Math.abs(wavelength - filterWaveArray[i]);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    // Simple interpolation between closest filters
    if (closestIdx === 0) {
      return fluxes[0] * Math.exp(-(wavelength - filterWaveArray[0]) / 500);
    } else if (closestIdx === filterWaveArray.length - 1) {
      return fluxes[closestIdx] * Math.exp(-(filterWaveArray[closestIdx] - wavelength) / 500);
    } else {
      const leftWave = filterWaveArray[closestIdx - 1];
      const rightWave = filterWaveArray[closestIdx + 1];
      const leftFlux = fluxes[closestIdx - 1];
      const rightFlux = fluxes[closestIdx + 1];
      
      const t = (wavelength - leftWave) / (rightWave - leftWave);
      return leftFlux * (1 - t) + rightFlux * t;
    }
  }

  private applyObjectClassModification(intensity: number, wavelength: number, objClass: string): number {
    switch (objClass) {
      case 'STAR':
        // Enhance stellar absorption lines
        if (wavelength > 6560 && wavelength < 6570) intensity *= 0.7; // H-alpha
        if (wavelength > 4860 && wavelength < 4870) intensity *= 0.8; // H-beta
        break;
      case 'GALAXY':
        // Add galaxy continuum characteristics
        intensity *= (1 + 0.1 * Math.sin((wavelength - 4000) / 1000));
        break;
      case 'QSO':
        // Quasar power-law continuum
        intensity *= Math.pow(wavelength / 5000, -1.5);
        break;
    }
    return intensity;
  }

  generateSyntheticSpectrum(): SpectrumData {
    const wavelengthRange = SDSSIntegration.WAVELENGTH_MAX - SDSSIntegration.WAVELENGTH_MIN;
    const numPoints = Math.floor(wavelengthRange / SDSSIntegration.TARGET_GRANULARITY);
    
    const wavelengths: number[] = [];
    const intensities: number[] = [];

    for (let i = 0; i < numPoints; i++) {
      const wavelength = SDSSIntegration.WAVELENGTH_MIN + (i * SDSSIntegration.TARGET_GRANULARITY);
      wavelengths.push(wavelength);

      // Synthetic blackbody-like spectrum with absorption lines
      let intensity = this.blackbodySpectrum(wavelength, 5778); // Sun-like temperature
      
      // Add absorption lines
      intensity *= this.addAbsorptionLines(wavelength);
      
      // Add noise
      intensity *= (0.95 + deterministicRandom(generateCycle(), i + 100) * 0.1);
      
      intensities.push(Math.max(0, intensity));
    }

    return {
      wavelengths,
      intensities,
      granularity: SDSSIntegration.TARGET_GRANULARITY,
      source: 'SYNTHETIC',
      metadata: {
        objid: 'synthetic_001',
        class: 'STAR'
      }
    };
  }

  private blackbodySpectrum(wavelength: number, temperature: number): number {
    const h = 6.626e-34; // Planck constant
    const c = 3e8; // Speed of light
    const k = 1.381e-23; // Boltzmann constant
    const waveM = wavelength * 1e-10; // Convert Å to meters
    
    const numerator = 2 * h * Math.pow(c, 2) / Math.pow(waveM, 5);
    const denominator = Math.exp((h * c) / (waveM * k * temperature)) - 1;
    
    return numerator / denominator / 1e15; // Normalize
  }

  private addAbsorptionLines(wavelength: number): number {
    let absorption = 1.0;
    
    // Major absorption lines
    const lines = [
      { center: 6562.8, width: 2, depth: 0.3 }, // H-alpha
      { center: 4861.3, width: 2, depth: 0.4 }, // H-beta
      { center: 4340.5, width: 1.5, depth: 0.3 }, // H-gamma
      { center: 5895.9, width: 1, depth: 0.6 }, // Na D
      { center: 3968.5, width: 1, depth: 0.5 }, // Ca II H
    ];

    lines.forEach(line => {
      const distance = Math.abs(wavelength - line.center);
      if (distance < line.width * 3) {
        const gaussian = Math.exp(-Math.pow(distance / line.width, 2));
        absorption *= (1 - line.depth * gaussian);
      }
    });

    return absorption;
  }

  getRandomSpectrum(): SpectrumData {
    if (!this.isInitialized || !this.fallbackData) {
      return this.generateSyntheticSpectrum();
    }
    
    return this.fallbackData;
  }

  getCachedSpectra(): SpectrumData[] {
    return Array.from(this.cache.values());
  }

  clearCache(): void {
    this.cache.clear();
  }
}