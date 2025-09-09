import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, TrendingUp, Target, Clock } from 'lucide-react';

interface EnergyAcceleratorProps {
  e_t: number;
  energyGrowthRate: number;
  onGrowthRateChange: (rate: number) => void;
  targetE_t: number;
  onTargetChange: (target: number) => void;
  isRealtime: boolean;
  onRealtimeToggle: () => void;
  energyMomentum: number;
  neuralBoost: number;
  spectrumBoost: number;
  fractalBonus: number;
  etaSeconds?: number;
}

export const EnergyAccelerator = ({
  e_t,
  energyGrowthRate,
  onGrowthRateChange,
  targetE_t,
  onTargetChange,
  isRealtime,
  onRealtimeToggle,
  energyMomentum,
  neuralBoost,
  spectrumBoost,
  fractalBonus,
  etaSeconds
}: EnergyAcceleratorProps) => {
  const energyProgress = Math.min((e_t / targetE_t) * 100, 100);
  const totalMultiplier = 1 + neuralBoost + spectrumBoost + fractalBonus + energyMomentum;
  const effectiveGrowthRate = energyGrowthRate * totalMultiplier;

  const formatETA = (seconds?: number) => {
    if (!seconds || seconds <= 0) return "Ready";
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
    return `${Math.ceil(seconds / 3600)}h`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Energy Acceleration System
          <Badge variant={isRealtime ? "default" : "secondary"}>
            {isRealtime ? "REALTIME" : "STANDARD"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Energy Status */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">E_t Energy Level</span>
            <span className="text-sm font-mono">{e_t.toFixed(4)}</span>
          </div>
          <Progress value={energyProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Current: {e_t.toFixed(3)}</span>
            <span>Target: {targetE_t.toFixed(3)}</span>
            <span>ETA: {formatETA(etaSeconds)}</span>
          </div>
        </div>

        {/* Growth Rate Control */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Growth Rate Multiplier</label>
            <span className="text-sm text-muted-foreground font-mono">{energyGrowthRate}x</span>
          </div>
          <Slider
            value={[energyGrowthRate]}
            onValueChange={(values) => onGrowthRateChange(values[0])}
            min={0.5}
            max={10}
            step={0.1}
            className="w-full"
          />
          <div className="text-xs text-muted-foreground">
            Higher rates consume more system resources
          </div>
        </div>

        {/* Target E_t Control */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Target E_t Level</label>
            <span className="text-sm text-muted-foreground font-mono">{targetE_t.toFixed(3)}</span>
          </div>
          <Slider
            value={[targetE_t]}
            onValueChange={(values) => onTargetChange(values[0])}
            min={0.5}
            max={2.0}
            step={0.01}
            className="w-full"
          />
          <div className="text-xs text-muted-foreground">
            Higher targets provide more transport energy
          </div>
        </div>

        {/* Energy Multipliers Display */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <span className="text-xs">Neural Boost</span>
            <Badge variant={neuralBoost > 0 ? "default" : "outline"}>
              +{(neuralBoost * 100).toFixed(0)}%
            </Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <span className="text-xs">Spectrum Boost</span>
            <Badge variant={spectrumBoost > 0 ? "default" : "outline"}>
              +{(spectrumBoost * 100).toFixed(0)}%
            </Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <span className="text-xs">Fractal Bonus</span>
            <Badge variant={fractalBonus > 0 ? "default" : "outline"}>
              +{(fractalBonus * 100).toFixed(0)}%
            </Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <span className="text-xs">Momentum</span>
            <Badge variant={energyMomentum > 0 ? "default" : "outline"}>
              +{(energyMomentum * 100).toFixed(0)}%
            </Badge>
          </div>
        </div>

        {/* Total Effective Rate */}
        <div className="p-3 bg-primary/10 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Effective Growth Rate</span>
            </div>
            <span className="text-lg font-bold text-primary">
              {effectiveGrowthRate.toFixed(2)}x
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Base: {energyGrowthRate}x × Total Multipliers: {totalMultiplier.toFixed(2)}
          </div>
        </div>

        {/* Realtime Mode Toggle */}
        <div className="flex gap-2">
          <Button
            onClick={onRealtimeToggle}
            variant={isRealtime ? "default" : "outline"}
            className="flex-1"
          >
            <Clock className="h-4 w-4 mr-2" />
            {isRealtime ? "Disable Realtime" : "Enable Realtime"}
          </Button>
        </div>

        {/* Optimization Alerts */}
        {e_t < 0.3 && (
          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              Low energy detected. Consider enabling realtime mode or increasing growth rate multiplier.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};