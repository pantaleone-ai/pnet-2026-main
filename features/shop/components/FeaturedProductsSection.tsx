"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import LinkWrapper from "@/components/LinkWrapper";
import BackgroundDots from "@/features/common/components/BackgroundDots";
import ProductCard from "./ProductCard";
import { track } from "@/lib/analytics";
import type { ShopProduct } from "../types/ShopProduct";

interface FeaturedProductsSectionProps {
  products: ShopProduct[];
}

export default function FeaturedProductsSection({ products }: FeaturedProductsSectionProps) {
  const featuredProducts = products.filter(product => product.featured);

  // Track product impressions on component mount
  useEffect(() => {
    if (featuredProducts.length === 0) return;
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

  if (featuredProducts.length === 0) {
    return null;
  }

  return (
    <div className="relative mx-auto max-w-7xl px-6 py-8 md:py-10 lg:px-8">
      <BackgroundDots gridId="featured-products" className="text-gray-200/80" />
      <section>
        <h2 className="text-xl font-semibold mb-6">Featured Products</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {featuredProducts.slice(0, 3).map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              categorySlug={product.category.toLowerCase().replace(/\s+/g, '-')}
              listName="featured-products"
              index={index}
            />
          ))}
        </div>
        {featuredProducts.length > 3 && (
          <div className="mt-8 text-center">
            <Button variant="outline" asChild>
              <LinkWrapper href="/shop">
                Browse All Products
              </LinkWrapper>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
