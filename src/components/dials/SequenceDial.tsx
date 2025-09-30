import React, { useMemo } from 'react';
import { CircularDial } from './CircularDial';

interface SequenceDialProps {
  sequence: string;
  className?: string;
}

const SEQUENCE_MAPPING: Record<string, { value: number; color: string; label: string }> = {
  'quantum': { value: 0.25, color: 'hsl(var(--chart-1))', label: 'Quantum' },
  'surge': { value: 0.50, color: 'hsl(var(--chart-2))', label: 'Surge' },
  'neural': { value: 0.75, color: 'hsl(var(--chart-3))', label: 'Neural' },
  'entanglement': { value: 1.0, color: 'hsl(var(--chart-4))', label: 'Entangle' },
  'cascade': { value: 0.60, color: 'hsl(var(--chart-5))', label: 'Cascade' },
  'resonance': { value: 0.85, color: 'hsl(var(--primary))', label: 'Resonance' },
};

export function SequenceDial({ sequence, className = '' }: SequenceDialProps) {
  const sequenceData = useMemo(() => {
    const lowerSequence = sequence.toLowerCase();
    
    // Find matching sequence type
    for (const [key, data] of Object.entries(SEQUENCE_MAPPING)) {
      if (lowerSequence.includes(key)) {
        return data;
      }
    }
    
    // Default fallback - use sequence complexity as value
    const complexity = Math.min(sequence.split(/[-_\s]/).length / 10, 1);
    return {
      value: complexity,
      color: 'hsl(var(--muted-foreground))',
      label: 'Unknown'
    };
  }, [sequence]);

  return (
    <div className={`relative ${className}`}>
      {/* Rotating energy ring */}
      <div 
        className="absolute inset-0 rounded-full border-2 border-dashed opacity-20 animate-spin"
        style={{ 
          borderColor: sequenceData.color,
          animationDuration: '8s'
        }}
      />
      
      <CircularDial
        value={sequenceData.value}
        color={sequenceData.color}
        label="Sequence"
        size={64}
        strokeWidth={5}
      />
      
      {/* Sequence type indicator with glow */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-background/90 backdrop-blur-sm rounded text-[10px] font-medium whitespace-nowrap border border-border/50 shadow-lg animate-pulse" style={{ boxShadow: `0 0 10px ${sequenceData.color}40` }}>
        {sequenceData.label}
      </div>
      
      {/* Enhanced activity pulse with rings */}
      <div className="absolute top-1 right-1">
        <div 
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ 
            backgroundColor: sequenceData.color,
            boxShadow: `0 0 8px ${sequenceData.color}`
          }}
        />
        <div 
          className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
          style={{ 
            backgroundColor: sequenceData.color,
            opacity: 0.4
          }}
        />
      </div>
    </div>
  );
}
