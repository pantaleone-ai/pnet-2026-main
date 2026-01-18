"use client";

import ContactMe from "@/components/ContactMe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, ExternalLink, Github, Box, Cpu, ChevronRight, Info } from "lucide-react";
import { ProductImageGallery } from "@/features/shop/components/ProductImageGallery";
import type { Product, WithContext } from "schema-dts";

/** * Structured Data */
function getProductJsonLd(product: any): WithContext<Product> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.imageUrl || "/summary_large_image.png",
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency || "USD",
      availability: "https://schema.org/InStock",
      url: product.stripePaymentLink || product.purchaseUrl || "#",
    },
    brand: {
      "@type": "Brand",
      name: "Pantaleone Digital Services",
    },
    category: product.category,
    additionalProperty: product.techStacks?.map((tech: string) => ({
      "@type": "PropertyValue",
      name: "Technology",
      value: tech,
    })) || [],
  };
}

/** * Client Component for Interactive Features */
export default function ProductDetailClient({
  product,
  categoryName,
  category,
  relatedProducts,
  children
}: {
  product: any;
  categoryName: string;
  category: string;
  relatedProducts: any[];
  children: React.ReactNode;
}) {

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getProductJsonLd(product)).replace(/</g, "\\u003c"),
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-10 overflow-x-auto whitespace-nowrap pb-2">
        <Link href="/shop" className="hover:text-primary transition-colors">Shop</Link>
        <ChevronRight className="h-4 w-4 shrink-0" />
        <Link href={`/shop/${category}`} className="hover:text-primary transition-colors">{categoryName}</Link>
        <ChevronRight className="h-4 w-4 shrink-0" />
        <span className="text-foreground font-medium truncate">{product.title}</span>
      </nav>

      {/* Mobile Buy Now Banner - Above Fold */}
      <div className="lg:hidden mb-8">
        <Card className="shadow-xl border-primary/10 overflow-hidden bg-card/50 backdrop-blur">
          <CardContent className="p-6">
            <div className="space-y-4 text-center">
              <div className="space-y-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase tracking-widest">
                  {categoryName}
                </span>
                <h2 className="text-2xl font-black tracking-tight leading-tight">
                  {product.title}
                </h2>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-black tracking-tighter">${product.price}</span>
                <span className="text-muted-foreground font-bold text-lg uppercase">{product.currency}</span>
              </div>
              {(product.stripePaymentLink || product.purchaseUrl) && (
                <Button size="lg" className="text-xl font-bold h-16 w-full shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform" asChild>
                  <Link href={product.stripePaymentLink || product.purchaseUrl} target="_blank">
                    <ShoppingCart className="mr-3 h-5 w-5" /> Get Instant Access
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* LEFT COLUMN: Main Content */}
        <div className="order-1 lg:col-span-7 lg:order-none space-y-12 text-left">
          <section>
            {product.imageUrl && (
              <ProductImageGallery
                primaryImage={{
                  url: product.imageUrl,
                  alt: product.imageAlt || product.title
                }}
                additionalImages={product.additionalImages}
              />
            )}
          </section>

          <section className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight">{product.title}</h1>
              <p className="text-xl font-medium text-primary/80">Product Overview</p>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
              {product.description}
            </p>
          </section>

          {/* Product Content */}
          <section className="pt-10 border-t">
            {children}
          </section>

          {product.videoEmbedUrl && (
            <section className="pt-10 border-t">
              <h3 className="text-2xl font-bold mb-6">Demo & Walkthrough</h3>
              <div className="aspect-video rounded-xl overflow-hidden border bg-black shadow-2xl">
                <iframe
                    src={product.videoEmbedUrl}
                    title="Demo"
                    className="w-full h-full"
                    allowFullScreen
                />
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN: Sidebar (Sticky) */}
        <div className="order-2 lg:col-span-5 lg:order-none">
          <div className="sticky top-24 space-y-6">
            <Card className="shadow-2xl border-primary/10 overflow-hidden bg-card/50 backdrop-blur">
              <CardHeader className="pb-4">
                <div className="space-y-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase tracking-widest">
                    {categoryName}
                  </span>
                  <CardTitle className="text-3xl font-black tracking-tight leading-tight">
                    {product.title}
                  </CardTitle>
                </div>
                <div className="mt-8 flex items-baseline gap-2 pl-4">
                  <span className="text-5xl font-black tracking-tighter">${product.price}</span>
                  <span className="text-muted-foreground font-bold text-lg uppercase">{product.currency}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-8">
                <div className="space-y-4 pt-2">
                  {(product.stripePaymentLink || product.purchaseUrl) && (
                    <Button size="lg" className="text-xl lg:text-xl text-2xl font-bold h-20 lg:h-16 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform" asChild>
                      <Link href={product.stripePaymentLink || product.purchaseUrl} target="_blank">
                        <ShoppingCart className="mr-3 h-5 w-5" /> Get Instant Access
                      </Link>
                    </Button>
                  )}
                  <div className="grid grid-cols-2 gap-4 pl-4">
                    {product.websiteUrl && (
                      <Button variant="secondary" size="lg" className="font-semibold" asChild>
                        <Link href={product.websiteUrl} target="_blank">
                          <ExternalLink className="mr-2 h-4 w-4" /> Live Demo
                        </Link>
                      </Button>
                    )}
                    {product.githubUrl && (
                      <Button variant="secondary" size="lg" className="font-semibold" asChild>
                        <Link href={product.githubUrl} target="_blank">
                          <Github className="mr-2 h-4 w-4" /> Repository
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="pt-8 border-t space-y-6 text-sm pl-4">
                  <div className="flex items-start gap-4">
                    <Box className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="font-bold text-foreground">Delivery Method</p>
                      <p className="text-muted-foreground">{product.isDigital ? 'Instant Digital Download' : 'Physical Shipment'}</p>
                    </div>
                  </div>

                  {product.techStacks && (
                    <div className="flex items-start gap-4">
                      <Cpu className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="text-left space-y-3">
                        <p className="font-bold text-foreground">Technology Stack</p>
                        <div className="flex flex-wrap gap-2">
                          {product.techStacks.map((tech: string) => (
                            <span key={tech} className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-secondary text-secondary-foreground border border-border/50 uppercase">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="p-5 rounded-2xl border border-dashed border-primary/20 bg-primary/5 flex gap-4 items-start text-sm text-muted-foreground shadow-inner">
              <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <p className="leading-relaxed">Purchase includes lifetime access to the current version plus 12 months of prioritized updates.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-32 pt-20 border-t">
          <div className="mb-12 text-left">
            <h2 className="text-3xl font-black tracking-tight mb-2">More from {categoryName}</h2>
            <p className="text-muted-foreground">You might also be interested in these products.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {relatedProducts.slice(0, 3).map((rp) => (
              <div key={rp.id} className="group block">
                <article className="h-full space-y-4">
                  <Link href={`/shop/${category}/${rp.slug}`} className="block">
                    <div className="relative aspect-video overflow-hidden rounded-2xl border border-transparent group-hover:border-primary/20 transition-all cursor-pointer">
                      <Image
                        src={rp.imageUrl || ''}
                        alt={rp.title}
                        fill
                        className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  </Link>
                  <Link href={`/shop/${category}/${rp.slug}`} className="block">
                    <div className="space-y-2 text-left">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-xl tracking-tight group-hover:text-primary transition-colors">{rp.title}</h3>
                        <p className="font-black text-lg">${rp.price}</p>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {rp.description}
                      </p>
                    </div>
                  </Link>
                </article>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-32 border-t pt-20">
        <ContactMe />
      </div>
    </div>
    </>
  );
}