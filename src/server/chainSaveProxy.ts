/**
 * Server-side forwarder for DynamoDeploy "Post to blockchain".
 * The browser never receives MCP_WRITE_API_KEY. This module reads it from
 * the host environment and attaches it on the way to the MCP write route.
 */

export const CHAIN_SAVE_RATE_LIMIT = 5
export const CHAIN_SAVE_RATE_WINDOW_MS = 60_000
export const CHAIN_SAVE_PROPOSAL_MAX = 20_000

/** Hosts that serve DynamoDeploy. Localhost is not included; set CHAIN_SAVE_ALLOWED_ORIGINS for dev. */
export const DEFAULT_CHAIN_SAVE_ORIGINS = [
  'https://dynamo.rippel.ai',
  'https://dynamo-ui-psi.vercel.app',
]

const DEFAULT_MCP_BASE = 'https://mcp-production-80e2.up.railway.app'

const hits = new Map<string, number[]>()

export function resetChainSaveGuardsForTests(): void {
  hits.clear()
}

export interface ChainSavePayload {
  proposal: string
  baseVoteWeight: 1
  sharePublicly: boolean
  persistToChain: true
  spectralQuality: number | null
  sunNeuralEmbedding: number[] | null
}

export interface ChainSaveResult {
  status: number
  body: Record<string, unknown>
}

type HeaderMap = Record<string, string | string[] | undefined>

function headerOne(headers: HeaderMap, name: string): string | null {
  const value = headers[name] ?? headers[name.toLowerCase()]
  if (Array.isArray(value)) return value[0] ?? null
  return typeof value === 'string' ? value : null
}

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/$/, '')
}

export function allowedOrigins(env: NodeJS.ProcessEnv): string[] {
  const raw = env.CHAIN_SAVE_ALLOWED_ORIGINS
  if (!raw || raw.trim() === '') return [...DEFAULT_CHAIN_SAVE_ORIGINS]
  return raw.split(',').map((part) => normalizeOrigin(part)).filter((part) => part.length > 0)
}

export function requestOriginAllowed(headers: HeaderMap, env: NodeJS.ProcessEnv): boolean {
  const allow = new Set(allowedOrigins(env))
  const origin = headerOne(headers, 'origin')
  if (origin) return allow.has(normalizeOrigin(origin))
  const referer = headerOne(headers, 'referer') ?? headerOne(headers, 'referrer')
  if (!referer) return false
  try {
    return allow.has(normalizeOrigin(new URL(referer).origin))
  } catch {
    return false
  }
}

export function clientIp(headers: HeaderMap): string {
  const forwarded = headerOne(headers, 'x-forwarded-for')
  const first = forwarded?.split(',')[0]?.trim()
  if (first) return first
  const real = headerOne(headers, 'x-real-ip')?.trim()
  return real ? real : 'unknown'
}

/** Returns false when this IP is over the small per-window limit. */
export function takeChainSaveSlot(ip: string, now: number): boolean {
  const recent = (hits.get(ip) ?? []).filter((stamp) => now - stamp < CHAIN_SAVE_RATE_WINDOW_MS)
  if (recent.length >= CHAIN_SAVE_RATE_LIMIT) {
    hits.set(ip, recent)
    return false
  }
  recent.push(now)
  hits.set(ip, recent)
  return true
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function parseChainSavePayload(body: unknown): { ok: true; payload: ChainSavePayload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Chain save payload must be an object' }
  }
  const record = body as Record<string, unknown>
  const keys = Object.keys(record)
  const expected = ['proposal', 'baseVoteWeight', 'sharePublicly', 'persistToChain', 'spectralQuality', 'sunNeuralEmbedding']
  if (keys.length !== expected.length || expected.some((key) => !keys.includes(key))) {
    return { ok: false, error: 'Chain save payload has the wrong shape' }
  }
  if (record.persistToChain !== true) {
    return { ok: false, error: 'Chain save only accepts persistToChain: true' }
  }
  if (typeof record.proposal !== 'string' || record.proposal.trim() === '' || record.proposal.length > CHAIN_SAVE_PROPOSAL_MAX) {
    return { ok: false, error: 'proposal must be a non-empty string' }
  }
  if (record.baseVoteWeight !== 1) {
    return { ok: false, error: 'baseVoteWeight must be 1' }
  }
  if (typeof record.sharePublicly !== 'boolean') {
    return { ok: false, error: 'sharePublicly must be a boolean' }
  }
  if (record.spectralQuality !== null && !isFiniteNumber(record.spectralQuality)) {
    return { ok: false, error: 'spectralQuality must be a finite number or null' }
  }
  const embedding = record.sunNeuralEmbedding
  if (embedding !== null) {
    if (!Array.isArray(embedding) || embedding.length !== 16 || embedding.some((value) => !isFiniteNumber(value))) {
      return { ok: false, error: 'sunNeuralEmbedding must be 16 finite numbers or null' }
    }
  }
  return {
    ok: true,
    payload: {
      proposal: record.proposal,
      baseVoteWeight: 1,
      sharePublicly: record.sharePublicly,
      persistToChain: true,
      spectralQuality: record.spectralQuality,
      sunNeuralEmbedding: embedding === null ? null : embedding.slice(),
    },
  }
}

function mcpBase(env: NodeJS.ProcessEnv): string {
  const raw = env.DYNAMO_MCP_URL || env.MCP_URL || DEFAULT_MCP_BASE
  return raw.replace(/\/$/, '')
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export async function handleChainSave(input: {
  method: string | undefined
  headers: HeaderMap
  body: unknown
  env: NodeJS.ProcessEnv
  now?: number
  fetchImpl?: typeof fetch
}): Promise<ChainSaveResult> {
  if ((input.method || '').toUpperCase() !== 'POST') {
    return { status: 405, body: { success: false, error: 'Method not allowed' } }
  }
  if (!requestOriginAllowed(input.headers, input.env)) {
    return { status: 403, body: { success: false, error: 'Origin is not allowed' } }
  }
  const now = input.now ?? Date.now()
  if (!takeChainSaveSlot(clientIp(input.headers), now)) {
    return { status: 429, body: { success: false, error: 'Too many chain saves' } }
  }
  let parsedBody = input.body
  if (typeof parsedBody === 'string') {
    try {
      parsedBody = JSON.parse(parsedBody) as unknown
    } catch {
      return { status: 400, body: { success: false, error: 'Chain save payload must be JSON' } }
    }
  }
  const parsed = parseChainSavePayload(parsedBody)
  if (!parsed.ok) return { status: 400, body: { success: false, error: parsed.error } }
  const apiKey = input.env.MCP_WRITE_API_KEY
  if (typeof apiKey !== 'string' || apiKey.trim() === '') {
    return { status: 503, body: { success: false, error: 'Write API key is not configured' } }
  }
  const fetchImpl = input.fetchImpl ?? fetch
  let response: Response
  try {
    response = await fetchImpl(`${mcpBase(input.env)}/govern_with_solar`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(parsed.payload),
      signal: AbortSignal.timeout(60_000),
    })
  } catch {
    return { status: 502, body: { success: false, error: 'Chain save upstream request failed' } }
  }
  const text = await response.text()
  let upstream: unknown
  try {
    upstream = JSON.parse(text) as unknown
  } catch {
    return { status: 502, body: { success: false, error: 'Chain save upstream returned a non-JSON body' } }
  }
  const record = asRecord(upstream)
  if (!record) return { status: 502, body: { success: false, error: 'Chain save upstream returned a non-JSON body' } }
  return { status: response.status, body: record }
}
