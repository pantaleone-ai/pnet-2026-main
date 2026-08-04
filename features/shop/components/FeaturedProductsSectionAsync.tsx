import { getProducts } from "@/features/shop/data/shopSource";
import FeaturedProductsSection from "./FeaturedProductsSection";

export default async function FeaturedProductsSectionAsync() {
  const products = getProducts();
  return <FeaturedProductsSection products={products} />;
}
