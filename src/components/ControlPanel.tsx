import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ISOTOPES, validateTLM, type Isotope } from '@/lib/temporalCalculator';

interface ControlPanelProps {
  phi: number;
  setPhi: (value: number) => void;
  delta_t: number;
  setDelta_t: (value: number) => void;
  e_t: number;
  setE_t: (value: number) => void;
  fractalToggle: boolean;
  setFractalToggle: (value: boolean) => void;
  isotope: Isotope;
  setIsotope: (value: Isotope) => void;
  timeline: number;
  setTimeline: (value: number) => void;
}

export function ControlPanel({
  phi,
  setPhi,
  delta_t,
  setDelta_t,
  e_t,
  setE_t,
  fractalToggle,
  setFractalToggle,
  isotope,
  setIsotope,
  timeline,
  setTimeline
}: ControlPanelProps) {
  const isValidTLM = validateTLM(phi);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Temporal Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Temporal Parameters
            <Badge variant={isValidTLM ? "default" : "destructive"}>
              {isValidTLM ? "Valid" : "Invalid"}
            </Badge>
          </CardTitle>
          <CardDescription>Adjust core TLM parameters for chrono-transport</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phi Control */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Phi (φ) Ratio</label>
              <span className="text-sm text-muted-foreground font-mono">{phi.toFixed(3)}</span>
            </div>
            <Slider
              value={[phi]}
              onValueChange={(values) => setPhi(values[0])}
              min={1.566}
              max={1.766}
              step={0.001}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">
              Valid TLM range: 1.566 - 1.766
            </div>
          </div>

          {/* Delta T Control */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Time Step (Δt)</label>
              <span className="text-sm text-muted-foreground font-mono">{delta_t.toExponential(2)}</span>
            </div>
            <Slider
              value={[Math.log10(delta_t)]}
              onValueChange={(values) => setDelta_t(Math.pow(10, values[0]))}
              min={-7}
              max={-5}
              step={0.1}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">
              Range: 1e-7 to 1e-5 seconds
            </div>
          </div>

          {/* Entropy Control */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Entropy Flux (E_t)</label>
              <span className="text-sm text-muted-foreground font-mono">{e_t.toFixed(3)}</span>
            </div>
            <Slider
              value={[e_t]}
              onValueChange={(values) => setE_t(values[0])}
              min={0.1}
              max={1.0}
              step={0.01}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">
              Lower values increase transport efficiency
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
          <CardDescription>Configure isotopes, fractal mode, and timeline</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Isotope Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Carbon Isotope</label>
            <Select
              value={isotope.type}
              onValueChange={(value) => {
                const selected = ISOTOPES.find(i => i.type === value);
                if (selected) setIsotope(selected);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISOTOPES.map((iso) => (
                  <SelectItem key={iso.type} value={iso.type}>
                    {iso.type} (Factor: {iso.factor})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              Isotope factor affects wave amplitude modulation
            </div>
          </div>

          {/* Fractal Mode Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">5D Fractal Mode</div>
              <div className="text-xs text-muted-foreground">
                Enhanced dimensional calculations
              </div>
            </div>
            <Switch
              checked={fractalToggle}
              onCheckedChange={setFractalToggle}
            />
          </div>

          {/* Timeline Control */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Timeline Position</label>
              <span className="text-sm text-muted-foreground font-mono">{timeline}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimeline(Math.max(0, timeline - 1))}
              >
                ← Previous
              </Button>
              <Button
                variant="outline" 
                size="sm"
                onClick={() => setTimeline(timeline + 1)}
              >
                Next →
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimeline(0)}
              >
                Reset
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Advance through temporal states manually
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Harmonic Resonance */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Harmonic Resonance Controller</CardTitle>
          <CardDescription>528Hz frequency modulation and phase relationships</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">528Hz</div>
              <div className="text-sm text-muted-foreground">Base Frequency</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {fractalToggle ? "5D" : "3D"}
              </div>
              <div className="text-sm text-muted-foreground">Dimensional Mode</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {isotope.factor.toFixed(1)}x
              </div>
              <div className="text-sm text-muted-foreground">Isotope Factor</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}