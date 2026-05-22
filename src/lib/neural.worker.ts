// TensorFlow.js worker — model trained on NOAA SWPC solar data
// This file is built by Vite as a separate worker bundle.
//
// IMPORTANT BUNDLING NOTE (see also src/lib/neuralWorker.ts and vite.config.ts):
//   - Source uses normal `import` from './solarWorkerUtils'
//   - vite.config.ts sets `worker: { format: 'iife' }`
//   - Result: a single classic IIFE bundle that can still execute `self.importScripts` for TF.js
// Do not change to ESM worker format without also removing/replacing the importScripts call.

import {
  fetchSolarSnapshot,
  generateTrainingData,
  clamp,
  type SolarSnapshot,
} from './solarWorkerUtils'

let tf: any = null
let loadAttempts = 0
const maxAttempts = 3
let model: any = null
let isInitialized = false
let isTrained = false
let trainingSnapshot: SolarSnapshot | null = null

async function loadTensorFlow(): Promise<boolean> {
  while (loadAttempts < maxAttempts && !tf) {
    try {
      loadAttempts++
      self.importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js')
      tf = (self as any).tf
      return true
    } catch {
      if (loadAttempts >= maxAttempts) return false
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  return !!tf
}

async function initializeWorker(): Promise<void> {
  if (!isInitialized) {
    isInitialized = true
    self.postMessage({ type: 'initialized', data: { fallbackMode: true, trained: false } })
  }
  try {
    const loaded = await loadTensorFlow()
    if (!loaded) {
      self.postMessage({ type: 'initialized', data: { fallbackMode: true, trained: false } })
      return
    }

    const solar = await fetchSolarSnapshot()
    trainingSnapshot = solar.features
    const trainingData = generateTrainingData(solar)

    model = tf.sequential()
    model.add(tf.layers.dense({
      units: 16, activation: 'relu', inputShape: [6],
      kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }),
    }))
    model.add(tf.layers.dropout({ rate: 0.2 }))
    model.add(tf.layers.dense({ units: 8, activation: 'relu' }))
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }))
    model.compile({ optimizer: tf.train.adam(0.005), loss: 'meanSquaredError', metrics: ['mse'] })

    const xs = tf.tensor2d(trainingData.map(d => d.inputs))
    const ys = tf.tensor2d(trainingData.map(d => [d.target]))

    await model.fit(xs, ys, {
      epochs: 25,
      batchSize: Math.min(16, trainingData.length),
      shuffle: true,
      validationSplit: 0.15,
      callbacks: {
        onEpochEnd: (epoch: number, logs: any) => {
          if (epoch % 10 === 0) {
            // eslint-disable-next-line no-console
            console.log(`[Worker] epoch ${epoch} loss=${logs.loss.toFixed(6)}`)
          }
        },
      },
    })

    xs.dispose()
    ys.dispose()
    isTrained = true

    self.postMessage({ type: 'initialized', data: { fallbackMode: false, trained: true } })
  } catch {
    self.postMessage({ type: 'initialized', data: { fallbackMode: true, trained: false } })
  }
}

function computeQEnt(
  delta_phase: number,
  n: number,
  phi: number,
  solarFeatures?: Record<string, number> | null,
): void {
  const startTime = performance.now()
  try {
    const phase_factor = Math.abs(Math.cos(phi * n / 2) / Math.PI)
    const cascade_factor = Math.sin(phi * n / 4) * Math.exp(-n / 20)
    const delta_weight = delta_phase * (1 + (n - 25) / 10)
    let q_ent = Math.abs(phase_factor * cascade_factor * delta_weight * Math.log(n + 1))

    if (isTrained && model && tf) {
      try {
        // Use provided solar features, fall back to training-time snapshot,
        // last resort to moderate defaults.
        const uv = clamp(solarFeatures?.xrayUVLift ?? trainingSnapshot?.xrayUVLift ?? 0.3, -0.3, 1.0)
        const mag = clamp(solarFeatures?.magPerturbation ?? trainingSnapshot?.magPerturbation ?? 0.2, 0, 1)
        const kp = clamp((solarFeatures?.kpIndex ?? trainingSnapshot?.kpIndex ?? 3) / 9, 0, 1)
        const input = tf.tensor2d([[delta_phase, n / 34, phi / 2, uv, mag, kp]])
        const prediction = model.predict(input)
        const adjustment = prediction.dataSync()[0]
        q_ent = q_ent * (0.85 + adjustment * 0.3)
        input.dispose()
        prediction.dispose()
      } catch {
        // model prediction failed — use base q_ent unchanged
      }
    }

    q_ent = Math.max(0, Math.min(1, q_ent))
    const computeTime = performance.now() - startTime

    self.postMessage({
      type: 'q-ent-result',
      data: { q_ent, compute_time: computeTime, trained: isTrained },
    })
  } catch (err: any) {
    self.postMessage({
      type: 'error',
      error: 'Q_ent failed: ' + err.message,
    })
  }
}

function computeCascade(
  tdf_value: number,
  n: number,
  tau: number,
  phi: number,
): void {
  const startTime = performance.now()
  try {
    const cascade_index = Math.floor(Math.PI / 7) + n
    const target_tptt = 5.3e12
    const safe_tdf = Math.max(1, Math.abs(tdf_value))
    const efficiency = Math.max(0, Math.min(1, Math.log10(safe_tdf) / Math.log10(target_tptt)))
    const computeTime = performance.now() - startTime

    self.postMessage({
      type: 'cascade-result',
      data: { cascade_index, efficiency, compute_time: computeTime },
    })
  } catch (err: any) {
    self.postMessage({
      type: 'error',
      error: 'Cascade failed: ' + err.message,
    })
  }
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data
  switch (msg.type) {
    case 'initialize':
      await initializeWorker()
      break
    case 'compute-q-ent':
      if (!isInitialized) await initializeWorker()
      computeQEnt(
        msg.data.delta_phase,
        msg.data.n,
        msg.data.phi,
        msg.data.solarFeatures ?? null,
      )
      break
    case 'compute-cascade':
      computeCascade(
        msg.data.tdf_value,
        msg.data.n,
        msg.data.tau,
        msg.data.phi,
      )
      break
    default:
      self.postMessage({ type: 'error', error: 'Unknown type: ' + msg.type })
  }
}
