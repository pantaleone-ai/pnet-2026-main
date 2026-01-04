import { getProductsByCategory } from "@/features/shop/data/shopSource";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import BackgroundDots from "@/features/common/components/BackgroundDots";

export default function ShopCategoryProducts({ category }: { category: string }) {
  const products = getProductsByCategory(category);

  return (
    <div className="space-y-8">
      <div className="relative mx-auto max-w-7xl px-6 py-8 md:py-10 lg:px-8">
        <BackgroundDots gridId="blog-posts" className="text-gray-200/80" />
        <section>
          <h2 className="text-xl font-semibold mb-4">Products available in {category}</h2>
          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="h-full gap-0 rounded-md border-x border-b pb-4 border-border-edge py-6 px-2 transition-all duration-300 shadow-md hover:border-muted-foreground/40 shadow-lg">
                <CardHeader className="items-center space-y-0 items-center px-2 py-2">
                  <CardTitle className="text-xl font-semibold flex justify-between items-center">
                    <span>{product.title}</span>
                    <span className="bg-secondary text-secondary-foreground px-3 py-2 rounded-lg text-sm font-semibold border-edge border">${product.price}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-md text-muted-foreground mb-6">{product.description}</p>
                  <div className="flex flex-col gap-2">
                    {product.purchaseUrl && (
                      <Button size="lg" asChild>
                        <Link target="_blank" rel="noopener noreferrer" className="text-lg font-semibold" href={product.purchaseUrl}>
                          Buy Now - ${product.price}
                        </Link>
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" className="mt-2" asChild>
                      <Link className="text-sm" href={`/shop/${product.category.toLowerCase().replace(/\s+/g, '-')}/${product.slug}`}>
                        View Product Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
