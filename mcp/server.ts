import { serve } from '@hono/node-server'
import app from './index'
import { temporalManifold } from './lib/temporalManifold.js'

const port = parseInt(process.env.PORT || '3000', 10)

serve({ fetch: app.fetch, port }, () => {
  console.log(`blurrn-mcp v4.8 running on port ${port}`)
  console.log(`[manifold] Temporal Manifold online · ${temporalManifold.getStatus().manifoldId}`)
})
