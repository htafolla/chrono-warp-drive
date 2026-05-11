// backend/neural-fusion-server.ts
// Real Neural Fusion Backend using @tensorflow/tfjs-node

import express from 'express';
import cors from 'cors';
import * as tf from '@tensorflow/tfjs-node';
import { NeuralFusion } from '../src/lib/neuralFusion';
import { stellarLibrary } from '../src/lib/stellarLibraryLoader';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

let neuralFusion: NeuralFusion | null = null;

async function initializeEngine() {
  try {
    neuralFusion = new NeuralFusion();
    await neuralFusion.initialize();
    console.log('✅ Real Neural Fusion Engine initialized successfully');
    await stellarLibrary.loadLibrary('STELLAR_LIBRARY');
    console.log(`✅ Real Stellar Library loaded with ${stellarLibrary.getAllSpectra().length} stars`);
  } catch (error) {
    console.error('❌ Failed to initialize engines:', error);
    process.exit(1);
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'real-tensorflow', initialized: neuralFusion !== null, version: '1.0.0' });
});

app.post('/process-spectrum', async (req, res) => {
  try {
    if (!neuralFusion) return res.status(503).json({ error: 'Neural Fusion engine not initialized' });
    const { wavelengths, fluxes } = req.body;
    if (!wavelengths || !fluxes || wavelengths.length < 5 || fluxes.length < 5) {
      return res.status(400).json({ error: 'wavelengths and fluxes arrays with at least 5 values are required' });
    }
    const result = await neuralFusion.processNeuralInput({
      spectrumData: { wavelengths, intensities: fluxes, granularity: wavelengths.length, source: 'user-upload' },
      temporalPhases: [0.1, 0.5, 0.9],
      isotopeFactor: 1.666,
      fractalToggle: false
    });
    res.json({ success: true, metamorphosisIndex: result.metamorphosisIndex, confidenceScore: result.confidenceScore, synapticSequence: result.synapticSequence, engine: 'real-tensorflow' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/list-stars', (req, res) => {
  const spectra = stellarLibrary.getAllSpectra();
  res.json({ success: true, count: spectra.length, stars: spectra.map(s => ({ name: s.name, spectralType: s.spectralType, temperature: s.temperature })) });
});

app.post('/process-stellar-spectrum', async (req, res) => {
  try {
    if (!neuralFusion) return res.status(503).json({ error: 'Neural Fusion engine not initialized' });
    const { starName } = req.body;
    if (!starName) return res.status(400).json({ error: 'starName is required' });
    const spectrum = stellarLibrary.getSpectrum(starName);
    if (!spectrum) return res.status(404).json({ error: `Star ${starName} not found` });
    const result = await neuralFusion.processNeuralInput({
      spectrumData: { wavelengths: spectrum.wavelengths, intensities: spectrum.flux, granularity: 100, source: 'STELLAR_LIBRARY' },
      temporalPhases: [0.1, 0.5, 0.9],
      isotopeFactor: 1.666,
      fractalToggle: false
    });
    res.json({ success: true, star: spectrum, metamorphosisIndex: result.metamorphosisIndex, confidenceScore: result.confidenceScore, synapticSequence: result.synapticSequence, engine: 'real-tensorflow + real-stellar-library' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/calculate-metamorphosis-index', async (req, res) => {
  try {
    if (!neuralFusion) return res.status(503).json({ error: 'Neural Fusion engine not initialized' });
    const { wavelengths, fluxes } = req.body;
    const result = await neuralFusion.processNeuralInput({
      spectrumData: { wavelengths, intensities: fluxes, granularity: wavelengths.length, source: 'user-upload' },
      temporalPhases: [0.1, 0.5, 0.9],
      isotopeFactor: 1.666,
      fractalToggle: false
    });
    res.json({ success: true, value: result.metamorphosisIndex, resonance: result.metamorphosisIndex, isotopicRatio: 0.85 + (result.metamorphosisIndex * 0.14), confidence: result.confidenceScore, synapticSequence: result.synapticSequence, engine: 'real-tensorflow' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`Real Neural Fusion Backend running on port ${PORT}`);
  await initializeEngine();
});

export default app;