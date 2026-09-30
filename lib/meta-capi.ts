/**
 * Meta Conversions API client — SERVER-ONLY.
 *
 * Never import this module (or META_CAPI_ACCESS_TOKEN) from client
 * components: the token must not appear in the browser bundle.
 *
 * Dataset: pantaleone.net-2026 (1764032770941978).
 * Browser events reuse the same eventID via /api/meta/capi so Meta
 * dedups browser+server pairs. event_source_url + IP/UA + fbc/fbp +
 * hashed email push Purchase EMQ to ~7-8.
 */

import { createHash } from "crypto";

import { isNonProdRuntime, isProdRequestHost } from "@/lib/meta-pixel";

export const META_DATASET_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "1764032770941978";

const CAPI_VERSION = "v21.0";
const CAPI_URL = `https://graph.facebook.com/${CAPI_VERSION}/${META_DATASET_ID}/events`;

/** Server-only token. Legacy META_ACCESS_TOKEN kept as fallback. */
export function getCapiToken(): string | null {
  return (
    process.env.META_CAPI_ACCESS_TOKEN ||
    process.env.META_ACCESS_TOKEN ||
    null
  );
}

export function getTestEventCode(): string | undefined {
  return process.env.META_TEST_EVENT_CODE || undefined;
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export interface CapiUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  clientIp?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
}

export interface CapiEvent {
  event_name: string;
  event_id: string;
  event_time?: number;
  event_source_url?: string;
  action_source?: string;
  user_data?: CapiUserData;
  custom_data?: Record<string, unknown>;
}

function buildHashedUserData(userData: CapiUserData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (userData.email) out.em = [sha256Hex(userData.email)];
  if (userData.phone) {
    const digits = userData.phone.replace(/\D/g, "");
    if (digits) out.ph = [sha256Hex(digits)];
  }
  if (userData.firstName) out.fn = [sha256Hex(userData.firstName)];
  if (userData.lastName) out.ln = [sha256Hex(userData.lastName)];
  if (userData.city) out.ct = [sha256Hex(userData.city)];
  if (userData.state) out.st = [sha256Hex(userData.state)];
  if (userData.zip) out.zp = [sha256Hex(String(userData.zip))];
  if (userData.country) out.country = [sha256Hex(userData.country)];
  if (userData.clientIp) out.client_ip_address = userData.clientIp;
  if (userData.clientUserAgent)
    out.client_user_agent = userData.clientUserAgent;
  if (userData.fbc) out.fbc = userData.fbc;
  if (userData.fbp) out.fbp = userData.fbp;
  return out;
}

export interface CapiSendResult {
  sent: boolean;
  skipped?: string;
  dedupId?: string;
}

/**
 * Send events to the Conversions API.
 * Fails closed on non-prod runtimes and non-prod event sources so
 * preview/localhost traffic can never pollute the dataset.
 */
