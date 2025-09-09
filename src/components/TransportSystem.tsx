import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Zap, Target, MapPin, Clock, AlertTriangle, CheckCircle, Rocket, Activity, Wifi, Radio, Gauge } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Isotope, calculatePhaseCoherence } from '@/lib/temporalCalculator';
import { TransportSequenceVerification } from './TransportSequenceVerification';

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

interface TemporalData {
  targetMJD: number;
  targetUTC: Date;
  temporalOffset: number;
  yearsAgo: number;
  emissionEra: string;
  isCosmicObject: boolean;
  isPrimordial: boolean;
  lightTravelTimeYears: number;
  observabilityWindow: string;
  formatted: string;
}

interface TransportSystemProps {
  tPTT_value: number;
  phases: number[];
  e_t: number;
  neuralOutput?: any;
  rippel: string;
  isotope: Isotope;
  fractalToggle: boolean;
}

export const TransportSystem = ({
  tPTT_value,
  phases,
  e_t,
  neuralOutput,
  rippel,
  isotope,
  fractalToggle
}: TransportSystemProps) => {
  const { toast } = useToast();
  const [isTransporting, setIsTransporting] = useState(false);
  const [transportProgress, setTransportProgress] = useState(0);
  const [transportHistory, setTransportHistory] = useState<TransportResult[]>([]);
  const [lastTransport, setLastTransport] = useState<TransportResult | null>(null);

  // Real-time transport status calculations
  const transportStatus = useMemo(() => {
    const canTransport = tPTT_value >= 1e10;
    const transportReadiness = Math.min(tPTT_value / 1e11, 1) * 100;
    const phaseSync = calculatePhaseCoherence(phases);
    const neuralSync = neuralOutput?.confidenceScore || 0;
    const phaseCoherence = phaseSync * 100;
    const isotopeResonance = isotope.factor * 100;
    
    // Dynamic status determination
    let status: 'offline' | 'initializing' | 'charging' | 'preparing' | 'ready' | 'critical' = 'offline';
    let statusColor: 'destructive' | 'secondary' | 'outline' | 'default' = 'destructive';
    
    if (tPTT_value < 1e8) {
      status = 'offline';
      statusColor = 'destructive';
    } else if (tPTT_value < 5e9) {
      status = 'initializing';
      statusColor = 'secondary';
    } else if (tPTT_value < 1e10) {
      status = 'charging';
      statusColor = 'outline';
    } else if (transportReadiness < 80) {
      status = 'preparing';
      statusColor = 'outline';
    } else if (phaseCoherence > 60 && neuralSync > 0.7) {
      status = 'ready';
      statusColor = 'default';
    } else if (tPTT_value > 1e12) {
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
      efficiency: Math.min(transportReadiness * 0.4 + phaseCoherence * 0.3 + neuralSync * 0.3, 100)
    };
  }, [tPTT_value, phases, neuralOutput, isotope]);

  // Real-time destination calculation with space-time coordinates
  const destinationData = useMemo(() => {
    const phaseSum = phases.reduce((sum, phase) => sum + phase, 0);
    const neuralFactor = neuralOutput?.metamorphosisIndex || 0.5;
    
    const coords = {
      ra: (phaseSum * 180 / Math.PI) % 360,
      dec: ((e_t * 90) % 180) - 90,
      z: Math.abs(neuralFactor * tPTT_value / 1e12)
    };

    // Calculate coordinate stability (how much coords are shifting)
    const stabilityFactor = Math.min(transportStatus.phaseCoherence / 100 * 0.6 + transportStatus.neuralSync / 100 * 0.4, 1);
    const coordinateVariance = (1 - stabilityFactor) * 10; // Degrees of variance
    
    // Determine if coordinates are locked
    const isLocked = stabilityFactor > 0.8 && transportStatus.status === 'ready';
    
    // Calculate historical emission time (when light was emitted)
    const currentMJD = (Date.now() - new Date(1858, 10, 17).getTime()) / (24 * 60 * 60 * 1000);
    
    // Calculate lookback time based on redshift (Z) - more realistic cosmological calculation
    // For small redshifts: distance ≈ Z * c/H0, light travel time ≈ Z * 14 Gyr (age of universe)
    // Cap the lookback time to prevent invalid dates
    const maxLookbackYears = 13.8e9; // Age of universe in years
    const lightTravelTimeYears = coords.z > 0 ? Math.min(coords.z * 1e10, maxLookbackYears) : 0;
    const lightTravelTimeDays = lightTravelTimeYears * 365.25; // Convert to days
    const lightTravelTimeMJD = lightTravelTimeDays; // MJD offset
    
    // Apply additional temporal variations based on system parameters (much smaller now)
    const temporalVariation = (transportStatus.isotopeResonance / 100 - 0.5) * 365; // ±6 months variation
    const neuralTimeShift = neuralFactor * 30; // Neural influence up to 1 month
    const phaseTimeOffset = (phaseSum % (2 * Math.PI)) / (2 * Math.PI) * 7; // Phase influence up to 1 week
    
    // Calculate emission time (subtract time to go backwards) with safety bounds
    let targetMJD = currentMJD - lightTravelTimeMJD - Math.abs(temporalVariation) - Math.abs(neuralTimeShift) - Math.abs(phaseTimeOffset);
    
    // Ensure the MJD is within valid JavaScript Date range (roughly -100,000 to +100,000 years from 1970)
    const minMJD = -36522; // Roughly year 1758 (safe lower bound)
    const maxMJD = currentMJD + 36522; // Safe upper bound
    targetMJD = Math.max(minMJD, Math.min(maxMJD, targetMJD));
    
    // Create Date object with validation
    let targetUTC: Date;
    const targetTime = new Date(1858, 10, 17).getTime() + targetMJD * 24 * 60 * 60 * 1000;
    
    if (isNaN(targetTime) || targetTime < -8640000000000000 || targetTime > 8640000000000000) {
      // If invalid, use a safe fallback date
      targetUTC = new Date(1900, 0, 1); // Fallback to 1900
      targetMJD = (targetUTC.getTime() - new Date(1858, 10, 17).getTime()) / (24 * 60 * 60 * 1000);
    } else {
      targetUTC = new Date(targetTime);
    }
    
    const temporalOffset = targetMJD - currentMJD; // This will be negative (in the past)
    
    // Calculate historical context with the corrected values
    const yearsAgo = Math.abs(temporalOffset / 365.25);
    const isCosmicObject = coords.z > 0.01; // Significant redshift
    const isPrimordial = yearsAgo > 13.8e9; // Before Big Bang (impossible)
    
    let emissionEra = "Recent";
    if (yearsAgo < 1000) emissionEra = "Historical";
    else if (yearsAgo < 1e6) emissionEra = "Prehistoric"; 
    else if (yearsAgo < 1e9) emissionEra = "Geological";
    else if (yearsAgo < 5e9) emissionEra = "Pre-Solar";
    else if (yearsAgo < 10e9) emissionEra = "Early Universe";
    else if (yearsAgo < 13.8e9) emissionEra = "Primordial";
    else emissionEra = "Impossible Era";
    
    let observabilityWindow = "Light already observed";
    if (isPrimordial) {
      observabilityWindow = "Impossible - predates universe";
    } else if (isCosmicObject) {
      if (yearsAgo > 1e9) observabilityWindow = `Ancient light from ${emissionEra.toLowerCase()}`;
      else if (yearsAgo > 1e6) observabilityWindow = `Light from ${(yearsAgo/1e6).toFixed(1)}M years ago`;
      else if (yearsAgo > 1000) observabilityWindow = `Light from ${(yearsAgo/1000).toFixed(1)}K years ago`;
      else observabilityWindow = `Light from ${yearsAgo.toFixed(0)} years ago`;
    }
    
    // Format coordinates for display
    const formatRA = (ra: number) => {
      const hours = Math.floor(ra / 15);
      const minutes = Math.floor((ra % 15) * 4);
      const seconds = ((ra % 15) * 4 - minutes) * 60;
      return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toFixed(1)}s`;
    };
    
    const formatDEC = (dec: number) => {
      const sign = dec >= 0 ? '+' : '-';
      const absDec = Math.abs(dec);
      const degrees = Math.floor(absDec);
      const arcminutes = Math.floor((absDec - degrees) * 60);
      const arcseconds = ((absDec - degrees) * 60 - arcminutes) * 60;
      return `${sign}${degrees.toString().padStart(2, '0')}° ${arcminutes.toString().padStart(2, '0')}' ${arcseconds.toFixed(1)}"`;
    };
    
    const formatTemporal = () => {
      // Validate date before formatting
      if (isNaN(targetUTC.getTime())) {
        return "Invalid temporal coordinates";
      }
      
      const dateStr = targetUTC.toISOString().split('T')[0];
      const timeStr = targetUTC.toTimeString().split(' ')[0];
      const mjdStr = targetMJD.toFixed(5);
      const yearsAgoStr = yearsAgo < 1000 ? `${yearsAgo.toFixed(0)} years` :
                         yearsAgo < 1e6 ? `${(yearsAgo/1000).toFixed(1)}K years` :
                         yearsAgo < 1e9 ? `${(yearsAgo/1e6).toFixed(1)}M years` : 
                         `${(yearsAgo/1e9).toFixed(1)}B years`;
      
      return coords.z > 0 
        ? `Emitted: ${dateStr} ${timeStr} UTC (MJD ${mjdStr}) - ${yearsAgoStr} ago`
        : `${dateStr} ${timeStr} UTC (MJD ${mjdStr})`;
    };

    return {
      coords,
      formatted: {
        ra: formatRA(coords.ra),
        dec: formatDEC(coords.dec),
        raDecimal: coords.ra.toFixed(6),
        decDecimal: coords.dec.toFixed(6),
        z: coords.z.toExponential(3)
      },
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
        lightTravelTimeYears,
        observabilityWindow,
        formatted: formatTemporal()
      }
    };
  }, [tPTT_value, phases, e_t, neuralOutput, transportStatus.phaseCoherence, transportStatus.neuralSync, transportStatus.status, transportStatus.isotopeResonance]);

  const calculateTransportDestination = () => {
    return destinationData.coords;
  };

  const performTransport = async () => {
    if (!transportStatus.canTransport) {
      toast({
        title: "Transport Unavailable",
        description: "Insufficient tPTT energy levels for transport initiation.",
        variant: "destructive"
      });
      return;
    }

    setIsTransporting(true);
    setTransportProgress(0);

    try {
      // Phase 1: Energy Accumulation
      setTransportProgress(20);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Phase 2: Neural Synchronization
      setTransportProgress(50);
      await new Promise(resolve => setTimeout(resolve, 600));

      // Phase 3: Temporal Fold Initiation
      setTransportProgress(80);
      await new Promise(resolve => setTimeout(resolve, 400));

      // Phase 4: Transport Execution
      setTransportProgress(100);
      
      const origin = { ra: 0, dec: 0, z: 0 }; // Current position
      const destination = calculateTransportDestination();
      
      // Calculate transport metrics based on current state
      const phaseSync = phases.reduce((sum, phase) => sum + Math.cos(phase), 0) / phases.length;
      const neuralConfidence = neuralOutput?.confidenceScore || 0.7;
      
      const transportEfficiency = Math.min(
        (tPTT_value / 1e11) * 0.4 +
        Math.abs(phaseSync) * 0.3 +
        neuralConfidence * 0.3,
        1
      );

      const energyConsumption = (1 - transportEfficiency) * tPTT_value * 0.1;
      const temporalStability = fractalToggle ? transportEfficiency * 1.2 : transportEfficiency;
      const neuralSyncScore = neuralConfidence * (isotope.type === 'C-14' ? 1.1 : 1.0);
      
      // Determine anomalies based on conditions
      const anomalies: string[] = [];
      if (transportEfficiency < 0.7) anomalies.push("Suboptimal energy coherence");
      if (Math.abs(phaseSync) < 0.5) anomalies.push("Phase desynchronization detected");
      if (e_t > 0.8) anomalies.push("High entropy interference");
      if (!fractalToggle && tPTT_value > 5e10) anomalies.push("Fractal enhancement recommended");

      const transportStatus: TransportResult['status'] = 
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
        status: transportStatus,
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
      setTransportHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10

      // Show result toast with temporal info
      const tempInfo = result.temporalDestination 
        ? ` | Light emitted: ${result.temporalDestination.emissionEra} (${result.temporalDestination.yearsAgo! < 1000 ? 
            `${result.temporalDestination.yearsAgo!.toFixed(0)} years ago` :
            result.temporalDestination.yearsAgo! < 1e6 ? `${(result.temporalDestination.yearsAgo!/1000).toFixed(1)}K years ago` :
            `${(result.temporalDestination.yearsAgo!/1e6).toFixed(1)}M years ago`})`
        : '';
      
      toast({
        title: `Transport ${transportStatus.toUpperCase()}`,
        description: `Efficiency: ${(transportEfficiency * 100).toFixed(1)}% | Destination: RA ${destination.ra.toFixed(2)}°${tempInfo}`,
        variant: transportStatus === 'success' ? 'default' : transportStatus === 'partial' ? 'default' : 'destructive'
      });

    } catch (error) {
      toast({
        title: "Transport Failed",
        description: "Critical error during transport sequence. Check system integrity.",
        variant: "destructive"
      });
    } finally {
      setIsTransporting(false);
      setTransportProgress(0);
    }
  };

  const getStatusIcon = (status: TransportResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'partial': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  const generateSequenceData = async () => {
    if (!lastTransport) return null;
    
    // Generate comprehensive sequence data
    const sequenceId = `TSEQ-${Date.now().toString(36).toUpperCase()}`;
    const timestamp = new Date().toISOString();
    
    // Pre-transport state capture
    const preTransportHash = btoa(JSON.stringify({
      tPTT: tPTT_value,
      phases: phases,
      neural: neuralOutput?.synapticSequence || 'none',
      time: Date.now()
    })).slice(0, 16);
    
    // Generate transport sequence simulation
    const energyAccumulation = Array.from({ length: 20 }, (_, i) => 
      tPTT_value * (0.5 + (i / 20) * 0.5) * (1 + Math.sin(i * 0.314) * 0.1)
    );
    
    const neuralSyncProgress = Array.from({ length: 15 }, (_, i) => 
      Math.min(0.1 + (i / 15) * 0.9 * (neuralOutput?.confidenceScore || 0.7), 1)
    );
    
    const temporalFoldSequence = Array.from({ length: 8 }, (_, i) => 
      `TF-${i.toString(16).toUpperCase()}-${(phases[0] + i * 0.785).toFixed(4)}`
    );
    
    const phaseAlignmentData = phases.map((phase, i) => 
      phase + Math.sin(i * 0.618) * 0.1
    );
    
    // Post-transport verification
    const postTransportHash = btoa(JSON.stringify({
      coords: lastTransport.destinationCoords,
      efficiency: lastTransport.transportEfficiency,
      timestamp: lastTransport.timestamp,
      sequence: sequenceId
    })).slice(0, 16);
    
    // Verification calculations
    const sequenceIntegrity = energyAccumulation.every(e => e > 0 && !isNaN(e));
    const temporalConsistency = phaseAlignmentData.every(p => Math.abs(p) < 10);
    const neuralCoherence = neuralSyncProgress[neuralSyncProgress.length - 1] > 0.6;
    const energyConservation = Math.abs(lastTransport.energyConsumption) < tPTT_value * 0.5;
    
    return {
      timestamp,
      sequenceId,
      preTransportState: {
        tPTT_value,
        phases: [...phases],
        e_t,
        neuralSequence: neuralOutput?.synapticSequence || 'N/A',
        rippelSignature: rippel.slice(0, 32),
        temporalHash: preTransportHash
      },
      transportSequence: {
        energyAccumulation,
        neuralSyncProgress,
        temporalFoldSequence,
        phaseAlignmentData,
        isotopicResonance: isotope.factor * (1 + Math.sin(Date.now() * 0.001) * 0.1)
      },
      postTransportState: {
        finalCoordinates: lastTransport.destinationCoords,
        energyResidue: lastTransport.energyConsumption,
        temporalStability: lastTransport.temporalStability,
        verificationHash: postTransportHash
      },
      verificationData: {
        sequenceIntegrity,
        temporalConsistency,
        neuralCoherence,
        energyConservation,
        overallValidity: sequenceIntegrity && temporalConsistency && neuralCoherence && energyConservation
      }
    };
  };

  return (
    <div className="space-y-6">
      {/* Main Transport System */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              Temporal Transport System
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={transportStatus.statusColor} className="capitalize">
                {transportStatus.status}
              </Badge>
              {transportStatus.status === 'ready' && (
                <Activity className="w-4 h-4 text-green-500 animate-pulse" />
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Real-time Transport Status */}
          <div className="space-y-4">
            {/* System Readiness */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Gauge className="w-4 h-4" />
                  System Readiness
                </span>
                <span className={`text-sm font-medium ${
                  transportStatus.transportReadiness >= 80 ? 'text-green-500' :
                  transportStatus.transportReadiness >= 50 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {transportStatus.transportReadiness.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={transportStatus.transportReadiness} 
                className={`w-full transition-all duration-500 ${
                  transportStatus.transportReadiness >= 80 ? 'bg-green-100' :
                  transportStatus.transportReadiness >= 50 ? 'bg-yellow-100' : 'bg-red-100'
                }`}
              />
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 p-2 rounded border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="w-3 h-3" />
                  Energy Level
                </div>
                <div className="font-mono text-sm">{tPTT_value.toExponential(2)}</div>
                {tPTT_value >= 1e10 && (
                  <div className="text-xs text-green-500">✓ Transport Ready</div>
                )}
              </div>
              
              <div className="space-y-1 p-2 rounded border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wifi className="w-3 h-3" />
                  Neural Sync
                </div>
                <div className={`font-mono text-sm ${
                  transportStatus.neuralSync >= 70 ? 'text-green-500' :
                  transportStatus.neuralSync >= 50 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {transportStatus.neuralSync.toFixed(1)}%
                </div>
              </div>
              
              <div className="space-y-1 p-2 rounded border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Radio className="w-3 h-3" />
                  Phase Coherence
                </div>
                <div className={`font-mono text-sm ${
                  transportStatus.phaseCoherence >= 60 ? 'text-green-500' :
                  transportStatus.phaseCoherence >= 40 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {transportStatus.phaseCoherence.toFixed(1)}%
                </div>
              </div>
              
              <div className="space-y-1 p-2 rounded border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="w-3 h-3" />
                  Isotope Resonance
                </div>
                <div className="font-mono text-sm text-blue-500">
                  {transportStatus.isotopeResonance.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Real-time Status Alert */}
            {transportStatus.status !== 'offline' && (
              <Alert className={`border-l-4 ${
                transportStatus.status === 'ready' ? 'border-l-green-500 bg-green-50/50' :
                transportStatus.status === 'critical' ? 'border-l-red-500 bg-red-50/50' :
                transportStatus.status === 'preparing' ? 'border-l-yellow-500 bg-yellow-50/50' :
                'border-l-blue-500 bg-blue-50/50'
              }`}>
                <div className="flex items-center gap-2">
                  {transportStatus.status === 'ready' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {transportStatus.status === 'critical' && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />}
                  {transportStatus.status === 'preparing' && <Clock className="w-4 h-4 text-yellow-500" />}
                  {(transportStatus.status === 'initializing' || transportStatus.status === 'charging') && 
                    <Zap className="w-4 h-4 text-blue-500 animate-pulse" />}
                  
                  <AlertDescription className="font-medium">
                    {transportStatus.status === 'ready' && 'Transport system ready for operation'}
                    {transportStatus.status === 'critical' && 'Critical energy levels detected - proceed with caution'}
                    {transportStatus.status === 'preparing' && 'System preparing for transport capability'}
                    {transportStatus.status === 'charging' && 'Energy accumulation in progress'}
                    {transportStatus.status === 'initializing' && 'Transport systems coming online'}
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </div>

          {/* Real-time 4D Destination Preview */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">4D Space-Time Destination</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={destinationData.isLocked ? "default" : "secondary"} className="text-xs">
                  {destinationData.isLocked ? "LOCKED" : "TRACKING"}
                </Badge>
                {destinationData.isLocked && (
                  <Target className="w-3 h-3 text-green-500" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
              {/* Spatial Coordinates */}
              <div className="space-y-2">
                <div className="font-medium text-muted-foreground">Spatial Coordinates</div>
                <div className="space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>RA:</span>
                    <span className={destinationData.isLocked ? "text-green-500" : "text-yellow-500"}>
                      {destinationData.formatted.ra}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>DEC:</span>
                    <span className={destinationData.isLocked ? "text-green-500" : "text-yellow-500"}>
                      {destinationData.formatted.dec}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Z:</span>
                    <span className={destinationData.isLocked ? "text-green-500" : "text-yellow-500"}>
                      {destinationData.formatted.z}
                    </span>
                  </div>
                </div>
              </div>

              {/* Temporal Coordinates */}
              <div className="space-y-2">
                <div className="font-medium text-muted-foreground">Temporal Coordinates</div>
                <div className="space-y-1 text-xs">
                  <div className="font-mono break-all">
                    {destinationData.temporal.formatted}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`${destinationData.temporal.isCosmicObject ? 'text-purple-500' : 'text-green-600'}`}>
                      {destinationData.temporal.observabilityWindow}
                    </span>
                    <span className="text-muted-foreground">
                      {destinationData.temporal.temporalOffset >= 0 ? 'Future' : 'Historical'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Data */}
              <div className="space-y-2">
                <div className="font-medium text-muted-foreground">Navigation Data</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Distance:</span>
                    <span>{destinationData.distance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stability:</span>
                    <span className={`${
                      destinationData.stability > 0.8 ? 'text-green-500' :
                      destinationData.stability > 0.5 ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      {(destinationData.stability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Variance:</span>
                    <span className="text-muted-foreground">
                      ±{destinationData.variance.toFixed(2)}°
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {!destinationData.isLocked && (
              <Alert className="border-yellow-200 bg-yellow-50/50">
                <Clock className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-sm text-yellow-800">
                  Space-time coordinates tracking - target will lock when system reaches optimal coherence
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Transport Progress */}
          {isTransporting && (
            <Alert>
              <Zap className="w-4 h-4 animate-pulse" />
              <AlertDescription>
                <div className="space-y-2">
                  <div>Transport sequence in progress...</div>
                  <Progress value={transportProgress} className="w-full" />
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Transport Action */}
          <div className="space-y-2">
            <Button
              onClick={performTransport}
              disabled={!transportStatus.canTransport || isTransporting}
              className={`w-full transition-all duration-300 ${
                transportStatus.status === 'ready' ? 'animate-pulse bg-green-600 hover:bg-green-700' :
                transportStatus.status === 'critical' ? 'bg-red-600 hover:bg-red-700' :
                ''
              }`}
              size="lg"
            >
              <Target className="w-4 h-4 mr-2" />
              {isTransporting ? 'Transporting...' : 
               transportStatus.status === 'ready' ? 'Execute Transport' :
               transportStatus.status === 'critical' ? 'Emergency Transport' :
               'Initiate Transport'}
            </Button>
            
            {!transportStatus.canTransport && (
              <div className="text-xs text-center">
                <div className="text-muted-foreground">
                  {transportStatus.status === 'offline' ? 'System offline - Minimum tPTT of 1e10 required' :
                   transportStatus.status === 'initializing' ? 'System initializing - Please wait' :
                   transportStatus.status === 'charging' ? 'Energy charging - Transport unavailable' :
                   'System not ready for transport'}
                </div>
                {transportStatus.transportReadiness < 100 && (
                  <div className="text-xs text-blue-500 mt-1">
                    {(100 - transportStatus.transportReadiness).toFixed(1)}% until full readiness
                  </div>
                )}
              </div>
            )}
            
            {/* Live Transport Prediction */}
            {transportStatus.canTransport && !isTransporting && (
              <div className="text-xs text-center space-y-1">
                <div className="text-green-600 font-medium">
                  Predicted Efficiency: {transportStatus.efficiency.toFixed(1)}%
                </div>
                {transportStatus.status === 'ready' && (
                  <div className="text-blue-500 animate-pulse">
                    Optimal transport window active
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Last Transport Result */}
          {lastTransport && (
            <div className="space-y-3">
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Transport</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(lastTransport.status)}
                    <Badge variant={
                      lastTransport.status === 'success' ? 'default' : 
                      lastTransport.status === 'partial' ? 'secondary' : 
                      'destructive'
                    }>
                      {lastTransport.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">Efficiency</div>
                    <div className="font-mono">{(lastTransport.transportEfficiency * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Stability</div>
                    <div className="font-mono">{(lastTransport.temporalStability * 100).toFixed(1)}%</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Spatial Destination
                    </div>
                    <div className="font-mono text-xs">
                      RA {lastTransport.destinationCoords.ra.toFixed(2)}° 
                      DEC {lastTransport.destinationCoords.dec.toFixed(2)}° 
                      Z {lastTransport.destinationCoords.z.toFixed(4)}
                    </div>
                  </div>
                  {lastTransport.temporalDestination && (
                    <div className="col-span-2">
                      <div className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Temporal Destination
                      </div>
                      <div className="font-mono text-xs">
                        {lastTransport.temporalDestination.targetUTC.toISOString().split('T')[0]} 
                        (MJD {lastTransport.temporalDestination.targetMJD.toFixed(5)})
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Offset: {lastTransport.temporalDestination.temporalOffset >= 0 ? '+' : ''}{lastTransport.temporalDestination.temporalOffset.toFixed(2)} days
                      </div>
                    </div>
                  )}
                </div>

                {lastTransport.anomalies.length > 0 && (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <div className="text-xs">
                        <div className="font-medium mb-1">Transport Anomalies:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {lastTransport.anomalies.map((anomaly, i) => (
                            <li key={i}>{anomaly}</li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Transport History Summary */}
          {transportHistory.length > 0 && (
            <div className="space-y-2">
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Transport History</span>
                <Badge variant="outline">{transportHistory.length} records</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Success Rate: {(
                  (transportHistory.filter(t => t.status === 'success').length / transportHistory.length) * 100
                ).toFixed(1)}%
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sequence Verification */}
      <TransportSequenceVerification
        lastTransportResult={lastTransport}
        currentState={{ tPTT_value, phases, e_t, neuralOutput, rippel, isotope, fractalToggle }}
        onGenerateSequence={generateSequenceData}
      />
    </div>
  );
};