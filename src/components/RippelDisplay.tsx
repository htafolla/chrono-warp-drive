// Rippel Text Display for BLURRN v4.5 - Multi-Modal Outputs
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { TPTTv4Result } from '@/types/sdss';
import { Copy, Download, Zap, Brain, Lock, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import CryptoJS from 'crypto-js';

interface RippelDisplayProps {
  tpttResult?: TPTTv4Result | null;
  rippel: string;
  time: number;
}

export function RippelDisplay({ tpttResult, rippel, time }: RippelDisplayProps) {
  const [fullRippelText, setFullRippelText] = useState<string>('');
  const [encryptedOutput, setEncryptedOutput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  // Throttle updates to prevent screen glitching
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime;
    
    // Only update if more than 2 seconds have passed
    if (timeSinceLastUpdate < 2000) {
      return;
    }

    if (tpttResult?.neuralOutput) {
      generateEnhancedRippel();
      setLastUpdateTime(now);
    } else {
      setFullRippelText(rippel);
    }
  }, [tpttResult, rippel]);

  const generateEnhancedRippel = () => {
    setIsGenerating(true);
    
    // Enhanced rippel generation with neural fusion data
    setTimeout(() => {
      const neural = tpttResult?.neuralOutput;
      const components = tpttResult?.components;
      
      let enhancedText = `=== BLURRN v4.5 Temporal Rippel ===\n\n`;
      
      // Core rippel
      enhancedText += `Primary Rippel: ${rippel}\n\n`;
      
      // Neural fusion output
      if (neural) {
        enhancedText += `=== Neural Fusion Output ===\n`;
        enhancedText += `Synaptic Sequence: ${neural.synapticSequence}\n`;
        enhancedText += `Metamorphosis Index: ${(neural.metamorphosisIndex * 100).toFixed(2)}%\n`;
        enhancedText += `Neural Confidence: ${(neural.confidenceScore * 100).toFixed(2)}%\n`;
        enhancedText += `Neural Spectra Points: ${neural.neuralSpectra.length}\n\n`;
      }
      
      // tPTT v4.5 Components
      if (components) {
        enhancedText += `=== tPTT v4.5 Components ===\n`;
        enhancedText += `Temporal Coherence (T_c): ${components.T_c.toFixed(4)}\n`;
        enhancedText += `Phase Synchronization (P_s): ${components.P_s.toFixed(4)}\n`;
        enhancedText += `Energy Temporal (E_t): ${components.E_t.toFixed(4)}\n`;
        enhancedText += `Wavelength Coverage (W_c): ${components.W_c.toFixed(4)}\n`;
        enhancedText += `Coherence Matrix (C_m): ${components.C_m.toFixed(4)}\n`;
        enhancedText += `Kuramoto Linkage (K_l): ${components.K_l.toFixed(4)}\n`;
        enhancedText += `Fractal Resonance (F_r): ${components.F_r.toFixed(4)}\n`;
        enhancedText += `Spectral Linkage (S_l): ${components.S_l.toFixed(4)}\n`;
        enhancedText += `Synaptic Coherence (Syn_c): ${components.Syn_c.toFixed(4)}\n`;
        enhancedText += `Quantum Entanglement (Q_e): ${components.Q_e.toFixed(4)}\n`;
        enhancedText += `Spectral Granularity (Sp_g): ${components.Sp_g.toFixed(4)}\n`;
        enhancedText += `Neural Synchronization (N_s): ${components.N_s.toFixed(4)}\n`;
        enhancedText += `Granularity Reactor (G_r): ${components.G_r.toFixed(4)}\n\n`;
      }
      
      // Temporal context
      enhancedText += `=== Temporal Context ===\n`;
      enhancedText += `Simulation Time: ${time.toFixed(2)} cycles\n`;
      enhancedText += `Generation Timestamp: ${new Date().toISOString()}\n`;
      enhancedText += `Final tPTT Value: ${tpttResult?.tPTT_value.toFixed(6) || 'N/A'}\n\n`;
      
      // Interpretation
      enhancedText += `=== Quantum Interpretation ===\n`;
      enhancedText += generateQuantumInterpretation();
      
      setFullRippelText(enhancedText);
      setIsGenerating(false);
      
      // Generate encrypted version
      generateEncryptedOutput(enhancedText);
    }, 1000);
  };

  const generateQuantumInterpretation = (): string => {
    if (!tpttResult?.neuralOutput) {
      return 'Neural fusion offline. Operating in legacy mode.\n';
    }
    
    const neural = tpttResult.neuralOutput;
    const components = tpttResult.components;
    
    let interpretation = '';
    
    // Metamorphosis analysis
    if (neural.metamorphosisIndex > 0.8) {
      interpretation += 'High metamorphic resonance detected. Dimensional boundaries are fluid.\n';
    } else if (neural.metamorphosisIndex > 0.5) {
      interpretation += 'Moderate metamorphic activity. Reality matrix shows stability with fluctuations.\n';
    } else {
      interpretation += 'Low metamorphic signature. Temporal streams remain coherent.\n';
    }
    
    // Quantum entanglement analysis
    if (components.Q_e > 0.7) {
      interpretation += 'Strong quantum entanglement detected. Non-local correlations active.\n';
    } else if (components.Q_e > 0.4) {
      interpretation += 'Moderate quantum coherence. Information transfer protocols nominal.\n';
    } else {
      interpretation += 'Weak quantum coupling. Classical physics domain preserved.\n';
    }
    
    // Neural synchronization
    if (components.N_s > 0.8) {
      interpretation += 'Neural networks achieving high synchronization. Collective intelligence emerging.\n';
    }
    
    // Fractal resonance
    if (components.F_r > 0.9) {
      interpretation += 'Fractal resonance cascade detected. Self-similar patterns amplifying across scales.\n';
    }
    
    interpretation += `\nSynaptic sequence "${neural.synapticSequence}" indicates `;
    if (neural.synapticSequence.includes('quantum')) {
      interpretation += 'quantum field interactions are dominant.\n';
    } else if (neural.synapticSequence.includes('temporal')) {
      interpretation += 'temporal dynamics are in primary control.\n';
    } else if (neural.synapticSequence.includes('neural')) {
      interpretation += 'neural pathways are actively restructuring.\n';
    } else {
      interpretation += 'multidimensional processes are converging.\n';
    }
    
    return interpretation;
  };

  const generateEncryptedOutput = (text: string) => {
    // Throttle encryption generation to prevent performance issues
    setTimeout(() => {
      const key = `BLURRN_${time.toFixed(0)}_${Date.now()}`;
      const encrypted = CryptoJS.AES.encrypt(text, key).toString();
      const encodedKey = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(key));
      
      setEncryptedOutput(`=== BLURRN v4.5 Encrypted Cipher ===\n\nKey: ${encodedKey}\nCipher: ${encrypted}\n\nDecryption: Use AES-256 with provided key\nGenerated: ${new Date().toISOString()}`);
    }, 500);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const synthesizeAudio = () => {
    // Basic audio synthesis of rippel text
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(rippel);
      utterance.rate = 0.8;
      utterance.pitch = 1.2;
      utterance.volume = 0.7;
      speechSynthesis.speak(utterance);
      toast.success('Rippel audio synthesis started');
    } else {
      toast.error('Speech synthesis not supported');
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Rippel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Primary Rippel Output
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg font-mono text-sm">
            {rippel}
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(rippel, 'Primary rippel')}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={synthesizeAudio}
            >
              <Volume2 className="h-4 w-4 mr-1" />
              Speak
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Neural Rippel */}
      {tpttResult?.neuralOutput && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Enhanced Neural Rippel
              <Badge variant="secondary">v4.5</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isGenerating ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-2" />
                Generating enhanced rippel...
              </div>
            ) : (
              <>
                <Textarea
                  value={fullRippelText}
                  readOnly
                  className="font-mono text-xs min-h-[300px]"
                  placeholder="Enhanced rippel will appear here..."
                />
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(fullRippelText, 'Enhanced rippel')}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadText(fullRippelText, `blurrn-rippel-${Date.now()}.txt`)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generateEnhancedRippel}
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Regenerate
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Encrypted Cipher Output */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Encrypted Cipher Output
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={encryptedOutput}
            readOnly
            className="font-mono text-xs min-h-[150px]"
            placeholder="Encrypted cipher will appear here..."
          />
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(encryptedOutput, 'Encrypted cipher')}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy Cipher
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadText(encryptedOutput, `blurrn-cipher-${Date.now()}.txt`)}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            AES-256 encrypted using temporal key. Decrypt with provided key for full access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}