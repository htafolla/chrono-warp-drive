import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface Stage {
  id: string
  label: string
  description: string
  icon: string
  color: string
  particleColor: string
}

const STAGES: Stage[] = [
  {
    id: 'solar-ingestion',
    label: 'Solar Ingestion',
    description: 'Listening to the Sun...',
    icon: '☀',
    color: 'text-orange-400 border-orange-500 bg-orange-500/10',
    particleColor: '#fb923c',
  },
  {
    id: 'tdf-computation',
    label: 'TDF Computation',
    description: 'Calculating Temporal Displacement...',
    icon: '◆',
    color: 'text-cyan-400 border-cyan-500 bg-cyan-500/10',
    particleColor: '#22d3ee',
  },
  {
    id: 'kuramoto-coupling',
    label: 'Kuramoto Coupling',
    description: 'Synchronizing Oscillators...',
    icon: '〰',
    color: 'text-violet-400 border-violet-500 bg-violet-500/10',
    particleColor: '#a78bfa',
  },
  {
    id: 'wave-propagation',
    label: 'Wave Propagation',
    description: 'Decomposing Symbolic Fingerprint...',
    icon: '~',
    color: 'text-teal-400 border-teal-500 bg-teal-500/10',
    particleColor: '#2dd4bf',
  },
  {
    id: 'verdict',
    label: 'Verification & Anchoring',
    description: 'Resonance Measured',
    icon: '◈',
    color: 'text-amber-400 border-amber-500 bg-amber-500/10',
    particleColor: '#fbbf24',
  },
]

const STAGE_DURATIONS = [800, 700, 900, 700, 600]

interface TransportPipelineProps {
  isActive: boolean
  currentStage?: number
  onComplete?: () => void
  finalVerdict?: string | null
  minimal?: boolean
  backendProgress?: { stage: number; detail?: string } | null
}

function Particles({ color, isActive }: { color: string; isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([])
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!isActive) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const W = () => canvas.width
    const H = () => canvas.height

    const particles = particlesRef.current
    const MAX_PARTICLES = 60

    function tick() {
      ctx.clearRect(0, 0, W(), H())

      while (particles.length < MAX_PARTICLES) {
        particles.push({
          x: W() * 0.5 + (Math.random() - 0.5) * W() * 0.6,
          y: H() * 0.5 + (Math.random() - 0.5) * H() * 0.6,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.7) * 0.6,
          life: 1,
        })
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.008
        p.vx *= 0.99
        p.vy *= 0.99

        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.globalAlpha = p.life * 0.6
        ctx.fill()
      }

      ctx.globalAlpha = 1
      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [isActive, color])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
    />
  )
}

export function TransportPipeline({
  isActive,
  currentStage: controlledStage,
  onComplete,
  finalVerdict,
  minimal = false,
  backendProgress,
}: TransportPipelineProps) {
  const [internalStage, setInternalStage] = useState(-1)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const hasCompletedRef = useRef(false)

  const stage = backendProgress ? backendProgress.stage : controlledStage ?? internalStage

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  useEffect(() => {
    if (!isActive) {
      clearTimers()
      setInternalStage(-1)
      hasCompletedRef.current = false
      return
    }
    if (hasCompletedRef.current) return
    if (controlledStage !== undefined) return
    if (backendProgress) return

    clearTimers()
    setInternalStage(0)

    STAGE_DURATIONS.forEach((dur, i) => {
      const timer = setTimeout(() => {
        setInternalStage(i + 1)
        if (i === STAGE_DURATIONS.length - 1) {
          hasCompletedRef.current = true
          setTimeout(() => onComplete?.(), 600)
        }
      }, dur)
      timersRef.current.push(timer)
    })

    return clearTimers
  }, [isActive, controlledStage, backendProgress, clearTimers, onComplete])

  const activeStage = Math.min(stage, STAGES.length - 1)

  if (minimal) {
    return (
      <div className="flex items-center gap-1.5 py-1">
        {STAGES.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-500',
              i < activeStage && 'bg-emerald-500',
              i === activeStage && isActive && 'bg-emerald-400 animate-pulse',
              i > activeStage && 'bg-zinc-700'
            )}
          />
        ))}
      </div>
    )
  }

  const currentColor = STAGES[Math.min(activeStage, STAGES.length - 1)]?.particleColor ?? '#22d3ee'

  return (
    <div className="relative w-full bg-zinc-950/90 border border-zinc-800 rounded-xl overflow-hidden">
      <Particles color={currentColor} isActive={isActive && stage >= 0} />

      <div className="relative z-10 px-6 py-6">
        {STAGES.map((s, i) => {
          const isActiveStage = i === activeStage && isActive && stage >= 0
          const isCompleted = i < activeStage || (i === activeStage && !isActive && stage >= 0)
          const isPending = i > activeStage || stage < 0

          return (
            <div key={s.id} className="flex items-center gap-3 mb-2 last:mb-0">
              <div
                className={cn(
                  'w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-500 shrink-0',
                  isCompleted && 'bg-emerald-500/20 border-emerald-500 text-emerald-400',
                  isActiveStage && `${s.color} shadow-lg shadow-${s.color.split(' ')[0].replace('text-', '')}/20`,
                  isPending && 'border-zinc-700 text-zinc-600',
                  isActiveStage && 'animate-pulse'
                )}
              >
                {isCompleted ? '✓' : s.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'text-sm font-medium transition-colors duration-500',
                    isCompleted && 'text-zinc-400',
                    isActiveStage && 'text-zinc-100',
                    isPending && 'text-zinc-700'
                  )}
                >
                  {s.label}
                </div>
                {isActiveStage && (
                  <div className="text-xs text-zinc-500 mt-0.5 animate-in fade-in slide-in-from-left-1 duration-300">
                    {backendProgress?.detail || s.description}
                  </div>
                )}
              </div>

              {isActiveStage && (
                <div className="flex gap-1">
                  {[0, 1, 2].map((d) => (
                    <div
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
                      style={{ animationDelay: `${d * 0.15}s`, animationDuration: '0.8s' }}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {stage >= STAGES.length && finalVerdict && (
          <div className="mt-4 pt-3 border-t border-zinc-800 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div
              className={cn(
                'text-center text-lg font-bold',
                finalVerdict === 'PASS' && 'text-emerald-400',
                finalVerdict === 'NEEDS_REVISION' && 'text-amber-400',
                finalVerdict !== 'PASS' && finalVerdict !== 'NEEDS_REVISION' && 'text-red-400'
              )}
            >
              {finalVerdict === 'PASS' ? '✦ Vortex Anchored' : `Verdict: ${finalVerdict}`}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
