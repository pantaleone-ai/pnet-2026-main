import { redirect } from "next/navigation";
import { getProductByFeedId } from "@/features/shop/data/shopSource";

interface CheckoutPageProps {
  searchParams: Promise<{ product_id?: string }>;
}

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
  const productId = params.product_id;

  if (!productId) {
    redirect("/shop");
  }

  const product = getProductByFeedId(productId);

  if (!product) {
    redirect("/shop");
  }

  if (!product.stripePaymentLink) {
    redirect(`/shop/${product.slug}`);
  }

  redirect(product.stripePaymentLink);
}
