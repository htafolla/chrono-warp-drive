import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Activity, Zap } from 'lucide-react';
import { NeuralOutput } from '@/types/sdss';
import { deterministicRandom, generateCycle } from '@/lib/deterministicUtils';
import { SequenceDial } from './dials/SequenceDial';
import { TimelineDial } from './dials/TimelineDial';

interface NeuralFusionDisplayProps {
  neuralOutput: NeuralOutput | null;
  isActive: boolean;
}

interface LayerActivation {
  layer: string;
  activation: number;
  neurons: number[];
  activeCount: number;
  avgActivation: number;
}

export function NeuralFusionDisplay({ neuralOutput, isActive }: NeuralFusionDisplayProps) {
  const [layerActivations, setLayerActivations] = useState<LayerActivation[]>([]);
  const [metamorphosisHistory, setMetamorphosisHistory] = useState<number[]>([]);
  const [animatedOutput, setAnimatedOutput] = useState(neuralOutput);

  // Add micro-variations to make data more dynamic (throttled for performance)
  useEffect(() => {
    if (!neuralOutput || !isActive) return;
    
    const interval = setInterval(() => {
      const microVariation = () => 0.98 + (Math.random() * 0.04); // ±2% variation (reduced for performance)
      
      setAnimatedOutput({
        ...neuralOutput,
        confidenceScore: Math.min(1, neuralOutput.confidenceScore * microVariation()),
        metamorphosisIndex: Math.min(1, neuralOutput.metamorphosisIndex * microVariation())
      });
    }, 2000); // Throttled to 2000ms for transport system performance
    
    return () => clearInterval(interval);
  }, [neuralOutput, isActive]);

  useEffect(() => {
    if (animatedOutput) {
      const cycle = generateCycle();
      
      // Create dynamic layer activations with time-based variations
      const timeVariation = Math.sin(Date.now() / 2000) * 0.1;
      
      const threshold = 0.65;
      
      const activations: LayerActivation[] = [
        {
          layer: 'Input Layer',
          activation: Math.min(1, 0.8 + deterministicRandom(cycle, 0) * 0.2 + timeVariation),
          neurons: Array.from({ length: 200 }, (_, i) => 
            Math.max(0.1, deterministicRandom(cycle, i + 1) + (Math.sin((Date.now() + i * 100) / 1000) * 0.2))
          ),
          activeCount: 0,
          avgActivation: 0
        },
        {
          layer: 'Hidden Layer 1',
          activation: Math.min(1, animatedOutput.confidenceScore * 0.9 + timeVariation),
          neurons: Array.from({ length: 128 }, (_, i) => 
            Math.max(0.1, deterministicRandom(cycle, i + 100) * animatedOutput.confidenceScore + (Math.sin((Date.now() + i * 80) / 1200) * 0.15))
          ),
          activeCount: 0,
          avgActivation: 0
        },
        {
          layer: 'Hidden Layer 2', 
          activation: Math.min(1, animatedOutput.metamorphosisIndex * 0.8 + timeVariation),
          neurons: Array.from({ length: 64 }, (_, i) => 
            Math.max(0.1, deterministicRandom(cycle, i + 200) * animatedOutput.metamorphosisIndex + (Math.sin((Date.now() + i * 60) / 1400) * 0.15))
          ),
          activeCount: 0,
          avgActivation: 0
        },
        {
          layer: 'Output Layer',
          activation: Math.min(1, animatedOutput.confidenceScore + timeVariation),
          neurons: animatedOutput.neuralSpectra.slice(0, 16).map((n, i) => 
            Math.max(0.1, n + (Math.sin((Date.now() + i * 40) / 1600) * 0.1))
          ),
          activeCount: 0,
          avgActivation: 0
        }
      ].map(layer => {
        const activeCount = layer.neurons.filter(n => n > threshold).length;
        const avgActivation = layer.neurons.reduce((sum, n) => sum + n, 0) / layer.neurons.length;
        return { ...layer, activeCount, avgActivation };
      });
      
      setLayerActivations(activations);
      
      // Track metamorphosis history with variations
      setMetamorphosisHistory(prev => {
        const newHistory = [...prev, animatedOutput.metamorphosisIndex].slice(-20);
        return newHistory;
      });
    }
  }, [animatedOutput]);
  
  // Continuous animation for neural activations
  useEffect(() => {
    if (!isActive) return;
    
    const threshold = 0.65;
    const animationFrame = requestAnimationFrame(function animate() {
      setLayerActivations(prev => prev.map(layer => {
        const updatedNeurons = layer.neurons.map((n, i) => 
          Math.max(0.05, Math.min(1, n + (Math.sin(Date.now() / 500 + i) * 0.02)))
        );
        const activeCount = updatedNeurons.filter(n => n > threshold).length;
        const avgActivation = updatedNeurons.reduce((sum, n) => sum + n, 0) / updatedNeurons.length;
        
        return {
          ...layer,
          neurons: updatedNeurons,
          activeCount,
          avgActivation
        };
      }));
      
      requestAnimationFrame(animate);
    });
    
    return () => cancelAnimationFrame(animationFrame);
  }, [isActive]);

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

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background relative overflow-hidden">
      {/* Animated background effect */}
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
            <Badge variant="default" className="animate-pulse text-xs shadow-lg" style={{ boxShadow: '0 0 10px hsl(var(--primary) / 0.5)' }}>
              Active
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
        {/* Enhanced Network Architecture with animations */}
        <div className="space-y-2 relative">
          {/* Connection lines between layers */}
          <svg className="absolute inset-0 pointer-events-none opacity-20" style={{ width: '100%', height: '100%' }}>
            {layerActivations.map((_, index) => 
              index < layerActivations.length - 1 && (
                <line
                  key={index}
                  x1="10%"
                  y1={`${(index * 100) / (layerActivations.length - 1)}%`}
                  x2="90%"
                  y2={`${((index + 1) * 100) / (layerActivations.length - 1)}%`}
                  stroke="hsl(var(--primary))"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="animate-pulse"
                />
              )
            )}
          </svg>
          
          {layerActivations.map((layer, index) => (
            <div 
              key={layer.layer} 
              className="flex items-center gap-2 relative z-10 group hover:scale-[1.02] transition-transform duration-200"
            >
              <span className="text-xs text-muted-foreground w-16 truncate font-medium">
                {layer.layer.split(' ')[0]}
              </span>
              <div className="flex-1 relative">
                <Progress value={layer.activation * 100} className="h-2" />
                {/* Animated wave overlay */}
                <div 
                  className="absolute inset-0 h-2 rounded-full overflow-hidden pointer-events-none"
                  style={{
                    background: `linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), transparent)`,
                    animation: `slide-wave ${2 + index * 0.5}s ease-in-out infinite`,
                    opacity: layer.activation
                  }}
                />
              </div>
              <span 
                className="text-xs text-muted-foreground w-16 font-mono tabular-nums cursor-help transition-colors hover:text-primary"
                title={`Active: ${layer.activeCount}/${layer.neurons.length} | Avg: ${(layer.avgActivation * 100).toFixed(0)}%`}
              >
                {layer.activeCount}/{layer.neurons.length}
              </span>
              <div className="flex gap-px items-center">
                {layer.neurons.slice(0, 12).map((activation, neuronIndex) => (
                  <div
                    key={neuronIndex}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: `${4 + activation * 4}px`,
                      height: `${4 + activation * 4}px`,
                      backgroundColor: `hsl(var(--primary) / ${Math.max(activation, 0.3)})`,
                      boxShadow: activation > 0.7 ? `0 0 4px hsl(var(--primary) / ${activation})` : 'none',
                      animation: activation > 0.8 ? 'pulse 1s ease-in-out infinite' : 'none'
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <style>{`
          @keyframes slide-wave {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>

        {/* Interactive Dials with glassmorphism container */}
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
        
        {/* Full sequence text with animated glow */}
        <div className="pt-2 border-t border-border/50 bg-background/20 backdrop-blur-sm rounded-lg px-3 py-2">
          <p className="text-[10px] font-mono text-muted-foreground truncate text-center animate-pulse" style={{ textShadow: '0 0 10px hsl(var(--primary) / 0.3)' }}>
            {animatedOutput?.synapticSequence || ''}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}