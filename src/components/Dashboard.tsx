import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { validateTLM } from '@/lib/temporalCalculator';

interface DashboardProps {
  time: number;
  e_t: number;
  tPTT_value: number;
  rippel: string | number;
  phi: number;
  lightWave: number;
  phases: number[];
}

export function Dashboard({ 
  time, 
  e_t, 
  tPTT_value, 
  rippel, 
  phi, 
  lightWave, 
  phases 
}: DashboardProps) {
  const isValidTLM = validateTLM(phi);
  const phaseSync = phases.reduce((sum, phase) => sum + Math.cos(phase), 0) / phases.length;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="hologram-border plasma-glow">
        <CardHeader>
          <CardTitle className="text-blurrn-cyan">Energy Core</CardTitle>
          <div className="energy-beam"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Time</span>
              <span className="text-blurrn-glow font-mono">{time.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Phi</span>
              <span className="text-energy-pink font-mono">{phi.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">E_t</span>
              <span className="text-blurrn-magenta font-mono">{e_t.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Light Wave</span>
              <span className="text-neon-purple font-mono">{lightWave.toFixed(3)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hologram-border plasma-glow">
        <CardHeader>
          <CardTitle className="text-blurrn-magenta">Quantum Sync</CardTitle>
          <div className="energy-beam"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">tPTT Value</span>
              <span className="text-blurrn-cyan font-mono">{tPTT_value.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Phase Sync</span>
              <span className="text-energy-pink font-mono">{phaseSync.toFixed(3)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge 
                variant={tPTT_value > 0.5 ? "default" : "secondary"}
                className={tPTT_value > 0.5 ? "bg-blurrn-cyan text-primary-foreground" : "bg-blurrn-magenta text-secondary-foreground"}
              >
                {tPTT_value > 0.5 ? "Active" : "Stable"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hologram-border plasma-glow">
        <CardHeader>
          <CardTitle className="text-energy-pink">Ripple Field</CardTitle>
          <div className="energy-beam"></div>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-3xl font-bold text-blurrn-glow mb-2">
              {typeof rippel === 'string' ? rippel : rippel.toFixed(3)}
            </div>
            <div className="text-sm text-muted-foreground">Wave Amplitude</div>
          </div>
        </CardContent>
      </Card>

      <Card className="hologram-border plasma-glow">
        <CardHeader>
          <CardTitle className="text-neon-purple">Phase Matrix</CardTitle>
          <div className="energy-beam"></div>
        </CardHeader>
        <CardContent className="space-y-3">
          {phases.map((phase, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Phase {index + 1}</span>
                <span>{((phase % (2 * Math.PI)) / (2 * Math.PI) * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full hologram-border rounded-full h-3 bg-card/20">
                <div 
                  className="bg-gradient-to-r from-blurrn-cyan via-blurrn-magenta to-energy-pink h-3 rounded-full transition-all duration-100 blurrn-glow"
                  style={{ width: `${((phase % (2 * Math.PI)) / (2 * Math.PI)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}