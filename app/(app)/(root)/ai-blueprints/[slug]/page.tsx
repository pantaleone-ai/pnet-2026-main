import { DocsLayout } from "@/components/fuma/fuma-layout";
import { DocsBody, DocsPage } from "@/components/fuma/fuma-page";
import LastModified from "@/components/LastModified";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import { SITE_INFO } from "@/config/seo/site";
import { USER } from "@/config/user";
import BlogPostMetaData from "@/features/blog/components/BlogPostMetaData";
import BlogPostNavigation from "@/features/blog/components/BlogPostNavigation";
import BlogPostTitle from "@/features/blog/components/BlogPostTitle";
import BlueprintAnalytics from "@/features/blueprints/components/BlueprintAnalytics";
import {
  blueprintSource,
  getBlueprints,
} from "@/features/blueprints/data/blueprintSource";
import FeaturedProductsSectionAsync from "@/features/shop/components/FeaturedProductsSectionAsync";
import { ConsultationCTA } from "@/components/mdx/ConsultationCTA";
import type { BlueprintFrontmatter } from "@/features/blueprints/types/BlueprintFrontmatter";
import type { BlueprintType } from "@/features/blueprints/types/BlueprintType";
import { getBaseUrl } from "@/lib/helpers";
import { getMDXComponents } from "@/mdx-components";
import type { MDXComponents } from "mdx/types";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { TechArticle, WithContext } from "schema-dts";

// Only pre-render slugs that exist in the repo; anything else 404s
// statically instead of triggering on-demand ISR generation.
export const dynamic = "force-static";
export const dynamicParams = false;

// Fallback only: used when a blueprint has no frontmatter image.
const BLUEPRINT_PLACEHOLDER_IMAGE = "/images/logo.png";

const TYPE_LABELS: Record<BlueprintFrontmatter["blueprintType"], string> = {
  "ai-agent": "AI Agent",
  "automation-workflow": "Automation Workflow",
  "agentic-workflow": "Agentic Workflow",
};

export async function generateStaticParams() {
  const blueprints = getBlueprints();
  return blueprints.map((blueprint) => ({
    slug: blueprint.slug,
  }));
}

interface BlueprintPageProps {
  params: Promise<{
    slug: string;
  }>;
}

function getPageJsonLd(blueprint: BlueprintType): WithContext<TechArticle> {
  const canonicalUrl = `${SITE_INFO.url}/ai-blueprints/${blueprint.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": `${canonicalUrl}#article`,
    headline: blueprint.title,
    description: blueprint.description,
    image: blueprint.image || BLUEPRINT_PLACEHOLDER_IMAGE,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    isPartOf: {
      "@type": "CollectionPage",
      "@id": `${SITE_INFO.url}/ai-blueprints#collection`,
      name: "AI Blueprints",
      url: `${SITE_INFO.url}/ai-blueprints`,
    },
    datePublished: new Date(blueprint.created).toISOString(),
    dateModified: new Date(
      blueprint.lastUpdated || blueprint.created,
    ).toISOString(),
    author: {
      "@type": "Person",
      "@id": `${SITE_INFO.url}/#person`,
      name: USER.displayName,
      identifier: USER.username,
      image: USER.avatar,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_INFO.url}/#organization`,
      name: "Pantaleone Digital Services LLC",
      url: SITE_INFO.url,
    },
  };
}

