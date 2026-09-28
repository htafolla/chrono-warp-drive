/**
 * Server-side forwarder for DynamoDeploy "Post to blockchain".
 * The browser never receives MCP_WRITE_API_KEY. This module reads it from
 * the host environment and attaches it on the way to the MCP write route.
 *
 * Caller proof is a server-side Cloudflare Turnstile check. The rate limit
 * lives in a shared store keyed by Vercel's own client IP header. Either one
 * missing is a 503 and nothing is forwarded.
 */

import { redisLimitStore, type ChainSaveLimitStore } from './redisLimitStore.js'

export const CHAIN_SAVE_RATE_LIMIT = 5
export const CHAIN_SAVE_RATE_WINDOW_MS = 60_000
export const CHAIN_SAVE_PROPOSAL_MAX = 20_000
export const CHAIN_SAVE_BODY_MAX = 48_000
/** Shorter than the chain receipt wait. maxDuration is this plus 15s, and not above the Hobby cap. */
export const CHAIN_SAVE_UPSTREAM_TIMEOUT_MS = 45_000
export const CHAIN_SAVE_MAX_DURATION_S = 60
export const TURNSTILE_SECRET_ENV = 'TURNSTILE_SECRET_KEY'
export const CHAIN_SAVE_LIMIT_STORE_ENV = 'CHAIN_SAVE_LIMIT_STORE_URL'
export const GENERIC_CHAIN_SAVE_ERROR = 'Chain save failed'
/** Vercel sets this. Callers cannot overwrite it the way they can prepend X-Forwarded-For. */
export const VERCEL_CLIENT_IP_HEADER = 'x-vercel-forwarded-for'
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** Hosts that serve DynamoDeploy. Localhost is not included; set CHAIN_SAVE_ALLOWED_ORIGINS for dev. */
export const DEFAULT_CHAIN_SAVE_ORIGINS = [
  'https://dynamo.rippel.ai',
  'https://dynamo-ui-psi.vercel.app',
]

const DEFAULT_MCP_BASE = 'https://mcp-production-80e2.up.railway.app'

export type { ChainSaveLimitStore } from './redisLimitStore.js'

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

export function resetChainSaveGuardsForTests(): void {
  // The limiter is the injected store. There is no process-local bucket to clear.
}

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

/** Platform client IP. The caller-supplied X-Forwarded-For chain is ignored. */
export function vercelClientIp(headers: HeaderMap): string | null {
  const raw = headerOne(headers, VERCEL_CLIENT_IP_HEADER)?.trim()
  if (!raw) return null
  const first = raw.split(',')[0]?.trim()
  return first ? first : null
}

function configuredSecret(env: NodeJS.ProcessEnv): string | null {
  const raw = env[TURNSTILE_SECRET_ENV]
  if (typeof raw !== 'string' || raw.trim() === '') return null
  return raw.trim()
}

export function limitStoreFromEnv(env: NodeJS.ProcessEnv): ChainSaveLimitStore | null {
  const raw = env[CHAIN_SAVE_LIMIT_STORE_ENV]
  if (typeof raw !== 'string' || raw.trim() === '') return null
  return redisLimitStore(raw.trim())
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

function bodyTooLarge(body: unknown): boolean {
  if (typeof body === 'string') return body.length > CHAIN_SAVE_BODY_MAX
  try {
    return JSON.stringify(body).length > CHAIN_SAVE_BODY_MAX
  } catch {
    return true
  }
}

function readTurnstileToken(body: unknown, headers: HeaderMap): { token: string | null; rest: unknown } {
  const headerToken = headerOne(headers, 'cf-turnstile-response')?.trim() ?? ''
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { token: headerToken || null, rest: body }
  }
  const record = { ...(body as Record<string, unknown>) }
  const raw = record.turnstileToken
  delete record.turnstileToken
  const fromBody = typeof raw === 'string' ? raw.trim() : ''
  const token = fromBody || headerToken
  return { token: token || null, rest: record }
}

function allowedHosts(env: NodeJS.ProcessEnv): Set<string> {
  const hosts = new Set<string>()
  for (const origin of allowedOrigins(env)) {
    try {
      hosts.add(new URL(origin).host)
    } catch {
      // skip a bad allowlist entry
    }
  }
  return hosts
}

async function verifyTurnstileToken(input: {
  secret: string
  token: string
  remoteIp: string | null
  env: NodeJS.ProcessEnv
  fetchImpl: typeof fetch
}): Promise<boolean> {
  const form = new URLSearchParams({ secret: input.secret, response: input.token })
  if (input.remoteIp) form.set('remoteip', input.remoteIp)
  const response = await input.fetchImpl(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form,
  })
  if (!response.ok) return false
  const parsed = asRecord(await response.json())
  if (!parsed || parsed.success !== true) return false
  if (typeof parsed.hostname !== 'string') return false
  return allowedHosts(input.env).has(parsed.hostname)
}

