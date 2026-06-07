import { http, createWalletClient, createPublicClient, defineChain, fallback } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { ContainerVortex } from './temporalContainer.js'
import { containerToContractParams } from './temporalContainer.js'

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
  return http(UNIQUE_RPC_URLS[0], { timeout: 10000 })
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

function getContractClient() {
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

  return { walletClient, publicClient, account }
}

export async function persistContainerToChain(container: ContainerVortex): Promise<{ txHash: string }> {
  const abi = (await import('./abi/TemporalContainerRegistry.json', { with: { type: 'json' } })).default as any[]
  const params = containerToContractParams(container)
  const { walletClient, publicClient } = getContractClient()

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'storeContainer',
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
      params.hammerReason,
      params.containerHash as `0x${string}`,
      params.source,
    ],
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
  return { txHash: receipt.transactionHash }
}
