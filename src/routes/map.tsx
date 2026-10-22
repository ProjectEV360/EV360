import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search,
  Navigation,
  Loader2,
  List,
  MapIcon,
  X,
  Zap,
  ChevronRight,
  Home,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { StationCard } from "@/components/StationCard";
import { FilterPanel } from "@/components/FilterPanel";
import { HomeChargerBookingModal } from "@/components/HomeChargerBookingModal";
import {
  useStations,
  useOperators,
  useVehicles,
  useFavouriteIds,
  useToggleFavourite,
} from "@/hooks/useChargeData";
import { useAuth } from "@/hooks/useAuth";
import { filterStations, distanceKm, STATUS_LABEL } from "@/lib/station-utils";
import { DEFAULT_FILTERS, type StationFilters, type Station } from "@/lib/types";
import { geocode } from "@/services/stationService";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const StationMap = lazy(() =>
  import("@/components/StationMap").then((m) => ({ default: m.StationMap })),
);

export const Route = createFileRoute("/map")({
  ssr: false,
  component: ProtectedMapRoute,
  head: () => ({
    meta: [
      { title: "Map — ChargeHub" },
      {
        name: "description",
        content:
          "Find EV charging stations near you on an interactive map with real-time availability.",
      },
    ],
  }),
});

function ProtectedMapRoute() {
  return (
    <ProtectedRoute fallbackMessage="Please sign in to access the map">
      <MapPage />
    </ProtectedRoute>
  );
}

