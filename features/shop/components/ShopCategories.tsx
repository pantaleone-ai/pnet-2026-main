import { getProductsByCategory, getCategories } from "@/features/shop/data/shopSource";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Brain, Workflow, Palette, Zap } from "lucide-react";

export default function ShopCategories() {
  const categories = getCategories();
  const allProducts = getProductsByCategory("");

  return (
    <div className="space-y-8">
      {/* Featured Products Section */}
      {allProducts.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Featured Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allProducts.filter(product => product.featured).slice(0, 3).map((product) => (
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
        </section>
      )}

      {/* Categories Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Browse Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => {
            const products = getProductsByCategory(category);
            const Icon = getCategoryIcon(category);

            return (
              <Card key={category} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <span>{category}</span>
                  </CardTitle>
                  <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-sm font-medium">{products.length}</span>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {getCategoryDescription(category)}
                  </p>
                  <Button size="sm" className="w-full" asChild>
                    <Link href={`/shop/${category.toLowerCase().replace(/\s+/g, '-')}`}>
                      Browse {category}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function getCategoryIcon(category: string) {
  const categoryLower = category.toLowerCase();
  if (categoryLower.includes("apps")) {
    return Brain;
  } else if (categoryLower.includes("workflows")) {
    return Workflow;
  } else if (categoryLower.includes("services")) {
    return Zap;
  } else if (categoryLower.includes("artwork")) {
    return Palette;
  }
  return ShoppingCart;
}

function getCategoryDescription(category: string): string {
  const categoryLower = category.toLowerCase();
  if (categoryLower.includes("apps")) {
    return "AI applications and agents to automate your workflows and enhance productivity.";
  } else if (categoryLower.includes("workflows")) {
    return "Pre-built N8N workflows for common automation tasks and AI integrations.";
  } else if (categoryLower.includes("services")) {
    return "Professional AI services including consulting, implementation, and custom development.";
  } else if (categoryLower.includes("artwork")) {
    return "AI-generated digital artwork and creative assets for your projects.";
  }
  return "Explore our collection of AI-powered products and services.";
}
