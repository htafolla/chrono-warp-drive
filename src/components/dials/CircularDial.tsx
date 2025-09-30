import React from 'react';

interface CircularDialProps {
  value: number; // 0-1 range
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  showNeedle?: boolean;
  className?: string;
}

export function CircularDial({
  value,
  size = 80,
  strokeWidth = 6,
  color = 'hsl(var(--primary))',
  label,
  showNeedle = true,
  className = ''
}: CircularDialProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value * circumference);
  const needleAngle = (value * 270) - 135; // -135° to 135° range

  return (
    <div className={`relative inline-flex flex-col items-center gap-1 ${className}`}>
      <svg width={size} height={size} className="transform -rotate-45">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          opacity={0.2}
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
        
        {/* Tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
          const angle = (tick * 270 - 135) * (Math.PI / 180);
          const x1 = size / 2 + (radius - 5) * Math.cos(angle);
          const y1 = size / 2 + (radius - 5) * Math.sin(angle);
          const x2 = size / 2 + radius * Math.cos(angle);
          const y2 = size / 2 + radius * Math.sin(angle);
          
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              opacity={0.3}
            />
          );
        })}
        
        {/* Needle */}
        {showNeedle && (
          <g className="transition-transform duration-300 ease-out" style={{ transformOrigin: `${size / 2}px ${size / 2}px`, transform: `rotate(${needleAngle}deg)` }}>
            <line
              x1={size / 2}
              y1={size / 2}
              x2={size / 2 + radius - 10}
              y2={size / 2}
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={3}
              fill={color}
            />
          </g>
        )}
      </svg>
      
      {/* Value display */}
      <div className="text-xs font-mono text-muted-foreground">
        {(value * 100).toFixed(0)}%
      </div>
      
      {label && (
        <div className="text-xs font-medium text-muted-foreground">
          {label}
        </div>
      )}
    </div>
  );
}
