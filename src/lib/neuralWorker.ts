// TensorFlow.js Worker Thread for Neural Fusion (Codex v4.7 Phase 3)
// Q_ent and cascade computations offloaded to worker thread

export interface NeuralWorkerMessage {
  type: 'compute-q-ent' | 'compute-cascade' | 'initialize';
  data?: {
    delta_phase?: number;
    n?: number;
    tdf_value?: number;
    tau?: number;
    phi?: number;
  };
}

export interface NeuralWorkerResponse {
  type: 'q-ent-result' | 'cascade-result' | 'initialized' | 'error';
  data?: {
    q_ent?: number;
    cascade_index?: number;
    efficiency?: number;
    compute_time?: number;
  };
  error?: string;
}

/**
 * Creates a TensorFlow.js worker for neural fusion computations
 * This runs in a Web Worker to avoid blocking the main thread
 */
export function createNeuralWorker(): Worker {
  const workerCode = `
    // Import TensorFlow.js in worker with retry logic
    let tf = null;
    let loadAttempts = 0;
    const maxAttempts = 3;
    
    async function loadTensorFlow() {
      while (loadAttempts < maxAttempts && !tf) {
        try {
          loadAttempts++;
          console.log('[Neural Worker] Loading TensorFlow.js, attempt ' + loadAttempts);
          importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
          tf = self.tf;
          console.log('[Neural Worker] TensorFlow.js loaded successfully');
          return true;
        } catch (error) {
          console.error('[Neural Worker] Failed to load TensorFlow.js:', error.message);
          if (loadAttempts >= maxAttempts) {
            return false;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      return !!tf;
    }
    
    let model = null;
    let isInitialized = false;
    
    // Initialize TensorFlow.js model
    async function initialize() {
      try {
        console.log('[Neural Worker] Initializing...');
        const tfLoaded = await loadTensorFlow();
        
        if (!tfLoaded) {
          console.warn('[Neural Worker] TensorFlow.js not available, using fallback mode');
          isInitialized = true; // Still mark as initialized for fallback calculations
          self.postMessage({ type: 'initialized', data: { fallbackMode: true } });
          return;
        }
        // Create a simple sequential model for Q_ent calculations
        model = tf.sequential({
          layers: [
            tf.layers.dense({ units: 16, activation: 'relu', inputShape: [3] }),
            tf.layers.dense({ units: 8, activation: 'relu' }),
            tf.layers.dense({ units: 1, activation: 'sigmoid' })
          ]
        });
        
        // Compile the model
        model.compile({
          optimizer: 'adam',
          loss: 'meanSquaredError'
        });
        
        isInitialized = true;
        console.log('[Neural Worker] Model created and compiled successfully');
        self.postMessage({ type: 'initialized', data: { fallbackMode: false } });
      } catch (error) {
        self.postMessage({ 
          type: 'error', 
          error: 'Failed to initialize TensorFlow.js: ' + error.message 
        });
      }
    }
    
    // Compute quantum entanglement (Q_ent)
    function computeQEnt(delta_phase, n, phi = 1.666) {
      const startTime = performance.now();
      
      try {
        // Codex v4.7 formula: Q_ent calculation
        // Q_ent represents quantum entanglement strength
        const phase_factor = Math.abs(Math.cos(phi * n / 2) / Math.PI);
        const cascade_factor = Math.sin(phi * n / 4) * Math.exp(-n / 20);
        const delta_weight = delta_phase * (1 + (n - 25) / 10);
        
        let q_ent = Math.abs(phase_factor * cascade_factor * delta_weight * Math.log(n + 1));
        
        // Use neural model for refinement if available
        if (isInitialized && model && tf) {
          try {
            const input = tf.tensor2d([[delta_phase, n / 34, phi / 2]]);
            const prediction = model.predict(input);
            const adjustment = prediction.dataSync()[0];
            q_ent = q_ent * (0.9 + adjustment * 0.2); // Neural adjustment ±10%
            input.dispose();
            prediction.dispose();
          } catch (error) {
            console.warn('[Neural Worker] Model prediction failed, using base calculation:', error.message);
          }
        }
        
        // Clamp to valid range [0, 1]
        q_ent = Math.max(0, Math.min(1, q_ent));
        
        const computeTime = performance.now() - startTime;
        
        console.log('[Neural Worker] Q_ent complete:', q_ent.toFixed(6));
        
        self.postMessage({
          type: 'q-ent-result',
          data: { q_ent, compute_time: computeTime }
        });
      } catch (error) {
        self.postMessage({
          type: 'error',
          error: 'Q_ent computation failed: ' + error.message
        });
      }
    }
    
    // Compute cascade index and efficiency
    function computeCascade(tdf_value, n, tau = 0.865, phi = 1.666) {
      const startTime = performance.now();
      
      try {
        // Codex v4.7 formula: Cascade Index = floor(π / voids) + n
        const pi = Math.PI;
        const voids = 7;
        const cascade_index = Math.floor(pi / voids) + n;
        
        // Efficiency calculation normalized to [0..1] based on tPTT target (5.3e12)
        const target_tptt = 5.3e12;
        const efficiency = Math.min(1, tdf_value / target_tptt);
        
        const computeTime = performance.now() - startTime;
        
        console.log('[Neural Worker] Cascade complete:', { cascade_index, efficiency: (efficiency * 100).toFixed(1) + '%' });
        
        self.postMessage({
          type: 'cascade-result',
          data: { cascade_index, efficiency, compute_time: computeTime }
        });
      } catch (error) {
        self.postMessage({
          type: 'error',
          error: 'Cascade computation failed: ' + error.message
        });
      }
    }
    
    // Message handler
    self.addEventListener('message', async (e) => {
      const message = e.data;
      
      switch (message.type) {
        case 'initialize':
          await initialize();
          break;
          
        case 'compute-q-ent':
          if (!isInitialized) {
            await initialize();
          }
          computeQEnt(
            message.data.delta_phase,
            message.data.n,
            message.data.phi
          );
          break;
          
        case 'compute-cascade':
          computeCascade(
            message.data.tdf_value,
            message.data.n,
            message.data.tau,
            message.data.phi
          );
          break;
          
        default:
          self.postMessage({
            type: 'error',
            error: 'Unknown message type: ' + message.type
          });
      }
    });
  `;
  
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  return new Worker(workerUrl);
}
