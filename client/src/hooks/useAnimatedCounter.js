import { useEffect, useRef, useState } from 'react';

/**
 * Smooth rolling number counter using requestAnimationFrame.
 * GPU-safe: only updates a state value; no layout-thrashing properties.
 * Respects prefers-reduced-motion automatically.
 */
export function useAnimatedCounter(target, duration = 900) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReduced) {
      setCount(target);
      return;
    }
    const start = performance.now();
    const from = 0;
    const to = Number(target) || 0;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, prefersReduced]);

  return count;
}
