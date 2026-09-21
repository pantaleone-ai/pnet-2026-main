import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { getIdentifier, rateLimit } from "@/lib/rate-limit";
import {
  parseProductsParam,
  validateCart,
  getCartMetadata,
} from "@/lib/cart-utils";

const APP_URL = process.env.APP_URL || "https://pantaleone.net";

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
