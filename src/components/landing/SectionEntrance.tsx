import { type ReactNode, type CSSProperties } from "react";
import { useInView } from "@/hooks/useInView";

/* ─── Section Entrance Timing & Distances ───────────────────────────
   Duration: 500ms (as specified in requirement 6)
   Distance: 16px translateY
   Easing: cubic-bezier(0.22, 1, 0.36, 1) - smooth ease-out curve
   ──────────────────────────────────────────────────────────────────── */
export const ENTRANCE_DURATION_MS = 500;
export const ENTRANCE_DISTANCE_PX = 16;
export const ENTRANCE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

interface SectionEntranceProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  id?: string;
}

/**
 * Reusable entrance animation wrapper for landing page sections and cards.
 * Animates opacity (0 -> 1) and translateY (16px -> 0) over 500ms when scrolled into view.
 * Triggered once per element, never replayed. Respects prefers-reduced-motion.
 */
export function SectionEntrance({
  children,
  className = "",
  delayMs = 0,
  id,
}: SectionEntranceProps) {
  const { ref, inView } = useInView<HTMLDivElement>({
    threshold: 0.1,
    triggerOnce: true,
  });

  const style: CSSProperties = {
    opacity: inView ? 1 : 0,
    transform: inView ? "none" : `translate3d(0, ${ENTRANCE_DISTANCE_PX}px, 0)`,
    transition: `opacity ${ENTRANCE_DURATION_MS}ms ${ENTRANCE_EASING} ${delayMs}ms, transform ${ENTRANCE_DURATION_MS}ms ${ENTRANCE_EASING} ${delayMs}ms`,
    willChange: "opacity, transform",
  };

  return (
    <div ref={ref} id={id} className={`section-entrance ${className}`} style={style}>
      {children}
    </div>
  );
}
