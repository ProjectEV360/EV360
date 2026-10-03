export const CONNECTOR_TYPES = ["CCS2", "CHAdeMO", "Type 2", "GB/T", "Tesla/NACS"] as const;
export type ConnectorType = (typeof CONNECTOR_TYPES)[number];
export type ConnectorStatus = "available" | "in_use" | "offline";

export interface Operator {
  id: string;
  name: string;
  logo_url: string | null;
}

export interface Connector {
  id: string;
  type: string;
  power_kw: number;
  price_per_kwh: number;
  status: ConnectorStatus;
}

export interface Station {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  opening_hours: string | null;
  amenities: string[];
  operator: Operator;
  connectors: Connector[];
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  connector_types: string[];
  max_charge_kw: number;
}

export interface StationFilters {
  connectorTypes: string[];
  minKw: number;
  operatorIds: string[];
  availableOnly: boolean;
  vehicleId: string | null;
}

export const DEFAULT_FILTERS: StationFilters = {
  connectorTypes: [],
  minKw: 0,
  operatorIds: [],
  availableOnly: false,
  vehicleId: null,
};
