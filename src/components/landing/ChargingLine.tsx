import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";

/* ─── Charging Line Animation Timing ────────────────────────────────
   Duration: 700ms (path drawing duration)
   Delay: 600ms (commences smoothly alongside headline reveal)
   Easing: cubic-bezier(0.22, 1, 0.36, 1) - smooth ease-out curve
   Blink Loop: 1800ms (gentle pulse once line connects to connector)
   ──────────────────────────────────────────────────────────────────── */
export const CHARGING_LINE_DURATION_MS = 700;
export const CHARGING_LINE_DELAY_MS = 600;
export const CHARGING_LINE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
export const LIVE_DOT_BLINK_MS = 1800;

interface ChargingLineProps {
  onComplete?: () => void;
  className?: string;
}

/**
 * Charging Line SVG animation that traces a high-voltage path from the left edge
 * to a charging connector icon right beside the Hero CTA button.
 * Once connected, the LIVE dot initiates its gentle blink.
 */
export function ChargingLine({ onComplete, className = "" }: ChargingLineProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [isDrawn, setIsDrawn] = useState(false);
  const [pathLength, setPathLength] = useState<number>(500);
  const isReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (isReducedMotion) {
      setIsDrawn(true);
      onComplete?.();
      return;
    }

    if (pathRef.current && typeof pathRef.current.getTotalLength === "function") {
      const length = pathRef.current.getTotalLength();
      setPathLength(length);
    }

    const timer = setTimeout(() => {
      setIsDrawn(true);
      onComplete?.();
    }, CHARGING_LINE_DELAY_MS + CHARGING_LINE_DURATION_MS);

    return () => clearTimeout(timer);
  }, [isReducedMotion, onComplete]);

  return (
    <div
      className={`charging-line-container pointer-events-none relative flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      {/* SVG Canvas drawing path from left towards connector */}
      <svg
        className="h-10 w-full overflow-visible"
        viewBox="0 0 400 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="chargingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
            <stop offset="60%" stopColor="var(--primary)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--primary-glow)" stopOpacity="1" />
          </linearGradient>
        </defs>

        <path
          ref={pathRef}
          d="M 0 20 C 120 20, 220 30, 320 20 L 375 20"
          stroke="url(#chargingGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            strokeDasharray: pathLength,
            strokeDashoffset: isReducedMotion ? 0 : isDrawn ? 0 : pathLength,
            transition: isReducedMotion
              ? "none"
              : `stroke-dashoffset ${CHARGING_LINE_DURATION_MS}ms ${CHARGING_LINE_EASING} ${CHARGING_LINE_DELAY_MS}ms`,
          }}
        />
      </svg>

      {/* Target Connector Icon & LIVE dot indicator near CTA */}
      <div className="relative -ml-4 flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/80 px-2.5 py-1 backdrop-blur-sm shadow-sm transition-all duration-300">
        <Zap
          className={`h-3.5 w-3.5 transition-colors duration-500 ${
            isDrawn ? "text-primary" : "text-muted-foreground/40"
          }`}
        />
        <span className="text-[11px] font-semibold tracking-wide text-foreground">FAST CHARGE</span>

        {/* Gentle blinking LIVE dot */}
        <span
          className={`relative flex h-2 w-2 rounded-full ${
            isDrawn
              ? isReducedMotion
                ? "bg-emerald-500 opacity-90"
                : "bg-emerald-500 animate-live-blink"
              : "bg-muted-foreground/30"
          }`}
          title="Live Network Ready"
        />
      </div>
    </div>
  );
}
