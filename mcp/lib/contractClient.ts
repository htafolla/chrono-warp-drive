import { http, createWalletClient, createPublicClient, defineChain, fallback, nonceManager, encodeFunctionData, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { ContainerVortex } from './temporalContainer.js'
import { containerToContractParams } from './temporalContainer.js'
import { readContractView, writeContractTx } from './looseContract.js'

const RPC_URLS = [
  'https://mainnet.base.org',
  'https://base-rpc.publicnode.com',
  process.env.BASE_RPC_URL,
].filter((u): u is string => !!u)

const UNIQUE_RPC_URLS = [...new Set(RPC_URLS)]

export function buildFallbackTransport() {
  return fallback(
    UNIQUE_RPC_URLS.map(url => http(url, { timeout: 5000 })),
    { rank: false }
  )
}

export function buildReadTransport() {
  return fallback(
    UNIQUE_RPC_URLS.map(url => http(url, { timeout: 5000 })),
    { rank: false }
  )
}

export const baseMainnet = defineChain({
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: UNIQUE_RPC_URLS } },
})

export const CONTRACT_ADDRESS = '0xCB418F081D4fDAD6B2b17027294865B26cb26855'

export function getPrivateKey(): `0x${string}` {
  const pk = process.env.DEPLOYER_PRIVATE_KEY
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not set')
  return (pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`
}

let cachedClients: { walletClient: ReturnType<typeof createWalletClient>; publicClient: ReturnType<typeof createPublicClient>; account: ReturnType<typeof privateKeyToAccount> } | null = null

function getContractClient() {
  if (cachedClients) return cachedClients
  const account = privateKeyToAccount(getPrivateKey(), { nonceManager })

  const walletClient = createWalletClient({
    account,
    chain: baseMainnet,
    transport: buildFallbackTransport(),
  })

  const publicClient = createPublicClient({
    chain: baseMainnet,
    transport: buildReadTransport(),
  })

  cachedClients = { walletClient, publicClient, account }
  return cachedClients
}

/** Base L1 GasPriceOracle. getL1Fee quotes the L1 data fee for calldata. */
const BASE_L1_BLOCK_ORACLE = '0x420000000000000000000000000000000000000F' as const

const l1FeeAbi = [{
  type: 'function',
  name: 'getL1Fee',
  stateMutability: 'view',
  inputs: [{ name: '_data', type: 'bytes' }],
  outputs: [{ type: 'uint256' }],
}] as const

/**
 * Execution fee is estimated gasLimit × maxFeePerGas.
 * The L1 data fee is quoted, then included again as headroom for a Base L1 price move.
 */
export function persistGasWei(gasLimit: bigint, maxFeePerGas: bigint, l1DataFee: bigint): bigint {
  return gasLimit * maxFeePerGas + l1DataFee * 2n
}

type GasCheck = (container: ContainerVortex) => Promise<boolean>
let gasCheckForTests: GasCheck | null = null

export function setDeployerGasCheckForTests(check: GasCheck | null): void {
  gasCheckForTests = check
}

async function loadRegistryAbi(): Promise<any[]> {
  return (await import('./abi/TemporalContainerRegistry.json', { with: { type: 'json' } })).default as any[]
}

function storeContainerArgs(container: ContainerVortex): readonly unknown[] {
  const params = containerToContractParams(container)
  return [
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
    params.hammerReason,
    params.containerHash as `0x${string}`,
    params.source,
  ]
}

function encodeStoreData(abi: readonly unknown[], args: readonly unknown[]): Hex {
  const encode = encodeFunctionData as unknown as (req: {
    abi: readonly unknown[]
    functionName: string
    args: readonly unknown[]
  }) => Hex
  return encode({ abi, functionName: 'storeContainer', args })
}

function estimateStoreGas(client: object, account: `0x${string}`, abi: readonly unknown[], args: readonly unknown[]): Promise<bigint> {
  const estimate = (client as { estimateContractGas: (req: never) => Promise<bigint> }).estimateContractGas
  return estimate({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'storeContainer',
    args,
    account,
  } as never)
}

/**
 * True when the signer can pay estimated gasLimit × maxFeePerGas plus L1 data-fee headroom.
 * A test hook skips the RPC quote. A quote failure is not enough balance: the caller must not settle.
 */
export async function deployerCanPayStoreGas(container: ContainerVortex): Promise<boolean> {
  if (gasCheckForTests) return gasCheckForTests(container)
  try {
    const { publicClient, account } = getContractClient()
    const abi = await loadRegistryAbi()
    const args = storeContainerArgs(container)
    const data = encodeStoreData(abi, args)
    const gasLimit = await estimateStoreGas(publicClient, account.address, abi, args)
    const fees = await (publicClient as { estimateFeesPerGas: () => Promise<{ maxFeePerGas?: bigint }> }).estimateFeesPerGas()
    if (fees.maxFeePerGas === undefined) return false
    const l1 = await readContractView(publicClient, {
      address: BASE_L1_BLOCK_ORACLE,
      abi: l1FeeAbi,
      functionName: 'getL1Fee',
      args: [data],
    })
    if (typeof l1 !== 'bigint') return false
    const balance = await publicClient.getBalance({ address: account.address })
    return balance >= persistGasWei(gasLimit, fees.maxFeePerGas, l1)
  } catch {
    return false
  }
}

export async function persistContainerToChain(container: ContainerVortex): Promise<{ txHash: string }> {
  const abi = await loadRegistryAbi()
  const args = storeContainerArgs(container)
  const { walletClient, publicClient } = getContractClient()
  if (!(await deployerCanPayStoreGas(container))) {
    throw new Error('deployer gas balance too low')
  }

  const txHash = await writeContractTx(walletClient, {
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'storeContainer',
    args,
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
  return { txHash: receipt.transactionHash }
}
