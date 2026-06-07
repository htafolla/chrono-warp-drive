import { serve } from '@hono/node-server'
import app from './index'
import { ambientField } from './lib/ambientField.js'
import { temporalManifold } from './lib/temporalManifold.js'

const port = parseInt(process.env.PORT || '3000', 10)

serve({ fetch: app.fetch, port }, () => {
  console.log(`blurrn-mcp v4.8 running on port ${port}`)
  ambientField.start()
  console.log('[ambient] Ambient Resonance Field started')
  console.log(`[manifold] Temporal Manifold online · ${temporalManifold.getStatus().manifoldId}`)
})
