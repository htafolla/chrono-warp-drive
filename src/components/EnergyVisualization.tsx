import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, BarChart3, Zap, Target } from 'lucide-react';

interface EnergyDataPoint {
  timestamp: number;
  e_t: number;
  growthRate: number;
  momentum: number;
  multipliers: {
    neural: number;
    spectrum: number;
    fractal: number;
  };
}

interface EnergyVisualizationProps {
  e_t: number;
  energyGrowthRate: number;
  energyMomentum: number;
  targetE_t: number;
  neuralBoost: number;
  spectrumBoost: number;
  fractalBonus: number;
  maxDataPoints?: number;
}

export const EnergyVisualization = ({
  e_t,
  energyGrowthRate,
  energyMomentum,
  targetE_t,
  neuralBoost,
  spectrumBoost,
  fractalBonus,
  maxDataPoints = 100
}: EnergyVisualizationProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [energyHistory, setEnergyHistory] = useState<EnergyDataPoint[]>([]);
  const [viewMode, setViewMode] = useState<'curve' | 'momentum' | 'multipliers'>('curve');
  const [isRecording, setIsRecording] = useState(true);

  // Add new data point
  useEffect(() => {
    if (!isRecording) return;

    const newDataPoint: EnergyDataPoint = {
      timestamp: Date.now(),
      e_t,
      growthRate: energyGrowthRate,
      momentum: energyMomentum,
      multipliers: {
        neural: neuralBoost,
        spectrum: spectrumBoost,
        fractal: fractalBonus
      }
    };

    setEnergyHistory(prev => {
      const updated = [...prev, newDataPoint];
      return updated.slice(-maxDataPoints); // Keep only recent data
    });
  }, [e_t, energyGrowthRate, energyMomentum, neuralBoost, spectrumBoost, fractalBonus, isRecording, maxDataPoints]);

  // Canvas drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || energyHistory.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const padding = 40;

    // Clear canvas
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background');
    ctx.fillRect(0, 0, width, height);

    // Grid and axes
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border');
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i / 10) * (width - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= 10; i++) {
      const y = padding + (i / 10) * (height - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Data ranges
    const minTime = energyHistory[0].timestamp;
    const maxTime = energyHistory[energyHistory.length - 1].timestamp;
    const timeRange = maxTime - minTime || 1;

    let minValue: number, maxValue: number;
    let getDataValue: (point: EnergyDataPoint) => number;

    switch (viewMode) {
      case 'momentum':
        getDataValue = (point) => point.momentum;
        minValue = Math.min(...energyHistory.map(getDataValue));
        maxValue = Math.max(...energyHistory.map(getDataValue));
        break;
      case 'multipliers':
        getDataValue = (point) => point.multipliers.neural + point.multipliers.spectrum + point.multipliers.fractal;
        minValue = Math.min(...energyHistory.map(getDataValue));
        maxValue = Math.max(...energyHistory.map(getDataValue));
        break;
      default: // curve
        getDataValue = (point) => point.e_t;
        minValue = Math.min(...energyHistory.map(getDataValue));
        maxValue = Math.max(targetE_t, Math.max(...energyHistory.map(getDataValue)));
    }

    const valueRange = maxValue - minValue || 1;

    // Draw target line (for E_t curve mode)
    if (viewMode === 'curve') {
      const targetY = height - padding - ((targetE_t - minValue) / valueRange) * (height - 2 * padding);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding, targetY);
      ctx.lineTo(width - padding, targetY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw main curve
    ctx.strokeStyle = viewMode === 'curve' ? '#3b82f6' : 
                     viewMode === 'momentum' ? '#10b981' : '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.beginPath();

    energyHistory.forEach((point, index) => {
      const x = padding + ((point.timestamp - minTime) / timeRange) * (width - 2 * padding);
      const y = height - padding - ((getDataValue(point) - minValue) / valueRange) * (height - 2 * padding);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw additional curves for multipliers mode
    if (viewMode === 'multipliers') {
      const colors = ['#ef4444', '#f59e0b', '#10b981'];
      const getters = [
        (p: EnergyDataPoint) => p.multipliers.neural,
        (p: EnergyDataPoint) => p.multipliers.spectrum,
        (p: EnergyDataPoint) => p.multipliers.fractal
      ];

      getters.forEach((getter, idx) => {
        ctx.strokeStyle = colors[idx];
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        energyHistory.forEach((point, index) => {
          const x = padding + ((point.timestamp - minTime) / timeRange) * (width - 2 * padding);
          const y = height - padding - ((getter(point) - minValue) / valueRange) * (height - 2 * padding);
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      });
    }

    // Draw current value point
    if (energyHistory.length > 0) {
      const lastPoint = energyHistory[energyHistory.length - 1];
      const x = padding + ((lastPoint.timestamp - minTime) / timeRange) * (width - 2 * padding);
      const y = height - padding - ((getDataValue(lastPoint) - minValue) / valueRange) * (height - 2 * padding);
      
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Labels
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--foreground');
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    // Time labels
    ctx.fillText(`${energyHistory.length} points`, width / 2, height - 10);
    
    // Value labels
    ctx.textAlign = 'right';
    ctx.fillText(maxValue.toFixed(3), padding - 5, padding + 5);
    ctx.fillText(minValue.toFixed(3), padding - 5, height - padding + 5);

  }, [energyHistory, viewMode, targetE_t]);

  const getTrendAnalysis = () => {
    if (energyHistory.length < 10) return null;
    
    const recent = energyHistory.slice(-10);
    const older = energyHistory.slice(-20, -10);
    
    if (older.length === 0) return null;

    const recentAvg = recent.reduce((sum, p) => sum + p.e_t, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.e_t, 0) / older.length;
    
    const trend = recentAvg - olderAvg;
    const trendPercent = (trend / olderAvg) * 100;

    return {
      trend: trend > 0.001 ? 'increasing' : trend < -0.001 ? 'decreasing' : 'stable',
      rate: Math.abs(trendPercent),
      timeToTarget: trend > 0 ? Math.max(0, (targetE_t - e_t) / trend) * 100 : Infinity // rough estimate in data points
    };
  };

  const trendAnalysis = getTrendAnalysis();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Energy Flow Visualization
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={viewMode === 'curve' ? 'default' : 'outline'}
              onClick={() => setViewMode('curve')}
            >
              <TrendingUp className="h-3 w-3" />
            </Button>
            <Button
              size="sm" 
              variant={viewMode === 'momentum' ? 'default' : 'outline'}
              onClick={() => setViewMode('momentum')}
            >
              <Zap className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'multipliers' ? 'default' : 'outline'}
              onClick={() => setViewMode('multipliers')}
            >
              <Target className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef} 
            className="w-full h-48 border rounded"
            style={{ width: '100%', height: '192px' }}
          />
          <div className="absolute top-2 left-2">
            <Badge variant="outline">
              {viewMode === 'curve' ? 'E_t Level' :
               viewMode === 'momentum' ? 'Momentum' : 'Multipliers'}
            </Badge>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center">
          <Button
            size="sm"
            variant={isRecording ? 'default' : 'outline'}
            onClick={() => setIsRecording(!isRecording)}
          >
            {isRecording ? 'Recording' : 'Paused'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEnergyHistory([])}
          >
            Clear History
          </Button>
        </div>

        {/* Trend Analysis */}
        {trendAnalysis && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-muted rounded text-center">
              <div className="text-muted-foreground">Trend</div>
              <div className={`font-bold ${
                trendAnalysis.trend === 'increasing' ? 'text-green-600' :
                trendAnalysis.trend === 'decreasing' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trendAnalysis.trend}
              </div>
            </div>
            <div className="p-2 bg-muted rounded text-center">
              <div className="text-muted-foreground">Rate</div>
              <div className="font-mono font-bold">
                {trendAnalysis.rate.toFixed(1)}%
              </div>
            </div>
            <div className="p-2 bg-muted rounded text-center">
              <div className="text-muted-foreground">ETA</div>
              <div className="font-mono font-bold">
                {trendAnalysis.timeToTarget === Infinity ? '∞' : 
                 `${Math.ceil(trendAnalysis.timeToTarget)}s`}
              </div>
            </div>
          </div>
        )}

        {/* Legend for multipliers mode */}
        {viewMode === 'multipliers' && (
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Neural</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Spectrum</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Fractal</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};