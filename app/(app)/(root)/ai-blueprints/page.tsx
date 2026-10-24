import HeadingTitle from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import { SITE_INFO } from "@/config/seo/site";
import BlueprintList from "@/features/blueprints/components/BlueprintList";
import { getBlueprints } from "@/features/blueprints/data/blueprintSource";
import FeaturedProductsSectionAsync from "@/features/shop/components/FeaturedProductsSectionAsync";
import { getPageMetadata } from "@/lib/seo/page-metadata";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import { Suspense } from "react";

// Validate SEO configuration to ensure all required fields are present
if (!HEAD || HEAD.length === 0) {
  console.error("⚠️ HEAD configuration is missing or empty");
}

// Content is static MDX from the repo - force static prerender, no ISR reads.
export const dynamic = "force-static";

// Define the current page for SEO configuration
const PAGE = "AI Blueprints";

// Get SEO configuration for the current page from the HEAD array
const page = HEAD.find((page: HeadType) => page.page === PAGE) as HeadType;

// HEAD is the single source of truth; title renders absolute so the root
// template never double-appends the brand.
export const metadata: Metadata = getPageMetadata(page);

function getItemListJsonLd(blueprints: { slug: string; title: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AI Blueprints",
    description:
      "Real AI agents and automation workflows, documented from architecture to implementation.",
    url: `${SITE_INFO.url}/ai-blueprints`,
    itemListElement: blueprints.map((blueprint, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_INFO.url}/ai-blueprints/${blueprint.slug}`,
      name: blueprint.title,
    })),
  };
}

export default async function AIBlueprintsPage() {
  const blueprints = getBlueprints();

  // Transform blueprints to serializable format for client components
  const serializableBlueprints = blueprints.map((blueprint) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { body, ...serializableBlueprint } = blueprint;
    return serializableBlueprint;
  });

  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getItemListJsonLd(serializableBlueprints)),
        }}
      />
      <HeadingTitle
        title="AI Blueprints"
        textStyleClassName="text-2xl font-bold sm:text-3xl"
        as="h1"
      />
      <p className="mx-auto max-w-2xl px-6 pt-6 text-center text-lg/8 text-foreground/80">
        Real AI agents and automation workflows, documented from architecture
        to implementation. See how they work, understand the trade-offs, and
        get the code when it&apos;s available.
      </p>
      <SeparatorHorizontal short={true} />
      <BlueprintList blueprints={serializableBlueprints} />
      <SeparatorHorizontal short={true} />
      <Suspense>
        <FeaturedProductsSectionAsync />
      </Suspense>
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
