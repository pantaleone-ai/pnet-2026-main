import { getProductsByCategory, getCategories } from "@/features/shop/data/shopSource";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CardItem from "@/features/common/components/CardItem";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Brain, Workflow, Palette, Zap } from "lucide-react";
import BackgroundDots from "@/features/common/components/BackgroundDots";
import { cn } from "@/lib/utils";
import { slugify, getProductCategorySlug } from "@/lib/helpers";

export default function ShopCategories() {
  const categories = getCategories();
  const allProducts = getProductsByCategory("");

  return (
    <div className="space-y-8">
      {/* Featured Products Section */}
      {allProducts.filter(product => product.featured).length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Featured Products</h2>
          <div className="xl mx-auto grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {allProducts.filter(product => product.featured).slice(0, 3).map((product, index) => (
              <CardItem
                key={slugify(product.title ?? "")}
                index={index}
                type="product"
                item={product}
                sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 33vw, 400px"
              />
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

                    {/* All Products in this Category */}
                    {products.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-4">Products in {category}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                      </div>
                    )}

                    <div className="mt-6">
                      <Button size="lg" className="w-fit" asChild>
                        <Link href={`/shop/${getProductCategorySlug(category)}`}>
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
