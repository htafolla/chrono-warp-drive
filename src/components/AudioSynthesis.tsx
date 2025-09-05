import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { FREQ } from '@/lib/temporalCalculator';

interface AudioSynthesisProps {
  phases: number[];
  e_t: number;
  tPTT_value: number;
  fractalToggle: boolean;
}

export function AudioSynthesis({ phases, e_t, tPTT_value, fractalToggle }: AudioSynthesisProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([0.3]);
  const [harmonicMode, setHarmonicMode] = useState(false);
  const [audioSupported, setAudioSupported] = useState(true);
  const [transportReady, setTransportReady] = useState(false);
  const [transportReadyCount, setTransportReadyCount] = useState(0);

  useEffect(() => {
    // Initialize Web Audio API
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        setAudioSupported(false);
        return;
      }
      
      audioContextRef.current = new AudioContext();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = volume[0];
    } catch (error) {
      console.error('Audio initialization failed:', error);
      setAudioSupported(false);
    }

    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume[0];
    }
  }, [volume]);

  useEffect(() => {
    if (isPlaying && audioContextRef.current && gainNodeRef.current) {
      updateFrequencies();
    }
  }, [phases, e_t, fractalToggle, isPlaying]);

  // Stabilize transport ready state to prevent flicker
  useEffect(() => {
    const isCurrentlyReady = tPTT_value > 1e12;
    
    if (isCurrentlyReady) {
      setTransportReadyCount(prev => Math.min(prev + 1, 10));
    } else {
      setTransportReadyCount(prev => Math.max(prev - 1, 0));
    }
    
    // Only show transport ready if it's been stable for multiple cycles
    setTransportReady(transportReadyCount >= 5);
  }, [tPTT_value, transportReadyCount]);

  const startAudio = async () => {
    if (!audioContextRef.current || !gainNodeRef.current) return;

    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      stopAudio();

      // Create oscillators for each phase
      oscillatorsRef.current = phases.map((phase, index) => {
        const oscillator = audioContextRef.current!.createOscillator();
        
        // Calculate frequency based on temporal parameters
        const baseFreq = FREQ; // 528 Hz
        const phaseModulation = Math.sin(phase) * (fractalToggle ? 0.3 : 0.1);
        const entropyModulation = e_t * 0.2;
        
        let frequency = baseFreq * (1 + phaseModulation + entropyModulation);
        
        // Add harmonic series if enabled
        if (harmonicMode) {
          frequency = baseFreq * (index + 1) * 0.5; // Harmonic intervals
        }
        
        oscillator.frequency.value = Math.max(100, Math.min(frequency, 2000)); // Clamp frequency
        oscillator.type = fractalToggle ? 'sawtooth' : 'sine';
        
        // Create individual gain for each oscillator
        const oscGain = audioContextRef.current!.createGain();
        oscGain.gain.value = 0.3 / phases.length; // Distribute volume
        
        oscillator.connect(oscGain);
        oscGain.connect(gainNodeRef.current!);
        
        oscillator.start();
        return oscillator;
      });

      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to start audio:', error);
      setAudioSupported(false);
    }
  };

  const stopAudio = () => {
    oscillatorsRef.current.forEach(oscillator => {
      try {
        oscillator.stop();
        oscillator.disconnect();
      } catch (error) {
        // Oscillator might already be stopped
      }
    });
    oscillatorsRef.current = [];
    setIsPlaying(false);
  };

  const updateFrequencies = () => {
    oscillatorsRef.current.forEach((oscillator, index) => {
      try {
        const phase = phases[index] || 0;
        const baseFreq = FREQ;
        const phaseModulation = Math.sin(phase) * (fractalToggle ? 0.3 : 0.1);
        const entropyModulation = e_t * 0.2;
        
        let frequency = baseFreq * (1 + phaseModulation + entropyModulation);
        
        if (harmonicMode) {
          frequency = baseFreq * (index + 1) * 0.5;
        }
        
        oscillator.frequency.setValueAtTime(
          Math.max(100, Math.min(frequency, 2000)), 
          audioContextRef.current!.currentTime
        );
      } catch (error) {
        // Ignore frequency update errors for stopped oscillators
      }
    });
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      startAudio();
    }
  };

  if (!audioSupported) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle>Audio Synthesis</CardTitle>
          <CardDescription>Web Audio API not supported in this browser</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Audio synthesis requires a modern browser with Web Audio API support.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cosmic-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Temporal Audio Synthesis
          <Badge variant={isPlaying ? "default" : "secondary"}>
            {isPlaying ? "Active" : "Inactive"}
          </Badge>
        </CardTitle>
        <CardDescription>
          528Hz harmonic frequencies synchronized with temporal phases
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={togglePlayback}
            variant={isPlaying ? "destructive" : "default"}
            className="flex items-center gap-2"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? "Stop" : "Start"}
          </Button>

          <div className="flex items-center gap-2 flex-1">
            {volume[0] === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            <Slider
              value={volume}
              onValueChange={setVolume}
              min={0}
              max={0.8}
              step={0.1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-12">
              {Math.round(volume[0] * 100)}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Harmonic Series Mode</div>
            <div className="text-xs text-muted-foreground">
              Generate harmonic frequencies based on phase relationships
            </div>
          </div>
          <Switch
            checked={harmonicMode}
            onCheckedChange={setHarmonicMode}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-lg font-mono">{FREQ}Hz</div>
            <div className="text-xs text-muted-foreground">Base Frequency</div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-lg font-mono">{phases.length}</div>
            <div className="text-xs text-muted-foreground">Phase Channels</div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-lg font-mono">
              {fractalToggle ? "5D" : "3D"}
            </div>
            <div className="text-xs text-muted-foreground">Synthesis Mode</div>
          </div>
        </div>

        {transportReady && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="text-sm font-medium text-primary flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Transport Ready - Harmonic Resonance Achieved
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Temporal frequencies aligned for chrono-transport activation
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}