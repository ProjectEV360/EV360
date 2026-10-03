import type { Connector, ConnectorStatus, Station, StationFilters } from "./types";

export function stationStatus(connectors: Connector[]): ConnectorStatus {
  if (connectors.some((c) => c.status === "available")) return "available";
  if (connectors.some((c) => c.status === "in_use")) return "in_use";
  return "offline";
}

export function maxPower(connectors: Connector[]) {
  return connectors.reduce((m, c) => Math.max(m, c.power_kw), 0);
}

export function priceRange(connectors: Connector[]) {
  if (!connectors.length) return "—";
  const p = connectors.map((c) => c.price_per_kwh);
  const min = Math.min(...p);
  const max = Math.max(...p);
  return min === max ? `₹${min.toFixed(2)}/kWh` : `₹${min.toFixed(0)}–${max.toFixed(0)}/kWh`;
}

export const STATUS_LABEL: Record<ConnectorStatus, string> = {
  available: "Available",
  in_use: "In use",
  offline: "Offline",
};

export function connectorMatches(c: Connector, f: StationFilters) {
  if (f.connectorTypes.length && !f.connectorTypes.includes(c.type)) return false;
  if (c.power_kw < f.minKw) return false;
  if (f.availableOnly && c.status !== "available") return false;
  return true;
}

export function filterStations(stations: Station[], f: StationFilters) {
  return stations.filter((s) => {
    if (f.operatorIds.length && !f.operatorIds.includes(s.operator.id)) return false;
    return s.connectors.some((c) => connectorMatches(c, f));
  });
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
