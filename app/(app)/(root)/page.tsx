import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import Hero from "@/features/home/components/Hero";
import HeadingTitle from "@/components/HeadingTitle";
import FinalCTA from "@/features/home/components/FinalCTA";
import ProcessSection from "@/features/home/components/ProcessSection";
import SelectedWork from "@/features/home/components/SelectedWork";
import ServicesSection from "@/features/home/components/ServicesSection";
import UseCasesSection from "@/features/home/components/UseCasesSection";
import FeaturedProducts from "@/features/home/components/FeaturedProducts";
import LatestBlogPosts from "@/features/home/components/LatestBlogPosts";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

function SectionFallback() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading section"
      className="relative mx-auto max-w-5xl px-6 py-8 md:py-10"
    >
      <span className="sr-only">Loading…</span>
      <div
        aria-hidden="true"
        className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-3"
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// Content is static MDX from the repo - force static, no ISR reads.
export const dynamic = "force-static";

export const metadata: Metadata = {
  alternates: {
    canonical: siteConfig.url,
  },
};

export default function Home() {
  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <Hero />
      <SeparatorHorizontal short={true} />
      <SelectedWork />
      <SeparatorHorizontal short={true} />
      <UseCasesSection />
      <SeparatorHorizontal short={true} />
      <ServicesSection />
      <SeparatorHorizontal short={true} />
      <ProcessSection />
      <SeparatorHorizontal short={true} />
      <HeadingTitle title="Tools we've built" />
      <p className="mx-auto max-w-2xl px-6 text-center text-lg/8 text-foreground/80">
        Ready-made AI tools and workflows.{" "}
        <Link href="/shop" className="underline underline-offset-4">
          Visit the shop
        </Link>
        .
      </p>
      <SeparatorHorizontal short={true} />
      <Suspense fallback={<SectionFallback />}>
        <FeaturedProducts />
      </Suspense>
      <SeparatorHorizontal short={true} />
      <HeadingTitle title="Practical thinking about AI" />
      <p className="mx-auto max-w-2xl px-6 text-center text-lg/8 text-foreground/80">
        On AI systems, automation, and agents.{" "}
        <Link href="/blog" className="underline underline-offset-4">
          Read the blog
        </Link>
        .
      </p>
      <SeparatorHorizontal short={true} />
      <Suspense fallback={<SectionFallback />}>
        <LatestBlogPosts />
      </Suspense>
      <SeparatorHorizontal short={true} />
      <FinalCTA />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
