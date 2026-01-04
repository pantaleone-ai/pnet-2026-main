import ContactMe from "@/components/ContactMe";
import Heading from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import { getBaseUrl } from "@/lib/helpers";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import Image from "next/image";
import Web from "@/features/about/components/Web";
import LastModified from "@/components/LastModified";

// Validate SEO configuration to ensure all required fields are present
// This helps catch missing or incomplete SEO setup early
if (!HEAD || HEAD.length === 0) {
  console.error("⚠️ HEAD configuration is missing or empty");
}

// Define the current page for SEO configuration
const PAGE = "About";

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


export default async function AboutMePage() {
  const defaultImage = "/images/horizontal-profile-about.jpg";
  const imageAlt =
    "Professional headshot of Tim, a Frontend Developer with 5 years of experience";

  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <main className="mx-auto flex flex-col">
        <div className="relative">
          {/* Mobile Image */}
          <div className="md:hidden">
            <Image
              alt={imageAlt}
              src={defaultImage}
              width={1000}
              height={750}
              className="aspect-4/3 w-full object-cover dark:grayscale"
              sizes="100vw"
              priority
            />
          </div>
          {/* Desktop Image */}
          <div className="hidden md:block">
            <Image
              alt={imageAlt}
              src={defaultImage}
              width={1000}
              height={500}
              className="w-full object-cover md:h-auto md:max-h-96 dark:grayscale"
              sizes="100vw"
              priority
            />
          </div>
        </div>
        <SeparatorHorizontal short={true} />
        <Heading
          title="Hello, I'm Tim"
          textStyleClassName="text-3xl font-semibold md:text-4xl"
          gridId="grid-about"
        />
        <SeparatorHorizontal short={true} />
        <div className="border-border relative min-h-52 max-w-full">
          <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
            <h2 className="text-2xl font-semibold mb-4">About Me</h2>
            <p className="mb-4">
              I'm a passionate developer with expertise in building modern web applications.
              My journey in software development has led me to work on various exciting projects.
            </p>
            <p className="mb-6">
              Below you can explore some of the web applications I've developed:
            </p>
            <Web />
          </div>
        </div>
      </main>
      <SeparatorHorizontal short={true} />
      <LastModified lastModified={new Date().toISOString()} />
      <SeparatorHorizontal short={true} />
      <ContactMe />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
