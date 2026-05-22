"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ShoppingCart,
  ExternalLink,
  Box,
  Cpu,
  ChevronRight,
  Info,
  Clock,
  BookOpen,
  Server,
  Cloud,
} from "lucide-react";
import { ProductImageGallery } from "@/features/shop/components/ProductImageGallery";
import ProductCard from "./ProductCard";
import { track } from "@/lib/analytics";
import type { Product, WithContext } from "schema-dts";
import type { ShopProduct } from "@/features/shop/types/ShopProduct";

function getSoftwareApplicationJsonLd(
  product: ShopProduct,
  canonicalUrl: string,
): any {
  const images: string[] = [];
  if (product.imageUrl) images.push(product.imageUrl);
  const additionalImages = product.additionalImages ?? [];
  additionalImages.forEach((img) => {
    if (!images.includes(img.url)) images.push(img.url);
  });
  if (images.length === 0) images.push("/summary_large_image.png");

  const softwareApp: any = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: product.title,
    description: product.description,
    image: images,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web Browser, Node.js, Next.js",
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency || "USD",
      availability:
        product.inventory === 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      url: canonicalUrl,
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: 0,
          currency: "USD",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "US",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 2,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 0,
            unitCode: "DAY",
          },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "US",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 30,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
    author: {
      "@type": "Organization",
      name: "Pantaleone Digital Services",
      url: "https://pantaleone.net",
    },
  };

  if (product.sku) softwareApp.sku = product.sku;
  if (product.coreStack?.length) {
    softwareApp.softwareVersion = product.coreStack.join(", ");
  }
  if (product.targetKeywords?.length) {
    softwareApp.keywords = product.targetKeywords.join(", ");
  }
  if (product.timeToValue) {
    softwareApp.timeToValue = product.timeToValue;
  }

  return softwareApp;
}

function getProductJsonLd(
  product: ShopProduct,
  canonicalUrl: string,
): WithContext<Product> {
  const images: string[] = [];
  if (product.imageUrl) images.push(product.imageUrl);
  const additionalImages = product.additionalImages ?? [];
  additionalImages.forEach((img) => {
    if (!images.includes(img.url)) images.push(img.url);
  });
  if (images.length === 0) images.push("/summary_large_image.png");

  const offer: any = {
    "@type": "Offer",
    price: product.price,
    priceCurrency: product.currency || "USD",
    availability: product.isDigital
      ? "https://schema.org/InStock"
      : product.inventory === 0
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    url: canonicalUrl,
    itemCondition: "https://schema.org/NewCondition",
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: 0,
        currency: "USD",
      },
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: "US",
      },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: {
          "@type": "QuantitativeValue",
          minValue: 0,
          maxValue: 2,
          unitCode: "DAY",
        },
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: 0,
          maxValue: 0,
          unitCode: "DAY",
        },
      },
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "US",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 30,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/FreeReturn",
    },
  };

  if (product.priceValidUntil) offer.priceValidUntil = product.priceValidUntil;
  if (product.itemCondition) {
    offer.itemCondition = `https://schema.org/${product.itemCondition}`;
  } else if (product.isDigital !== false) {
    offer.itemCondition = "https://schema.org/NewCondition";
  }

  const brand: any = { "@type": "Brand", name: "Pantaleone Digital Services" };
  if (product.brandLogo) brand.logo = product.brandLogo;

  const productData: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: images,
    offers: offer,
    brand: brand,
    category: product.category,
  };

  if (product.sku) productData.sku = product.sku;
  if (product.mpn) productData.mpn = product.mpn;
  if (product.gtin) productData.gtin = product.gtin;

  const techStacks = product.techStacks ?? [];
  if (techStacks.length > 0) {
    productData.additionalProperty = techStacks.map((tech: string) => ({
      "@type": "PropertyValue",
      name: "Technology",
      value: tech,
    }));
  }

  return productData;
}

