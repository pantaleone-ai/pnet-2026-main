import { redirect } from "next/navigation";
import { getProductByFeedId } from "@/features/shop/data/shopSource";
import { getStripeClient } from "@/lib/stripe";
import {
  parseProductsParam,
  validateCart,
  getCartMetadata,
} from "@/lib/cart-utils";

interface CheckoutPageProps {
  searchParams: Promise<{
    product_id?: string;
    products?: string;
    coupon?: string;
    cart_origin?: string;
  }>;
}

const APP_URL = process.env.APP_URL || "https://pantaleone.net";

export async function generateMetadata() {
  return {
    title: "Redirecting to Checkout",
    robots: "noindex, nofollow",
  };
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const params = await searchParams;
  const { product_id, products, coupon, cart_origin } = params;

  if (products) {
    const parsedItems = parseProductsParam(products);
    const validation = validateCart(parsedItems);

    if (!validation.success || validation.items.length === 0) {
      redirect("/shop");
    }

    const stripe = getStripeClient();

    const lineItems = validation.items.map((item) => ({
      price: item.product.stripePriceId!,
      quantity: item.quantity,
    }));

    const sessionParams: {
      mode: "payment";
      line_items: typeof lineItems;
      success_url: string;
      cancel_url: string;
      metadata: ReturnType<typeof getCartMetadata>;
      allow_promotion_codes: boolean;
      discounts?: { coupon: string }[];
    } = {
      mode: "payment",
      line_items: lineItems,
      success_url: `${APP_URL}/shop?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/shop?checkout=cancelled`,
      metadata: getCartMetadata(cart_origin, coupon),
      allow_promotion_codes: true,
    };

    if (coupon) {
      sessionParams.discounts = [{ coupon }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (session.url) {
      redirect(session.url);
    }

    redirect("/shop");
  }

  if (!product_id) {
    redirect("/shop");
  }

  const product = getProductByFeedId(product_id);

  if (!product) {
    redirect("/shop");
  }

  if (!product.stripePaymentLink) {
    redirect(`/shop/${product.slug}`);
  }

  redirect(product.stripePaymentLink);
}