function MapPage() {
  const { user } = useAuth();
  const { data: stations, isLoading } = useStations(user?.id);
  const { data: operators = [] } = useOperators();
  const { data: vehicles = [] } = useVehicles();
  const { data: favIds = [] } = useFavouriteIds(user?.id);
  const toggleFav = useToggleFavourite(user?.id);

  const [filters, setFilters] = useState<StationFilters>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bookingModalStation, setBookingModalStation] = useState<Station | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>();
  const [mapZoom, setMapZoom] = useState<number | undefined>();
  const [isLocating, setIsLocating] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Locate user with retry fallback
  const locateUser = useCallback((showToast = true) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      if (showToast) toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);

    const onSuccess = (pos: GeolocationPosition) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(loc);
      setMapCenter([loc.lat, loc.lng]);
      setMapZoom(14);
      setIsLocating(false);
      if (showToast) toast.success("Found your location!");
    };

    const onError = (err: GeolocationPositionError) => {
      // If high accuracy times out (common on WiFi/laptops), retry with standard accuracy
      if (err.code === err.TIMEOUT) {
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (fallbackErr) => {
            setIsLocating(false);
            if (showToast) {
              if (fallbackErr.code === fallbackErr.PERMISSION_DENIED) {
                toast.error(
                  "Location permission denied. Please allow location access in your browser.",
                );
              } else {
                toast.error("Could not get your location.");
              }
            }
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
        );
        return;
      }

      setIsLocating(false);
      if (showToast) {
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location permission denied. Please allow location access in your browser.");
        } else {
          toast.error("Could not get your location.");
        }
      }
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 6000,
      maximumAge: 60000,
    });
  }, []);

  // Attempt auto-locating on initial mount
  useEffect(() => {
    locateUser(false);
  }, [locateUser]);

  // Resolve vehicle filter → connector types
  const resolvedFilters = useMemo(() => {
    if (!filters.vehicleId) return filters;
    const vehicle = vehicles.find((v) => v.id === filters.vehicleId);
    if (!vehicle) return filters;
    return {
      ...filters,
      connectorTypes: vehicle.connector_types,
    };
  }, [filters, vehicles]);

  const filtered = useMemo(
    () => filterStations(stations ?? [], resolvedFilters),
    [stations, resolvedFilters],
  );

  // Sort by distance if we have user location
  const sorted = useMemo(() => {
    if (!userLocation) return filtered;
    return [...filtered].sort((a, b) => distanceKm(userLocation, a) - distanceKm(userLocation, b));
  }, [filtered, userLocation]);

  const selectedStation = useMemo(
    () => sorted.find((s) => s.id === selectedId) || null,
    [sorted, selectedId],
  );

  // Search handler
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const result = await geocode(searchQuery.trim());
      if (result) {
        setMapCenter([result.lat, result.lng]);
        setMapZoom(13);
        setUserLocation({ lat: result.lat, lng: result.lng });
      } else {
        toast.error("Location not found");
      }
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  return (
    <div className="flex h-screen max-h-screen overflow-hidden flex-col bg-background">
      <Navbar />
      <div className="flex flex-1 overflow-hidden flex-col pt-16">
        {/* Top bar: search + near me + view toggle */}
        <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search-input"
                placeholder="Search city, area, or landmark…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 pr-8 rounded-full"
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              id="search-btn"
              size="sm"
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="gap-1.5 rounded-full"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
            <Button
              id="near-me-btn"
              variant="outline"
              size="sm"
              onClick={() => locateUser(true)}
              disabled={isLocating}
              className="gap-1.5 rounded-full"
            >
              {isLocating ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Navigation className="h-4 w-4 text-primary" />
              )}
              Near Me
            </Button>

            {/* View toggle (mobile) */}
            <div className="flex gap-1 rounded-full border border-border p-0.5 lg:hidden">
              <button
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === "map"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" />
                Map
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
            </div>

            {/* Mobile filter button */}
            <div className="lg:hidden">
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                operators={operators}
                vehicles={vehicles}
              />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar filters (desktop) */}
          <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-border/50 bg-card/30 p-5 lg:block">
            <h3 className="mb-4 font-display text-sm font-semibold text-foreground">Filters</h3>
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              operators={operators}
              vehicles={vehicles}
            />
            {/* Station count */}
            <div className="mt-6 rounded-xl bg-primary/5 p-3 text-center">
              <span className="font-display text-2xl font-bold text-primary">{sorted.length}</span>
              <span className="ml-1 text-sm text-muted-foreground">stations found</span>
            </div>
          </aside>

          {/* Map + List */}
          <div className="relative flex flex-1 overflow-hidden flex-col lg:flex-row min-w-0">
            {/* Center Map section */}
            <div
              className={`relative flex flex-1 min-w-0 min-h-0 flex-col p-3 sm:p-4 lg:p-4.5 xl:p-5 ${
                viewMode === "list" ? "hidden lg:flex" : "flex"
              }`}
            >
              <div className="relative flex-1 h-full w-full overflow-hidden rounded-2xl lg:rounded-3xl border border-border/70 bg-card shadow-sm z-0 isolate">
                {isLoading ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Suspense
                    fallback={
                      <div className="flex h-full w-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    }
                  >
                    <StationMap
                      stations={sorted}
                      center={mapCenter}
                      zoom={mapZoom}
                      selectedId={selectedId}
                      onSelect={(id) => setSelectedId(id)}
                      userLocation={userLocation}
                      onLocateMe={() => locateUser(true)}
                      isLocating={isLocating}
                    />
                  </Suspense>
                )}

                {/* Compact charger detail panel on map selection */}
                {selectedStation && (
                  <div className="absolute bottom-4 inset-x-4 sm:inset-x-auto sm:left-4 sm:w-96 z-20 rounded-2xl border border-border/80 bg-background/95 backdrop-blur-md p-4 shadow-xl transition-all duration-200 animate-in slide-in-from-bottom-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="secondary"
                            className="text-[10px] uppercase font-semibold tracking-wider"
                          >
                            {STATUS_LABEL[selectedStation.connectors[0]?.status ?? "available"]}
                          </Badge>
                          {selectedStation.is_home_charger && (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-medium"
                            >
                              🏠 Home Host
                            </Badge>
                          )}
                          {selectedStation.rating != null && selectedStation.rating > 0 && (
                            <span className="text-xs font-medium text-amber-500">
                              ★ {selectedStation.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <h4 className="mt-1 font-display font-semibold text-sm text-foreground truncate">
                          {selectedStation.name}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {selectedStation.address}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedId(null)}
                        className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Close details"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {selectedStation.connectors[0]?.power_kw} kW
                        </span>
                        <span>•</span>
                        <span>{selectedStation.connectors[0]?.type}</span>
                        <span>•</span>
                        <span className="text-primary font-semibold">
                          ₹{selectedStation.connectors[0]?.price_per_kwh}/kWh
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      {selectedStation.is_home_charger ? (
                        <Button
                          size="sm"
                          className="flex-1 rounded-xl bg-gradient-primary shadow-glow text-primary-foreground text-xs font-semibold gap-1.5"
                          onClick={() => setBookingModalStation(selectedStation)}
                        >
                          <Zap className="h-3.5 w-3.5" />
                          Book Host Slot
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 rounded-xl text-xs gap-1.5"
                          asChild
                        >
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${selectedStation.lat},${selectedStation.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Navigation className="h-3.5 w-3.5" />
                            Directions
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-xl text-xs gap-1"
                        asChild
                      >
                        <Link to="/station/$id" params={{ id: selectedStation.id }}>
                          Details
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* List view */}
            <div
              className={`overflow-y-auto border-l border-border/50 bg-background lg:w-[380px] ${
                viewMode === "map" ? "hidden lg:block" : ""
              }`}
            >
              <div className="p-4">
                <h3 className="mb-3 font-display text-sm font-semibold text-foreground">
                  {sorted.length} Station{sorted.length !== 1 ? "s" : ""}
                </h3>
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : sorted.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No stations match your filters.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sorted.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setSelectedId(s.id)}
                        className={`cursor-pointer rounded-2xl transition-all ${
                          selectedId === s.id
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                            : ""
                        }`}
                      >
                        <StationCard
                          station={s}
                          isFav={favIds.includes(s.id)}
                          {...(user
                            ? {
                                onToggleFav: () =>
                                  toggleFav.mutate({
                                    stationId: s.id,
                                    isFav: favIds.includes(s.id),
                                  }),
                              }
                            : {})}
                          distance={userLocation ? distanceKm(userLocation, s) : null}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {bookingModalStation && (
        <HomeChargerBookingModal
          open={Boolean(bookingModalStation)}
          onOpenChange={(open) => !open && setBookingModalStation(null)}
          station={bookingModalStation}
        />
      )}
    </div>
  );
}
