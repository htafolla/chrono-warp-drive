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
      {/* Pulsing outer ring for high activity */}
      <div 
        className="absolute inset-0 rounded-full border-2 opacity-20 animate-pulse"
        style={{ 
          borderColor: color,
          animationDuration: `${2 - (currentValue * 0.5)}s`
        }}
      />
      
      <CircularDial
        value={currentValue}
        color={color}
        label="Timeline"
        size={64}
        strokeWidth={5}
      />
      
      {/* Animated historical average ring with wave effect */}
      <svg width={64} height={64} className="absolute top-0 left-0 transform -rotate-45 pointer-events-none">
        <circle
          cx={32}
          cy={32}
          r={24}
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={3}
          strokeDasharray={`${metrics.average * 150} 150`}
          strokeLinecap="round"
          opacity={0.4}
          className="transition-all duration-1000"
        />
        <circle
          cx={32}
          cy={32}
          r={24}
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={5}
          strokeDasharray={`${metrics.average * 150} 150`}
          strokeLinecap="round"
          opacity={0.1}
          className="transition-all duration-1000"
          style={{ filter: 'blur(2px)' }}
        />
      </svg>
      
      {/* Enhanced trend indicator with glow */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-background/90 backdrop-blur-sm rounded flex items-center gap-1 border border-border/50 shadow-lg">
        <TrendIcon className={`h-3 w-3 ${metrics.trend === 'increasing' ? 'text-green-500 animate-pulse' : metrics.trend === 'decreasing' ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
        <span className="text-[10px] font-medium tabular-nums">
          {(metrics.average * 100).toFixed(0)}%
        </span>
      </div>
      
      {/* Enhanced volatility indicator with rings */}
      {metrics.volatility > 0.15 && (
        <div className="absolute top-1 left-1">
          <div 
            className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"
            style={{ boxShadow: '0 0 8px hsl(var(--chart-3))' }}
          />
          <div 
            className="absolute inset-0 w-2 h-2 rounded-full bg-yellow-500 animate-ping"
            style={{ opacity: 0.4 }}
          />
        </div>
      )}
    </div>
  );
}
