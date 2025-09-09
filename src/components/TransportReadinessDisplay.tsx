import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Rocket, 
  Clock, 
  Zap, 
  Target, 
  CheckCircle, 
  AlertTriangle, 
  Activity,
  TrendingUp,
  Calendar
} from 'lucide-react';

interface TransportReadinessDisplayProps {
  tPTT_value: number;
  e_t: number;
  transportReadiness: number;
  phaseCoherence: number;
  neuralSync: number;
  isotopeResonance: number;
  canTransport: boolean;
  isTransporting: boolean;
  etaToReady: number; // seconds
  energyTrend: 'increasing' | 'decreasing' | 'stable';
  optimizations: string[];
  temporal?: {
    targetMJD: number;
    targetUTC: Date;
    temporalOffset: number;
    yearsAgo: number;
    emissionEra: string;
    isCosmicObject: boolean;
    isPrimordial: boolean;
    lightTravelTimeYears: number;
    transportWindow: string;
    formatted: string;
  };
  onTransport: () => void;
  onOptimize: (optimization: string) => void;
}

export const TransportReadinessDisplay = ({
  tPTT_value,
  e_t,
  transportReadiness = 0,
  phaseCoherence = 0,
  neuralSync = 0,
  isotopeResonance = 0,
  canTransport = false,
  isTransporting = false,
  etaToReady = 0,
  energyTrend = 'stable',
  optimizations = [],
  temporal,
  onTransport,
  onOptimize
}: TransportReadinessDisplayProps) => {

  const formatETA = (seconds: number) => {
    if (seconds <= 0) return "Ready Now";
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
    return `${Math.ceil(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m`;
  };

  const getReadinessColor = () => {
    if (transportReadiness >= 95) return "text-green-500";
    if (transportReadiness >= 80) return "text-blue-500";
    if (transportReadiness >= 60) return "text-yellow-500";
    if (transportReadiness >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getStatusBadge = () => {
    if (canTransport) return <Badge variant="default">READY</Badge>;
    if (transportReadiness > 80) return <Badge variant="secondary">PREPARING</Badge>;
    if (transportReadiness > 40) return <Badge variant="outline">CHARGING</Badge>;
    return <Badge variant="destructive">OFFLINE</Badge>;
  };

  const getTrendIcon = () => {
    switch (energyTrend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default: return <Activity className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getSystemHealth = () => {
    const scores = [phaseCoherence, neuralSync, isotopeResonance, e_t * 50];
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.min(average, 100);
  };

  const systemHealth = getSystemHealth();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Transport Readiness
            {getStatusBadge()}
          </div>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span className={`text-2xl font-bold ${getReadinessColor()}`}>
              {transportReadiness.toFixed(1)}%
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Readiness Progress */}
        <div className="space-y-2">
          <Progress value={transportReadiness} className="h-3" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Transport Capability</span>
            <span className="font-mono">{transportReadiness.toFixed(1)}% ready</span>
          </div>
        </div>

        {/* ETA and System Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Time to Ready</span>
            </div>
            <div className="text-lg font-bold">
              {canTransport ? "Ready Now" : formatETA(etaToReady)}
            </div>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">System Health</span>
            </div>
            <div className="text-lg font-bold">
              {systemHealth.toFixed(0)}%
            </div>
          </div>
        </div>

        <Separator />

        {/* Destination Time Display */}
        {temporal && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Destination Time</span>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Target Date</span>
                      <span className="text-sm font-mono">
                        {temporal.targetUTC.toISOString().split('T')[0]}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Years Ago</span>
                      <span className="text-sm font-mono">
                        {temporal.yearsAgo < 1000 
                          ? `${temporal.yearsAgo.toFixed(0)} years`
                          : temporal.yearsAgo < 1e6 
                            ? `${(temporal.yearsAgo/1000).toFixed(1)}K years`
                            : `${(temporal.yearsAgo/1e6).toFixed(2)}M years`
                        }
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Emission Era</span>
                      <Badge 
                        variant={
                          temporal.emissionEra === 'Recent' ? 'default' :
                          temporal.emissionEra === 'Historical' ? 'secondary' :
                          temporal.emissionEra === 'Geological' ? 'outline' :
                          'destructive'
                        }
                      >
                        {temporal.emissionEra}
                      </Badge>
                    </div>
                    
                    <div className="pt-2 text-xs text-muted-foreground">
                      {temporal.transportWindow}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* Detailed System Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>tPTT Energy</span>
              <span className="font-mono">{tPTT_value.toExponential(1)}</span>
            </div>
            <Progress value={Math.min((Math.log10(tPTT_value) + 10) * 5, 100)} className="h-1" />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>E_t Level</span>
              <span className="font-mono">{e_t.toFixed(3)}</span>
            </div>
            <Progress value={(e_t / 2.0) * 100} className="h-1" />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Phase Coherence</span>
              <span className="font-mono">{phaseCoherence.toFixed(1)}%</span>
            </div>
            <Progress value={phaseCoherence} className="h-1" />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Neural Sync</span>
              <span className="font-mono">{neuralSync.toFixed(1)}%</span>
            </div>
            <Progress value={neuralSync} className="h-1" />
          </div>
        </div>

        <Separator />

        {/* Transport Control */}
        <div className="space-y-3">
          <Button
            onClick={onTransport}
            disabled={!canTransport || isTransporting}
            className="w-full"
            size="lg"
          >
            {isTransporting ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-spin" />
                Transporting...
              </>
            ) : canTransport ? (
              <>
                <Rocket className="h-4 w-4 mr-2" />
                Initiate Transport
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Insufficient Energy
              </>
            )}
          </Button>

          {/* Status Message */}
          {canTransport ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Transport systems are ready. All parameters within nominal range.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Transport unavailable. {etaToReady > 0 ? `Ready in ${formatETA(etaToReady)}.` : "Check system parameters."}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Optimization Suggestions */}
        {optimizations.length > 0 && !canTransport && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">Optimization Suggestions</span>
            </div>
            <div className="space-y-1">
              {optimizations.map((opt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => onOptimize(opt)}
                >
                  {opt}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Energy Flow Indicator */}
        <div className="flex items-center justify-center p-2 bg-primary/5 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Energy Flow:</span>
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span className="capitalize font-medium">{energyTrend}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};