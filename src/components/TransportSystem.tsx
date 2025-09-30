import { useState, useMemo, useRef, useEffect } from 'react';
import { useThrottledMemo } from '@/hooks/useThrottledMemo';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Target, MapPin, Clock, AlertTriangle, CheckCircle, Rocket, Activity, Wifi, Radio, Gauge } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Isotope, calculatePhaseCoherence } from '@/lib/temporalCalculator';
import { generateStellarTimestamp } from '@/lib/stellarTimestamp';
import { TransportSequenceVerification } from './TransportSequenceVerification';
import { EnergyAccelerator } from './EnergyAccelerator';
import { AdaptiveTPTTCalibrator } from './AdaptiveTPTTCalibrator';
import { deterministicRandom, generateCycle } from '@/lib/deterministicUtils';
import { SpectrumIntelligence } from './SpectrumIntelligence';
import { TransportReadinessDisplay } from './TransportReadinessDisplay';
import { TransportAnalytics } from './TransportAnalytics';
import { SpectrumData, TPTTv4Result } from '@/types/sdss';

interface TransportResult {
  id: string;
  timestamp: Date;
  originCoords: { ra: number; dec: number; z: number };
  destinationCoords: { ra: number; dec: number; z: number };
  transportEfficiency: number;
  energyConsumption: number;
  temporalStability: number;
  neuralSyncScore: number;
  rippelHarmonics: string;
  status: 'success' | 'partial' | 'failed';
  anomalies: string[];
  temporalDestination?: {
    targetMJD: number;
    targetUTC: Date;
    temporalOffset: number;
    yearsAgo?: number;
    emissionEra?: string;
    lightTravelTimeYears?: number;
  };
}

interface TransportSystemProps {
  tPTT_value: number;
  phases: number[];
  e_t: number;
  neuralOutput?: TPTTv4Result['neuralOutput'];
  rippel: string;
  isotope: Isotope;
  fractalToggle: boolean;
  spectrumData?: SpectrumData | null;
  
  // Enhanced energy system props
  energyGrowthRate: number;
  onEnergyGrowthRateChange: (rate: number) => void;
  targetE_t: number;
  onTargetE_tChange: (target: number) => void;
  isRealtime: boolean;
  onRealtimeToggle: () => void;
  energyMomentum: number;
  
  // Enhanced metrics
  neuralBoost: number;
  spectrumBoost: number;
  fractalBonus: number;
  adaptiveThreshold: number;
  logReadiness: number;
  etaToReady: number;
  energyTrend: 'increasing' | 'decreasing' | 'stable';
  optimizations: string[];
  isOptimal: boolean;
  
  // Callbacks
  onOptimizedSpectrumSelect: (type: string) => void;
}

