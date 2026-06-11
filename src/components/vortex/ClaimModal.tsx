import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { TransportPipeline } from '@/components/vortex/TransportPipeline'
import { cn } from '@/lib/utils'

interface ClaimModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  containerId: string | null
  onConfirm: () => Promise<void>
  isMinting: boolean
  mintResult: { txHash: string; tokenId: string } | null
  mintError: string | null
  donationAmount: string
  onDonationChange: (val: string) => void
  ethPrice: number | null
  ethBalance: bigint | null
  isConnected: boolean
  composite: number
  verdict: string
}

function ClaimSuccessParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = []
    const colors = ['#fbbf24', '#f59e0b', '#fcd34d', '#fff', '#34d399', '#a78bfa']
    let frame = 0

    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 6
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    function tick() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.05
        p.life -= 0.015

        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, 2 + (1 - p.life) * 2, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.life
        ctx.fill()
      }

      ctx.globalAlpha = 1
      if (particles.length > 0) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-50"
    />
  )
}

const STAGES = [
  { id: 'solar-ingestion', label: 'Solar Ingestion', description: 'Listening to the Sun...', icon: '☀', color: 'text-orange-400 border-orange-500 bg-orange-500/10', particleColor: '#fb923c' },
  { id: 'tdf-computation', label: 'TDF Computation', description: 'Calculating Temporal Displacement...', icon: '◆', color: 'text-cyan-400 border-cyan-500 bg-cyan-500/10', particleColor: '#22d3ee' },
  { id: 'kuramoto-coupling', label: 'Kuramoto Coupling', description: 'Synchronizing Oscillators...', icon: '〰', color: 'text-violet-400 border-violet-500 bg-violet-500/10', particleColor: '#a78bfa' },
  { id: 'wave-propagation', label: 'Wave Propagation', description: 'Decomposing Symbolic Fingerprint...', icon: '~', color: 'text-teal-400 border-teal-500 bg-teal-500/10', particleColor: '#2dd4bf' },
  { id: 'verdict', label: 'Verification & Anchoring', description: 'Resonance Measured', icon: '◈', color: 'text-amber-400 border-amber-500 bg-amber-500/10', particleColor: '#fbbf24' },
]

export function ClaimModal({
  open,
  onOpenChange,
  containerId,
  onConfirm,
  isMinting,
  mintResult,
  mintError,
  donationAmount,
  onDonationChange,
  ethPrice,
  ethBalance,
  isConnected,
  composite,
  verdict,
}: ClaimModalProps) {
  const [phase, setPhase] = useState<'idle' | 'pipeline' | 'minting' | 'success' | 'error'>('idle')
  const [pipelineDone, setPipelineDone] = useState(false)
  const [showParticles, setShowParticles] = useState(false)

  useEffect(() => {
    if (open) {
      setPhase('idle')
      setPipelineDone(false)
      setShowParticles(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (phase === 'pipeline' && pipelineDone) {
      setPhase('minting')
      onConfirm().then(() => {
        setPhase('success')
        setShowParticles(true)
        setTimeout(() => setShowParticles(false), 2500)
      }).catch(() => {
        setPhase('error')
      })
    }
  }, [phase, pipelineDone, open, onConfirm])

  useEffect(() => {
    if (mintResult && phase === 'success') {
      setShowParticles(true)
      setTimeout(() => setShowParticles(false), 2500)
    }
  }, [mintResult, phase])

  useEffect(() => {
    if (mintError && phase === 'minting') {
      setPhase('error')
    }
  }, [mintError, phase])

  function handleStart() {
    setPhase('pipeline')
  }

  function handleRetry() {
    setPhase('idle')
    setPipelineDone(false)
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val && !isMinting) onOpenChange(false)
    }}>
      <DialogContent className="max-w-lg w-[95vw] bg-zinc-950 border-zinc-800 p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Claim Vortex</DialogTitle>

        {showParticles && <ClaimSuccessParticles />}

        <div className="relative px-6 py-6">
          {phase === 'idle' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-400 mb-1">Claim Vortex</div>
                <p className="text-xs text-zinc-500">This container will be minted as a VortexToken on Base</p>
              </div>

              <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Composite Score</span>
                  <span className="text-sm font-bold font-mono" style={{ color: composite >= 0.78 ? '#34d399' : composite >= 0.50 ? '#f59e0b' : '#f87171' }}>
                    {(composite * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Verdict</span>
                  <span className={cn(
                    'text-sm font-bold',
                    verdict === 'PASS' ? 'text-emerald-400' : verdict === 'NEEDS_REVISION' ? 'text-amber-400' : 'text-red-400'
                  )}>
                    {verdict}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Donation</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={donationAmount}
                      onChange={e => onDonationChange(e.target.value)}
                      step="0.001"
                      min="0"
                      className="w-20 px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-emerald-500/50 text-right"
                      placeholder="0.001"
                    />
                    <span className="text-xs text-zinc-500">ETH</span>
                    {ethPrice && (
                      <span className="text-[10px] text-zinc-600">~${(parseFloat(donationAmount || '0.001') * ethPrice).toFixed(2)}</span>
                    )}
                  </div>
                </div>
                {ethBalance !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Balance</span>
                    <span className="text-xs text-zinc-400">{(Number(ethBalance) / 1e18).toFixed(4)} ETH</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleStart}
                className="w-full py-2.5 text-sm font-medium rounded-lg bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-600/20 transition-all"
              >
                Begin Ceremony
              </button>
            </div>
          )}

          {phase === 'pipeline' && (
            <div>
              <div className="text-center mb-4">
                <div className="text-sm text-zinc-400">Awakening Vortex...</div>
              </div>
              <TransportPipeline
                isActive={true}
                currentStage={undefined}
                onComplete={() => setPipelineDone(true)}
              />
            </div>
          )}

          {phase === 'minting' && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <div className="text-sm text-zinc-300 mb-1">Submitting to chain...</div>
              <p className="text-xs text-zinc-600">Waiting for transaction confirmation</p>
            </div>
          )}

          {phase === 'success' && mintResult && (
            <div className="text-center py-4 space-y-4">
              <div className="text-4xl">✦</div>
              <div className="text-lg font-bold text-emerald-400">Vortex #{mintResult.tokenId} Claimed</div>
              <p className="text-xs text-zinc-500">Your vortex has been anchored to the chain</p>

              <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Token ID</span>
                  <span className="text-xs font-mono text-emerald-400">#{mintResult.tokenId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Transaction</span>
                  <a
                    href={`https://basescan.org/tx/${mintResult.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-500 hover:text-emerald-400 underline truncate max-w-[200px]"
                  >
                    {mintResult.txHash.slice(0, 18)}...
                  </a>
                </div>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="text-center py-6 space-y-4">
              <div className="text-3xl">⚠</div>
              <div className="text-base font-bold text-red-400">Mint Failed</div>
              <p className="text-xs text-zinc-400">{mintError || 'An unknown error occurred'}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-500 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
