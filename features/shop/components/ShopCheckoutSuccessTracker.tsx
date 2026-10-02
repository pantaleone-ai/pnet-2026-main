"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { ga4, metaPixel } from "@/lib/analytics";

interface SessionSummaryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
}

interface SessionSummary {
  id?: string;
  amount_total?: number;
  currency?: string;
  payment_status?: string;
  content_ids?: string[];
  contents?: Array<{ id: string; quantity: number }>;
  items?: SessionSummaryItem[];
}

/**
 * Stripe success landing: /shop?checkout=success&session_id=cs_...
 * Fires the browser Purchase with eventID = session.id so it dedups
 * against the webhook CAPI Purchase (same event_name + event_id).
 * Uses canonical catalog IDs from the session summary so Meta can match
 * events to catalog products. Consent + prod-host gated inside the
 * analytics helpers; sessionStorage guard prevents duplicate fires
 * when the confirmation page is refreshed.
 */
export default function ShopCheckoutSuccessTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");
    if (checkout !== "success" || !sessionId?.startsWith("cs_")) return;

    let cancelled = false;
    try {
      if (
        window.sessionStorage.getItem(`pnet-purchase-tracked-${sessionId}`)
      ) {
        return;
      }
    } catch {
      // storage unavailable — still track once per mount
    }

    (async () => {
      try {
        const res = await fetch(
          `/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const summary = (await res.json()) as SessionSummary;
        if (cancelled) return;
        if (
          summary.payment_status !== "paid" ||
          typeof summary.amount_total !== "number"
        ) {
          return;
        }
        const currency = (summary.currency || "USD").toUpperCase();
        const value = summary.amount_total / 100;
        const items: SessionSummaryItem[] = Array.isArray(summary.items)
          ? summary.items.filter(
              (item) =>
                typeof item?.id === "string" &&
                typeof item?.price === "number",
            )
          : [];

        if (items.length > 0) {
          const purchase = {
            transactionId: sessionId,
            value,
            currency,
            products: items.map((item) => ({
              id: item.id,
              name: item.name || item.id,
              category: item.category || "digital",
              price: item.price,
              quantity: item.quantity ?? 1,
              brand: "Pantaleone Digital Services",
            })),
          };
          ga4.purchase(purchase);
          metaPixel.purchase(purchase, sessionId);
        } else {
          // Fallback: catalog resolution unavailable — still record the
          // conversion value (no content_ids, so no catalog match).
          metaPixel.purchase(
            {
              transactionId: sessionId,
              value,
              currency,
              products: [],
            },
            sessionId,
          );
        }
        try {
          window.sessionStorage.setItem(
            `pnet-purchase-tracked-${sessionId}`,
            "1",
          );
        } catch {
          // ignore storage failures
        }
      } catch {
        // analytics must never break the shop page
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return null;
}
