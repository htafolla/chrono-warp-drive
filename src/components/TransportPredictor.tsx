import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Target, Clock, TrendingUp, Zap } from 'lucide-react';

interface TransportPredictorProps {
  e_t: number;
  targetE_t: number;
  tPTT_value: number;
  adaptiveThreshold: number;
  energyGrowthRate: number;
  energyMomentum: number;
  neuralBoost: number;
  spectrumBoost: number;
  fractalBonus: number;
  phaseCoherence: number;
  neuralSync: number;
  energyTrend: 'increasing' | 'decreasing' | 'stable';
  updateInterval: number;
  lastEnergyValues: number[];
}

interface PredictionMetrics {
  etaToReady: number;
  etaToTarget: number;
  successProbability: number;
  optimalWindowStart: number;
  optimalWindowEnd: number;
  riskFactors: string[];
  confidenceLevel: number;
  projectedEfficiency: number;
}

export const TransportPredictor = ({
  e_t,
  targetE_t,
  tPTT_value,
  adaptiveThreshold,
  energyGrowthRate,
  energyMomentum,
  neuralBoost,
  spectrumBoost,
  fractalBonus,
  phaseCoherence,
  neuralSync,
  energyTrend,
  updateInterval,
  lastEnergyValues
}: TransportPredictorProps) => {

  const predictions: PredictionMetrics = useMemo(() => {
    // Calculate current effective growth rate
    const totalMultiplier = 1 + neuralBoost + spectrumBoost + fractalBonus + energyMomentum * 0.1;
    const effectiveGrowthPerSecond = 0.001 * energyGrowthRate * totalMultiplier * (1000 / updateInterval);
    
    // ETA calculations
    const etaToTarget = targetE_t > e_t ? (targetE_t - e_t) / effectiveGrowthPerSecond : 0;
    
    // Transport readiness threshold calculation
    const currentReadiness = tPTT_value >= adaptiveThreshold ? 100 : 
      Math.max(0, (Math.log10(Math.max(tPTT_value, 1)) - Math.log10(adaptiveThreshold)) * 20 + 50);
    
    const etaToReady = currentReadiness >= 80 ? 0 : 
      Math.max(0, (80 - currentReadiness) / (effectiveGrowthPerSecond * 10)); // Rough estimate

    // Success probability calculation (0-100%)
    let successProbability = 0;
    
    // Base probability from energy level
    const energyScore = Math.min(e_t / targetE_t, 1) * 30;
    
    // tPTT readiness score
    const tpttScore = Math.min(currentReadiness / 100, 1) * 25;
    
    // Phase coherence score
    const phaseScore = (phaseCoherence / 100) * 20;
    
    // Neural synchronization score
    const neuralScore = (neuralSync / 100) * 15;
    
    // System optimization score
    const optimizationScore = (totalMultiplier - 1) * 10;
    
    successProbability = Math.min(100, energyScore + tpttScore + phaseScore + neuralScore + optimizationScore);

    // Optimal transport window (when success probability is highest)
    const optimalWindowStart = Math.max(0, etaToReady - 30); // 30 seconds before ready
    const optimalWindowEnd = etaToReady + 120; // 2 minutes after ready

    // Risk factor analysis
    const riskFactors: string[] = [];
    if (energyTrend === 'decreasing') riskFactors.push('Energy level decreasing');
    if (phaseCoherence < 70) riskFactors.push('Low phase coherence');
    if (neuralSync < 70) riskFactors.push('Neural desynchronization');
    if (energyGrowthRate < 2) riskFactors.push('Slow energy growth rate');
    if (!fractalBonus) riskFactors.push('Fractal enhancement disabled');
    if (e_t > targetE_t * 0.9) riskFactors.push('Approaching energy saturation');
    if (totalMultiplier < 2) riskFactors.push('Low system optimization');

    // Confidence level based on data quality
    let confidenceLevel = 95;
    if (lastEnergyValues.length < 5) confidenceLevel -= 20;
    if (energyTrend === 'stable' && effectiveGrowthPerSecond < 0.0001) confidenceLevel -= 15;
    if (riskFactors.length > 3) confidenceLevel -= 10;
    confidenceLevel = Math.max(50, confidenceLevel);

    // Projected transport efficiency
    const baseEfficiency = Math.min(successProbability / 100, 1);
    const stabilityBonus = fractalBonus > 0 ? 0.1 : 0;
    const optimizationBonus = (totalMultiplier - 1) * 0.05;
    const projectedEfficiency = Math.min(1, baseEfficiency + stabilityBonus + optimizationBonus) * 100;

    return {
      etaToReady: Math.max(0, etaToReady),
      etaToTarget: Math.max(0, etaToTarget),
      successProbability: Math.max(0, Math.min(100, successProbability)),
      optimalWindowStart,
      optimalWindowEnd,
      riskFactors,
      confidenceLevel,
      projectedEfficiency
    };
  }, [
    e_t, targetE_t, tPTT_value, adaptiveThreshold, energyGrowthRate, energyMomentum,
    neuralBoost, spectrumBoost, fractalBonus, phaseCoherence, neuralSync,
    energyTrend, updateInterval, lastEnergyValues
  ]);

  const formatTime = (seconds: number) => {
    if (seconds === 0) return "Ready";
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
    return `${Math.ceil(seconds / 3600)}h`;
  };

  const getSuccessColor = (probability: number) => {
    if (probability >= 80) return 'text-green-600';
    if (probability >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceVariant = (level: number): "default" | "secondary" | "destructive" | "outline" => {
    if (level >= 90) return 'default';
    if (level >= 75) return 'secondary';
    if (level >= 60) return 'outline';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Transport Readiness Predictor
          <Badge variant={getConfidenceVariant(predictions.confidenceLevel)}>
            {predictions.confidenceLevel}% Confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success Probability */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Transport Success Probability</span>
            <span className={`text-lg font-bold ${getSuccessColor(predictions.successProbability)}`}>
              {predictions.successProbability.toFixed(1)}%
            </span>
          </div>
          <Progress value={predictions.successProbability} className="h-3" />
          <div className="text-xs text-muted-foreground">
            Projected efficiency: {predictions.projectedEfficiency.toFixed(1)}%
          </div>
        </div>

        {/* ETA Predictions */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">ETA to Ready</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatTime(predictions.etaToReady)}
            </div>
            <div className="text-xs text-muted-foreground">
              Transport available
            </div>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium">ETA to Target</span>
            </div>
            <div className="text-2xl font-bold text-secondary">
              {formatTime(predictions.etaToTarget)}
            </div>
            <div className="text-xs text-muted-foreground">
              Optimal energy level
            </div>
          </div>
        </div>

        {/* Optimal Transport Window */}
        <div className="p-3 bg-primary/10 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Optimal Transport Window</span>
          </div>
          <div className="text-sm">
            {predictions.optimalWindowStart === 0 ? "Now" : formatTime(predictions.optimalWindowStart)} - {formatTime(predictions.optimalWindowEnd)}
          </div>
          <div className="text-xs text-muted-foreground">
            Peak efficiency period for transport execution
          </div>
        </div>

        {/* Risk Factors */}
        {predictions.riskFactors.length > 0 && (
          <Alert variant={predictions.riskFactors.length > 2 ? 'destructive' : 'default'}>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">Risk Factors Detected:</div>
              <ul className="text-xs space-y-1">
                {predictions.riskFactors.map((risk, index) => (
                  <li key={index}>• {risk}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Prediction Metrics */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="p-2 bg-muted rounded text-center">
            <div className="text-muted-foreground">Energy</div>
            <div className="font-bold">{Math.min(e_t / targetE_t * 100, 100).toFixed(0)}%</div>
          </div>
          <div className="p-2 bg-muted rounded text-center">
            <div className="text-muted-foreground">tPTT</div>
            <div className="font-bold">{Math.min(tPTT_value / adaptiveThreshold * 100, 100).toFixed(0)}%</div>
          </div>
          <div className="p-2 bg-muted rounded text-center">
            <div className="text-muted-foreground">Phase</div>
            <div className="font-bold">{phaseCoherence.toFixed(0)}%</div>
          </div>
          <div className="p-2 bg-muted rounded text-center">
            <div className="text-muted-foreground">Neural</div>
            <div className="font-bold">{neuralSync.toFixed(0)}%</div>
          </div>
        </div>

        {/* Recommendation */}
        {predictions.successProbability < 75 && (
          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Optimization Recommended:</strong><br/>
              Transport success probability is below 75%. Consider increasing energy growth rate, 
              enabling fractal enhancement, or selecting a higher-energy spectrum before attempting transport.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};