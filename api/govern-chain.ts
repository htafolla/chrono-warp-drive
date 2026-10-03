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
 * Upstream chain save aborts at 45s. maxDuration is that timeout plus 15s,
 * and it stays on the Vercel Hobby cap of 60s. Vercel reads this export
 * and the matching `functions` entry in vercel.json.
 */
export const maxDuration = 60

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
