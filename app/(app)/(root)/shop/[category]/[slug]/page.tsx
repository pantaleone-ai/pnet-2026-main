import ContactMe from "@/components/ContactMe";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import { getProductBySlug, getProductsByCategory } from "@/features/shop/data/shopSource";
import { getBaseUrl } from "@/lib/helpers";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import HeadingTitle from "@/components/HeadingTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, ExternalLink, Github } from "lucide-react";
import { getCategories, getProducts } from "@/features/shop/data/shopSource";

// Validate SEO configuration to ensure all required fields are present
if (!HEAD || HEAD.length === 0) {
  console.error("⚠️ HEAD configuration is missing or empty");
}

// Define the current page for SEO configuration
const PAGE = "Shop";

// Get SEO configuration for the current page from the HEAD array
const page = HEAD.find((page: HeadType) => page.page === PAGE) as HeadType;

export async function generateStaticParams() {
  const categories = getCategories();
  const products = getProducts();

  return categories.flatMap((category) => {
    return products
      .filter((product) => product.category === category)
      .map((product) => ({
        category: category.toLowerCase().replace(/\s+/g, '-'),
        slug: product.slug,
      }));
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const product = getProductBySlug(category, slug);

  if (!product) {
    return {
      title: "Product Not Found",
      description: "The requested product could not be found.",
    };
  }

  return {
    title: `${product.title} - ${page.title}`,
    description: product.description || "Shop AI products and services",
    alternates: {
      canonical: getBaseUrl(`shop/${category}/${slug}`),
    },
    openGraph: {
      title: `${product.title} - ${page.title}`,
      description: product.description || "Shop AI products and services",
      images: [
        {
          url: product.imageUrl || "/summary_large_image.png",
          width: 1200,
          height: 630,
          alt: product.title,
        },
      ],
      type: "website",
      url: getBaseUrl(`shop/${category}/${slug}`),
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.title} - ${page.title}`,
      description: product.description || "Shop AI products and services",
      images: [product.imageUrl || "/summary_large_image.png"],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const product = getProductBySlug(category, slug);
  const relatedProducts = getProductsByCategory(category).filter(p => p.slug !== slug);

  if (!product) {
    return notFound();
  }

  // Format category name for display
  const formatCategoryName = (slug: string): string => {
    const decodedSlug = decodeURIComponent(slug);
    return decodedSlug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const categoryName = formatCategoryName(category);

  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <HeadingTitle title={`${product.title} - ${categoryName}`} />
      <SeparatorHorizontal short={true} />

      {/* Breadcrumb Navigation */}
      <div className="mb-4">
        <Link href="/shop" className="text-primary hover:underline">Shop</Link>
        <span className="mx-2">/</span>
        <Link href={`/shop/${category.toLowerCase().replace(/\s+/g, '-')}`} className="text-primary hover:underline">{categoryName}</Link>
        <span className="mx-2">/</span>
        <span className="text-muted-foreground">{product.title}</span>
      </div>

      {/* Product Header */}
      <div className="mb-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex justify-between items-center">
              <span>{product.title}</span>
              <span className="bg-secondary text-secondary-foreground px-3 py-2 rounded-full text-lg font-medium">
                ${product.price} {product.currency}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-outline text-outline-foreground px-3 py-1 rounded-full text-sm font-medium border">
                {categoryName}
              </span>
              {product.sku && (
                <span className="bg-outline text-outline-foreground px-3 py-1 rounded-full text-sm font-medium border">
                  SKU: {product.sku}
                </span>
              )}
              {product.inventory !== undefined && (
                <span className="bg-outline text-outline-foreground px-3 py-1 rounded-full text-sm font-medium border">
                  {product.inventory > 0 ? `${product.inventory} in stock` : 'Out of Stock'}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Image */}
      {product.imageUrl && (
        <div className="mb-8">
          <Image
            alt={product.imageAlt || product.title}
            src={product.imageUrl}
            width={1000}
            height={500}
            className="h-auto max-h-96 w-full object-cover rounded-lg"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1000px"
          />
        </div>
      )}

      {/* Product Description */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base">{product.description}</p>
          </CardContent>
        </Card>
      </div>

      {/* Product Details */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Product Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium mb-2">Category:</p>
                <p className="text-muted-foreground">{categoryName}</p>
              </div>
              <div>
                <p className="font-medium mb-2">Type:</p>
                <p className="text-muted-foreground">{product.isDigital ? 'Digital Product' : 'Physical Product'}</p>
              </div>
              {product.techStacks && product.techStacks.length > 0 && (
                <div className="md:col-span-2">
                  <p className="font-medium mb-2">Technologies:</p>
                  <div className="flex flex-wrap gap-2">
                    {product.techStacks.map((tech) => (
                      <span key={tech} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Section */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Purchase Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {product.purchaseUrl && (
                <Button className="w-full" asChild>
                  <Link href={product.purchaseUrl} target="_blank" rel="noopener noreferrer">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Buy Now on {new URL(product.purchaseUrl).hostname}
                  </Link>
                </Button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.websiteUrl && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={product.websiteUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Visit Website
                    </Link>
                  </Button>
                )}
                {product.githubUrl && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={product.githubUrl} target="_blank" rel="noopener noreferrer">
                      <Github className="mr-2 h-4 w-4" />
                      View on GitHub
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Video Embed */}
      {product.videoEmbedUrl && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Demo Video</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe
                  src={product.videoEmbedUrl}
                  title={product.videoEmbedAlt || "Product Demo Video"}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Related Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProducts.slice(0, 3).map((relatedProduct) => (
              <Card key={relatedProduct.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{relatedProduct.title}</span>
                    <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-sm font-medium">
                      ${relatedProduct.price}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{relatedProduct.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="bg-outline text-outline-foreground px-2 py-1 rounded-full text-sm font-medium border">
                      {categoryName}
                    </span>
                    <Button size="sm" asChild>
                      <Link href={`/shop/${category}/${relatedProduct.slug}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <SeparatorHorizontal short={true} />
      <ContactMe />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
