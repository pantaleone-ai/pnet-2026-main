import { getProducts } from "@/features/shop/data/shopSource";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import BackgroundDots from "@/features/common/components/BackgroundDots";

export default function FeaturedProductsSection() {
  const featuredProducts = getProducts().filter(product => product.featured);

  if (featuredProducts.length === 0) {
    return null;
  }

  return (
    <div className="relative mx-auto max-w-7xl px-6 py-8 md:py-10 lg:px-8">
      <BackgroundDots gridId="featured-products" className="text-gray-200/80" />
      <section>
        <h2 className="text-xl font-semibold mb-6">Featured AI Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProducts.slice(0, 3).map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span className="line-clamp-1">{product.title}</span>
                  <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-sm font-medium flex-shrink-0">${product.price}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground mb-4 flex-1">{product.description}</p>
                <div className="flex flex-col gap-2 mt-auto">
                  {product.purchaseUrl && (
                    <Button size="sm" asChild>
                      <Link target="_blank" rel="noopener noreferrer" href={product.purchaseUrl}>
                        Buy Now - ${product.price}
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/shop/${product.category.toLowerCase().replace(/\s+/g, '-')}/${product.slug}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
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
