import type { Operator, Station, Vehicle } from "./types";

const tataOperator: Operator = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Tata Power EZ Charge",
  logo_url: null,
};
const jioOperator: Operator = {
  id: "00000000-0000-0000-0000-000000000002",
  name: "Jio-bp pulse",
  logo_url: null,
};
const statiqOperator: Operator = {
  id: "00000000-0000-0000-0000-000000000003",
  name: "Statiq",
  logo_url: null,
};
const zeonOperator: Operator = {
  id: "00000000-0000-0000-0000-000000000004",
  name: "Zeon Charging",
  logo_url: null,
};
const glidaOperator: Operator = {
  id: "00000000-0000-0000-0000-000000000005",
  name: "GLIDA (Fortum)",
  logo_url: null,
};

export const SEED_OPERATORS: Operator[] = [
  tataOperator,
  jioOperator,
  statiqOperator,
  zeonOperator,
  glidaOperator,
];

import { VEHICLES } from "@/data/vehicles";

export const SEED_VEHICLES: Vehicle[] = VEHICLES;

export const SEED_STATIONS: Station[] = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    name: "Tata Power EZ Charge - Bandra West Hub",
    address: "174, Linking Road, Bandra West, Mumbai",
    city: "Mumbai",
    lat: 19.060002,
    lng: 72.836705,
    opening_hours: "24/7",
    amenities: ["cafe", "parking", "restroom"],
    operator: tataOperator,
    connectors: [
      { id: "c-1", type: "Type 2", power_kw: 22, price_per_kwh: 15.0, status: "available" },
      { id: "c-2", type: "CCS2", power_kw: 60, price_per_kwh: 21.0, status: "in_use" },
    ],
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    name: "Tata Power EZ Charge - Andheri Solitaire Park",
    address: "Solitaire Corporate Park, Andheri East, Mumbai",
    city: "Mumbai",
    lat: 19.117409,
    lng: 72.863245,
    opening_hours: "24/7",
    amenities: ["restroom", "cafe", "parking", "wifi"],
    operator: tataOperator,
    connectors: [
      { id: "c-3", type: "CCS2", power_kw: 150, price_per_kwh: 23.5, status: "available" },
      { id: "c-4", type: "CCS2", power_kw: 60, price_per_kwh: 21.0, status: "available" },
      { id: "c-5", type: "CCS2", power_kw: 50, price_per_kwh: 20.5, status: "in_use" },
    ],
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    name: "Jio-bp pulse - Powai Galleria Hub",
    address: "Galleria Shopping Mall, Hiranandani Gardens, Powai, Mumbai",
    city: "Mumbai",
    lat: 19.115229,
    lng: 72.901221,
    opening_hours: "24/7",
    amenities: ["restroom", "parking", "wifi", "cafe"],
    operator: jioOperator,
    connectors: [
      { id: "c-6", type: "CHAdeMO", power_kw: 25, price_per_kwh: 19.0, status: "available" },
      { id: "c-7", type: "CCS2", power_kw: 60, price_per_kwh: 21.5, status: "available" },
    ],
  },
  {
    id: "10000000-0000-0000-0000-000000000004",
    name: "Zeon Charging - Lower Parel Phoenix Palladium",
    address: "High Street Phoenix, Lower Parel, Mumbai",
    city: "Mumbai",
    lat: 18.998859,
    lng: 72.830041,
    opening_hours: "24/7",
    amenities: ["cafe", "parking", "wifi", "restroom"],
    operator: zeonOperator,
    connectors: [
      { id: "c-8", type: "CHAdeMO", power_kw: 25, price_per_kwh: 19.5, status: "available" },
      { id: "c-9", type: "Type 2", power_kw: 11, price_per_kwh: 14.0, status: "available" },
      { id: "c-10", type: "CCS2", power_kw: 60, price_per_kwh: 20.5, status: "available" },
    ],
  },
  {
    id: "10000000-0000-0000-0000-000000000005",
    name: "Jio-bp pulse - Worli Sea Face Station",
    address: "5, Khan Abdul Ghaffar Khan Road, Worli, Mumbai",
    city: "Mumbai",
    lat: 19.010454,
    lng: 72.817702,
    opening_hours: "24/7",
    amenities: ["parking", "restroom"],
    operator: jioOperator,
    connectors: [
      { id: "c-11", type: "CCS2", power_kw: 150, price_per_kwh: 23.0, status: "available" },
      { id: "c-12", type: "Type 2", power_kw: 22, price_per_kwh: 14.5, status: "available" },
    ],
  },
  {
    id: "10000000-0000-0000-0000-000000000011",
    name: "Statiq - Connaught Place Outer Circle",
    address: "Block E, Connaught Place, New Delhi",
    city: "Delhi",
    lat: 28.631645,
    lng: 77.2169,
    opening_hours: "24/7",
    amenities: ["restroom", "cafe", "wifi"],
    operator: statiqOperator,
    connectors: [
      { id: "c-13", type: "CCS2", power_kw: 60, price_per_kwh: 19.5, status: "available" },
      { id: "c-14", type: "Type 2", power_kw: 7.4, price_per_kwh: 13.5, status: "available" },
    ],
  },
  {
    id: "10000000-0000-0000-0000-000000000021",
    name: "Statiq - Koramangala Nexus Hub",
    address: "Nexus Koramangala Mall, 5th Block, Bengaluru",
    city: "Bengaluru",
    lat: 12.93519,
    lng: 77.624199,
    opening_hours: "24/7",
    amenities: ["restroom", "parking", "wifi", "cafe"],
    operator: statiqOperator,
    connectors: [
      { id: "c-15", type: "CCS2", power_kw: 120, price_per_kwh: 22.0, status: "available" },
      { id: "c-16", type: "Type 2", power_kw: 22, price_per_kwh: 14.0, status: "available" },
    ],
  },
  {
    id: "10000000-0000-0000-0000-000000000031",
    name: "GLIDA - Koregaon Park Plaza",
    address: "Plaza Center, North Main Road, Koregaon Park, Pune",
    city: "Pune",
    lat: 18.536743,
    lng: 73.893142,
    opening_hours: "24/7",
    amenities: ["restroom", "parking", "cafe"],
    operator: glidaOperator,
    connectors: [
      { id: "c-17", type: "CCS2", power_kw: 60, price_per_kwh: 20.0, status: "available" },
      { id: "c-18", type: "Type 2", power_kw: 11, price_per_kwh: 14.5, status: "available" },
    ],
  },
];
