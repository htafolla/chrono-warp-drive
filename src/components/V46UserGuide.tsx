import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  BookOpen, 
  Settings, 
  Eye, 
  Download, 
  Zap, 
  ChevronDown, 
  ChevronRight,
  HelpCircle,
  Lightbulb,
  AlertCircle
} from 'lucide-react';

interface V46UserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function V46UserGuide({ isOpen, onClose }: V46UserGuideProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['basics']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              BLURRN v4.7 User Guide
              <Badge variant="default">CTI Cascade</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="overflow-y-auto max-h-[70vh]">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="v47">v4.7 CTI</TabsTrigger>
              <TabsTrigger value="controls">Controls</TabsTrigger>
              <TabsTrigger value="visualizer">Visualizer</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">BLURRN v4.7 Chrono Transport Cascade</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <strong>CTI Cascade System</strong>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Chrono Transport Interview with XOR-based cascade logic for dual black hole transport
                    </p>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-primary" />
                      <strong>Dual Black Hole Sync</strong>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Synchronized sequence calculation targeting 100% efficiency at n=34, δφ=0.3
                    </p>
                  </Card>
                </div>

                <Collapsible 
                  open={expandedSections.includes('basics')}
                  onOpenChange={() => toggleSection('basics')}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary">
                    {expandedSections.includes('basics') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <strong>Quick Start Guide (v4.7)</strong>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2 text-sm">
                    <div className="pl-6 space-y-2">
                      <p>1. <strong>Navigate to v4.7 Tab:</strong> Select "v4.7 Chrono Transport" tab</p>
                      <p>2. <strong>Adjust Cascade Parameters:</strong> Use ChronoSlider for δφ (0.25-0.3) and n (25-34)</p>
                      <p>3. <strong>Monitor CTI Status:</strong> Watch for "Approved" status and 100% efficiency</p>
                      <p>4. <strong>Visualize Entanglement:</strong> View 3D quantum entanglement sphere</p>
                      <p>5. <strong>Export Results:</strong> Use debug tools to export v4.7 CTI reports</p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </TabsContent>

            <TabsContent value="v47" className="space-y-4">
              <h3 className="text-lg font-semibold">v4.7 Chrono Transport Cascade</h3>
              
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4" />
                    <strong>CTI Formula</strong>
                  </div>
                  <div className="space-y-2 text-sm font-mono bg-muted p-3 rounded">
                    <p>CTI = (TDF × cascade_index) ⊕ (τ × φ^n)</p>
                    <p>cascade_index = floor(π / voids) + n</p>
                    <p>CTI capped at 1e6</p>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4" />
                    <strong>Quantum Entanglement (Q_ent)</strong>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="font-mono bg-muted p-2 rounded text-xs">
                      Q_ent = abs(CTI × cos(φn/2)/π × sin(φn/4) × exp(-n/20)) × (1 + δφ) × log(n+1)
                    </p>
                    <p><strong>Target:</strong> Maximize Q_ent for light-hold capability</p>
                    <p><strong>Sweet Spot:</strong> n=34, δφ=0.3 achieves ~0.0386 Q_ent</p>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <strong>Cascade Parameters</strong>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>Delta Phase (δφ): 0.25-0.3</strong></p>
                    <p className="pl-4">• 0.25-0.27: Conservative, stable</p>
                    <p className="pl-4">• 0.28-0.29: Optimal efficiency range</p>
                    <p className="pl-4">• 0.30: Maximum efficiency (100% at n=34)</p>
                    
                    <p className="mt-2"><strong>Cascade N: 25-34</strong></p>
                    <p className="pl-4">• 25-28: Initial cascade formation</p>
                    <p className="pl-4">• 29-32: Advanced synchronization</p>
                    <p className="pl-4">• 33-34: Breakthrough range (target tPTT: 5.3e12)</p>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4" />
                    <strong>Dual Black Hole Synchronization</strong>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>seq1:</strong> Primary black hole sequence (floor(TDF / 1e10))</p>
                    <p><strong>seq2:</strong> Secondary offset (seq1 + cascade_index)</p>
                    <p><strong>total:</strong> Combined for TDF calculation (seq1 + seq2)</p>
                    <p><strong>Sync Efficiency:</strong> Correlation between sequences (target: ~0.975)</p>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="controls" className="space-y-4">
              <h3 className="text-lg font-semibold">Temporal Displacement Controls</h3>
              
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4" />
                    <strong>τ (Time Dilation) - Range: 0.5-1.5</strong>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>0.5-0.8:</strong> Conservative range for initial testing</p>
                    <p><strong>0.8-0.9:</strong> Optimal for black hole light capture (v4.7: τ=0.865)</p>
                    <p><strong>1.0-1.2:</strong> Enhanced temporal effects</p>
                    <p><strong>1.2-1.5:</strong> Advanced exploration (breakthrough range)</p>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4" />
                    <strong>Growth Rate Multiplier - Range: 0.5-10</strong>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>0.5-2:</strong> Stable calculations, lower TDF values</p>
                    <p><strong>3-7:</strong> Moderate breakthrough potential</p>
                    <p><strong>8-10:</strong> Maximum TDF potential (monitor performance)</p>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <strong>Oscillator Modes</strong>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>528Hz:</strong> Traditional harmonic resonance</p>
                    <p><strong>C-Rhythm (3×10⁸ Hz):</strong> Light-speed frequency for v4.7 CTI breakthrough</p>
                    <p className="text-xs text-muted-foreground mt-2">v4.7 uses c-rhythm (P_o oscillator) for optimal transport</p>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="visualizer" className="space-y-4">
              <h3 className="text-lg font-semibold">v4.7 Visualizations</h3>
              
              <div className="space-y-4">
                <Card className="p-4">
                  <strong className="block mb-2">Quantum Entanglement Sphere</strong>
                  <div className="space-y-2 text-sm">
                    <p><strong>Scale:</strong> Grows with Q_ent value (quantum entanglement strength)</p>
                    <p><strong>Color:</strong> Hue shifts based on δφ and n parameters</p>
                    <p><strong>Animation:</strong> Pulsing correlates with entanglement intensity</p>
                    <p><strong>Rotation:</strong> Speed indicates cascade index progression</p>
                  </div>
                </Card>

                <Card className="p-4">
                  <strong className="block mb-2">Black Hole Light Patterns (v4.6 Legacy)</strong>
                  <div className="space-y-2 text-sm">
                    <p><strong>Spherical:</strong> BlackHole_Seq &lt; 1.5 - Basic light distribution</p>
                    <p><strong>Radial:</strong> BlackHole_Seq 1.5-2.5 - Radial light emanation</p>
                    <p><strong>Spiral:</strong> BlackHole_Seq &gt; 2.5 - Advanced spiral formations</p>
                  </div>
                </Card>

                <Card className="p-4">
                  <strong className="block mb-2">Visual Indicators</strong>
                  <div className="space-y-2 text-sm">
                    <p><strong>Particle Size:</strong> Scales with CTI value and TDF</p>
                    <p><strong>Color Intensity:</strong> Warmer colors = stronger transport readiness</p>
                    <p><strong>Animation Speed:</strong> Correlates with cascade index</p>
                    <p><strong>Pattern Complexity:</strong> Increases with dual black hole sync efficiency</p>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <h3 className="text-lg font-semibold">Advanced v4.7 Features</h3>
              
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="w-4 h-4" />
                    <strong>v4.7 Enhanced Debug Exports</strong>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p>• CTI components and cascade parameters</p>
                    <p>• Dual black hole synchronization metrics</p>
                    <p>• Quantum entanglement (Q_ent) tracking</p>
                    <p>• Transport status and efficiency logs</p>
                    <p>• Oscillator (P_o) frequency data at 3e8 m/s</p>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="w-4 h-4" />
                    <strong>Performance Monitoring</strong>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p>• CTI calculation time tracking</p>
                    <p>• Cascade computation performance</p>
                    <p>• TDF correlation with FPS (target: 120fps, min: 60fps)</p>
                    <p>• Memory usage for high-value CTI calculations</p>
                    <p>• Realtime optimization suggestions</p>
                  </div>
                </Card>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <strong className="block mb-2">v4.7 Breakthrough Thresholds</strong>
                  <div className="text-sm space-y-1">
                    <p>• CTI &gt; 1e5: Advanced cascade formation</p>
                    <p>• CTI ≈ 1e6: Maximum cascade (capped)</p>
                    <p>• tPTT ≈ 5.3e12: Target for 100% efficiency</p>
                    <p>• Q_ent &gt; 0.035: Strong light-hold capability</p>
                    <p>• Sync Efficiency &gt; 0.95: Dual black hole coherence</p>
                    <p>• n = 34, δφ = 0.3: Optimal breakthrough configuration</p>
                  </div>
                </div>

                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <strong className="block mb-2 text-primary">🚀 v4.7 Core Formulas</strong>
                  <div className="text-xs space-y-1 font-mono">
                    <p>CTI = (TDF × cascade_index) ⊕ (τ × φ^n)</p>
                    <p>cascade_index = floor(π / voids) + n</p>
                    <p>Q_ent = abs(CTI × cos(φn/2)/π × sin(φn/4) × exp(-n/20)) × (1 + δφ) × log(n+1)</p>
                    <p>score = min(1.0, (Q_ent × 10) + (CTI / 1e6) × 0.3)</p>
                    <p>efficiency = score × 100</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}