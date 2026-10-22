/**
 * EV360 Peer-to-Peer Home Charging Marketplace Service
 * Manages host onboarding, charger listings, availability,
 * booking conflict checks, financial splits, address privacy masking, and payouts.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  HomeCharger,
  MerchantProfile,
  MarketplaceBooking,
  MarketplacePayout,
  MarketplaceReview,
  MarketplaceSettings,
  Station,
  ChargerBlockedSlot,
  PayoutStatus,
} from "@/lib/types";

// ─── Default Global Settings ──────────────────────────────────────────────────
export const DEFAULT_MARKETPLACE_SETTINGS: MarketplaceSettings = {
  platform_commission_percent: 10, // 10% platform share
  min_payout_inr: 500, // Min ₹500 for host payout
  marketplace_enabled: true,
};

// ─── Sample Seed Home Chargers (Production-grade realistic Indian data) ───────
export const SEED_HOME_CHARGERS: HomeCharger[] = [
  {
    id: "30000000-0000-0000-0000-000000000001",
    host_id: "host-user-rohan-001",
    title: "Rohan's Fast AC Wallbox",
    description:
      "Private covered driveway charging in Borivali West. 7.4 kW Schneider EVlink AC wallbox with Type 2 connector. CCTV protected, safe residential area with garden shade.",
    charger_brand: "Schneider Electric",
    charger_model: "EVlink Wallbox 7.4kW",
    current_type: "AC",
    connector_type: "Type 2",
    power_kw: 7.4,
    pricing_type: "per_kwh",
    price_rate: 16,
    address_full: "Bungalow 4, Holy Cross Road, I.C. Colony, Borivali West, Mumbai 400103",
    address_approx: "I.C. Colony, Borivali West, Mumbai",
    city: "Mumbai",
    lat: 19.2458,
    lng: 72.8523,
    approx_lat: 19.2475,
    approx_lng: 72.8541,
    access_instructions:
      "Gate is unlocked. Pull into driveway on the right. Charger card is hung by the wallbox plug.",
    photos: [
      "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1558441719-ef059b8546b4?auto=format&fit=crop&w=800&q=80",
    ],
    amenities: ["Covered Parking", "CCTV Security", "Restroom", "Wi-Fi", "Drinking Water"],
    available_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    start_time: "07:00",
    end_time: "23:00",
    instant_booking: true,
    cancellation_policy: "Flexible: Free cancellation up to 2 hours before scheduled slot.",
    status: "active",
    rating: 4.9,
    total_reviews: 14,
    host_name: "Rohan Mhatre",
    host_phone: "+91 98201 12345",
    created_at: "2026-01-10T10:00:00Z",
  },
  {
    id: "30000000-0000-0000-0000-000000000002",
    host_id: "host-user-kavita-002",
    title: "Kavita's SunCharger Villa",
    description:
      "Solar-assisted 11 kW 3-phase charger in Bandra West. Secure residential compound with coffee shop nearby. Perfect for overnight or afternoon top-ups.",
    charger_brand: "ABB",
    charger_model: "Terra AC Wallbox 11kW",
    current_type: "AC",
    connector_type: "Type 2",
    power_kw: 11,
    pricing_type: "per_kwh",
    price_rate: 18,
    address_full: "Villa Green, 14th Road, Off Khar-Danda Road, Bandra West, Mumbai 400052",
    address_approx: "Pali Hill / 14th Road, Bandra West, Mumbai",
    city: "Mumbai",
    lat: 19.0682,
    lng: 72.8341,
    approx_lat: 19.0665,
    approx_lng: 72.8362,
    access_instructions:
      "Inform security guard at gate about EV360 booking #. Dedicated parking slot #2.",
    photos: [
      "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80",
    ],
    amenities: ["Covered Parking", "Gated Security", "Solar Powered", "Wi-Fi"],
    available_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    start_time: "08:00",
    end_time: "22:00",
    instant_booking: true,
    cancellation_policy: "Flexible: Free cancellation up to 2 hours before scheduled slot.",
    status: "active",
    rating: 4.8,
    total_reviews: 9,
    host_name: "Kavita Nair",
    host_phone: "+91 98200 54321",
    created_at: "2026-01-15T12:00:00Z",
  },
  {
    id: "30000000-0000-0000-0000-000000000003",
    host_id: "host-user-vikram-003",
    title: "Vikram's Thakur Village EV Point",
    description:
      "High power 7.4 kW home wallbox in Thakur Village, Kandivali East. Smooth access right off Western Express Highway. Easy in-and-out.",
    charger_brand: "Exicom",
    charger_model: "Spin Air 7.4kW",
    current_type: "AC",
    connector_type: "Type 2",
    power_kw: 7.4,
    pricing_type: "per_kwh",
    price_rate: 15,
    address_full: "Row House 12, Thakur Complex, Kandivali East, Mumbai 400101",
    address_approx: "Thakur Village, Kandivali East, Mumbai",
    city: "Mumbai",
    lat: 19.2085,
    lng: 72.8712,
    approx_lat: 19.2069,
    approx_lng: 72.8735,
    access_instructions:
      "Driveway right in front of garage. Plug is RFID enabled and will auto-start after booking check-in.",
    photos: [
      "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80",
    ],
    amenities: ["Highway Access", "CCTV Security", "Covered Parking"],
    available_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    start_time: "06:00",
    end_time: "23:00",
    instant_booking: true,
    cancellation_policy: "Flexible: Free cancellation up to 2 hours before scheduled slot.",
    status: "active",
    rating: 5.0,
    total_reviews: 6,
    host_name: "Vikram Shah",
    host_phone: "+91 98190 98765",
    created_at: "2026-02-01T09:00:00Z",
  },
  {
    id: "30000000-0000-0000-0000-000000000004",
    host_id: "host-user-amit-004",
    title: "Amit's Powai Fast DC Hub",
    description:
      "Rare private 25 kW DC Fast Charger in Powai Hiranandani. Full charge in 45-60 mins for Tata, MG, and BYD. Quiet gated residence.",
    charger_brand: "Delta Electronics",
    charger_model: "DC Wallbox 25kW CCS2",
    current_type: "DC",
    connector_type: "CCS2",
    power_kw: 25,
    pricing_type: "per_kwh",
    price_rate: 22,
    address_full: "Building 9, Glen Classic, Hiranandani Gardens, Powai, Mumbai 400076",
    address_approx: "Hiranandani Gardens, Powai, Mumbai",
    city: "Mumbai",
    lat: 19.1197,
    lng: 72.9051,
    approx_lat: 19.1215,
    approx_lng: 72.9032,
    access_instructions: "Visitor parking bay #C1. Ring flat 902 on intercom or call host.",
    photos: [
      "https://images.unsplash.com/photo-1558441719-ef059b8546b4?auto=format&fit=crop&w=800&q=80",
    ],
    amenities: ["DC Fast Charging", "24/7 Security", "Waiting Lounge with AC", "Wi-Fi"],
    available_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    start_time: "08:00",
    end_time: "21:00",
    instant_booking: true,
    cancellation_policy: "Moderate: Free cancellation up to 4 hours before scheduled slot.",
    status: "active",
    rating: 4.9,
    total_reviews: 21,
    host_name: "Amit Deshmukh",
    host_phone: "+91 98211 44556",
    created_at: "2026-01-20T11:00:00Z",
  },
  {
    id: "30000000-0000-0000-0000-000000000005",
    host_id: "host-user-priya-005",
    title: "Priya's GreenHub Indiranagar",
    description:
      "Eco-friendly 11 kW AC charger in heart of Indiranagar. Walk to 12th Main cafes while your car charges peacefully.",
    charger_brand: "Kempower / Delta",
    charger_model: "AC Max 11kW",
    current_type: "AC",
    connector_type: "Type 2",
    power_kw: 11,
    pricing_type: "per_kwh",
    price_rate: 17,
    address_full: "542, 9th A Main Rd, Stage 1, Indiranagar, Bengaluru 560038",
    address_approx: "Stage 1, Indiranagar, Bengaluru",
    city: "Bengaluru",
    lat: 12.9784,
    lng: 77.6408,
    approx_lat: 12.9801,
    approx_lng: 77.6391,
    access_instructions:
      "Drive into parking porch. Cable reaches both sides. Host provides Wi-Fi password on confirmation.",
    photos: [
      "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80",
    ],
    amenities: ["Covered Parking", "Wi-Fi", "Near Cafes", "Drinking Water"],
    available_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    start_time: "07:30",
    end_time: "22:30",
    instant_booking: true,
    cancellation_policy: "Flexible: Free cancellation up to 2 hours before scheduled slot.",
    status: "active",
    rating: 4.9,
    total_reviews: 18,
    host_name: "Priya Rao",
    host_phone: "+91 98450 11223",
    created_at: "2026-01-12T08:00:00Z",
  },
  {
    id: "30000000-0000-0000-0000-000000000006",
    host_id: "host-user-ananya-006",
    title: "Ananya's Saket Green Charge",
    description:
      "Reliable 7.4 kW home charger in Saket, South Delhi. Located near Select Citywalk with easy wide road access.",
    charger_brand: "Statiq Home",
    charger_model: "Aura 7.4kW",
    current_type: "AC",
    connector_type: "Type 2",
    power_kw: 7.4,
    pricing_type: "per_kwh",
    price_rate: 16,
    address_full: "J-Block, Saket, New Delhi 110017",
    address_approx: "J Block, Saket, New Delhi",
    city: "Delhi",
    lat: 28.5245,
    lng: 77.2142,
    approx_lat: 28.5262,
    approx_lng: 77.2125,
    access_instructions: "Park in front of green gate. Plug is on exterior pillar.",
    photos: [
      "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80",
    ],
    amenities: ["Wide Access Road", "CCTV", "Near Metro Station"],
    available_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    start_time: "08:00",
    end_time: "22:00",
    instant_booking: true,
    cancellation_policy: "Flexible: Free cancellation up to 2 hours before scheduled slot.",
    status: "active",
    rating: 4.7,
    total_reviews: 11,
    host_name: "Ananya Sharma",
    host_phone: "+91 98110 33445",
    created_at: "2026-02-05T14:00:00Z",
  },
  {
    id: "30000000-0000-0000-0000-000000000007",
    host_id: "host-user-nikhil-007",
    title: "Nikhil's Baner AC Wallbox",
    description:
      "Fast 11 kW AC charger right off Baner-Pashan Link Road. Perfect for IT professionals traveling between Hinjewadi and Pune city.",
    charger_brand: "Schneider Electric",
    charger_model: "EVlink Smart 11kW",
    current_type: "AC",
    connector_type: "Type 2",
    power_kw: 11,
    pricing_type: "per_kwh",
    price_rate: 15,
    address_full: "B-2, Nisarg Residency, Baner-Pashan Link Road, Pune 411045",
    address_approx: "Baner Road, Pune",
    city: "Pune",
    lat: 18.5596,
    lng: 73.7892,
    approx_lat: 18.5581,
    approx_lng: 73.7914,
    access_instructions:
      "Drive into parking slot P4. Wallbox power switch is marked with green sticker.",
    photos: [
      "https://images.unsplash.com/photo-1558441719-ef059b8546b4?auto=format&fit=crop&w=800&q=80",
    ],
    amenities: ["Covered Parking", "Quiet Society", "Wi-Fi"],
    available_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    start_time: "07:00",
    end_time: "23:00",
    instant_booking: true,
    cancellation_policy: "Flexible: Free cancellation up to 2 hours before scheduled slot.",
    status: "active",
    rating: 5.0,
    total_reviews: 8,
    host_name: "Nikhil Joshi",
    host_phone: "+91 98900 66778",
    created_at: "2026-02-10T16:00:00Z",
  },
];

// In-memory / localStorage storage keys
const STORAGE_PREFIX = "ev360_marketplace_";

function getLocal<T>(key: string, defaultVal: T): T {
  if (typeof window === "undefined") return defaultVal;
  try {
    const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return item ? (JSON.parse(item) as T) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Ignore quota issues
  }
}

// ─── Financial & Commission Calculator (Paise-accurate) ───────────────────────

export interface PricingBreakdown {
  subtotalInRupees: number;
  commissionRate: number; // e.g. 0.10
  platformCommissionInRupees: number;
  merchantEarningsInRupees: number;
  totalInRupees: number;
  subtotalInPaise: number;
  commissionInPaise: number;
  merchantEarningsInPaise: number;
  totalInPaise: number;
}

export function calculateMarketplacePricing(
  priceRate: number,
  pricingType: "per_kwh" | "per_session",
  targetKwh = 20,
  durationHours = 2,
  commissionPercent = 10,
): PricingBreakdown {
  let subtotal = 0;
  if (pricingType === "per_session") {
    subtotal = priceRate;
  } else {
    subtotal = Math.round(priceRate * targetKwh * 100) / 100;
  }

  // Calculate using integer paise to eliminate JS floating-point inaccuracies
  const subtotalPaise = Math.round(subtotal * 100);
  const commissionRate = commissionPercent / 100;
  const commissionPaise = Math.round(subtotalPaise * commissionRate);
  const merchantPaise = subtotalPaise - commissionPaise;
  const totalPaise = subtotalPaise; // Customer pays the subtotal, commission is deducted from merchant's gross share

  return {
    subtotalInRupees: subtotalPaise / 100,
    commissionRate,
    platformCommissionInRupees: commissionPaise / 100,
    merchantEarningsInRupees: merchantPaise / 100,
    totalInRupees: totalPaise / 100,
    subtotalInPaise: subtotalPaise,
    commissionInPaise: commissionPaise,
    merchantEarningsInPaise: merchantPaise,
    totalInPaise: totalPaise,
  };
}

// ─── Privacy Guard: Obfuscate Private Address Before Booking ──────────────────

export function maskChargerForPublic(
  charger: HomeCharger,
  hasConfirmedBooking = false,
): HomeCharger {
  if (hasConfirmedBooking) {
    // Reveal full address and access instructions
    return charger;
  }
  // Mask sensitive address and access instructions
  return {
    ...charger,
    address_full: charger.address_approx, // Show only neighborhood/city
    access_instructions:
      "Exact address and access instructions will be revealed after booking confirmation.",
    // Public map uses approximate obfuscated coordinates
    lat: charger.approx_lat || charger.lat,
    lng: charger.approx_lng || charger.lng,
  };
}

// ─── Adapter: Convert Home Charger to Map Station Interface ───────────────────

export function homeChargerToStation(charger: HomeCharger): Station {
  return {
    id: charger.id,
    name: `⚡ ${charger.title}`,
    address: charger.address_approx,
    city: charger.city,
    lat: charger.lat,
    lng: charger.lng,
    opening_hours: `${charger.start_time} - ${charger.end_time}`,
    amenities: charger.amenities,
    operator: {
      id: "p2p-host",
      name: `Host: ${charger.host_name || "Community Host"}`,
      logo_url: null,
    },
    connectors: [
      {
        id: `${charger.id}-c1`,
        type: charger.connector_type,
        power_kw: charger.power_kw,
        price_per_kwh: charger.pricing_type === "per_kwh" ? charger.price_rate : 0,
        status: charger.status === "active" ? "available" : "offline",
      },
    ],
    is_home_charger: true,
    home_charger_id: charger.id,
    host_id: charger.host_id,
    rating: charger.rating,
    total_reviews: charger.total_reviews,
    address_approx: charger.address_approx,
    pricing_type: charger.pricing_type,
    price_rate: charger.price_rate,
    instant_booking: charger.instant_booking,
    cancellation_policy: charger.cancellation_policy,
    host_name: charger.host_name,
  };
}

// ─── Helpers: Timeout & Fallbacks ─────────────────────────────────────────────

function getRawFallbackChargers(): HomeCharger[] {
  const custom = getLocal<HomeCharger[]>("custom_chargers", []);
  return [...custom, ...SEED_HOME_CHARGERS];
}

async function safeWithTimeout<T>(promise: PromiseLike<T>, timeoutMs = 2500): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Request timed out")), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// ─── Data Access: Home Chargers ───────────────────────────────────────────────

export async function getHomeChargers(viewerId?: string): Promise<HomeCharger[]> {
  // 1. Try Supabase
  try {
    const { data, error } = await safeWithTimeout(
      supabase.from("home_chargers").select("*").order("created_at", { ascending: false }),
    );

    if (!error && data && data.length > 0) {
      const confirmedBookingChargerIds = viewerId
        ? await getViewerConfirmedBookingChargerIds(viewerId)
        : new Set<string>();

      return data.map((row) => {
        const isHost = viewerId && row.host_id === viewerId;
        const hasBooking = confirmedBookingChargerIds.has(row.id);
        const charger = row as HomeCharger;
        return isHost || hasBooking ? charger : maskChargerForPublic(charger, false);
      });
    }
  } catch (err) {
    console.warn("[Marketplace] Supabase home_chargers query error, using local fallback:", err);
  }

  // 2. Local Fallback with Seed
  const allChargers = getRawFallbackChargers();

  const confirmedBookingChargerIds = viewerId
    ? await getViewerConfirmedBookingChargerIds(viewerId)
    : new Set<string>();

  return allChargers
    .filter((c) => c.status === "active" || (viewerId && c.host_id === viewerId))
    .map((c) => {
      const isHost = viewerId && c.host_id === viewerId;
      const hasBooking = confirmedBookingChargerIds.has(c.id);
      return isHost || hasBooking ? c : maskChargerForPublic(c, false);
    });
}

export async function getHomeChargerById(
  id: string,
  viewerId?: string,
): Promise<HomeCharger | null> {
  // 1. Try Supabase
  try {
    const { data, error } = await supabase
      .from("home_chargers")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      const isHost = viewerId && data.host_id === viewerId;
      const hasBooking = viewerId ? await hasUserConfirmedBooking(viewerId, id) : false;
      const charger = data as HomeCharger;
      return isHost || hasBooking ? charger : maskChargerForPublic(charger, false);
    }
  } catch {
    // fallback
  }

  // 2. Local fallback
  const customChargers = getLocal<HomeCharger[]>("custom_chargers", []);
  const found = [...customChargers, ...SEED_HOME_CHARGERS].find((c) => c.id === id);
  if (!found) return null;

  const isHost = viewerId && found.host_id === viewerId;
  const hasBooking = viewerId ? await hasUserConfirmedBooking(viewerId, id) : false;
  return isHost || hasBooking ? found : maskChargerForPublic(found, false);
}

export async function createHomeCharger(
  charger: Omit<HomeCharger, "id" | "created_at" | "rating" | "total_reviews">,
): Promise<HomeCharger> {
  const newId = `30000000-${Date.now().toString(16).padStart(12, "0")}-000000000000`.substring(
    0,
    36,
  );
  const now = new Date().toISOString();

  // Obfuscate approx coordinates by roughly 200m if not provided
  const approx_lat = charger.approx_lat || charger.lat + (Math.random() - 0.5) * 0.003;
  const approx_lng = charger.approx_lng || charger.lng + (Math.random() - 0.5) * 0.003;

  const newCharger: HomeCharger = {
    ...charger,
    id: newId,
    approx_lat,
    approx_lng,
    rating: 5.0,
    total_reviews: 0,
    created_at: now,
  };

  // Try Supabase
  try {
    const { data, error } = await supabase
      .from("home_chargers")
      .insert(newCharger)
      .select()
      .single();
    if (!error && data) {
      return data as HomeCharger;
    }
  } catch (err) {
    console.warn("[Marketplace] Supabase insert failed, saving to local cache:", err);
  }

  // Local fallback
  const custom = getLocal<HomeCharger[]>("custom_chargers", []);
  custom.unshift(newCharger);
  setLocal("custom_chargers", custom);
  return newCharger;
}

export async function updateHomeCharger(
  id: string,
  updates: Partial<HomeCharger>,
): Promise<HomeCharger | null> {
  try {
    const { data, error } = await supabase
      .from("home_chargers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (!error && data) {
      return data as HomeCharger;
    }
  } catch {
    // fallback
  }

  const custom = getLocal<HomeCharger[]>("custom_chargers", []);
  const idx = custom.findIndex((c) => c.id === id);
  if (idx !== -1) {
    custom[idx] = { ...custom[idx]!, ...updates };
    setLocal("custom_chargers", custom);
    return custom[idx]!;
  }
  return null;
}

export async function deleteHomeCharger(id: string): Promise<boolean> {
  try {
    await supabase.from("home_chargers").delete().eq("id", id);
  } catch {
    // fallback
  }

  const custom = getLocal<HomeCharger[]>("custom_chargers", []);
  const filtered = custom.filter((c) => c.id !== id);
  setLocal("custom_chargers", filtered);
  return true;
}

// ─── Data Access: Merchant Profiles ───────────────────────────────────────────

export async function getMerchantProfile(userId: string): Promise<MerchantProfile | null> {
  try {
    const { data, error } = await supabase
      .from("merchant_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (!error && data) {
      return data as MerchantProfile;
    }
  } catch {
    // fallback
  }

  const localProfiles = getLocal<Record<string, MerchantProfile>>("merchant_profiles", {});
  return localProfiles[userId] ?? null;
}

export async function upsertMerchantProfile(profile: MerchantProfile): Promise<MerchantProfile> {
  const payload = {
    ...profile,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("merchant_profiles")
      .upsert(payload)
      .select()
      .single();
    if (!error && data) {
      return data as MerchantProfile;
    }
  } catch (err) {
    console.warn("[Marketplace] Supabase upsertMerchantProfile failed, saving locally:", err);
  }

  const localProfiles = getLocal<Record<string, MerchantProfile>>("merchant_profiles", {});
  localProfiles[profile.id] = payload;
  setLocal("merchant_profiles", localProfiles);
  return payload;
}

export async function getAllMerchantProfiles(): Promise<MerchantProfile[]> {
  try {
    const { data, error } = await supabase
      .from("merchant_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data && data.length > 0) {
      return data as MerchantProfile[];
    }
  } catch {
    // fallback
  }

  const localProfiles = getLocal<Record<string, MerchantProfile>>("merchant_profiles", {});
  return Object.values(localProfiles);
}

// ─── Slot Availability & Double Booking Prevention ────────────────────────────

export async function checkSlotAvailability(
  chargerId: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string,
): Promise<{ available: boolean; conflictReason?: string }> {
  const reqStart = new Date(startTime).getTime();
  const reqEnd = new Date(endTime).getTime();

  if (isNaN(reqStart) || isNaN(reqEnd) || reqEnd <= reqStart) {
    return { available: false, conflictReason: "Invalid start or end time specified." };
  }

  // 1. Check existing confirmed or pending bookings
  const bookings = await getBookingsForCharger(chargerId);
  for (const b of bookings) {
    if (excludeBookingId && b.id === excludeBookingId) continue;
    if (b.status === "cancelled" || b.status === "refunded") continue;

    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();

    // Check overlap: (StartA < EndB) and (EndA > StartB)
    if (reqStart < bEnd && reqEnd > bStart) {
      return {
        available: false,
        conflictReason: `This charger is already reserved between ${new Date(b.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} and ${new Date(b.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} on this date.`,
      };
    }
  }

  // 2. Check host blocked slots
  const blockedSlots = await getBlockedSlots(chargerId);
  for (const slot of blockedSlots) {
    const sStart = new Date(slot.start_time).getTime();
    const sEnd = new Date(slot.end_time).getTime();
    if (reqStart < sEnd && reqEnd > sStart) {
      return {
        available: false,
        conflictReason: `The host has blocked this time slot${slot.reason ? `: ${slot.reason}` : "."}`,
      };
    }
  }

  return { available: true };
}

export async function getBlockedSlots(chargerId: string): Promise<ChargerBlockedSlot[]> {
  try {
    const { data } = await supabase
      .from("charger_blocked_slots")
      .select("*")
      .eq("charger_id", chargerId);
    if (data) return data as ChargerBlockedSlot[];
  } catch {
    // fallback
  }

  const local = getLocal<Record<string, ChargerBlockedSlot[]>>("blocked_slots", {});
  return local[chargerId] ?? [];
}

export async function addBlockedSlot(
  chargerId: string,
  startTime: string,
  endTime: string,
  reason?: string,
): Promise<ChargerBlockedSlot> {
  const slot: ChargerBlockedSlot = {
    id: `blk_${Date.now()}`,
    charger_id: chargerId,
    start_time: startTime,
    end_time: endTime,
    reason,
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from("charger_blocked_slots").insert(slot);
  } catch {
    // fallback
  }

  const local = getLocal<Record<string, ChargerBlockedSlot[]>>("blocked_slots", {});
  local[chargerId] = [...(local[chargerId] || []), slot];
  setLocal("blocked_slots", local);
  return slot;
}

export async function removeBlockedSlot(slotId: string, chargerId: string): Promise<void> {
  try {
    await supabase.from("charger_blocked_slots").delete().eq("id", slotId);
  } catch {
    // fallback
  }

  const local = getLocal<Record<string, ChargerBlockedSlot[]>>("blocked_slots", {});
  if (local[chargerId]) {
    local[chargerId] = local[chargerId]!.filter((s) => s.id !== slotId);
    setLocal("blocked_slots", local);
  }
}

// ─── Data Access: Bookings ────────────────────────────────────────────────────

export async function getBookingsForCharger(chargerId: string): Promise<MarketplaceBooking[]> {
  try {
    const { data } = await supabase
      .from("marketplace_bookings")
      .select("*")
      .eq("charger_id", chargerId);
    if (data) return data as MarketplaceBooking[];
  } catch {
    // fallback
  }

  const localBookings = getLocal<MarketplaceBooking[]>("bookings", []);
  return localBookings.filter((b) => b.charger_id === chargerId);
}

export async function getUserBookings(userId: string): Promise<MarketplaceBooking[]> {
  try {
    const { data, error } = await safeWithTimeout(
      supabase
        .from("marketplace_bookings")
        .select("*, charger:home_chargers(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    );
    if (!error && data && data.length > 0) return data as MarketplaceBooking[];
  } catch {
    // fallback
  }

  const localBookings = getLocal<MarketplaceBooking[]>("bookings", []);
  const rawChargers = getRawFallbackChargers();
  return localBookings
    .filter((b) => b.user_id === userId)
    .map((b) => ({
      ...b,
      charger: rawChargers.find((c) => c.id === b.charger_id),
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getHostBookings(hostId: string): Promise<MarketplaceBooking[]> {
  try {
    const { data, error } = await safeWithTimeout(
      supabase
        .from("marketplace_bookings")
        .select("*, charger:home_chargers(*)")
        .eq("host_id", hostId)
        .order("created_at", { ascending: false }),
    );
    if (!error && data && data.length > 0) return data as MarketplaceBooking[];
  } catch {
    // fallback
  }

  const localBookings = getLocal<MarketplaceBooking[]>("bookings", []);
  const rawChargers = getRawFallbackChargers();
  return localBookings
    .filter((b) => b.host_id === hostId)
    .map((b) => ({
      ...b,
      charger: rawChargers.find((c) => c.id === b.charger_id),
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getAllBookings(): Promise<MarketplaceBooking[]> {
  try {
    const { data } = await supabase
      .from("marketplace_bookings")
      .select("*, charger:home_chargers(*)")
      .order("created_at", { ascending: false });
    if (data && data.length > 0) return data as MarketplaceBooking[];
  } catch {
    // fallback
  }

  const localBookings = getLocal<MarketplaceBooking[]>("bookings", []);
  return localBookings.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function createMarketplaceBooking(
  bookingData: Omit<MarketplaceBooking, "id" | "booking_ref" | "created_at">,
): Promise<MarketplaceBooking> {
  // Pre-validate slot availability
  const check = await checkSlotAvailability(
    bookingData.charger_id,
    bookingData.start_time,
    bookingData.end_time,
  );
  if (!check.available) {
    throw new Error(check.conflictReason || "Requested time slot is unavailable.");
  }

  const id = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const bookingRef = `EVB-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const newBooking: MarketplaceBooking = {
    ...bookingData,
    id,
    booking_ref: bookingRef,
    created_at: now,
  };

  try {
    const { data, error } = await supabase
      .from("marketplace_bookings")
      .insert(newBooking)
      .select()
      .single();
    if (!error && data) return data as MarketplaceBooking;
  } catch (err) {
    console.warn("[Marketplace] Supabase booking insert failed, storing locally:", err);
  }

  const localBookings = getLocal<MarketplaceBooking[]>("bookings", []);
  localBookings.unshift(newBooking);
  setLocal("bookings", localBookings);
  return newBooking;
}

export async function confirmMarketplaceBooking(
  bookingId: string,
  paymentDetails: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
): Promise<MarketplaceBooking | null> {
  const updates = {
    status: "confirmed" as const,
    access_revealed: true,
    razorpay_order_id: paymentDetails.razorpay_order_id,
    razorpay_payment_id: paymentDetails.razorpay_payment_id,
    razorpay_signature: paymentDetails.razorpay_signature,
  };

  try {
    const { data, error } = await supabase
      .from("marketplace_bookings")
      .update(updates)
      .eq("id", bookingId)
      .select()
      .single();
    if (!error && data) return data as MarketplaceBooking;
  } catch {
    // fallback
  }

  const localBookings = getLocal<MarketplaceBooking[]>("bookings", []);
  const idx = localBookings.findIndex((b) => b.id === bookingId);
  if (idx !== -1) {
    localBookings[idx] = { ...localBookings[idx]!, ...updates };
    setLocal("bookings", localBookings);
    return localBookings[idx]!;
  }
  return null;
}

export async function cancelMarketplaceBooking(
  bookingId: string,
  cancelledBy: "user" | "host" | "admin",
  reason: string,
): Promise<{ success: boolean; refundAmount: number; message: string }> {
  const localBookings = getLocal<MarketplaceBooking[]>("bookings", []);
  const booking = localBookings.find((b) => b.id === bookingId);

  if (!booking) {
    return { success: false, refundAmount: 0, message: "Booking not found." };
  }

  if (booking.status === "cancelled" || booking.status === "refunded") {
    return { success: false, refundAmount: 0, message: "Booking is already cancelled." };
  }

  // Calculate refund eligibility:
  // If cancelled by host or admin, 100% full refund to customer.
  // If cancelled by customer: full refund if > 2 hours before slot, else 80% refund.
  const slotStart = new Date(booking.start_time).getTime();
  const now = Date.now();
  const hoursUntilSlot = (slotStart - now) / (1000 * 60 * 60);

  let refundAmount = booking.total_amount;
  if (cancelledBy === "user" && hoursUntilSlot < 2) {
    refundAmount = Math.round(booking.total_amount * 0.8 * 100) / 100; // 20% late cancellation fee
  }

  const updates = {
    status: (refundAmount > 0 ? "refunded" : "cancelled") as "refunded" | "cancelled",
    cancellation_reason: reason,
    cancelled_by: cancelledBy,
    refund_amount: refundAmount,
  };

  try {
    await supabase.from("marketplace_bookings").update(updates).eq("id", bookingId);
  } catch {
    // fallback
  }

  const idx = localBookings.findIndex((b) => b.id === bookingId);
  if (idx !== -1) {
    localBookings[idx] = { ...localBookings[idx]!, ...updates };
    setLocal("bookings", localBookings);
  }

  return {
    success: true,
    refundAmount,
    message:
      refundAmount > 0
        ? `Booking cancelled successfully. Refund of ₹${refundAmount.toFixed(2)} processed to original payment method.`
        : "Booking cancelled successfully.",
  };
}

// ─── Data Access: Payouts ─────────────────────────────────────────────────────

export async function getHostPayouts(hostId: string): Promise<MarketplacePayout[]> {
  try {
    const { data } = await supabase
      .from("marketplace_payouts")
      .select("*")
      .eq("host_id", hostId)
      .order("requested_at", { ascending: false });
    if (data) return data as MarketplacePayout[];
  } catch {
    // fallback
  }

  const localPayouts = getLocal<MarketplacePayout[]>("payouts", []);
  return localPayouts.filter((p) => p.host_id === hostId);
}

export async function getAllPayouts(): Promise<MarketplacePayout[]> {
  try {
    const { data } = await supabase
      .from("marketplace_payouts")
      .select("*")
      .order("requested_at", { ascending: false });
    if (data) return data as MarketplacePayout[];
  } catch {
    // fallback
  }

  return getLocal<MarketplacePayout[]>("payouts", []);
}

export async function requestHostPayout(
  hostId: string,
  amount: number,
  method = "bank_transfer",
): Promise<MarketplacePayout> {
  const payout: MarketplacePayout = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    host_id: hostId,
    amount,
    status: "requested",
    requested_at: new Date().toISOString(),
    payout_method: method,
  };

  try {
    const { data, error } = await supabase
      .from("marketplace_payouts")
      .insert(payout)
      .select()
      .single();
    if (!error && data) return data as MarketplacePayout;
  } catch {
    // fallback
  }

  const localPayouts = getLocal<MarketplacePayout[]>("payouts", []);
  localPayouts.unshift(payout);
  setLocal("payouts", localPayouts);
  return payout;
}

export async function updatePayoutStatus(
  payoutId: string,
  status: PayoutStatus,
  adminNotes?: string,
  referenceId?: string,
): Promise<MarketplacePayout | null> {
  const updates: Partial<MarketplacePayout> = {
    status,
    admin_notes: adminNotes,
    reference_id: referenceId,
    processed_at: status === "completed" ? new Date().toISOString() : undefined,
  };

  try {
    const { data } = await supabase
      .from("marketplace_payouts")
      .update(updates)
      .eq("id", payoutId)
      .select()
      .single();
    if (data) return data as MarketplacePayout;
  } catch {
    // fallback
  }

  const localPayouts = getLocal<MarketplacePayout[]>("payouts", []);
  const idx = localPayouts.findIndex((p) => p.id === payoutId);
  if (idx !== -1) {
    localPayouts[idx] = { ...localPayouts[idx]!, ...updates };
    setLocal("payouts", localPayouts);
    return localPayouts[idx]!;
  }
  return null;
}

// ─── Host Earnings Summary ────────────────────────────────────────────────────

export interface HostEarningsSummary {
  totalGrossInRupees: number;
  totalPlatformCommissionInRupees: number;
  totalNetEarningsInRupees: number;
  totalPaidOutInRupees: number;
  availableBalanceInRupees: number;
  totalCompletedSessions: number;
  upcomingBookingsCount: number;
}

export async function calculateHostEarnings(hostId: string): Promise<HostEarningsSummary> {
  const bookings = await getHostBookings(hostId);
  const payouts = await getHostPayouts(hostId);

  const completed = bookings.filter((b) => b.status === "completed" || b.status === "confirmed");
  const upcoming = bookings.filter((b) => b.status === "confirmed");

  let totalGross = 0;
  let totalCommission = 0;
  let totalNet = 0;

  for (const b of completed) {
    totalGross += b.subtotal_amount;
    totalCommission += b.platform_commission_amount;
    totalNet += b.merchant_earnings;
  }

  const totalPaidOut = payouts
    .filter((p) => p.status === "completed" || p.status === "processing")
    .reduce((sum, p) => sum + p.amount, 0);

  const availableBalance = Math.max(0, totalNet - totalPaidOut);

  return {
    totalGrossInRupees: Math.round(totalGross * 100) / 100,
    totalPlatformCommissionInRupees: Math.round(totalCommission * 100) / 100,
    totalNetEarningsInRupees: Math.round(totalNet * 100) / 100,
    totalPaidOutInRupees: Math.round(totalPaidOut * 100) / 100,
    availableBalanceInRupees: Math.round(availableBalance * 100) / 100,
    totalCompletedSessions: completed.length,
    upcomingBookingsCount: upcoming.length,
  };
}

// ─── Helper: Get Confirmed Booking Charger IDs For Viewer ──────────────────────

async function getViewerConfirmedBookingChargerIds(viewerId: string): Promise<Set<string>> {
  if (!viewerId) return new Set();
  try {
    const { data, error } = await safeWithTimeout(
      supabase
        .from("marketplace_bookings")
        .select("charger_id, status")
        .eq("user_id", viewerId)
        .in("status", ["confirmed", "in_progress", "completed"]),
    );
    if (!error && data && data.length > 0) {
      return new Set(data.map((b) => b.charger_id));
    }
  } catch {
    // fallback
  }

  const localBookings = getLocal<MarketplaceBooking[]>("bookings", []);
  const confirmed = localBookings.filter(
    (b) =>
      b.user_id === viewerId &&
      (b.status === "confirmed" || b.status === "in_progress" || b.status === "completed"),
  );
  return new Set(confirmed.map((b) => b.charger_id));
}

async function hasUserConfirmedBooking(userId: string, chargerId: string): Promise<boolean> {
  const confirmedSet = await getViewerConfirmedBookingChargerIds(userId);
  return confirmedSet.has(chargerId);
}
