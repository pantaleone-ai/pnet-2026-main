import { getProductsByCategory, getCategories } from "@/features/shop/data/shopSource";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Brain, Workflow, Palette, Zap } from "lucide-react";
import BackgroundDots from "@/features/common/components/BackgroundDots";
import { cn } from "@/lib/utils";
import Image from "next/image";

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
            <div className="relative mx-auto max-w-7xl px-6 py-8 md:py-10 lg:px-8">
              <BackgroundDots gridId="blog-posts" className="text-gray-200/80" />
        <h2 className="text-xl font-semibold mb-4">Shop AI Products Services & Artwork</h2>
        <div className="max-w-4xl mx-auto space-y-8">
          {categories.map((category) => {
            const products = getProductsByCategory(category);
            const featuredProducts = products.filter(product => product.featured);
            const Icon = getCategoryIcon(category);

            return (
              <div key={category} className="w-full">
                <Card className={cn(
                        "w-full gap-0 rounded-md border border-border-edge transition-all duration-300 shadow-md hover:border-muted-foreground/40"
                      )}
                      role="article"
                      aria-labelledby={`card-title-${category}`}
                    >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 items-center px-4 py-4">
                    <CardTitle className="text-xl font-medium flex items-center gap-3">
                      <Icon className="h-6 w-6" />
                      <span>{category}</span>
                    </CardTitle>
                    <span className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm font-medium">{products.length}</span>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-md text-muted-foreground mb-6">
                      {getCategoryDescription(category)}
                    </p>

                    {/* Featured Products in this Category */}
                    {featuredProducts.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4">Featured in this category</h3>
                        <div className="space-y-4">
                          {featuredProducts.slice(0, 2).map((product) => (
                            <Card key={product.id} className="border-none shadow-none">
                              <CardContent className="p-0">
                                <div className="flex items-center gap-4">
                                  {product.imageUrl && (
                                    <div className="relative w-20 h-20 flex-shrink-0">
                                      <Image
                                        src={product.imageUrl}
                                        alt={product.imageAlt || product.title}
                                        fill
                                        className="rounded-md object-cover"
                                        sizes="80px"
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <h4 className="font-medium text-base line-clamp-1">{product.title}</h4>
                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
                                      </div>
                                      <span className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 ml-3">${product.price}</span>
                                    </div>
                                    <div className="flex gap-3 mt-3">
                                      {product.purchaseUrl && (
                                        <Button size="sm" asChild>
                                          <Link target="_blank" rel="noopener noreferrer" href={product.purchaseUrl}>
                                            Buy ${product.price}
                                          </Link>
                                        </Button>
                                      )}
                                      <Button variant="outline" size="sm" asChild>
                                        <Link href={`/shop/${category.toLowerCase().replace(/\s+/g, '-')}/${product.slug}`}>
                                                          Details
                                                        </Link>
                                                      </Button>
                                                    </div>
                                                  </div>
                                                </div>
                                              </CardContent>
                                            </Card>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                    <div className="mt-6">
                      <Button size="lg" className="w-fit" asChild>
                        <Link href={`/shop/${category.toLowerCase().replace(/\s+/g, '-')}`}>
                          Browse {category}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
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
