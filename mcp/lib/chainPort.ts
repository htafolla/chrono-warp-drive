import { createPublicClient, createWalletClient, type Abi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import {
  CONTRACT_ADDRESS,
  baseMainnet,
  buildFallbackTransport,
  buildReadTransport,
  getPrivateKey,
  persistContainerToChain,
} from './contractClient.js'
import type { ContainerVortex } from './temporalContainer.js'
import { containerToContractParams } from './temporalContainer.js'
import { getRedisClient } from '../pubsub.js'

export const VORTEX_TOKEN_ADDRESS = '0x7E410f102Cc7320fd8B9601637f5A67AfDF40cF9' as const
export const VORTEX_TREASURY = '0xd45CcF98D6db5A36E7CdD10ffae0b685BF27CE43' as const

const ZERO_BYTES32 = '0x' + '00'.repeat(32)

export interface RegistryScore {
  verdict: string
  fullBox7DComposite: bigint | number
  waveProximity: bigint | number
  phaseAlignment: bigint | number
  calibratedVortex: bigint | number
  calibratedSync: bigint | number
  neuralProximity: bigint | number
  neuralVortex: bigint | number
  gematriaResonance: bigint | number
}

export interface RegistryMoral {
  trinitariumMoralScore: bigint | number
  trinitariumGematriaFusion: bigint | number
  moralNumerologicalTension: string
  virtueAlignment: bigint | number
  moralSafety: bigint | number
  intentAlignment: bigint | number
}

/** Shape returned by TemporalContainerRegistry.getContainer and consumed by mint(). */
export interface RegistryContainer {
  containerId?: string
  timestamp: bigint | number
  source: string
  containerHash: string
  hammerReason?: string
  resonanceProfile: RegistryScore
  moralOverlay: RegistryMoral
}

export interface ChainExecutor {
  chainCalls: number
  keyReads: number
  readContainerExact(containerId: string): Promise<RegistryContainer | null>
  persistStoredContainer(container: ContainerVortex): Promise<{ txHash: string }>
  persistGovernedContainer(container: ContainerVortex): Promise<{ txHash: string }>
  mintRegistered(input: {
    to: string
    containerId: string
    container: RegistryContainer
  }): Promise<{ txHash: string; tokenId: string | null }>
  /** token id string when this container id already has a mint. Does not read the deployer key. */
  existingMint(containerId: string): Promise<string | null>
  /** Container ids already minted, for rebuilding the in-memory set at boot. No deployer key. */
  listMintedContainerIds(): Promise<string[]>
  autoMint(mintId: string, container: ContainerVortex, proposalText: string): Promise<{ txHash: string }>
}

/** The single bytes32 both mint paths pass to VortexToken.mint. */
export function onChainMintId(containerId: string): `0x${string}` {
  return containerId as `0x${string}`
}

const ZERO_MINT_KEY = '0x' + '00'.repeat(32)

function isMintKey(value: string | undefined): value is string {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value) && value.toLowerCase() !== ZERO_MINT_KEY
}

/**
 * One on-chain token, as read at boot. `tokenByKey` is tokenByContainerId for
 * both historical keys: containerId (route mint) and containerHash (auto-mint).
 */
export interface ChainMintRecord {
  containerId: string
  containerHash: string
  tokenByKey: Record<string, string | null>
}

function tokenForKey(record: ChainMintRecord, key: string): string | null {
  const lower = key.toLowerCase()
  if (lower in record.tokenByKey) return record.tokenByKey[lower]
  for (const [stored, tokenId] of Object.entries(record.tokenByKey)) {
    if (stored.toLowerCase() === lower) return tokenId
  }
  return null
}

/**
 * Ids that already have a token. A hit on either old key marks that key, and a
 * hash-keyed auto-mint also marks the container id stored on the token.
 */
export function mintedIdsFromChainRecords(records: ChainMintRecord[]): string[] {
  const minted = new Set<string>()
  for (const record of records) {
    const containerId = record.containerId.toLowerCase()
    const containerHash = record.containerHash.toLowerCase()
    if (isMintKey(record.containerId) && tokenForKey(record, containerId)) {
      minted.add(containerId)
    }
    if (isMintKey(record.containerHash) && tokenForKey(record, containerHash)) {
      minted.add(containerHash)
      if (isMintKey(record.containerId)) minted.add(containerId)
    }
  }
  return [...minted]
}

