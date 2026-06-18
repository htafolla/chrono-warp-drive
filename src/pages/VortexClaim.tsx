import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { WalletConnectButton } from '@/components/WalletConnectButton'
import { Link } from 'react-router-dom'
import { fetchEthPrice } from '@/services/coingeckoApi'
import { RarityLegend } from '@/components/vortex/RarityLegend'
import { VortexCardGrid } from '@/components/vortex/VortexCardGrid'
import { VortexDetailModal } from '@/components/vortex/VortexDetailModal'
import { MyVortices } from '@/components/vortex/MyVortices'
import { ClaimModal } from '@/components/vortex/ClaimModal'
import { DYNAMO_MCP_URL as MCP_URL } from '@/config/platform-env'

const VORTEX_TOKEN_ADDRESS = '0x7E410f102Cc7320fd8B9601637f5A67AfDF40cF9'
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
  const [totalContainers, setTotalContainers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [minting, setMinting] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [mintResults, setMintResults] = useState<Record<string, string>>({})
  const [mintErrors, setMintErrors] = useState<Record<string, string>>({})
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})
  const [donationAmounts, setDonationAmounts] = useState<Record<string, string>>({})
  const [tokenStatus, setTokenStatus] = useState<Record<string, { hasToken: boolean; tokenId: string | null; inRegistry: boolean }>>({})
  const [statusLoading, setStatusLoading] = useState(true)
  const [onChainMetadata, setOnChainMetadata] = useState<Record<string, any>>({})
  const [stats, setStats] = useState<{ totalSupply: string; totalDonations: string } | null>(null)
  const [myTokens, setMyTokens] = useState<{ tokenId: string; containerData: any }[]>([])
  const [myTokensLoading, setMyTokensLoading] = useState(false)
  const [ethBalance, setEthBalance] = useState<bigint | null>(null)
  const [filterMode, setFilterMode] = useState<'all' | 'claimed' | 'unclaimed'>('all')
  const [sortAsc, setSortAsc] = useState(false)
  const [detailContainer, setDetailContainer] = useState<ContainerItem | null>(null)
  const [claimModalContainer, setClaimModalContainer] = useState<ContainerItem | null>(null)
  const [claimResult, setClaimResult] = useState<{ txHash: string; tokenId: string } | null>(null)
  const hasMore = containers.length < totalContainers

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
      const [containerRes, statusRes] = await Promise.all([
        fetch(`${MCP_URL}/containers?offset=0&limit=50`),
        fetch(`${MCP_URL}/vortex/statuses`),
      ])
      const containerData = await containerRes.json()
      console.log('[vortex] containers loaded:', containerData.containers?.length, 'total:', containerData.total)
      if (containerData.success) {
        setContainers(containerData.containers)
        setTotalContainers(containerData.total)
      }
      const statusData = await statusRes.json()
      if (statusData.success) {
        const status: Record<string, { hasToken: boolean; tokenId: string | null; inRegistry: boolean }> = {}
        for (const [containerId, info] of Object.entries(statusData.statuses || {})) {
          const s = info as { claimed: boolean; tokenId: string | null; inRegistry: boolean }
          status[containerId] = { hasToken: s.claimed, tokenId: s.tokenId, inRegistry: s.inRegistry }
        }
        setTokenStatus(status)
      }
    } catch (err) {
      console.error('[vortex] Failed to load containers', err)
    } finally {
      setLoading(false)
      setStatusLoading(false)
    }
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`${MCP_URL}/containers?offset=${containers.length}&limit=50`)
      const data = await res.json()
      if (data.success) {
        setContainers(prev => [...prev, ...data.containers])
      }
    } catch (err) {
      console.error('[vortex] Failed to load more containers', err)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, containers.length])

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
      setTokenStatus(prev => ({ ...prev, [containerId]: { hasToken: true, tokenId: '...', inRegistry: prev[containerId]?.inRegistry ?? true } }))

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

  async function handleSaveToChain(containerId: string) {
    setSaving(containerId)
    setSaveErrors(prev => { const n = { ...prev }; delete n[containerId]; return n })
    try {
      const res = await fetch(`${MCP_URL}/vortex/persist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Save failed')
      setTokenStatus(prev => ({ ...prev, [containerId]: { ...prev[containerId], inRegistry: true } }))
    } catch (err: any) {
      setSaveErrors(prev => ({ ...prev, [containerId]: err.message?.slice(0, 150) || 'Save failed' }))
    } finally {
      setSaving(null)
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


  function handleViewDetails(container: ContainerItem) {
    setDetailContainer(container)
    const status = tokenStatus[container.containerId]
    if (status?.hasToken && status.tokenId && status.tokenId !== '...' && !onChainMetadata[container.containerId]) {
      loadOnChainMetadata(status.tokenId, container.containerId)
    }
  }

  function handleViewMyToken(tokenId: string) {
    const entry = Object.entries(tokenStatus).find(([_, s]) => s.tokenId === tokenId)
    if (entry) {
      const c = containers.find(cc => cc.containerId === entry[0])
      if (c) setDetailContainer(c)
    }
  }

  function handleOpenClaimModal(containerId: string) {
    const c = containers.find(cc => cc.containerId === containerId)
    if (c) {
      setClaimResult(null)
      setClaimModalContainer(c)
    }
  }

  async function handleMintWithResult(containerId: string): Promise<{ txHash: string; tokenId: string }> {
    if (!isConnected || !address) throw new Error('Wallet not connected')
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
    setTokenStatus(prev => ({ ...prev, [containerId]: { hasToken: true, tokenId: '...', inRegistry: prev[containerId]?.inRegistry ?? true } }))

    const cres = await fetch(`${MCP_URL}/vortex/container/${cid}`)
    const d = await cres.json()
    let tokenId = ''
    if (d.success) {
      tokenId = d.tokenId
      setTokenStatus(prev => ({ ...prev, [containerId]: { hasToken: true, tokenId: d.tokenId } }))
      loadOnChainMetadata(d.tokenId, containerId)
    }
    return { txHash: data.txHash, tokenId }
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

        <MyVortices
          myTokens={myTokens}
          loading={myTokensLoading}
          isConnected={isConnected}
          onViewDetail={handleViewMyToken}
        />

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
              onClaim={handleOpenClaimModal}
              onViewDetails={handleViewDetails}
              filterMode={filterMode}
              sortAsc={sortAsc}
              onFilterChange={setFilterMode}
              onSortToggle={() => setSortAsc(s => !s)}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
              donationAmounts={donationAmounts}
              onDonationChange={(id, val) => setDonationAmounts(prev => ({ ...prev, [id]: val }))}
              ethBalance={ethBalance}
              ethPrice={ethPrice ?? 0}
              isConnected={isConnected}
              saving={saving}
              saveErrors={saveErrors}
              onSaveToChain={handleSaveToChain}
            />
          </>
        )}

        {detailContainer && (
          <VortexDetailModal
            open={!!detailContainer}
            onOpenChange={(open) => { if (!open) setDetailContainer(null) }}
            container={detailContainer}
            tokenId={tokenStatus[detailContainer.containerId]?.hasToken ? tokenStatus[detailContainer.containerId].tokenId : null}
            onChainMetadata={onChainMetadata[detailContainer.containerId]}
            onClaim={() => handleMint(detailContainer.containerId)}
            isMinting={minting === detailContainer.containerId}
            mintError={mintErrors[detailContainer.containerId]}
            mintResult={mintResults[detailContainer.containerId]}
            donationAmount={donationAmounts[detailContainer.containerId]}
            ethBalance={ethBalance}
            ethPrice={ethPrice ?? 0}
            isConnected={isConnected}
            onDonationChange={(val) => setDonationAmounts(prev => ({ ...prev, [detailContainer.containerId]: val }))}
            inRegistry={tokenStatus[detailContainer.containerId]?.inRegistry}
            isSaving={saving === detailContainer.containerId}
            onSaveToChain={() => handleSaveToChain(detailContainer.containerId)}
            saveError={saveErrors[detailContainer.containerId]}
          />
        )}

        {claimModalContainer && (
          <ClaimModal
            open={!!claimModalContainer}
            onOpenChange={(open) => { if (!open) setClaimModalContainer(null) }}
            containerId={claimModalContainer.containerId}
            onConfirm={() => handleMintWithResult(claimModalContainer.containerId).then(r => { setClaimResult(r); return r }).then(() => {})}
            isMinting={minting === claimModalContainer.containerId}
            mintResult={claimResult}
            mintError={mintErrors[claimModalContainer.containerId] || null}
            donationAmount={donationAmounts[claimModalContainer.containerId] || '0.001'}
            onDonationChange={(val) => setDonationAmounts(prev => ({ ...prev, [claimModalContainer.containerId]: val }))}
            ethPrice={ethPrice ?? 0}
            ethBalance={ethBalance}
            isConnected={isConnected}
            composite={claimModalContainer.resonanceProfile.fullBox7DComposite}
            verdict={claimModalContainer.resonanceProfile.verdict}
          />
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
