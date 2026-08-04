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
    page?.title ?? "Free AI Readiness Guide | Pantaleone Digital",
  description:
    page?.description ??
    "Download our comprehensive AI Readiness Guide to assess your business's AI potential and create a roadmap for implementation.",
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
          title="Free AI Readiness Guide"
          textStyleClassName="text-3xl font-semibold md:text-4xl"
          gridId="grid-ai-guide"
        />
        <SeparatorHorizontal short={true} />

        <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
          <p className="text-lg mb-6">
            Discover where your business stands on the AI maturity spectrum and
            get a clear roadmap for implementing artificial intelligence that
            delivers real ROI.
          </p>

          <h2 className="text-2xl font-semibold mb-4">What's Inside:</h2>
          <ul className="list-disc pl-6 space-y-2 mb-8">
            <li>
              <strong>AI Readiness Assessment</strong> — Score your organization
              across 8 key dimensions
            </li>
            <li>
              <strong>Business Process Audit Framework</strong> — Identify
              high-impact automation opportunities
            </li>
            <li>
              <strong>ROI Calculation Templates</strong> — Build business cases
              that justify AI investments
            </li>
            <li>
              <strong>Implementation Roadmap</strong> — Step-by-step plan from
              pilot to production
            </li>
            <li>
              <strong>Case Studies</strong> — Real examples of successful AI
              transformations
            </li>
          </ul>

          <div className="bg-muted p-6 rounded-lg mb-8">
            <h3 className="text-xl font-semibold mb-4">
              Who Should Download This Guide?
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Business Leaders</strong> exploring AI for their
                organization
              </li>
              <li>
                <strong>Operations Managers</strong> looking to automate
                workflows
              </li>
              <li>
                <strong>IT Directors</strong> planning AI infrastructure
              </li>
              <li>
                <strong>Entrepreneurs</strong> building AI-first products
              </li>
            </ul>
          </div>

          <div className="max-w-md mx-auto mb-8">
            <LeadMagnetForm
              guideTitle="AI Readiness Guide"
              downloadUrl="/resources/ai-readiness-guide.pdf"
            />
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              Trusted by 100+ businesses exploring AI transformation.
            </p>
          </div>
        </div>

        <SeparatorHorizontal short={true} />

        <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-2xl font-semibold mb-4">
            Ready for Personalized Guidance?
          </h2>
          <p className="mb-6">
            The guide is a great starting point, but every business is unique.
            Book a free 30-minute discovery call to discuss your specific AI
            transformation goals.
          </p>
          <div className="flex justify-center">
            <Link
              href="/contact?book=true"
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Book Free Discovery Call
            </Link>
          </div>
        </div>
      </main>
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}