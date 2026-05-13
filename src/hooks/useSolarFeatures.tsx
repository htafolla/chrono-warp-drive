// src/hooks/useSolarFeatures.tsx
//
// Periodic NOAA SWPC poll → derived SolarFeatures vector for the neural
// fusion pipeline. Kept intentionally small: one fetcher instance, one
// interval, graceful null when offline. Not a render-driver.

import { useEffect, useRef, useState } from 'react';
import { SolarDataFetcher, type SolarFeatures } from '@/lib/solarDataFetcher';

const REFRESH_MS = 60_000; // SWPC updates ~1 min; matches fetcher TTL

export interface UseSolarFeaturesOptions {
  enabled?: boolean;
  refreshMs?: number;
}

export function useSolarFeatures(options: UseSolarFeaturesOptions = {}) {
  const { enabled = true, refreshMs = REFRESH_MS } = options;
  const fetcherRef = useRef<SolarDataFetcher | null>(null);
  const [features, setFeatures] = useState<SolarFeatures | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!fetcherRef.current) fetcherRef.current = new SolarDataFetcher();
    let cancelled = false;

    const tick = async () => {
      try {
        const solar = await fetcherRef.current!.fetchCurrentSolarData();
        if (cancelled) return;
        setFeatures(fetcherRef.current!.deriveSolarFeatures(solar));
        setUpdatedAt(Date.now());
      } catch (e) {
        console.warn('[useSolarFeatures] fetch failed:', e);
      }
    };

    tick();
    const id = window.setInterval(tick, refreshMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, refreshMs]);

  return { solarFeatures: features, updatedAt };
}
