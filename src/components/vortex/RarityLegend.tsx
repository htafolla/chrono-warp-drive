import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'

const TIERS = [
  {
    label: 'Celestial',
    min: 0.95,
    dot: 'bg-fuchsia-500 shadow-fuchsia-500/50 shadow-lg',
    text: 'text-fuchsia-400',
    description:
      'Rare moments of near-perfect harmony with the living Sun. These proposals resonate at near-perfect coherence across all 7 temporal dimensions.',
  },
  {
    label: 'Resonant',
    min: 0.78,
    dot: 'bg-emerald-500 shadow-emerald-500/50 shadow-lg',
    text: 'text-emerald-400',
    description:
      'Strong harmonic alignment with the temporal field. These proposals show meaningful resonance across most dimensions with only minor deviation.',
  },
  {
    label: 'Unstable',
    min: 0.50,
    dot: 'bg-amber-500',
    text: 'text-amber-400',
    description:
      'Partial temporal coherence. These proposals have meaningful alignment in some dimensions but significant deviation in others.',
  },
  {
    label: 'Dissonant',
    min: 0,
    dot: 'bg-red-500',
    text: 'text-red-400',
    description:
      'Low temporal resonance. These proposals show minimal alignment with the current state of the temporal field.',
  },
]

export function RarityLegend() {
  return (
    <div className="flex items-center gap-4 flex-wrap bg-zinc-900/30 border border-zinc-800 rounded-lg px-4 py-3 mb-4">
      <span className="text-[11px] text-zinc-500 font-medium tracking-wider uppercase mr-1">
        Rarity
      </span>
      {TIERS.map((tier) => (
        <HoverCard key={tier.label} openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <button className="flex items-center gap-1.5 text-xs group cursor-help">
              <span className={`w-2 h-2 rounded-full ${tier.dot} transition-transform group-hover:scale-125`} />
              <span className={`${tier.text} transition-colors`}>
                {tier.label}
              </span>
              <span className="text-zinc-600 font-mono text-[10px]">
                ≥{tier.min}
              </span>
            </button>
          </HoverCardTrigger>
          <HoverCardContent className="w-64 bg-zinc-900 border-zinc-800">
            <div className="space-y-1">
              <div className={`text-sm font-bold ${tier.text}`}>{tier.label}</div>
              <div className="text-xs text-zinc-400 leading-relaxed">{tier.description}</div>
              <div className="text-[10px] text-zinc-600 font-mono">Threshold: ≥{tier.min}</div>
            </div>
          </HoverCardContent>
        </HoverCard>
      ))}
    </div>
  )
}
