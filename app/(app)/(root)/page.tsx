import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import Hero from "@/features/home/components/Hero";
import HeadingTitle from "@/components/HeadingTitle";
// import ContactMe from "@/components/ContactMe";
import FeaturedApps from "@/features/home/components/FeaturedApps";
import FeaturedProducts from "@/features/home/components/FeaturedProducts";
import FeaturedStoriesWrapper from "@/features/home/components/FeaturedStoriesWrapper";
import { WhatPeopleSay } from "@/features/home/components/WhatPeopleSay";
// import { FaqSection } from "@/features/home/components/FAQ";
import LatestBlogPosts from "@/features/home/components/LatestBlogPosts";
import ClientLogos from "@/features/home/components/ClientLogos";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

function SectionFallback() {
  return (
    <div className="relative mx-auto max-w-7xl px-6 py-8 md:py-10 lg:px-8">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// Content is static MDX from the repo - force static, no ISR reads.
export const dynamic = "force-static";

export default function Home() {
  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <Hero />
      <SeparatorHorizontal short={true} />
      <HeadingTitle title="AI Agents, Workflows & Apps" />
      <SeparatorHorizontal short={true} />
      <Suspense fallback={<SectionFallback />}>
        <FeaturedStoriesWrapper />
      </Suspense>
      <SeparatorHorizontal short={true} />
      <Suspense fallback={<SectionFallback />}>
        <FeaturedProducts />
      </Suspense>
      <SeparatorHorizontal short={true} />
      <HeadingTitle title="Pantaleone AI Projects" />
      <SeparatorHorizontal short={true} />
      <Suspense fallback={<SectionFallback />}>
        <FeaturedApps />
      </Suspense>
      <SeparatorHorizontal short={true} />
      <HeadingTitle title="Latest Automation Blog Posts" />
      <SeparatorHorizontal short={true} />
      <Suspense fallback={<SectionFallback />}>
        <LatestBlogPosts />
      </Suspense>
      <SeparatorHorizontal short={true} />
      <ClientLogos />
      <SeparatorHorizontal short={true} />
      <HeadingTitle title="What People Are Saying" />
      <SeparatorHorizontal short={true} />
      <WhatPeopleSay />
      {/* <SeparatorHorizontal /> */}
      {/* <HeadingTitle title="FAQ" />
      <SeparatorHorizontal short={true} />
      <FaqSection />
      <SeparatorHorizontal short={true} />
      <ContactMe />
      <SeparatorHorizontal borderBottom={false} /> */}
    </>
  );
}
