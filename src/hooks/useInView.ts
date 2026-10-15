import { useEffect, useRef, useState } from "react";

/* ─── Timing & Threshold Configuration ──────────────────────────────
   Default threshold: 0.15 (triggers when 15% of element is in view)
   Default triggerOnce: true (triggered once, never replayed)
   ──────────────────────────────────────────────────────────────────── */
export interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * Lightweight IntersectionObserver hook for triggering animations on scroll.
 * Automatically respects prefers-reduced-motion and server/test environments.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.15,
  rootMargin = "0px",
  triggerOnce = true,
}: UseInViewOptions = {}) {
  const [inView, setInView] = useState(false);
  const elementRef = useRef<T | null>(null);

  useEffect(() => {
    // If in test environment or prefers-reduced-motion is active, mark inView immediately
    if (
      typeof window === "undefined" ||
      (typeof process !== "undefined" && process.env["NODE_ENV"] === "test") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setInView(true);
      return;
    }

    const node = elementRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) {
            observer.unobserve(node);
          }
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { ref: elementRef, inView };
}
