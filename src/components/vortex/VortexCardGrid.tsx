import { useMemo, useRef, useEffect } from 'react'
import { VortexCard } from './VortexCard'
import type { ContainerItem } from '@/pages/VortexClaim'

interface VortexCardGridProps {
  containers: ContainerItem[]
  tokenStatus: Record<string, { hasToken: boolean; tokenId: string | null; inRegistry?: boolean }>
  minting: string | null
  mintErrors: Record<string, string>
  onClaim: (containerId: string) => void
  onViewDetails: (container: ContainerItem) => void
  filterMode: 'all' | 'claimed' | 'unclaimed'
  sortAsc: boolean
  onFilterChange: (mode: 'all' | 'claimed' | 'unclaimed') => void
  onSortToggle: () => void
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}

export function VortexCardGrid({
  containers,
  tokenStatus,
  minting,
  mintErrors,
  onClaim,
  onViewDetails,
  filterMode,
  sortAsc,
  onFilterChange,
  onSortToggle,
  hasMore,
  loadingMore,
  onLoadMore,
}: VortexCardGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore) onLoadMore()
      },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore])
  const filtered = useMemo(() => {
    let list = containers
    if (filterMode === 'claimed') {
      list = list.filter(c => tokenStatus[c.containerId]?.hasToken)
    } else if (filterMode === 'unclaimed') {
      list = list.filter(c => !tokenStatus[c.containerId]?.hasToken)
    }
    return [...list].sort((a, b) =>
      sortAsc ? a.timestamp - b.timestamp : b.timestamp - a.timestamp
    )
  }, [containers, tokenStatus, filterMode, sortAsc])

  const counts = useMemo(() => ({
    total: containers.length,
    claimed: containers.filter(c => tokenStatus[c.containerId]?.hasToken).length,
    unclaimed: containers.filter(c => !tokenStatus[c.containerId]?.hasToken).length,
  }), [containers, tokenStatus])

  const FILTERS: { key: 'all' | 'claimed' | 'unclaimed'; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.total },
    { key: 'unclaimed', label: 'Unclaimed', count: counts.unclaimed },
    { key: 'claimed', label: 'Claimed', count: counts.claimed },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                filterMode === f.key
                  ? 'bg-zinc-800 border-zinc-600 text-zinc-200'
                  : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-zinc-600">{f.count}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onSortToggle}
          className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
        >
          {sortAsc ? '↑ Oldest first' : '↓ Newest first'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <div className="text-3xl mb-2 opacity-20">◈</div>
          <p className="text-sm">No vortices found in this category</p>
          <p className="text-xs text-zinc-700 mt-1">Try changing your filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <VortexCard
              key={c.containerId}
              container={c}
              hasToken={tokenStatus[c.containerId]?.hasToken ?? false}
              tokenId={tokenStatus[c.containerId]?.tokenId ?? null}
              inRegistry={tokenStatus[c.containerId]?.inRegistry ?? false}
              isMinting={minting === c.containerId}
              mintError={mintErrors[c.containerId]}
              onClaim={onClaim}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}

      {loadingMore && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <span className="w-4 h-4 rounded-full border-2 border-zinc-600 border-t-zinc-300 animate-spin" />
            Loading more...
          </div>
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="h-4" />
      )}
    </div>
  )
}
