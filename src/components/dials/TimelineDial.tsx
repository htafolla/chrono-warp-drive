import React, { useMemo } from 'react';
import { CircularDial } from './CircularDial';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TimelineDialProps {
  currentValue: number;
  history: number[];
  className?: string;
}

export function TimelineDial({ currentValue, history, className = '' }: TimelineDialProps) {
  const metrics = useMemo(() => {
    if (history.length === 0) {
      return { average: currentValue, trend: 'stable' as const, volatility: 0 };
    }
    
    // Calculate moving average
    const recentHistory = history.slice(-10);
    const average = recentHistory.reduce((sum, val) => sum + val, 0) / recentHistory.length;
    
    // Calculate trend
    const mid = Math.floor(recentHistory.length / 2);
    const firstHalf = recentHistory.slice(0, mid);
    const secondHalf = recentHistory.slice(mid);
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (secondAvg > firstAvg + 0.05) trend = 'increasing';
    else if (secondAvg < firstAvg - 0.05) trend = 'decreasing';
    else trend = 'stable';
    
    // Calculate volatility (standard deviation)
    const variance = recentHistory.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / recentHistory.length;
    const volatility = Math.sqrt(variance);
    
    return { average, trend, volatility };
  }, [history, currentValue]);

  const color = useMemo(() => {
    if (currentValue > 0.8) return 'hsl(var(--chart-4))'; // High intensity - red/orange
    if (currentValue > 0.5) return 'hsl(var(--chart-3))'; // Medium - yellow/green
    return 'hsl(var(--chart-1))'; // Low - blue
  }, [currentValue]);

  const TrendIcon = metrics.trend === 'increasing' ? TrendingUp : 
                    metrics.trend === 'decreasing' ? TrendingDown : Minus;

  return (
    <div className={`relative ${className}`}>
      <CircularDial
        value={currentValue}
        color={color}
        label="Timeline"
        size={64}
        strokeWidth={5}
      />
      
      {/* Historical average ring (background) */}
      <svg width={64} height={64} className="absolute top-0 left-0 transform -rotate-45 pointer-events-none">
        <circle
          cx={32}
          cy={32}
          r={24}
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={2}
          strokeDasharray={`${metrics.average * 150} 150`}
          opacity={0.3}
        />
      </svg>
      
      {/* Trend indicator */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-background/80 backdrop-blur-sm rounded flex items-center gap-1 border border-border/50">
        <TrendIcon className="h-3 w-3" />
        <span className="text-[10px] font-medium">
          {(metrics.average * 100).toFixed(0)}%
        </span>
      </div>
      
      {/* Volatility indicator */}
      {metrics.volatility > 0.2 && (
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
      )}
    </div>
  );
}