export const TransportSystem = ({
  tPTT_value,
  phases,
  e_t,
  neuralOutput,
  rippel,
  isotope,
  fractalToggle,
  spectrumData,
  energyGrowthRate,
  onEnergyGrowthRateChange,
  targetE_t,
  onTargetE_tChange,
  isRealtime,
  onRealtimeToggle,
  energyMomentum,
  neuralBoost,
  spectrumBoost,
  fractalBonus,
  adaptiveThreshold,
  logReadiness,
  etaToReady,
  energyTrend,
  optimizations,
  isOptimal,
  onOptimizedSpectrumSelect
}: TransportSystemProps) => {
  const { toast } = useToast();
  const [isTransporting, setIsTransporting] = useState(false);
  const [transportProgress, setTransportProgress] = useState(0);
  const [transportHistory, setTransportHistory] = useState<TransportResult[]>([]);
  const [lastTransport, setLastTransport] = useState<TransportResult | null>(null);

  // Throttled transport status calculations to improve performance (updates every 150ms max)
  const transportStatus = useThrottledMemo(() => {
    const canTransport = tPTT_value >= adaptiveThreshold;
    const transportReadiness = logReadiness;
    const phaseSync = calculatePhaseCoherence(phases);
    const neuralSync = neuralOutput?.confidenceScore || 0;
    const phaseCoherence = phaseSync * 100;
    
    // Dynamic isotope resonance calculation (60-100% based on system conditions)
    const baseResonance = isotope.factor * 100;
    const stabilityFactor = phaseCoherence / 100;
    const neuralStabilityFactor = neuralSync;
    const transportStabilityFactor = Math.min(transportReadiness / 100, 1);
    
    // Environmental fluctuations (simulate real-world instability)
    const timeBasedFluctuation = Math.sin(Date.now() / 10000) * 0.1;
    const randomFluctuation = (deterministicRandom(generateCycle(), 0) - 0.5) * 0.05;
    
    // Isotope-specific resonance characteristics
    const isotopeStability = isotope.type === 'C-12' ? 0.95 : 
                            isotope.type === 'C-14' ? 0.85 : 0.8;
    
    // Combine all factors for dynamic resonance (range: 60-100%)
    const dynamicResonance = baseResonance * (
      0.4 * stabilityFactor +
      0.3 * neuralStabilityFactor +
      0.2 * transportStabilityFactor +
      0.1 * isotopeStability
    ) + timeBasedFluctuation * 100 + randomFluctuation * 100;
    
    const isotopeResonance = Math.max(60, Math.min(100, dynamicResonance));
    
    // Dynamic status determination with adaptive thresholds
    let status: 'offline' | 'initializing' | 'charging' | 'preparing' | 'ready' | 'critical' = 'offline';
    let statusColor: 'destructive' | 'secondary' | 'outline' | 'default' = 'destructive';
    
    const thresholdRatio = tPTT_value / adaptiveThreshold;
    
    if (thresholdRatio < 0.01) {
      status = 'offline';
      statusColor = 'destructive';
    } else if (thresholdRatio < 0.5) {
      status = 'initializing';
      statusColor = 'secondary';
    } else if (thresholdRatio < 1.0) {
      status = 'charging';
      statusColor = 'outline';
    } else if (transportReadiness < 80) {
      status = 'preparing';
      statusColor = 'outline';
    } else if (phaseCoherence > 60 && neuralSync > 0.7) {
      status = 'ready';
      statusColor = 'default';
    } else if (tPTT_value > adaptiveThreshold * 100) {
      status = 'critical';
      statusColor = 'destructive';
    }

    return {
      canTransport,
      transportReadiness,
      phaseSync,
      phaseCoherence,
      neuralSync: neuralSync * 100,
      isotopeResonance,
      status,
      statusColor,
      efficiency: Math.min(transportReadiness * 0.4 + phaseCoherence * 0.3 + neuralSync * 30, 100),
      thresholdRatio
    };
  }, [tPTT_value, phases, neuralOutput, isotope, adaptiveThreshold, logReadiness], 150);

  // Throttled destination calculations to improve performance (updates every 200ms max)
  const destinationData = useThrottledMemo(() => {
    const phaseSum = phases.reduce((sum, phase) => sum + phase, 0);
    const neuralFactor = neuralOutput?.metamorphosisIndex || 0.5;
    
    // Check for actual spectrum metadata to determine transport destination type
    let realisticZ: number;
    let lightTravelTimeYears = 0;
    
    // Check if spectrum has real stellar metadata from Pickles Atlas
    const hasRealStellarData = spectrumData?.metadata?.distance && spectrumData?.metadata?.emissionAge;
    const isSDSSCosmicData = spectrumData?.source === 'SDSS';
    const isStellarLibraryData = spectrumData?.source === 'STELLAR_LIBRARY';
    
    if (hasRealStellarData) {
      // Use real stellar distance and emission age from Pickles Atlas
      const distance = spectrumData!.metadata!.distance!;
      const emissionAge = spectrumData!.metadata!.emissionAge!;
      
      // Convert distance to redshift (very small for stellar distances)
      realisticZ = Math.abs(distance / 299792458 / 3.15e7 / 1e6); // distance in ly / (c * years/sec) / Mpc
      lightTravelTimeYears = emissionAge;
    } else if (isStellarLibraryData) {
      // Stellar library data: small redshifts for local stellar distances
      realisticZ = Math.abs(neuralFactor * 0.00001 + deterministicRandom(generateCycle(), 1) * 0.00005);
      lightTravelTimeYears = 10 + deterministicRandom(generateCycle(), 2) * 1000; // 10-1000 years for stellar library
    } else if (isSDSSCosmicData) {
      // SDSS cosmic data: larger redshifts for distant objects
      realisticZ = Math.abs(neuralFactor * 0.1 + tPTT_value / 1e14);
      lightTravelTimeYears = realisticZ * 1e10; // Cosmological lookback time
    } else {
      // Default synthetic: very small redshift for local objects
      realisticZ = Math.abs(neuralFactor * 0.0001);
      lightTravelTimeYears = deterministicRandom(generateCycle(), 3) * 100; // 0-100 years for synthetic
    }
      
    const coords = {
      ra: (phaseSum * 180 / Math.PI) % 360,
      dec: ((e_t * 90) % 180) - 90,
      z: Math.min(realisticZ, 0.5) // Cap at Z=0.5 to prevent extreme lookback times
    };

    // Calculate coordinate stability
    const stabilityFactor = Math.min(transportStatus.phaseCoherence / 100 * 0.6 + transportStatus.neuralSync / 100 * 0.4, 1);
    const coordinateVariance = (1 - stabilityFactor) * 10;
    const isLocked = stabilityFactor > 0.8 && transportStatus.status === 'ready';
    
    // Calculate temporal data - simplified for the enhanced system
    const currentMJD = (Date.now() - new Date(1858, 10, 17).getTime()) / (24 * 60 * 60 * 1000);
    const maxLookbackYears = 13.8e9;
    const finalLightTravelTimeYears = Math.min(lightTravelTimeYears, maxLookbackYears);
    const lightTravelTimeDays = finalLightTravelTimeYears * 365.25;
    const lightTravelTimeMJD = lightTravelTimeDays;
    
    const temporalVariation = (transportStatus.isotopeResonance / 100 - 0.5) * 365;
    const neuralTimeShift = neuralFactor * 30;
    const phaseTimeOffset = (phaseSum % (2 * Math.PI)) / (2 * Math.PI) * 7;
    
    let targetMJD = currentMJD - lightTravelTimeMJD - Math.abs(temporalVariation) - Math.abs(neuralTimeShift) - Math.abs(phaseTimeOffset);
    
    const minMJD = -36522;
    const maxMJD = currentMJD + 36522;
    targetMJD = Math.max(minMJD, Math.min(maxMJD, targetMJD));
    
    let targetUTC: Date;
    const targetTime = new Date(1858, 10, 17).getTime() + targetMJD * 24 * 60 * 60 * 1000;
    
    if (isNaN(targetTime) || targetTime < -8640000000000000 || targetTime > 8640000000000000) {
      targetUTC = new Date(1900, 0, 1);
      targetMJD = (targetUTC.getTime() - new Date(1858, 10, 17).getTime()) / (24 * 60 * 60 * 1000);
    } else {
      targetUTC = new Date(targetTime);
    }
    
    const temporalOffset = targetMJD - currentMJD;
    const yearsAgo = Math.abs(temporalOffset / 365.25);
    const isCosmicObject = coords.z > 0.01;
    const isPrimordial = yearsAgo > 13.8e9;
    
    let emissionEra = "Recent";
    if (yearsAgo < 1000) emissionEra = "Historical";
    else if (yearsAgo < 1e6) emissionEra = "Prehistoric"; 
    else if (yearsAgo < 1e9) emissionEra = "Geological";
    else if (yearsAgo < 5e9) emissionEra = "Pre-Solar";
    else if (yearsAgo < 10e9) emissionEra = "Early Universe";
    else if (yearsAgo < 13.8e9) emissionEra = "Primordial";
    else emissionEra = "Impossible Era";
    
    let transportWindow = "Target available";
    if (isPrimordial) {
      transportWindow = "Invalid target - predates universe";
    } else if (isCosmicObject) {
      if (yearsAgo > 1e9) transportWindow = `Transport to ${emissionEra.toLowerCase()}`;
      else if (yearsAgo > 1e6) transportWindow = `Transport to ${(yearsAgo/1e6).toFixed(1)}M years ago`;
      else if (yearsAgo > 1000) transportWindow = `Transport to ${(yearsAgo/1000).toFixed(1)}K years ago`;
      else transportWindow = `Transport to ${yearsAgo.toFixed(0)} years ago`;
    } else {
      if (hasRealStellarData) {
        transportWindow = `Target: Light emitted ${yearsAgo.toFixed(0)} years ago`;
      } else {
        transportWindow = "Stellar transport target";
      }
    }

    return {
      coords,
      stability: stabilityFactor,
      variance: coordinateVariance,
      isLocked,
      distance: coords.z > 0 ? `~${(coords.z * 3000).toFixed(0)} Mpc` : 'Local',
      temporal: {
        targetMJD,
        targetUTC,
        temporalOffset,
        yearsAgo,
        emissionEra,
        isCosmicObject,
        isPrimordial,
        lightTravelTimeYears: finalLightTravelTimeYears,
        transportWindow,
        formatted: `Emission: ${targetUTC.toISOString().split('T')[0]} (${yearsAgo.toFixed(0)} years ago)`
      }
    };
  }, [tPTT_value, phases, e_t, neuralOutput, transportStatus, spectrumData], 200);

  // Enhanced transport function with auto-realtime mode
  const performTransport = async () => {
    if (!transportStatus.canTransport) {
      toast({
        title: "Transport Unavailable",
        description: `Insufficient tPTT energy. Current: ${tPTT_value.toExponential(2)}, Required: ${adaptiveThreshold.toExponential(2)}`,
        variant: "destructive"
      });
      
      // Auto-enable realtime mode if not already enabled
      if (!isRealtime) {
        onRealtimeToggle();
        toast({
          title: "Auto-Realtime Enabled",
          description: "Accelerating energy accumulation for faster transport readiness.",
        });
      }
      return;
    }

    setIsTransporting(true);
    setTransportProgress(0);

    try {
      // Enhanced transport phases with progress feedback
      setTransportProgress(20);
      await new Promise(resolve => setTimeout(resolve, 800));

      setTransportProgress(50);
      await new Promise(resolve => setTimeout(resolve, 600));

      setTransportProgress(80);
      await new Promise(resolve => setTimeout(resolve, 400));

      setTransportProgress(100);
      
      const origin = { ra: 0, dec: 0, z: 0 };
      const destination = destinationData.coords;
      
      // Enhanced transport metrics
      const phaseSync = phases.reduce((sum, phase) => sum + Math.cos(phase), 0) / phases.length;
      const neuralConfidence = neuralOutput?.confidenceScore || 0.7;
      
      const transportEfficiency = Math.min(
        (tPTT_value / adaptiveThreshold) * 0.4 +
        Math.abs(phaseSync) * 0.3 +
        neuralConfidence * 0.3,
        1
      );

      const energyConsumption = (1 - transportEfficiency) * tPTT_value * 0.1;
      const temporalStability = fractalToggle ? transportEfficiency * 1.2 : transportEfficiency;
      const neuralSyncScore = neuralConfidence * (isotope.type === 'C-14' ? 1.1 : 1.0);
      
      // Enhanced anomaly detection
      const anomalies: string[] = [];
      if (transportEfficiency < 0.7) anomalies.push("Suboptimal energy coherence");
      if (Math.abs(phaseSync) < 0.5) anomalies.push("Phase desynchronization detected");
      if (e_t > 0.8) anomalies.push("High entropy interference");
      if (!fractalToggle && tPTT_value > adaptiveThreshold * 5) anomalies.push("Fractal enhancement recommended");
      if (!isOptimal) anomalies.push("System not optimally configured");

      const transportResultStatus: TransportResult['status'] = 
        transportEfficiency >= 0.8 ? 'success' :
        transportEfficiency >= 0.5 ? 'partial' : 'failed';

      const result: TransportResult = {
        id: `TPRT-${Date.now()}`,
        timestamp: new Date(),
        originCoords: origin,
        destinationCoords: destination,
        transportEfficiency,
        energyConsumption,
        temporalStability,
        neuralSyncScore,
        rippelHarmonics: rippel,
        status: transportResultStatus,
        anomalies,
        temporalDestination: {
          targetMJD: destinationData.temporal.targetMJD,
          targetUTC: destinationData.temporal.targetUTC,
          temporalOffset: destinationData.temporal.temporalOffset,
          yearsAgo: destinationData.temporal.yearsAgo,
          emissionEra: destinationData.temporal.emissionEra,
          lightTravelTimeYears: destinationData.temporal.lightTravelTimeYears
        }
      };

      setLastTransport(result);
      setTransportHistory(prev => [result, ...prev.slice(0, 9)]);

      // Enhanced result toast
      const tempInfo = result.temporalDestination 
        ? ` | ${result.temporalDestination.emissionEra} (${result.temporalDestination.yearsAgo! < 1000 ? 
            `${result.temporalDestination.yearsAgo!.toFixed(0)} years ago` :
            result.temporalDestination.yearsAgo! < 1e6 ? `${(result.temporalDestination.yearsAgo!/1000).toFixed(1)}K years ago` :
            `${(result.temporalDestination.yearsAgo!/1e6).toFixed(1)}M years ago`})`
        : '';
      
      toast({
        title: `Transport ${transportResultStatus.toUpperCase()}`,
        description: `Efficiency: ${(transportEfficiency * 100).toFixed(1)}% | Destination: RA ${destination.ra.toFixed(2)}°${tempInfo}`,
        variant: transportResultStatus === 'success' ? 'default' : 'destructive'
      });

    } catch (error) {
      toast({
        title: "Transport Failed",
        description: "An error occurred during transport execution.",
        variant: "destructive"
      });
    } finally {
      setIsTransporting(false);
      setTransportProgress(0);
    }
  };

  // Handle optimization suggestions
  const handleOptimization = (optimization: string) => {
    switch (optimization) {
      case "Enable Auto-Realtime Mode":
        onRealtimeToggle();
        break;
      case "Increase Energy Growth Rate":
        onEnergyGrowthRateChange(Math.min(energyGrowthRate + 1, 10));
        break;
      case "Select High-Energy Stellar Spectrum":
        onOptimizedSpectrumSelect('O-Type');
        break;
      case "Enable Fractal Enhancement (+20% energy)":
        // This would need to be passed up to parent component
        toast({
          title: "Optimization Applied",
          description: "Enable Fractal Mode in Controls tab for +20% energy boost.",
        });
        break;
      default:
        toast({
          title: "Optimization Suggestion",
          description: optimization,
        });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="readiness" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="readiness">Readiness</TabsTrigger>
          <TabsTrigger value="energy">Energy</TabsTrigger>
          <TabsTrigger value="calibration">Calibration</TabsTrigger>
          <TabsTrigger value="spectrum">Spectrum</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="readiness" className="space-y-4">
          <TransportReadinessDisplay
            tPTT_value={tPTT_value}
            e_t={e_t}
            transportReadiness={transportStatus.transportReadiness}
            phaseCoherence={transportStatus.phaseCoherence}
            neuralSync={transportStatus.neuralSync}
            isotopeResonance={transportStatus.isotopeResonance}
            canTransport={transportStatus.canTransport}
            isTransporting={isTransporting}
            etaToReady={etaToReady}
            energyTrend={energyTrend}
            optimizations={optimizations}
            temporal={destinationData.temporal}
            onTransport={performTransport}
            onOptimize={handleOptimization}
          />
        </TabsContent>

        <TabsContent value="energy" className="space-y-4">
          <EnergyAccelerator
            e_t={e_t}
            energyGrowthRate={energyGrowthRate}
            onGrowthRateChange={onEnergyGrowthRateChange}
            targetE_t={targetE_t}
            onTargetChange={onTargetE_tChange}
            isRealtime={isRealtime}
            onRealtimeToggle={onRealtimeToggle}
            energyMomentum={energyMomentum}
            neuralBoost={neuralBoost}
            spectrumBoost={spectrumBoost}
            fractalBonus={fractalBonus}
            etaSeconds={etaToReady}
          />
        </TabsContent>

        <TabsContent value="calibration" className="space-y-4">
          <AdaptiveTPTTCalibrator
            tPTT_value={tPTT_value}
            spectrumData={spectrumData}
            neuralConfidence={neuralOutput?.confidenceScore || 0}
            adaptiveThreshold={adaptiveThreshold}
            transportReadiness={transportStatus.transportReadiness}
            isOptimal={isOptimal}
          />
        </TabsContent>

        <TabsContent value="spectrum" className="space-y-4">
          <SpectrumIntelligence
            currentSpectrum={spectrumData}
            onRecommendSpectrum={onOptimizedSpectrumSelect}
            energyBoostFactor={spectrumBoost}
            distanceScaling={1 + spectrumBoost}
            stellarAgeFactor={1 + neuralBoost}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {lastTransport && (
            <TransportSequenceVerification 
              lastTransportResult={lastTransport}
              currentState={{
                tPTT: tPTT_value,
                phases,
                e_t,
                neuralSync: transportStatus.neuralSync / 100,
                isotopeResonance: transportStatus.isotopeResonance / 100,
                phaseCoherence: transportStatus.phaseCoherence / 100
              }}
              onGenerateSequence={async () => {
                const stellarTimestamp = generateStellarTimestamp(spectrumData);
                return {
                  timestamp: new Date().toISOString(),
                  sequenceId: `SEQ-${Date.now()}`,
                  preTransportState: {
                    tPTT_value,
                    phases,
                    e_t,
                    neuralSequence: neuralOutput?.synapticSequence || '',
                    rippelSignature: rippel,
                    temporalHash: `${Date.now()}`,
                    stellarTimestamp: {
                      mjd: stellarTimestamp.mjd,
                      gregorian: stellarTimestamp.gregorian.toISOString(),
                      observatoryCode: stellarTimestamp.observatoryCode,
                      emissionEra: destinationData.temporal.emissionEra || 'Modern Era'
                    }
                  },
                  transportSequence: {
                    energyAccumulation: [e_t * 0.8, e_t * 0.9, e_t],
                    neuralSyncProgress: [0.5, 0.7, transportStatus.neuralSync / 100],
                    temporalFoldSequence: ['init', 'fold', 'complete'],
                    phaseAlignmentData: phases,
                    isotopicResonance: transportStatus.isotopeResonance / 100,
                    destinationLock: {
                      targetMJD: destinationData.temporal.targetMJD,
                      targetUTC: destinationData.temporal.targetUTC.toISOString(),
                      yearsAgo: destinationData.temporal.yearsAgo,
                      lightTravelTime: parseFloat(destinationData.distance.replace(/[^\d.-]/g, '')) || 0
                    }
                  },
                  postTransportState: {
                    finalCoordinates: lastTransport?.destinationCoords || { ra: 0, dec: 0, z: 0 },
                    energyResidue: e_t * 0.1,
                    temporalStability: lastTransport?.temporalStability || 0.8,
                    verificationHash: `VER-${Date.now()}`,
                    arrivalTimestamp: {
                      mjd: destinationData.temporal.targetMJD,
                      gregorian: destinationData.temporal.targetUTC.toISOString(),
                      temporalAccuracy: destinationData.stability
                    }
                  },
                  verificationData: {
                    sequenceIntegrity: true,
                    temporalConsistency: true,
                    neuralCoherence: true,
                    energyConservation: true,
                    destinationAccuracy: destinationData.isLocked,
                    stellarVerification: !!stellarTimestamp.observatoryCode,
                    overallValidity: true
                  }
                };
              }}
            />
          )}
          
          {/* Transport History */}
          <Card>
            <CardHeader>
              <CardTitle>Transport History</CardTitle>
            </CardHeader>
            <CardContent>
              {transportHistory.length > 0 ? (
                <div className="space-y-3">
                  {transportHistory.map((transport) => (
                    <div key={transport.id} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={transport.status === 'success' ? 'default' : 'destructive'}>
                          {transport.status.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {transport.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm">
                        <div>Efficiency: {(transport.transportEfficiency * 100).toFixed(1)}%</div>
                        <div>Destination: RA {transport.destinationCoords.ra.toFixed(2)}°</div>
                        {transport.temporalDestination && (
                          <div className="text-muted-foreground">
                            {transport.temporalDestination.emissionEra} - {transport.temporalDestination.yearsAgo!.toFixed(0)} years ago
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No transport history available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
