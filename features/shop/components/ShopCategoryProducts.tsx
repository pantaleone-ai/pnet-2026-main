import { getProductsByCategory } from "@/features/shop/data/shopSource";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ShopCategoryProducts({ category }: { category: string }) {
  const products = getProductsByCategory(category);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold mb-4">Products in {category}</h2>
        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{product.title}</span>
                    <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-sm font-medium">${product.price}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{product.description}</p>
                  <div className="flex flex-col gap-2">
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
  );
}
