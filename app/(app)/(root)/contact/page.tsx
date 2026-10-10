import HeadingTitle from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import { getPageMetadata } from "@/lib/seo/page-metadata";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import { ContactForm } from "@/features/contact/ContactForm";
import ContactMe from "@/components/ContactMe";

export const dynamic = "force-static";

// Validate SEO configuration to ensure all required fields are present
// This helps catch missing or incomplete SEO setup early
if (!HEAD || HEAD.length === 0) {
  console.error("⚠️ HEAD configuration is missing or empty");
}

// Define the current page for SEO configuration
const PAGE = "Contact";

// Get SEO configuration for the current page from the HEAD array
const page = HEAD.find((page: HeadType) => page.page === PAGE) as HeadType;

// HEAD is the single source of truth; title renders absolute so the root
// template never double-appends the brand.
export const metadata: Metadata = getPageMetadata(page, "/contact.md");

export default async function ContactPage() {
  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <link rel="alternate" type="text/markdown" href="/contact.md" />
      <link rel="describedby" href="/llms.txt" />
      <main className="mx-auto flex flex-col">
        <HeadingTitle
          title={"Contact"}
          textStyleClassName="text-3xl font-semibold md:text-4xl"
          gridId="grid-contact"
          as="h1"
        />
        <SeparatorHorizontal short={true} />
        <p className="mx-auto max-w-2xl px-4 pt-6 text-left text-base text-foreground/80">
          Have a project? Tell me what you&apos;re building. I reply within
          two business days.
        </p>
        <div className="border-border relative min-h-52 max-w-full">
          <ContactForm />
        </div>
      </main>
      <SeparatorHorizontal short={true} />
      <ContactMe showSocialLinks={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
