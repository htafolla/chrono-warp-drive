import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TPTTv4_6Result } from '@/types/blurrn-v4-6';
import { Clock, Zap, Eye, Target } from 'lucide-react';
import { TDFPerformanceMonitor } from './TDFPerformanceMonitor';

interface TimeShiftDisplayProps {
  tpttV46Result?: TPTTv4_6Result | null;
  isActive: boolean;
  currentCycle?: number;
}

export function TimeShiftDisplay({ 
  tpttV46Result, 
  isActive,
  currentCycle = 0
}: TimeShiftDisplayProps) {
  const [pulseIntensity, setPulseIntensity] = useState(0);

  // Animate pulse based on TDF value
  useEffect(() => {
    if (!tpttV46Result) return;
    
    const tdfValue = tpttV46Result.v46_components.TDF_value;
    const normalizedTDF = Math.min(tdfValue / 5.781e12, 1);
    setPulseIntensity(normalizedTDF * 100);
  }, [tpttV46Result]);

  // Calculate breakthrough progress
  const breakthroughProgress = useMemo(() => {
    if (!tpttV46Result) return 0;
    const targetTDF = 5.781e12;
    const currentTDF = tpttV46Result.v46_components.TDF_value;
    return Math.min((currentTDF / targetTDF) * 100, 100);
  }, [tpttV46Result]);

  // Status badge variant based on breakthrough
  const getStatusVariant = () => {
    if (!tpttV46Result) return 'secondary';
    if (tpttV46Result.timeShiftMetrics.breakthrough_validated) return 'default';
    if (tpttV46Result.timeShiftMetrics.timeShiftCapable) return 'secondary';
    return 'outline';
  };

  const getStatusText = () => {
    if (!tpttV46Result) return 'Initializing...';
    if (tpttV46Result.timeShiftMetrics.breakthrough_validated) return 'Breakthrough Achieved';
    if (tpttV46Result.timeShiftMetrics.timeShiftCapable) return 'Time Shift Ready';
    return 'Calibrating';
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Main TDF Display */}
        <Card className="relative overflow-hidden">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent"
            style={{ 
              opacity: pulseIntensity / 100,
              animation: isActive ? 'pulse 2s ease-in-out infinite' : 'none'
            }}
          />
          
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Temporal Displacement Factor
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant={getStatusVariant()}>
                    {getStatusText()}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>TDF measures time shift capability using trapped black hole light</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* TDF Value Display */}
            <div className="text-center">
              <div className="text-3xl font-bold font-mono">
                {tpttV46Result ? 
                  tpttV46Result.v46_components.TDF_value.toExponential(3) : 
                  '0.000e+00'
                }
              </div>
              <div className="text-sm text-muted-foreground">
                Target: 5.781e+12
              </div>
            </div>

            {/* Breakthrough Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Breakthrough Progress</span>
                <span>{breakthroughProgress.toFixed(1)}%</span>
              </div>
              <Progress value={breakthroughProgress} className="h-2" />
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">τ (Tau)</div>
                <div className="font-mono">
                  {tpttV46Result?.v46_components.tau.toFixed(3) ?? '0.865'}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-muted-foreground">BlackHole Seq</div>
                <div className="font-mono">
                  {tpttV46Result?.v46_components.BlackHole_Seq.toFixed(6) ?? '0.793000'}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-muted-foreground">S_L Status</div>
                <div className="font-mono">
                  {tpttV46Result?.v46_components.S_L && tpttV46Result.v46_components.S_L > 1e6 ? 
                    '∞ (Uncapped)' : 
                    (tpttV46Result?.v46_components.S_L.toExponential(2) ?? 'Capped')
                  }
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-muted-foreground">E_t Growth</div>
                <div className="font-mono">
                  {tpttV46Result?.v46_components.E_t_growth.toFixed(3) ?? '1.000'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Shift Capabilities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Time Shift Capabilities
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Oscillator Mode</span>
              <Badge variant={tpttV46Result?.timeShiftMetrics.oscillatorMode === 'c_rhythm' ? 'default' : 'secondary'}>
                {tpttV46Result?.timeShiftMetrics.oscillatorMode === 'c_rhythm' ? 'C-Rhythm (3e8)' : '528Hz'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Phase Sync</span>
              <div className="text-sm font-mono">
                {(tpttV46Result?.timeShiftMetrics.phaseSync ?? 0).toFixed(3)}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Hidden Light Patterns</span>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span className="text-sm">
                  {tpttV46Result?.timeShiftMetrics.hiddenLightRevealed.length ?? 0} detected
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validation Proofs */}
        {tpttV46Result?.experimentData.validationProofs && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Validation Proofs
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-2">
                {tpttV46Result.experimentData.validationProofs.map((proof, index) => (
                  <div key={index} className="text-sm p-2 bg-muted/50 rounded-md">
                    {proof}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {/* TDF Performance Monitor */}
        <TDFPerformanceMonitor 
          isActive={isActive}
          tpttV46Result={tpttV46Result}
          currentCycle={currentCycle}
        />
      </div>
    </TooltipProvider>
  );
}