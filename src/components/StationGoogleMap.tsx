import { useEffect, useRef, useState, useCallback } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { MapPin, Key, Layers, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import type { Station } from "@/lib/types";
import { stationStatus, getDirectionsUrl } from "@/lib/station-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStoredGoogleKey } from "@/lib/map-config";

interface StationGoogleMapProps {
  stations: Station[];
  center?: [number, number] | undefined;
  zoom?: number | undefined;
  selectedId?: string | null | undefined;
  onSelect?: ((id: string) => void) | undefined;
  className?: string | undefined;
  onFallbackToOSM?: (() => void) | undefined;
  userLocation?: { lat: number; lng: number } | null | undefined;
}

// Google Maps Dark Theme Styles
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#171f26" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#171f26" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ca0b3" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d5e2ed" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8ca0b3" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1a2c26" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#5ea588" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#22303c" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#19242d" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#2b3d4d" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2d39" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f161c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4f6578" }],
  },
];

// Clean Modern Light Style
const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#e9f2f5" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#f7faf9" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#e4f4ed" }],
  },
];

export function StationGoogleMap({
  stations,
  center = [20.5937, 78.9629], // Default India
  zoom = 5,
  selectedId,
  onSelect,
  className = "",
  onFallbackToOSM,
  userLocation,
}: StationGoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersMapRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const userCircleRef = useRef<google.maps.Circle | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [apiKey, setApiKey] = useState<string>(getStoredGoogleKey);
  const [inputKey, setInputKey] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check dark mode
  const isDarkMode =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const saveApiKey = (key: string) => {
    localStorage.setItem("chargehub_gmaps_key", key.trim());
    setApiKey(key.trim());
    setLoadError(null);
    setIsLoading(true);
  };

  // Initialize Google Maps
  useEffect(() => {
    if (!apiKey) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    try {
      setOptions({
        key: apiKey,
        v: "weekly",
      });
    } catch {
      // Ignore if setOptions was already called
    }

    Promise.all([importLibrary("maps"), importLibrary("marker")])
      .then(() => {
        if (!isMounted || !containerRef.current) return;

        const map = new google.maps.Map(containerRef.current, {
          center: { lat: center[0], lng: center[1] },
          zoom,
          styles: isDarkMode ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
        });

        infoWindowRef.current = new google.maps.InfoWindow();
        mapInstanceRef.current = map;
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          console.error("Google Maps load error:", err);
          setLoadError(
            "Could not load Google Maps with provided key. Please check your API key and billing/permissions.",
          );
          setIsLoading(false);
        }
      });

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current && window.google) {
        google.maps.event.trigger(mapInstanceRef.current, "resize");
      }
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      isMounted = false;
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, isDarkMode]);

  // Sync Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || typeof google === "undefined") return;

    // Clear existing
    markersMapRef.current.forEach((marker) => marker.setMap(null));
    markersMapRef.current.clear();

    stations.forEach((s) => {
      const status = stationStatus(s.connectors);
      const isSelected = s.id === selectedId;

      // Status color
      const color =
        status === "available" ? "#10b981" : status === "in_use" ? "#f59e0b" : "#ef4444";

      // Custom SVG Pin Marker
      const pinSvgRaw =
        '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42"><path d="M17 0C7.61 0 0 7.61 0 17C0 27.2 14.5 40.5 15.6 41.5C16.4 42.2 17.6 42.2 18.4 41.5C19.5 40.5 34 27.2 34 17C34 7.61 26.39 0 17 0Z" fill="' +
        encodeURIComponent(color) +
        '" stroke="#ffffff" stroke-width="2"/><circle cx="17" cy="16" r="10" fill="#ffffff" opacity="0.25"/><path d="M18 9L11 18H16L15 25L23 15H18L18 9Z" fill="#ffffff"/></svg>';
      const pinSvg = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(pinSvgRaw);

      const marker = new google.maps.Marker({
        position: { lat: s.lat, lng: s.lng },
        map,
        title: s.name,
        icon: {
          url: pinSvg,
          scaledSize: isSelected ? new google.maps.Size(42, 50) : new google.maps.Size(32, 40),
          anchor: isSelected ? new google.maps.Point(21, 50) : new google.maps.Point(16, 40),
        },
        zIndex: isSelected ? 999 : 1,
        animation: isSelected ? google.maps.Animation.BOUNCE : null,
      });

      marker.addListener("click", () => {
        onSelect?.(s.id);

        if (infoWindowRef.current) {
          const avail = s.connectors.filter((c) => c.status === "available").length;
          const directionsUrl = getDirectionsUrl(s.lat, s.lng);
          const content = `
            <div style="font-family: system-ui, sans-serif; padding: 4px; color: #1e293b; max-width: 220px;">
              <h4 style="margin: 0; font-weight: 700; font-size: 14px;">${s.name}</h4>
              <p style="margin: 3px 0 6px 0; font-size: 11px; color: #64748b;">${s.address}, ${s.city}</p>
              <div style="display: flex; gap: 6px; font-size: 11px; font-weight: 600; margin-bottom: 8px;">
                <span style="color: ${color};">● ${avail}/${s.connectors.length} Free</span>
                <span style="color: #0d9488;">⚡ ${Math.max(...s.connectors.map((c) => c.power_kw))} kW</span>
              </div>
              <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" 
                 style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-align: center; width: 100%; box-sizing: border-box;">
                Get Directions
              </a>
            </div>
          `;
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(map, marker);
        }
      });

      markersMapRef.current.set(s.id, marker);
    });
  }, [stations, selectedId, onSelect]);

  // Center on selected marker
  useEffect(() => {
    if (!selectedId || !mapInstanceRef.current) return;
    const marker = markersMapRef.current.get(selectedId);
    if (marker) {
      const pos = marker.getPosition();
      if (pos) {
        mapInstanceRef.current.panTo(pos);
        mapInstanceRef.current.setZoom(15);
      }
    }
  }, [selectedId]);

  // Center on center prop change
  useEffect(() => {
    if (!center || !mapInstanceRef.current) return;
    mapInstanceRef.current.panTo({ lat: center[0], lng: center[1] });
    if (zoom) {
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [center, zoom]);

  // Render and sync user location marker on Google Maps
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || typeof google === "undefined") return;

    if (!userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
      if (userCircleRef.current) {
        userCircleRef.current.setMap(null);
        userCircleRef.current = null;
      }
      return;
    }

    const pos = { lat: userLocation.lat, lng: userLocation.lng };
    const userDotSvgRaw =
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="#2563eb" fill-opacity="0.25"/><circle cx="14" cy="14" r="7" fill="#2563eb" stroke="#ffffff" stroke-width="2.5"/></svg>';
    const userDotSvg = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(userDotSvgRaw);

    if (!userMarkerRef.current) {
      const marker = new google.maps.Marker({
        position: pos,
        map,
        title: "Your Location",
        icon: {
          url: userDotSvg,
          scaledSize: new google.maps.Size(28, 28),
          anchor: new google.maps.Point(14, 14),
        },
        zIndex: 1000,
      });

      const circle = new google.maps.Circle({
        strokeColor: "#2563eb",
        strokeOpacity: 0.4,
        strokeWeight: 1,
        fillColor: "#3b82f6",
        fillOpacity: 0.08,
        map,
        center: pos,
        radius: 120,
      });

      userMarkerRef.current = marker;
      userCircleRef.current = circle;
    } else {
      userMarkerRef.current.setPosition(pos);
      if (userCircleRef.current) {
        userCircleRef.current.setCenter(pos);
      }
    }
  }, [userLocation]);

  // Fallback / Key Input State
  if (!apiKey || loadError) {
    return (
      <div
        className={`relative flex h-full w-full flex-col items-center justify-center rounded-2xl border border-border/60 bg-card p-6 text-center shadow-card ${className}`}
        style={{ minHeight: 320 }}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Key className="h-6 w-6 text-primary" />
        </div>

        <h3 className="mt-4 font-display text-lg font-bold text-foreground">
          Connect Google Maps API
        </h3>
        <p className="mt-1.5 max-w-md text-xs text-muted-foreground leading-relaxed">
          {loadError ||
            "Enter your Google Maps JavaScript API key below to activate Google Maps satellite, terrain, and high-precision routing."}
        </p>

        {/* Input box */}
        <div className="mt-4 flex w-full max-w-sm gap-2">
          <Input
            placeholder="AIzaSy..."
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            className="rounded-xl text-xs font-mono"
          />
          <Button
            size="sm"
            onClick={() => saveApiKey(inputKey)}
            disabled={!inputKey.trim()}
            className="rounded-xl bg-gradient-primary px-4 shadow-glow"
          >
            Apply Key
          </Button>
        </div>

        {/* Fallback to OSM */}
        {onFallbackToOSM && (
          <div className="mt-5 border-t border-border/50 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onFallbackToOSM}
              className="gap-2 rounded-full text-xs"
            >
              <Layers className="h-3.5 w-3.5 text-primary" />
              Switch to OpenStreetMap (No Key Required)
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative isolate z-0 h-full w-full overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-xs">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      )}
      <div
        ref={containerRef}
        id="google-station-map"
        className={`h-full w-full overflow-hidden ${className}`}
      />
    </div>
  );
}
