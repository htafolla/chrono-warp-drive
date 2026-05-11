import { serve } from '@hono/node-server'
import app from './stellar'

const port = parseInt(process.env.PORT || '3001', 10)

serve({ fetch: app.fetch, port }, () => {
  console.log(`blurrn-stellar-mcp v4.8.2 running on port ${port}`)
})
