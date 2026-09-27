import { createHash, createHmac, timingSafeEqual } from 'crypto'

/**
 * HMAC-SHA256 over containerHash|containerId with a server-only secret, compared
 * via timingSafeEqual, so /vortex/mint never needs a wallet key.
 * EIP-191 would require a secp256k1 signing key (wallet-shaped); this does not.
 */
export const VORTEX_SIGNING_KEY_ENV = 'VORTEX_SIGNING_KEY'
export const MCP_WRITE_API_KEY_ENV = 'MCP_WRITE_API_KEY'

/** Persist + the auto-mint it triggers. Kept at 60 seconds so this constant matches the handler comment (the old 10_000 value did not). */
export const PERSIST_COOLDOWN_MS = 60_000

export const MINT_RATE_LIMIT = 5
export const MINT_RATE_WINDOW_MS = 60_000
export const MINT_ADDRESS_CAP = 8

const ZERO_BYTES32 = '0x' + '00'.repeat(32)

let lastPersistAt = 0
let signingKeyReads = 0
const mintedContainers = new Set<string>()
const inFlightContainers = new Set<string>()
const addressMintCounts = new Map<string, number>()
const rateBuckets = new Map<string, number[]>()

export function signingKeyReadCount(): number {
  return signingKeyReads
}

export function resetWriteGuardsForTests(): void {
  lastPersistAt = 0
  signingKeyReads = 0
  mintedContainers.clear()
  inFlightContainers.clear()
  addressMintCounts.clear()
  rateBuckets.clear()
}

function digestEqual(left: string, right: string): boolean {
  const a = createHash('sha256').update(left, 'utf8').digest()
  const b = createHash('sha256').update(right, 'utf8').digest()
  return timingSafeEqual(a, b)
}

export function bearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null
  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim())
  return match ? match[1] : null
}

export type WriteAuth =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string }

/** Fail closed when MCP_WRITE_API_KEY is unset. Comparison is constant-time. */
export function authorizeWrite(authorizationHeader: string | undefined): WriteAuth {
  const expected = process.env[MCP_WRITE_API_KEY_ENV]
  if (!expected || expected.trim() === '') {
    return { ok: false, status: 503, error: 'Write API key is not configured' }
  }
  const provided = bearerToken(authorizationHeader)
  if (!provided || !digestEqual(provided, expected)) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

/** Reads VORTEX_SIGNING_KEY. Blank is unset. Does not read the deployer key. */
export function readVortexSigningKey(): string | null {
  signingKeyReads += 1
  const raw = process.env[VORTEX_SIGNING_KEY_ENV]
  if (!raw || raw.trim() === '') return null
  return raw
}

export function vortexSigningMessage(containerHash: string, containerId: string): string {
  return `${containerHash.toLowerCase()}|${containerId.toLowerCase()}`
}

export function signVortex(containerHash: string, containerId: string, key: string): string {
  return createHmac('sha256', key).update(vortexSigningMessage(containerHash, containerId), 'utf8').digest('hex')
}

function fixedTimeFalse(expected: Buffer): boolean {
  timingSafeEqual(expected, expected)
  return false
}

/** Fail closed when key is null. Always compares 32-byte digests in constant time. */
export function verifyVortexSignature(
  containerHash: string,
  containerId: string,
  signatureHex: string,
  key: string | null,
): boolean {
  if (!key) return false
  const expected = createHmac('sha256', key).update(vortexSigningMessage(containerHash, containerId), 'utf8').digest()
  const normalized = signatureHex.trim().replace(/^0x/i, '')
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) return fixedTimeFalse(expected)
  const provided = Buffer.from(normalized, 'hex')
  if (provided.length !== expected.length) return fixedTimeFalse(expected)
  return timingSafeEqual(expected, provided)
}

export function isBytes32(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(value) && value.toLowerCase() !== ZERO_BYTES32
}

export function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value)
}

export function clientRateKey(forwardedFor: string | undefined): string {
  const first = forwardedFor?.split(',')[0]?.trim()
  return first ? first : 'local'
}

export type MintClaim =
  | { ok: true }
  | { ok: false; status: 409 | 429; error: string }

/**
 * Idempotency, rate limit, and per-address cap. All checks are in memory and
 * finish before the caller is allowed to touch the chain. One containerId can
 * hold at most one in-flight or completed mint.
 */
export function claimMintSlot(input: {
  containerId: string
  recipient: string
  rateKey: string
  now?: number
}): MintClaim {
  const id = input.containerId.toLowerCase()
  if (mintedContainers.has(id) || inFlightContainers.has(id)) {
    return { ok: false, status: 409, error: 'Container already has a vortex token' }
  }
  const now = input.now ?? Date.now()
  const bucket = (rateBuckets.get(input.rateKey) ?? []).filter((stamp) => now - stamp < MINT_RATE_WINDOW_MS)
  if (bucket.length >= MINT_RATE_LIMIT) {
    rateBuckets.set(input.rateKey, bucket)
    return { ok: false, status: 429, error: 'Mint rate limit exceeded' }
  }
  const recipient = input.recipient.toLowerCase()
  if ((addressMintCounts.get(recipient) ?? 0) >= MINT_ADDRESS_CAP) {
    return { ok: false, status: 429, error: 'Per-address mint cap exceeded' }
  }
  bucket.push(now)
  rateBuckets.set(input.rateKey, bucket)
  inFlightContainers.add(id)
  return { ok: true }
}

export function commitMintSlot(containerId: string, recipient: string): void {
  const id = containerId.toLowerCase()
  inFlightContainers.delete(id)
  mintedContainers.add(id)
  const addr = recipient.toLowerCase()
  addressMintCounts.set(addr, (addressMintCounts.get(addr) ?? 0) + 1)
}

export function releaseMintSlot(containerId: string): void {
  inFlightContainers.delete(containerId.toLowerCase())
}

export function acquirePersistCooldown(now = Date.now()): { ok: true } | { ok: false; retryAfterSeconds: number } {
  if (now - lastPersistAt < PERSIST_COOLDOWN_MS) {
    const retryAfterSeconds = Math.ceil((PERSIST_COOLDOWN_MS - (now - lastPersistAt)) / 1000)
    return { ok: false, retryAfterSeconds }
  }
  lastPersistAt = now
  return { ok: true }
}
