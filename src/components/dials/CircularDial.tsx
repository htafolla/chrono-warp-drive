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
  const needleAngle = (value * 270) - 135;

  return (
    <div className={`relative inline-flex flex-col items-center gap-1 ${className}`}>
      {/* Ambient glow effect */}
      <div 
        className="absolute inset-0 rounded-full blur-xl opacity-30 animate-pulse"
        style={{ 
          backgroundColor: color,
          animationDuration: '3s'
        }}
      />
      
      {/* Particle system - reduced for performance */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full opacity-40"
            style={{
              backgroundColor: color,
              left: '50%',
              top: '50%',
              animation: `float-particle-${i} ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`
            }}
          />
        ))}
      </div>
      
      <svg 
        width={size} 
        height={size} 
        className="transform -rotate-45 relative z-10"
        style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.3))' }}
      >
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
        
        {/* Animated progress circle with trail effect */}
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
          className="transition-all duration-700 ease-out"
          style={{
            filter: `drop-shadow(0 0 4px ${color})`,
            opacity: 0.9
          }}
        />
        
        {/* Trailing glow effect */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 2}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{
            opacity: 0.2,
            filter: 'blur(3px)'
          }}
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
      
      {/* Value display with glassmorphism */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="px-2 py-1 rounded-lg backdrop-blur-sm bg-background/60 border border-border/30 shadow-lg">
          <span className="text-sm font-bold font-mono" style={{ color }}>
            {(value * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      
      {label && (
        <div className="text-xs font-medium text-muted-foreground mt-1">
          {label}
        </div>
      )}
      
      <style>{`
        @keyframes float-particle-0 {
          0%, 100% { transform: translate(-10px, -15px); opacity: 0; }
          50% { transform: translate(-15px, -25px); opacity: 0.6; }
        }
        @keyframes float-particle-1 {
          0%, 100% { transform: translate(10px, -15px); opacity: 0; }
          50% { transform: translate(15px, -25px); opacity: 0.6; }
        }
        @keyframes float-particle-2 {
          0%, 100% { transform: translate(15px, 0px); opacity: 0; }
          50% { transform: translate(25px, -5px); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
