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
const PAGE = "Education";

// Get SEO configuration for the current page from the HEAD array
const page = HEAD.find((page: HeadType) => page.page === PAGE) as HeadType;

// HEAD is the single source of truth; title renders absolute so the root
// template never double-appends the brand.
export const metadata: Metadata = getPageMetadata(page);

export default async function EducationPage() {
  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <main className="mx-auto flex flex-col">
        <HeadingTitle
          title="Education"
          textStyleClassName="text-3xl font-semibold md:text-4xl"
          gridId="grid-education"
          as="h1"
        />
        <SeparatorHorizontal short={true} />
        <div className="border-border relative min-h-52 max-w-full">
          <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
            <h2 className="text-2xl font-semibold mb-4">Education</h2>
            <p className="mb-4">
              Computer science foundation with a focus on systems design and
              software engineering. Most of what I use daily — LangChain,
              N8N, LLM deployment — was learned by building production systems,
              not in a classroom.
            </p>
            <p className="mb-4">
              I stay current through hands-on work: shipping AI agents,
              iterating on automation pipelines, and reading research papers
              when the problem demands it.
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
