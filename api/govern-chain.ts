import { handleChainSave } from '../src/server/chainSaveProxy.js'

interface ChainSaveNodeRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
}

interface ChainSaveNodeResponse {
  status: (code: number) => ChainSaveNodeResponse
  json: (body: unknown) => void
}

/**
 * Upstream chain save aborts at 60s. 90s is that timeout plus 30s for
 * Turnstile, the limiter, and writing the response. Vercel reads this
 * export and the matching `functions` entry in vercel.json.
 */
export const maxDuration = 90

/** Vercel serverless route. DynamoDeploy is a static Vite app; this is the server in front of it. */
export default async function handler(req: ChainSaveNodeRequest, res: ChainSaveNodeResponse): Promise<void> {
  const result = await handleChainSave({
    method: req.method,
    headers: req.headers,
    body: req.body,
    env: process.env,
  })
  res.status(result.status).json(result.body)
}
