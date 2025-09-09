import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Activity, Zap, Target } from 'lucide-react';
import { NeuralOutput } from '@/types/sdss';

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
          activation: 0.8 + Math.random() * 0.2,
          neurons: Array.from({ length: 200 }, () => Math.random())
        },
        {
          layer: 'Hidden Layer 1',
          activation: neuralOutput.confidenceScore * 0.9,
          neurons: Array.from({ length: 128 }, () => Math.random() * neuralOutput.confidenceScore)
        },
        {
          layer: 'Hidden Layer 2', 
          activation: neuralOutput.metamorphosisIndex * 0.8,
          neurons: Array.from({ length: 64 }, () => Math.random() * neuralOutput.metamorphosisIndex)
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
    <div className="space-y-4">
      {/* Neural Network Status */}
      <Card className="border-primary/20 bg-gradient-to-r from-background to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Neural Fusion Engine
            <Badge variant="default" className="animate-pulse">
              Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Confidence</span>
              </div>
              <Progress value={neuralOutput.confidenceScore * 100} className="h-2" />
              <span className="text-xs text-muted-foreground">
                {(neuralOutput.confidenceScore * 100).toFixed(1)}%
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Metamorphosis</span>
              </div>
              <Progress value={neuralOutput.metamorphosisIndex * 100} className="h-2" />
              <span className="text-xs text-muted-foreground">
                {(neuralOutput.metamorphosisIndex * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Synaptic Sequence</span>
            </div>
            <p className="text-sm font-mono text-primary">
              {neuralOutput.synapticSequence}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Neural Network Architecture Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Network Architecture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {layerActivations.map((layer, index) => (
              <div key={layer.layer} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{layer.layer}</span>
                  <Badge variant="outline">
                    {layer.neurons.length} neurons
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Progress value={layer.activation * 100} className="flex-1 h-1" />
                  <span className="text-xs text-muted-foreground w-12">
                    {(layer.activation * 100).toFixed(0)}%
                  </span>
                </div>
                
                {/* Neuron activation visualization */}
                <div className="grid grid-cols-20 gap-1 mt-2">
                  {layer.neurons.slice(0, 40).map((activation, neuronIndex) => (
                    <div
                      key={neuronIndex}
                      className="w-2 h-2 rounded-full transition-all duration-200"
                      style={{
                        backgroundColor: `hsl(var(--primary) / ${Math.max(activation, 0.1)})`,
                        transform: `scale(${0.5 + activation * 0.5})`
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metamorphosis Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Metamorphosis Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 flex items-end gap-1">
            {metamorphosisHistory.map((value, index) => (
              <div
                key={index}
                className="flex-1 bg-gradient-to-t from-primary to-primary/20 rounded-t"
                style={{ height: `${value * 100}%` }}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Metamorphosis index over time
          </div>
        </CardContent>
      </Card>
    </div>
  );
}