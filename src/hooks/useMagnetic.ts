import { useEffect, useRef, useState, type CSSProperties } from "react";

/* ─── Magnetic Effect Configuration ────────────────────────────────
   Max Displacement: 6px (drifts up to 6px toward cursor)
   Activation Radius: 80px (distance around button where pull begins)
   Transition Duration: 300ms (smooth ease-out dampening)
   ──────────────────────────────────────────────────────────────────── */
export const MAGNETIC_MAX_DISPLACEMENT = 6;
export const MAGNETIC_ACTIVATION_RADIUS = 80;
export const MAGNETIC_TRANSITION_MS = 300;

export interface UseMagneticOptions {
  maxDisplacement?: number;
  activationRadius?: number;
}

/**
 * Reusable magnetic effect hook.
 * Causes an element to drift subtly (up to maxDisplacement px) toward the cursor when nearby.
 * Respects prefers-reduced-motion and touch-only devices by disabling translation.
 */
export function useMagnetic<T extends HTMLElement = HTMLButtonElement>({
  maxDisplacement = MAGNETIC_MAX_DISPLACEMENT,
  activationRadius = MAGNETIC_ACTIVATION_RADIUS,
}: UseMagneticOptions = {}) {
  const elementRef = useRef<T | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Respect prefers-reduced-motion or SSR/touch environments
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(pointer: coarse)").matches
    ) {
      return;
    }

    const node = elementRef.current;
    if (!node) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = node.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist < activationRadius) {
        // Linear ease-out falloff based on proximity
        const pull = 1 - dist / activationRadius;
        const targetX = (dx / (dist || 1)) * pull * maxDisplacement;
        const targetY = (dy / (dist || 1)) * pull * maxDisplacement;
        setOffset({ x: Math.round(targetX * 10) / 10, y: Math.round(targetY * 10) / 10 });
        setIsHovered(true);
      } else if (isHovered) {
        setOffset({ x: 0, y: 0 });
        setIsHovered(false);
      }
    };

    const handleMouseLeave = () => {
      setOffset({ x: 0, y: 0 });
      setIsHovered(false);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [maxDisplacement, activationRadius, isHovered]);

  const style: CSSProperties = {
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
    transition: `transform ${MAGNETIC_TRANSITION_MS}ms ease-out`,
    willChange: "transform",
  };

  return { ref: elementRef, style, isHovered };
}
