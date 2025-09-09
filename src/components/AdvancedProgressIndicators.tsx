import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Zap, Target, Gauge } from 'lucide-react';

interface AdvancedProgressIndicatorsProps {
  e_t: number;
  targetE_t: number;
  transportReadiness: number;
  phaseCoherence: number;
  neuralSync: number;
  energyMomentum: number;
  etaSeconds?: number;
  isTransporting?: boolean;
  transportProgress?: number;
}

export const AdvancedProgressIndicators = ({
  e_t,
  targetE_t,
  transportReadiness,
  phaseCoherence,
  neuralSync,
  energyMomentum,
  etaSeconds,
  isTransporting = false,
  transportProgress = 0
}: AdvancedProgressIndicatorsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Ring progress drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;  
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const size = Math.min(rect.width, rect.height);
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const baseRadius = size / 2 - 20;

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Ring configuration
    const rings = [
      { 
        value: e_t / targetE_t * 100, 
        radius: baseRadius - 0, 
        width: 8, 
        color: e_t < targetE_t * 0.5 ? '#ef4444' : e_t < targetE_t * 0.8 ? '#f59e0b' : '#10b981',
        label: 'Energy'
      },
      { 
        value: transportReadiness, 
        radius: baseRadius - 15, 
        width: 6, 
        color: transportReadiness < 50 ? '#ef4444' : transportReadiness < 80 ? '#f59e0b' : '#10b981',
        label: 'Readiness'
      },
      { 
        value: phaseCoherence, 
        radius: baseRadius - 28, 
        width: 5, 
        color: phaseCoherence < 50 ? '#ef4444' : phaseCoherence < 80 ? '#f59e0b' : '#10b981',
        label: 'Phase'
      },
      { 
        value: neuralSync, 
        radius: baseRadius - 38, 
        width: 4, 
        color: neuralSync < 50 ? '#ef4444' : neuralSync < 80 ? '#f59e0b' : '#10b981',
        label: 'Neural'
      }
    ];

    // Draw rings
    rings.forEach((ring) => {
      const { value, radius, width, color } = ring;
      
      // Background circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = width;
      ctx.stroke();

      // Progress arc
      const startAngle = -Math.PI / 2; // Start at top
      const endAngle = startAngle + (value / 100) * 2 * Math.PI;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Glow effect for high values
      if (value > 80) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });

    // Center text
    ctx.fillStyle = '#f3f4f6';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (isTransporting) {
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('TRANSPORT', centerX, centerY - 8);
      ctx.font = '14px sans-serif';
      ctx.fillText(`${transportProgress}%`, centerX, centerY + 8);
    } else {
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`${Math.round(transportReadiness)}%`, centerX, centerY - 8);
      ctx.font = '12px sans-serif';
      ctx.fillText('READY', centerX, centerY + 8);
    }

    // Momentum indicator (pulsing effect)
    if (energyMomentum > 0.1) {
      const momentumRadius = baseRadius + 10;
      const alpha = 0.3 + (energyMomentum * 0.7);
      
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(centerX, centerY, momentumRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

  }, [e_t, targetE_t, transportReadiness, phaseCoherence, neuralSync, energyMomentum, isTransporting, transportProgress]);

  const getStatusColor = (value: number) => {
    if (value >= 80) return 'text-green-600';
    if (value >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (value: number) => {
    if (value >= 90) return { variant: 'default' as const, text: 'OPTIMAL' };
    if (value >= 80) return { variant: 'default' as const, text: 'GOOD' };
    if (value >= 60) return { variant: 'secondary' as const, text: 'FAIR' };
    if (value >= 40) return { variant: 'outline' as const, text: 'LOW' };
    return { variant: 'destructive' as const, text: 'CRITICAL' };
  };

  const formatETA = (seconds?: number) => {
    if (!seconds || seconds <= 0) return "Ready";
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
    return `${Math.ceil(seconds / 3600)}h`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          System Status Overview
          <Badge variant={getStatusBadge(transportReadiness).variant}>
            {getStatusBadge(transportReadiness).text}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ring Progress Display */}
        <div className="flex justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-48 h-48"
              style={{ width: '192px', height: '192px' }}
            />
            {energyMomentum > 0.3 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="animate-pulse text-blue-400">
                  <Activity className="h-6 w-6" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ring Legend */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Energy Level</span>
            </div>
            <span className={`font-mono font-bold ${getStatusColor((e_t / targetE_t) * 100)}`}>
              {((e_t / targetE_t) * 100).toFixed(0)}%
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Transport Ready</span>
            </div>
            <span className={`font-mono font-bold ${getStatusColor(transportReadiness)}`}>
              {transportReadiness.toFixed(0)}%
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>Phase Coherence</span>
            </div>
            <span className={`font-mono font-bold ${getStatusColor(phaseCoherence)}`}>
              {phaseCoherence.toFixed(0)}%
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>Neural Sync</span>
            </div>
            <span className={`font-mono font-bold ${getStatusColor(neuralSync)}`}>
              {neuralSync.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Linear Progress Bars for Details */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Energy to Target</span>
              <span>{e_t.toFixed(3)} / {targetE_t.toFixed(3)}</span>
            </div>
            <Progress value={(e_t / targetE_t) * 100} className="h-2" />
          </div>

          {isTransporting && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Transport Progress</span>
                <span>{transportProgress}%</span>
              </div>
              <Progress value={transportProgress} className="h-3 bg-primary/20" />
            </div>
          )}
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 bg-muted rounded text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-3 w-3" />
              <span className="text-muted-foreground">ETA</span>
            </div>
            <div className="font-mono font-bold">
              {formatETA(etaSeconds)}
            </div>
          </div>
          
          <div className="p-2 bg-muted rounded text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="h-3 w-3" />
              <span className="text-muted-foreground">Momentum</span>
            </div>
            <div className="font-mono font-bold">
              {(energyMomentum * 100).toFixed(0)}%
            </div>
          </div>
          
          <div className="p-2 bg-muted rounded text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity className="h-3 w-3" />
              <span className="text-muted-foreground">Overall</span>
            </div>
            <div className="font-mono font-bold">
              {Math.round((transportReadiness + phaseCoherence + neuralSync) / 3)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};