import HeadingTitle from "@/components/HeadingTitle";
import LastModified from "@/components/LastModified";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import { getPageMetadata } from "@/lib/seo/page-metadata";
import type { HeadType } from "@/types";
import type { Metadata } from "next";

export const dynamic = "force-static";

// Validate SEO configuration to ensure all required fields are present
// This helps catch missing or incomplete SEO setup early
if (!HEAD || HEAD.length === 0) {
  console.error("⚠️ HEAD configuration is missing or empty");
}

// Define the current page for SEO configuration
const PAGE = "Experience";

// Get SEO configuration for the current page from the HEAD array
const page = HEAD.find((page: HeadType) => page.page === PAGE) as HeadType;

// HEAD is the single source of truth; title renders absolute so the root
// template never double-appends the brand. The `| Matt Pantaleone` suffix
// here is intentional: it preserves personal authorship on this page while
// every other route uses the short `| Pantaleone` suffix.
export const metadata: Metadata = getPageMetadata(page);

export default async function ExperiencePage() {
  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <main className="mx-auto flex flex-col">
        <HeadingTitle
          title="Work Experience"
          textStyleClassName="text-3xl font-semibold md:text-4xl"
          gridId="grid-experience"
          as="h1"
        />
        <SeparatorHorizontal short={true} />
        <div className="border-border relative min-h-52 max-w-full">
          <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
            <h2 className="text-2xl font-semibold mb-4">
              Professional Experience
            </h2>
            <p className="mb-4">
              Most of my career has been spent building and shipping software
              — frontend, backend, and the infrastructure in between. Recent
              years have focused almost entirely on AI systems: autonomous
              agents, LLM integrations, and production automation.
            </p>
            <p className="mb-4">
              I&apos;ve worked with clients ranging from startups to large
              enterprises, building things like document processing pipelines,
              conversational agents, and internal tooling that runs without
              human intervention.
            </p>
          </div>
        </div>
      </main>
      <SeparatorHorizontal short={true} />
      <LastModified lastModified="2026-07-29" />
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
