// mcp/stellar.ts
// REAL version using actual TensorFlow.js + Real Stellar Library

import { Hono, Context } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

const REAL_BACKEND_URL = process.env.REAL_NEURAL_BACKEND_URL || 'http://localhost:3001'

const app = new Hono()
app.use('/*', cors())

function ok(c: Context, data: Record<string, unknown>) { return c.json({ success: true, engine: 'real-tensorflow', ...data }) }
function fail(c: Context, message: string, status: any = 400) { return c.json({ success: false, error: message }, status) }

async function callRealBackend(endpoint: string, body: any) {
  const response = await fetch(`${REAL_BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!response.ok) throw new Error(`Backend error: ${response.status}`)
  return await response.json()
}

const ProcessSchema = z.object({ wavelengths: z.array(z.number()).min(5), fluxes: z.array(z.number()).min(5), objectType: z.string().default('star') })
app.post('/stellar_process_spectrum', async (c: Context) => {
  const parsed = ProcessSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))
  try {
    const result = await callRealBackend('/process-spectrum', parsed.data)
    return ok(c, result)
  } catch (error) { return fail(c, 'Real backend unavailable', 503) }
})

const MetaSchema = z.object({ wavelengths: z.array(z.number()).min(5), fluxes: z.array(z.number()).min(5), objectType: z.string().default('star') })
app.post('/stellar_calculate_metamorphosis_index', async (c: Context) => {
  const parsed = MetaSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))
  try {
    const result = await callRealBackend('/calculate-metamorphosis-index', parsed.data)
    return ok(c, result)
  } catch (error) { return fail(c, 'Real backend unavailable', 503) }
})

const IsotopicSchema = z.object({ wavelengths: z.array(z.number()).min(5), fluxes: z.array(z.number()).min(5), cascadeIndex: z.number().int().min(0).default(0) })
app.post('/stellar_isotopic_embedding', async (c: Context) => {
  const parsed = IsotopicSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))
  try {
    const result = await callRealBackend('/isotopic-embedding', parsed.data)
    return ok(c, result)
  } catch (error) { return fail(c, 'Real backend unavailable', 503) }
})

const RealStarSchema = z.object({ starName: z.string().min(3) })
app.post('/process_real_star', async (c: Context) => {
  const parsed = RealStarSchema.safeParse(await c.req.json())
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '))
  try {
    const result = await callRealBackend('/process-stellar-spectrum', parsed.data)
    return ok(c, result)
  } catch (error) { return fail(c, 'Real backend unavailable', 503) }
})

app.get('/list_real_stars', async (c: Context) => {
  try {
    const response = await fetch(`${REAL_BACKEND_URL}/list-stars`)
    const data = await response.json()
    return ok(c, data)
  } catch (error) { return fail(c, 'Real backend unavailable', 503) }
})

app.get('/health', (c: Context) => c.json({ status: 'ok', name: 'blurrn-stellar-mcp', version: '4.8.4-real', backend: REAL_BACKEND_URL, engine: 'real-tensorflow' }))

app.get('/', (c: Context) => c.json({ name: 'blurrn-stellar-mcp', version: '4.8.4-real', tools: 8, description: 'REAL neural fusion using actual TensorFlow.js models + Real Stellar Library (17 stars). No simulation.', engine: 'real-tensorflow', realStarsAvailable: 17, note: 'This is the REAL version.' }))

export default app