import { Link } from "@tanstack/react-router";
import { Zap, MapPin, Clock, Heart, ChevronRight, Navigation } from "lucide-react";
import type { Station } from "@/lib/types";
import {
  stationStatus,
  maxPower,
  priceRange,
  STATUS_LABEL,
  getDirectionsUrl,
} from "@/lib/station-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface StationCardProps {
  station: Station;
  isFav?: boolean;
  onToggleFav?: () => void;
  distance?: number | null;
}

const statusColor: Record<string, string> = {
  available: "bg-status-available",
  in_use: "bg-status-busy",
  offline: "bg-status-offline",
};

export function StationCard({ station, isFav, onToggleFav, distance }: StationCardProps) {
  const status = stationStatus(station.connectors);
  const power = maxPower(station.connectors);
  const price = priceRange(station.connectors);
  const availCount = station.connectors.filter((c) => c.status === "available").length;

  return (
    <div
      id={`station-card-${station.id}`}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card transition-all duration-300 hover:shadow-glow hover:-translate-y-0.5"
    >
      {/* Status strip */}
      <div className={`h-1 ${statusColor[status]}`} />

      <div className="p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider ${
                  status === "available"
                    ? "bg-status-available/15 text-status-available"
                    : status === "in_use"
                      ? "bg-status-busy/15 text-status-busy"
                      : "bg-status-offline/15 text-status-offline"
                }`}
              >
                {STATUS_LABEL[status]}
              </Badge>
              {distance != null && (
                <span className="text-xs text-muted-foreground">
                  {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)} km`}
                </span>
              )}
            </div>
            <h3 className="mt-1.5 truncate font-display text-base font-semibold leading-tight text-foreground">
              {station.name}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {station.address}
            </p>
          </div>
          {onToggleFav && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFav();
              }}
              aria-label={isFav ? "Remove from favourites" : "Add to favourites"}
              className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
            >
              <Heart
                className={`h-4 w-4 transition-all ${
                  isFav ? "fill-primary text-primary scale-110" : ""
                }`}
              />
            </button>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">{power} kW</span>
          </span>
          <span className="h-3 w-px bg-border" />
          <span className="font-medium text-foreground">{price}</span>
          <span className="h-3 w-px bg-border" />
          <span>
            <span className="font-medium text-status-available">{availCount}</span>/
            {station.connectors.length} free
          </span>
        </div>

        {/* Connector types & operator */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {[...new Set(station.connectors.map((c) => c.type))].map((t) => (
              <Badge key={t} variant="outline" className="text-[10px] font-normal">
                {t}
              </Badge>
            ))}
          </div>
          {station.operator && (
            <span className="text-[10px] text-muted-foreground">{station.operator.name}</span>
          )}
        </div>

        {/* Opening hours */}
        {station.opening_hours && (
          <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {station.opening_hours}
          </p>
        )}

        {/* Actions row */}
        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2 rounded-xl text-xs font-medium transition-all hover:bg-primary/10"
            asChild
          >
            <a
              href={getDirectionsUrl(station.lat, station.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <Navigation className="h-3.5 w-3.5" />
              Get Directions
            </a>
          </Button>
          <Link
            to="/station/$id"
            params={{ id: station.id }}
            className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            View details
            <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