function readBytes32Field(data: unknown, name: 'containerId' | 'containerHash', index: number): string {
  if (!data || typeof data !== 'object') return ''
  const record = data as Record<string, unknown>
  const named = record[name]
  if (typeof named === 'string') return named
  const indexed = record[index]
  return typeof indexed === 'string' ? indexed : ''
}

interface WalletBundle {
  walletClient: ReturnType<typeof createWalletClient>
  publicClient: ReturnType<typeof createPublicClient>
  account: ReturnType<typeof privateKeyToAccount>
}

let writeLock: Promise<void> = Promise.resolve()

async function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  let release: () => void = () => {}
  const prev = writeLock
  writeLock = new Promise<void>((resolve) => {
    release = resolve
  })
  await prev
  try {
    return await fn()
  } finally {
    release()
  }
}

async function loadAbi(which: 'registry' | 'token'): Promise<Abi> {
  if (which === 'registry') {
    const mod = await import('./abi/TemporalContainerRegistry.json', { with: { type: 'json' } })
    return mod.default as Abi
  }
  const mod = await import('./abi/VortexTokenV41.json', { with: { type: 'json' } })
  return mod.default as Abi
}

function scaleUint(value: bigint | number): bigint {
  return typeof value === 'bigint' ? value : BigInt(Math.round(Number(value) * 1e18))
}

function safeTs(value: bigint | number): bigint {
  return typeof value === 'bigint' ? value : BigInt(Math.floor(Number(value)))
}

function readClient() {
  return createPublicClient({
    chain: baseMainnet,
    transport: buildReadTransport(),
  })
}

class LiveChainExecutor implements ChainExecutor {
  chainCalls = 0
  keyReads = 0
  private walletCache: WalletBundle | null = null

  /** Wallet construction is the only deployer-key read. Reads never call this. */
  private wallet(): WalletBundle {
    if (this.walletCache) return this.walletCache
    this.keyReads += 1
    const account = privateKeyToAccount(getPrivateKey())
    const walletClient = createWalletClient({
      account,
      chain: baseMainnet,
      transport: buildFallbackTransport(),
    })
    const publicClient = createPublicClient({
      chain: baseMainnet,
      transport: buildReadTransport(),
    })
    this.walletCache = { walletClient, publicClient, account }
    return this.walletCache
  }

