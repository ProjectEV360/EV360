/**
 * Razorpay Payment Integration Service for ChargeHub
 * Supports Razorpay Standard Checkout in Test/Demo Mode
 */

export interface PaymentOptions {
  amountInRupees: number;
  stationName: string;
  connectorType: string;
  powerKw: number;
  kwh: number;
  userEmail?: string | null | undefined;
  userName?: string | null | undefined;
  userPhone?: string | undefined;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onDismiss?: (() => void) | undefined;
  onError?: ((error: unknown) => void) | undefined;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string | undefined;
  razorpay_signature?: string | undefined;
  amount: number;
  stationName: string;
  connectorType: string;
  kwh: number;
  timestamp: string;
}

// Global window declaration for Razorpay
declare global {
  interface Window {
    Razorpay?:
      | (new (options: Record<string, unknown>) => {
          open: () => void;
          close?: (() => void) | undefined;
        })
      | undefined;
  }
}

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

/**
 * Dynamically loads the official Razorpay Checkout SDK
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    // Check if script element already exists
    const existingScript = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Returns the configured Razorpay Key ID
 */
export function getRazorpayKey(): string {
  if (typeof window !== "undefined") {
    const customKey = localStorage.getItem("chargehub_razorpay_key");
    if (customKey && customKey.trim()) {
      return customKey.trim();
    }
  }

  const envKey = import.meta.env["VITE_RAZORPAY_KEY_ID"];
  if (envKey && envKey.trim()) {
    return envKey.trim();
  }

  // Default Razorpay public test key format
  return "rzp_test_1DP5mmOlF5G5ag";
}

/**
 * Initiates Razorpay Checkout
 */
function getApiUrl(path: string): string {
  if (
    typeof window !== "undefined" &&
    window.location &&
    window.location.origin &&
    window.location.origin !== "null" &&
    !window.location.origin.startsWith("about:")
  ) {
    return path;
  }
  return `http://localhost:5173${path}`;
}

export async function openRazorpayCheckout(options: PaymentOptions): Promise<void> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    throw new Error("Could not load Razorpay SDK. Please check your internet connection.");
  }

  // Step 1: Create a genuine Razorpay Order on the backend
  let orderData: {
    success: boolean;
    orderId?: string | undefined;
    amount?: number | undefined;
    currency?: string | undefined;
    keyId?: string | undefined;
    error?: string | undefined;
  };

  try {
    const res = await fetch(getApiUrl("/api/razorpay/create-order"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountInRupees: options.amountInRupees,
        stationName: options.stationName,
        connectorType: options.connectorType,
        powerKw: options.powerKw,
        kwh: options.kwh,
        userEmail: options.userEmail,
        userName: options.userName,
        userPhone: options.userPhone,
      }),
    });

    orderData = (await res.json()) as typeof orderData;
  } catch (netErr) {
    console.error("[Razorpay Order Request Error]", netErr);
    throw new Error(
      "Failed to communicate with payment backend. Please ensure the development server is running.",
    );
  }

  if (!orderData.success || !orderData.orderId) {
    const errMsg = orderData.error || "Failed to create Razorpay payment order.";
    console.error("[Razorpay Order Creation Failed]", errMsg);
    throw new Error(errMsg);
  }

  const key = orderData.keyId || getRazorpayKey();
  const amount = orderData.amount ?? Math.round(options.amountInRupees * 100);

  const rzpOptions = {
    key,
    order_id: orderData.orderId, // Crucial: required for test payment methods to appear
    amount,
    currency: orderData.currency || "INR",
    name: "ChargeHub India",
    description: `EV Charge: ${options.kwh} kWh (${options.connectorType} ${options.powerKw}kW)`,
    image: "/favicon.ico",
    notes: {
      station: options.stationName,
      connector: options.connectorType,
      kwh: `${options.kwh} kWh`,
    },
    prefill: {
      name: options.userName || "EV Driver",
      email: options.userEmail || "driver@chargehub.in",
      contact: options.userPhone || "9876543210",
    },
    theme: {
      color: "#0d9488", // Brand green/teal
      backdrop_color: "rgba(0, 0, 0, 0.6)",
    },
    modal: {
      ondismiss: () => {
        options.onDismiss?.();
      },
      confirm_close: true,
      escape: true,
      handleback: true,
    },
    handler: async (response: {
      razorpay_payment_id: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
    }) => {
      // Step 2: Send payment response to backend for HMAC-SHA256 signature verification
      try {
        const verifyRes = await fetch(getApiUrl("/api/razorpay/verify-payment"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id || orderData.orderId,
            razorpay_signature: response.razorpay_signature,
            amountInRupees: options.amountInRupees,
            stationName: options.stationName,
            connectorType: options.connectorType,
            kwh: options.kwh,
          }),
        });

        const verifyResult = (await verifyRes.json()) as {
          success: boolean;
          verified: boolean;
          error?: string;
        };

        if (!verifyResult.success || !verifyResult.verified) {
          const err = new Error(
            verifyResult.error ||
              "Payment signature verification failed. Invalid server signature.",
          );
          console.error("[Payment Verification Error]", err);
          options.onError?.(err);
          return;
        }

        const successPayload: RazorpaySuccessResponse = {
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id || orderData.orderId,
          razorpay_signature: response.razorpay_signature,
          amount: options.amountInRupees,
          stationName: options.stationName,
          connectorType: options.connectorType,
          kwh: options.kwh,
          timestamp: new Date().toISOString(),
        };
        options.onSuccess(successPayload);
      } catch (err) {
        console.error("[Razorpay Verification Request Failed]", err);
        options.onError?.(err);
      }
    },
  };

  try {
    const rzpInstance = new window.Razorpay(rzpOptions);
    rzpInstance.open();
  } catch (err) {
    options.onError?.(err);
    throw err;
  }
}
