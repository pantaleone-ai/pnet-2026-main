import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import {
  parseProductsParam,
  validateCart,
  getCartMetadata,
} from "@/lib/cart-utils";

const APP_URL = process.env.APP_URL || "https://pantaleone.net";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const productsParam = searchParams.get("products");
    const couponCode = searchParams.get("coupon") || undefined;
    const cartOrigin = searchParams.get("cart_origin") || undefined;

    if (!productsParam) {
      return NextResponse.json(
        { error: "Missing products parameter" },
        { status: 400 },
      );
    }

    const parsedItems = parseProductsParam(productsParam);
    const validation = validateCart(parsedItems);

    if (!validation.success || validation.items.length === 0) {
      const errorMsg =
        validation.errors.length > 0
          ? validation.errors.join(", ")
          : "Invalid cart";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
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
        { status: 500 },
      );
    }

    const acceptHeader = request.headers.get("accept");
    if (acceptHeader?.includes("text/html")) {
      return NextResponse.redirect(session.url!);
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
