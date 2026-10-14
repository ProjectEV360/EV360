import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Zap,
  Heart,
  AlertTriangle,
  Navigation,
  Plug,
  Loader2,
  Coffee,
  ShoppingBag,
  Wifi,
  ParkingCircle,
  UtensilsCrossed,
  BatteryCharging,
  CreditCard,
} from "lucide-react";
import { useState, lazy, Suspense, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Navbar } from "@/components/Navbar";
import { ChargingPaymentModal } from "@/components/ChargingPaymentModal";
import { useStation, useFavouriteIds, useToggleFavourite } from "@/hooks/useChargeData";
import { useAuth } from "@/hooks/useAuth";
import { reportIssue } from "@/services/stationService";
import { STATUS_LABEL, maxPower } from "@/lib/station-utils";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const StationMap = lazy(() =>
  import("@/components/StationMap").then((m) => ({ default: m.StationMap })),
);

export const Route = createFileRoute("/station/$id")({
  ssr: false,
  component: ProtectedStationRoute,
  head: () => ({
    meta: [
      { title: "Station Details — ChargeHub" },
      {
        name: "description",
        content: "View charging station details, connector availability, pricing, and amenities.",
      },
    ],
  }),
});

function ProtectedStationRoute() {
  return (
    <ProtectedRoute fallbackMessage="Please sign in to view station details">
      <StationDetailPage />
    </ProtectedRoute>
  );
}

const statusColor: Record<string, string> = {
  available: "bg-status-available",
  in_use: "bg-status-busy",
  offline: "bg-status-offline",
};
const statusText: Record<string, string> = {
  available: "text-status-available",
  in_use: "text-status-busy",
  offline: "text-status-offline",
};

const AMENITY_ICONS: Record<string, React.ElementType> = {
  Restroom: Coffee,
  Cafe: Coffee,
  "Food Court": UtensilsCrossed,
  WiFi: Wifi,
  Parking: ParkingCircle,
  Shopping: ShoppingBag,
};

function StationDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: station, isLoading } = useStation(id);
  const { data: favIds = [] } = useFavouriteIds(user?.id);
  const toggleFav = useToggleFavourite(user?.id);
  const [reportText, setReportText] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);

  const stationsList = useMemo(() => (station ? [station] : []), [station]);
  const stationCenter = useMemo<[number, number] | undefined>(
    () => (station ? [station.lat, station.lng] : undefined),
    [station],
  );

  const isFav = favIds.includes(id);

  const handleReport = async () => {
    if (!reportText.trim()) return;
    setSubmitting(true);
    try {
      await reportIssue(id, reportText.trim(), user?.id ?? null);
      toast.success("Issue reported — thank you!");
      setReportText("");
      setReportOpen(false);
    } catch {
      toast.error("Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center pt-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center pt-16 text-center">
          <h1 className="text-2xl font-bold">Station not found</h1>
          <p className="mt-2 text-muted-foreground">
            The station you're looking for doesn't exist.
          </p>
          <Link to="/map">
            <Button className="mt-6 gap-2 rounded-full">
              <MapPin className="h-4 w-4" />
              Back to Map
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const availCount = station.connectors.filter((c) => c.status === "available").length;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        {/* Map */}
        <div className="relative isolate z-0 w-full h-[280px] sm:h-[340px] overflow-hidden bg-muted">
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-card">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
          >
            {stationCenter && (
              <StationMap
                stations={stationsList}
                center={stationCenter}
                zoom={15}
                selectedId={station.id}
                className="h-full w-full"
              />
            )}
          </Suspense>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Back button */}
          <Link
            to="/map"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Map
          </Link>

          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                {station.name}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                {station.address}, {station.city}
              </p>
              {station.operator && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Operated by{" "}
                  <span className="font-medium text-foreground">{station.operator.name}</span>
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                id="header-pay-charge-btn"
                size="sm"
                className="gap-1.5 rounded-full bg-gradient-primary shadow-glow hover:opacity-90"
                onClick={() => {
                  setSelectedConnectorId(null);
                  setPaymentOpen(true);
                }}
              >
                <BatteryCharging className="h-4 w-4" />
                Pay & Charge
              </Button>
              {user && (
                <Button
                  id="fav-toggle"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-full"
                  onClick={() => toggleFav.mutate({ stationId: id, isFav })}
                >
                  <Heart className={`h-4 w-4 ${isFav ? "fill-primary text-primary" : ""}`} />
                  {isFav ? "Saved" : "Save"}
                </Button>
              )}
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <Button
                  id="navigate-btn"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-full"
                >
                  <Navigation className="h-4 w-4" />
                  Navigate
                </Button>
              </a>
            </div>
          </div>

          {/* Quick info strip */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Badge variant="secondary" className="gap-1.5 rounded-full px-3 py-1 text-xs">
              <Zap className="h-3.5 w-3.5 text-primary" />
              {maxPower(station.connectors)} kW max
            </Badge>
            <Badge variant="secondary" className="gap-1.5 rounded-full px-3 py-1 text-xs">
              <Plug className="h-3.5 w-3.5 text-primary" />
              {availCount}/{station.connectors.length} available
            </Badge>
            {station.opening_hours && (
              <Badge variant="secondary" className="gap-1.5 rounded-full px-3 py-1 text-xs">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {station.opening_hours}
              </Badge>
            )}
          </div>

          {/* Connectors */}
          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold text-foreground">Connectors</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {station.connectors.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 shadow-card transition-all hover:shadow-glow/30"
                >
                  {/* Status dot */}
                  <div className={`h-3 w-3 shrink-0 rounded-full ${statusColor[c.status]}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-foreground">{c.type}</span>
                      <span className={`text-xs font-medium ${statusText[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>
                    <div className="mt-0.5 flex gap-3 text-xs text-muted-foreground">
                      <span>{c.power_kw} kW</span>
                      <span>₹{c.price_per_kwh.toFixed(2)}/kWh</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={c.status === "available" ? "default" : "outline"}
                    className={`h-8 shrink-0 rounded-full text-xs gap-1.5 px-3.5 ${
                      c.status === "available"
                        ? "bg-gradient-primary shadow-glow hover:opacity-90"
                        : "opacity-80"
                    }`}
                    onClick={() => {
                      setSelectedConnectorId(c.id);
                      setPaymentOpen(true);
                    }}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Charge
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Amenities */}
          {station.amenities.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-semibold text-foreground">Amenities</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {station.amenities.map((a) => {
                  const Icon = AMENITY_ICONS[a] ?? Coffee;
                  return (
                    <Badge
                      key={a}
                      variant="outline"
                      className="gap-1.5 rounded-full px-3 py-1 text-xs"
                    >
                      <Icon className="h-3.5 w-3.5 text-primary" />
                      {a}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Report issue */}
          <div className="mt-8 border-t border-border/50 pt-6">
            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
              <DialogTrigger asChild>
                <Button
                  id="report-issue-btn"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-full text-destructive hover:text-destructive"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Report an Issue
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Report an Issue</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Describe the problem with this station. Your report helps the community.
                </p>
                <Textarea
                  id="report-textarea"
                  placeholder="e.g. CCS2 connector is broken, display not working…"
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setReportOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleReport}
                    disabled={submitting || !reportText.trim()}
                    className="gap-1.5"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit Report
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Razorpay Demo Payment Modal */}
          <ChargingPaymentModal
            open={paymentOpen}
            onOpenChange={setPaymentOpen}
            station={station}
            preselectedConnectorId={selectedConnectorId}
          />
        </div>
      </div>
    </div>
  );
}
