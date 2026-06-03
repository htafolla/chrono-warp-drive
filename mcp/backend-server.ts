// mcp/backend-server.ts
// Real Neural Fusion Backend using @tensorflow/tfjs with CPU backend
//
// DEPLOYMENT NOTE (intentional duplication with backend/neural-fusion-server.ts):
//   This file is the standalone Express server used by the MCP / Vercel deployment
//   path (via vercel.json → index.ts or direct node usage).
//   The near-identical copy in ../backend/neural-fusion-server.ts exists for
//   Railway / local standalone deploys and quick `node backend/...` debugging.
//
//   Both must stay in sync for:
//     - trainOnSolarData() on startup
//     - multi-channel NOAA + solarFeatures handling in /process-current-sun
//     - /health reporting the `trained` flag
//     - all /process-spectrum, /list-stars, /govern-with-solar routes
//
// If you change one, update the other (or factor a shared router in a future pass).

import express from 'express'
import cors from 'cors'
import { NeuralFusion } from './lib/neuralFusion.js'
import { stellarLibrary } from './lib/stellarLibraryLoader.js'
import { solarDataFetcher } from './lib/solarDataFetcher.js'
import { dynamoSolarGovernance } from './lib/dynamoSolarGovernance.js'
import { ambientField } from './lib/ambientField.js'
import { isStructuredProposal, extractProposalText } from './lib/structuredProposal.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

let neuralFusion: NeuralFusion | null = null

async function initializeEngine() {
  try {
    neuralFusion = new NeuralFusion()
    await neuralFusion.initialize()
    console.log('[Backend] Neural Fusion engine initialized')

    await stellarLibrary.loadLibrary('STELLAR_LIBRARY')
    const starCount = stellarLibrary.getAllSpectra().length
    console.log(`[Backend] Stellar library loaded: ${starCount} stars`)

    // Train models on live NOAA SWPC solar data — the Sun creates 99% of life on Earth
    console.log('[Backend] Starting solar-data training...')
    await neuralFusion.trainOnSolarData()
    console.log('[Backend] Solar-data training complete — models are Sun-grounded')

    // Schedule periodic retraining so the neural model stays current with evolving solar
    // conditions. The rolling buffer accumulates real NOAA observations (up to 32 unique
    // regimes) which enriches each retrain with more diverse historical context.
    const retrainMs = parseInt(process.env.NEURAL_RETRAIN_INTERVAL_MS || '', 10) || 6 * 60 * 60 * 1000
    console.log(`[Backend] Scheduling neural retrain every ${retrainMs / 3_600_000}h`)
    setInterval(() => {
      neuralFusion?.retrainOnSolarData().then(didRetrain => {
        if (didRetrain) console.log('[Backend] Periodic neural retrain completed')
      })
    }, retrainMs)
  } catch (error) {
    console.error('[Backend] Failed to initialize engines:', error)
    process.exit(1)
  }
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    engine: 'real-tensorflow',
    trained: neuralFusion?.isTrainedModel ?? false,
    stars: stellarLibrary.getAllSpectra().length,
    version: '1.0.0',
  })
})

