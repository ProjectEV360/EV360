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
  // Marketplace optional attributes
  is_home_charger?: boolean;
  home_charger_id?: string;
  host_id?: string;
  rating?: number;
  total_reviews?: number;
  address_approx?: string;
  pricing_type?: "per_kwh" | "per_session";
  price_rate?: number;
  instant_booking?: boolean;
  cancellation_policy?: string;
  host_name?: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  connector_types: string[];
  max_charge_kw: number;
  brand?: string;
  name?: string;
}

export interface StationFilters {
  connectorTypes: string[];
  minKw: number;
  operatorIds: string[];
  availableOnly: boolean;
  vehicleId: string | null;
  source?: "all" | "public" | "home";
}

export const DEFAULT_FILTERS: StationFilters = {
  connectorTypes: [],
  minKw: 0,
  operatorIds: [],
  availableOnly: false,
  vehicleId: null,
  source: "all",
};

export interface Profile {
  id: string;
  full_name: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  avatar_url?: string | null;
  vehicle_id: string | null;
  is_admin?: boolean;
  created_at?: string | null;
}

// ─── P2P Home Charging Marketplace Types ──────────────────────────────────────

export type MerchantStatus = "pending_approval" | "approved" | "rejected" | "suspended";

export interface MerchantProfile {
  id: string; // matches auth.users.id
  full_name: string;
  phone: string;
  email: string;
  id_document_type: string;
  id_document_number: string;
  property_type: "individual_house" | "apartment" | "villa" | "commercial_residential";
  electricity_tariff_declared: boolean;
  status: MerchantStatus;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  upi_id?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ChargerStatus = "pending_approval" | "active" | "inactive" | "rejected" | "suspended";

export interface HomeCharger {
  id: string;
  host_id: string;
  title: string;
  description: string;
  charger_brand: string;
  charger_model?: string;
  current_type: "AC" | "DC";
  connector_type: ConnectorType | string;
  power_kw: number;
  pricing_type: "per_kwh" | "per_session";
  price_rate: number; // in INR
  address_full: string; // private: only revealed after confirmed booking
  address_approx: string; // public approximate area/neighborhood
  city: string;
  lat: number; // exact coordinates
  lng: number; // exact coordinates
  approx_lat: number; // approximate coordinates (for public map view)
  approx_lng: number; // approximate coordinates (for public map view)
  access_instructions?: string; // private: host instructions revealed after payment
  photos: string[];
  amenities: string[];
  available_days: string[];
  start_time: string; // e.g. "08:00"
  end_time: string; // e.g. "22:00"
  instant_booking: boolean;
  cancellation_policy: string;
  status: ChargerStatus;
  rating: number;
  total_reviews: number;
  host_name?: string;
  host_phone?: string;
  created_at?: string;
}

export interface ChargerBlockedSlot {
  id: string;
  charger_id: string;
  start_time: string;
  end_time: string;
  reason?: string;
  created_at?: string;
}

export type BookingStatus =
  "pending_payment" | "confirmed" | "in_progress" | "completed" | "cancelled" | "refunded";

export interface MarketplaceBooking {
  id: string;
  booking_ref: string; // human-readable, e.g. EVB-9481
  charger_id: string;
  host_id: string;
  user_id: string;
  start_time: string; // ISO string
  end_time: string; // ISO string
  target_kwh?: number;
  duration_hours: number;
  status: BookingStatus;
  subtotal_amount: number; // in rupees
  platform_commission_rate: number; // e.g. 0.10
  platform_commission_amount: number; // in rupees
  merchant_earnings: number; // in rupees
  total_amount: number; // in rupees (customer paid)
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  cancellation_reason?: string;
  cancelled_by?: "user" | "host" | "admin";
  refund_amount?: number;
  access_revealed: boolean;
  created_at: string;
  // Joined details for UI convenience
  charger?: HomeCharger;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
}

export type PayoutStatus = "requested" | "processing" | "completed" | "rejected";

export interface MarketplacePayout {
  id: string;
  host_id: string;
  amount: number; // in rupees
  status: PayoutStatus;
  requested_at: string;
  processed_at?: string | null;
  payout_method: string;
  reference_id?: string | null;
  admin_notes?: string | null;
}

export interface MarketplaceReview {
  id: string;
  booking_id: string;
  charger_id: string;
  user_id: string;
  user_name?: string;
  rating: number; // 1-5
  comment: string;
  created_at: string;
}

export interface MarketplaceSettings {
  platform_commission_percent: number;
  min_payout_inr: number;
  marketplace_enabled: boolean;
}
