import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Zap, Target, MapPin, Clock, AlertTriangle, CheckCircle, Rocket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Isotope } from '@/lib/temporalCalculator';

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

  const canTransport = tPTT_value >= 1e10;
  const transportReadiness = Math.min(tPTT_value / 1e11, 1) * 100;

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
    if (!canTransport) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="w-5 h-5" />
          Temporal Transport System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Transport Readiness */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Transport Readiness</span>
            <span className="text-sm text-muted-foreground">{transportReadiness.toFixed(1)}%</span>
          </div>
          <Progress value={transportReadiness} className="w-full" />
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <div className="text-muted-foreground">Energy Level</div>
              <div className="font-mono">{tPTT_value.toExponential(2)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">Neural Sync</div>
              <div className="font-mono">{((neuralOutput?.confidenceScore || 0.7) * 100).toFixed(1)}%</div>
            </div>
          </div>
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
            disabled={!canTransport || isTransporting}
            className="w-full"
            size="lg"
          >
            <Target className="w-4 h-4 mr-2" />
            {isTransporting ? 'Transporting...' : 'Initiate Transport'}
          </Button>
          
          {!canTransport && (
            <div className="text-xs text-muted-foreground text-center">
              Minimum tPTT of 1e10 required for transport
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
  );
};