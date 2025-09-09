import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

interface EnergySafetySystemProps {
  e_t: number;
  energyGrowthRate: number;
  targetE_t: number;
  onSafetyOverride?: (action: 'cap' | 'warning' | 'emergency') => void;
  maxE_t?: number;
}

interface SafetyEvent {
  id: string;
  timestamp: Date;
  type: 'warning' | 'cap' | 'emergency';
  message: string;
  e_t_value: number;
}

export const EnergySafetySystem = ({
  e_t,
  energyGrowthRate,
  targetE_t,
  onSafetyOverride,
  maxE_t = 2.5
}: EnergySafetySystemProps) => {
  const [safetyEvents, setSafetyEvents] = useState<SafetyEvent[]>([]);
  const [lastWarningTime, setLastWarningTime] = useState<number>(0);

  // Safety thresholds
  const warningThreshold = maxE_t * 0.8; // 80% of max = 2.0
  const emergencyThreshold = maxE_t * 0.95; // 95% of max = 2.375

  // Calculate safety status
  const safetyStatus = React.useMemo(() => {
    if (e_t >= emergencyThreshold) return 'emergency';
    if (e_t >= warningThreshold) return 'warning';
    return 'safe';
  }, [e_t, warningThreshold, emergencyThreshold]);

  // Safety monitoring effect
  useEffect(() => {
    const now = Date.now();
    
    // Prevent spam warnings (max 1 per 5 seconds)
    if (now - lastWarningTime < 5000) return;

    let shouldTriggerEvent = false;
    let eventType: SafetyEvent['type'] = 'warning';
    let message = '';

    if (e_t >= emergencyThreshold) {
      shouldTriggerEvent = true;
      eventType = 'emergency';
      message = `EMERGENCY: E_t level critically high (${e_t.toFixed(3)}). System safety cap engaged.`;
      onSafetyOverride?.('emergency');
    } else if (e_t >= warningThreshold) {
      shouldTriggerEvent = true;
      eventType = 'warning';
      message = `WARNING: E_t approaching safety limit (${e_t.toFixed(3)}/${maxE_t}). Consider reducing growth rate.`;
      onSafetyOverride?.('warning');
    } else if (e_t >= maxE_t) {
      shouldTriggerEvent = true;
      eventType = 'cap';
      message = `SAFETY CAP: E_t capped at maximum safe level (${maxE_t}). Growth suspended.`;
      onSafetyOverride?.('cap');
    }

    if (shouldTriggerEvent) {
      const event: SafetyEvent = {
        id: `safety-${Date.now()}`,
        timestamp: new Date(),
        type: eventType,
        message,
        e_t_value: e_t
      };

      setSafetyEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
      setLastWarningTime(now);
    }
  }, [e_t, warningThreshold, emergencyThreshold, maxE_t, lastWarningTime, onSafetyOverride]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'emergency': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'emergency': return <AlertTriangle className="h-4 w-4" />;
      case 'warning': return <Shield className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const safetyProgress = Math.min((e_t / maxE_t) * 100, 100);
  const timeToLimit = energyGrowthRate > 0 ? (maxE_t - e_t) / (0.001 * energyGrowthRate) : Infinity;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Energy Safety System
          <Badge variant={getStatusColor(safetyStatus) as any}>
            {safetyStatus.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Safety Overview */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Energy Safety Level</span>
            <span className="text-sm font-mono">{e_t.toFixed(4)} / {maxE_t}</span>
          </div>
          <Progress 
            value={safetyProgress} 
            className={`h-3 ${safetyStatus === 'emergency' ? 'bg-red-100' : safetyStatus === 'warning' ? 'bg-yellow-100' : 'bg-green-100'}`}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Warning: {warningThreshold}</span>
            <span>Emergency: {emergencyThreshold}</span>
            <span>Max: {maxE_t}</span>
          </div>
        </div>

        {/* Time to Safety Limits */}
        {timeToLimit !== Infinity && timeToLimit > 0 && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4" />
              <span>Time to Safety Limit:</span>
              <span className="font-mono font-bold">
                {timeToLimit < 60 ? `${timeToLimit.toFixed(0)}s` :
                 timeToLimit < 3600 ? `${(timeToLimit/60).toFixed(1)}m` :
                 `${(timeToLimit/3600).toFixed(1)}h`}
              </span>
            </div>
          </div>
        )}

        {/* Current Safety Alert */}
        {safetyStatus !== 'safe' && (
          <Alert variant={safetyStatus === 'emergency' ? 'destructive' : 'default'}>
            {getStatusIcon(safetyStatus)}
            <AlertDescription>
              {safetyStatus === 'emergency' 
                ? `CRITICAL: E_t at ${e_t.toFixed(3)} - Emergency protocols engaged. System automatically limiting energy growth.`
                : `CAUTION: E_t at ${e_t.toFixed(3)} - Approaching safety threshold. Monitor system carefully.`
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Recent Safety Events */}
        {safetyEvents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Safety Events</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {safetyEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="p-2 text-xs bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant={event.type === 'emergency' ? 'destructive' : 'secondary'} className="text-xs px-1 py-0">
                      {event.type.toUpperCase()}
                    </Badge>
                    <span className="text-muted-foreground">
                      {event.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {event.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Safety Statistics */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 bg-muted rounded text-center">
            <div className="text-muted-foreground">Max Safe</div>
            <div className="font-mono font-bold">{maxE_t}</div>
          </div>
          <div className="p-2 bg-muted rounded text-center">
            <div className="text-muted-foreground">Buffer</div>
            <div className="font-mono font-bold">{(maxE_t - e_t).toFixed(3)}</div>
          </div>
          <div className="p-2 bg-muted rounded text-center">
            <div className="text-muted-foreground">Events</div>
            <div className="font-mono font-bold">{safetyEvents.length}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};