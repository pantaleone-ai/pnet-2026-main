import ContactMe from "@/components/ContactMe";
import HEAD from "@/config/seo/head";
import { getProductBySlug, getProductsByCategory, getCategories, getProducts } from "@/features/shop/data/shopSource";
import { getBaseUrl } from "@/lib/helpers";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, ExternalLink, Github, Box, Cpu, ChevronRight, Info, CheckCircle2 } from "lucide-react";
import { DocsBody } from "@/components/fuma/fuma-page";
import { getMDXComponents } from "@/mdx-components";
import type { MDXComponents } from "mdx/types";
import React from "react";

/** * SEO Logic */
const PAGE = "Shop";
const pageConfig = HEAD.find((p: HeadType) => p.page === PAGE);

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

  if (!product || !pageConfig) return { title: "Product Not Found" };

  const url = getBaseUrl(`shop/${category}/${slug}`);

  return {
    title: `${product.title} - ${pageConfig.title}`,
    description: product.description || "Shop AI products",
    alternates: { canonical: url },
    openGraph: {
      title: `${product.title} - ${pageConfig.title}`,
      images: [{ url: product.imageUrl || "/summary_large_image.png" }],
      url: url,
      type: "website",
    },
  };
}

/** * Page Component */
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const product = getProductBySlug(category, slug);
  const relatedProducts = getProductsByCategory(category).filter(p => p.slug !== slug);

  if (!product) return notFound();

  const formatCategoryName = (s: string) => decodeURIComponent(s).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const categoryName = formatCategoryName(category);
  const MDXContent = product.body as React.FC<{ components: MDXComponents }> | undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb - Left Aligned */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-10 overflow-x-auto whitespace-nowrap pb-2">
        <Link href="/shop" className="hover:text-primary transition-colors">Shop</Link>
        <ChevronRight className="h-4 w-4 shrink-0" />
        <Link href={`/shop/${category}`} className="hover:text-primary transition-colors">{categoryName}</Link>
        <ChevronRight className="h-4 w-4 shrink-0" />
        <span className="text-foreground font-medium truncate">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* LEFT COLUMN: Main Content */}
        <div className="lg:col-span-7 space-y-12 text-left">
          {/* Hero Media */}
          <section>
            {product.imageUrl && (
              <div className="relative aspect-video overflow-hidden rounded-2xl border bg-muted shadow-sm group">
                <Image
                  alt={product.imageAlt || product.title}
                  src={product.imageUrl}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                  priority
                />
              </div>
            )}
          </section>

          {/* Product Header & Description */}
          <section className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight">{product.title}</h1>
              <p className="text-xl font-medium text-primary/80">Product Overview</p>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
              {product.description}
            </p>
          </section>

          {/* Features & Specs Section */}
          {MDXContent && (
            <section className="pt-10 border-t">
              <div className="flex items-center gap-2 mb-8">
                <CheckCircle2 className="h-6 w-6 text-primary" />
                <h3 className="text-2xl font-bold">Features & Specs</h3>
              </div>
              
              {/* Added 'prose-p:text-left' and 'prose-li:text-left' to force list alignment */}
              <div className="bg-card rounded-xl border p-6 md:p-10 shadow-sm prose prose-invert max-w-none prose-p:text-left prose-li:text-left prose-headings:text-left">
                <DocsBody>
                  <MDXContent components={getMDXComponents()} />
                </DocsBody>
              </div>
            </section>
          )}

          {/* Demo Section */}
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
        <div className="lg:col-span-5">
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
                <div className="mt-8 flex items-baseline gap-2">
                  <span className="text-5xl font-black tracking-tighter">${product.price}</span>
                  <span className="text-muted-foreground font-bold text-lg uppercase">{product.currency}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-8">
                <div className="space-y-4 pt-2">
                  {product.purchaseUrl && (
                    <Button size="lg" className="w-full text-xl font-bold h-16 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform" asChild>
                      <Link href={product.purchaseUrl} target="_blank">
                        <ShoppingCart className="mr-3 h-5 w-5" /> Get Instant Access
                      </Link>
                    </Button>
                  )}
                  <div className="grid grid-cols-2 gap-4">
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

                {/* Info List - Left Aligned */}
                <div className="pt-8 border-t space-y-6 text-sm">
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
                          {product.techStacks.map(tech => (
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

            {/* Support Callout */}
            <div className="p-5 rounded-2xl border border-dashed border-primary/20 bg-primary/5 flex gap-4 items-start text-sm text-muted-foreground shadow-inner">
              <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <p className="leading-relaxed">Purchase includes lifetime access to the current version plus 12 months of prioritized updates and community support.</p>
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
              <Link key={rp.id} href={`/shop/${category}/${rp.slug}`} className="group block">
                <article className="h-full space-y-4">
                  <div className="relative aspect-video overflow-hidden rounded-2xl border border-transparent group-hover:border-primary/20 transition-all">
                    <Image 
                        src={rp.imageUrl || ''} 
                        alt={rp.title} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                  </div>
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-xl tracking-tight group-hover:text-primary transition-colors">{rp.title}</h3>
                        <p className="font-black text-lg">${rp.price}</p>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {rp.description}
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-32 border-t pt-20">
        <ContactMe />
      </div>
    </div>
  );
}