function getBreadcrumbJsonLd(blueprint: BlueprintType) {
  const canonicalUrl = `${SITE_INFO.url}/ai-blueprints/${blueprint.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_INFO.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "AI Blueprints",
        item: `${SITE_INFO.url}/ai-blueprints`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: blueprint.title,
        item: canonicalUrl,
      },
    ],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = blueprintSource.getPage([slug]);
  if (!page) {
    return notFound();
  }
  const data = page.data as unknown as BlueprintFrontmatter;
  const description = data.description?.trim()
    ? `${data.description.slice(0, 150)}${data.description.length > 150 ? "..." : ""}`
    : "A documented AI agent or automation workflow: architecture, implementation, and code.";
  const imageUrl = data.image?.startsWith("http")
    ? data.image
    : getBaseUrl(data.image || BLUEPRINT_PLACEHOLDER_IMAGE);

  return {
    title: `${data.title} | ${TYPE_LABELS[data.blueprintType]}`,
    description,
    keywords:
      data.seo?.join(", ") ||
      [...(data.techStacks ?? []), ...(data.integrations ?? [])].join(", ") ||
      "ai blueprint, automation workflow, ai agent",
    alternates: {
      canonical: getBaseUrl(`ai-blueprints/${slug}`),
      types: {
        "text/markdown": getBaseUrl(`ai-blueprints.mdx/${slug}`),
      },
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: data.title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: data.title,
          type: "image/png",
        },
      ],
      type: "article",
      url: getBaseUrl(`ai-blueprints/${slug}`),
    },
    twitter: {
      card: "summary_large_image",
      title: data.title,
      description,
      images: [imageUrl],
    },
    other: {
      "og:logo": "summary_large_image.png",
    },
  };
}

export default async function BlueprintPage({ params }: BlueprintPageProps) {
  const { slug } = await params;
  const blueprints = getBlueprints().sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
  );
  const blueprintIndex = blueprints.findIndex((b) => b.slug === slug);
  const blueprint = blueprints[blueprintIndex];
  const page = blueprintSource.getPage([slug]);

  if (!blueprint || !page) {
    return notFound();
  }

  const nextBlueprint = blueprints[blueprintIndex - 1]; // Newer
  const prevBlueprint = blueprints[blueprintIndex + 1]; // Older

  const MDXContent = blueprint.body as React.FC<{ components: MDXComponents }>;

  // Remove the body function from the blueprint object to avoid
  // serialization errors in the shared navigation component.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { body: _body, ...blueprintWithoutBody } = blueprint;

  const prevWithoutBody = prevBlueprint
    ? // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (({ body: _b, ...rest }) => rest)(prevBlueprint)
    : undefined;

  const nextWithoutBody = nextBlueprint
    ? // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (({ body: _b, ...rest }) => rest)(nextBlueprint)
    : undefined;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getPageJsonLd(blueprint)).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getBreadcrumbJsonLd(blueprint)).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />
      <BlueprintAnalytics
        slug={blueprint.slug}
        title={blueprint.title}
        blueprintType={blueprint.blueprintType}
      />
      <SeparatorHorizontal borderTop={false} short={true} />
      <main className="mx-auto flex flex-col">
        <BlogPostNavigation
          post={blueprintWithoutBody}
          previous={prevWithoutBody}
          next={nextWithoutBody}
          basePath="/ai-blueprints"
        />
        <SeparatorHorizontal short={true} />
        <Image
          alt={blueprint.title}
          src={blueprint.image || BLUEPRINT_PLACEHOLDER_IMAGE}
          width={1000}
          height={500}
          className="h-auto max-h-96 w-full object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1000px"
          priority
        />
        <SeparatorHorizontal short={true} />
        <BlogPostMetaData
          authorImage={USER.avatar}
          authorName={blueprint.author || "Pantaleone.net"}
          date={blueprint.created}
          category={blueprint.category ?? "General"}
          readTime={blueprint.readingTimeMinutes}
        />
        <div className="flex flex-wrap items-center gap-2 px-4 pt-2 sm:px-6">
          <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground">
            {TYPE_LABELS[blueprint.blueprintType]}
          </span>
          <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
            {blueprint.hasCodePackage ? "Code included" : "Guide"}
          </span>
        </div>
        <SeparatorHorizontal short={true} />
        <BlogPostTitle
          title={blueprint.title}
          textStyleClassName="text-2xl font-semibold md:text-3xl"
          gridId="grid-blueprint-heading"
        />
        <SeparatorHorizontal short={true} />
        <div className="mx-auto w-full max-w-5xl">
          <DocsLayout tree={blueprintSource.pageTree}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <DocsPage toc={(page.data as any).toc ?? []}>
              <DocsBody>
                <MDXContent components={getMDXComponents()} />
              </DocsBody>
            </DocsPage>
          </DocsLayout>
          <div className="mx-auto w-full max-w-3xl px-6 py-8">
            <ConsultationCTA />
          </div>
        </div>
      </main>
      <SeparatorHorizontal short={true} />
      <LastModified
        lastModified={blueprint.lastUpdated ?? blueprint.created ?? "2026-10-24"}
      />
      <SeparatorHorizontal short={true} />
      <Suspense>
        <FeaturedProductsSectionAsync />
      </Suspense>
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
