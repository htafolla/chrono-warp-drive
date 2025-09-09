import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { validateTLM } from '@/lib/temporalCalculator';
import { NeuralFusionDisplay } from './NeuralFusionDisplay';
import { TPTTv4Result } from '@/types/sdss';

interface DashboardProps {
  time: number;
  e_t: number;
  tPTT_value: number;
  rippel: string;
  phi: number;
  lightWave: number;
  phases: number[];
  tpttV4Result?: TPTTv4Result | null;
  isV4Enhanced?: boolean;
}

export function Dashboard({ 
  time, 
  e_t, 
  tPTT_value, 
  rippel, 
  phi, 
  lightWave, 
  phases,
  tpttV4Result,
  isV4Enhanced 
}: DashboardProps) {
  const isValidTLM = validateTLM(phi);
  const phaseSync = phases.reduce((sum, phase) => sum + Math.cos(phase), 0) / phases.length;
  
  return (
    <div className="space-y-6">
      {/* Neural Fusion Display */}
      {isV4Enhanced && (
        <NeuralFusionDisplay 
          neuralOutput={tpttV4Result?.neuralOutput || null}
          isActive={!!tpttV4Result?.neuralOutput}
        />
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Temporal Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Temporal Metrics
            <Badge variant={isValidTLM ? "default" : "destructive"}>
              TLM {isValidTLM ? "Valid" : "Invalid"}
            </Badge>
          </CardTitle>
          <CardDescription>Core temporal parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time (t)</span>
            <span className="font-mono">{time.toFixed(3)}s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phi (φ)</span>
            <span className="font-mono">{phi.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Entropy (E_t)</span>
            <span className="font-mono">{e_t.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Light Wave</span>
            <span className="font-mono">{lightWave.toFixed(3)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Chrono-Transport Status */}
      <Card>
        <CardHeader>
          <CardTitle>Chrono-Transport</CardTitle>
          <CardDescription>tPTT calculations and transport readiness</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">tPTT Value</span>
            <span className="font-mono text-primary">{tPTT_value.toExponential(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phase Sync</span>
            <span className="font-mono">{phaseSync.toFixed(3)}</span>
          </div>
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Transport Status</div>
            <Badge variant={tPTT_value > 1e12 ? "default" : "secondary"}>
              {tPTT_value > 1e12 ? "Ready for Transport" : "Charging"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Rippel Generator */}
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle>Temporal Rippel</CardTitle>
          <CardDescription>Generated temporal harmonics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg font-mono text-sm">
            {rippel}
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Rippel frequency: 528Hz harmonics synchronized with φ oscillations
          </div>
        </CardContent>
      </Card>

      {/* Phase Visualization */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Phase Relationships</CardTitle>
          <CardDescription>Real-time phase dynamics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {phases.map((phase, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-mono mb-2">
                  {(phase % (2 * Math.PI)).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Phase {i + 1}
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-100"
                    style={{ width: `${((phase % (2 * Math.PI)) / (2 * Math.PI)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}