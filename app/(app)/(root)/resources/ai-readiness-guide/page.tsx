import Heading from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import { getBaseUrl } from "@/lib/helpers";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import Link from "next/link";
import LeadMagnetForm from "@/components/lead-magnet/LeadMagnetForm";

export const dynamic = "force-static";

const PAGE = "AI Readiness Guide";
const page = HEAD.find((p: HeadType) => p.page === PAGE) as HeadType;

export const metadata: Metadata = {
  title:
    page?.title ?? "AI readiness guide | Pantaleone Digital",
  description:
    page?.description ??
    "An 8-point checklist for one workflow: inputs, time cost, and whether automation pays. PDF by email.",
  metadataBase: new URL(
    getBaseUrl(page?.slug ?? "/resources/ai-readiness-guide"),
  ),
  alternates: {
    canonical: getBaseUrl(page?.slug ?? "/resources/ai-readiness-guide"),
  },
};

export default function AIReadinessGuidePage() {
  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <main className="mx-auto flex flex-col">
        <Heading
          title="AI readiness guide"
          textStyleClassName="text-3xl font-semibold md:text-4xl"
          gridId="grid-ai-guide"
        />
        <SeparatorHorizontal short={true} />

        <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
          <p className="text-lg mb-6">
            A checklist for one workflow: what goes in, what comes out,
            how long each step takes, and the math on whether automation
            pays. 12 pages, no fluff chapter.
          </p>

          <h2 className="text-2xl font-semibold mb-4">Inside the PDF:</h2>
          <ul className="list-disc pl-6 space-y-2 mb-8">
            <li>
              <strong>Readiness checklist</strong> — 8 questions scored 0–2,
              with worked examples
            </li>
            <li>
              <strong>Process audit sheet</strong> — one table per step:
              input, owner, minutes, system
            </li>
            <li>
              <strong>ROI worksheet</strong> — hours × rate vs. build and
              run cost, filled with sample numbers
            </li>
            <li>
              <strong>Pilot plan</strong> — scope for a two-week trial on
              one process
            </li>
            <li>
              <strong>Skip list</strong> — five cases where the guide says
              don’t automate
            </li>
          </ul>

          <div className="bg-muted p-6 rounded-lg mb-8">
            <h3 className="text-xl font-semibold mb-4">
              Written for
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Operators</strong> who own a process and its inbox
              </li>
              <li>
                <strong>Founders</strong> deciding between a hire and a build
              </li>
              <li>
                <strong>IT leads</strong> asked “can AI do this?” with no scope
              </li>
            </ul>
          </div>

          <div className="max-w-md mx-auto mb-8">
            <LeadMagnetForm
              guideTitle="AI Readiness Guide"
              downloadUrl="/resources/ai-readiness-guide.pdf"
            />
          </div>
        </div>

        <SeparatorHorizontal short={true} />

        <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-2xl font-semibold mb-4">
            Want a second pair of eyes?
          </h2>
          <p className="mb-6">
            Fill the worksheet, then bring it to a 30-minute call. We
            sanity-check the math together.
          </p>
          <div className="flex justify-center">
            <Link
              href="/contact?book=true"
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Book a call
            </Link>
          </div>
        </div>
      </main>
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}