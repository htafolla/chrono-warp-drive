// backend/neural-fusion-server.ts
// Real Neural Fusion Backend using @tensorflow/tfjs-node

import express from 'express';
import cors from 'cors';
import * as tf from '@tensorflow/tfjs-node';
import { NeuralFusion } from '../src/lib/neuralFusion';
import { stellarLibrary } from '../src/lib/stellarLibraryLoader';
import { solarDataFetcher } from '../src/lib/solarDataFetcher';
import { dynamoSolarGovernance } from '../src/lib/dynamoSolarGovernance';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

let neuralFusion: NeuralFusion | null = null;

async function initializeEngine() {
  try {
    neuralFusion = new NeuralFusion();
    await neuralFusion.initialize();
    console.log('Real Neural Fusion Engine initialized successfully');
    await stellarLibrary.loadLibrary('STELLAR_LIBRARY');
    console.log(`Real Stellar Library loaded with ${stellarLibrary.getAllSpectra().length} stars`);
  } catch (error) {
    console.error('Failed to initialize engines:', error);
    process.exit(1);
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'real-tensorflow', initialized: neuralFusion !== null, version: '1.0.0' });
});

// Enhanced governance with real-time solar context
app.post('/govern-with-solar', async (req, res) => {
  try {
    const { proposal, baseVoteWeight = 1.0 } = req.body;

    if (!proposal) {
      return res.status(400).json({ error: 'proposal is required' });
    }

    const enhancedDecision = await dynamoSolarGovernance.enhanceGovernanceDecision(
      proposal,
      baseVoteWeight
    );

    res.json({
      success: true,
      enhancedDecision,
      engine: 'dynamo + real-time-solar-context'
    });

  } catch (error: any) {
    console.error('Error in govern-with-solar:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/process-current-sun', async (req, res) => {
  try {
    if (!neuralFusion) {
      return res.status(503).json({ error: 'Neural Fusion engine not initialized' });
    }

    const solarData = await solarDataFetcher.fetchCurrentSolarData();
    const spectrum = solarDataFetcher.solarDataToSpectrum(solarData);

    const input = {
      spectrumData: {
        wavelengths: spectrum.wavelengths,
        intensities: spectrum.fluxes,
        granularity: 100,
        source: 'NOAA_GOES' as const,
        metadata: {
          timestamp: solarData.timestamp,
          solarActivity: solarData.solarActivityLevel
        }
      },
      temporalPhases: [0.1, 0.5, 0.9],
      isotopeFactor: 1.666,
      fractalToggle: false
    };

    const result = await neuralFusion.processNeuralInput(input);

    res.json({
      success: true,
      solarData: solarData,
      metamorphosisIndex: result.metamorphosisIndex,
      confidenceScore: result.confidenceScore,
      synapticSequence: result.synapticSequence,
      engine: 'real-tensorflow + real-time-solar-data'
    });

  } catch (error: any) {
    console.error('Error processing current sun:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`Real Neural Fusion Backend running on port ${PORT}`);
  await initializeEngine();
});

export default app;