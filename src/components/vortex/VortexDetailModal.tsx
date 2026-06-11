import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ContainerItem } from '@/pages/VortexClaim'

const VORTEX_TOKEN_ADDRESS = '0x7E410f102Cc7320fd8B9601637f5A67AfDF40cF9'
const MCP_URL = 'https://mcp-production-80e2.up.railway.app'

const TIERS = [
  { label: 'Celestial', min: 0.95, text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/20', border: 'border-fuchsia-500/30', header: 'from-fuchsia-900/60 to-purple-900/30', heroBg: '#a21caf', heroFrom: '#d946ef', heroTo: '#c026d3' },
  { label: 'Resonant', min: 0.78, text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', header: 'from-emerald-900/60 to-teal-900/30', heroBg: '#059669', heroFrom: '#10b981', heroTo: '#34d399' },
  { label: 'Unstable', min: 0.50, text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', header: 'from-amber-900/60 to-yellow-900/30', heroBg: '#d97706', heroFrom: '#f59e0b', heroTo: '#fbbf24' },
  { label: 'Dissonant', min: 0, text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', header: 'from-red-900/60 to-rose-900/30', heroBg: '#dc2626', heroFrom: '#ef4444', heroTo: '#f87171' },
]

function rarityTier(val: number) {
  return TIERS.find(t => val >= t.min) || TIERS[TIERS.length - 1]
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

function verdictColor(verdict: string) {
  if (verdict === 'PASS') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
  if (verdict === 'NEEDS_REVISION') return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
  return 'text-red-400 border-red-500/30 bg-red-500/10'
}

function tensionColor(t: string) {
  if (t === 'Aligned') return 'text-emerald-400'
  if (t === 'Mild') return 'text-amber-400'
  if (t === 'Significant') return 'text-orange-400'
  return 'text-red-400'
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

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

interface VortexDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  container: ContainerItem
  tokenId?: string | null
  onChainMetadata?: any
  onClaim?: () => void
  isMinting?: boolean
  mintError?: string
  mintResult?: string
  donationAmount?: string
  ethBalance?: bigint | null
  ethPrice?: number
  isConnected?: boolean
  onDonationChange?: (val: string) => void
  inRegistry?: boolean
  isSaving?: boolean
  onSaveToChain?: () => void
  saveError?: string
}

function HeroImage({ container, tier }: { container: ContainerItem; tier: typeof TIERS[0] }) {
  const composite = container.resonanceProfile.fullBox7DComposite ?? 0
  const pct = Math.round(composite * 100)
  const dims = [7, 6, 5, 4, 3, 2]
  const verdict = container.resonanceProfile.verdict

  return (
    <div className={cn('relative w-full h-48 bg-gradient-to-br overflow-hidden', tier.header)}>
      <svg viewBox="0 0 400 192" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="heroGlow">
            <stop offset="0%" stopColor={tier.heroFrom} stopOpacity="0.3" />
            <stop offset="100%" stopColor={tier.heroFrom} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="192" fill="url(#heroGlow)" />
        {dims.map((d, i) => {
          const r = 14 + d * 8
          const alpha = 1 - i * 0.12
          return (
            <circle
              key={i}
              cx="120"
              cy="96"
              r={r}
              fill="none"
              stroke={tier.heroFrom}
              strokeWidth="1.5"
              opacity={alpha * 0.4}
            />
          )
        })}
        <circle
          cx="120"
          cy="96"
          r={22}
          fill="none"
          stroke={tier.heroFrom}
          strokeWidth="6"
          strokeDasharray={`${pct * 1.38} 138`}
          opacity={0.8}
          transform="rotate(-90 120 96)"
        />
        <text x="120" y="99" textAnchor="middle" fill={tier.heroFrom} fontSize="28" fontWeight="bold" fontFamily="monospace">
          {pct}%
        </text>
        <text x="120" y="126" textAnchor="middle" fill={tier.heroFrom} fontSize="9" fontFamily="monospace" opacity="0.6">
          {tier.label.toUpperCase()}
        </text>
        <g transform="translate(340, 24)">
          <rect x="-36" y="-12" width="72" height="24" rx="4" fill={verdict === 'PASS' ? '#10b981' : verdict === 'NEEDS_REVISION' ? '#f59e0b' : '#ef4444'} opacity="0.15" />
          <text textAnchor="middle" y="4" fill={verdict === 'PASS' ? '#34d399' : verdict === 'NEEDS_REVISION' ? '#fbbf24' : '#f87171'} fontSize="11" fontWeight="bold">
            {verdict}
          </text>
        </g>
      </svg>
    </div>
  )
}

function StatBar({ label, value, cls }: { label: string; value: number; cls?: string }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-zinc-500 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', cls || scaleColor(value))} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('text-[11px] font-mono w-8 text-right', scaleTextColor(value))}>{pct}%</span>
    </div>
  )
}

export function VortexDetailModal({
  open,
  onOpenChange,
  container,
  tokenId,
  onChainMetadata,
  onClaim,
  isMinting,
  mintError,
  mintResult,
  donationAmount,
  ethBalance,
  ethPrice,
  isConnected,
  onDonationChange,
  inRegistry,
  isSaving,
  onSaveToChain,
  saveError,
}: VortexDetailModalProps) {
  const composite = container.resonanceProfile.fullBox7DComposite ?? 0
  const tier = rarityTier(composite)
  const tmo = container.moralOverlay.trinitariumMoralScore
  const proposal = container.proposalText || ''
  const [copied, setCopied] = useState(false)
  const [imgError, setImgError] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(container.containerId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShare() {
    const text = [
      `I found a ${tier.label} Vortex!`,
      `Composite: ${(composite * 100).toFixed(0)}% · Verdict: ${container.resonanceProfile.verdict}`,
      `TMO: ${(tmo * 100).toFixed(0)}% · ${container.moralOverlay.moralNumerologicalTension}`,
      tokenId ? `Token #${tokenId}` : '',
      '🌊⚡🌀',
      'Explore: https://dynamo.rippel.ai/vortex',
    ].filter(Boolean).join('\n')
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  const dimensions = [
    { label: 'Wave Proximity', value: container.resonanceProfile.waveProximity },
    { label: 'Phase Alignment', value: container.resonanceProfile.phaseAlignment },
    { label: 'Calibrated Vortex', value: container.resonanceProfile.calibratedVortex },
    { label: 'Calibrated Sync', value: container.resonanceProfile.calibratedSync },
    { label: 'Neural Proximity', value: container.resonanceProfile.neuralProximity },
    { label: 'Neural Vortex', value: container.resonanceProfile.neuralVortex },
    { label: 'Gematria', value: container.resonanceProfile.gematriaResonance },
  ]

  const tmoDimensions = [
    { label: 'Trinitarium Moral Score', value: tmo },
    { label: 'Virtue Alignment', value: container.moralOverlay.virtueAlignment },
    { label: 'Moral Safety', value: container.moralOverlay.moralSafety },
    { label: 'Intent Alignment', value: container.moralOverlay.intentAlignment },
    { label: 'Gematria Fusion', value: container.moralOverlay.trinitariumGematriaFusion },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 p-0 gap-0">
        <DialogTitle className="sr-only">Vortex Detail</DialogTitle>

        <HeroImage container={container} tier={tier} />

        <div className="px-6 pt-5 pb-6 space-y-5">
          <div className="flex items-center flex-wrap gap-2">
            <span className={cn('text-sm font-bold', tier.text)}>{tier.label}</span>
            <span className="text-xs text-zinc-600">·</span>
            {sourceChip(container.source)}
            <span className={cn('text-[11px] px-2 py-0.5 rounded-full border font-medium', verdictColor(container.resonanceProfile.verdict))}>
              {container.resonanceProfile.verdict}
            </span>
            <span className="text-xs text-zinc-600">·</span>
            <span className="text-[11px] text-zinc-400">{formatDate(container.timestamp)}</span>
            {tokenId && (
              <>
                <span className="text-xs text-zinc-600">·</span>
                <span className="text-[11px] text-emerald-400 font-mono">#{tokenId}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>
              TMO: <span className={tmo >= 0.78 ? 'text-emerald-400' : tmo >= 0.50 ? 'text-amber-400' : 'text-red-400'}>{Math.round(tmo * 100)}%</span>
            </span>
            <span className="text-zinc-600">·</span>
            <span>
              Tension: <span className={tensionColor(container.moralOverlay.moralNumerologicalTension)}>{container.moralOverlay.moralNumerologicalTension}</span>
            </span>
            <span className="text-zinc-600">·</span>
            <span>
              Score: <span className={scaleTextColor(composite)}>{(composite * 100).toFixed(1)}%</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
            <div className="md:col-span-3 space-y-4">
              {proposal && (
                <div>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1.5">Proposal</div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{proposal}</p>
                </div>
              )}

              {container.vortexMessage && (
                <div>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1.5">Vortex Message</div>
                  <p className="text-sm text-zinc-400 italic">{container.vortexMessage}</p>
                </div>
              )}

              {container.hammerReason && !proposal && !container.vortexMessage && (
                <div>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1.5">Hammer Reason</div>
                  <p className="text-sm text-zinc-400">{container.hammerReason}</p>
                </div>
              )}

              <div>
                <div className="text-[10px] text-zinc-600 uppercase tracking-wide mb-2">Container ID</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-zinc-400 truncate flex-1">{container.containerId}</code>
                  <button
                    onClick={handleCopy}
                    className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors shrink-0 px-2 py-0.5 rounded bg-zinc-800/50"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div>
                <div className="text-[10px] text-zinc-600 uppercase tracking-wide mb-2">7D Profile</div>
                <div className="space-y-1.5">
                  {dimensions.map(d => (
                    <StatBar key={d.label} label={d.label} value={d.value} />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-zinc-600 uppercase tracking-wide mb-2">TMO Overlay</div>
                <div className="space-y-1.5">
                  {tmoDimensions.map(d => (
                    <StatBar key={d.label} label={d.label} value={d.value} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {tokenId && (
              <a
                href={`https://basescan.org/token/${VORTEX_TOKEN_ADDRESS}?a=${tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-emerald-500 hover:text-emerald-400 underline"
              >
                View on Basescan ↗
              </a>
            )}
            <button
              onClick={handleShare}
              className="text-[11px] text-zinc-500 hover:text-sky-400 transition-colors underline"
            >
              Share on Twitter
            </button>
          </div>

          {!tokenId && (
            <div className="border-t border-zinc-800 pt-4">
              {inRegistry !== false ? (
                <>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wide mb-3">Mint VortexToken</div>
                  {isConnected ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={donationAmount || '0.001'}
                          onChange={e => onDonationChange?.(e.target.value)}
                          step="0.001"
                          min="0"
                          className="w-20 px-2 py-1.5 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                          placeholder="ETH"
                        />
                        {ethPrice && (
                          <span className="text-[11px] text-zinc-500">
                            ~${((parseFloat(donationAmount || '0.001')) * ethPrice).toFixed(2)}
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-600">
                          Balance: {ethBalance !== null ? `${(Number(ethBalance) / 1e18).toFixed(4)} ETH` : '...'}
                        </span>
                      </div>
                      {(() => {
                        const mintAmt = parseFloat(donationAmount || '0.001')
                        const mintVal = BigInt(Math.floor(mintAmt * 1e18))
                        const insufficient = ethBalance !== null && ethBalance < mintVal + BigInt(1e15)
                        return (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={onClaim}
                              disabled={isMinting || insufficient}
                              className={cn(
                                'px-4 py-1.5 text-xs font-medium rounded-lg transition-all text-white',
                                insufficient
                                  ? 'bg-red-600/50 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 shadow-lg shadow-fuchsia-600/20'
                              )}
                            >
                              {isMinting ? 'Minting...' : insufficient ? 'Low Balance' : 'Mint'}
                            </button>
                            {insufficient && (
                              <span className="text-[11px] text-red-400">Insufficient ETH for donation + gas</span>
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
                  {mintError && (
                    <div className="text-[11px] text-red-400 mt-2">{mintError}</div>
                  )}
                  {mintResult && (
                    <div className="text-[11px] text-emerald-400 mt-2">
                      Token minted!{' '}
                      <a href={`https://basescan.org/tx/${mintResult}`} target="_blank" rel="noopener noreferrer" className="underline">
                        View transaction
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-[10px] text-amber-400 uppercase tracking-wide mb-1">Offchain — Not Registered</div>
                  <p className="text-xs text-zinc-400 mb-3">
                    This container exists in the temporal field but hasn't been saved to the on-chain registry yet.
                  </p>
                  <button
                    onClick={onSaveToChain}
                    disabled={isSaving}
                    className="px-4 py-1.5 text-xs font-medium rounded-lg bg-amber-600/80 hover:bg-amber-500/80 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Save to Chain'}
                  </button>
                  {saveError && (
                    <div className="text-[11px] text-red-400 mt-2">{saveError}</div>
                  )}
                </>
              )}
            </div>
          )}

          {tokenId && (
            <div className="border-t border-zinc-800 pt-4">
              <div className="flex items-start gap-4">
                {!imgError ? (
                  <img
                    src={`${MCP_URL}/vortex/token-image/${tokenId}`}
                    alt={`Vortex #${tokenId}`}
                    className="w-24 h-24 rounded-lg border border-zinc-700/50 shrink-0"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center shrink-0">
                    <span className="text-[10px] text-zinc-600">No image</span>
                  </div>
                )}
                <div className="min-w-0 space-y-1.5">
                  <div className="text-[10px] text-emerald-500 uppercase tracking-wide">On-Chain Token</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-500">Token ID:</span>
                    <span className="text-zinc-200 font-mono">#{tokenId}</span>
                  </div>
                  {onChainMetadata && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div className="text-[10px] text-zinc-500">7D Composite: <span className={onChainMetadata.fullBox7DComposite ? scaleTextColor(Number(onChainMetadata.fullBox7DComposite as bigint) / 1e18) : 'text-zinc-400'}>{(Number(onChainMetadata.fullBox7DComposite as bigint) / 1e16).toFixed(0)}%</span></div>
                      <div className="text-[10px] text-zinc-500">TMO: <span className={onChainMetadata.trinitariumMoralScore ? scaleTextColor(Number(onChainMetadata.trinitariumMoralScore as bigint) / 1e18) : 'text-zinc-400'}>{(Number(onChainMetadata.trinitariumMoralScore as bigint) / 1e16).toFixed(0)}%</span></div>
                      <div className="text-[10px] text-zinc-500">Verdict: <span className={onChainMetadata.verdict ? (onChainMetadata.verdict === 'PASS' ? 'text-emerald-400' : onChainMetadata.verdict === 'NEEDS_REVISION' ? 'text-amber-400' : 'text-red-400') : 'text-zinc-400'}>{onChainMetadata.verdict as string}</span></div>
                      <div className="text-[10px] text-zinc-500">Tension: <span className={onChainMetadata.moralTension ? tensionColor(onChainMetadata.moralTension as string) : 'text-zinc-400'}>{onChainMetadata.moralTension as string}</span></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
