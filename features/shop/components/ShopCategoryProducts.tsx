import { getProductsByCategory } from "@/features/shop/data/shopSource";
import CardItem from "@/features/common/components/CardItem";
import BackgroundDots from "@/features/common/components/BackgroundDots";
import { slugify } from "@/lib/helpers";
import Link from "next/link";

export default function ShopCategoryProducts({ category }: { category: string }) {
  const products = getProductsByCategory(category);

  return (
    <div className="space-y-8">
      <div className="relative mx-auto max-w-7xl px-6 py-8 md:py-10 lg:px-8">
        <BackgroundDots gridId="blog-posts" className="text-gray-200/80" />
        <section>
          <h2 className="text-xl font-semibold mb-6">Products available in {category}</h2>
          {products.length > 0 ? (
            <div className="xl mx-auto grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
              {products.map((product, index) => (
                <CardItem
                  key={slugify(product.title ?? "")}
                  index={index}
                  type="product"
                  item={product}
                  sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 33vw, 400px"
                />
              ))}
            </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No products found in this category.</p>
            <Link href="/shop" className="text-primary hover:underline mt-2 inline-block">
              Browse all products
            </Link>
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
