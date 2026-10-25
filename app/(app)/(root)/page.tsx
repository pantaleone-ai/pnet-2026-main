import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import Hero from "@/features/home/components/Hero";
import FinalCTA from "@/features/home/components/FinalCTA";
import ProblemsSection from "@/features/home/components/ProblemsSection";
import SelectedWork from "@/features/home/components/SelectedWork";
import ProcessSection from "@/features/home/components/ProcessSection";
import PrinciplesSection from "@/features/home/components/PrinciplesSection";
import Link from "next/link";
import type { Metadata } from "next";

import HEAD from "@/config/seo/head";
import { getPageMetadata } from "@/lib/seo/page-metadata";
import type { HeadType } from "@/types";

// Content is static MDX from the repo - force static, no ISR reads.
export const dynamic = "force-static";

// Homepage is the overall business proposition (not a narrow service term —
// that intent belongs to /apps). HEAD "Home" is the single source of
// truth; the title renders absolute so the root template never re-appends
// the brand.
const homePage = HEAD.find((p: HeadType) => p.page === "Home") as HeadType;

export const metadata: Metadata = getPageMetadata(homePage, "/index.md");

// Six-section conversion funnel: Hero → Problems → Selected work →
// How delivered → Principles → Final conversion. Depth lives on
// /services, /apps, /about, /blog, and /shop; the homepage routes.
export default function Home() {
  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <Hero />
      <SeparatorHorizontal short={true} />
      <ProblemsSection />
      <SeparatorHorizontal short={true} />
      <SelectedWork />
      <SeparatorHorizontal short={true} />
      <ProcessSection />
      <SeparatorHorizontal short={true} />
      <PrinciplesSection />
      <SeparatorHorizontal short={true} />
      <p className="mx-auto max-w-2xl px-6 text-center text-sm text-muted-foreground">
        Looking for a tool or a deeper read?{" "}
        <Link href="/shop" className="underline underline-offset-4">
          Visit the shop
        </Link>{" "}
        ·{" "}
        <Link href="/blog" className="underline underline-offset-4">
          Read the blog
        </Link>{" "}
        ·{" "}
        <Link href="/about" className="underline underline-offset-4">
          About Matt
        </Link>
        .
      </p>
      <SeparatorHorizontal short={true} />
      <FinalCTA />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