  async readContainerExact(containerId: string): Promise<RegistryContainer | null> {
    this.chainCalls += 1
    try {
      const publicClient = readClient()
      const abi = await loadAbi('registry')
      const container = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'getContainer',
        args: [containerId as `0x${string}`],
      }) as RegistryContainer
      const returned = typeof container?.containerId === 'string' ? container.containerId : ''
      if (!returned) return null
      if (returned.toLowerCase() === ZERO_BYTES32) return null
      if (returned.toLowerCase() !== containerId.toLowerCase()) return null
      return container
    } catch {
      return null
    }
  }

  async persistGovernedContainer(container: ContainerVortex): Promise<{ txHash: string }> {
    this.keyReads += 1
    this.chainCalls += 1
    return persistContainerToChain(container)
  }

  async persistStoredContainer(container: ContainerVortex): Promise<{ txHash: string }> {
    const { walletClient, publicClient, account } = this.wallet()
    this.chainCalls += 1
    const abi = await loadAbi('registry')
    const params = containerToContractParams(container)
    const regNonce = await publicClient.getTransactionCount({ address: account.address, blockTag: 'pending' })
    const txHash = await withWriteLock(async () => {
      return walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'storeContainer',
        nonce: regNonce,
        args: [
          params.containerId as `0x${string}`,
          params.timestamp,
          params.proposalHash as `0x${string}`,
          {
            timestamp: params.solarSnapshot.timestamp,
            activityLevel: params.solarSnapshot.activityLevel,
            xrayFlux: params.solarSnapshot.xrayFlux,
            kpIndex: params.solarSnapshot.kpIndex,
            protonFlux: params.solarSnapshot.protonFlux,
            magnetometer: params.solarSnapshot.magnetometer,
            solarTdf: params.solarSnapshot.solarTdf,
          },
          {
            fullBox7DComposite: params.resonanceProfile.fullBox7DComposite,
            fullBox7DVerdict: params.resonanceProfile.fullBox7DVerdict,
            waveProximity: params.resonanceProfile.waveProximity,
            phaseAlignment: params.resonanceProfile.phaseAlignment,
            calibratedVortex: params.resonanceProfile.calibratedVortex,
            calibratedSync: params.resonanceProfile.calibratedSync,
            neuralProximity: params.resonanceProfile.neuralProximity,
            neuralVortex: params.resonanceProfile.neuralVortex,
            gematriaResonance: params.resonanceProfile.gematriaResonance,
            structuralResonance: params.resonanceProfile.structuralResonance,
            verdict: params.resonanceProfile.verdict,
            confidence: params.resonanceProfile.confidence,
          },
          {
            trinitariumMoralScore: params.moralOverlay.trinitariumMoralScore,
            virtueAlignment: params.moralOverlay.virtueAlignment,
            moralSafety: params.moralOverlay.moralSafety,
            intentAlignment: params.moralOverlay.intentAlignment,
            trinitariumGematriaFusion: params.moralOverlay.trinitariumGematriaFusion,
            moralNumerologicalTension: params.moralOverlay.moralNumerologicalTension,
          },
          params.hammerReason || '',
          params.containerHash as `0x${string}`,
          params.source || 'ambient',
        ],
      })
    })
    await publicClient.waitForTransactionReceipt({ hash: txHash })
    return { txHash }
  }

  async mintRegistered(input: {
    to: string
    containerId: string
    container: RegistryContainer
  }): Promise<{ txHash: string; tokenId: string | null }> {
    const { walletClient, publicClient, account } = this.wallet()
    this.chainCalls += 1
    const abi = await loadAbi('token')
    const container = input.container
    const mintId = onChainMintId(input.containerId)
    const mintArgs = [
      input.to as `0x${string}`,
      mintId,
      {
        containerId: mintId,
        timestamp: safeTs(container.timestamp),
        verdict: container.resonanceProfile.verdict,
        fullBox7DComposite: scaleUint(container.resonanceProfile.fullBox7DComposite),
        trinitariumMoralScore: scaleUint(container.moralOverlay.trinitariumMoralScore),
        trinitariumGematriaFusion: scaleUint(container.moralOverlay.trinitariumGematriaFusion),
        moralTension: container.moralOverlay.moralNumerologicalTension,
        waveProximity: scaleUint(container.resonanceProfile.waveProximity),
        phaseAlignment: scaleUint(container.resonanceProfile.phaseAlignment),
        calibratedVortex: scaleUint(container.resonanceProfile.calibratedVortex),
        calibratedSync: scaleUint(container.resonanceProfile.calibratedSync),
        neuralProximity: scaleUint(container.resonanceProfile.neuralProximity),
        neuralVortex: scaleUint(container.resonanceProfile.neuralVortex),
        gematriaResonance: scaleUint(container.resonanceProfile.gematriaResonance),
        virtueAlignment: scaleUint(container.moralOverlay.virtueAlignment),
        moralSafety: scaleUint(container.moralOverlay.moralSafety),
        intentAlignment: scaleUint(container.moralOverlay.intentAlignment),
        source: container.source,
        containerHash: container.containerHash,
        hammerReason: container.hammerReason || '',
        proposalText: '',
      },
    ]
    const txHash = await withWriteLock(async () => {
      const mintNonce = await publicClient.getTransactionCount({ address: account.address, blockTag: 'pending' })
      return walletClient.writeContract({
        address: VORTEX_TOKEN_ADDRESS,
        abi,
        functionName: 'mint',
        nonce: mintNonce,
        args: mintArgs,
      })
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    let tokenId: string | null = null
    try {
      const tid = await publicClient.readContract({
        address: VORTEX_TOKEN_ADDRESS,
        abi,
        functionName: 'tokenByContainerId',
        args: [mintId],
      }) as bigint
      if (tid !== 0n) tokenId = tid.toString()
    } catch { /* token id is optional */ }
    return { txHash: receipt.transactionHash, tokenId }
  }

  async existingMint(containerId: string): Promise<string | null> {
    this.chainCalls += 1
    const publicClient = readClient()
    const abi = await loadAbi('token')
    const tid = await publicClient.readContract({
      address: VORTEX_TOKEN_ADDRESS,
      abi,
      functionName: 'tokenByContainerId',
      args: [onChainMintId(containerId)],
    }) as bigint
    if (tid === 0n) return null
    return tid.toString()
  }

  async listMintedContainerIds(): Promise<string[]> {
    this.chainCalls += 1
    const publicClient = readClient()
    const abi = await loadAbi('token')
    const supply = await publicClient.readContract({
      address: VORTEX_TOKEN_ADDRESS,
      abi,
      functionName: 'totalSupply',
    }) as bigint
    const records: ChainMintRecord[] = []
    for (let i = 0n; i < supply; i++) {
      const tokenId = await publicClient.readContract({
        address: VORTEX_TOKEN_ADDRESS,
        abi,
        functionName: 'tokenByIndex',
        args: [i],
      }) as bigint
      const data = await publicClient.readContract({
        address: VORTEX_TOKEN_ADDRESS,
        abi,
        functionName: 'getContainerData',
        args: [tokenId],
      })
      const containerId = readBytes32Field(data, 'containerId', 0)
      const containerHash = readBytes32Field(data, 'containerHash', 18)
      const tokenByKey: Record<string, string | null> = {}
      for (const key of [containerId, containerHash]) {
        if (!isMintKey(key)) continue
        const lower = key.toLowerCase()
        if (lower in tokenByKey) continue
        const tid = await publicClient.readContract({
          address: VORTEX_TOKEN_ADDRESS,
          abi,
          functionName: 'tokenByContainerId',
          args: [key as `0x${string}`],
        }) as bigint
        tokenByKey[lower] = tid === 0n ? null : tid.toString()
      }
      records.push({ containerId, containerHash, tokenByKey })
    }
    return mintedIdsFromChainRecords(records)
  }

  async autoMint(mintId: string, container: ContainerVortex, proposalText: string): Promise<{ txHash: string }> {
    const { walletClient, publicClient } = this.wallet()
    this.chainCalls += 1
    const abi = await loadAbi('token')
    const truncated = proposalText.slice(0, 140)
    const s = (value: number) => BigInt(Math.round(value * 1e18))
    const id = onChainMintId(mintId)
    const txHash = await walletClient.writeContract({
      address: VORTEX_TOKEN_ADDRESS,
      abi,
      functionName: 'mint',
      args: [
        VORTEX_TREASURY,
        id,
        {
          containerId: id,
          timestamp: BigInt(Math.floor(container.timestamp)),
          verdict: container.resonanceProfile.verdict,
          fullBox7DComposite: s(container.resonanceProfile.fullBox7DComposite),
          trinitariumMoralScore: s(container.moralOverlay.trinitariumMoralScore),
          trinitariumGematriaFusion: s(container.moralOverlay.trinitariumGematriaFusion),
          moralTension: container.moralOverlay.moralNumerologicalTension,
          waveProximity: s(container.resonanceProfile.waveProximity),
          phaseAlignment: s(container.resonanceProfile.phaseAlignment),
          calibratedVortex: s(container.resonanceProfile.calibratedVortex),
          calibratedSync: s(container.resonanceProfile.calibratedSync),
          neuralProximity: s(container.resonanceProfile.neuralProximity),
          neuralVortex: s(container.resonanceProfile.neuralVortex),
          gematriaResonance: s(container.resonanceProfile.gematriaResonance),
          virtueAlignment: s(container.moralOverlay.virtueAlignment),
          moralSafety: s(container.moralOverlay.moralSafety),
          intentAlignment: s(container.moralOverlay.intentAlignment),
          source: container.source,
          containerHash: container.containerHash,
          hammerReason: container.hammerReason || '',
          proposalText: truncated,
        },
      ],
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    try {
      const tid = await publicClient.readContract({
        address: VORTEX_TOKEN_ADDRESS,
        abi,
        functionName: 'tokenByContainerId',
        args: [id],
      }) as bigint
      if (tid !== 0n) {
        const client = await getRedisClient()
        if (client) await client.hset('dynamo:vortex:mint', id.toLowerCase(), tid.toString())
      }
    } catch { /* Redis optional */ }
    return { txHash: receipt.transactionHash }
  }
}

let current: ChainExecutor | null = null

export function getChainExecutor(): ChainExecutor {
  if (!current) current = new LiveChainExecutor()
  return current
}

/** Test seam. Production requests use LiveChainExecutor, which reads the deployer key only inside write methods. */
export function setChainExecutorForTests(next: ChainExecutor | null): void {
  current = next
}
