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
/** Shorter than viem's 180s default so a 240s drain lock outlives one mint receipt. */
export const MINT_RECEIPT_TIMEOUT_MS = 120_000

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
  }): Promise<{ txHash: string; tokenId: string | null; receiptStatus: MintReceiptStatus }>
  /**
   * Token id when either historical key already has a mint: containerId (route)
   * and containerHash (old auto-mint). Does not read the deployer key.
   */
  existingMint(containerId: string, containerHash: string): Promise<string | null>
  autoMint(mintId: string, container: ContainerVortex, proposalText: string): Promise<{ txHash: string; receiptStatus: MintReceiptStatus }>
}

export type MintReceiptStatus = 'success' | 'reverted' | 'pending'

/** Viem's wait throws this when the receipt does not arrive before MINT_RECEIPT_TIMEOUT_MS. */
export function isReceiptTimeout(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const named = err as { name?: unknown; message?: unknown }
  if (named.name === 'WaitForTransactionReceiptTimeoutError') return true
  return typeof named.message === 'string' && named.message.includes('Timed out while waiting for transaction')
}

type SettledMintReceipt =
  | { status: 'success' | 'reverted'; txHash: `0x${string}` }
  | { status: 'pending'; txHash: `0x${string}` }

/**
 * A timeout means the transaction is in flight. Return that hash as pending
 * instead of throwing, so callers mark it and do not submit a second mint.
 */
async function settleMintReceipt(
  publicClient: {
    waitForTransactionReceipt: (args: { hash: `0x${string}`; timeout: number }) => Promise<{ status: string; transactionHash: `0x${string}` }>
  },
  txHash: `0x${string}`,
): Promise<SettledMintReceipt> {
  try {
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: MINT_RECEIPT_TIMEOUT_MS })
    if (receipt.status !== 'success') return { status: 'reverted', txHash: receipt.transactionHash }
    return { status: 'success', txHash: receipt.transactionHash }
  } catch (err) {
    if (isReceiptTimeout(err)) return { status: 'pending', txHash }
    throw err
  }
}

/** The single bytes32 both mint paths pass to VortexToken.mint. */
export function onChainMintId(containerId: string): `0x${string}` {
  return containerId as `0x${string}`
}

const ZERO_MINT_KEY = '0x' + '00'.repeat(32)

function errorText(err: unknown): string {
  if (err instanceof Error) {
    const extra = err as Error & { shortMessage?: string; details?: string }
    return [extra.shortMessage, extra.details, extra.message].filter((part) => typeof part === 'string' && part.length > 0).join(' ')
  }
  return String(err)
}

/**
 * Fails closed: only the exact revert "No token for this container" means the key has no token.
 * Any other error, including a changed revert string, fails the read.
 */
function isNoTokenRevert(err: unknown): boolean {
  return errorText(err).includes('No token for this container')
}

/** A real registry miss. Any other failure, including an RPC error, must not look like "not found". */
function isContainerNotFound(err: unknown): boolean {
  return errorText(err).includes('ContainerNotFound')
}

function isMintKey(value: string | undefined): value is string {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value) && value.toLowerCase() !== ZERO_MINT_KEY
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

type ChainReader = { readContract: (args: never) => Promise<unknown> }
type ChainWriter = { writeContract: (args: never) => Promise<`0x${string}`> }

function readOnChain(client: ChainReader, args: {
  address: `0x${string}`
  abi: Abi
  functionName: string
  args: readonly unknown[]
}): Promise<unknown> {
  return client.readContract(args as never)
}

function writeOnChain(client: ChainWriter, args: {
  address: `0x${string}`
  abi: Abi
  functionName: string
  nonce: number
  args: readonly unknown[]
}): Promise<`0x${string}`> {
  return client.writeContract(args as never)
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
      const container = await readOnChain(publicClient, {
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
    } catch (err) {
      if (isContainerNotFound(err)) return null
      throw err
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
      return writeOnChain(walletClient, {
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
  }): Promise<{ txHash: string; tokenId: string | null; receiptStatus: MintReceiptStatus }> {
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
      return writeOnChain(walletClient, {
        address: VORTEX_TOKEN_ADDRESS,
        abi,
        functionName: 'mint',
        nonce: mintNonce,
        args: mintArgs,
      })
    })
    const settled = await settleMintReceipt(publicClient, txHash)
    if (settled.status === 'pending') {
      return { txHash: settled.txHash, tokenId: null, receiptStatus: 'pending' }
    }
    if (settled.status !== 'success') {
      return { txHash: settled.txHash, tokenId: null, receiptStatus: 'reverted' }
    }
    let tokenId: string | null = null
    try {
      const tid = await readOnChain(publicClient, {
        address: VORTEX_TOKEN_ADDRESS,
        abi,
        functionName: 'tokenByContainerId',
        args: [mintId],
      }) as bigint
      if (tid !== 0n) tokenId = tid.toString()
    } catch { /* token id is read again by the route */ }
    return { txHash: settled.txHash, tokenId, receiptStatus: 'success' }
  }

  async existingMint(containerId: string, containerHash: string): Promise<string | null> {
    const publicClient = readClient()
    const abi = await loadAbi('token')
    const seen = new Set<string>()
    for (const key of [containerId, containerHash]) {
      if (!isMintKey(key)) continue
      const lower = key.toLowerCase()
      if (seen.has(lower)) continue
      seen.add(lower)
      this.chainCalls += 1
      let tid = 0n
      try {
        tid = await readOnChain(publicClient, {
          address: VORTEX_TOKEN_ADDRESS,
          abi,
          functionName: 'tokenByContainerId',
          args: [onChainMintId(key)],
        }) as bigint
      } catch (err) {
        // Fails closed: only the exact revert "No token for this container" means this key has no token.
        // Any other error, including a changed revert string, fails the check so a second mint is not attempted.
        if (!isNoTokenRevert(err)) throw err
      }
      if (tid !== 0n) return tid.toString()
    }
    return null
  }

  async autoMint(mintId: string, container: ContainerVortex, proposalText: string): Promise<{ txHash: string; receiptStatus: MintReceiptStatus }> {
    if (!proposalText.trim()) throw new Error('empty proposal text')
    const { walletClient, publicClient, account } = this.wallet()
    this.chainCalls += 1
    const abi = await loadAbi('token')
    const truncated = proposalText.slice(0, 140)
    const s = (value: number) => BigInt(Math.round(value * 1e18))
    const id = onChainMintId(mintId)
    const mintArgs = [
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
    ]
    const txHash = await withWriteLock(async () => {
      const mintNonce = await publicClient.getTransactionCount({ address: account.address, blockTag: 'pending' })
      return writeOnChain(walletClient, {
        address: VORTEX_TOKEN_ADDRESS,
        abi,
        functionName: 'mint',
        nonce: mintNonce,
        args: mintArgs,
      })
    })
    const settled = await settleMintReceipt(publicClient, txHash)
    if (settled.status === 'pending') return { txHash: settled.txHash, receiptStatus: 'pending' }
    if (settled.status !== 'success') {
      return { txHash: settled.txHash, receiptStatus: 'reverted' }
    }
    try {
      const tid = await readOnChain(publicClient, {
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
    return { txHash: settled.txHash, receiptStatus: 'success' }
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