/** * Client Component for Interactive Features */
export default function ProductDetailClient({
  product,
  categoryName,
  category,
  relatedProducts,
  children,
}: {
  product: ShopProduct;
  categoryName: string;
  category: string;
  relatedProducts: ShopProduct[];
  children: React.ReactNode;
}) {
  // Track product view on component mount
  useEffect(() => {
    track.productView({
      id: String(product.id || product.slug || "unknown"),
      name: product.title,
      category: category,
      price: product.price,
      currency: product.currency || "USD",
      brand: "Pantaleone Digital Services",
    });
  }, [
    product.id,
    product.slug,
    product.title,
    product.price,
    product.currency,
    category,
  ]);

  // Handle payment link click tracking
  const handlePaymentClick = () => {
    track.addToCart({
      id: String(product.id || product.slug || "unknown"),
      name: product.title,
      category: category,
      price: product.price,
      currency: product.currency || "USD",
      brand: "Pantaleone Digital Services",
    });
    track.beginCheckout({
      id: String(product.id || product.slug || "unknown"),
      name: product.title,
      category: category,
      price: product.price,
      currency: product.currency || "USD",
      brand: "Pantaleone Digital Services",
    });
  };

  // Build canonical URL for product page
  const canonicalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://pantaleone.net"}/shop/${category}/${product.slug}`;

  // Use SoftwareApplication schema for Apps, Product for others
  const jsonLdData = categoryName.toLowerCase().includes("app")
    ? getSoftwareApplicationJsonLd(product, canonicalUrl)
    : getProductJsonLd(product, canonicalUrl);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdData).replace(/</g, "\\u003c"),
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-10 overflow-x-auto whitespace-nowrap pb-2">
          <Link href="/shop" className="hover:text-primary transition-colors">
            Shop
          </Link>
          <ChevronRight className="h-4 w-4 shrink-0" />
          <Link
            href={`/shop/${category}`}
            className="hover:text-primary transition-colors"
          >
            {categoryName}
          </Link>
          <ChevronRight className="h-4 w-4 shrink-0" />
          <span className="text-foreground font-medium truncate">
            {product.title}
          </span>
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
                  <span className="text-4xl font-black tracking-tighter">
                    ${product.price}
                  </span>
                  <span className="text-muted-foreground font-bold text-lg uppercase">
                    {product.currency}
                  </span>
                </div>
                {(product.stripePaymentLink || product.purchaseUrl) && (
                  <Button
                    size="lg"
                    className="text-xl font-bold h-16 w-full shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                    asChild
                  >
                    <Link
                      href={
                        product.stripePaymentLink || product.purchaseUrl || "#"
                      }
                      target="_blank"
                      onClick={handlePaymentClick}
                    >
                      <ShoppingCart className="mr-3 h-5 w-5" /> Get Instant
                      Access
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
                    alt: product.imageAlt || product.title,
                  }}
                  additionalImages={product.additionalImages}
                />
              )}
            </section>

            <section className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight">
                  {product.title}
                </h1>
                <p className="text-xl font-medium text-primary/80">
                  Product Overview
                </p>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
                {product.description}
              </p>
            </section>

            {/* Product Content */}
            <section className="pt-10 border-t">{children}</section>

            {/* Technical Manifest Section */}
            {(product.timeToValue ||
              product.coreStack ||
              product.primaryLibraries ||
              product.infrastructureRequirements ||
              product.targetKeywords) && (
              <section className="pt-10 border-t space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black tracking-tight">
                    Technical Manifest
                  </h2>
                  <p className="text-muted-foreground">
                    Complete technical specifications for this product
                  </p>
                </div>

                {/* Time-to-Value Metric */}
                {product.timeToValue && (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Clock className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold mb-1">
                          Time-to-Value
                        </h3>
                        <p className="text-3xl font-black text-primary">
                          Saves ~{product.timeToValue} hours
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          of manual boilerplate and configuration work
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Core Stack */}
                {product.coreStack && product.coreStack.length > 0 && (
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-secondary rounded-lg mt-1">
                      <Server className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold mb-3">Core Stack</h4>
                      <div className="flex flex-wrap gap-2">
                        {product.coreStack.map((tech) => (
                          <span
                            key={tech}
                            className="px-3 py-1.5 rounded-md text-sm font-semibold bg-secondary text-secondary-foreground border"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Primary Libraries */}
                {product.primaryLibraries &&
                  product.primaryLibraries.length > 0 && (
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-secondary rounded-lg mt-1">
                        <Box className="h-5 w-5 text-secondary-foreground" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold mb-3">Primary Libraries</h4>
                        <div className="flex flex-wrap gap-2">
                          {product.primaryLibraries.map((lib) => (
                            <span
                              key={lib}
                              className="px-3 py-1.5 rounded-md text-sm font-semibold bg-secondary text-secondary-foreground border"
                            >
                              {lib}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                {/* Infrastructure Requirements */}
                {product.infrastructureRequirements &&
                  product.infrastructureRequirements.length > 0 && (
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-secondary rounded-lg mt-1">
                        <Cloud className="h-5 w-5 text-secondary-foreground" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold mb-3">
                          Infrastructure Requirements
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {product.infrastructureRequirements.map((req) => (
                            <span
                              key={req}
                              className="px-3 py-1.5 rounded-md text-sm font-semibold bg-secondary text-secondary-foreground border"
                            >
                              {req}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                {/* Target Keywords */}
                {product.targetKeywords &&
                  product.targetKeywords.length > 0 && (
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-secondary rounded-lg mt-1">
                        <BookOpen className="h-5 w-5 text-secondary-foreground" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold mb-3">Target Keywords</h4>
                        <div className="flex flex-wrap gap-2">
                          {product.targetKeywords.map((kw) => (
                            <span
                              key={kw}
                              className="px-3 py-1.5 rounded-md text-sm font-semibold bg-muted text-muted-foreground border"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
              </section>
            )}

            {/* Architecture Diagram */}
            {product.architectureDiagram && (
              <section className="pt-10 border-t">
                <div className="space-y-2 mb-6">
                  <h2 className="text-2xl font-black tracking-tight">
                    Architecture Overview
                  </h2>
                  <p className="text-muted-foreground">
                    Visual representation of product integration
                  </p>
                </div>
                <div className="bg-muted/30 rounded-2xl p-6 overflow-x-auto">
                  <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                    {product.architectureDiagram}
                  </pre>
                </div>
              </section>
            )}

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
                    <span className="text-5xl font-black tracking-tighter">
                      ${product.price}
                    </span>
                    <span className="text-muted-foreground font-bold text-lg uppercase">
                      {product.currency}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-8">
                  <div className="space-y-4 pt-2">
                    {(product.stripePaymentLink || product.purchaseUrl) && (
                      <Button
                        size="lg"
                        className="text-xl lg:text-xl text-2xl font-bold h-20 lg:h-16 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                        asChild
                      >
                        <Link
                          href={
                            product.stripePaymentLink ||
                            product.purchaseUrl ||
                            "#"
                          }
                          target="_blank"
                          onClick={handlePaymentClick}
                        >
                          <ShoppingCart className="mr-3 h-5 w-5" /> Get Instant
                          Access
                        </Link>
                      </Button>
                    )}
                    <div className="grid grid-cols-1 gap-4 pl-4">
                      {product.websiteUrl && (
                        <Button
                          variant="secondary"
                          size="lg"
                          className="font-semibold"
                          asChild
                        >
                          <Link href={product.websiteUrl} target="_blank">
                            <ExternalLink className="mr-2 h-4 w-4" /> Live Demo
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="pt-8 border-t space-y-6 text-sm pl-4">
                    <div className="flex items-start gap-4">
                      <Box className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="text-left">
                        <p className="font-bold text-foreground">
                          Delivery Method
                        </p>
                        <p className="text-muted-foreground">
                          {product.isDigital
                            ? "Instant Digital Download"
                            : "Physical Shipment"}
                        </p>
                      </div>
                    </div>

                    {product.techStacks && (
                      <div className="flex items-start gap-4">
                        <Cpu className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div className="text-left space-y-3">
                          <p className="font-bold text-foreground">
                            Technology Stack
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {product.techStacks.map((tech: string) => (
                              <span
                                key={tech}
                                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-secondary text-secondary-foreground border border-border/50 uppercase"
                              >
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
                <p className="leading-relaxed">
                  Purchase includes lifetime access to the current version plus
                  12 months of prioritized updates.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-32 pt-20 border-t">
            <div className="mb-12 text-left">
              <h2 className="text-3xl font-black tracking-tight mb-2">
                More from {categoryName}
              </h2>
              <p className="text-muted-foreground">
                You might also be interested in these products.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {relatedProducts.slice(0, 3).map((rp, idx) => (
                <ProductCard key={rp.id} product={rp} categorySlug={category} listName="related-products" index={idx} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
