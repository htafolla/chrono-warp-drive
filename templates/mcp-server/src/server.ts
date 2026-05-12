// src/server.ts
// Entry point for production deployment

import { serve } from '@hono/node-server'
import app from './index'

const PORT = process.env.PORT || 3000

serve({ fetch: app.fetch, port: Number(PORT) }, () => {
  console.log(`MCP Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`Redis mode: ${process.env.REDIS_URL ? 'enabled' : 'disabled (in-memory)'}`)
})
