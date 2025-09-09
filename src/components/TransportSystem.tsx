import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Zap, Target, MapPin, Clock, AlertTriangle, CheckCircle, Rocket, Activity, Wifi, Radio, Gauge } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Isotope } from '@/lib/temporalCalculator';
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
    const phaseSync = phases.reduce((sum, phase) => sum + Math.cos(phase), 0) / phases.length;
    const neuralSync = neuralOutput?.confidenceScore || 0;
    const phaseCoherence = Math.abs(phaseSync) * 100;
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

  const calculateTransportDestination = () => {
    // Use neural output and phases to determine destination
    const phaseSum = phases.reduce((sum, phase) => sum + phase, 0);
    const neuralFactor = neuralOutput?.metamorphosisIndex || 0.5;
    
    return {
      ra: (phaseSum * 180 / Math.PI) % 360,
      dec: ((e_t * 90) % 180) - 90,
      z: Math.abs(neuralFactor * tPTT_value / 1e12)
    };
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
        anomalies
      };

      setLastTransport(result);
      setTransportHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10

      // Show result toast
      toast({
        title: `Transport ${transportStatus.toUpperCase()}`,
        description: `Efficiency: ${(transportEfficiency * 100).toFixed(1)}% | Destination: RA ${destination.ra.toFixed(2)}°`,
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
                      Destination
                    </div>
                    <div className="font-mono text-xs">
                      RA {lastTransport.destinationCoords.ra.toFixed(2)}° 
                      DEC {lastTransport.destinationCoords.dec.toFixed(2)}° 
                      Z {lastTransport.destinationCoords.z.toFixed(4)}
                    </div>
                  </div>
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