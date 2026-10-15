import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Zap, MapPin, Search, Shield, ArrowRight, Battery, Clock, Star, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { useStations } from "@/hooks/useChargeData";
import { stationStatus } from "@/lib/station-utils";
import { HeroGrid } from "@/components/landing/HeroGrid";
import { HeroHeadline, StaggerFade, STAGGER } from "@/components/landing/HeroHeadline";
import { ChargingLine } from "@/components/landing/ChargingLine";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { SectionEntrance } from "@/components/landing/SectionEntrance";
import { useInView } from "@/hooks/useInView";
import { useCountUp } from "@/hooks/useCountUp";
import { useMagnetic } from "@/hooks/useMagnetic";
import { SEED_STATIONS } from "@/lib/seed-data";
import "@/components/landing/hero-animations.css";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

/* ─── Simulated Live Ticker Stations ─────────────────────────────── */
const TICKER_STATIONS = [
  { name: "Koramangala FastHub", free: 4, total: 4 },
  { name: "Indiranagar EV Plaza", free: 3, total: 4 },
  { name: "BKC Hub Central", free: 2, total: 2 },
  { name: "Aerocity Supercharger", free: 5, total: 6 },
  { name: "Whitefield Tech Park", free: 2, total: 2 },
];

/**
 * Live station ticker that periodically flips one station's "free" count
 * using a quick vertical roll inside an overflow-hidden mask.
 */
function LiveStationTicker() {
  const [tickerIndex, setTickerIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % TICKER_STATIONS.length);
      setAnimKey((k) => k + 1);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const station = TICKER_STATIONS[tickerIndex] ?? {
    name: "Koramangala FastHub",
    free: 4,
    total: 4,
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur-md shadow-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-live-blink inline-flex h-full w-full rounded-full bg-emerald-500" />
      </span>
      <span className="text-[11px] font-semibold text-foreground">Live Telemetry:</span>
      <span className="inline-block overflow-hidden h-[18px] leading-[18px]">
        <span key={animKey} className="inline-block ticker-flip-roll font-semibold text-primary">
          {station.name} — {station.free}/{station.total} Free
        </span>
      </span>
    </div>
  );
}

/**
 * Animated number counter using useCountUp hook with tabular-nums.
 * Triggered once when parent enters view over 1200ms ease-out.
 */
function AnimatedNumber({ value, enabled = true }: { value: number; enabled?: boolean }) {
  const count = useCountUp({
    end: value,
    start: 0,
    duration: 1200,
    enabled,
  });

  return <span className="tabular-nums font-variant-numeric: tabular-nums">{count}</span>;
}

/**
 * Interactive Stat Card with 2px hover lift, border sharpen,
 * optional 16/18 availability progress bar, and sequential connector badges.
 */
