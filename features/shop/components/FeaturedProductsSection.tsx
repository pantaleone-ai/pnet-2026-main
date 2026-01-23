import { useEffect } from "react";
import { getProducts } from "@/features/shop/data/shopSource";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import BackgroundDots from "@/features/common/components/BackgroundDots";
import ProductCard from "./ProductCard";
import { track } from "@/lib/analytics";

export default function FeaturedProductsSection() {
  const featuredProducts = getProducts().filter(product => product.featured);

  if (featuredProducts.length === 0) {
    return null;
  }

  // Track product impressions on component mount
  useEffect(() => {
    const productsToTrack = featuredProducts.slice(0, 3).map(product => ({
      id: product.id.toString(),
      name: product.title,
      category: product.category,
      price: product.price,
      currency: product.currency || 'USD',
      brand: 'Pantaleone Digital Services'
    }));

    track.productImpression(productsToTrack, 'featured-products');
  }, [featuredProducts]);

  return (
    <div className="relative mx-auto max-w-7xl px-6 py-8 md:py-10 lg:px-8">
      <BackgroundDots gridId="featured-products" className="text-gray-200/80" />
      <section>
        <h2 className="text-xl font-semibold mb-6">Featured Products</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {featuredProducts.slice(0, 3).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              categorySlug={product.category.toLowerCase().replace(/\s+/g, '-')}
            />
          ))}
        </div>
        {featuredProducts.length > 3 && (
          <div className="mt-8 text-center">
            <Button variant="outline" asChild>
              <Link href="/shop">
                Browse All Products
              </Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