export async function sendCapiEvents(
  events: CapiEvent[],
  opts?: { eventSourceUrl?: string },
): Promise<CapiSendResult> {
  if (events.length === 0) return { sent: false, skipped: "empty" };
  if (isNonProdRuntime()) return { sent: false, skipped: "non-prod-runtime" };

  const token = getCapiToken();
  if (!token) return { sent: false, skipped: "missing-token" };

  const sourceUrl = opts?.eventSourceUrl ?? events[0]?.event_source_url;
  if (sourceUrl) {
    try {
      const host = new URL(sourceUrl).host;
      if (!isProdRequestHost(host)) {
        return { sent: false, skipped: "non-prod-source" };
      }
    } catch {
      return { sent: false, skipped: "bad-source-url" };
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const data = events.map((event) => ({
    event_name: event.event_name,
    event_time: event.event_time ?? now,
    event_id: event.event_id,
    action_source: event.action_source ?? "website",
    ...(event.event_source_url
      ? { event_source_url: event.event_source_url }
      : {}),
    user_data: buildHashedUserData(event.user_data ?? {}),
    ...(event.custom_data ? { custom_data: event.custom_data } : {}),
  }));

  const payload: Record<string, unknown> = {
    data,
    access_token: token,
  };
  const testCode = getTestEventCode();
  if (testCode) payload.test_event_code = testCode;

  try {
    const res = await fetch(CAPI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `Meta CAPI error ${res.status}: ${text.slice(0, 300)}`,
      );
      return { sent: false, skipped: `graph-${res.status}` };
    }
    return { sent: true, dedupId: events[0]?.event_id };
  } catch (error) {
    console.error("Meta CAPI send error:", error);
    return { sent: false, skipped: "network-error" };
  }
}

/** Extract CAPI user signals from an incoming request. */
export function userDataFromRequest(
  request: Request,
  overrides?: Partial<CapiUserData>,
): CapiUserData {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfIp = request.headers.get("cf-connecting-ip");
  const clientIp =
    cfIp || realIp || forwarded?.split(",")[0]?.trim() || undefined;
  const clientUserAgent =
    request.headers.get("user-agent") || undefined;

  let fbc: string | undefined;
  let fbp: string | undefined;
  try {
    const cookieHeader = request.headers.get("cookie") ?? "";
    for (const part of cookieHeader.split(";")) {
      const [name, ...rest] = part.trim().split("=");
      const value = rest.join("=");
      if (name === "_fbc") fbc = decodeURIComponent(value);
      if (name === "_fbp") fbp = decodeURIComponent(value);
    }
  } catch {
    // cookies unavailable — IP/UA still carry the match quality
  }

  return {
    clientIp,
    clientUserAgent,
    fbc: overrides?.fbc ?? fbc,
    fbp: overrides?.fbp ?? fbp,
    ...overrides,
  };
}

// ── Funnel event conveniences (server routes only) ──────────────────────

export interface CapiPurchaseData {
  transactionId: string;
  value: number;
  currency: string;
  products: Array<{ id: string; quantity: number }>;
}

export interface CapiProductData {
  id: string;
  price: number;
  currency?: string;
}

const SHOP_URL = "https://pantaleone.net/shop";

function serverEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

export async function sendPurchaseCapi(
  purchase: CapiPurchaseData,
  eventId?: string,
  opts?: { email?: string; eventSourceUrl?: string },
): Promise<CapiSendResult> {
  const result = await sendCapiEvents(
    [
      {
        event_name: "Purchase",
        event_id: eventId || purchase.transactionId,
        event_source_url: opts?.eventSourceUrl || SHOP_URL,
        user_data: { email: opts?.email },
        custom_data: {
          content_ids: purchase.products.map((p) => p.id),
          content_type: "product",
          value: purchase.value,
          currency: purchase.currency,
          num_items: purchase.products.reduce((sum, p) => sum + p.quantity, 0),
          transaction_id: purchase.transactionId,
        },
      },
    ],
    { eventSourceUrl: opts?.eventSourceUrl },
  );
  if (!result.sent) {
    console.error(`Meta CAPI Purchase skipped: ${result.skipped}`);
  }
  return result;
}

export async function sendInitiateCheckoutCapi(
  product: CapiProductData,
  eventId?: string,
  opts?: { email?: string; eventSourceUrl?: string },
): Promise<CapiSendResult> {
  const result = await sendCapiEvents(
    [
      {
        event_name: "InitiateCheckout",
        event_id: eventId || serverEventId(),
        event_source_url: opts?.eventSourceUrl || SHOP_URL,
        user_data: { email: opts?.email },
        custom_data: {
          content_ids: [product.id],
          content_type: "product",
          value: product.price,
          currency: product.currency || "USD",
          num_items: 1,
        },
      },
    ],
    { eventSourceUrl: opts?.eventSourceUrl },
  );
  if (!result.sent) {
    console.error(`Meta CAPI InitiateCheckout skipped: ${result.skipped}`);
  }
  return result;
}

export async function sendLeadCapi(
  contentName: string,
  eventId?: string,
  opts?: { email?: string; eventSourceUrl?: string; request?: Request },
): Promise<CapiSendResult> {
  const userData = opts?.request
    ? userDataFromRequest(opts.request, { email: opts.email })
    : { email: opts?.email };
  const result = await sendCapiEvents(
    [
      {
        event_name: "Lead",
        event_id: eventId || serverEventId(),
        event_source_url:
          opts?.eventSourceUrl || "https://pantaleone.net/contact",
        user_data: userData,
        custom_data: { content_name: contentName },
      },
    ],
    { eventSourceUrl: opts?.eventSourceUrl },
  );
  if (!result.sent) {
    console.error(`Meta CAPI Lead skipped: ${result.skipped}`);
  }
  return result;
}

export async function sendRefundCapi(
  refund: { transactionId: string; value: number; currency: string },
  productIds: string[],
  quantities: number[],
  eventId?: string,
): Promise<CapiSendResult> {
  const result = await sendCapiEvents(
    [
      {
        event_name: "Refund",
        event_id: eventId || `refund_${refund.transactionId}`,
        event_source_url: SHOP_URL,
        custom_data: {
          content_ids: productIds,
          content_type: "product",
          value: refund.value,
          currency: refund.currency,
          num_items: quantities.reduce((sum, q) => sum + q, 0),
          transaction_id: refund.transactionId,
        },
      },
    ],
    { eventSourceUrl: SHOP_URL },
  );
  if (!result.sent) {
    console.error(`Meta CAPI Refund skipped: ${result.skipped}`);
  }
  return result;
}
