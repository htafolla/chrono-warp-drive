import React, { useEffect, useCallback } from 'react';
import { TPTTv4_6Result } from '@/types/blurrn-v4-6';
import { SpectrumData } from '@/types/sdss';

interface SceneTabSynchronizerProps {
  activeTab: string;
  tpttV46Result?: TPTTv4_6Result | null;
  spectrumData?: SpectrumData | null;
  onTabSpecificUpdate: (tabData: TabSpecificData) => void;
}

interface TabSpecificData {
  bandCount: number;
  quality: 'low' | 'medium' | 'high';
  showParticles: boolean;
  showBreakthroughEffects: boolean;
  cameraPosition: [number, number, number];
  lightingIntensity: number;
}

export function SceneTabSynchronizer({ 
  activeTab, 
  tpttV46Result, 
  spectrumData, 
  onTabSpecificUpdate 
}: SceneTabSynchronizerProps) {
  
  const syncTabData = useCallback(() => {
    const hasV46Data = !!tpttV46Result?.v46_components;
    const tdfValue = hasV46Data ? tpttV46Result.v46_components.TDF_value : 0;
    
    let tabData: TabSpecificData;
    
    switch (activeTab) {
      case 'Scene':
        tabData = {
          bandCount: 5,
          quality: 'high',
          showParticles: true,
          showBreakthroughEffects: true,
          cameraPosition: [6, 4, 8],
          lightingIntensity: 1.0
        };
        break;
        
      case 'Spectrum':
        tabData = {
          bandCount: 8, // Show more bands for spectrum analysis
          quality: 'medium',
          showParticles: false, // Focus on wave patterns
          showBreakthroughEffects: true,
          cameraPosition: [10, 2, 6], // Side view for better spectrum visibility
          lightingIntensity: 0.8
        };
        break;
        
      case 'Time Shift':
        tabData = {
          bandCount: 3, // Minimal bands for time focus
          quality: hasV46Data ? 'high' : 'medium',
          showParticles: hasV46Data, // Only show if TDF data available
          showBreakthroughEffects: true,
          cameraPosition: [4, 6, 10], // Elevated view for time visualization
          lightingIntensity: hasV46Data ? 1.2 : 0.6
        };
        break;
        
      default:
        tabData = {
          bandCount: 4,
          quality: 'medium',
          showParticles: true,
          showBreakthroughEffects: false,
          cameraPosition: [5, 5, 5],
          lightingIntensity: 0.8
        };
    }
    
    // Adjust based on TDF performance requirements
    if (hasV46Data && tdfValue > 1e12) {
      tabData.quality = tabData.quality === 'high' ? 'medium' : 'low';
      tabData.bandCount = Math.max(3, tabData.bandCount - 1);
    }
    
    onTabSpecificUpdate(tabData);
  }, [activeTab, tpttV46Result, spectrumData, onTabSpecificUpdate]);
  
  // Sync whenever tab or data changes
  useEffect(() => {
    syncTabData();
  }, [syncTabData]);
  
  // Also sync when breakthrough status changes
  useEffect(() => {
    if (tpttV46Result?.timeShiftMetrics?.breakthrough_validated) {
      // Force a sync when breakthrough is achieved
      setTimeout(syncTabData, 100);
    }
  }, [tpttV46Result?.timeShiftMetrics?.breakthrough_validated, syncTabData]);
  
  return null; // This component only manages state, no rendering
}