import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Timer, Calendar, Star } from 'lucide-react';
import { SpectrumData } from '@/types/sdss';

interface TemporalControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  updateInterval: number;
  onIntervalChange: (interval: number) => void;
  animationMode: 'realtime' | 'observation' | 'analysis';
  onModeChange: (mode: 'realtime' | 'observation' | 'analysis') => void;
  stellarTimestamp: string;
  spectrumData: SpectrumData | null;
  nextUpdateIn: number;
}

const INTERVAL_PRESETS = [
  { value: 16, label: '60 FPS', mode: 'realtime' as const },
  { value: 100, label: '10 FPS', mode: 'realtime' as const },
  { value: 500, label: '2 FPS', mode: 'observation' as const },
  { value: 1000, label: '1 FPS', mode: 'observation' as const },
  { value: 2000, label: '0.5 FPS', mode: 'observation' as const },
  { value: 5000, label: '5s', mode: 'observation' as const },
];

export function TemporalControls({
  isPlaying,
  onPlayPause,
  updateInterval,
  onIntervalChange,
  animationMode,
  onModeChange,
  stellarTimestamp,
  spectrumData,
  nextUpdateIn
}: TemporalControlsProps) {
  const [customInterval, setCustomInterval] = useState(updateInterval);

  const formatSpectralType = (spectrum: SpectrumData | null) => {
    if (!spectrum) return 'No spectrum loaded';
    
    if (spectrum.source === 'SYNTHETIC') {
      return 'Synthetic stellar spectrum';
    }
    
    if (spectrum.metadata?.class) {
      return `${spectrum.metadata.class} spectrum`;
    }
    
    return 'Unknown stellar object';
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'realtime': return 'blurrn-wave-blue';
      case 'observation': return 'blurrn-wave-purple';
      case 'analysis': return 'blurrn-wave-green';
      default: return 'muted';
    }
  };

  const getModeDescription = (mode: string) => {
    switch (mode) {
      case 'realtime': return 'Interactive exploration mode';
      case 'observation': return 'Observatory data collection mode';
      case 'analysis': return 'Static analysis mode';
      default: return '';
    }
  };

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-blurrn-wave-blue" />
            <h3 className="text-sm font-medium text-foreground">Temporal Controls</h3>
          </div>
          <Badge 
            variant="outline" 
            className={`text-${getModeColor(animationMode)} border-${getModeColor(animationMode)}/30 bg-${getModeColor(animationMode)}/10`}
          >
            {animationMode.toUpperCase()}
          </Badge>
        </div>

        {/* Play/Pause Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onPlayPause}
            className="flex items-center gap-2 blurrn-energy-beam"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Play
              </>
            )}
          </Button>
          
          {isPlaying && nextUpdateIn > 0 && (
            <div className="text-xs text-muted-foreground">
              Next update: {(nextUpdateIn / 1000).toFixed(1)}s
            </div>
          )}
        </div>

        {/* Animation Mode Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Animation Mode</label>
          <div className="flex gap-2">
            {(['realtime', 'observation', 'analysis'] as const).map((mode) => (
              <Button
                key={mode}
                variant={animationMode === mode ? "default" : "outline"}
                size="sm"
                onClick={() => onModeChange(mode)}
                className={animationMode === mode ? `bg-${getModeColor(mode)} text-${getModeColor(mode)}-foreground` : ''}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {getModeDescription(animationMode)}
          </p>
        </div>

        {/* Interval Controls */}
        {animationMode !== 'analysis' && (
          <div className="space-y-3">
            <label className="text-xs font-medium text-foreground">Update Interval</label>
            
            {/* Preset buttons */}
            <div className="grid grid-cols-3 gap-2">
              {INTERVAL_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={updateInterval === preset.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => onIntervalChange(preset.value)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Custom slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>16ms</span>
                <span>Custom: {customInterval}ms</span>
                <span>10s</span>
              </div>
              <Slider
                value={[customInterval]}
                onValueChange={([value]) => {
                  setCustomInterval(value);
                  onIntervalChange(value);
                }}
                min={16}
                max={10000}
                step={50}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Stellar Information */}
        <div className="space-y-2 pt-2 border-t border-border/30">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-blurrn-accent-gold" />
            <span className="text-xs font-medium text-foreground">Stellar Observation</span>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {stellarTimestamp}
              </span>
            </div>
            
            <div className="text-xs text-blurrn-text-glow">
              {formatSpectralType(spectrumData)}
            </div>
            
            {spectrumData?.metadata?.redshift && (
              <div className="text-xs text-muted-foreground">
                Redshift: z = {spectrumData.metadata.redshift.toFixed(4)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}