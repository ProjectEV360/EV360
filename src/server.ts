import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getRazorpayServerCredentials,
  type CreateOrderParams,
  type VerifyPaymentParams,
} from "./services/razorpayServer";

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      // Handle Razorpay API endpoints
      if (url.pathname === "/api/razorpay/create-order" && request.method === "POST") {
        try {
          const body = (await request.json()) as CreateOrderParams;
          const result = await createRazorpayOrder(body);
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({
              success: false,
              error: err instanceof Error ? err.message : "Invalid JSON request body",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
      }

      if (url.pathname === "/api/razorpay/verify-payment" && request.method === "POST") {
        try {
          const body = (await request.json()) as VerifyPaymentParams;
          const result = await verifyRazorpayPayment(body);
          return new Response(JSON.stringify(result), {
            status: result.success && result.verified ? 200 : 400,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({
              success: false,
              error: err instanceof Error ? err.message : "Invalid JSON request body",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
      }

      if (url.pathname === "/api/razorpay/config" && request.method === "GET") {
        const { keyId, keySecret } = getRazorpayServerCredentials();
        return new Response(
          JSON.stringify({
            keyId,
            hasSecret: Boolean(keySecret),
            testMode: keyId.startsWith("rzp_test_"),
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      // Marketplace Booking: Create Order
      if (url.pathname === "/api/marketplace/create-booking-order" && request.method === "POST") {
        try {
          const body = (await request.json()) as {
            amountInRupees: number;
            chargerTitle: string;
            connectorType: string;
            userEmail?: string;
            userName?: string;
            userPhone?: string;
          };

          const result = await createRazorpayOrder({
            amountInRupees: body.amountInRupees,
            stationName: body.chargerTitle,
            connectorType: body.connectorType,
            userEmail: body.userEmail,
            userName: body.userName,
            userPhone: body.userPhone,
          });

          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({
              success: false,
              error: err instanceof Error ? err.message : "Invalid JSON request",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
      }

      // Marketplace Booking: Verify Payment
      if (url.pathname === "/api/marketplace/verify-booking-payment" && request.method === "POST") {
        try {
          const body = (await request.json()) as VerifyPaymentParams;
          const result = await verifyRazorpayPayment(body);
          return new Response(JSON.stringify(result), {
            status: result.success && result.verified ? 200 : 400,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({
              success: false,
              error: err instanceof Error ? err.message : "Invalid JSON request",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  },
};
