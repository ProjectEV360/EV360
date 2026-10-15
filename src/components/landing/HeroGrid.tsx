import { useEffect, useRef, useState } from "react";

/* ─── Hero Map & Pin Timing Constants ──────────────────────────────
   Pin Stagger: 120ms between consecutive pins (requirement 2)
   Pin Entrance Duration: 500ms ease-out
   Available Pin Pulse Loop: 2.4s (soft, slow pulse ring)
   Busy Pins: stay static with no pulse loop
   Container Opacity: Low (12-20%) to keep hero copy effortlessly readable
   ──────────────────────────────────────────────────────────────────── */
export const PIN_STAGGER_MS = 120;
export const PIN_PULSE_DURATION_S = 2.4;
export const PIN_ENTRANCE_MS = 500;
export const PIN_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export interface StationPin {
  id: number;
  x: number;
  y: number;
  city: string;
  status: "available" | "busy";
  desktopOnly?: boolean;
}

/**
 * 20 Hub pins geographically mapped across India's premier EV corridors
 * (Delhi-NCR, Mumbai, Bengaluru, Chennai, Hyderabad, Pune, Kolkata, etc.)
 */
export const INDIA_STATION_PINS: StationPin[] = [
  // North
  { id: 0, x: 470, y: 155, city: "Delhi NCR", status: "available" },
  { id: 1, x: 440, y: 195, city: "Jaipur", status: "available" },
  { id: 2, x: 475, y: 95, city: "Chandigarh", status: "available" },
  { id: 3, x: 550, y: 205, city: "Lucknow", status: "available" },
  { id: 4, x: 610, y: 225, city: "Patna", status: "busy", desktopOnly: true },

  // West
  { id: 5, x: 380, y: 265, city: "Ahmedabad", status: "available" },
  { id: 6, x: 385, y: 305, city: "Surat", status: "available" },
  { id: 7, x: 395, y: 355, city: "Mumbai", status: "available" },
  { id: 8, x: 420, y: 375, city: "Pune", status: "available" },
  { id: 9, x: 410, y: 440, city: "Goa", status: "busy", desktopOnly: true },

  // Central
  { id: 10, x: 485, y: 270, city: "Bhopal", status: "available" },
  { id: 11, x: 455, y: 280, city: "Indore", status: "available" },
  { id: 12, x: 515, y: 330, city: "Nagpur", status: "busy", desktopOnly: true },

  // East
  { id: 13, x: 670, y: 285, city: "Kolkata", status: "available" },
  { id: 14, x: 630, y: 355, city: "Bhubaneswar", status: "available" },

  // South
  { id: 15, x: 505, y: 405, city: "Hyderabad", status: "available" },
  { id: 16, x: 590, y: 415, city: "Visakhapatnam", status: "busy", desktopOnly: true },
  { id: 17, x: 480, y: 475, city: "Bengaluru", status: "available" },
  { id: 18, x: 535, y: 480, city: "Chennai", status: "available" },
  { id: 19, x: 460, y: 535, city: "Kochi", status: "busy", desktopOnly: true },
];

/** Connectivity edges representing high-speed EV inter-city highway corridors */
const CORRIDOR_EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 5],
  [3, 4],
  [3, 10],
  [5, 6],
  [5, 11],
  [6, 7],
  [7, 8],
  [8, 9],
  [7, 11],
  [10, 11],
  [10, 12],
  [11, 12],
  [4, 13],
  [13, 14],
  [12, 15],
  [14, 16],
  [15, 16],
  [8, 15],
  [15, 17],
  [17, 18],
  [9, 17],
  [17, 19],
  [18, 19],
  [0, 10],
];

/**
 * Stylized geometric path representing India's national coastline and frontier
 * Scaled and aligned to viewBox 0 0 1000 600
 */
const INDIA_MAP_PATH =
  "M 470 65 L 485 85 L 500 120 L 530 145 L 560 160 L 610 170 L 650 190 " +
  "L 700 195 L 750 210 L 730 250 L 700 270 L 670 285 L 650 320 L 630 360 " +
  "L 590 415 L 545 470 L 535 500 L 500 540 L 460 550 L 450 510 L 440 460 " +
  "L 405 440 L 390 380 L 380 340 L 365 305 L 350 270 L 370 240 L 400 220 " +
  "L 420 180 L 440 140 L 455 100 Z";

export function HeroGrid() {
  const [mounted, setMounted] = useState(false);
  const isReducedMotion = useRef(false);

  useEffect(() => {
    isReducedMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMounted(true);
  }, []);

  return (
    <svg
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      className="hero-grid-svg india-map-svg"
      aria-hidden="true"
    >
      <defs>
        {/* Soft radial glow for available station pulse */}
        <radialGradient id="pinGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── Stylized India Map Silhouette (Low Opacity) ── */}
      <path
        d={INDIA_MAP_PATH}
        className="india-map-boundary"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />

      {/* ── Highway Corridor Edges ──────────────────────── */}
      <g>
        {CORRIDOR_EDGES.map(([aId, bId]) => {
          const a = INDIA_STATION_PINS[aId];
          const b = INDIA_STATION_PINS[bId];
          if (!a || !b) return null;
          const isDesktopEdge = a.desktopOnly || b.desktopOnly;
          return (
            <line
              key={`edge-${aId}-${bId}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={`hero-grid-edge${isDesktopEdge ? " hero-grid-desktop-only" : ""}`}
            />
          );
        })}
      </g>

      {/* ── Station Pins with 120ms Stagger & Pulse Rings ── */}
      <g id="hero-station-pins">
        {INDIA_STATION_PINS.map((pin, index) => {
          const isAvailable = pin.status === "available";
          const staggerDelayMs = index * PIN_STAGGER_MS;

          return (
            <g
              key={`pin-${pin.id}`}
              className={pin.desktopOnly ? "hero-grid-desktop-only" : undefined}
            >
              {/* Soft, slow pulse ring (2.4s loop) for available stations only */}
              {isAvailable && (
                <circle
                  cx={pin.x}
                  cy={pin.y}
                  r="4"
                  className="hero-pin-pulse-ring"
                  style={{
                    animationDelay: `${staggerDelayMs}ms`,
                    animationDuration: `${PIN_PULSE_DURATION_S}s`,
                  }}
                />
              )}

              {/* Halo anchor for compatibility */}
              <circle
                data-halo-id={pin.id}
                cx={pin.x}
                cy={pin.y}
                r="8"
                className="hero-grid-halo"
              />

              {/* Core Station Pin with 120ms Staggered Entrance */}
              <circle
                data-node-id={pin.id}
                cx={pin.x}
                cy={pin.y}
                r={isAvailable ? "3.5" : "2.5"}
                className={`hero-grid-node hero-station-pin ${
                  isAvailable ? "pin-available" : "pin-busy"
                } ${pin.desktopOnly ? "hero-grid-desktop-only" : ""}`}
                style={{
                  animationDelay: `${staggerDelayMs}ms`,
                  animationDuration: `${PIN_ENTRANCE_MS}ms`,
                  animationTimingFunction: PIN_EASING,
                  opacity:
                    mounted && isReducedMotion.current ? (isAvailable ? 0.35 : 0.15) : undefined,
                }}
              />
            </g>
          );
        })}
      </g>

      {/* ── Active Pulses Layer ───────────────────────────── */}
      <g id="hero-grid-pulses" />
    </svg>
  );
}
