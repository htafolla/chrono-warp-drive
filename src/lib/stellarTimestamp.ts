import { SpectrumData } from '@/types/sdss';

/**
 * Stellar timestamp utilities for BLURRN Time Machine
 * Generates realistic astronomical observation timestamps based on spectrum data
 */

// Modified Julian Date functions
export function mjdToGregorian(mjd: number): Date {
  // MJD 0 corresponds to 17 November 1858 00:00 UTC
  const mjdEpoch = new Date(1858, 10, 17); // Month is 0-indexed
  return new Date(mjdEpoch.getTime() + mjd * 24 * 60 * 60 * 1000);
}

export function gregorianToMjd(date: Date): number {
  const mjdEpoch = new Date(1858, 10, 17);
  return (date.getTime() - mjdEpoch.getTime()) / (24 * 60 * 60 * 1000);
}

export function getCurrentMJD(): number {
  return gregorianToMjd(new Date());
}

/**
 * Generate a stellar observation timestamp based on spectrum data and current time
 */
export function generateStellarTimestamp(
  spectrumData: SpectrumData | null, 
  baseTime: number = Date.now()
): {
  mjd: number;
  gregorian: Date;
  formatted: string;
  observatoryCode: string;
} {
  let mjd: number;
  let observatoryCode: string;

  if (spectrumData?.source === 'SDSS' && spectrumData.metadata?.objid) {
    // For SDSS data, generate a realistic historical MJD
    // SDSS observations typically range from MJD 51000 to 59000 (roughly 1999-2020)
    const objidHash = hashString(spectrumData.metadata.objid);
    mjd = 51000 + (objidHash % 8000); // Range: MJD 51000-59000
    observatoryCode = 'SDSS';
  } else if (spectrumData?.source === 'SYNTHETIC') {
    // For synthetic data, use a base MJD with small time variations
    const currentMjd = getCurrentMJD();
    const timeOffset = (baseTime % 86400000) / 86400000; // Daily cycle variation
    mjd = Math.floor(currentMjd) + timeOffset;
    observatoryCode = 'BLURRN';
  } else {
    // Default case
    const currentMjd = getCurrentMJD();
    const timeOffset = (baseTime % 86400000) / 86400000;
    mjd = Math.floor(currentMjd) + timeOffset;
    observatoryCode = 'VIRTUAL';
  }

  const gregorian = mjdToGregorian(mjd);
  const formatted = formatObservationTimestamp(gregorian, mjd, observatoryCode);

  return {
    mjd,
    gregorian,
    formatted,
    observatoryCode
  };
}

/**
 * Format observation timestamp for display
 */
function formatObservationTimestamp(date: Date, mjd: number, observatory: string): string {
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0];
  const mjdStr = mjd.toFixed(5);
  
  return `${dateStr} ${timeStr} UTC (MJD ${mjdStr}) - ${observatory}`;
}

/**
 * Simple hash function for consistent pseudo-random values
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get observation session info based on spectrum type
 */
export function getObservationSession(spectrumData: SpectrumData | null): {
  sessionType: string;
  duration: string;
  purpose: string;
} {
  if (!spectrumData) {
    return {
      sessionType: 'Idle',
      duration: 'N/A',
      purpose: 'System standby'
    };
  }

  if (spectrumData.source === 'SDSS') {
    return {
      sessionType: 'Survey Observation',
      duration: '15 min exposure',
      purpose: 'Large-scale sky survey'
    };
  }

  if (spectrumData.source === 'SYNTHETIC') {
    const spectralType = spectrumData.metadata?.class || 'Unknown';
    return {
      sessionType: 'Synthetic Analysis',
      duration: 'Real-time',
      purpose: `${spectralType} spectral modeling`
    };
  }

  return {
    sessionType: 'Custom Observation',
    duration: 'Variable',
    purpose: 'Research analysis'
  };
}