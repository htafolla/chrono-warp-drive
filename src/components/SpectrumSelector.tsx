// Spectrum Selector for BLURRN v4.5 - Pickles Atlas Integration
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { PicklesAtlas, PicklesSpectrum } from '@/lib/picklesAtlas';
import { SpectrumData } from '@/types/sdss';
import { Star, Thermometer, Zap, Database } from 'lucide-react';

interface SpectrumSelectorProps {
  onSpectrumSelect: (spectrum: SpectrumData) => void;
  currentSpectrum?: SpectrumData | null;
}

export function SpectrumSelector({ onSpectrumSelect, currentSpectrum }: SpectrumSelectorProps) {
  const [picklesAtlas] = useState(() => new PicklesAtlas());
  const [availableSpectra, setAvailableSpectra] = useState<PicklesSpectrum[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [filteredSpectra, setFilteredSpectra] = useState<PicklesSpectrum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSpectrum, setSelectedSpectrum] = useState<PicklesSpectrum | null>(null);

  useEffect(() => {
    const initializeAtlas = async () => {
      try {
        await picklesAtlas.initialize();
        const spectra = picklesAtlas.getAvailableSpectra();
        setAvailableSpectra(spectra);
        setFilteredSpectra(spectra.slice(0, 20)); // Show first 20 by default
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize Pickles Atlas:', error);
        setIsLoading(false);
      }
    };

    initializeAtlas();
  }, []);

  const spectralTypes = Array.from(new Set(availableSpectra.map(s => s.spectralType.replace(/[IV]+$/, '')))).sort();

  const handleTypeFilter = (type: string) => {
    setSelectedType(type);
    if (type === 'all') {
      setFilteredSpectra(availableSpectra.slice(0, 20));
    } else {
      const filtered = availableSpectra.filter(s => s.spectralType.startsWith(type)).slice(0, 20);
      setFilteredSpectra(filtered);
    }
  };

  const handleSpectrumSelect = (spectrum: PicklesSpectrum) => {
    setSelectedSpectrum(spectrum);
    const spectrumData = picklesAtlas.generateSpectrumFromPickles(spectrum);
    onSpectrumSelect(spectrumData);
  };

  const handleRandomSpectrum = () => {
    const randomSpectrum = picklesAtlas.getRandomSpectrum();
    onSpectrumSelect(randomSpectrum);
    
    // Find the matching spectrum info for display
    const matchingSpec = availableSpectra.find(s => 
      randomSpectrum.metadata?.objid?.includes(s.id.split('_')[1])
    );
    if (matchingSpec) {
      setSelectedSpectrum(matchingSpec);
    }
  };

  const getTemperatureColor = (temp: number): string => {
    if (temp > 15000) return 'text-blue-400';
    if (temp > 8000) return 'text-blue-300';
    if (temp > 6000) return 'text-yellow-300';
    if (temp > 4000) return 'text-orange-400';
    return 'text-red-400';
  };

  const getSpectralTypeDescription = (type: string): string => {
    const baseType = type.charAt(0);
    switch (baseType) {
      case 'O': return 'Very hot blue stars';
      case 'B': return 'Hot blue-white stars';
      case 'A': return 'White stars';
      case 'F': return 'Yellow-white stars';
      case 'G': return 'Yellow stars (Sun-like)';
      case 'K': return 'Orange stars';
      case 'M': return 'Red dwarf stars';
      default: return 'Stellar spectrum';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Loading Pickles Atlas...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Pickles Atlas - Stellar Spectra Library
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {availableSpectra.length} high-resolution stellar spectra (1150-25000Å, 5Å sampling)
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleRandomSpectrum} variant="default" size="sm">
            <Zap className="h-4 w-4 mr-1" />
            Random Spectrum
          </Button>
          <Button 
            onClick={() => handleTypeFilter('all')} 
            variant={selectedType === 'all' ? 'default' : 'outline'} 
            size="sm"
          >
            Show All
          </Button>
        </div>

        {/* Spectral Type Filter */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Filter by Spectral Type</h4>
          <Select value={selectedType} onValueChange={handleTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Select spectral type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {spectralTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type} - {getSpectralTypeDescription(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Current Selection Info */}
        {selectedSpectrum && (
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{selectedSpectrum.name}</h4>
              <Badge variant="secondary">{selectedSpectrum.spectralType}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                <span className={getTemperatureColor(selectedSpectrum.temperature)}>
                  {selectedSpectrum.temperature.toLocaleString()} K
                </span>
              </div>
              <div>
                <strong>Metallicity:</strong> {selectedSpectrum.metallicity.toFixed(1)}
              </div>
              <div>
                <strong>Surface Gravity:</strong> log g = {selectedSpectrum.gravity.toFixed(1)}
              </div>
              <div>
                <strong>Range:</strong> {selectedSpectrum.wavelengthRange[0]}-{selectedSpectrum.wavelengthRange[1]}Å
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              {selectedSpectrum.description}
            </p>
          </div>
        )}

        {/* Spectrum List */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          <h4 className="text-sm font-medium">Available Spectra</h4>
          {filteredSpectra.map((spectrum) => (
            <div
              key={spectrum.id}
              className="flex items-center justify-between p-3 bg-card border rounded-lg hover:bg-accent cursor-pointer transition-colors"
              onClick={() => handleSpectrumSelect(spectrum)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{spectrum.spectralType}</span>
                  <Badge variant="outline" className="text-xs">
                    {spectrum.temperature > 10000 ? 'Hot' : 
                     spectrum.temperature > 6000 ? 'Warm' : 'Cool'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {spectrum.temperature.toLocaleString()}K, [Fe/H]={spectrum.metallicity.toFixed(1)}
                </p>
              </div>
              
              <div className={`w-3 h-3 rounded-full ${getTemperatureColor(spectrum.temperature).replace('text-', 'bg-')}`} />
            </div>
          ))}
        </div>

        {/* Data Source Info */}
        <Separator />
        
        <div className="text-xs text-muted-foreground">
          <p><strong>Data Source:</strong> STScI Pickles Stellar Spectral Atlas</p>
          <p><strong>Coverage:</strong> 131 stellar spectra, UV-to-IR (1150-25000Å)</p>
          <p><strong>Resolution:</strong> ~5Å sampling, calibrated flux density</p>
        </div>
      </CardContent>
    </Card>
  );
}