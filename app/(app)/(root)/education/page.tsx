import HeadingTitle from "@/components/HeadingTitle";
import LastModified from "@/components/LastModified";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import { getBaseUrl } from "@/lib/helpers";
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

export default async function EducationPage() {
  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <main className="mx-auto flex flex-col">
        <HeadingTitle
          title="Education"
          textStyleClassName="text-3xl font-semibold md:text-4xl"
          gridId="grid-education"
        />
        <SeparatorHorizontal short={true} />
        <div className="border-border relative min-h-52 max-w-full">
          <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
            <h2 className="text-2xl font-semibold mb-4">My Education</h2>
            <p className="mb-4">
              I have a strong foundation in computer science and software
              development. My educational background has equipped me with the
              skills to build modern web applications.
            </p>
            <p className="mb-4">
              While specific academic details are not available at this time, I
              continuously learn and stay updated with the latest technologies
              and best practices in the software development industry.
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
