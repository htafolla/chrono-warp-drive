import { useRef, useEffect, useState } from 'react';

/**
 * Custom hook for throttled memoization
 * Prevents expensive calculations from running on every render
 */
export function useThrottledMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  throttleMs: number = 100
): T {
  const [value, setValue] = useState<T>(factory);
  const lastUpdateRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (timeSinceLastUpdate >= throttleMs) {
      // Update immediately if enough time has passed
      setValue(factory());
      lastUpdateRef.current = now;
    } else {
      // Schedule update for later
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setValue(factory());
        lastUpdateRef.current = Date.now();
      }, throttleMs - timeSinceLastUpdate);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, deps);

  return value;
}
