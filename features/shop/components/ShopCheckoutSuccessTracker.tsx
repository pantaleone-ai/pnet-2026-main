"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { metaTrack } from "@/lib/meta-pixel";

/**
 * Stripe success landing: /shop?checkout=success&session_id=cs_...
 * Fires the browser Purchase with eventID = session.id so it dedups
 * against the webhook CAPI Purchase (same event_name + event_id).
 * Consent + prod-host gated inside metaTrack; the relay carries IP/UA
 * + fbc/fbp for the server half of the pair.
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
        const summary = (await res.json()) as {
          amount_total?: number;
          currency?: string;
          payment_status?: string;
        };
        if (cancelled) return;
        if (
          summary.payment_status !== "paid" ||
          typeof summary.amount_total !== "number"
        ) {
          return;
        }
        metaTrack(
          "Purchase",
          {
            value: summary.amount_total / 100,
            currency: (summary.currency || "USD").toUpperCase(),
          },
          { eventID: sessionId, relay: true },
        );
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
