import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface PerformanceSettings {
  quality: 'high' | 'medium' | 'low';
  autoAdjust: boolean;
  shadows: boolean;
  particles: boolean;
  postProcessing: boolean;
  targetFPS: number;
}

interface PerformanceControllerProps {
  onSettingsChange: (settings: PerformanceSettings) => void;
  currentFPS?: number;
}

export function PerformanceController({ onSettingsChange, currentFPS = 60 }: PerformanceControllerProps) {
  const [settings, setSettings] = useState<PerformanceSettings>({
    quality: 'high',
    autoAdjust: true,
    shadows: true,
    particles: true,
    postProcessing: true,
    targetFPS: 60
  });

  const [fpsHistory, setFpsHistory] = useState<number[]>([]);

  useEffect(() => {
    // Track FPS history for auto-adjustment
    setFpsHistory(prev => {
      const newHistory = [...prev, currentFPS].slice(-30); // Keep last 30 samples
      
      if (settings.autoAdjust && newHistory.length >= 10) {
        const avgFPS = newHistory.reduce((a, b) => a + b, 0) / newHistory.length;
        
        // Auto-adjust quality based on performance
        if (avgFPS < 30 && settings.quality !== 'low') {
          updateSettings({ quality: 'low', shadows: false, particles: false });
        } else if (avgFPS < 45 && settings.quality === 'high') {
          updateSettings({ quality: 'medium', shadows: true, particles: true });
        } else if (avgFPS > 55 && settings.quality === 'low') {
          updateSettings({ quality: 'medium', shadows: true, particles: true });
        } else if (avgFPS > 58 && settings.quality === 'medium') {
          updateSettings({ quality: 'high', shadows: true, particles: true, postProcessing: true });
        }
      }
      
      return newHistory;
    });
  }, [currentFPS, settings.autoAdjust, settings.quality]);

  const updateSettings = (updates: Partial<PerformanceSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const applyPreset = (preset: 'high' | 'medium' | 'low') => {
    const presets = {
      high: {
        quality: 'high' as const,
        shadows: true,
        particles: true,
        postProcessing: true,
        targetFPS: 60
      },
      medium: {
        quality: 'medium' as const,
        shadows: true,
        particles: true,
        postProcessing: false,
        targetFPS: 45
      },
      low: {
        quality: 'low' as const,
        shadows: false,
        particles: false,  
        postProcessing: false,
        targetFPS: 30
      }
    };

    updateSettings(presets[preset]);
  };

  const getPerformanceStatus = () => {
    if (currentFPS >= 55) return { status: 'Excellent', variant: 'default' as const };
    if (currentFPS >= 45) return { status: 'Good', variant: 'secondary' as const };
    if (currentFPS >= 30) return { status: 'Fair', variant: 'outline' as const };
    return { status: 'Poor', variant: 'destructive' as const };
  };

  const performanceStatus = getPerformanceStatus();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          Performance Control
          <Badge variant={performanceStatus.variant}>
            {Math.round(currentFPS)} FPS - {performanceStatus.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quality Presets */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quality Preset</Label>
          <div className="flex gap-2">
            {(['high', 'medium', 'low'] as const).map((preset) => (
              <Button
                key={preset}
                variant={settings.quality === preset ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPreset(preset)}
                className="capitalize"
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>

        {/* Auto Adjustment */}
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-adjust" className="text-sm">Auto Adjust Quality</Label>
          <Switch
            id="auto-adjust"
            checked={settings.autoAdjust}
            onCheckedChange={(checked) => updateSettings({ autoAdjust: checked })}
          />
        </div>

        {/* Individual Settings */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <Label htmlFor="shadows" className="text-sm">Shadows</Label>
            <Switch
              id="shadows"
              checked={settings.shadows}
              onCheckedChange={(checked) => updateSettings({ shadows: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="particles" className="text-sm">Particles</Label>
            <Switch
              id="particles"
              checked={settings.particles}
              onCheckedChange={(checked) => updateSettings({ particles: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="post-processing" className="text-sm">Post Processing</Label>
            <Switch
              id="post-processing"
              checked={settings.postProcessing}
              onCheckedChange={(checked) => updateSettings({ postProcessing: checked })}
            />
          </div>
        </div>

        {/* Performance Info */}
        <div className="text-xs text-muted-foreground pt-2 border-t border-border">
          <p>Target: {settings.targetFPS} FPS</p>
          <p>Current: {Math.round(currentFPS)} FPS</p>
          {fpsHistory.length > 0 && (
            <p>Average: {Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length)} FPS</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}