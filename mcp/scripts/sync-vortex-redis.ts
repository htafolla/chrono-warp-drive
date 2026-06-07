/**
 * Sync vortex container→token mappings into Redis.
 *
 * Reads container IDs from:
 *   1. The MCP containerStore (Redis list dynamo:vortex:containers)
 *   2. The on-chain registry (listContainers)
 *
 * For each container, calls tokenByContainerId on the VortexTokenV41 contract.
 * If a token exists, stores the mapping in Redis hash dynamo:vortex:mint.
 *
 * Run: npx tsx mcp/scripts/sync-vortex-redis.ts
 */
import { http, createPublicClient, defineChain, createWalletClient, fallback } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { getRedisClient } from '../pubsub.js'

const VORTEX_TOKEN_ADDRESS = '0x7E410f102Cc7320fd8B9601637f5A67AfDF40cF9'
const REGISTRY_ADDRESS = '0xCB418F081D4fDAD6B2b17027294865B26cb26855'
const REDIS_VORTEX_KEY_MINT = 'dynamo:vortex:mint'
const REDIS_CONTAINER_KEY = 'dynamo:vortex:containers'

const RPC_URLS = [
  'https://mainnet.base.org',
  'https://base-rpc.publicnode.com',
  process.env.BASE_RPC_URL,
].filter((u): u is string => !!u)
const UNIQUE_RPC_URLS = [...new Set(RPC_URLS)]

const base = defineChain({
  id: 8453, name: 'Base', network: 'base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: UNIQUE_RPC_URLS } },
})

const transport = fallback(
  UNIQUE_RPC_URLS.map(url => http(url, { timeout: 8000 })),
  { rank: false }
)

const publicClient = createPublicClient({ chain: base, transport })

async function loadVortexAbi() {
  return (await import('../lib/abi/VortexTokenV41.json', { with: { type: 'json' } })).default as any[]
}

async function loadRegistryAbi() {
  return (await import('../lib/abi/TemporalContainerRegistry.json', { with: { type: 'json' } })).default as any[]
}

async function getTokenId(containerId: string): Promise<bigint | null> {
  try {
    const abi = await loadVortexAbi()
    const tid = await publicClient.readContract({
      address: VORTEX_TOKEN_ADDRESS, abi,
      functionName: 'tokenByContainerId',
      args: [containerId as `0x${string}`],
    }) as bigint
    return tid
  } catch {
    return null
  }
}

async function main() {
  console.log('=== Vortex Redis Sync ===\n')

  const vortexAbi = await loadVortexAbi()
  const registryAbi = await loadRegistryAbi()

  // Collect all container IDs
  const containerIds = new Set<string>()

  // 1) From MCP container store (Redis)
  const client = await getRedisClient()
  if (client) {
    const raw = await client.lrange(REDIS_CONTAINER_KEY, 0, -1)
    for (const entry of raw) {
      try {
        const c = JSON.parse(entry)
        if (c.containerId) containerIds.add(c.containerId)
      } catch { /* skip */ }
    }
    console.log(`  From Redis store: ${raw.length} entries, ${containerIds.size} unique IDs`)
  } else {
    console.log('  ⚠️  Redis not available — skipping store containers')
  }

  // 2) From on-chain registry
  try {
    const [ids] = await publicClient.readContract({
      address: REGISTRY_ADDRESS, abi: registryAbi,
      functionName: 'listContainers',
      args: [0n, 100n],
    }) as [string[], bigint]
    for (const id of ids as string[]) containerIds.add(id)
    console.log(`  From on-chain registry: ${(ids as string[]).length} containers`)
  } catch (err: any) {
    console.log(`  ⚠️  Could not read on-chain registry: ${err.message}`)
  }

  console.log(`\n  Total unique container IDs: ${containerIds.size}`)

  // Check each container for a token
  const ids = [...containerIds]
  let synced = 0
  let found = 0

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
    const tid = await getTokenId(id)
    if (tid !== null && tid > 0n) {
      found++
      if (client) {
        await client.hset(REDIS_VORTEX_KEY_MINT, id.toLowerCase(), tid.toString())
        synced++
      }
      const prefix = id.slice(0, 22)
      console.log(`  [${i + 1}/${ids.length}] ✅ token #${tid}  ${prefix}...`)
    } else {
      if (i < 5 || i % 10 === 0 || i === ids.length - 1) {
        console.log(`  [${i + 1}/${ids.length}] ⬜ no token  ${id.slice(0, 22)}...`)
      }
    }
  }

  console.log(`\n  Found ${found}/${ids.length} minted tokens`)
  if (client) {
    console.log(`  Synced ${synced} mappings to Redis`)
    const stored = await client.hgetall(REDIS_VORTEX_KEY_MINT).catch(() => null)
    const count = stored ? Object.keys(stored).length : 0
    console.log(`  Redis hash now has ${count} entries`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
