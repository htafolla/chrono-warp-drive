import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { SPECTRUM_BANDS } from '@/lib/temporalCalculator';
import { SpectrumData } from '@/types/sdss';

interface SpectrumAnalyzerProps {
  waves: number[];
  time: number;
  spectrumData?: SpectrumData | null;
  isV4Enhanced?: boolean;
}

export function SpectrumAnalyzer({ waves, time, spectrumData, isV4Enhanced }: SpectrumAnalyzerProps) {
  // Use actual spectrum data if available, otherwise fall back to synthetic
  const isUsingRealData = spectrumData && spectrumData.wavelengths.length > 0;
  
  // Debug logging
  console.log("SpectrumAnalyzer render:", {
    hasSpectrumData: !!spectrumData,
    wavelengthCount: spectrumData?.wavelengths.length || 0,
    isUsingRealData,
    wavesCount: waves.length
  });
  
  // Prepare visualization data
  const chartData = isUsingRealData ? 
    // Real Pickles Atlas data
    spectrumData!.wavelengths.map((wavelength, index) => ({
      wavelength: Math.round(wavelength / 10), // Convert Å to nm
      intensity: Math.max(0, Math.min(2.0, spectrumData!.intensities[index] || 0)),
      source: 'pickles'
    })).filter((_, i) => i % 10 === 0) // Downsample for performance
    :
    // Fallback to synthetic data
    SPECTRUM_BANDS.map((band, index) => ({
      wavelength: Math.round(band.lambda * 1000),
      intensity: Math.max(0, Math.min(1.2, waves[index] || 0)),
      band: band.band,
      color: band.color,
      source: 'synthetic'
    }));

  // Calculate statistics based on data source
  const intensities = isUsingRealData ? spectrumData!.intensities : waves;
  const avgIntensity = intensities.reduce((sum, w) => sum + w, 0) / intensities.length;
  const maxIntensity = Math.max(...intensities);
  const minIntensity = Math.min(...intensities);
  
  // Calculate band intensities
  const uvIntensity = isUsingRealData ? 
    spectrumData!.intensities.slice(0, Math.floor(spectrumData!.intensities.length * 0.1)).reduce((sum, w) => sum + w, 0) / Math.floor(spectrumData!.intensities.length * 0.1) :
    waves.slice(0, 3).reduce((sum, w) => sum + w, 0) / 3;
    
  const visibleIntensity = isUsingRealData ?
    spectrumData!.intensities.slice(Math.floor(spectrumData!.intensities.length * 0.1), Math.floor(spectrumData!.intensities.length * 0.7)).reduce((sum, w) => sum + w, 0) / Math.floor(spectrumData!.intensities.length * 0.6) :
    waves.slice(3, 7).reduce((sum, w) => sum + w, 0) / 4;
    
  const irIntensity = isUsingRealData ?
    spectrumData!.intensities.slice(Math.floor(spectrumData!.intensities.length * 0.7)).reduce((sum, w) => sum + w, 0) / Math.floor(spectrumData!.intensities.length * 0.3) :
    waves.slice(7).reduce((sum, w) => sum + w, 0) / 2;

  return (
    <div className="space-y-6">
      {/* Spectrum Source Info */}
      {isUsingRealData && spectrumData?.metadata && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Stellar Spectrum Analysis
              <Badge variant="secondary">{spectrumData.source}</Badge>
              {isV4Enhanced && <Badge variant="default">v4.5</Badge>}
            </CardTitle>
            <CardDescription>
              {spectrumData.metadata.class} • {spectrumData.metadata.objid || 'Unknown ID'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Classification</div>
                <div className="font-medium">{spectrumData.metadata.class || 'Unknown'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Redshift</div>
                <div className="font-medium">{spectrumData.metadata.redshift?.toFixed(4) || 'N/A'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Data Points</div>
                <div className="font-medium">{spectrumData.wavelengths.length.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Range</div>
                <div className="font-medium">{Math.round(spectrumData.wavelengths[0]/10)}-{Math.round(spectrumData.wavelengths[spectrumData.wavelengths.length-1]/10)}nm</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Spectrum Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {isUsingRealData ? 'Stellar Spectrum (Pickles Atlas)' : 'Synthetic Spectrum Analysis (250-2500nm)'}
            </CardTitle>
            <CardDescription>
              {isUsingRealData ? 
                `${spectrumData!.wavelengths.length} wavelength points • ${spectrumData!.granularity.toFixed(1)}Å resolution` :
                'Real-time intensity across UV, Visible, and IR wavelengths'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="wavelength" 
                    label={{ value: 'Wavelength (nm)', position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis 
                    label={{ value: 'Intensity', angle: -90, position: 'insideLeft' }}
                    domain={[0, isUsingRealData ? 2.0 : 1.2]}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [value.toFixed(3), 'Intensity']}
                    labelFormatter={(wavelength: number) => `${wavelength}nm`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="intensity" 
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Spectrum Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Intensity Statistics</CardTitle>
            <CardDescription>
              {isUsingRealData ? 'Stellar spectrum analysis metrics' : 'Synthetic wave analysis metrics'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Average</div>
                <div className="text-2xl font-bold">{avgIntensity.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Peak</div>
                <div className="text-2xl font-bold text-primary">{maxIntensity.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Minimum</div>
                <div className="text-2xl font-bold">{minIntensity.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Time</div>
                <div className="text-2xl font-bold font-mono">{time.toFixed(1)}s</div>
              </div>
            </div>
            {isUsingRealData && (
              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-2">Data Source</div>
                <div className="text-sm">{spectrumData!.source} • {spectrumData!.wavelengths.length} points</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Band Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Spectral Regions</CardTitle>
            <CardDescription>
              {isUsingRealData ? 'Intensity by stellar spectrum regions' : 'Intensity by wavelength band'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* UV Region */}
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <div>
                <div className="font-medium">Ultraviolet</div>
                <div className="text-sm text-muted-foreground">
                  {isUsingRealData ? 'Short wavelength region' : '250-380nm'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold" style={{ color: 'hsl(225, 73%, 50%)' }}>
                  {uvIntensity.toFixed(3)}
                </div>
              </div>
            </div>

            {/* Visible Region */}
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <div>
                <div className="font-medium">Visible Light</div>
                <div className="text-sm text-muted-foreground">
                  {isUsingRealData ? 'Optical spectrum region' : '380-750nm'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold" style={{ color: 'hsl(120, 100%, 50%)' }}>
                  {visibleIntensity.toFixed(3)}
                </div>
              </div>
            </div>

            {/* IR Region */}
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <div>
                <div className="font-medium">Infrared</div>
                <div className="text-sm text-muted-foreground">
                  {isUsingRealData ? 'Long wavelength region' : '750-2500nm'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold" style={{ color: 'hsl(15, 100%, 50%)' }}>
                  {irIntensity.toFixed(3)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wavelength Breakdown - Show only for synthetic data */}
      {!isUsingRealData && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Synthetic Band Breakdown</CardTitle>
            <CardDescription>Individual band intensities and characteristics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {SPECTRUM_BANDS.map((band, index) => (
                <div 
                  key={band.band}
                  className="p-3 rounded-lg border"
                  style={{ borderColor: band.color }}
                >
                  <div className="text-sm font-medium mb-1">{band.band}</div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {Math.round(band.lambda * 1000)}nm
                  </div>
                  <div className="text-lg font-bold" style={{ color: band.color }}>
                    {(waves[index] || 0).toFixed(3)}
                  </div>
                  <div className="w-full bg-muted rounded-full h-1 mt-2">
                    <div 
                      className="h-1 rounded-full transition-all duration-100"
                      style={{ 
                        backgroundColor: band.color,
                        width: `${Math.max(0, Math.min(100, ((waves[index] || 0) / 2) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}