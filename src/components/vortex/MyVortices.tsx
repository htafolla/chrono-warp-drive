import { useState } from 'react'
import { cn } from '@/lib/utils'

const TIERS = [
  { label: 'Celestial', min: 0.95, text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/20', border: 'border-fuchsia-500/30' },
  { label: 'Resonant', min: 0.78, text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  { label: 'Unstable', min: 0.50, text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  { label: 'Dissonant', min: 0, text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
]

function rarityTier(val: number) {
  return TIERS.find(t => val >= t.min) || TIERS[TIERS.length - 1]
}

function verdictColor(verdict: string) {
  if (verdict === 'PASS') return 'text-emerald-400'
  if (verdict === 'NEEDS_REVISION') return 'text-yellow-400'
  return 'text-red-400'
}

import { DYNAMO_MCP_URL as MCP_URL } from '@/config/platform-env'

interface MyVortexMiniProps {
  tokenId: string
  containerData: any
  onClick: () => void
}

function MyVortexMiniCard({ tokenId, containerData, onClick }: MyVortexMiniProps) {
  const composite = containerData ? Number(containerData.fullBox7DComposite as bigint) / 1e18 : 0
  const tier = rarityTier(composite)
  const verdict = containerData?.verdict as string || ''
  const [imgError, setImgError] = useState(false)

  return (
    <div
      onClick={onClick}
      className={cn(
        'w-[160px] shrink-0 rounded-xl bg-zinc-900/80 border overflow-hidden cursor-pointer transition-all duration-200',
        'hover:border-zinc-600/50 hover:shadow-lg',
        tier.border
      )}
    >
      {!imgError ? (
        <img
          src={`${MCP_URL}/vortex/token-image/${tokenId}`}
          alt={`Vortex #${tokenId}`}
          className="w-full aspect-square"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full aspect-square bg-zinc-800/50 flex items-center justify-center">
          <span className={cn('text-xs font-bold', tier.text)}>VORTEX</span>
        </div>
      )}
      <div className="p-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-200">#{tokenId}</span>
          <span className={cn('text-[10px] font-medium', verdictColor(verdict))}>
            {verdict || '...'}
          </span>
        </div>
        <div className={cn('text-[10px] px-1.5 py-0.5 rounded-full border text-center', tier.bg, tier.text, tier.border)}>
          {tier.label}
        </div>
        <div className="text-[10px] text-zinc-500 font-mono">
          {(composite * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  )
}

interface MyVorticesProps {
  myTokens: { tokenId: string; containerData: any }[]
  loading: boolean
  isConnected: boolean
  onViewDetail: (tokenId: string) => void
}

export function MyVortices({ myTokens, loading, isConnected, onViewDetail }: MyVorticesProps) {
  if (!isConnected) {
    return (
      <div className="mb-10">
        <h2 className="text-sm text-zinc-500 mb-3">My Vortices</h2>
        <div className="rounded-xl bg-zinc-900/30 border border-zinc-800/50 px-4 py-6 text-center">
          <p className="text-xs text-zinc-600">Connect your wallet to see your vortices</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-emerald-400 mb-3">My Vortices</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-[160px] shrink-0 rounded-xl bg-zinc-900/50 border border-zinc-800/60 animate-pulse">
              <div className="w-full aspect-square bg-zinc-800" />
              <div className="p-2.5 space-y-2">
                <div className="h-3 bg-zinc-800 rounded w-12" />
                <div className="h-3 bg-zinc-800 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (myTokens.length === 0) {
    return (
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-emerald-400 mb-3">My Vortices</h2>
        <div className="rounded-xl bg-zinc-900/30 border border-zinc-800/50 px-4 py-6 text-center">
          <p className="text-xs text-zinc-500">No vortices claimed yet.</p>
          <p className="text-[10px] text-zinc-600 mt-1">Browse the grid and mint one to get started.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-emerald-400">
          My Vortices <span className="text-xs text-zinc-500 font-normal">({myTokens.length})</span>
        </h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {myTokens.map(t => (
          <MyVortexMiniCard
            key={t.tokenId}
            tokenId={t.tokenId}
            containerData={t.containerData}
            onClick={() => onViewDetail(t.tokenId)}
          />
        ))}
      </div>
    </div>
  )
}
