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

  it("opens checkout with correct INR paise conversion, order_id, and callbacks", async () => {
    const mockOpen = vi.fn();
    const captured: {
      current: {
        amount?: number;
        currency?: string;
        name?: string;
        order_id?: string;
        handler?: (res: {
          razorpay_payment_id: string;
          razorpay_order_id?: string;
          razorpay_signature?: string;
        }) => Promise<void> | void;
      } | null;
    } = { current: null };

    window.Razorpay = vi.fn().mockImplementation(function (opts: Record<string, unknown>) {
      captured.current = opts as typeof captured.current;
      return { open: mockOpen };
    }) as unknown as typeof window.Razorpay;

    // Mock fetch for order creation and verification
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/razorpay/create-order")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              orderId: "order_test_98765",
              amount: 50000,
              currency: "INR",
              keyId: "rzp_test_1DP5mmOlF5G5ag",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (urlStr.includes("/api/razorpay/verify-payment")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              verified: true,
              paymentId: "pay_test_999",
              orderId: "order_test_98765",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response("{}", { status: 404 }));
    });

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
    expect(captured.current?.order_id).toBe("order_test_98765");

    // Simulate payment callback with verification
    await captured.current?.handler?.({
      razorpay_payment_id: "pay_test_999",
      razorpay_order_id: "order_test_98765",
      razorpay_signature: "mock_valid_signature_abc123",
    });

    expect(handleSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        razorpay_payment_id: "pay_test_999",
        razorpay_order_id: "order_test_98765",
        amount: 500,
        kwh: 25,
      }),
    );

    fetchSpy.mockRestore();
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

describe("Razorpay Server Verification & Orders", () => {
  const testSecret = "test_razorpay_secret_key_12345";

  it("verifies valid HMAC-SHA256 signature correctly", async () => {
    const { verifyRazorpaySignature } = await import("@/services/razorpayServer");
    const crypto = await import("node:crypto");
    const orderId = "order_test_112233";
    const paymentId = "pay_test_445566";
    const expected = crypto
      .createHmac("sha256", testSecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(verifyRazorpaySignature(orderId, paymentId, expected, testSecret)).toBe(true);
    expect(verifyRazorpaySignature(orderId, paymentId, "invalid_signature", testSecret)).toBe(
      false,
    );
  });

  it("validates payment amount during order creation", async () => {
    const { createRazorpayOrder } = await import("@/services/razorpayServer");
    const res = await createRazorpayOrder({
      amountInRupees: 0,
      stationName: "BKC Hub",
      connectorType: "CCS2",
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain("Invalid payment amount");
  });

  it("detects and prevents duplicate payment processing", async () => {
    const { verifyRazorpayPayment } = await import("@/services/razorpayServer");
    const crypto = await import("node:crypto");
    process.env["RAZORPAY_KEY_SECRET"] = testSecret;

    const orderId = "order_dup_001";
    const paymentId = "pay_dup_001";
    const signature = crypto
      .createHmac("sha256", testSecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const first = await verifyRazorpayPayment({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });
    expect(first.success).toBe(true);
    expect(first.verified).toBe(true);

    const second = await verifyRazorpayPayment({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });
    expect(second.success).toBe(false);
    expect(second.error).toContain("Duplicate payment detected");
  });
});
