import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Gauge, Target, AlertTriangle, CheckCircle } from 'lucide-react';
import { SpectrumData } from '@/types/sdss';

interface AdaptiveTPTTCalibratorProps {
  tPTT_value: number;
  spectrumData?: SpectrumData | null;
  neuralConfidence: number;
  adaptiveThreshold: number;
  transportReadiness: number;
  isOptimal: boolean;
}

export const AdaptiveTPTTCalibrator = ({
  tPTT_value,
  spectrumData,
  neuralConfidence,
  adaptiveThreshold,
  transportReadiness,
  isOptimal
}: AdaptiveTPTTCalibratorProps) => {
  
  // Calculate spectrum-specific thresholds
  const getSpectrumThreshold = () => {
    if (!spectrumData?.metadata) return 1e10; // Default threshold
    
    const isHighEnergy = spectrumData.source === 'STELLAR_LIBRARY';
    const hasRealData = spectrumData.metadata.distance && spectrumData.metadata.emissionAge;
    
    if (isHighEnergy && hasRealData) {
      // O/B type stars get lower thresholds
      if (spectrumData.metadata.distance && spectrumData.metadata.distance < 100) {
        return 1e8; // Nearby high-energy stars
      }
      return 5e8; // Distant high-energy stars
    }
    
    if (spectrumData.source === 'SDSS') {
      return 2e9; // Cosmic objects need more energy
    }
    
    return 1e9; // Default for synthetic spectra
  };

  const baseThreshold = getSpectrumThreshold();
  const neuralMultiplier = 0.5 + (neuralConfidence * 0.5); // 0.5-1.0 range
  const finalThreshold = baseThreshold * neuralMultiplier;

  // Calculate logarithmic readiness percentage
  const logReadiness = tPTT_value <= 0 ? 0 : 
    Math.max(0, Math.min(100, (Math.log10(tPTT_value) - Math.log10(finalThreshold)) * 20 + 50));

  const thresholdRatio = tPTT_value / finalThreshold;
  const isReady = thresholdRatio >= 1;

  const getStatusColor = () => {
    if (thresholdRatio >= 1) return "default";
    if (thresholdRatio >= 0.8) return "secondary";
    return "destructive";
  };

  const getSpectrumTypeDescription = () => {
    if (!spectrumData) return "No spectrum selected";
    
    const source = spectrumData.source;
    const hasDistance = spectrumData.metadata?.distance;
    
    if (source === 'STELLAR_LIBRARY' && hasDistance) {
      const distance = spectrumData.metadata!.distance!;
      if (distance < 50) return "Nearby Star (High Energy)";
      if (distance < 500) return "Local Star (Medium Energy)";
      return "Distant Star (Standard Energy)";
    }
    
    if (source === 'SDSS') return "Cosmic Object (High Threshold)";
    return "Synthetic Spectrum (Standard)";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Adaptive tPTT Calibrator
          <Badge variant={getStatusColor()}>
            {isReady ? "READY" : "CHARGING"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current tPTT Status */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">tPTT Energy Level</span>
            <span className="text-sm font-mono">{tPTT_value.toExponential(2)}</span>
          </div>
          <Progress value={logReadiness} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Threshold: {finalThreshold.toExponential(1)}</span>
            <span>Ratio: {thresholdRatio.toFixed(2)}x</span>
            <span>Ready: {logReadiness.toFixed(1)}%</span>
          </div>
        </div>

        {/* Spectrum-Based Calibration */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Spectrum Type</span>
            <Badge variant="outline">{getSpectrumTypeDescription()}</Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 bg-muted rounded">
              <div className="text-xs text-muted-foreground">Base Threshold</div>
              <div className="text-sm font-mono">{baseThreshold.toExponential(1)}</div>
            </div>
            <div className="p-2 bg-muted rounded">
              <div className="text-xs text-muted-foreground">Neural Adjustment</div>
              <div className="text-sm font-mono">{neuralMultiplier.toFixed(2)}x</div>
            </div>
          </div>
        </div>

        {/* Adaptive Adjustments */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Active Adjustments</span>
          <div className="space-y-2">
            {spectrumData?.source === 'STELLAR_LIBRARY' && (
              <div className="flex items-center justify-between p-2 bg-green-500/10 rounded">
                <span className="text-xs">High-Energy Star Bonus</span>
                <Badge variant="outline">-80% threshold</Badge>
              </div>
            )}
            
            {neuralConfidence > 0.8 && (
              <div className="flex items-center justify-between p-2 bg-blue-500/10 rounded">
                <span className="text-xs">Neural Confidence Boost</span>
                <Badge variant="outline">-{((1 - neuralMultiplier) * 100).toFixed(0)}% threshold</Badge>
              </div>
            )}
            
            {spectrumData?.metadata?.distance && spectrumData.metadata.distance < 100 && (
              <div className="flex items-center justify-between p-2 bg-yellow-500/10 rounded">
                <span className="text-xs">Proximity Bonus</span>
                <Badge variant="outline">-90% threshold</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Calibration Status */}
        <div className={`p-3 rounded-lg ${isReady ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
          <div className="flex items-center gap-2">
            {isReady ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            )}
            <span className="text-sm font-medium">
              {isReady ? "Transport Ready" : "Energy Charging Required"}
            </span>
          </div>
          
          {!isReady && (
            <div className="text-xs text-muted-foreground mt-1">
              Need {((finalThreshold / tPTT_value) - 1).toFixed(1)}x more energy for transport activation
            </div>
          )}
        </div>

        {/* Optimization Recommendations */}
        {!isOptimal && (
          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Optimization Suggestions:</strong><br/>
              • Try selecting O/B type stars for lower thresholds<br/>
              • Increase neural confidence through better spectrum quality<br/>
              • Enable realtime mode for faster energy accumulation
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};