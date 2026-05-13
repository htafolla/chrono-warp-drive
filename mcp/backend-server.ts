// mcp/backend-server.ts
// Real Neural Fusion Backend using @tensorflow/tfjs with CPU backend

import express from 'express'
import cors from 'cors'
import { NeuralFusion } from './lib/neuralFusion'
import { stellarLibrary } from './lib/stellarLibraryLoader'
import { solarDataFetcher } from './lib/solarDataFetcher'
import { dynamoSolarGovernance } from './lib/dynamoSolarGovernance'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

let neuralFusion: NeuralFusion | null = null

async function initializeEngine() {
  try {
    neuralFusion = new NeuralFusion()
    await neuralFusion.initialize()
    console.log('Real Neural Fusion Engine initialized successfully')
    await stellarLibrary.loadLibrary('STELLAR_LIBRARY')
    console.log(`Real Stellar Library loaded with ${stellarLibrary.getAllSpectra().length} stars`)
  } catch (error) {
    console.error('Failed to initialize engines:', error)
    process.exit(1)
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'real-tensorflow', initialized: neuralFusion !== null, version: '1.0.0' })
})

app.post('/govern-with-solar', async (req, res) => {
  try {
    const { proposal, baseVoteWeight = 1.0 } = req.body

    if (!proposal) {
      return res.status(400).json({ error: 'proposal is required' })
    }

    const enhancedDecision = await dynamoSolarGovernance.enhanceGovernanceDecision(
      proposal,
      baseVoteWeight,
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
      metamorphosisIndex: result.metamorphosisIndex,
      confidenceScore: result.confidenceScore,
      synapticSequence: result.synapticSequence,
      engine: 'real-tensorflow + multi-channel-noaa + solar-coupled',
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, async () => {
  console.log(`Real Neural Fusion Backend running on port ${PORT}`)
  await initializeEngine()
})

export default app
