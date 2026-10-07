import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Zap,
  MapPin,
  Search,
  Shield,
  ArrowRight,
  ChevronRight,
  Battery,
  Clock,
  Star,
  Plug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { useStations } from "@/hooks/useChargeData";
import { stationStatus } from "@/lib/station-utils";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
}) {
  return (
    <div className="group flex flex-col items-center rounded-2xl border border-border/60 bg-card px-4 py-5 sm:px-5 sm:py-6 lg:px-6 lg:py-7 shadow-card transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
      <div className="flex h-10 w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
        <Icon className="h-5 w-5 sm:h-5.5 sm:w-5.5 lg:h-6 lg:w-6 text-primary" />
      </div>
      <span className="mt-2.5 sm:mt-3 font-display text-2xl sm:text-3xl lg:text-3xl font-bold text-foreground">
        {value}
      </span>
      <span className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

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
    <div className="group rounded-2xl border border-border/60 bg-card p-6 shadow-card transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow/30">
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

function LandingPage() {
  const { data: stations } = useStations();
  const totalStations = stations?.length ?? 0;
  const cities = stations ? [...new Set(stations.map((s) => s.city))].length : 0;
  const totalConnectors = stations ? stations.reduce((sum, s) => sum + s.connectors.length, 0) : 0;
  const availableNow = stations
    ? stations.filter((s) => stationStatus(s.connectors) === "available").length
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,var(--background)_100%)]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:px-8 lg:pt-36">
          <div className="mx-auto max-w-3xl text-center">
            {/* Pill badge */}
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium">India's EV Charging Network</span>
            </div>

            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Find Your Nearest <span className="text-gradient">Charging Station</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Discover, navigate, and charge your EV at thousands of stations across India.
              Real-time availability, pricing, and reviews — all in one place.
            </p>

            {/* CTA buttons */}
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/map">
                <Button
                  id="hero-explore-map"
                  size="lg"
                  className="gap-2 rounded-full bg-gradient-primary px-8 shadow-glow text-base hover:opacity-90 transition-opacity"
                >
                  <MapPin className="h-5 w-5" />
                  Explore Map
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  id="hero-get-started"
                  variant="outline"
                  size="lg"
                  className="gap-2 rounded-full px-8 text-base"
                >
                  Get Started
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 -mt-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:gap-6">
          <StatCard icon={MapPin} value={String(totalStations)} label="Stations" />
          <StatCard icon={Plug} value={String(totalConnectors)} label="Connectors" />
          <StatCard icon={Battery} value={String(availableNow)} label="Available Now" />
          <StatCard icon={Star} value={String(cities)} label="Cities" />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
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

      {/* CTA Banner */}
      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-primary p-10 text-center shadow-glow sm:p-16">
          <h2 className="font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
            Ready to Find Your Charger?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Join ChargeHub and never worry about finding a charging station again.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/map">
              <Button
                id="cta-open-map"
                size="lg"
                variant="secondary"
                className="gap-2 rounded-full px-8 text-base"
              >
                <MapPin className="h-5 w-5" />
                Open Map
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
