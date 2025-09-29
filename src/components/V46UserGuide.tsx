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
              BLURRN v4.6 User Guide
              <Badge variant="secondary">Complete</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="overflow-y-auto max-h-[70vh]">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="controls">Controls</TabsTrigger>
              <TabsTrigger value="visualizer">Visualizer</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">BLURRN v4.6 Breakthrough Features</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <strong>TDF Calculations</strong>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Temporal Displacement Factor targeting ~5.781e12 for breakthrough scenarios
                    </p>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-primary" />
                      <strong>Hidden Light Patterns</strong>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Advanced visualization with spiral/radial patterns based on BlackHole_Seq
                    </p>
                  </Card>
                </div>

                <Collapsible 
                  open={expandedSections.includes('basics')}
                  onOpenChange={() => toggleSection('basics')}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary">
                    {expandedSections.includes('basics') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <strong>Quick Start Guide</strong>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2 text-sm">
                    <div className="pl-6 space-y-2">
                      <p>1. <strong>Enable Time Shift Mode:</strong> Toggle the switch in Temporal Displacement Controls</p>
                      <p>2. <strong>Adjust Parameters:</strong> Set τ (0.5-1.5) and growth rate (0.5-10)</p>
                      <p>3. <strong>Run Experiment:</strong> Click "Run TDF Experiment" to start calculations</p>
                      <p>4. <strong>Monitor Results:</strong> Watch visualizer and check performance metrics</p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
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
                    <p><strong>0.8-0.9:</strong> Optimal for black hole light capture</p>
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
                    <p><strong>C-Rhythm (3×10⁸ Hz):</strong> Light-speed frequency for TDF breakthrough</p>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="visualizer" className="space-y-4">
              <h3 className="text-lg font-semibold">Black Hole Light Visualizer</h3>
              
              <div className="space-y-4">
                <Card className="p-4">
                  <strong className="block mb-2">Pattern Types (Auto-Selected)</strong>
                  <div className="space-y-2 text-sm">
                    <p><strong>Spherical:</strong> BlackHole_Seq &lt; 1.5 - Basic light distribution</p>
                    <p><strong>Radial:</strong> BlackHole_Seq 1.5-2.5 - Radial light emanation</p>
                    <p><strong>Spiral:</strong> BlackHole_Seq &gt; 2.5 - Advanced spiral formations</p>
                  </div>
                </Card>

                <Card className="p-4">
                  <strong className="block mb-2">Visual Indicators</strong>
                  <div className="space-y-2 text-sm">
                    <p><strong>Particle Size:</strong> Scales with TDF value and light intensity</p>
                    <p><strong>Color Intensity:</strong> Warmer colors indicate stronger light capture</p>
                    <p><strong>Animation Speed:</strong> Correlates with time dilation factor (τ)</p>
                    <p><strong>Pattern Complexity:</strong> Increases with BlackHole_Seq values</p>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <h3 className="text-lg font-semibold">Advanced Features & Monitoring</h3>
              
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="w-4 h-4" />
                    <strong>Enhanced Experiment Logging</strong>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p>• Dual export format: JSON + Markdown</p>
                    <p>• Structured metadata with performance tiers</p>
                    <p>• Breakthrough count and validation statistics</p>
                    <p>• Scientific notation for TDF values</p>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="w-4 h-4" />
                    <strong>Performance Monitoring</strong>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p>• TDF-specific warnings for extreme values (&gt;1e12)</p>
                    <p>• FPS monitoring with TDF correlation</p>
                    <p>• Memory usage tracking for high calculations</p>
                    <p>• Cycle-based performance recommendations</p>
                  </div>
                </Card>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <strong className="block mb-2">Breakthrough Thresholds</strong>
                  <div className="text-sm space-y-1">
                    <p>• TDF &gt; 1e6: Dynamic S_L uncapping activated</p>
                    <p>• TDF &gt; 1e12: Breakthrough range detection</p>
                    <p>• TDF ≈ 5.781e12: Target breakthrough value</p>
                    <p>• Cycle &gt; 500: Extended computation warnings</p>
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