app.post('/govern-with-solar', async (req, res) => {
  try {
    const rawProposal = req.body.proposal ?? req.body.structuredProposal
    if (!rawProposal) {
      return res.status(400).json({ error: 'proposal or structuredProposal is required' })
    }
    const proposalText = extractProposalText(isStructuredProposal(rawProposal) ? rawProposal : String(rawProposal))

    const baseVoteWeight = req.body.baseVoteWeight ?? 1.0
    const sharePublicly = req.body.sharePublicly === true
    const sq = req.body.spectralQuality !== undefined ? Number(req.body.spectralQuality) : undefined
    const enhancedDecision = await dynamoSolarGovernance.enhanceGovernanceDecision(
      proposalText,
      baseVoteWeight,
      sharePublicly,
      sq,
    )

    res.json({
      success: true,
      enhancedDecision,
      engine: 'dynamo + real-time-solar-context',
    })
  } catch (error: any) {
    console.error('Error in govern-with-solar:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/process-spectrum', async (req, res) => {
  try {
    if (!neuralFusion) return res.status(503).json({ error: 'Neural Fusion engine not initialized' })
    const { wavelengths, fluxes } = req.body
    if (!wavelengths || !fluxes || wavelengths.length < 5 || fluxes.length < 5) {
      return res.status(400).json({ error: 'wavelengths and fluxes arrays with at least 5 values are required' })
    }
    const result = await neuralFusion.processNeuralInput({
      spectrumData: { wavelengths, intensities: fluxes, granularity: wavelengths.length, source: 'user-upload' },
      temporalPhases: [0.1, 0.5, 0.9],
      isotopeFactor: 1.666,
      fractalToggle: false,
    })
    res.json({ success: true, metamorphosisIndex: result.metamorphosisIndex, confidenceScore: result.confidenceScore, synapticSequence: result.synapticSequence, engine: 'real-tensorflow' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/list-stars', (req, res) => {
  const spectra = stellarLibrary.getAllSpectra()
  res.json({ success: true, count: spectra.length, stars: spectra.map((s: any) => ({ name: s.name, spectralType: s.spectralType, temperature: s.temperature })) })
})

app.post('/process-stellar-spectrum', async (req, res) => {
  try {
    if (!neuralFusion) return res.status(503).json({ error: 'Neural Fusion engine not initialized' })
    const { starName } = req.body
    if (!starName) return res.status(400).json({ error: 'starName is required' })
    const spectrum = stellarLibrary.getSpectrum(starName)
    if (!spectrum) return res.status(404).json({ error: `Star ${starName} not found` })
    const result = await neuralFusion.processNeuralInput({
      spectrumData: { wavelengths: spectrum.wavelengths, intensities: spectrum.flux, granularity: 100, source: 'STELLAR_LIBRARY' },
      temporalPhases: [0.1, 0.5, 0.9],
      isotopeFactor: 1.666,
      fractalToggle: false,
    })
    res.json({ success: true, star: spectrum, metamorphosisIndex: result.metamorphosisIndex, confidenceScore: result.confidenceScore, synapticSequence: result.synapticSequence, engine: 'real-tensorflow + real-stellar-library' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/calculate-metamorphosis-index', async (req, res) => {
  try {
    if (!neuralFusion) return res.status(503).json({ error: 'Neural Fusion engine not initialized' })
    const { wavelengths, fluxes } = req.body
    const result = await neuralFusion.processNeuralInput({
      spectrumData: { wavelengths, intensities: fluxes, granularity: wavelengths.length, source: 'user-upload' },
      temporalPhases: [0.1, 0.5, 0.9],
      isotopeFactor: 1.666,
      fractalToggle: false,
    })
    res.json({ success: true, value: result.metamorphosisIndex, resonance: result.metamorphosisIndex, isotopicRatio: 0.85 + (result.metamorphosisIndex * 0.14), confidence: result.confidenceScore, synapticSequence: result.synapticSequence, engine: 'real-tensorflow' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/isotopic-embedding', async (req, res) => {
  try {
    if (!neuralFusion) return res.status(503).json({ error: 'Neural Fusion engine not initialized' })
    const { wavelengths, fluxes } = req.body
    const result = await neuralFusion.processNeuralInput({
      spectrumData: { wavelengths, intensities: fluxes, granularity: wavelengths.length, source: 'user-upload' },
      temporalPhases: [0.1, 0.5, 0.9],
      isotopeFactor: 1.666,
      fractalToggle: false,
    })
    res.json({ success: true, isotopicRatio: 0.85 + (result.metamorphosisIndex * 0.14), resonance: result.metamorphosisIndex, confidenceScore: result.confidenceScore, synapticSequence: result.synapticSequence, engine: 'real-tensorflow' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/process-current-sun', async (req, res) => {
  try {
    if (!neuralFusion) return res.status(503).json({ error: 'Neural Fusion engine not initialized' })

    // Multi-channel NOAA pull → physically-motivated 3800–9200 Å spectrum +
    // SolarFeatures vector that the engine uses to modulate outputs.
    const solarData = await solarDataFetcher.fetchCurrentSolarData()
    const spectrum = solarDataFetcher.solarDataToSpectrum(solarData, 256)
    const solarFeatures = solarDataFetcher.deriveSolarFeatures(solarData)

    const result = await neuralFusion.processNeuralInput({
      spectrumData: spectrum,
      temporalPhases: [0.1, 0.5, 0.9],
      isotopeFactor: 1.666,
      fractalToggle: false,
      solarFeatures,
    })

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
        // Raw 16-dim bottleneck embedding for Neural Quantum Realms (virtual spectrum bands)
        neuralEmbedding16: result.neuralEmbedding16,
      },
      solarModulation: result.solarModulation,
      engine: 'real-tensorflow + multi-channel-noaa + activity-level-coupled',
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, async () => {
  console.log(`Real Neural Fusion Backend running on port ${PORT}`)
  await initializeEngine()
  ambientField.start()
  console.log('[ambient] Ambient Resonance Field started')
})

export default app
