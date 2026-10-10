import { DocsLayout } from "@/components/fuma/fuma-layout";
import { DocsBody, DocsPage } from "@/components/fuma/fuma-page";
import HeadingTitle from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import { privacySource } from "@/features/privacy/data/privacySource";
import { getPageMetadata } from "@/lib/seo/page-metadata";
import { getMDXComponents } from "@/mdx-components";
import type { HeadType } from "@/types";
import type { TableOfContents } from "fumadocs-core/toc";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import LastModified from "@/components/LastModified";
import { changelogSource } from "@/features/changelog/data/changelogSource";

export const dynamic = "force-static";

// Validate SEO configuration to ensure all required fields are present
// This helps catch missing or incomplete SEO setup early
if (!HEAD || HEAD.length === 0) {
  console.error("⚠️ HEAD configuration is missing or empty");
}

// Define the current page for SEO configuration
const PAGE = "Changelog";

// Get SEO configuration for the current page from the HEAD array
const page = HEAD.find((page: HeadType) => page.page === PAGE) as HeadType;

// HEAD is the single source of truth; title renders absolute so the root
// template never double-appends the brand.
export const metadata: Metadata = getPageMetadata(page);

type MDXPageData = {
  body: ComponentType<{ code: unknown; components?: unknown }>;
  toc?: TableOfContents;
  title?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  lastModified?: string | number | Date;
};

export default async function ChangelogPage() {
  const page = changelogSource.getPage(["changelog"]);
  if (!page) notFound();

  const pageData = page.data as MDXPageData;
  const MDX = pageData.body;
  const title = pageData.title;

  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <main className="mx-auto flex flex-col">
        <HeadingTitle
          title={title ?? "Changelog"}
          textStyleClassName="text-3xl font-semibold md:text-4xl"
          gridId="grid-changelog"
          as="h1"
        />
        <SeparatorHorizontal short={true} />
        <div className="border-border relative min-h-52 max-w-full">
          <DocsLayout
            tree={privacySource.pageTree}
            containerProps={{ className: "relative bg-transparent" }}
          >
            <DocsPage toc={pageData.toc}>
              <DocsBody prose={false}>
                <MDX code={MDX} components={{ ...getMDXComponents() }} />
              </DocsBody>
            </DocsPage>
          </DocsLayout>
        </div>
      </main>
      <SeparatorHorizontal short={true} />
      <LastModified
        lastModified={pageData.lastModified ?? "2026-07-29"}
      />
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
