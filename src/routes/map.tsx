import { createFileRoute } from "@tanstack/react-router";
import { Search, Navigation, Loader2, List, MapIcon, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { StationCard } from "@/components/StationCard";
import { StationMap } from "@/components/StationMap";
import { FilterPanel } from "@/components/FilterPanel";
import {
  useStations,
  useOperators,
  useVehicles,
  useFavouriteIds,
  useToggleFavourite,
} from "@/hooks/useChargeData";
import { useAuth } from "@/hooks/useAuth";
import { filterStations, distanceKm } from "@/lib/station-utils";
import { DEFAULT_FILTERS, type StationFilters } from "@/lib/types";
import { geocode } from "@/services/stationService";
import { toast } from "sonner";

export const Route = createFileRoute("/map")({
  component: MapPage,
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

function MapPage() {
  const { user } = useAuth();
  const { data: stations, isLoading } = useStations();
  const { data: operators = [] } = useOperators();
  const { data: vehicles = [] } = useVehicles();
  const { data: favIds = [] } = useFavouriteIds(user?.id);
  const toggleFav = useToggleFavourite(user?.id);

  const [filters, setFilters] = useState<StationFilters>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>();
  const [mapZoom, setMapZoom] = useState<number | undefined>();
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

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

  // Near me handler
  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setMapCenter([loc.lat, loc.lng]);
        setMapZoom(13);
        toast.success("Found your location!");
      },
      () => toast.error("Could not get your location"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="flex flex-1 flex-col pt-16">
        {/* Top bar: search + near me + view toggle */}
        <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
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
              onClick={handleNearMe}
              className="gap-1.5 rounded-full"
            >
              <Navigation className="h-4 w-4" />
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
          <div className="relative flex flex-1 flex-col lg:flex-row">
            {/* Map view */}
            <div className={`relative flex-1 ${viewMode === "list" ? "hidden lg:block" : ""}`}>
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <StationMap
                  stations={sorted}
                  center={mapCenter}
                  zoom={mapZoom}
                  selectedId={selectedId}
                  onSelect={(id) => setSelectedId(id)}
                />
              )}
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
                          onToggleFav={
                            user
                              ? () =>
                                  toggleFav.mutate({
                                    stationId: s.id,
                                    isFav: favIds.includes(s.id),
                                  })
                              : undefined
                          }
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
    </div>
  );
}
