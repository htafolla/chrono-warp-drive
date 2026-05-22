// backend/neural-fusion-server.ts
// Real Neural Fusion Backend using @tensorflow/tfjs with CPU backend
// Models trained on real NOAA SWPC solar data — the Sun creates 99% of life on Earth
//
// DEPLOYMENT NOTE (intentional duplication with mcp/backend-server.ts):
//   This copy is intended for Railway, local `node backend/neural-fusion-server.ts`,
//   or any environment that wants a plain Express server without the full Hono
//   MCP stack that lives in mcp/.
//
//   The mcp/ version is the one wired into the primary Vercel MCP deployment.
//   Keep the two files in sync for solar training, NOAA multi-channel handling,
//   and the full set of neural + governance endpoints.
//
// See mcp/backend-server.ts header for the full rationale.

import express from 'express';
import cors from 'cors';
import { NeuralFusion } from '../mcp/lib/neuralFusion';
import { stellarLibrary } from '../mcp/lib/stellarLibraryLoader';
import { solarDataFetcher } from '../mcp/lib/solarDataFetcher';
import { dynamoSolarGovernance } from '../mcp/lib/dynamoSolarGovernance';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

let neuralFusion: NeuralFusion | null = null;

async function initializeEngine() {
  try {
    neuralFusion = new NeuralFusion();
    await neuralFusion.initialize();
    console.log('[Backend] Neural Fusion engine initialized');

    await stellarLibrary.loadLibrary('STELLAR_LIBRARY');
    const starCount = stellarLibrary.getAllSpectra().length;
    console.log(`[Backend] Stellar library loaded: ${starCount} stars`);

    // Train models on live NOAA SWPC solar data
    console.log('[Backend] Starting solar-data training...');
    await neuralFusion.trainOnSolarData();
    console.log('[Backend] Solar-data training complete — models are Sun-grounded');
  } catch (error) {
    console.error('[Backend] Failed to initialize engines:', error);
    process.exit(1);
  }
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    engine: 'real-tensorflow',
    trained: neuralFusion?.isTrainedModel ?? false,
    stars: stellarLibrary.getAllSpectra().length,
    version: '1.0.0',
  });
});

app.post('/govern-with-solar', async (req, res) => {
  try {
    const { proposal, baseVoteWeight = 1.0 } = req.body;
    if (!proposal) {
      return res.status(400).json({ error: 'proposal is required' });
    }

    const enhancedDecision = await dynamoSolarGovernance.enhanceGovernanceDecision(
      proposal,
      baseVoteWeight,
    );

    res.json({
      success: true,
      enhancedDecision,
      engine: 'dynamo + real-time-solar-context',
    });
  } catch (error: any) {
    console.error('[Backend] govern-with-solar error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/process-current-sun', async (req, res) => {
  try {
    if (!neuralFusion) {
      return res.status(503).json({ error: 'Neural Fusion engine not initialized' });
    }

    // Multi-channel NOAA pull → physically-motivated 3800–9200 Å spectrum +
    // SolarFeatures vector that the engine uses to modulate outputs.
    const solarData = await solarDataFetcher.fetchCurrentSolarData();
    const spectrum = solarDataFetcher.solarDataToSpectrum(solarData, 256);
    const solarFeatures = solarDataFetcher.deriveSolarFeatures(solarData);

    const result = await neuralFusion.processNeuralInput({
      spectrumData: spectrum,
      temporalPhases: [0.1, 0.5, 0.9],
      isotopeFactor: 1.666,
      fractalToggle: false,
      solarFeatures,
    });

    res.json({
      success: true,
      solarData: {
        timestamp: solarData.timestamp,
        xrayFlux: solarData.xray.long,
        xrayFluxString: solarData.xray.long.toExponential(2),
        activityLevel: solarData.activityLevel,
        kpIndex: solarData.kpIndex,
        flareClass: solarData.xray.flareClass,
        source: solarData.source,
        channelStatus: solarData.channelStatus,
      },
      solarFeatures,
      neuralOutput: {
        metamorphosisIndex: result.metamorphosisIndex,
        confidenceScore: result.confidenceScore,
        synapticSequence: result.synapticSequence,
        solarApplied: result.solarModulation?.solar_applied ?? false,
        solarAdjustment: result.solarModulation?.metaDelta ?? 0,
        activityLevel: result.solarModulation?.activity_level ?? 'none',
        gainMultiplier: result.solarModulation?.gainMultiplier ?? 0,
        // New reconstruction-based signals
        reconstructionError: result.reconstructionError,
        spectralQuality: result.spectralQuality,
      },
      engine: 'real-tensorflow + solar-trained + multi-channel-noaa',
    });
  } catch (error: any) {
    console.error('[Backend] process-current-sun error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/process-spectrum', async (req, res) => {
  try {
    if (!neuralFusion) return res.status(503).json({ error: 'Neural Fusion engine not initialized' });
    const { wavelengths, fluxes } = req.body;
    if (!wavelengths || !fluxes || wavelengths.length < 5 || fluxes.length < 5) {
      return res.status(400).json({ error: 'wavelengths and fluxes arrays with at least 5 values are required' });
    }
    const result = await neuralFusion.processNeuralInput({
      spectrumData: {
        wavelengths,
        intensities: fluxes,
        granularity: wavelengths.length,
        source: 'STELLAR_LIBRARY',
      },
      temporalPhases: [0.1, 0.5, 0.9],
      isotopeFactor: 1.666,
      fractalToggle: false,
    });
    res.json({
      success: true,
      metamorphosisIndex: result.metamorphosisIndex,
      confidenceScore: result.confidenceScore,
      synapticSequence: result.synapticSequence,
      engine: 'real-tensorflow',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/list-stars', (req, res) => {
  const spectra = stellarLibrary.getAllSpectra();
  res.json({
    success: true,
    count: spectra.length,
    stars: spectra.map((s: any) => ({
      name: s.name,
      spectralType: s.spectralType,
      temperature: s.temperature,
    })),
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`[Backend] Neural Fusion Backend running on port ${PORT}`);
  await initializeEngine();
});

export default app;