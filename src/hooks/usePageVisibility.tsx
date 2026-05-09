import { useEffect, useState } from 'react';

/**
 * Returns the current document visibility state and updates when the tab
 * is shown or hidden. Use this to short-circuit expensive per-frame work
 * or interval updates while the page is in the background.
 */
export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(
    typeof document !== 'undefined' ? !document.hidden : true
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onChange = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return isVisible;
}
