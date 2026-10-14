import crypto from "node:crypto";

export interface CreateOrderParams {
  amountInRupees: number;
  stationName: string;
  connectorType: string;
  powerKw?: number | undefined;
  kwh?: number | undefined;
  userEmail?: string | null | undefined;
  userName?: string | null | undefined;
  userPhone?: string | undefined;
}

export interface CreateOrderResult {
  success: boolean;
  orderId?: string | undefined;
  amount?: number | undefined; // in paise
  currency?: string | undefined;
  keyId?: string | undefined;
  receipt?: string | undefined;
  error?: string | undefined;
  code?: string | undefined;
}

export interface VerifyPaymentParams {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  amountInRupees?: number | undefined;
  stationName?: string | undefined;
  connectorType?: string | undefined;
  kwh?: number | undefined;
}

export interface VerifyPaymentResult {
  success: boolean;
  verified: boolean;
  paymentId?: string | undefined;
  orderId?: string | undefined;
  error?: string | undefined;
}

// In-memory set of verified payment IDs to prevent replay / duplicate payment processing
const verifiedPayments = new Set<string>();

/**
 * Returns Razorpay Server credentials from environment variables.
 * Key Secret is kept strictly server-side and never exposed to the client.
 */
export function getRazorpayServerCredentials(): { keyId: string; keySecret: string } {
  const keyId =
    process.env["RAZORPAY_KEY_ID"] ||
    process.env["VITE_RAZORPAY_KEY_ID"] ||
    "rzp_test_1DP5mmOlF5G5ag";
  const keySecret = process.env["RAZORPAY_KEY_SECRET"] || "";

  return { keyId: keyId.trim(), keySecret: keySecret.trim() };
}

/**
 * Verifies Razorpay HMAC SHA256 Signature
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): boolean {
  if (!orderId || !paymentId || !signature || !keySecret) {
    return false;
  }
  try {
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature, "utf-8"),
      Buffer.from(signature, "utf-8"),
    );
  } catch {
    return false;
  }
}

/**
 * Creates an order via Razorpay Orders API
 * POST https://api.razorpay.com/v1/orders
 */
export async function createRazorpayOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const { keyId, keySecret } = getRazorpayServerCredentials();

  if (!params.amountInRupees || params.amountInRupees <= 0) {
    return {
      success: false,
      error: "Invalid payment amount. Amount must be greater than zero.",
      code: "INVALID_AMOUNT",
    };
  }

  const amountInPaise = Math.round(params.amountInRupees * 100);
  const receipt = `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (!keySecret) {
    const errorMsg =
      "Razorpay Test Key Secret is not configured in .env (RAZORPAY_KEY_SECRET). To process test payments, please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file from your Razorpay Dashboard (Settings > API Keys in Test Mode).";
    console.error(`[Razorpay Server] ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
      code: "MISSING_CREDENTIALS",
    };
  }

  try {
    const authString = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt,
        notes: {
          station: params.stationName || "EV Charging Station",
          connector: params.connectorType || "Standard",
          kwh: params.kwh != null ? `${params.kwh} kWh` : "",
          userEmail: params.userEmail || "",
        },
      }),
    });

    const data = (await response.json()) as {
      id?: string;
      amount?: number;
      currency?: string;
      receipt?: string;
      error?: { code?: string; description?: string };
    };

    if (!response.ok || data.error) {
      const errMsg =
        data.error?.description ||
        `Razorpay API returned HTTP ${response.status}: ${JSON.stringify(data.error)}`;
      console.error("[Razorpay API Error]", errMsg);
      return {
        success: false,
        error: errMsg,
        code: data.error?.code || "API_ERROR",
      };
    }

    if (!data.id) {
      return {
        success: false,
        error: "Razorpay order creation did not return an order ID.",
        code: "NO_ORDER_ID",
      };
    }

    return {
      success: true,
      orderId: data.id,
      amount: data.amount ?? amountInPaise,
      currency: data.currency ?? "INR",
      keyId,
      receipt: data.receipt ?? receipt,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Razorpay Order Exception]", message);
    return {
      success: false,
      error: `Failed to connect to Razorpay Orders API: ${message}`,
      code: "NETWORK_ERROR",
    };
  }
}

/**
 * Verifies a completed payment via HMAC-SHA256 signature and prevents duplicate processing
 */
export async function verifyRazorpayPayment(
  params: VerifyPaymentParams,
): Promise<VerifyPaymentResult> {
  const { keySecret } = getRazorpayServerCredentials();

  if (!params.razorpay_payment_id || !params.razorpay_order_id || !params.razorpay_signature) {
    return {
      success: false,
      verified: false,
      error:
        "Missing required payment verification parameters (payment ID, order ID, or signature).",
    };
  }

  // Check for duplicate processing to prevent replay attacks
  if (verifiedPayments.has(params.razorpay_payment_id)) {
    return {
      success: false,
      verified: false,
      error: `Duplicate payment detected: Payment ${params.razorpay_payment_id} has already been verified and processed.`,
    };
  }

  if (!keySecret) {
    return {
      success: false,
      verified: false,
      error:
        "RAZORPAY_KEY_SECRET is missing on the server. Cannot verify payment signature without secret.",
    };
  }

  const isValid = verifyRazorpaySignature(
    params.razorpay_order_id,
    params.razorpay_payment_id,
    params.razorpay_signature,
    keySecret,
  );

  if (!isValid) {
    console.error(
      `[Razorpay Signature Verification Failed] Order: ${params.razorpay_order_id}, Payment: ${params.razorpay_payment_id}`,
    );
    return {
      success: false,
      verified: false,
      error:
        "Payment signature verification failed. The payment response could not be verified securely.",
    };
  }

  // Mark payment as verified in memory
  verifiedPayments.add(params.razorpay_payment_id);

  console.log(
    `[Razorpay Verified] Successfully verified payment ${params.razorpay_payment_id} for order ${params.razorpay_order_id}`,
  );

  return {
    success: true,
    verified: true,
    paymentId: params.razorpay_payment_id,
    orderId: params.razorpay_order_id,
  };
}
