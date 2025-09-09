import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TemporalControls } from './TemporalControls';
import { SpectrumData } from '@/types/sdss';

interface DashboardControlsProps {
  // Temporal control props
  isPlaying: boolean;
  onPlayPause: () => void;
  updateInterval: number;
  onIntervalChange: (interval: number) => void;
  animationMode: 'realtime' | 'observation' | 'analysis';
  onModeChange: (mode: 'realtime' | 'observation' | 'analysis') => void;
  stellarTimestamp: string;
  spectrumData: SpectrumData | null;
  nextUpdateIn: number;
  phases: number[];
}

export function DashboardControls({ 
  isPlaying,
  onPlayPause,
  updateInterval,
  onIntervalChange,
  animationMode,
  onModeChange,
  stellarTimestamp,
  spectrumData,
  nextUpdateIn,
  phases
}: DashboardControlsProps) {
  
  return (
    <div className="space-y-6">
      {/* Temporal Controls - Full Width */}
      <TemporalControls
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
        updateInterval={updateInterval}
        onIntervalChange={onIntervalChange}
        animationMode={animationMode}
        onModeChange={onModeChange}
        stellarTimestamp={stellarTimestamp}
        spectrumData={spectrumData}
        nextUpdateIn={nextUpdateIn}
      />

      {/* Phase Visualization */}
      <Card>
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
  );
}