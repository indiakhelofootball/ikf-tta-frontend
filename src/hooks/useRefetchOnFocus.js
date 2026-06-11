// src/hooks/useRefetchOnFocus.js
// Re-runs a loader when the tab regains focus, so data edited by another
// user shows up without a manual reload. Callers pass a silent loader (no
// loading spinner) — the page keeps showing current data until fresh data
// lands. Rate-limited so alt-tabbing doesn't hammer the API.
import { useEffect, useRef } from 'react';

const MIN_GAP_MS = 30 * 1000;

export default function useRefetchOnFocus(refetch) {
  const fnRef = useRef(refetch);
  fnRef.current = refetch;
  const lastRun = useRef(Date.now());

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRun.current < MIN_GAP_MS) return;
      lastRun.current = now;
      fnRef.current();
    };
    window.addEventListener('focus', handler);
    document.addEventListener('visibilitychange', handler);
    return () => {
      window.removeEventListener('focus', handler);
      document.removeEventListener('visibilitychange', handler);
    };
  }, []);
}
