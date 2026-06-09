import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { WalletConnectButton } from '@/components/WalletConnectButton'
import { Link } from 'react-router-dom'
import { fetchEthPrice } from '@/services/coingeckoApi'
import { RarityLegend } from '@/components/vortex/RarityLegend'
import { VortexCardGrid } from '@/components/vortex/VortexCardGrid'


const VORTEX_TOKEN_ADDRESS = '0x7E410f102Cc7320fd8B9601637f5A67AfDF40cF9'
const MCP_URL = 'https://mcp-production-80e2.up.railway.app'
const VORTEX_ABI = [
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
      { internalType: 'string', name: 'hammerReason', type: 'string' },
      { internalType: 'string', name: 'proposalText', type: 'string' },
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
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export interface ContainerItem {
  containerId: string
  timestamp: number
  containerHash: string
  source: string
  proposalHash: string
  proposalText?: string
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
  vortexMessage?: string
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

const TIERS = [
  { label: 'Celestial', min: 0.95, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/20', border: 'border-fuchsia-500/30', glow: 'shadow-fuchsia-500/20' },
  { label: 'Resonant', min: 0.78, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', glow: '' },
  { label: 'Unstable', min: 0.50, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', glow: '' },
  { label: 'Dissonant', min: 0, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', glow: '' },
]

function rarityTier(val: number) {
  return TIERS.find(t => val >= t.min) || TIERS[TIERS.length - 1]
}

function sourceChip(src: string) {
  const colors: Record<string, string> = {
    human: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    agent: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    ambient: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    system: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
  }
  const cls = colors[src] || colors.system
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${cls}`}>{src}</span>
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
  const [myTokens, setMyTokens] = useState<{ tokenId: string; containerData: any }[]>([])
  const [myTokensLoading, setMyTokensLoading] = useState(false)
  const [ethBalance, setEthBalance] = useState<bigint | null>(null)
  const [filterMode, setFilterMode] = useState<'all' | 'claimed' | 'unclaimed'>('all')
  const [sortAsc, setSortAsc] = useState(false)

  const { data: ethPrice } = useQuery({
    queryKey: ['ethPrice'],
    queryFn: fetchEthPrice,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })

  useEffect(() => {
    fetch(`${MCP_URL}/vortex/info`)
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadContainers()
  }, [])

  useEffect(() => {
    if (!isConnected || !address || !publicClient) {
      setMyTokens([])
      setEthBalance(null)
      return
    }
    publicClient.getBalance({ address }).then(b => setEthBalance(b)).catch(() => {})
    loadMyTokens()
  }, [address, isConnected])

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

  async function loadMyTokens() {
    if (!publicClient || !address) return
    setMyTokensLoading(true)
    try {
      const balance = await publicClient.readContract({
        address: VORTEX_TOKEN_ADDRESS,
        abi: VORTEX_ABI,
        functionName: 'balanceOf',
        args: [address],
      })
      const tokens: { tokenId: string; containerData: any }[] = []
      for (let i = 0; i < Number(balance); i++) {
        const tid = await publicClient.readContract({
          address: VORTEX_TOKEN_ADDRESS,
          abi: VORTEX_ABI,
          functionName: 'tokenOfOwnerByIndex',
          args: [address, BigInt(i)],
        })
        const data = await publicClient.readContract({
          address: VORTEX_TOKEN_ADDRESS,
          abi: VORTEX_ABI,
          functionName: 'getContainerData',
          args: [tid],
        })
        tokens.push({ tokenId: tid.toString(), containerData: data })
      }
      setMyTokens(tokens)
    } catch (err) {
      console.warn('[vortex] failed to load my tokens', err)
    } finally {
      setMyTokensLoading(false)
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
    if (!isConnected || !address) {
      console.warn('[vortex] mint blocked: not connected')
      return
    }
    setMinting(containerId)
    console.log('[vortex] mint start:', containerId.slice(0, 18))

    try {
      const cid = containerId as `0x${string}`
      const res = await fetch(`${MCP_URL}/vortex/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId: cid, to: address }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Mint failed')

      setMintResults(prev => ({ ...prev, [containerId]: data.txHash }))
      setMintErrors(prev => { const n = { ...prev }; delete n[containerId]; return n })
      setTokenStatus(prev => ({ ...prev, [containerId]: { hasToken: true, tokenId: '...' } }))
      setExpanded(containerId)

      console.log('[vortex] fetching on-chain data for', containerId.slice(0, 18))
      const cres = await fetch(`${MCP_URL}/vortex/container/${cid}`)
      const d = await cres.json()
      if (d.success) {
        setTokenStatus(prev => ({ ...prev, [containerId]: { hasToken: true, tokenId: d.tokenId } }))
        loadOnChainMetadata(d.tokenId, containerId)
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

  function handleViewDetails(container: ContainerItem) {
    toggleExpand(container.containerId)
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

        {isConnected && myTokens.length > 0 && (
          <div className="mb-12">
            <h2 className="text-lg font-semibold text-emerald-400 mb-3">My Vortex</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {myTokens.map((t) => (
                <div key={t.tokenId} className="rounded-xl bg-zinc-900/50 border border-zinc-800/60 overflow-hidden">
                  <img
                    src={`${MCP_URL}/vortex/token-image/${t.tokenId}`}
                    alt={`Vortex #${t.tokenId}`}
                    className="w-full aspect-square"
                  />
                    <div className="p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-zinc-200">#{t.tokenId}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.containerData ? verdictColor(t.containerData.verdict as string) : ''}`}>
                          {t.containerData?.verdict as string || '...'}
                        </span>
                      </div>
                      {t.containerData && (
                        <div className={`text-[10px] px-1.5 py-0.5 rounded-full border text-center mb-1 ${rarityTier(Number(t.containerData.fullBox7DComposite as bigint) / 1e18).bg} ${rarityTier(Number(t.containerData.fullBox7DComposite as bigint) / 1e18).color} ${rarityTier(Number(t.containerData.fullBox7DComposite as bigint) / 1e18).border}`}>
                          {rarityTier(Number(t.containerData.fullBox7DComposite as bigint) / 1e18).label}
                        </div>
                      )}
                      <a
                      href={`https://basescan.org/token/${VORTEX_TOKEN_ADDRESS}?a=${t.tokenId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-zinc-500 hover:text-emerald-400 underline"
                    >
                      Basescan ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-zinc-500 text-sm">Loading containers...</div>
        ) : containers.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 text-sm">No containers yet.</div>
        ) : (
          <>
            <RarityLegend />
            <VortexCardGrid
              containers={containers}
              tokenStatus={tokenStatus}
              minting={minting}
              mintErrors={mintErrors}
              onClaim={handleMint}
              onViewDetails={handleViewDetails}
              filterMode={filterMode}
              sortAsc={sortAsc}
              onFilterChange={setFilterMode}
              onSortToggle={() => setSortAsc(s => !s)}
            />
          </>
        )}

        {expanded && containers.find(c => c.containerId === expanded) && (() => {
          const c = containers.find(c => c.containerId === expanded)!
          const status = tokenStatus[c.containerId]
          const mintResult = mintResults[c.containerId]
          const mintError = mintErrors[c.containerId]
          const onChain = onChainMetadata[c.containerId]

          return (
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-24 bg-black/60" onClick={() => setExpanded(null)}>
              <div className="max-w-2xl w-full mx-4 rounded-xl bg-zinc-900 border border-zinc-800 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur">
                  <span className="text-sm text-zinc-300 font-medium">{formatDate(c.timestamp)} — {c.resonanceProfile.verdict}</span>
                  <button onClick={() => setExpanded(null)} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none">&times;</button>
                </div>
                <div className="px-4 py-4 space-y-4">
                  {c.proposalText && (
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Proposal</div>
                      <div className="text-sm text-zinc-200 leading-relaxed">{c.proposalText}</div>
                    </div>
                  )}

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

                  <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/50 p-3 space-y-1.5">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Chain Status</div>
                    {(() => {
                      const comp = c.resonanceProfile.fullBox7DComposite
                      const tmo = c.moralOverlay.trinitariumMoralScore
                      const meetsT1 = comp >= 0.88 && tmo >= 0.55
                      const almostT1 = comp >= 0.82 && tmo >= 0.50
                      const tier = meetsT1 ? 't1' : comp >= 0.92 ? 't2' : 'none'
                      if (tier === 't1') {
                        return (
                          <div>
                            <div className="text-xs text-emerald-400 font-medium">Ready to save to chain ✦</div>
                            <p className="text-xs text-zinc-400 mt-1">Resonance and moral alignment both clear the threshold — this vortex auto-saves next time the field ticks.</p>
                          </div>
                        )
                      }
                      if (tier === 't2') {
                        return (
                          <div>
                            <div className="text-xs text-fuchsia-400 font-medium">Exceptional — auto-saves ✦</div>
                            <p className="text-xs text-zinc-400 mt-1">Resonance is so high it bypasses the moral gate entirely.</p>
                          </div>
                        )
                      }
                      if (comp >= 0.88 && tmo < 0.55) {
                        const gap = ((0.55 - tmo) * 100).toFixed(0)
                        return (
                          <div>
                            <div className="text-xs text-amber-400 font-medium">Almost there</div>
                            <p className="text-xs text-zinc-400 mt-1">Resonance is high enough, but moral alignment needs to rise <span className="text-amber-400">{gap}%</span> to reach the threshold.</p>
                          </div>
                        )
                      }
                      if (tmo >= 0.55 && comp < 0.88) {
                        const gap = ((0.88 - comp) * 100).toFixed(0)
                        return (
                          <div>
                            <div className="text-xs text-amber-400 font-medium">Almost there</div>
                            <p className="text-xs text-zinc-400 mt-1">Moral alignment is strong, but resonance needs to climb <span className="text-amber-400">{gap}%</span> to reach the threshold.</p>
                          </div>
                        )
                      }
                      if (almostT1) {
                        const cGap = ((0.88 - comp) * 100).toFixed(0)
                        const tGap = ((0.55 - tmo) * 100).toFixed(0)
                        return (
                          <div>
                            <div className="text-xs text-zinc-400 font-medium">Needs improvement</div>
                            <p className="text-xs text-zinc-500 mt-1">Resonance needs +<span className="text-zinc-300">{cGap}%</span> and moral alignment needs +<span className="text-zinc-300">{tGap}%</span> to qualify for auto-save.</p>
                          </div>
                        )
                      }
                      return (
                        <div>
                          <div className="text-xs text-zinc-500 font-medium">Below thresholds</div>
                          <p className="text-xs text-zinc-600 mt-1">This vortex needs stronger resonance and moral alignment to qualify for chain storage.</p>
                        </div>
                      )
                    })()}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-zinc-500">Resonance</span>
                          <span className="text-[10px] text-zinc-400">{scaleDisplay(c.resonanceProfile.fullBox7DComposite)}</span>
                          <span className="text-[10px] text-zinc-600">/ 0.88</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-zinc-500">Moral</span>
                          <span className="text-[10px] text-zinc-400">{scaleDisplay(c.moralOverlay.trinitariumMoralScore)}</span>
                          <span className="text-[10px] text-zinc-600">/ 0.55</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">7D Resonance Profile</div>
                    <div className="mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${rarityTier(c.resonanceProfile.fullBox7DComposite).bg} ${rarityTier(c.resonanceProfile.fullBox7DComposite).color} ${rarityTier(c.resonanceProfile.fullBox7DComposite).border}`}>
                        {rarityTier(c.resonanceProfile.fullBox7DComposite).label}
                      </span>
                    </div>
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

                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Solar Context</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Metric label="Activity" value={c.solarSnapshot.activityLevel} plain />
                      <Metric label="Kp Index" value={c.solarSnapshot.kpIndex.toString()} plain />
                      <Metric label="TDF" value={c.solarSnapshot.solarTdf.toString()} plain />
                    </div>
                  </div>

                  {(c.vortexMessage || c.hammerReason) && (
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Vortex Message</div>
                      <div className="text-sm text-zinc-300 italic">{c.vortexMessage || c.hammerReason}</div>
                    </div>
                  )}

                  {/* Mint action for unclaimed */}
                  {!status?.hasToken && (
                    <div className="border-t border-zinc-800/40 pt-4">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-3">Mint VortexToken</div>
                      {isConnected ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              value={donationAmounts[c.containerId] || '0.001'}
                              onChange={e => setDonationAmounts(prev => ({ ...prev, [c.containerId]: e.target.value }))}
                              step="0.001"
                              min="0"
                              className="w-20 px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                              placeholder="ETH"
                            />
                            {ethPrice && (
                              <span className="text-[11px] text-zinc-500">
                                ~${(parseFloat(donationAmounts[c.containerId] || '0.001') * ethPrice).toFixed(2)}
                              </span>
                            )}
                            <span className="text-[11px] text-zinc-600">
                              Balance: {ethBalance !== null ? `${(Number(ethBalance) / 1e18).toFixed(4)} ETH` : '...'}
                            </span>
                          </div>
                          {(() => {
                            const mintAmt = parseFloat(donationAmounts[c.containerId] || '0.001')
                            const mintVal = BigInt(Math.floor(mintAmt * 1e18))
                            const insufficient = ethBalance !== null && ethBalance < mintVal + BigInt(1e15)
                            const isMinting = minting === c.containerId
                            return (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleMint(c.containerId)}
                                  disabled={isMinting || insufficient}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors text-white ${
                                    insufficient
                                      ? 'bg-red-600/50 cursor-not-allowed'
                                      : 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500'
                                  }`}
                                >
                                  {isMinting ? 'Minting...' : insufficient ? 'Low Balance' : 'Mint'}
                                </button>
                                {insufficient && (
                                  <span className="text-[11px] text-red-400">Insufficient ETH for donation</span>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-500">
                          Connect your wallet to mint this container as a VortexToken
                        </div>
                      )}
                    </div>
                  )}

                  {status?.hasToken && status.tokenId && (
                    <div className="pt-2 border-t border-zinc-800/40">
                      <div className="flex items-start gap-4 mb-3">
                        <img
                          src={`${MCP_URL}/vortex/token-image/${status.tokenId}`}
                          alt={`Vortex #${status.tokenId}`}
                          className="w-24 h-24 rounded-lg border border-zinc-700/50 shrink-0"
                        />
                        <div className="min-w-0">
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
                        </div>
                      </div>

                      {onChain ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                          <Metric label="7D Composite" value={onChainPct(onChain.fullBox7DComposite as bigint)} bar cls={onChainColor(onChain.fullBox7DComposite as bigint)} />
                          <Metric label="TMO Score" value={onChainPct(onChain.trinitariumMoralScore as bigint)} bar cls={onChainColor(onChain.trinitariumMoralScore as bigint)} />
                          <Metric label="Verdict" value={onChain.verdict as string} cls={verdictColor(onChain.verdict as string)} />
                          <Metric label="Tension" value={onChain.moralTension as string} cls={tensionColor(onChain.moralTension as string)} />
                          <Metric label="Virtue" value={onChainPct(onChain.virtueAlignment as bigint)} bar cls={onChainColor(onChain.virtueAlignment as bigint)} />
                          <Metric label="Safety" value={onChainPct(onChain.moralSafety as bigint)} bar cls={onChainColor(onChain.moralSafety as bigint)} />
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-600 mt-1">Loading on-chain data...</div>
                      )}
                    </div>
                  )}

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
              </div>
            </div>
          )
        })()}

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
