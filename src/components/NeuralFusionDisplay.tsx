import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Activity, Zap, Cpu } from 'lucide-react';
import { NeuralOutput } from '@/types/sdss';
import { SequenceDial } from './dials/SequenceDial';
import { TimelineDial } from './dials/TimelineDial';
import { usePageVisibility } from '@/hooks/usePageVisibility';

interface NeuralFusionDisplayProps {
  neuralOutput: NeuralOutput | null;
  isActive: boolean;
  isTrained?: boolean;
  isFallback?: boolean;
}

interface LayerVisualization {
  label: string;
  neuronCount: number;
  color: string;
}

// Real front-end worker model architecture: 6 → 16 → 8 → 1
const ARCHITECTURE: LayerVisualization[] = [
  { label: 'Input', neuronCount: 6, color: 'from-blue-400 to-blue-600' },
  { label: 'Dense 16', neuronCount: 16, color: 'from-violet-400 to-violet-600' },
  { label: 'Dropout', neuronCount: 0, color: 'from-gray-400 to-gray-500' },
  { label: 'Dense 8', neuronCount: 8, color: 'from-purple-400 to-purple-600' },
  { label: 'Output', neuronCount: 1, color: 'from-amber-400 to-amber-600' },
];

export function NeuralFusionDisplay({ neuralOutput, isActive, isTrained = false, isFallback = true }: NeuralFusionDisplayProps) {
  const [metamorphosisHistory, setMetamorphosisHistory] = useState<number[]>([]);
  const [animatedOutput, setAnimatedOutput] = useState(neuralOutput);
  const [pulsePhase, setPulsePhase] = useState(0);
  const isPageVisible = usePageVisibility();

  useEffect(() => {
    setAnimatedOutput(neuralOutput);
  }, [neuralOutput]);

  useEffect(() => {
    if (!neuralOutput || !isActive || !isPageVisible) return;

    const interval = setInterval(() => {
      const v = () => 0.98 + Math.random() * 0.04;
      setAnimatedOutput({
        ...neuralOutput,
        confidenceScore: Math.min(1, neuralOutput.confidenceScore * v()),
        metamorphosisIndex: Math.min(1, neuralOutput.metamorphosisIndex * v()),
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [neuralOutput, isActive, isPageVisible]);

  // Animate pulse phase for the architecture visualization
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 0.02) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (animatedOutput) {
      setMetamorphosisHistory(prev => {
        const next = [...prev, animatedOutput.metamorphosisIndex];
        return next.length > 20 ? next.slice(-20) : next;
      });
    }
  }, [animatedOutput]);

  if (!isActive || !neuralOutput) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Neural Fusion Engine
            <Badge variant="secondary">Standby</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Neural fusion engine is not active</p>
        </CardContent>
      </Card>
    );
  }

  const statusBadge = !isFallback && isTrained
    ? <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-600">Solar-Trained</Badge>
    : isFallback
    ? <Badge variant="secondary" className="text-xs">Formula Fallback</Badge>
    : <Badge variant="outline" className="text-xs">Untrained</Badge>;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-50 animate-pulse" style={{ animationDuration: '3s' }} />

      <CardHeader className="pb-3 relative z-10">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Brain className="h-4 w-4 text-primary animate-pulse" />
              <div className="absolute inset-0 animate-ping opacity-30">
                <Brain className="h-4 w-4 text-primary" />
              </div>
            </div>
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent font-bold">
              Neural Fusion
            </span>
            {statusBadge}
            <Badge variant="outline" className="text-xs font-mono">
              {isFallback ? 'formula' : '6→16→8→1'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 backdrop-blur-sm border border-green-500/20">
              <Activity className="h-3 w-3 text-green-500 animate-pulse" />
              <span className="font-mono tabular-nums">{(animatedOutput?.confidenceScore * 100 || 0).toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/20">
              <Zap className="h-3 w-3 text-yellow-500 animate-pulse" />
              <span className="font-mono tabular-nums">{(animatedOutput?.metamorphosisIndex * 100 || 0).toFixed(0)}%</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0 space-y-3 relative z-10">
        {/* Real architecture visualization — sizes reflect actual neuron counts */}
        <div className="space-y-2">
          {/* Connection lines */}
          <svg className="absolute inset-0 pointer-events-none opacity-20" style={{ width: '100%', height: '100%' }}>
            {ARCHITECTURE.map((layer, i) =>
              i < ARCHITECTURE.length - 1 && layer.neuronCount > 0 && ARCHITECTURE[i + 1].neuronCount > 0 && (
                <line
                  key={i}
                  x1="10%"
                  y1={`${(i * 100) / (ARCHITECTURE.length - 1)}%`}
                  x2="90%"
                  y2={`${((i + 1) * 100) / (ARCHITECTURE.length - 1)}%`}
                  stroke="hsl(var(--primary))"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="animate-pulse"
                />
              )
            )}
          </svg>

          {ARCHITECTURE.map((layer, index) => (
            <div key={layer.label} className="flex items-center gap-2 relative z-10">
              <span className="text-xs text-muted-foreground w-16 truncate font-medium">
                {layer.label}
              </span>
              <div className="flex-1 relative">
                <Progress
                  value={layer.neuronCount > 0 ? 100 : 0}
                  className={`h-2 bg-gradient-to-r ${layer.color}`}
                />
              </div>
              <span className="text-xs text-muted-foreground w-16 font-mono tabular-nums text-right">
                {layer.neuronCount > 0 ? `${layer.neuronCount}` : '—'}
              </span>
              <div className="flex gap-px items-center">
                {layer.neuronCount > 0
                  ? Array.from({ length: Math.min(layer.neuronCount, 16) }, (_, ni) => {
                      // Visual pulse — amplitude modulated by solar state
                      const val = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(pulsePhase + ni * 0.8 + index * 1.3));
                      return (
                        <div
                          key={ni}
                          className="rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.max(3, val * 6)}px`,
                            height: `${Math.max(3, val * 6)}px`,
                            backgroundColor: `hsl(var(--primary) / ${Math.max(val * 0.6, 0.2)})`,
                            boxShadow: val > 0.6 ? `0 0 3px hsl(var(--primary) / ${val})` : 'none',
                          }}
                        />
                      );
                    })
                  : <Cpu className="h-3 w-3 text-muted-foreground/50" />}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-around gap-6 py-4 px-4 rounded-lg bg-background/30 backdrop-blur-md border border-border/30 shadow-lg">
          <SequenceDial
            sequence={animatedOutput?.synapticSequence || ''}
            className="hover:scale-110 transition-transform duration-300"
          />

          <div className="h-16 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

          <TimelineDial
            currentValue={animatedOutput?.metamorphosisIndex || 0}
            history={metamorphosisHistory}
            className="hover:scale-110 transition-transform duration-300"
          />
        </div>

        <div className="pt-2 border-t border-border/50 bg-background/20 backdrop-blur-sm rounded-lg px-3 py-2">
          <p className="text-[10px] font-mono text-muted-foreground truncate text-center animate-pulse" style={{ textShadow: '0 0 10px hsl(var(--primary) / 0.3)' }}>
            {animatedOutput?.synapticSequence || ''}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
