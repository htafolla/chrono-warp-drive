import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Rocket, Zap, Radio } from 'lucide-react';

interface TransportControlProps {
  n: number;
  deltaPhase: number;
  efficiency?: number;
  status?: 'Approved' | 'Pending' | 'Failed';
  onWarp?: () => void;
}

const TransportControl = ({ 
  n, 
  deltaPhase, 
  efficiency = 99.9,
  status = 'Pending',
  onWarp
}: TransportControlProps) => {
  const [p_o, setP_o] = useState(0);
  const [isWarping, setIsWarping] = useState(false);
  const [warpProgress, setWarpProgress] = useState(0);

  // Oscillator at 3e8 m/s (c-rhythm)
  useEffect(() => {
    const oscillator = () => {
      const t = Date.now() * 1e-6; // Time step
      const phi = 1.666;
      const newP_o = Math.sin(2 * Math.PI * 3e8 * t + Math.PI / phi);
      setP_o(newP_o);
    };

    const interval = setInterval(oscillator, 50); // Update every 50ms
    return () => clearInterval(interval);
  }, []);

  // Warp simulation
  useEffect(() => {
    if (isWarping) {
      const interval = setInterval(() => {
        setWarpProgress((prev) => {
          if (prev >= 100) {
            setIsWarping(false);
            return 0;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isWarping]);

  const handleWarp = () => {
    if (status === 'Approved') {
      setIsWarping(true);
      setWarpProgress(0);
      onWarp?.();
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'Approved': return 'default';
      case 'Pending': return 'secondary';
      case 'Failed': return 'destructive';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'Approved': return <Zap className="h-4 w-4" />;
      case 'Pending': return <Radio className="h-4 w-4" />;
      case 'Failed': return <Radio className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Transport Control System</span>
          <Badge variant={getStatusColor()} className="gap-1">
            {getStatusIcon()}
            {status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Oscillator Display */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Light-Speed Oscillator (P_o)</span>
            <Badge variant="outline" className="font-mono">
              3×10⁸ m/s
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Current Value</span>
              <span className="font-mono text-sm">{p_o.toFixed(6)}</span>
            </div>
            <Progress 
              value={((p_o + 1) / 2) * 100} 
              className="h-2"
            />
          </div>
        </div>

        {/* Transport Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground mb-1">Efficiency</div>
            <div className="text-2xl font-bold">{efficiency.toFixed(2)}%</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground mb-1">Cascade n</div>
            <div className="text-2xl font-bold">{n}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground mb-1">Delta Phase</div>
            <div className="text-2xl font-bold">{deltaPhase.toFixed(3)}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground mb-1">Black Holes</div>
            <div className="text-2xl font-bold">Dual</div>
          </div>
        </div>

        {/* Warp Control */}
        <div className="space-y-3">
          {isWarping && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Warping...</span>
                <span className="font-mono">{warpProgress}%</span>
              </div>
              <Progress value={warpProgress} className="h-2" />
            </div>
          )}
          
          <Button
            onClick={handleWarp}
            disabled={status !== 'Approved' || isWarping}
            className="w-full gap-2"
            size="lg"
          >
            <Rocket className="h-5 w-5" />
            {isWarping ? 'Warping...' : 'Initiate Time Warp'}
          </Button>
          
          {status !== 'Approved' && (
            <p className="text-xs text-center text-muted-foreground">
              {status === 'Pending' 
                ? 'Adjust cascade parameters to achieve 100% efficiency'
                : 'Transport system failed - check configuration'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TransportControl;
