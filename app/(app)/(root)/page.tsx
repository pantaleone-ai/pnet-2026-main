import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import Hero from "@/features/home/components/Hero";
import HeadingTitle from "@/components/HeadingTitle";
import FinalCTA from "@/features/home/components/FinalCTA";
import ProblemSection from "@/features/home/components/ProblemSection";
import ProcessSection from "@/features/home/components/ProcessSection";
import ServicesSection from "@/features/home/components/ServicesSection";
import UseCasesSection from "@/features/home/components/UseCasesSection";
import ValueSection from "@/features/home/components/ValueSection";
import WhoForSection from "@/features/home/components/WhoForSection";
import FeaturedProducts from "@/features/home/components/FeaturedProducts";
import LatestBlogPosts from "@/features/home/components/LatestBlogPosts";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import Link from "next/link";

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
      <ProblemSection />
      <SeparatorHorizontal short={true} />
      <UseCasesSection />
      <SeparatorHorizontal short={true} />
      <ValueSection />
      <SeparatorHorizontal short={true} />
      <ServicesSection />
      <SeparatorHorizontal short={true} />
      <ProcessSection />
      <SeparatorHorizontal short={true} />
      <WhoForSection />
      <SeparatorHorizontal short={true} />
      <HeadingTitle title="Tools we've built" />
      <p className="mx-auto max-w-2xl px-6 text-center text-lg/8 text-foreground/80">
        Ready-made AI tools, workflows, and systems for teams that want to
        move faster.{" "}
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
        Ideas on AI systems, automation, agents, and building AI into real
        businesses.{" "}
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
