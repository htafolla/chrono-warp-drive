import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { validateTLM, Isotope, calculatePhaseCoherence } from '@/lib/temporalCalculator';
import { TPTTv4Result, SpectrumData } from '@/types/sdss';
import { ChronoTransportResult } from '@/types/blurrn-v4-7';

interface DashboardMetricsProps {
  time: number;
  e_t: number;
  tPTT_value: number;
  rippel: string;
  phi: number;
  lightWave: number;
  phases: number[];
  tpttV4Result?: TPTTv4Result | null;
  isV4Enhanced?: boolean;
  isotope?: Isotope;
  fractalToggle?: boolean;
  chronoTransportResult?: ChronoTransportResult | null;
  cascadeParams?: { delta_phase: number; n: number; voids: number; tptt: number } | null;
}

export function DashboardMetrics({ 
  time, 
  e_t, 
  tPTT_value, 
  rippel, 
  phi, 
  lightWave, 
  phases,
  tpttV4Result,
  isV4Enhanced,
  isotope = { type: 'C-12', factor: 1.0 },
  fractalToggle = false,
  chronoTransportResult = null,
  cascadeParams = null
}: DashboardMetricsProps) {
  const isValidTLM = validateTLM(phi);
  const phaseSync = calculatePhaseCoherence(phases);
  
  return (
    <div className="space-y-6">
      {/* Three Main Metrics Cards */}
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
            <CardTitle className="flex items-center gap-2">
              Chrono-Transport
              {chronoTransportResult && (
                <Badge variant="default" className="text-xs">v4.7 CTI</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {chronoTransportResult ? 'CTI cascade & dual black hole transport' : 'tPTT calculations and transport readiness'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">tPTT Value</span>
              <span className="font-mono text-primary">{tPTT_value.toExponential(2)}</span>
            </div>
            {chronoTransportResult ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Q_ent</span>
                  <span className="font-mono text-primary">{chronoTransportResult.q_ent.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cascade Index</span>
                  <span className="font-mono">{chronoTransportResult.cascadeIndex}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Efficiency</span>
                  <span className="font-mono">{chronoTransportResult.efficiency.toFixed(1)}%</span>
                </div>
                {cascadeParams && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delta Phase</span>
                      <span className="font-mono">{cascadeParams.delta_phase}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cascade N</span>
                      <span className="font-mono">{cascadeParams.n}</span>
                    </div>
                  </>
                )}
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">CTI Transport Status</div>
                  <Badge variant={
                    chronoTransportResult.status === 'Approved' ? "default" :
                    chronoTransportResult.status === 'Pending' ? "outline" : "destructive"
                  }>
                    {chronoTransportResult.status} - {(chronoTransportResult.score * 100).toFixed(1)}%
                  </Badge>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phase Sync</span>
                  <span className="font-mono">{phaseSync.toFixed(3)}</span>
                </div>
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Transport Status</div>
                  <Badge variant={
                    tPTT_value >= 1e12 ? "destructive" :
                    tPTT_value >= 1e11 && Math.abs(phaseSync) > 0.6 ? "default" : 
                    tPTT_value >= 1e10 ? "outline" : 
                    tPTT_value >= 1e9 ? "secondary" : 
                    "destructive"
                  }>
                    {tPTT_value >= 1e12 ? "Critical Levels" :
                     tPTT_value >= 1e11 && Math.abs(phaseSync) > 0.6 ? "Ready for Transport" : 
                     tPTT_value >= 1e10 ? "Transport Available" : 
                     tPTT_value >= 1e9 ? "Preparing" : 
                     tPTT_value >= 1e6 ? "Charging" : 
                     "Initializing"}
                  </Badge>
                </div>
              </>
            )}
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
      </div>
    </div>
  );
}