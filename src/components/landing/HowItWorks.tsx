import { useEffect, useRef, useState } from "react";
import { MapPin, Clock, Zap, ArrowRight, ShieldCheck } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* ─── Scroll-Pinned Timing & Distance Constants ────────────────────
   Scroll Pin Distance: 1400px (calibrated scroll length while pinned)
   Step Transition: 400ms ease-out opacity & subtle scale
   Progress Line: scrubs 0% to 100% alongside scroll progress
   ──────────────────────────────────────────────────────────────────── */
export const HOW_IT_WORKS_PIN_DISTANCE = 1400;
export const STEP_TRANSITION_MS = 400;
export const STEP_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export interface StepItem {
  id: number;
  number: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  tag: string;
  detail: string;
}

const STEPS: StepItem[] = [
  {
    id: 0,
    number: "01",
    title: "Locate & Filter",
    desc: "Discover verified fast-chargers tailored to your EV connector type (CCS2, Type 2, CHAdeMO) with real-time socket availability.",
    icon: MapPin,
    tag: "Real-Time Discovery",
    detail: "Over 8 stations with 18 connectors verified live",
  },
  {
    id: 1,
    number: "02",
    title: "Reserve & Navigate",
    desc: "Lock your high-speed charging slot up to 30 minutes in advance. Receive live turn-by-turn GPS routing directly to the dedicated bay.",
    icon: Clock,
    tag: "Guaranteed Bay",
    detail: "Zero queue wait times and auto-hold assurance",
  },
  {
    id: 2,
    number: "03",
    title: "Plug In & Fast Charge",
    desc: "Seamlessly authenticate via QR code. Monitor charging curves, kWh transfer, and battery SoC in real-time with instant digital checkout.",
    icon: Zap,
    tag: "Live Telemetry",
    detail: "Verified payment via Razorpay / UPI in under 3 seconds",
  },
];

export function HowItWorks() {
  const pinRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    // Check SSR and reduced motion
    if (typeof window === "undefined") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIsReducedMotion(reduced);

    // Disable pinning in reduced motion or vitest environments
    if (reduced || (typeof process !== "undefined" && process.env["NODE_ENV"] === "test")) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const pin = pinRef.current;
    if (!pin) return;

    const ctx = gsap.context(() => {
      triggerRef.current = ScrollTrigger.create({
        trigger: pin,
        start: "top top",
        end: `+=${HOW_IT_WORKS_PIN_DISTANCE}`,
        pin: true,
        pinSpacing: true,
        scrub: 0.3,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress; // 0.0 to 1.0
          setScrollProgress(p);
          // 3 steps divided cleanly across scroll range
          if (p < 0.33) {
            setActiveStep(0);
          } else if (p < 0.66) {
            setActiveStep(1);
          } else {
            setActiveStep(2);
          }
        },
      });
    }, pin);

    // Refresh scroll triggers after layout settle
    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    return () => {
      clearTimeout(refreshTimer);
      ctx.revert();
    };
  }, []);

  const handleStepClick = (idx: number) => {
    setActiveStep(idx);
    if (triggerRef.current && typeof window !== "undefined") {
      const start = triggerRef.current.start;
      // Navigate to corresponding scroll offset in pinned range
      const stepOffsets = [0.1, 0.5, 0.9];
      const offset = stepOffsets[idx] ?? 0.1;
      const targetY = start + offset * HOW_IT_WORKS_PIN_DISTANCE;
      window.scrollTo({ top: targetY, behavior: "smooth" });
    }
  };

  return (
    <section id="how-it-works" className="relative w-full">
      <div
        ref={pinRef}
        className={`w-full flex flex-col justify-center px-4 sm:px-6 lg:px-8 ${
          isReducedMotion ? "py-16" : "min-h-screen pt-20 pb-10"
        }`}
      >
        <div className="mx-auto max-w-5xl w-full">
          {/* Section Header with navbar clearance */}
          <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Effortless EV Journey
            </span>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              How <span className="text-gradient">ChargeHub</span> Works
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
              Three simple steps from locating a charger to powering your journey
            </p>
          </div>

          {/* Main Grid: Left Side Progress Track + Right Side Steps */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
            {/* Left: Animated Side Progress Line & Milestone Indicators */}
            <div className="hidden md:flex md:col-span-4 flex-col justify-between h-[300px] relative pl-4 border-l border-border/40">
              {/* Dynamic filling progress line */}
              <div
                className="absolute left-0 top-0 w-1 bg-gradient-primary rounded-full transition-all ease-out"
                style={{
                  height: isReducedMotion ? "100%" : `${Math.max(10, scrollProgress * 100)}%`,
                  transitionDuration: `${STEP_TRANSITION_MS}ms`,
                  boxShadow: "0 0 12px var(--primary)",
                }}
              />

              {/* Step Markers along the progress line */}
              {STEPS.map((step, idx) => {
                const isActive = activeStep === idx;
                const isPassed = activeStep >= idx;
                return (
                  <button
                    key={`indicator-${step.id}`}
                    type="button"
                    onClick={() => handleStepClick(idx)}
                    className="flex items-center gap-3 text-left focus:outline-none group cursor-pointer"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                        isActive
                          ? "bg-primary text-primary-foreground scale-110 shadow-glow"
                          : isPassed
                            ? "bg-primary/20 text-primary border border-primary/40"
                            : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {step.number}
                    </div>
                    <div>
                      <div
                        className={`text-sm font-semibold transition-colors duration-300 ${
                          isActive ? "text-foreground font-bold" : "text-muted-foreground"
                        }`}
                      >
                        {step.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground/70 font-medium">
                        {step.tag}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Step Cards (Highlight sequentially with scroll) */}
            <div className="col-span-1 md:col-span-8 flex flex-col gap-3">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = activeStep === idx;

                return (
                  <div
                    key={`step-card-${step.id}`}
                    onClick={() => handleStepClick(idx)}
                    className={`relative rounded-xl border p-4 sm:p-5 transition-all duration-300 ease-out cursor-pointer ${
                      isActive
                        ? "border-primary/80 bg-card shadow-card shadow-glow/15 opacity-100 scale-100 ring-1 ring-primary/20"
                        : "border-border/40 bg-card/40 opacity-35 scale-[0.98] hover:opacity-60"
                    }`}
                    style={{
                      transitionDuration: `${STEP_TRANSITION_MS}ms`,
                      transitionTimingFunction: STEP_EASING,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300 ${
                            isActive
                              ? "bg-gradient-primary text-primary-foreground shadow-glow/40"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                            Step {step.number} • {step.tag}
                          </span>
                          <h3 className="font-display text-base sm:text-lg font-bold text-foreground">
                            {step.title}
                          </h3>
                        </div>
                      </div>

                      {/* Active step indicator pill */}
                      {isActive && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                          Active Step <ArrowRight className="h-3 w-3" />
                        </span>
                      )}
                    </div>

                    <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                      {step.desc}
                    </p>

                    <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-border/40 text-[11px] font-medium text-foreground/80">
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-primary" : "bg-muted-foreground/40"}`}
                      />
                      <span>{step.detail}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
