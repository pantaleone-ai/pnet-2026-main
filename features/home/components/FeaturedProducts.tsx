import BackgroundDots from "@/features/common/components/BackgroundDots";
import CardItem from "@/features/common/components/CardItem";
import { getFeaturedProducts } from "@/features/shop/data/shopSource";
import { slugify } from "@/lib/helpers";

export default function FeaturedProducts() {
  const featuredProducts = getFeaturedProducts();

  return (
    <div className="relative mx-auto max-w-7xl px-6 py-8 md:py-10 lg:px-8">
      <BackgroundDots gridId="featured-products" className="text-gray-200/80" />
      <div className="xl mx-auto grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
        {featuredProducts.map((product, index) => (
          <CardItem
            key={slugify(product.title ?? "")}
            index={index}
            type="product"
            item={product}
            sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 33vw, 400px"
          />
        ))}
      </div>
    </div>
  );
}