async function takeSharedSlot(store: ChainSaveLimitStore, ip: string, now: number): Promise<boolean> {
  const key = `chain-save:${ip}`
  const raw = await store.get(key)
  let stamps: number[] = []
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) stamps = parsed.filter((stamp): stamp is number => typeof stamp === 'number')
    } catch {
      stamps = []
    }
  }
  const recent = stamps.filter((stamp) => now - stamp < CHAIN_SAVE_RATE_WINDOW_MS)
  if (recent.length >= CHAIN_SAVE_RATE_LIMIT) {
    await store.set(key, JSON.stringify(recent), CHAIN_SAVE_RATE_WINDOW_MS)
    return false
  }
  recent.push(now)
  await store.set(key, JSON.stringify(recent), CHAIN_SAVE_RATE_WINDOW_MS)
  return true
}

function upstreamAbort(timeoutMs: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController()
  const timer = setTimeout(() => { controller.abort() }, timeoutMs)
  return { signal: controller.signal, cancel: () => { clearTimeout(timer) } }
}

function upstreamTimedOut(err: unknown, signal: AbortSignal): boolean {
  if (signal.aborted) return true
  return err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')
}

/** Upstream text stays on the server. Callers see one sentence. */
export function sanitizeUpstreamBody(status: number, record: Record<string, unknown>): Record<string, unknown> {
  const failed = status < 200 || status >= 300 || record.success === false || typeof record.onChainError === 'string' || typeof record.error === 'string'
  if (!failed) return record
  return { success: false, error: GENERIC_CHAIN_SAVE_ERROR }
}

export async function handleChainSave(input: {
  method: string | undefined
  headers: HeaderMap
  body: unknown
  env: NodeJS.ProcessEnv
  now?: number
  fetchImpl?: typeof fetch
  limitStore?: ChainSaveLimitStore | null
  verifyImpl?: (token: string) => Promise<boolean>
}): Promise<ChainSaveResult> {
  if ((input.method || '').toUpperCase() !== 'POST') {
    return { status: 405, body: { success: false, error: 'Method not allowed' } }
  }
  const secret = configuredSecret(input.env)
  if (!secret) {
    return { status: 503, body: { success: false, error: 'Caller verification is not configured' } }
  }
  const store = input.limitStore === undefined ? limitStoreFromEnv(input.env) : input.limitStore
  if (!store) {
    return { status: 503, body: { success: false, error: 'Chain save limiter is not configured' } }
  }
  if (bodyTooLarge(input.body)) {
    return { status: 413, body: { success: false, error: 'Chain save body is too large' } }
  }
  let parsedBody = input.body
  if (typeof parsedBody === 'string') {
    try {
      parsedBody = JSON.parse(parsedBody) as unknown
    } catch {
      return { status: 400, body: { success: false, error: 'Chain save payload must be JSON' } }
    }
  }
  if (!requestOriginAllowed(input.headers, input.env)) {
    return { status: 403, body: { success: false, error: 'Origin is not allowed' } }
  }
  const tokenSplit = readTurnstileToken(parsedBody, input.headers)
  if (!tokenSplit.token) {
    return { status: 403, body: { success: false, error: 'Caller verification failed' } }
  }
  const fetchImpl = input.fetchImpl ?? fetch
  let verified = false
  try {
    verified = input.verifyImpl
      ? await input.verifyImpl(tokenSplit.token)
      : await verifyTurnstileToken({
        secret,
        token: tokenSplit.token,
        remoteIp: vercelClientIp(input.headers),
        env: input.env,
        fetchImpl,
      })
  } catch {
    return { status: 503, body: { success: false, error: 'Caller verification is not configured' } }
  }
  if (!verified) {
    return { status: 403, body: { success: false, error: 'Caller verification failed' } }
  }
  const parsed = parseChainSavePayload(tokenSplit.rest)
  if (!parsed.ok) return { status: 400, body: { success: false, error: parsed.error } }
  const apiKey = input.env.MCP_WRITE_API_KEY
  if (typeof apiKey !== 'string' || apiKey.trim() === '') {
    return { status: 503, body: { success: false, error: 'Write API key is not configured' } }
  }
  const ip = vercelClientIp(input.headers)
  if (!ip) {
    return { status: 403, body: { success: false, error: 'Caller verification failed' } }
  }
  const now = input.now ?? Date.now()
  let allowed = false
  try {
    allowed = await takeSharedSlot(store, ip, now)
  } catch {
    return { status: 503, body: { success: false, error: 'Chain save limiter is not configured' } }
  }
  if (!allowed) {
    return { status: 429, body: { success: false, error: 'Too many chain saves' } }
  }
  const abortHandle = upstreamAbort(CHAIN_SAVE_UPSTREAM_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetchImpl(`${mcpBase(input.env)}/govern_with_solar`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(parsed.payload),
      signal: abortHandle.signal,
    })
  } catch (err: unknown) {
    if (upstreamTimedOut(err, abortHandle.signal)) {
      return { status: 504, body: { success: false, error: GENERIC_CHAIN_SAVE_ERROR, pending: true } }
    }
    return { status: 502, body: { success: false, error: GENERIC_CHAIN_SAVE_ERROR } }
  } finally {
    abortHandle.cancel()
  }
  const text = await response.text()
  let upstream: unknown
  try {
    upstream = JSON.parse(text) as unknown
  } catch {
    return { status: 502, body: { success: false, error: GENERIC_CHAIN_SAVE_ERROR } }
  }
  const record = asRecord(upstream)
  if (!record) return { status: 502, body: { success: false, error: GENERIC_CHAIN_SAVE_ERROR } }
  return { status: response.status, body: sanitizeUpstreamBody(response.status, record) }
}
