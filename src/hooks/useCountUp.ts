import { useEffect, useRef, useState } from "react";

/* ─── Count-Up Timing & Easing Constants ────────────────────────────
   Duration: 1200ms (as specified in requirement 4)
   Easing: Cubic ease-out (1 - (1 - t)^3) - rapid initial ramp, gentle deceleration
   ──────────────────────────────────────────────────────────────────── */
export const COUNT_UP_DURATION_MS = 1200;

export interface UseCountUpOptions {
  end: number;
  start?: number;
  duration?: number;
  enabled?: boolean;
}

/**
 * Animated number counter that counts from start to end with cubic ease-out.
 * Respects prefers-reduced-motion and test environments by snapping directly to end value.
 */
export function useCountUp({
  end,
  start = 0,
  duration = COUNT_UP_DURATION_MS,
  enabled = true,
}: UseCountUpOptions): number {
  const isTest = typeof process !== "undefined" && process.env["NODE_ENV"] === "test";
  const [value, setValue] = useState<number>(() => (isTest || !enabled ? end : start));
  const currentRef = useRef<number>(isTest || !enabled ? end : start);
  const prevEndRef = useRef<number>(end);

  useEffect(() => {
    // If in test or reduced-motion mode, set final value immediately
    if (
      isTest ||
      !enabled ||
      (typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      setValue(end);
      currentRef.current = end;
      return;
    }

    const startVal = currentRef.current;
    const targetVal = end;
    if (startVal === targetVal && prevEndRef.current === end) return;
    prevEndRef.current = end;

    let startTimestamp: number | null = null;
    let frameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth cubic ease-out: 1 - (1 - t)^3
      const ease = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startVal + (targetVal - startVal) * ease);

      currentRef.current = nextValue;
      setValue(nextValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        currentRef.current = targetVal;
        setValue(targetVal);
      }
    };

    frameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [end, duration, enabled, isTest]);

  return value;
}
