import { redirect } from "next/navigation";
import { getProductByFeedId } from "@/features/shop/data/shopSource";

interface CheckoutPageProps {
  searchParams: Promise<{
    product_id?: string;
    products?: string;
    coupon?: string;
    cart_origin?: string;
  }>;
}

// Personalized redirect hub (cart query -> Stripe). Must never be statically
// cached: each URL carries a different cart, so a shared CDN entry would leak
// one shopper's cart into another's. Explicit force-dynamic + exclusion from
// the static-page Cache-Control header in next.config.mjs.
export const dynamic = "force-dynamic";

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
    const searchParams = new URLSearchParams();
    searchParams.set("products", products);
    if (coupon) searchParams.set("coupon", coupon);
    if (cart_origin) searchParams.set("cart_origin", cart_origin);

    redirect(`/api/checkout/session?${searchParams.toString()}`);
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
