import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import { Layers, Map as MapIcon, Settings, Key } from "lucide-react";
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
  center?: [number, number];
  zoom?: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

export function StationMap({
  stations,
  center = [20.5937, 78.9629], // Center of India
  zoom = 5,
  selectedId,
  onSelect,
  className = "",
}: StationMapProps) {
  // Map Provider State: 'google' | 'osm'
  const [provider, setProvider] = useState<"google" | "osm">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chargehub_map_provider");
      if (saved === "google" || saved === "osm") return saved;
      // If a google key is present, default to google
      if (getStoredGoogleKey()) return "google";
    }
    return "osm";
  });

  const [keyModalOpen, setKeyModalOpen] = useState<boolean>(false);
  const [inputKey, setInputKey] = useState<string>(getStoredGoogleKey);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

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

  // Leaflet Fly to center if center prop changes
  useEffect(() => {
    if (provider !== "osm" || !mapRef.current || !center) return;
    mapRef.current.flyTo(center, zoom ?? 13, { duration: 0.8 });
  }, [center, zoom, provider]);

  return (
    <div className="relative h-full w-full">
      {/* Floating Provider Switcher Pill */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1 rounded-full border border-border/60 bg-card/90 p-1 shadow-card backdrop-blur-md">
        <button
          id="map-provider-google"
          type="button"
          onClick={() => switchProvider("google")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
            provider === "google"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MapIcon className="h-3.5 w-3.5" />
          Google Maps
        </button>

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

        <button
          id="google-maps-settings-btn"
          type="button"
          onClick={() => {
            setInputKey(getStoredGoogleKey());
            setKeyModalOpen(true);
          }}
          title="Google Maps API Key Settings"
          className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
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
        />
      ) : (
        <div
          ref={containerRef}
          id="station-map"
          className={`h-full w-full ${className}`}
          style={{ minHeight: 300 }}
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
