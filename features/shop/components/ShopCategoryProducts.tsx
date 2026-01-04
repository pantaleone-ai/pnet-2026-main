import { getProductsByCategory } from "@/features/shop/data/shopSource";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import BackgroundDots from "@/features/common/components/BackgroundDots";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function ShopCategoryProducts({ category }: { category: string }) {
  const products = getProductsByCategory(category);

  return (
    <div className="space-y-8">
      <div className="relative mx-auto max-w-7xl px-6 py-8 md:py-10 lg:px-8">
        <BackgroundDots gridId="blog-posts" className="text-gray-200/80" />
        <section>
          <h2 className="text-xl font-semibold mb-6">Products available in {category}</h2>
          {products.length > 0 ? (
            <div className="max-w-4xl mx-auto space-y-6">
            {products.map((product) => (
              <div key={product.id} className="w-full">
                <Card className={cn(
                        "w-full gap-0 rounded-md border border-border-edge transition-all duration-300 shadow-md hover:border-muted-foreground/40"
                      )}
                      role="article"
                      aria-labelledby={`card-title-${product.id}`}
                    >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 items-center px-4 py-4">
                    <CardTitle className="text-xl font-medium flex items-center gap-3">
                      <span>{product.title}</span>
                    </CardTitle>
                    <span className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm font-medium">${product.price}</span>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {/* Product Image Preview */}
                    {product.imageUrl && (
                      <div className="mb-6">
                        <div className="relative w-full h-64">
                          <Image
                            src={product.imageUrl}
                            alt={product.imageAlt || product.title}
                            fill
                            className="rounded-md object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-md text-muted-foreground mb-6">
                      {product.description}
                    </p>

                    <div className="flex gap-3 mt-6">
                      {product.purchaseUrl && (
                        <Button size="lg" asChild>
                          <Link target="_blank" rel="noopener noreferrer" href={product.purchaseUrl}>
                            Buy Now - ${product.price}
                          </Link>
                        </Button>
                      )}
                      <Button variant="outline" size="lg" asChild>
                        <Link href={`/shop/${product.category.toLowerCase().replace(/\s+/g, '-')}/${product.slug}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
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
