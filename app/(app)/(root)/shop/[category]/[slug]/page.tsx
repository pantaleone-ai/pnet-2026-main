import HEAD from "@/config/seo/head";
import { siteConfig } from "@/config/site";
import { getProductBySlug, getProductsByCategory, getCategories, getProducts } from "@/features/shop/data/shopSource";
import { getBaseUrl } from "@/lib/helpers";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailClient from "@/features/shop/components/ProductDetailClient";

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
      description: product.description || "Shop AI products",
      images: [
        {
          url: product.imageUrl || "/summary_large_image.png",
          width: 1200,
          height: 630,
          alt: product.title,
        },
      ],
      url: url,
      type: "website",
      siteName: siteConfig.name,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.title} - ${pageConfig.title}`,
      description: product.description || "Shop AI products",
      images: [product.imageUrl || "/summary_large_image.png"],
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
  const rawProduct = getProductBySlug(category, slug);

  if (!rawProduct) return notFound();

  // FIX: Destructure 'body' immediately.
  // We keep 'body' as a local variable and
  // 'product' remains a plain, serializable object for everything else.
  const { body, ...product } = rawProduct;

  const relatedProducts = getProductsByCategory(category)
    .filter(p => p.slug !== slug);

  const formatCategoryName = (s: string) =>
    decodeURIComponent(s).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const categoryName = formatCategoryName(category);

  return <ProductDetailClient
    product={product}
    categoryName={categoryName}
    category={category}
    relatedProducts={relatedProducts}
  />;
}