function StatCard({
  icon: Icon,
  value,
  label,
  delayMs = 0,
  badge,
  hint,
  to = "/map",
  isAvailableCard = false,
  availableRatio,
  isConnectorCard = false,
  inView = true,
}: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  delayMs?: number;
  badge?: React.ReactNode;
  hint?: string;
  to?: string;
  isAvailableCard?: boolean;
  availableRatio?: { current: number; total: number };
  isConnectorCard?: boolean;
  inView?: boolean;
}) {
  const numericValue = typeof value === "number" ? value : parseInt(value, 10);
  const isNumeric = !Number.isNaN(numericValue);

  return (
    <StaggerFade delayMs={delayMs} className="h-full">
      <Link
        to={to}
        className="group relative flex h-full flex-col items-center justify-between rounded-2xl border border-border/60 bg-card p-4 sm:p-5 lg:p-6 shadow-card card-lift-motion focus:outline-none focus:ring-2 focus:ring-primary/40 overflow-hidden"
      >
        {/* Subtle top hover glow border */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Top row: Icon + optional badge */}
        <div className="flex w-full items-center justify-between">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105 shadow-sm">
            <Icon className="h-5 w-5 sm:h-5.5 sm:w-5.5 lg:h-6 lg:w-6 transition-transform duration-300 group-hover:rotate-6" />
          </div>
          {badge ? (
            <div>{badge}</div>
          ) : (
            <div className="h-1.5 w-1.5 rounded-full bg-primary/20 transition-all duration-300 group-hover:bg-primary/60" />
          )}
        </div>

        {/* Counter Value */}
        <div className="mt-3 sm:mt-4 text-center w-full">
          <div className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary">
            {isNumeric ? <AnimatedNumber value={numericValue} enabled={inView} /> : value}
          </div>
          <span className="mt-1 block text-xs sm:text-sm font-medium text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
            {label}
          </span>

          {/* Sequential Connector Badges (light up in sequence on hover) */}
          {isConnectorCard && (
            <div className="mt-2.5 flex items-center justify-center gap-1.5 w-full">
              {["CCS2", "Type 2", "CHAdeMO"].map((cName) => (
                <span
                  key={cName}
                  className="connector-seq-icon rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground"
                >
                  {cName}
                </span>
              ))}
            </div>
          )}

          {/* Thin Availability Bar under "Available Now" (fills to 16/18) */}
          {isAvailableCard && availableRatio && (
            <div className="mt-2.5 w-full">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-500/15">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all ease-out"
                  style={{
                    width: inView
                      ? `${Math.min(100, Math.round((availableRatio.current / (availableRatio.total || 1)) * 100))}%`
                      : "0%",
                    transitionDuration: "1200ms",
                  }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground tabular-nums font-medium">
                <span>
                  {availableRatio.current}/{availableRatio.total} Available
                </span>
                <span>
                  {Math.round((availableRatio.current / (availableRatio.total || 1)) * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Micro hint */}
        {hint && (
          <span className="mt-2 text-[10px] sm:text-[11px] font-medium text-muted-foreground/80 tracking-wide transition-colors duration-300 group-hover:text-muted-foreground">
            {hint}
          </span>
        )}
      </Link>
    </StaggerFade>
  );
}

/**
 * Feature Card with 2px lift and border sharpening on hover.
 */
function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="group rounded-2xl border border-border/60 bg-card p-6 shadow-card card-lift-motion">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow/30">
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

/**
 * Magnetic CTA button component with 6px drift towards nearby cursor
 * and 4px arrow nudge on hover.
 */
function MagneticCTAButton() {
  const { ref, style } = useMagnetic<HTMLDivElement>({
    maxDisplacement: 6,
    activationRadius: 80,
  });

  return (
    <div ref={ref} style={style} className="flex justify-center">
      <Link to="/login">
        <Button
          id="hero-get-started"
          size="lg"
          className="group gap-2 rounded-full bg-gradient-primary px-8 shadow-glow text-base hover:opacity-95 transition-opacity"
        >
          Get Started
          <ArrowRight className="h-4 w-4 cta-arrow-nudge" />
        </Button>
      </Link>
    </div>
  );
}

export function LandingPage() {
  const { data: stations = SEED_STATIONS } = useStations();
  const totalStations = stations?.length ?? 0;
  const cities = stations ? [...new Set(stations.map((s) => s.city))].length : 0;
  const totalConnectors = stations ? stations.reduce((sum, s) => sum + s.connectors.length, 0) : 0;
  const availableConnectors = stations
    ? stations.reduce(
        (sum, s) => sum + s.connectors.filter((c) => c.status === "available").length,
        0,
      )
    : 0;
  const availableStations = stations
    ? stations.filter((s) => stationStatus(s.connectors) === "available").length
    : 0;
  const availableNow = availableConnectors > 0 ? availableConnectors : availableStations;

  // IntersectionObserver for Stats section count-up triggers once
  const { ref: statsRef, inView: statsInView } = useInView<HTMLElement>({
    threshold: 0.15,
    triggerOnce: true,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar hideNavLinks />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        {/* Stylized Map of India Background Network */}
        <div className="hero-grid-container">
          <HeroGrid />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            {/* Pill badge & Live Ticker */}
            <StaggerFade
              delayMs={STAGGER.pill}
              className="mx-auto mb-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-primary font-medium">India's EV Charging Network</span>
              </div>
              <LiveStationTicker />
            </StaggerFade>

            {/* Headline Reveal with overflow mask */}
            <HeroHeadline />

            {/* Subtitle */}
            <StaggerFade
              delayMs={STAGGER.subtitle}
              className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl"
            >
              Discover, navigate, and charge your EV at thousands of stations across India.
              Real-time availability, pricing, and reviews — all in one place.
            </StaggerFade>

            {/* Charging Line animation connecting left edge to CTA */}
            <div className="mx-auto mt-6 max-w-md">
              <ChargingLine />
            </div>

            {/* Magnetic CTA button */}
            <StaggerFade delayMs={STAGGER.cta} className="mt-8 flex justify-center">
              <MagneticCTAButton />
            </StaggerFade>
          </div>
        </div>
      </section>

      {/* Stats Row Section */}
      <section ref={statsRef} className="relative z-10 -mt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:gap-6">
          <StatCard
            icon={MapPin}
            value={totalStations}
            label="Stations"
            delayMs={STAGGER.cta + 80}
            hint="Verified EV charging hubs"
            to="/map"
            inView={statsInView}
          />
          <StatCard
            icon={Plug}
            value={totalConnectors}
            label="Connectors"
            delayMs={STAGGER.cta + 160}
            hint="CCS2, Type 2, CHAdeMO"
            to="/map"
            isConnectorCard={true}
            inView={statsInView}
          />
          <StatCard
            icon={Battery}
            value={availableNow}
            label="Available Now"
            delayMs={STAGGER.cta + 240}
            badge={
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shadow-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-live-blink inline-flex h-full w-full rounded-full bg-emerald-500" />
                </span>
                LIVE
              </span>
            }
            hint={`${availableStations} of ${totalStations} hubs ready`}
            to="/map"
            isAvailableCard={true}
            availableRatio={{
              current: availableNow || 16,
              total: totalConnectors || 18,
            }}
            inView={statsInView}
          />
          <StatCard
            icon={Star}
            value={cities}
            label="Cities"
            delayMs={STAGGER.cta + 320}
            hint="Metro coverage across India"
            to="/map"
            inView={statsInView}
          />
        </div>
      </section>

      {/* Pinned "How It Works" Section (Scroll-linked 3 steps with GSAP ScrollTrigger) */}
      <HowItWorks />

      {/* Features Section */}
      <SectionEntrance delayMs={150}>
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything You Need to <span className="text-gradient">Charge Smart</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Powerful features designed for India's EV drivers
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Search}
              title="Smart Search & Filters"
              desc="Filter by connector type, power level, operator, and vehicle compatibility to find the perfect charger."
            />
            <FeatureCard
              icon={MapPin}
              title="Real-Time Map"
              desc="See every station on an interactive map with live availability indicators. 'Near Me' finds the closest options instantly."
            />
            <FeatureCard
              icon={Clock}
              title="Live Status Updates"
              desc="Know which connectors are available, in use, or offline before you drive there."
            />
            <FeatureCard
              icon={Battery}
              title="Vehicle Compatibility"
              desc="Select your EV model and we'll show only the stations that work with your car's connector."
            />
            <FeatureCard
              icon={Star}
              title="Save Favourites"
              desc="Bookmark your go-to stations and access them instantly from your profile."
            />
            <FeatureCard
              icon={Shield}
              title="Report Issues"
              desc="Help the community by reporting broken chargers or inaccurate information."
            />
          </div>
        </section>
      </SectionEntrance>

      {/* CTA Banner Section */}
      <SectionEntrance delayMs={200}>
        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-primary p-10 text-center shadow-glow sm:p-16">
            <h2 className="font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
              Ready to Find Your Charger?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
              Join ChargeHub and never worry about finding a charging station again.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link to="/login">
                <Button
                  id="cta-get-started"
                  size="lg"
                  variant="secondary"
                  className="group gap-2 rounded-full px-8 text-base shadow-sm hover:opacity-90 transition-opacity"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 cta-arrow-nudge" />
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  id="cta-signup"
                  size="lg"
                  variant="outline"
                  className="gap-2 rounded-full border-primary-foreground/30 px-8 text-base text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </SectionEntrance>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="EV360" className="h-7 w-auto object-contain dark:hidden" />
            <img
              src="/logo-dark.png"
              alt="EV360"
              className="hidden h-7 w-auto object-contain dark:block"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} EV360. One App. Every Charger. Built for India's EV
            revolution.
          </p>
        </div>
      </footer>
    </div>
  );
}
