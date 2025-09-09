import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Star, Zap, Target, TrendingUp, Database } from 'lucide-react';
import { SpectrumData } from '@/types/sdss';

interface StellarProfile {
  type: string;
  temperature: number;
  energyMultiplier: number;
  transportEfficiency: number;
  recommendedFor: string;
  color: string;
}

interface SpectrumIntelligenceProps {
  currentSpectrum?: SpectrumData | null;
  onRecommendSpectrum: (type: string) => void;
  energyBoostFactor: number;
  distanceScaling: number;
  stellarAgeFactor: number;
}

export const SpectrumIntelligence = ({
  currentSpectrum,
  onRecommendSpectrum,
  energyBoostFactor,
  distanceScaling,
  stellarAgeFactor
}: SpectrumIntelligenceProps) => {

  const stellarProfiles: StellarProfile[] = [
    {
      type: 'O-Type',
      temperature: 30000,
      energyMultiplier: 5.0,
      transportEfficiency: 95,
      recommendedFor: 'Maximum Energy Transport',
      color: 'blue'
    },
    {
      type: 'B-Type',
      temperature: 15000,
      energyMultiplier: 3.5,
      transportEfficiency: 85,
      recommendedFor: 'High Energy Operations',
      color: 'blue'
    },
    {
      type: 'A-Type',
      temperature: 8000,
      energyMultiplier: 2.2,
      transportEfficiency: 75,
      recommendedFor: 'Balanced Performance',
      color: 'white'
    },
    {
      type: 'F-Type',
      temperature: 6500,
      energyMultiplier: 1.8,
      transportEfficiency: 65,
      recommendedFor: 'Stable Transport',
      color: 'yellow'
    },
    {
      type: 'G-Type',
      temperature: 5500,
      energyMultiplier: 1.4,
      transportEfficiency: 55,
      recommendedFor: 'Standard Operations',
      color: 'yellow'
    },
    {
      type: 'K-Type',
      temperature: 4000,
      energyMultiplier: 1.1,
      transportEfficiency: 45,
      recommendedFor: 'Low Power Mode',
      color: 'orange'
    },
    {
      type: 'M-Type',
      temperature: 3000,
      energyMultiplier: 0.8,
      transportEfficiency: 35,
      recommendedFor: 'Minimal Energy Transport',
      color: 'red'
    }
  ];

  const getCurrentSpectrumProfile = () => {
    if (!currentSpectrum?.metadata) return null;
    
    // Try to determine spectral type from metadata or make educated guess
    const distance = currentSpectrum.metadata.distance || 100;
    const emissionAge = currentSpectrum.metadata.emissionAge || 100;
    
    // Rough classification based on available data
    if (distance < 50 && emissionAge < 50) return stellarProfiles[0]; // O-Type
    if (distance < 100 && emissionAge < 100) return stellarProfiles[1]; // B-Type
    if (distance < 500) return stellarProfiles[2]; // A-Type
    return stellarProfiles[4]; // G-Type default
  };

  const currentProfile = getCurrentSpectrumProfile();
  
  const getDistanceBonus = () => {
    if (!currentSpectrum?.metadata?.distance) return 0;
    const distance = currentSpectrum.metadata.distance;
    if (distance < 50) return 0.5; // 50% bonus for very close stars
    if (distance < 100) return 0.3; // 30% bonus for nearby stars
    if (distance < 500) return 0.1; // 10% bonus for local stars
    return 0;
  };

  const getAgeBonus = () => {
    if (!currentSpectrum?.metadata?.emissionAge) return 0;
    const age = currentSpectrum.metadata.emissionAge;
    if (age < 100) return 0.2; // 20% bonus for young, active stars
    if (age < 1000) return 0.1; // 10% bonus for mature stars
    return 0;
  };

  const totalEnergyMultiplier = (currentProfile?.energyMultiplier || 1) * 
                                (1 + getDistanceBonus()) * 
                                (1 + getAgeBonus());

  const getColorClass = (color: string) => {
    switch (color) {
      case 'blue': return 'text-blue-400';
      case 'white': return 'text-gray-100';
      case 'yellow': return 'text-yellow-400';
      case 'orange': return 'text-orange-400';
      case 'red': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const topRecommendations = stellarProfiles
    .sort((a, b) => b.energyMultiplier - a.energyMultiplier)
    .slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Spectrum Intelligence System
          {currentProfile && (
            <Badge variant="outline" className={getColorClass(currentProfile.color)}>
              {currentProfile.type}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Spectrum Analysis */}
        {currentSpectrum && currentProfile ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Current Spectrum Energy</span>
              <span className="text-lg font-bold text-primary">
                {totalEnergyMultiplier.toFixed(1)}x
              </span>
            </div>
            
            <Progress value={currentProfile.transportEfficiency} className="h-2" />
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-muted rounded">
                <div className="text-muted-foreground">Base Energy</div>
                <div className="font-mono">{currentProfile.energyMultiplier}x</div>
              </div>
              <div className="p-2 bg-muted rounded">
                <div className="text-muted-foreground">Distance Bonus</div>
                <div className="font-mono">+{(getDistanceBonus() * 100).toFixed(0)}%</div>
              </div>
              <div className="p-2 bg-muted rounded">
                <div className="text-muted-foreground">Age Bonus</div>
                <div className="font-mono">+{(getAgeBonus() * 100).toFixed(0)}%</div>
              </div>
            </div>

            <div className="p-3 bg-primary/10 rounded-lg">
              <div className="text-sm font-medium">Optimized for: {currentProfile.recommendedFor}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Temperature: {currentProfile.temperature.toLocaleString()}K | 
                Efficiency: {currentProfile.transportEfficiency}%
              </div>
            </div>
          </div>
        ) : (
          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              No spectrum selected. Choose a spectrum to analyze energy potential.
            </AlertDescription>
          </Alert>
        )}

        {/* High-Energy Recommendations */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">High-Energy Recommendations</span>
          </div>
          
          <div className="space-y-2">
            {topRecommendations.map((profile, index) => (
              <div key={profile.type} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Star className={`h-4 w-4 ${getColorClass(profile.color)}`} />
                  <div>
                    <div className="text-sm font-medium">{profile.type} Star</div>
                    <div className="text-xs text-muted-foreground">
                      {profile.energyMultiplier}x energy | {profile.transportEfficiency}% efficiency
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRecommendSpectrum(profile.type)}
                >
                  Select
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Stellar Database */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Stellar Energy Database</span>
          </div>
          
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
            {stellarProfiles.map((profile) => (
              <div key={profile.type} className="flex items-center justify-between p-2 text-xs bg-muted/50 rounded">
                <div className="flex items-center gap-2">
                  <Star className={`h-3 w-3 ${getColorClass(profile.color)}`} />
                  <span className="font-medium">{profile.type}</span>
                </div>
                <div className="flex gap-2 text-muted-foreground">
                  <span>{profile.temperature}K</span>
                  <span>{profile.energyMultiplier}x</span>
                  <span>{profile.transportEfficiency}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Optimization Tips */}
        <Alert>
          <Star className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Energy Optimization Tips:</strong><br/>
            • O/B type stars provide maximum energy for transport<br/>
            • Closer stars (&lt;100ly) get significant distance bonuses<br/>
            • Younger stars (&lt;100My) provide additional energy from activity<br/>
            • Consider efficiency vs energy trade-offs for your transport needs
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};