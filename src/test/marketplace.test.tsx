import { describe, expect, it, beforeEach } from "vitest";
import {
  calculateMarketplacePricing,
  checkSlotAvailability,
  maskChargerForPublic,
  homeChargerToStation,
  SEED_HOME_CHARGERS,
  createMarketplaceBooking,
  confirmMarketplaceBooking,
  cancelMarketplaceBooking,
  calculateHostEarnings,
} from "@/services/marketplaceService";
import { filterStations } from "@/lib/station-utils";
import type { HomeCharger, StationFilters, Station } from "@/lib/types";

describe("Peer-to-Peer Marketplace: Financial & Commission Calculations", () => {
  it("calculates exact 10% platform commission and 90% host share without floating-point errors", () => {
    // ₹16/kWh, 25 kWh target = ₹400 subtotal
    const pricing = calculateMarketplacePricing(16, "per_kwh", 25, 2, 10);

    expect(pricing.subtotalInRupees).toBe(400);
    expect(pricing.platformCommissionInRupees).toBe(40);
    expect(pricing.merchantEarningsInRupees).toBe(360);
    expect(pricing.totalInRupees).toBe(400);

    // Verify integer paise representations
    expect(pricing.subtotalInPaise).toBe(40000);
    expect(pricing.commissionInPaise).toBe(4000);
    expect(pricing.merchantEarningsInPaise).toBe(36000);
    expect(pricing.commissionInPaise + pricing.merchantEarningsInPaise).toBe(
      pricing.subtotalInPaise,
    );
  });

  it("handles odd/decimal price rates accurately using paise arithmetic", () => {
    // ₹17.50/kWh, 13 kWh target = ₹227.50 subtotal
    const pricing = calculateMarketplacePricing(17.5, "per_kwh", 13, 1, 10);

    expect(pricing.subtotalInRupees).toBe(227.5);
    // 10% of 22750 paise is 2275 paise (₹22.75)
    expect(pricing.commissionInPaise).toBe(2275);
    expect(pricing.merchantEarningsInPaise).toBe(20475);
    expect(pricing.platformCommissionInRupees).toBe(22.75);
    expect(pricing.merchantEarningsInRupees).toBe(204.75);
    expect(pricing.platformCommissionInRupees + pricing.merchantEarningsInRupees).toBe(227.5);
  });

  it("calculates flat fee per session pricing", () => {
    // ₹250 flat fee per session
    const pricing = calculateMarketplacePricing(250, "per_session", 0, 3, 10);

    expect(pricing.subtotalInRupees).toBe(250);
    expect(pricing.platformCommissionInRupees).toBe(25);
    expect(pricing.merchantEarningsInRupees).toBe(225);
  });
});

describe("Peer-to-Peer Marketplace: Privacy Guard & Location Obfuscation", () => {
  const sampleCharger: HomeCharger = SEED_HOME_CHARGERS[0]!;

  it("masks exact street address and private access instructions before booking", () => {
    const masked = maskChargerForPublic(sampleCharger, false);

    expect(masked.address_full).toBe(sampleCharger.address_approx);
    expect(masked.access_instructions).toContain("revealed after booking confirmation");
    expect(masked.address_full).not.toContain("Bungalow 4, Holy Cross Road");
  });

  it("reveals exact street address and entry instructions when confirmed booking exists", () => {
    const unmasked = maskChargerForPublic(sampleCharger, true);

    expect(unmasked.address_full).toContain("Bungalow 4, Holy Cross Road");
    expect(unmasked.access_instructions).toContain("Gate is unlocked");
  });

  it("adapts HomeCharger to Station interface with is_home_charger flag", () => {
    const station = homeChargerToStation(sampleCharger);

    expect(station.is_home_charger).toBe(true);
    expect(station.home_charger_id).toBe(sampleCharger.id);
    expect(station.operator.name).toContain("Rohan Mhatre");
    expect(station.connectors[0]?.power_kw).toBe(sampleCharger.power_kw);
  });
});

describe("Peer-to-Peer Marketplace: Slot Availability & Double Booking Prevention", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("detects and blocks overlapping reservations for the same charger", async () => {
    const chargerId = "charger-test-101";

    // 1. Create confirmed booking between 10:00 and 12:00
    const startIso = "2026-10-25T10:00:00.000Z";
    const endIso = "2026-10-25T12:00:00.000Z";

    await createMarketplaceBooking({
      charger_id: chargerId,
      host_id: "host-1",
      user_id: "driver-1",
      start_time: startIso,
      end_time: endIso,
      duration_hours: 2,
      status: "confirmed",
      subtotal_amount: 320,
      platform_commission_rate: 0.1,
      platform_commission_amount: 32,
      merchant_earnings: 288,
      total_amount: 320,
      access_revealed: true,
    });

    // 2. Test direct conflict: 11:00 to 13:00 (overlaps with 10:00-12:00)
    const conflictCheck = await checkSlotAvailability(
      chargerId,
      "2026-10-25T11:00:00.000Z",
      "2026-10-25T13:00:00.000Z",
    );
    expect(conflictCheck.available).toBe(false);
    expect(conflictCheck.conflictReason).toBeDefined();

    // 3. Test non-overlapping time slot: 14:00 to 16:00
    const validCheck = await checkSlotAvailability(
      chargerId,
      "2026-10-25T14:00:00.000Z",
      "2026-10-25T16:00:00.000Z",
    );
    expect(validCheck.available).toBe(true);
  });

  it("prevents booking outside valid time bounds", async () => {
    const check = await checkSlotAvailability(
      "charger-test-101",
      "2026-10-25T14:00:00.000Z",
      "2026-10-25T12:00:00.000Z", // end is before start
    );
    expect(check.available).toBe(false);
    expect(check.conflictReason).toContain("Invalid start or end time");
  });
});

