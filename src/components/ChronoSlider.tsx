import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

interface ChronoSliderProps {
  onChange: (params: { delta_phase: number; n: number }) => void;
  initialDeltaPhase?: number;
  initialN?: number;
}

const ChronoSlider = ({ 
  onChange, 
  initialDeltaPhase = 0.25, 
  initialN = 25 
}: ChronoSliderProps) => {
  const [deltaPhase, setDeltaPhase] = useState(initialDeltaPhase);
  const [cascadeN, setCascadeN] = useState(initialN);

  const handleDeltaChange = (value: number[]) => {
    const newValue = value[0];
    setDeltaPhase(newValue);
    onChange({ delta_phase: newValue, n: cascadeN });
  };

  const handleNChange = (value: number[]) => {
    const newValue = value[0];
    setCascadeN(newValue);
    onChange({ delta_phase: deltaPhase, n: newValue });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Chrono Transport Controls</span>
          <Badge variant="outline" className="font-mono">v4.7</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delta Phase Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="delta-phase" className="text-sm font-medium">
              Delta Phase (δφ)
            </Label>
            <Badge variant="secondary" className="font-mono">
              {deltaPhase.toFixed(3)}
            </Badge>
          </div>
          <Slider
            id="delta-phase"
            min={0.25}
            max={0.3}
            step={0.001}
            value={[deltaPhase]}
            onValueChange={handleDeltaChange}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.250</span>
            <span>Phase Adjustment</span>
            <span>0.300</span>
          </div>
        </div>

        {/* Cascade N Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="cascade-n" className="text-sm font-medium">
              Cascade Enumeration (n)
            </Label>
            <Badge variant="secondary" className="font-mono">
              {cascadeN}
            </Badge>
          </div>
          <Slider
            id="cascade-n"
            min={25}
            max={34}
            step={1}
            value={[cascadeN]}
            onValueChange={handleNChange}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>25</span>
            <span>Dual Black Hole Sync</span>
            <span>34</span>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="rounded-lg bg-muted p-3">
            <div className="text-xs text-muted-foreground">Cascade Range</div>
            <div className="text-lg font-semibold">25-34</div>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <div className="text-xs text-muted-foreground">Target Efficiency</div>
            <div className="text-lg font-semibold">100%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChronoSlider;
