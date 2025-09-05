import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { validateTLM } from '@/lib/temporalCalculator';

interface DashboardProps {
  time: number;
  e_t: number;
  tPTT_value: number;
  rippel: string;
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Temporal Metrics */}
      <Card className="hologram-border blurrn-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            TLGF GOFC
            <Badge variant={isValidTLM ? "default" : "destructive"} className="blurrn-glow">
              Q 95 Is 7AM
            </Badge>
          </CardTitle>
          <CardDescription className="text-foreground/70">Destho QavV (Influancia)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-foreground/70">CONCAT</span>
            <span className="font-mono text-primary blurrn-glow">{time.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/70">5Os35</span>
            <span className="font-mono text-secondary">{phi.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/70">LS{e_t.toFixed(0)} ls25</span>
            <span className="font-mono text-accent">{e_t.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/70">Avoi</span>
            <span className="font-mono text-primary">{lightWave.toFixed(3)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Chrono-Transport Status */}
      <Card className="hologram-border blurrn-glow">
        <CardHeader>
          <CardTitle className="text-primary">SUNISFQTER</CardTitle>
          <CardDescription className="text-foreground/70">SELUCT</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-foreground/70">Huml</span>
            <span className="font-mono text-primary blurrn-glow">{tPTT_value.toExponential(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/70">Siqt</span>
            <span className="font-mono text-secondary">{phaseSync.toFixed(3)}</span>
          </div>
          <div className="mt-4 p-3 hologram-border bg-card/30 rounded-lg">
            <div className="text-xs text-foreground/60 mb-1">CONTROLS</div>
            <Badge variant={tPTT_value > 1e12 ? "default" : "secondary"} className="blurrn-glow">
              {tPTT_value > 1e12 ? "Dsnet" : "Engapi"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Rippel Generator */}
      <Card className="md:col-span-2 lg:col-span-1 hologram-border blurrn-glow">
        <CardHeader>
          <CardTitle className="text-primary">Saralaz</CardTitle>
          <CardDescription className="text-foreground/70">Vicllu Hxrts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 hologram-border bg-card/20 rounded-lg font-mono text-sm text-primary blurrn-glow">
            {rippel}
          </div>
          <div className="mt-4 text-xs text-foreground/60">
            Evergist Gasane ssom
          </div>
        </CardContent>
      </Card>

      {/* Phase Visualization */}
      <Card className="md:col-span-2 lg:col-span-3 hologram-border blurrn-glow">
        <CardHeader>
          <CardTitle className="text-primary">Som</CardTitle>
          <CardDescription className="text-foreground/70">Dacng Salucal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            {phases.map((phase, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-mono mb-3 text-primary blurrn-glow">
                  {(phase % (2 * Math.PI)).toFixed(2)}
                </div>
                <div className="text-sm text-foreground/70 mb-3">
                  Core {i + 1}
                </div>
                <div className="w-full hologram-border rounded-full h-3 mt-2 bg-card/20">
                  <div 
                    className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-100 blurrn-glow"
                    style={{ width: `${((phase % (2 * Math.PI)) / (2 * Math.PI)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}