import { type ReactNode } from "react";

/* ─── Timing & Easing Constants ─────────────────────────────────────
   Sequence:
   1. "Find" (0ms), "Your" (70ms), "Nearest" (140ms) rise up (700ms duration).
   2. "Charging Station" gradient fills left-to-right (550ms -> 1750ms = 1.2s).
   3. Subtitle fades & rises 12px (starts at 1750ms).
   4. Pill badge fades & rises 12px (starts at 1850ms, +100ms).
   5. CTA button fades & rises 12px (starts at 1950ms, +100ms).
   Total sequence finishes at 1950 + 300 = 2250ms ≈ 2.2s.
   ──────────────────────────────────────────────────────────────────── */
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const WORD_DURATION = 700;
const WORD_STAGGER = 70;
const CHARGE_START = 550;
const CHARGE_DURATION = 1200;
const CHARGE_END = CHARGE_START + CHARGE_DURATION; // 1750ms

export const STAGGER = {
  subtitle: CHARGE_END,
  pill: CHARGE_END + 100,
  cta: CHARGE_END + 200,
} as const;

export const HERO_TOTAL_MS = STAGGER.cta + 300;

const WORDS = ["Find", "Your", "Nearest"];

/* ─── Word reveal mask ────────────────────────────────────────────── */
function RevealWord({ children, delayMs }: { children: ReactNode; delayMs: number }) {
  return (
    <span className="hero-reveal-mask" aria-hidden="true">
      <span
        className="hero-reveal-word"
        style={{
          animationDelay: `${delayMs}ms`,
          animationDuration: `${WORD_DURATION}ms`,
          animationTimingFunction: EASING,
        }}
      >
        {children}
      </span>
    </span>
  );
}

/* ─── Charging Station battery fill ───────────────────────────────── */
function ChargingStation() {
  return (
    <span className="hero-charging-container" aria-hidden="true">
      {/* Base uncharged text: pale mint outline / low-opacity state */}
      <span className="hero-charging-base">Charging Station</span>
      {/* Battery charging gradient: fills left to right over 1.2s */}
      <span
        className="hero-charging-fill"
        style={{
          animationDelay: `${CHARGE_START}ms`,
          animationDuration: `${CHARGE_DURATION}ms`,
          animationTimingFunction: EASING,
        }}
      >
        Charging Station
      </span>
    </span>
  );
}

/* ─── Stagger wrapper for subtitle / pill / CTA ──────────────────── */
export function StaggerFade({
  children,
  delayMs,
  className = "",
}: {
  children: ReactNode;
  delayMs: number;
  className?: string;
}) {
  return (
    <div
      className={`hero-stagger-item ${className}`}
      style={{
        animationDelay: `${delayMs}ms`,
        animationDuration: "350ms",
        animationTimingFunction: EASING,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Main exported heading ───────────────────────────────────────── */
export function HeroHeadline() {
  return (
    <h1
      className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl hero-headline"
      aria-label="Find Your Nearest Charging Station"
    >
      {WORDS.map((word, i) => (
        <RevealWord key={word} delayMs={i * WORD_STAGGER}>
          {word}
        </RevealWord>
      ))}{" "}
      <ChargingStation />
    </h1>
  );
}
