import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { getIdentifier, rateLimit } from "@/lib/rate-limit";
import { resolveStripeLineItems } from "@/lib/stripe-catalog";
import {
  parseProductsParam,
  validateCart,
  getCartMetadata,
} from "@/lib/cart-utils";

const APP_URL = process.env.APP_URL || "https://www.pantaleone.net";

// Transactional Stripe redirect: per-cart, per-request. Never CDN-cacheable.
// Explicit force-dynamic + no-store on every response; per-IP rate limit
// blunts bot-driven Stripe session creation (origin + Stripe cost).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

// 10 session creations per minute per IP: legit shoppers never hit this,
// abuse/bot loops short-circuit before touching the Stripe API.
const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

export async function GET(request: NextRequest) {
  try {
    try {
      await limiter.check(10, getIdentifier(request));
    } catch {
      return NextResponse.redirect(`${APP_URL}/shop`, { headers: NO_STORE });
    }

    const { searchParams } = new URL(request.url);

    // Session-summary branch for the success-page browser Purchase:
    // returns amount/currency + catalog line items (no PII) so the client
    // can fire Purchase with canonical content_ids using eventID =
    // session.id (dedups with the webhook CAPI Purchase).
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      if (!sessionId.startsWith("cs_")) {
        return NextResponse.redirect(`${APP_URL}/shop`, { headers: NO_STORE });
      }
      try {
        const stripe = getStripeClient();
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        let items: Array<{
          id: string;
          name: string;
          category: string;
          price: number;
          quantity: number;
        }> = [];
        try {
          const lineItems = await stripe.checkout.sessions.listLineItems(
            sessionId,
            { limit: 100 },
          );
          const resolution = resolveStripeLineItems(
            lineItems.data.map((item) => ({
              priceId: item.price?.id ?? undefined,
              productId:
                typeof item.price?.product === "string"
                  ? item.price.product
                  : (item.price?.product as { id?: string } | null)?.id ??
                    undefined,
              quantity: item.quantity ?? 1,
              amountTotal: item.amount_total ?? undefined,
              fallbackName: item.description ?? undefined,
            })),
          );
          if (resolution.unmatched.length > 0) {
            console.warn(
              "Checkout summary: unmatched Stripe line items (no catalog SKU):",
              resolution.unmatched,
            );
          }
          items = resolution.items.map((resolved) => ({
            id: resolved.catalogId,
            name: resolved.name,
            category: resolved.category,
            price: resolved.price,
            quantity: resolved.quantity,
          }));
        } catch (resolveError) {
          // Catalog resolution must never break the summary — the client
          // still gets amount/currency for a value-only Purchase fallback.
          console.error("Checkout summary catalog resolve error:", resolveError);
        }
        return NextResponse.json(
          {
            id: session.id,
            amount_total: session.amount_total,
            currency: session.currency,
            payment_status: session.payment_status,
            content_ids: items.map((item) => item.id),
            contents: items.map((item) => ({
              id: item.id,
              quantity: item.quantity,
            })),
            items,
          },
          { headers: NO_STORE },
        );
      } catch (error) {
        console.error("Checkout session lookup error:", error);
        return NextResponse.redirect(`${APP_URL}/shop`, { headers: NO_STORE });
      }
    }

    const productsParam = searchParams.get("products");
    const couponCode = searchParams.get("coupon") || undefined;
    const cartOrigin = searchParams.get("cart_origin") || undefined;

    if (!productsParam) {
      return NextResponse.redirect(`${APP_URL}/shop`, { headers: NO_STORE });
    }

    const parsedItems = parseProductsParam(productsParam);
    const validation = validateCart(parsedItems);

    if (!validation.success || validation.items.length === 0) {
      return NextResponse.redirect(`${APP_URL}/shop`, { headers: NO_STORE });
    }

    const stripe = getStripeClient();

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      validation.items.map((item) => ({
        price: item.product.stripePriceId!,
        quantity: item.quantity,
      }));

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: lineItems,
      success_url: `${APP_URL}/shop?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/shop?checkout=cancelled`,
      metadata: getCartMetadata(cartOrigin, couponCode),
      allow_promotion_codes: true,
    };

    if (couponCode) {
      sessionParams.discounts = [{ coupon: couponCode }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500, headers: NO_STORE },
      );
    }

    return NextResponse.redirect(session.url, { headers: NO_STORE });
  } catch (error) {
    console.error("Checkout session error:", error);
    return NextResponse.redirect(`${APP_URL}/shop`, { headers: NO_STORE });
  }
}
