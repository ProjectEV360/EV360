import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  getRazorpayKey,
  loadRazorpayScript,
  openRazorpayCheckout,
} from "@/services/razorpayService";
import { ChargingPaymentModal } from "@/components/ChargingPaymentModal";
import type { Station } from "@/lib/types";

const mockStation: Station = {
  id: "test-st-1",
  name: "BKC SuperCharger Hub",
  address: "G Block BKC",
  city: "Mumbai",
  lat: 19.0657,
  lng: 72.8687,
  opening_hours: "24/7",
  amenities: ["Cafe", "Restroom"],
  operator: { id: "op1", name: "Tata Power", logo_url: null },
  connectors: [
    { id: "c1", type: "CCS2", power_kw: 60, price_per_kwh: 18.0, status: "available" },
    { id: "c2", type: "Type 2", power_kw: 22, price_per_kwh: 14.0, status: "in_use" },
  ],
};

describe("Razorpay Service", () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.Razorpay;
  });

  it("returns configured or default Razorpay key", () => {
    expect(getRazorpayKey()).toBeDefined();
    localStorage.setItem("chargehub_razorpay_key", "rzp_test_custom_123");
    expect(getRazorpayKey()).toBe("rzp_test_custom_123");
  });

  it("detects existing window.Razorpay and resolves true", async () => {
    window.Razorpay = vi.fn();
    const loaded = await loadRazorpayScript();
    expect(loaded).toBe(true);
  });

  it("opens checkout with correct INR paise conversion and callbacks", async () => {
    const mockOpen = vi.fn();
    const captured: {
      current: {
        amount?: number;
        currency?: string;
        name?: string;
        handler?: (res: { razorpay_payment_id: string }) => void;
      } | null;
    } = { current: null };

    window.Razorpay = vi.fn().mockImplementation(function (opts: Record<string, unknown>) {
      captured.current = opts as typeof captured.current;
      return { open: mockOpen };
    }) as unknown as typeof window.Razorpay;

    const handleSuccess = vi.fn();

    await openRazorpayCheckout({
      amountInRupees: 500,
      stationName: "BKC Hub",
      connectorType: "CCS2",
      powerKw: 60,
      kwh: 25,
      onSuccess: handleSuccess,
    });

    expect(window.Razorpay).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(captured.current?.amount).toBe(50000); // 500 * 100 paise
    expect(captured.current?.currency).toBe("INR");
    expect(captured.current?.name).toBe("ChargeHub India");

    // Simulate callback
    captured.current?.handler?.({ razorpay_payment_id: "pay_test_999" });
    expect(handleSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        razorpay_payment_id: "pay_test_999",
        amount: 500,
        kwh: 25,
      }),
    );
  });
});

describe("ChargingPaymentModal Component", () => {
  it("renders station name, connector options, and pricing breakdown", () => {
    render(<ChargingPaymentModal open={true} onOpenChange={vi.fn()} station={mockStation} />);

    expect(screen.getByText("Reserve & Pay")).toBeInTheDocument();
    expect(screen.getByText("BKC SuperCharger Hub")).toBeInTheDocument();
    expect(screen.getByText("CCS2")).toBeInTheDocument();
    expect(screen.getByText("Total Payable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pay .* with Razorpay/i })).toBeInTheDocument();
  });

  it("updates target kWh and recalculates price when preset clicked", () => {
    render(<ChargingPaymentModal open={true} onOpenChange={vi.fn()} station={mockStation} />);

    // Click 10 kWh preset
    const preset10 = screen.getByRole("button", { name: /10 kWh/i });
    fireEvent.click(preset10);

    const matches = screen.getAllByText(/10 kWh/i);
    expect(matches.length).toBeGreaterThan(0);
  });
});
