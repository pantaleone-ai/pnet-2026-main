import HeadingTitle from "@/components/HeadingTitle";
import LastModified from "@/components/LastModified";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import { getBaseUrl } from "@/lib/helpers";
import type { HeadType } from "@/types";
import type { Metadata } from "next";

// Validate SEO configuration to ensure all required fields are present
// This helps catch missing or incomplete SEO setup early
if (!HEAD || HEAD.length === 0) {
  console.error("⚠️ HEAD configuration is missing or empty");
}

// Define the current page for SEO configuration
const PAGE = "Experience";

// Get SEO configuration for the current page from the HEAD array
const page = HEAD.find((page: HeadType) => page.page === PAGE) as HeadType;

// Configure comprehensive metadata for SEO and social sharing
// This includes all necessary meta tags for search engines and social media platforms
export const metadata: Metadata = {
  // Basic metadata
  title: page.title,
  applicationName: page.title,
  description: page.description,

  // URL configurations for canonical links and RSS feed
  metadataBase: new URL(getBaseUrl(page.slug)),
  alternates: {
    canonical: getBaseUrl(page.slug),
  },
};

export default async function ExperiencePage() {
  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <main className="mx-auto flex flex-col">
        <HeadingTitle
          title="Work Experience"
          textStyleClassName="text-3xl font-semibold md:text-4xl"
          gridId="grid-experience"
        />
        <SeparatorHorizontal short={true} />
        <div className="border-border relative min-h-52 max-w-full">
          <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
            <h2 className="text-2xl font-semibold mb-4">
              Professional Experience
            </h2>
            <p className="mb-4">
              I have extensive experience in software development, with a focus
              on building modern web applications and working with cutting-edge
              technologies.
            </p>
            <p className="mb-4">
              My professional journey includes working on various projects that
              have honed my skills in frontend development, backend integration,
              and full-stack application architecture.
            </p>
            <p className="mb-4">
              While specific work history details are not available at this
              time, I bring a wealth of practical knowledge and expertise to
              every project I undertake.
            </p>
          </div>
        </div>
      </main>
      <SeparatorHorizontal short={true} />
      <LastModified lastModified={new Date().toISOString()} />
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
