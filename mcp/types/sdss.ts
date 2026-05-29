// SDSS Data Types for BLURRN v4.5
export interface SDSSSpectrum {
  objid: string;
  ra: number;
  dec: number;
  u: number;
  g: number;
  r: number;
  i: number;
  z: number;
  run: number;
  rerun: number;
  camcol: number;
  field: number;
  specobjid?: string;
  class: 'STAR' | 'GALAXY' | 'QSO';
  redshift?: number;
  plate?: number;
  mjd?: number;
  fiberid?: number;
}

export interface SpectrumData {
  wavelengths: number[]; // Å units, 3800-9200 Å range
  intensities: number[]; // Normalized flux values
  granularity: number; // Å per pixel, target ~1 Å
  source: 'SDSS' | 'SYNTHETIC' | 'STELLAR_LIBRARY';
  metadata?: {
    objid?: string;
    class?: string;
    redshift?: number;
    snr?: number;
    distance?: number; // Distance in light years (for stellar library data)
    emissionAge?: number; // Light travel time in years (for stellar library data)
  };
}

export interface NeuralInput {
  spectrumData: SpectrumData;
  temporalPhases: number[];
  isotopeFactor: number;
  fractalToggle: boolean;
  // Optional live solar feature vector (NOAA SWPC). When present, the
  // neural fusion engines apply a contained modulation to outputs to
  // reflect quiet-Sun vs storm conditions. See SOLAR_COUPLING in
  // mcp/lib/neuralFusion.ts for coefficients and rationale.
  solarFeatures?: {
    hardnessRatio: number;
    xrayUVLift: number;
    magPerturbation: number;
    windBroadeningA: number;
    kpIndex: number;
    activityLevel: 'quiet' | 'moderate' | 'active' | 'storm';
  };
}

export interface NeuralOutput {
  synapticSequence: string;
  neuralSpectra: number[];
  metamorphosisIndex: number;
  confidenceScore: number;
  // Observability: present when solarFeatures was supplied as input.
  solarModulation?: {
    solar_applied: boolean;
    activity_level: string;
    gainMultiplier: number;
    metaShift: number;
    confShift: number;
    metaDelta: number;
    confDelta: number;
  };

  // New reconstruction-based signals (added for honest solar embedding quality)
  reconstructionError?: number;   // MSE between input spectrum and decoder reconstruction
  spectralQuality?: number;       // 0–1, higher = model understands this solar state well

  // Raw 16-dim neural embedding from the spectral autoencoder bottleneck
  // Used as 16 virtual spectrum bands in wave propagation (Neural Quantum Realms)
  neuralEmbedding16?: number[];
}

export interface TPTTv4Result {
  tPTT_value: number;
  components: {
    T_c: number;
    P_s: number;
    E_t: number;
    W_c: number;
    C_m: number;
    K_l: number;
    F_r: number;
    S_l: number;
    Syn_c: number;
    Q_e: number;
    Sp_g: number;
    N_s: number;
    G_r: number;
  };
  rippel: string;
  neuralOutput?: NeuralOutput;
}