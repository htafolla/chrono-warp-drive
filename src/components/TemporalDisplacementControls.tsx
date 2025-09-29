import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BlurrnV46Config } from '@/types/blurrn-v4-6';
import { Settings, Zap, Radio, HelpCircle } from 'lucide-react';

interface TemporalDisplacementControlsProps {
  config: BlurrnV46Config;
  onConfigChange: (newConfig: Partial<BlurrnV46Config>) => void;
  isTimeShiftActive: boolean;
  onToggleTimeShift: () => void;
  onRunExperiment: () => void;
  isExperimentRunning: boolean;
}

export function TemporalDisplacementControls({
  config,
  onConfigChange,
  isTimeShiftActive,
  onToggleTimeShift,
  onRunExperiment,
  isExperimentRunning
}: TemporalDisplacementControlsProps) {
  
  const handleGrowthRateChange = (value: number[]) => {
    onConfigChange({ growth_rate_multiplier: value[0] });
  };

  const handleTauChange = (value: number[]) => {
    onConfigChange({ tau: value[0] });
  };

  const handleOscillatorToggle = (useVibration: boolean) => {
    onConfigChange({ 
      oscillator_frequency: useVibration ? 3e8 : 528 
    });
  };

  const isVibrationMode = config.oscillator_frequency === 3e8;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Temporal Displacement Controls
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Time Shift Activation */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Zap className={`w-5 h-5 ${isTimeShiftActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <div className="font-medium">Time Shift Mode</div>
                <div className="text-sm text-muted-foreground">
                  Activate TDF calculations for temporal displacement
                </div>
              </div>
            </div>
            <Switch
              checked={isTimeShiftActive}
              onCheckedChange={onToggleTimeShift}
            />
          </div>

          {/* Growth Rate Multiplier */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">E_t Growth Rate</label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Controls entropy growth rate (0.5-10)</p>
                  <p>Higher values increase temporal energy faster</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="space-y-2">
              <Slider
                value={[config.growth_rate_multiplier]}
                onValueChange={handleGrowthRateChange}
                min={0.5}
                max={10}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.5x</span>
                <span className="font-mono">{config.growth_rate_multiplier.toFixed(1)}x</span>
                <span>10x</span>
              </div>
            </div>
          </div>

          {/* Tau (Time Dilation) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">τ (Time Dilation)</label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Time dilation factor for TDF calculations</p>
                  <p>Optimal: 0.8-0.9 for light capture, 1.2-1.5 for advanced exploration</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="space-y-2">
            <Slider
              value={[config.tau]}
              onValueChange={handleTauChange}
              min={0.5}
              max={1.5}
              step={0.001}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.500</span>
              <span className="font-mono">{config.tau.toFixed(3)}</span>
              <span>1.500</span>
            </div>
            </div>
          </div>

          {/* Oscillator Mode */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4" />
              <label className="text-sm font-medium">Oscillator Mode</label>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-sm font-medium">
                    {isVibrationMode ? 'C-Rhythm (Light Speed)' : '528Hz Harmonic'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isVibrationMode ? '3×10⁸ Hz - For TDF breakthrough' : '528 Hz - Traditional harmonic'}
                  </div>
                </div>
                <Badge variant={isVibrationMode ? 'default' : 'secondary'}>
                  {isVibrationMode ? 'Advanced' : 'Standard'}
                </Badge>
              </div>
              <Switch
                checked={isVibrationMode}
                onCheckedChange={handleOscillatorToggle}
              />
            </div>
          </div>

          {/* Experiment Controls */}
          <div className="pt-4 border-t">
            <Button 
              onClick={onRunExperiment}
              disabled={isExperimentRunning || !isTimeShiftActive}
              className="w-full"
              variant={isTimeShiftActive ? 'default' : 'outline'}
            >
              {isExperimentRunning ? 'Running Experiment...' : 'Run TDF Experiment'}
            </Button>
            
            {!isTimeShiftActive && (
              <div className="text-xs text-muted-foreground mt-2 text-center">
                Enable Time Shift Mode to run experiments
              </div>
            )}
          </div>

          {/* Current Configuration Summary */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="text-sm font-medium">Configuration Summary</div>
            <div className="text-xs space-y-1">
              <div>Growth Rate: {config.growth_rate_multiplier.toFixed(1)}x</div>
              <div>τ (Tau): {config.tau.toFixed(3)}</div>
              <div>Frequency: {isVibrationMode ? '3e8 Hz' : '528 Hz'}</div>
              <div>Ethics Threshold: {config.ethics_score_threshold.toFixed(1)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}