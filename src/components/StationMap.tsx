import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import { Layers, Key, LocateFixed, Loader2 } from "lucide-react";
import type { Station } from "@/lib/types";
import { stationStatus } from "@/lib/station-utils";
import { StationGoogleMap } from "./StationGoogleMap";
import { getStoredGoogleKey } from "@/lib/map-config";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface StationMapProps {
  stations: Station[];
  center?: [number, number] | undefined;
  zoom?: number | undefined;
  selectedId?: string | null | undefined;
  onSelect?: ((id: string) => void) | undefined;
  className?: string | undefined;
  userLocation?: { lat: number; lng: number } | null | undefined;
  onLocateMe?: (() => void) | undefined;
  isLocating?: boolean | undefined;
}

export function StationMap({
  stations,
  center = [20.5937, 78.9629], // Center of India
  zoom = 5,
  selectedId,
  onSelect,
  className = "",
  userLocation,
  onLocateMe,
  isLocating = false,
}: StationMapProps) {
  // Map Provider State: 'google' | 'osm' (defaults to OpenStreetMap)
  const [provider, setProvider] = useState<"google" | "osm">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chargehub_map_provider");
      if (saved === "osm") return "osm";
    }
    return "osm";
  });

  const [keyModalOpen, setKeyModalOpen] = useState<boolean>(false);
  const [inputKey, setInputKey] = useState<string>(getStoredGoogleKey);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);

  const switchProvider = (next: "google" | "osm") => {
    setProvider(next);
    localStorage.setItem("chargehub_map_provider", next);
    toast.info(`Switched map provider to ${next === "google" ? "Google Maps" : "OpenStreetMap"}`);
  };

  const handleSaveGoogleKey = () => {
    localStorage.setItem("chargehub_gmaps_key", inputKey.trim());
    setKeyModalOpen(false);
    setProvider("google");
    localStorage.setItem("chargehub_map_provider", "google");
    toast.success("Google Maps API key updated");
  };

  // Initialize Leaflet map (only when provider === 'osm')
  useEffect(() => {
    if (provider !== "osm") return;
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Responsive resize observer with rAF debouncing to prevent layout thrashing
    let resizeTimer: number | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimer) cancelAnimationFrame(resizeTimer);
      resizeTimer = requestAnimationFrame(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize({ debounceMoveend: true });
        }
      });
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 50,
      iconCreateFunction: (c) => {
        const count = c.getChildCount();
        const size = count < 10 ? 36 : count < 50 ? 44 : 52;
        return L.divIcon({
          html: `<span>${count}</span>`,
          className: "ch-cluster",
          iconSize: L.point(size, size),
        });
      },
    });

    map.addLayer(cluster);
    mapRef.current = map;
    clusterRef.current = cluster;

    return () => {
      if (resizeTimer) cancelAnimationFrame(resizeTimer);
      resizeObserver.disconnect();
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (userCircleRef.current) {
        userCircleRef.current.remove();
        userCircleRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  // Sync Leaflet markers with stations
  useEffect(() => {
    if (provider !== "osm") return;
    const cluster = clusterRef.current;
    if (!cluster) return;

    cluster.clearLayers();
    markersRef.current.clear();

    stations.forEach((s) => {
      const status = stationStatus(s.connectors);
      const marker = L.marker([s.lat, s.lng], {
        icon: L.divIcon({
          className: "ch-marker",
          iconSize: [26, 26],
          html: `<div class="ch-marker" data-status="${status}" data-active="${s.id === selectedId}"></div>`,
        }),
      });

      marker.bindTooltip(s.name, { direction: "top", offset: [0, -14] });
      marker.on("click", () => onSelect?.(s.id));
      cluster.addLayer(marker);
      markersRef.current.set(s.id, marker);
    });
  }, [stations, selectedId, onSelect, provider]);

  // Sync Leaflet user location marker
  useEffect(() => {
    if (provider !== "osm" || !mapRef.current) return;

    if (!userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (userCircleRef.current) {
        userCircleRef.current.remove();
        userCircleRef.current = null;
      }
      return;
    }

    const latLng: [number, number] = [userLocation.lat, userLocation.lng];

    if (!userMarkerRef.current) {
      const userIcon = L.divIcon({
        className: "ch-user-location-wrapper",
        html: `
          <div class="ch-user-location">
            <div class="ch-user-location-pulse"></div>
            <div class="ch-user-location-dot"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker(latLng, {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(mapRef.current);

      marker.bindTooltip("You are here", {
        direction: "top",
        offset: [0, -12],
        className: "ch-location-tooltip",
      });

      const circle = L.circle(latLng, {
        radius: 120,
        color: "#2563eb",
        weight: 1.5,
        opacity: 0.35,
        fillColor: "#3b82f6",
        fillOpacity: 0.1,
      }).addTo(mapRef.current);

      userMarkerRef.current = marker;
      userCircleRef.current = circle;
    } else {
      userMarkerRef.current.setLatLng(latLng);
      if (userCircleRef.current) {
        userCircleRef.current.setLatLng(latLng);
      }
    }
  }, [userLocation, provider]);

  // Leaflet Fly to selected
  useEffect(() => {
    if (provider !== "osm") return;
    if (!selectedId || !mapRef.current) return;
    const marker = markersRef.current.get(selectedId);
    if (marker) {
      const ll = marker.getLatLng();
      mapRef.current.flyTo(ll, 15, { duration: 0.8 });
    }
  }, [selectedId, provider]);

  const centerLat = center?.[0];
  const centerLng = center?.[1];

  // Leaflet Fly to center if coordinates change
  useEffect(() => {
    if (provider !== "osm" || !mapRef.current || centerLat == null || centerLng == null) return;
    mapRef.current.flyTo([centerLat, centerLng], zoom ?? 13, { duration: 0.8 });
  }, [centerLat, centerLng, zoom, provider]);

  return (
    <div className="relative isolate z-0 h-full w-full overflow-hidden">
      {/* Floating Provider Switcher & Locate Pill */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1 rounded-full border border-border/60 bg-card/90 p-1 shadow-card backdrop-blur-md">
        {onLocateMe && (
          <>
            <button
              id="map-locate-btn"
              type="button"
              onClick={() => {
                if (userLocation && mapRef.current) {
                  mapRef.current.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 0.8 });
                }
                onLocateMe();
              }}
              disabled={isLocating}
              title={userLocation ? "Center on my location" : "Find my current location"}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-primary transition-all hover:bg-primary/10 active:scale-95 disabled:opacity-50"
            >
              {isLocating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LocateFixed className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">My Location</span>
            </button>
            <div className="h-3.5 w-[1px] bg-border/60 mx-0.5" />
          </>
        )}

        <button
          id="map-provider-osm"
          type="button"
          onClick={() => switchProvider("osm")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
            provider === "osm"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          OpenStreetMap
        </button>
      </div>

      {/* Main Map Rendering */}
      {provider === "google" ? (
        <StationGoogleMap
          stations={stations}
          center={center}
          zoom={zoom}
          selectedId={selectedId}
          onSelect={onSelect}
          className={className}
          onFallbackToOSM={() => switchProvider("osm")}
          userLocation={userLocation}
        />
      ) : (
        <div
          ref={containerRef}
          id="station-map"
          className={`h-full w-full overflow-hidden ${className}`}
        />
      )}

      {/* Google Maps API Key Modal */}
      <Dialog open={keyModalOpen} onOpenChange={setKeyModalOpen}>
        <DialogContent className="sm:max-w-md sm:rounded-3xl border-border/60 bg-card p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="font-display text-lg font-bold">
                Google Maps API Configuration
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connect your Google Maps JavaScript API key to enable high-precision satellite,
              terrain, and custom styled EV charging maps.
            </p>

            <div>
              <Label htmlFor="gmaps-key-input" className="text-xs font-medium">
                Google Maps API Key
              </Label>
              <Input
                id="gmaps-key-input"
                placeholder="AIzaSy..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="mt-1.5 font-mono text-xs rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setKeyModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-full bg-gradient-primary text-xs shadow-glow"
                onClick={handleSaveGoogleKey}
              >
                Save & Activate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
