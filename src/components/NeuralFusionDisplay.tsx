import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Activity, Zap, Target } from 'lucide-react';
import { NeuralOutput } from '@/types/sdss';
import { deterministicRandom, generateCycle } from '@/lib/deterministicUtils';

interface NeuralFusionDisplayProps {
  neuralOutput: NeuralOutput | null;
  isActive: boolean;
}

interface LayerActivation {
  layer: string;
  activation: number;
  neurons: number[];
}

export function NeuralFusionDisplay({ neuralOutput, isActive }: NeuralFusionDisplayProps) {
  const [layerActivations, setLayerActivations] = useState<LayerActivation[]>([]);
  const [metamorphosisHistory, setMetamorphosisHistory] = useState<number[]>([]);

  useEffect(() => {
    if (neuralOutput) {
      // Simulate layer activations based on neural output
      const activations: LayerActivation[] = [
        {
          layer: 'Input Layer',
          activation: 0.8 + deterministicRandom(generateCycle(), 0) * 0.2,
          neurons: Array.from({ length: 200 }, (_, i) => deterministicRandom(generateCycle(), i + 1))
        },
        {
          layer: 'Hidden Layer 1',
          activation: neuralOutput.confidenceScore * 0.9,
          neurons: Array.from({ length: 128 }, (_, i) => deterministicRandom(generateCycle(), i + 100) * neuralOutput.confidenceScore)
        },
        {
          layer: 'Hidden Layer 2', 
          activation: neuralOutput.metamorphosisIndex * 0.8,
          neurons: Array.from({ length: 64 }, (_, i) => deterministicRandom(generateCycle(), i + 200) * neuralOutput.metamorphosisIndex)
        },
        {
          layer: 'Output Layer',
          activation: neuralOutput.confidenceScore,
          neurons: neuralOutput.neuralSpectra.slice(0, 16)
        }
      ];
      
      setLayerActivations(activations);
      
      // Track metamorphosis history
      setMetamorphosisHistory(prev => {
        const newHistory = [...prev, neuralOutput.metamorphosisIndex].slice(-20);
        return newHistory;
      });
    }
  }, [neuralOutput]);

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
    <Card className="border-primary/20 bg-gradient-to-r from-background to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Neural Fusion
            <Badge variant="default" className="animate-pulse text-xs">
              Active
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-green-500" />
              {(neuralOutput.confidenceScore * 100).toFixed(0)}%
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-500" />
              {(neuralOutput.metamorphosisIndex * 100).toFixed(0)}%
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Compact Network Architecture */}
        <div className="space-y-2">
          {layerActivations.map((layer, index) => (
            <div key={layer.layer} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16 truncate">
                {layer.layer.split(' ')[0]}
              </span>
              <Progress value={layer.activation * 100} className="flex-1 h-1" />
              <span className="text-xs text-muted-foreground w-8">
                {layer.neurons.length}
              </span>
              <div className="flex gap-px">
                {layer.neurons.slice(0, 8).map((activation, neuronIndex) => (
                  <div
                    key={neuronIndex}
                    className="w-1 h-1 rounded-full"
                    style={{
                      backgroundColor: `hsl(var(--primary) / ${Math.max(activation, 0.2)})`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Compact Synaptic Sequence & Timeline */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 bg-muted rounded text-xs">
            <div className="flex items-center gap-1 mb-1">
              <Target className="h-3 w-3 text-blue-500" />
              <span className="font-medium">Sequence</span>
            </div>
            <p className="font-mono text-primary truncate">
              {neuralOutput.synapticSequence}
            </p>
          </div>
          
          <div className="p-2 bg-muted rounded text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">Timeline</span>
            </div>
            <div className="h-4 flex items-end gap-px">
              {metamorphosisHistory.slice(-10).map((value, index) => (
                <div
                  key={index}
                  className="flex-1 bg-gradient-to-t from-primary to-primary/20 rounded-t min-h-[2px]"
                  style={{ height: `${value * 100}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}