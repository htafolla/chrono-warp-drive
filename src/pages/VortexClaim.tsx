import { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { WalletConnectButton } from '@/components/WalletConnectButton'
import { Link } from 'react-router-dom'

const VORTEX_TOKEN_ADDRESS = '0xDD84C180F5E54c79f66160583D9e85fBA7F933C5'
const MCP_URL = 'https://mcp-production-80e2.up.railway.app'
const VORTEX_ABI = [
  {
    inputs: [{ internalType: 'bytes32', name: 'containerId', type: 'bytes32' }],
    name: 'mintForDonation',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getContainerData',
    outputs: [
      { internalType: 'bytes32', name: 'containerId', type: 'bytes32' },
      { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
      { internalType: 'string', name: 'verdict', type: 'string' },
      { internalType: 'uint256', name: 'fullBox7DComposite', type: 'uint256' },
      { internalType: 'uint256', name: 'trinitariumMoralScore', type: 'uint256' },
      { internalType: 'uint256', name: 'trinitariumGematriaFusion', type: 'uint256' },
      { internalType: 'string', name: 'moralTension', type: 'string' },
      { internalType: 'uint256', name: 'waveProximity', type: 'uint256' },
      { internalType: 'uint256', name: 'phaseAlignment', type: 'uint256' },
      { internalType: 'uint256', name: 'calibratedVortex', type: 'uint256' },
      { internalType: 'uint256', name: 'calibratedSync', type: 'uint256' },
      { internalType: 'uint256', name: 'neuralProximity', type: 'uint256' },
      { internalType: 'uint256', name: 'neuralVortex', type: 'uint256' },
      { internalType: 'uint256', name: 'gematriaResonance', type: 'uint256' },
      { internalType: 'uint256', name: 'virtueAlignment', type: 'uint256' },
      { internalType: 'uint256', name: 'moralSafety', type: 'uint256' },
      { internalType: 'uint256', name: 'intentAlignment', type: 'uint256' },
      { internalType: 'string', name: 'source', type: 'string' },
      { internalType: 'bytes32', name: 'containerHash', type: 'bytes32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'containerId', type: 'bytes32' }],
    name: 'tokenByContainerId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

interface ContainerItem {
  containerId: string
  timestamp: number
  containerHash: string
  source: string
  proposalHash: string
  resonanceProfile: {
    fullBox7DComposite: number
    fullBox7DVerdict: string
    verdict: string
    waveProximity: number
    phaseAlignment: number
    calibratedVortex: number
    calibratedSync: number
    neuralProximity: number
    neuralVortex: number
    gematriaResonance: number
    structuralResonance: number
    confidence: number
  }
  moralOverlay: {
    trinitariumMoralScore: number
    virtueAlignment: number
    moralSafety: number
    intentAlignment: number
    trinitariumGematriaFusion: number
    moralNumerologicalTension: string
  }
  solarSnapshot: {
    timestamp: number
    activityLevel: string
    xrayFlux: number
    kpIndex: number
    solarTdf: number
  }
  hammerReason: string
}

function scaleDisplay(val: number) {
  if (val == null) return '—'
  return (val * 100).toFixed(0) + '%'
}

function scaleColor(val: number): string {
  if (val >= 0.78) return 'bg-emerald-500'
  if (val >= 0.50) return 'bg-amber-500'
  return 'bg-red-500'
}

function scaleTextColor(val: number): string {
  if (val >= 0.78) return 'text-emerald-400'
  if (val >= 0.50) return 'text-amber-400'
  return 'text-red-400'
}

function onChainPct(val: bigint | number): string {
  const n = Number(val)
  if (n === 0) return '0%'
  return (n / 1e16).toFixed(0) + '%'
}

function onChainColor(val: bigint | number): string {
  const n = Number(val) / 1e18
  if (n >= 0.78) return 'bg-emerald-500'
  if (n >= 0.50) return 'bg-amber-500'
  return 'bg-red-500'
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function verdictColor(verdict: string) {
  if (verdict === 'PASS') return 'text-emerald-400'
  if (verdict === 'NEEDS_REVISION') return 'text-yellow-400'
  return 'text-red-400'
}

function tensionColor(t: string) {
  if (t === 'Aligned') return 'text-emerald-400'
  if (t === 'Mild') return 'text-amber-400'
  if (t === 'Significant') return 'text-orange-400'
  return 'text-red-400'
}

export default function VortexClaim() {
  const { address, isConnected } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  console.log('[vortex] render wallet:', { address: address?.slice(0, 10), isConnected, hasWriteContract: !!writeContractAsync, hasPublicClient: !!publicClient })

  const [containers, setContainers] = useState<ContainerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [minting, setMinting] = useState<string | null>(null)
  const [mintResults, setMintResults] = useState<Record<string, string>>({})
  const [mintErrors, setMintErrors] = useState<Record<string, string>>({})
  const [donationAmounts, setDonationAmounts] = useState<Record<string, string>>({})
  const [tokenStatus, setTokenStatus] = useState<Record<string, { hasToken: boolean; tokenId: string | null }>>({})
  const [statusLoading, setStatusLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [onChainMetadata, setOnChainMetadata] = useState<Record<string, any>>({})
  const [stats, setStats] = useState<{ totalSupply: string; totalDonations: string } | null>(null)

  useEffect(() => {
    fetch(`${MCP_URL}/vortex/info`)
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadContainers()
  }, [])

  async function loadContainers() {
    setLoading(true)
    setStatusLoading(true)
    try {
      const res = await fetch(`${MCP_URL}/containers?limit=50`)
      const data = await res.json()
      console.log('[vortex] containers loaded:', data.containers?.length, 'total:', data.total)
      if (data.success) {
        const sorted = (data.containers as ContainerItem[]).sort((a, b) => b.timestamp - a.timestamp)
        setContainers(sorted)
        checkTokenStatus(sorted)
      }
    } catch (err) {
      console.error('[vortex] Failed to load containers', err)
    } finally {
      setLoading(false)
    }
  }

  async function checkTokenStatus(list: ContainerItem[]) {
    const status: Record<string, { hasToken: boolean; tokenId: string | null }> = {}
    await Promise.all(list.map(async (c) => {
      try {
        const res = await fetch(`${MCP_URL}/vortex/container/${c.containerId}`)
        const d = await res.json()
        console.log('[vortex] status for', c.containerId.slice(0, 18), ':', d.hasToken, d.tokenId)
        if (d.success) {
          status[c.containerId] = { hasToken: d.hasToken, tokenId: d.tokenId }
        }
      } catch (err) {
        console.warn('[vortex] status fetch failed for', c.containerId.slice(0, 18), err)
      }
    }))
    setTokenStatus(prev => ({ ...prev, ...status }))
    console.log('[vortex] all statuses:', Object.keys(status).length, 'total')
    setStatusLoading(false)
  }

  async function handleMint(containerId: string) {
    if (!isConnected || !writeContractAsync || !publicClient) {
      console.warn('[vortex] mint blocked: not connected', { isConnected, hasWriteContractAsync: !!writeContractAsync, hasPublic: !!publicClient })
      return
    }
    setMinting(containerId)
    console.log('[vortex] mint start:', containerId.slice(0, 18))

    try {
      const cid = containerId as `0x${string}`
      const amount = donationAmounts[containerId] || '0.001'
      const value = BigInt(Math.floor(parseFloat(amount) * 1e18))
      console.log('[vortex] mint sending:', { amount, value: value.toString(), containerId: cid.slice(0, 18) })

      const txHash = await writeContractAsync({
        address: VORTEX_TOKEN_ADDRESS,
        abi: VORTEX_ABI,
        functionName: 'mintForDonation',
        args: [cid],
        value,
      })
      console.log('[vortex] mint tx sent:', txHash)

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      console.log('[vortex] mint confirmed:', receipt.transactionHash)
      setMintResults(prev => ({ ...prev, [containerId]: receipt.transactionHash }))
      setMintErrors(prev => { const n = { ...prev }; delete n[containerId]; return n })
      setTokenStatus(prev => ({ ...prev, [containerId]: { hasToken: true, tokenId: '...' } }))
      setExpanded(containerId)

      console.log('[vortex] fetching on-chain data for', containerId.slice(0, 18))
      const cres = await fetch(`${MCP_URL}/vortex/container/${cid}`)
      const data = await cres.json()
      if (data.success) {
        setTokenStatus(prev => ({ ...prev, [containerId]: { hasToken: true, tokenId: data.tokenId } }))
        loadOnChainMetadata(data.tokenId, containerId)
      }
    } catch (err: any) {
      setMintErrors(prev => ({ ...prev, [containerId]: err.message?.slice(0, 150) || 'Failed' }))
    } finally {
      setMinting(null)
    }
  }

  async function loadOnChainMetadata(tokenId: string, containerId: string) {
    if (!publicClient) return
    try {
      const data = await publicClient.readContract({
        address: VORTEX_TOKEN_ADDRESS,
        abi: VORTEX_ABI,
        functionName: 'getContainerData',
        args: [BigInt(tokenId)],
      })
      setOnChainMetadata(prev => ({ ...prev, [containerId]: data }))
    } catch {}
  }

  function toggleExpand(containerId: string) {
    if (expanded === containerId) {
      setExpanded(null)
    } else {
      setExpanded(containerId)
      const status = tokenStatus[containerId]
      if (status?.hasToken && status.tokenId && status.tokenId !== '...' && !onChainMetadata[containerId]) {
        loadOnChainMetadata(status.tokenId, containerId)
      }
    }
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            &larr; Dynamo
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 hidden sm:inline">
              {stats ? `${stats.totalSupply} minted · ${stats.totalDonations === '0' ? '0' : (BigInt(stats.totalDonations || '0') / 10n ** 17n).toString() + '%20'} ETH` : 'Vortex'}
            </span>
            <WalletConnectButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-12 pb-24">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-emerald-400 mb-2">Dynamo Vortex</h1>
          <p className="text-zinc-400 text-sm">
            Temporal containers — click one to view details and claim its VortexToken
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-zinc-500 text-sm">Loading containers...</div>
        ) : containers.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 text-sm">No containers yet.</div>
        ) : (
          <div className="space-y-2">
            {containers.map((c) => {
              const status = tokenStatus[c.containerId]
              const isMinting = minting === c.containerId
              const mintResult = mintResults[c.containerId]
              const mintError = mintErrors[c.containerId]
              const donationAmt = donationAmounts[c.containerId] || '0.001'
              const isOpen = expanded === c.containerId
              const onChain = onChainMetadata[c.containerId]
              const showMint = !status?.hasToken && !statusLoading && isConnected
              if (showMint) console.log('[vortex] show mint btn for', c.containerId.slice(0, 18))

              return (
                <div key={c.containerId} className="rounded-xl bg-zinc-900/50 border border-zinc-800/60 overflow-hidden">
                  {/* Summary row — clickable */}
                  <div
                    onClick={() => toggleExpand(c.containerId)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-zinc-400 font-medium">{formatDate(c.timestamp)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${verdictColor(c.resonanceProfile.verdict)} bg-opacity-20`}>
                          {c.resonanceProfile.verdict}
                        </span>
                        {status?.hasToken && (
                          <span className="text-xs text-emerald-500">Token #{status.tokenId}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1.5">
                          <span className="w-8 h-1.5 rounded-full bg-zinc-700 overflow-hidden inline-block">
                            <span className={`h-full rounded-full block ${scaleColor(c.resonanceProfile.fullBox7DComposite)}`}
                              style={{ width: scaleDisplay(c.resonanceProfile.fullBox7DComposite) }} />
                          </span>
                          <span className={scaleTextColor(c.resonanceProfile.fullBox7DComposite)}>
                            {scaleDisplay(c.resonanceProfile.fullBox7DComposite)}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-8 h-1.5 rounded-full bg-zinc-700 overflow-hidden inline-block">
                            <span className={`h-full rounded-full block ${scaleColor(c.moralOverlay.trinitariumMoralScore)}`}
                              style={{ width: scaleDisplay(c.moralOverlay.trinitariumMoralScore) }} />
                          </span>
                          <span className={scaleTextColor(c.moralOverlay.trinitariumMoralScore)}>
                            {scaleDisplay(c.moralOverlay.trinitariumMoralScore)}
                          </span>
                        </span>
                        <span className={tensionColor(c.moralOverlay.moralNumerologicalTension)}>
                          {c.moralOverlay.moralNumerologicalTension}
                        </span>
                      </div>
                    </div>
                      <div className="flex items-center gap-2 shrink-0">
                      {mintResult && (
                        <a href={`https://basescan.org/tx/${mintResult}`} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/30 transition-colors no-underline">
                          ✓ Minted
                        </a>
                      )}
                      {!status?.hasToken && !statusLoading && isConnected && (
                        <div onClick={e => e.stopPropagation()} className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={donationAmt}
                            onChange={e => setDonationAmounts(prev => ({ ...prev, [c.containerId]: e.target.value }))}
                            step="0.001"
                            min="0"
                            className="w-16 px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                            placeholder="ETH"
                          />
                          <button
                            onClick={() => handleMint(c.containerId)}
                            disabled={isMinting}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white transition-colors"
                          >
                            {isMinting ? '...' : 'Mint'}
                          </button>
                        </div>
                      )}
                      <span className="text-zinc-600 text-xs">{isOpen ? '▾' : '▸'}</span>
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {isOpen && (
                    <div className="border-t border-zinc-800/60 px-4 py-4 space-y-4 bg-zinc-900/30">
                      {/* Container info */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Container ID</div>
                          <div className="text-xs font-mono text-zinc-300 break-all">{c.containerId}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Hash</div>
                          <div className="text-xs font-mono text-zinc-300 break-all">{c.containerHash}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Source</div>
                          <div className="text-xs text-zinc-300">{c.source}</div>
                        </div>
                      </div>

                      {/* 7D Resonance Profile */}
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">7D Resonance Profile</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <Metric label="Composite" value={scaleDisplay(c.resonanceProfile.fullBox7DComposite)} bar cls={scaleColor(c.resonanceProfile.fullBox7DComposite)} />
                          <Metric label="Wave Prox" value={scaleDisplay(c.resonanceProfile.waveProximity)} bar cls={scaleColor(c.resonanceProfile.waveProximity)} />
                          <Metric label="Phase Align" value={scaleDisplay(c.resonanceProfile.phaseAlignment)} bar cls={scaleColor(c.resonanceProfile.phaseAlignment)} />
                          <Metric label="Cal Vortex" value={scaleDisplay(c.resonanceProfile.calibratedVortex)} bar cls={scaleColor(c.resonanceProfile.calibratedVortex)} />
                          <Metric label="Cal Sync" value={scaleDisplay(c.resonanceProfile.calibratedSync)} bar cls={scaleColor(c.resonanceProfile.calibratedSync)} />
                          <Metric label="Neural Prox" value={scaleDisplay(c.resonanceProfile.neuralProximity)} bar cls={scaleColor(c.resonanceProfile.neuralProximity)} />
                          <Metric label="Neural Vortex" value={scaleDisplay(c.resonanceProfile.neuralVortex)} bar cls={scaleColor(c.resonanceProfile.neuralVortex)} />
                          <Metric label="Gematria" value={scaleDisplay(c.resonanceProfile.gematriaResonance)} bar cls={scaleColor(c.resonanceProfile.gematriaResonance)} />
                        </div>
                      </div>

                      {/* TMO */}
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Trinitarium Moral Overlay</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <Metric label="TMO Score" value={scaleDisplay(c.moralOverlay.trinitariumMoralScore)} bar cls={scaleColor(c.moralOverlay.trinitariumMoralScore)} />
                          <Metric label="Virtue" value={scaleDisplay(c.moralOverlay.virtueAlignment)} bar cls={scaleColor(c.moralOverlay.virtueAlignment)} />
                          <Metric label="Safety" value={scaleDisplay(c.moralOverlay.moralSafety)} bar cls={scaleColor(c.moralOverlay.moralSafety)} />
                          <Metric label="Intent" value={scaleDisplay(c.moralOverlay.intentAlignment)} bar cls={scaleColor(c.moralOverlay.intentAlignment)} />
                          <Metric label="Fusion" value={scaleDisplay(c.moralOverlay.trinitariumGematriaFusion)} bar cls={scaleColor(c.moralOverlay.trinitariumGematriaFusion)} />
                          <Metric label="Tension" value={c.moralOverlay.moralNumerologicalTension} cls={tensionColor(c.moralOverlay.moralNumerologicalTension)} />
                        </div>
                      </div>

                      {/* Solar context */}
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Solar Context</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <Metric label="Activity" value={c.solarSnapshot.activityLevel} plain />
                          <Metric label="Kp Index" value={c.solarSnapshot.kpIndex.toString()} plain />
                          <Metric label="TDF" value={c.solarSnapshot.solarTdf.toString()} plain />
                        </div>
                      </div>

                      {/* Hammer reason */}
                      {c.hammerReason && (
                        <div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Hammer Reason</div>
                          <div className="text-xs text-zinc-300 italic">{c.hammerReason}</div>
                        </div>
                      )}

                      {/* On-chain metadata */}
                      {status?.hasToken && status.tokenId && (
                        <div className="pt-2 border-t border-zinc-800/40">
                          <div className="text-[10px] text-emerald-500 uppercase tracking-wide mb-2">On-Chain Token</div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-zinc-400">Token ID:</span>
                            <span className="text-zinc-200 font-mono">#{status.tokenId}</span>
                            <a
                              href={`https://basescan.org/token/${VORTEX_TOKEN_ADDRESS}?a=${status.tokenId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-500 hover:text-emerald-400 underline"
                            >
                              Basescan
                            </a>
                          </div>

                          {onChain ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                              <Metric label="7D Composite" value={onChainPct(onChain[3] as bigint)} bar cls={onChainColor(onChain[3] as bigint)} />
                              <Metric label="TMO Score" value={onChainPct(onChain[4] as bigint)} bar cls={onChainColor(onChain[4] as bigint)} />
                              <Metric label="Verdict" value={onChain[2] as string} cls={verdictColor(onChain[2] as string)} />
                              <Metric label="Tension" value={onChain[6] as string} cls={tensionColor(onChain[6] as string)} />
                              <Metric label="Virtue" value={onChainPct(onChain[10] as bigint)} bar cls={onChainColor(onChain[10] as bigint)} />
                              <Metric label="Safety" value={onChainPct(onChain[11] as bigint)} bar cls={onChainColor(onChain[11] as bigint)} />
                            </div>
                          ) : (
                            <div className="text-xs text-zinc-600 mt-1">Loading on-chain data...</div>
                          )}
                        </div>
                      )}

                      {/* Mint result */}
                      {mintResult && (
                        <div className="text-xs text-emerald-500">
                          Token minted!{' '}
                          <a href={`https://basescan.org/tx/${mintResult}`} target="_blank" rel="noopener noreferrer" className="underline">View transaction</a>
                        </div>
                      )}
                      {mintError && (
                        <div className="text-xs text-red-400">{mintError}</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!isConnected && containers.length > 0 && !statusLoading && (
          <div className="mt-8 text-center">
            <p className="text-zinc-500 text-sm mb-3">Connect your wallet to mint VortexTokens</p>
            <WalletConnectButton />
          </div>
        )}
      </main>
    </div>
  )
}

function Metric({ label, value, cls, bar }: { label: string; value: string; cls?: string; bar?: boolean }) {
  return (
    <div className="bg-zinc-800/30 rounded-lg px-3 py-2">
      <div className="text-[10px] text-zinc-500 mb-0.5">{label}</div>
      {bar ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
            <div className={`h-full rounded-full ${cls || 'bg-zinc-500'}`}
              style={{ width: value }}
            />
          </div>
          <span className={`text-xs font-mono shrink-0 ${scaleTextColor(parseFloat(value) / 100) || 'text-zinc-200'}`}>
            {value}
          </span>
        </div>
      ) : (
        <div className={`text-sm font-mono ${cls || 'text-zinc-200'}`}>{value}</div>
      )}
    </div>
  )
}
