import Heading from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import { CHAT_PLANS } from "@/config/plans";
import { siteConfig } from "@/config/site";
import { getPageMetadata } from "@/lib/seo/page-metadata";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import Link from "next/link";
import UrlCaptureForm from "./UrlCaptureForm";

export const dynamic = "force-static";

const PAGE = "CustomBusinessChatbot";
const page = HEAD.find((p: HeadType) => p.page === PAGE) as HeadType;

export const metadata: Metadata = getPageMetadata(page, "/custom-business-chatbot.md");

const STEPS = [
  {
    title: "Connect your website",
    text: "Enter your URL. We read your public pages — services, pricing, FAQs, policies — and turn them into a knowledge base. You choose which pages the assistant may answer from.",
  },
  {
    title: "Shape the assistant",
    text: "Set its name, welcome message, and tone. Add the questions visitors ask most, plus the answers only you can give. Test it against your own site before it goes live.",
  },
  {
    title: "Publish and embed",
    text: "Get a hosted chat page plus a small snippet for your site. Visitors get answers in seconds; you get the conversation history and captured leads.",
  },
];

const EXAMPLE_QAS = [
  {
    q: "Do you take walk-ins on Saturdays?",
    a: "It answers from your hours page — including the Saturday exception you posted in March — and cites the page it used.",
  },
  {
    q: "What is your return window for sale items?",
    a: "It quotes your returns policy verbatim for the sale-item clause instead of guessing the standard window.",
  },
  {
    q: "Can you handle a 200-guest wedding?",
    a: "It pulls capacity and catering details from your services pages, then offers to take the inquiry as a lead.",
  },
];

const FAQS = [
  {
    q: "How long does setup take?",
    a: "Connecting a website takes minutes. Most of the time goes to reviewing which pages the assistant may use and adding the handful of answers only you know. Small sites typically publish the same day.",
  },
  {
    q: "What happens when my website changes?",
    a: "Knowledge sources re-index on a schedule. Update a page on your site and the assistant picks it up without you touching the chatbot.",
  },
  {
    q: "Can it capture leads, not just answer questions?",
    a: "Yes. When a conversation looks like buying intent, the assistant can ask for a name, email, and details — stored in your lead inbox with the full conversation attached, exportable as CSV.",
  },
  {
    q: "Does my business data leak into other customers' chatbots?",
    a: "No. Every chatbot retrieves only from its own knowledge sources — your pages are filtered by your workspace at query time, and automated isolation tests verify cross-customer reads are impossible. Your content is never used to train shared models.",
  },
  {
    q: "What does it cost?",
    a: "Early access is free while we finalize launch pricing. The plan tiers below show the usage limits each tier carries, so you can see where your site fits. You will lock founding pricing before billing starts.",
  },
];

function getServiceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Custom business chatbot",
    provider: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    areaServed: "US",
    description: page.description,
  };
}

function getFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

function getBreadcrumbJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      {
        "@type": "ListItem",
        position: 2,
        name: "Custom business chatbot",
        item: `${siteConfig.url}/custom-business-chatbot`,
      },
    ],
  };
}

export default function CustomBusinessChatbotPage() {
  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getServiceJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getFaqJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getBreadcrumbJsonLd()) }}
      />
      <link rel="alternate" type="text/markdown" href="/custom-business-chatbot.md" />
      <link rel="describedby" href="/llms.txt" />
      <main className="mx-auto flex flex-col">
        <Heading
          title="A chatbot that knows your business"
          textStyleClassName="text-3xl font-semibold md:text-4xl"
          gridId="grid-custom-chatbot"
          as="h1"
        />
        <SeparatorHorizontal short={true} />

        <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
          <p className="text-lg mb-6">
            Your website already answers most visitor questions — it is just
            hard to search. We turn your pages into an assistant that answers
            in seconds, cites its sources, and captures the lead when the
            visitor is ready to buy.
          </p>
          <UrlCaptureForm id="hero-website-url" />
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 px-6 pb-16 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex flex-col rounded-lg border border-border p-6">
              <p className="text-sm font-medium text-muted-foreground">
                Step {i + 1}
              </p>
              <h2 className="mt-1 text-xl font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>

        <SeparatorHorizontal short={true} />

        <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-2xl font-semibold mb-4">What visitors get</h2>
          <ul className="list-disc pl-6 space-y-2 mb-8">
            <li>Answers drawn from your pages, not generic AI guesses</li>
            <li>Every answer cites the page it came from</li>
            <li>“I don’t know” instead of a confident fabrication when your site has no answer</li>
            <li>Handoff to you as a lead the moment they are ready to talk</li>
          </ul>

          <h2 className="text-2xl font-semibold mb-4">What it sounds like</h2>
          <p className="mb-4">
            Illustrative examples — your assistant answers from{" "}
            <em>your</em> pages, in your voice:
          </p>
          <div className="space-y-4 mb-8 not-prose">
            {EXAMPLE_QAS.map((ex) => (
              <div key={ex.q} className="rounded-lg border border-border p-4">
                <p className="font-medium">{ex.q}</p>
                <p className="mt-2 text-sm text-muted-foreground">{ex.a}</p>
              </div>
            ))}
          </div>
        </div>

        <SeparatorHorizontal short={true} />

        <div className="mx-auto max-w-6xl px-6 pb-16">
          <h2 className="text-2xl font-semibold text-center mb-2">
            Early-access plans
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            Free during early access. Prices are announced before billing
            starts — founding customers lock launch pricing.
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {CHAT_PLANS.map((tier) => (
              <div
                key={tier.id}
                className={`flex flex-col border rounded-lg p-6 ${
                  tier.highlighted
                    ? "border-primary shadow-lg relative"
                    : "border-border"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">
                    {tier.price ?? "Early access"}
                  </span>
                  {tier.price && (
                    <span className="text-muted-foreground ml-1">
                      / {tier.period}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mb-6">{tier.description}</p>
                <ul className="space-y-2 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-primary mr-2 mt-0.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    tier.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>

        <SeparatorHorizontal short={true} />

        <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-2xl font-semibold mb-4">
            Frequently asked questions
          </h2>
          <div className="space-y-4 mb-8 not-prose">
            {FAQS.map((f) => (
              <details key={f.q} className="border border-border rounded-lg p-4">
                <summary className="font-medium cursor-pointer">{f.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-8 p-6 bg-muted rounded-lg">
            <p className="text-center mb-4">
              <strong>See what it would say about your business</strong>
            </p>
            <p className="text-center text-muted-foreground mb-4">
              Enter your URL — your site becomes the demo.
            </p>
            <div className="flex justify-center">
              <UrlCaptureForm id="final-website-url" buttonLabel="Start now" />
            </div>
          </div>
        </div>
      </main>
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