describe("Peer-to-Peer Marketplace: Booking Lifecycle & Cancellation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("confirms booking and unlocks private host access upon verified payment", async () => {
    const booking = await createMarketplaceBooking({
      charger_id: "charger-lifecycle-1",
      host_id: "host-lifecycle-1",
      user_id: "user-lifecycle-1",
      start_time: "2026-10-26T10:00:00.000Z",
      end_time: "2026-10-26T12:00:00.000Z",
      duration_hours: 2,
      status: "pending_payment",
      subtotal_amount: 400,
      platform_commission_rate: 0.1,
      platform_commission_amount: 40,
      merchant_earnings: 360,
      total_amount: 400,
      access_revealed: false,
    });

    expect(booking.status).toBe("pending_payment");
    expect(booking.access_revealed).toBe(false);

    // Confirm booking with Razorpay payment details
    const confirmed = await confirmMarketplaceBooking(booking.id, {
      razorpay_order_id: "order_mock_001",
      razorpay_payment_id: "pay_mock_001",
      razorpay_signature: "sig_mock_001",
    });

    expect(confirmed?.status).toBe("confirmed");
    expect(confirmed?.access_revealed).toBe(true);
    expect(confirmed?.razorpay_payment_id).toBe("pay_mock_001");
  });

  it("cancels booking and handles eligible refund", async () => {
    const booking = await createMarketplaceBooking({
      charger_id: "charger-cancel-1",
      host_id: "host-cancel-1",
      user_id: "user-cancel-1",
      // Future slot: > 2 hours in future
      start_time: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
      duration_hours: 2,
      status: "confirmed",
      subtotal_amount: 500,
      platform_commission_rate: 0.1,
      platform_commission_amount: 50,
      merchant_earnings: 450,
      total_amount: 500,
      access_revealed: true,
    });

    const cancelRes = await cancelMarketplaceBooking(booking.id, "user", "Driver plans changed");
    expect(cancelRes.success).toBe(true);
    expect(cancelRes.refundAmount).toBe(500); // 100% full refund
  });
});

describe("Peer-to-Peer Marketplace: Map Filter Integration", () => {
  const mockStations: Station[] = [
    {
      id: "pub-1",
      name: "Tata Power Bandra Hub",
      address: "Bandra",
      city: "Mumbai",
      lat: 19.06,
      lng: 72.83,
      opening_hours: "24/7",
      amenities: [],
      operator: { id: "tata", name: "Tata Power", logo_url: null },
      connectors: [
        { id: "c1", type: "CCS2", power_kw: 60, price_per_kwh: 20, status: "available" },
      ],
      is_home_charger: false,
    },
    {
      id: "home-1",
      name: "Rohan's Fast AC Wallbox",
      address: "Borivali",
      city: "Mumbai",
      lat: 19.24,
      lng: 72.85,
      opening_hours: "08:00 - 22:00",
      amenities: [],
      operator: { id: "p2p-host", name: "Rohan Mhatre", logo_url: null },
      connectors: [
        { id: "hc1", type: "Type 2", power_kw: 7.4, price_per_kwh: 16, status: "available" },
      ],
      is_home_charger: true,
    },
  ];

  it("returns all chargers when source is 'all'", () => {
    const filters: StationFilters = {
      connectorTypes: [],
      minKw: 0,
      operatorIds: [],
      availableOnly: false,
      vehicleId: null,
      source: "all",
    };
    const result = filterStations(mockStations, filters);
    expect(result.length).toBe(2);
  });

  it("filters to only commercial public stations when source is 'public'", () => {
    const filters: StationFilters = {
      connectorTypes: [],
      minKw: 0,
      operatorIds: [],
      availableOnly: false,
      vehicleId: null,
      source: "public",
    };
    const result = filterStations(mockStations, filters);
    expect(result.length).toBe(1);
    expect(result[0]!.id).toBe("pub-1");
  });

  it("filters to only peer-to-peer home chargers when source is 'home'", () => {
    const filters: StationFilters = {
      connectorTypes: [],
      minKw: 0,
      operatorIds: [],
      availableOnly: false,
      vehicleId: null,
      source: "home",
    };
    const result = filterStations(mockStations, filters);
    expect(result.length).toBe(1);
    expect(result[0]!.id).toBe("home-1");
  });
});
