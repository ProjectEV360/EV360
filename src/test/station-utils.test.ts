import { describe, expect, it } from "vitest";
import {
  distanceKm,
  filterStations,
  maxPower,
  priceRange,
  stationStatus,
  connectorMatches,
} from "@/lib/station-utils";
import type { Connector, Station, StationFilters } from "@/lib/types";

const mockConnectors: Connector[] = [
  { id: "c1", type: "CCS2", power_kw: 60, price_per_kwh: 18.5, status: "available" },
  { id: "c2", type: "Type 2", power_kw: 22, price_per_kwh: 15.0, status: "in_use" },
  { id: "c3", type: "CHAdeMO", power_kw: 50, price_per_kwh: 20.0, status: "offline" },
];

const mockStation: Station = {
  id: "s1",
  name: "Bandra Fast Charger",
  address: "Linking Road",
  city: "Mumbai",
  lat: 19.0596,
  lng: 72.8295,
  opening_hours: "24/7",
  amenities: ["Cafe", "Restroom"],
  operator: { id: "op1", name: "Tata Power", logo_url: null },
  connectors: mockConnectors,
};

const defaultFilters: StationFilters = {
  connectorTypes: [],
  minKw: 0,
  operatorIds: [],
  availableOnly: false,
  vehicleId: null,
};

describe("station-utils", () => {
  describe("stationStatus", () => {
    it("returns available if any connector is available", () => {
      expect(stationStatus(mockConnectors)).toBe("available");
    });

    it("returns in_use if none are available but one is in_use", () => {
      const busyOnly: Connector[] = [
        { id: "c1", type: "CCS2", power_kw: 60, price_per_kwh: 18, status: "in_use" },
        { id: "c2", type: "CCS2", power_kw: 60, price_per_kwh: 18, status: "offline" },
      ];
      expect(stationStatus(busyOnly)).toBe("in_use");
    });

    it("returns offline if all connectors are offline", () => {
      const offlineOnly: Connector[] = [
        { id: "c1", type: "CCS2", power_kw: 60, price_per_kwh: 18, status: "offline" },
      ];
      expect(stationStatus(offlineOnly)).toBe("offline");
    });

    it("returns offline for empty connector array", () => {
      expect(stationStatus([])).toBe("offline");
    });
  });

  describe("maxPower", () => {
    it("returns maximum power among connectors", () => {
      expect(maxPower(mockConnectors)).toBe(60);
    });

    it("returns 0 for empty array", () => {
      expect(maxPower([])).toBe(0);
    });
  });

  describe("priceRange", () => {
    it("returns range formatted string when prices vary", () => {
      expect(priceRange(mockConnectors)).toBe("₹15–20/kWh");
    });

    it("returns single price when all prices are equal", () => {
      const samePrice: Connector[] = [
        { id: "c1", type: "CCS2", power_kw: 60, price_per_kwh: 18.5, status: "available" },
        { id: "c2", type: "Type 2", power_kw: 22, price_per_kwh: 18.5, status: "available" },
      ];
      expect(priceRange(samePrice)).toBe("₹18.50/kWh");
    });

    it("returns dash for empty array", () => {
      expect(priceRange([])).toBe("—");
    });
  });

  describe("connectorMatches", () => {
    it("matches connector with default filters", () => {
      expect(connectorMatches(mockConnectors[0]!, defaultFilters)).toBe(true);
    });

    it("filters out if type does not match", () => {
      const filters: StationFilters = { ...defaultFilters, connectorTypes: ["GB/T"] };
      expect(connectorMatches(mockConnectors[0]!, filters)).toBe(false);
    });

    it("filters out if power is below minKw", () => {
      const filters: StationFilters = { ...defaultFilters, minKw: 100 };
      expect(connectorMatches(mockConnectors[0]!, filters)).toBe(false);
    });

    it("filters out non-available connector when availableOnly is true", () => {
      const filters: StationFilters = { ...defaultFilters, availableOnly: true };
      expect(connectorMatches(mockConnectors[0]!, filters)).toBe(true);
      expect(connectorMatches(mockConnectors[1]!, filters)).toBe(false);
    });
  });

  describe("filterStations", () => {
    it("returns all stations when default filters applied", () => {
      const result = filterStations([mockStation], defaultFilters);
      expect(result).toHaveLength(1);
    });

    it("filters out station if operator ID does not match", () => {
      const filters: StationFilters = { ...defaultFilters, operatorIds: ["other-op"] };
      expect(filterStations([mockStation], filters)).toHaveLength(0);
    });

    it("matches station when operator ID matches", () => {
      const filters: StationFilters = { ...defaultFilters, operatorIds: ["op1"] };
      expect(filterStations([mockStation], filters)).toHaveLength(1);
    });

    it("filters out station if no connectors match power requirement", () => {
      const filters: StationFilters = { ...defaultFilters, minKw: 150 };
      expect(filterStations([mockStation], filters)).toHaveLength(0);
    });
  });

  describe("distanceKm", () => {
    it("calculates distance between two coordinates accurately", () => {
      // Mumbai to Pune coordinates (~120km)
      const mumbai = { lat: 18.922, lng: 72.8346 };
      const pune = { lat: 18.5204, lng: 73.8567 };
      const dist = distanceKm(mumbai, pune);
      expect(dist).toBeGreaterThan(110);
      expect(dist).toBeLessThan(130);
    });

    it("returns 0 for identical points", () => {
      const pt = { lat: 28.6139, lng: 77.209 };
      expect(distanceKm(pt, pt)).toBe(0);
    });
  });
});
