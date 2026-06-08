import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { ContainerItem } from '@/pages/VortexClaim'

const TIERS = [
  { label: 'Celestial', min: 0.95, text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/20', border: 'border-fuchsia-500/30', header: 'from-fuchsia-900/40 to-purple-900/20', glow: 'shadow-fuchsia-500/10' },
  { label: 'Resonant', min: 0.78, text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', header: 'from-emerald-900/40 to-teal-900/20', glow: 'shadow-emerald-500/10' },
  { label: 'Unstable', min: 0.50, text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', header: 'from-amber-900/40 to-yellow-900/20', glow: '' },
  { label: 'Dissonant', min: 0, text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', header: 'from-red-900/40 to-rose-900/20', glow: '' },
]

function rarityTier(val: number) {
  return TIERS.find(t => val >= t.min) || TIERS[TIERS.length - 1]
}

function scaleColor(val: number): string {
  if (val >= 0.78) return 'bg-emerald-500'
  if (val >= 0.50) return 'bg-amber-500'
  return 'bg-red-500'
}

function verdictColor(verdict: string) {
  if (verdict === 'PASS') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
  if (verdict === 'NEEDS_REVISION') return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
  return 'text-red-400 border-red-500/30 bg-red-500/10'
}

function sourceChip(src: string) {
  const colors: Record<string, string> = {
    human: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    agent: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    ambient: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    system: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
  }
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${colors[src] || colors.system}`}>{src}</span>
}

function MiniRing({ composite }: { composite: number }) {
  const tier = rarityTier(composite)
  const pct = Math.round(composite * 100)
  const color = composite >= 0.78 ? '#10b981' : composite >= 0.50 ? '#f59e0b' : '#ef4444'
  const conic = `conic-gradient(${color} ${pct}%, rgba(255,255,255,0.05) ${pct}%)`

  return (
    <div className="relative w-14 h-14 shrink-0">
      <div
        className="w-14 h-14 rounded-full"
        style={{ background: conic }}
      >
        <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center" style={{ transform: 'scale(0.75)' }}>
          <span className={cn('text-xs font-bold', tier.text)}>{pct}%</span>
        </div>
      </div>
    </div>
  )
}

interface VortexCardProps {
  container: ContainerItem
  hasToken: boolean
  tokenId: string | null
  isMinting: boolean
  mintError?: string
  onClaim: (containerId: string) => void
  onViewDetails: (container: ContainerItem) => void
}

export function VortexCard({
  container,
  hasToken,
  tokenId,
  isMinting,
  mintError,
  onClaim,
  onViewDetails,
}: VortexCardProps) {
  const composite = container.resonanceProfile.fullBox7DComposite ?? 0
  const tier = rarityTier(composite)
  const message = container.vortexMessage || container.hammerReason || 'Temporal resonance artifact'
  const [imgError, setImgError] = useState(false)

  return (
    <div
      className={cn(
        'group relative bg-zinc-900/80 border rounded-xl overflow-hidden transition-all duration-300 hover:border-zinc-600/50 hover:shadow-lg',
        tier.border,
        tier.glow && `shadow-lg ${tier.glow}`
      )}
    >
      <div className={cn('h-20 bg-gradient-to-br', tier.header)} />

      <div className="px-4 pb-4 -mt-8 relative z-10">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {sourceChip(container.source)}
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', verdictColor(container.resonanceProfile.verdict))}>
              {container.resonanceProfile.verdict}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3 mb-2">
          <MiniRing composite={composite} />
          <div className="flex-1 min-w-0">
            <div className={cn('text-sm font-bold', tier.text)}>
              {tier.label}
            </div>
            <div className="text-xs text-zinc-500">
              {composite.toFixed(4)}
            </div>
          </div>
        </div>

        {message && (
          <p className="text-xs text-zinc-400 line-clamp-2 mb-2 leading-relaxed">
            {message}
          </p>
        )}

        <div className="mb-2">
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 mb-1">
            <span>Composite</span>
            <span className="font-mono">{Math.round(composite * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', scaleColor(composite))}
              style={{ width: `${Math.round(composite * 100)}%` }}
            />
          </div>
        </div>

        <div className="text-[11px] text-zinc-500 mb-3">
          TMO: <span className={cn(
            container.moralOverlay.trinitariumMoralScore >= 0.78 ? 'text-emerald-400' :
            container.moralOverlay.trinitariumMoralScore >= 0.50 ? 'text-amber-400' : 'text-red-400'
          )}>
            {(container.moralOverlay.trinitariumMoralScore * 100).toFixed(0)}%
          </span>
          {' · '}
          <span className={cn(
            container.moralOverlay.moralNumerologicalTension === 'Aligned' ? 'text-emerald-400' :
            container.moralOverlay.moralNumerologicalTension === 'Mild' ? 'text-amber-400' : 'text-red-400'
          )}>
            {container.moralOverlay.moralNumerologicalTension}
          </span>
        </div>

        {mintError && (
          <div className="text-[11px] text-red-400 mb-2 truncate" title={mintError}>
            {mintError}
          </div>
        )}

        <div className="flex items-center gap-2">
          {hasToken ? (
            <Badge variant="secondary" className="text-[11px]">
              Minted ✓ {tokenId ? `#${tokenId}` : ''}
            </Badge>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onClaim(container.containerId) }}
              disabled={isMinting}
              className={cn(
                'flex-1 text-xs font-medium py-1.5 px-3 rounded-lg transition-all',
                'bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500',
                'text-white shadow-lg shadow-fuchsia-600/20',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isMinting ? 'Claiming...' : 'Claim'}
            </button>
          )}
          <button
            onClick={() => onViewDetails(container)}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  )
}
