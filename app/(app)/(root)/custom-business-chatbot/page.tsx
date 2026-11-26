import Heading from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import {
  CHAT_PLANS,
} from "@/config/plans";
import { siteConfig } from "@/config/site";
import { getPageMetadata } from "@/lib/seo/page-metadata";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import PricingSection from "./PricingSection";
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
    q: "What is an AI reply?",
    a: "One completed, visitor-facing response from your assistant. A visitor message alone does not count, and neither does opening the widget. Each additional AI response counts as one. Failed requests and our internal testing never count. Included replies are pooled across all assistants on your plan and reset every month — unused replies do not roll over.",
  },
  {
    q: "What happens if I reach my monthly AI reply limit?",
    a: "Your workspace shows usage as it grows, and we email you at 80% and 100%. We never charge overages silently. At the limit you upgrade to a higher plan to keep answering; until then visitors see a clear message instead of an error, and every lead already captured stays in your inbox.",
  },
  {
    q: "How does annual billing save money?",
    a: "Annual plans cost 10 times the monthly price, so two months are free. Starter is $290 instead of $348, Growth $790 instead of $948, Pro $1,990 instead of $2,388, and Agency $4,990 instead of $5,988. Prices are in USD.",
  },
  {
    q: "What happens when my website changes?",
    a: "Knowledge sources re-index on a schedule. Update a page on your site and the assistant picks it up without you touching the chatbot.",
  },
  {
    q: "Can it capture leads, not just answer questions?",
    a: "Yes, from Growth up. When a conversation looks like buying intent, the assistant can ask for a name, email, and details — stored in your lead inbox with the full conversation attached, exportable as CSV.",
  },
  {
    q: "Does my business data leak into other customers' chatbots?",
    a: "No. Every chatbot retrieves only from its own knowledge sources — your pages are filtered by your workspace at query time, and automated isolation tests verify cross-customer reads are impossible. Your content is never used to train shared models.",
  },
  {
    q: "When does billing start?",
    a: "Plans are in early access while paid billing is finalized. Join now to hold your place: founding customers lock the prices and terms on this page before billing starts, and nothing is charged until then.",
  },
];

const COMPARISON_ROWS: { label: string; values: [string, string, string, string] }[] = [
  { label: "Monthly price", values: ["$29", "$79", "$199", "$499"] },
  { label: "AI replies / month (pooled)", values: ["1,000", "4,000", "12,000", "40,000"] },
  { label: "Assistants", values: ["1", "3", "10", "25"] },
  { label: "Websites / domains", values: ["1", "3", "10", "25"] },
  { label: "Indexed pages per assistant", values: ["100", "500", "2,000", "2,000"] },
  { label: "Knowledge sources per assistant", values: ["5", "10", "25", "25"] },
  { label: "Team members", values: ["1", "3", "10", "10"] },
  { label: "Conversation history", values: ["30 days", "90 days", "1 year", "1 year"] },
  { label: "Lead capture", values: ["Basic", "Lead inbox + search", "Advanced", "Advanced"] },
  { label: "Analytics", values: ["—", "Standard", "Advanced", "Advanced"] },
  { label: "Embed + hosted page", values: ["Yes", "Yes", "Yes", "Yes"] },
  { label: "Branding", values: ["Pantaleone branding", "Pantaleone branding", "Branding controls", "Contact us"] },
  { label: "Support", values: ["Email", "Priority email", "Priority", "Priority"] },
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
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Business chatbot plans",
      itemListElement: CHAT_PLANS.map((tier) => ({
        "@type": "Offer",
        name: tier.name,
        price: tier.monthlyPrice,
        priceCurrency: "USD",
        description: tier.positioning,
      })),
    },
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
            Plans priced by answers, not seats
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            Every plan includes unlimited visitor questions — you pay for the
            AI replies your assistants send. Annual billing costs 10× monthly:
            two months free.
          </p>
          <PricingSection />
        </div>

        <SeparatorHorizontal short={true} />

        <div className="mx-auto max-w-5xl px-6 pb-16">
          <h2 className="text-2xl font-semibold text-center mb-2">
            Compare plans
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            The full picture, in one table.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Feature comparison across Starter, Growth, Pro, and Agency plans
              </caption>
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th scope="col" className="text-left font-medium p-3">
                    <span className="sr-only">Feature</span>
                  </th>
                  {CHAT_PLANS.map((tier) => (
                    <th
                      key={tier.id}
                      scope="col"
                      className="text-left font-semibold p-3"
                    >
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-border last:border-0"
                  >
                    <th scope="row" className="text-left font-medium p-3">
                      {row.label}
                    </th>
                    {row.values.map((value, i) => (
                      <td
                        key={`${row.label}-${i}`}
                        className="p-3 text-muted-foreground"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <SeparatorHorizontal short={true} />

        <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-2xl font-semibold mb-4" id="usage">
            What is an AI reply?
          </h2>
          <p className="mb-4">
            An AI reply is one completed, visitor-facing response from your
            assistant. That is the only thing that counts against your plan:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-8">
            <li>A visitor message alone does not count.</li>
            <li>A completed AI response counts as one; each additional AI response counts as one more.</li>
            <li>Opening the widget does not count.</li>
            <li>Failed requests and our internal testing do not count.</li>
            <li>Included replies are pooled across all assistants on your plan and reset every month. Unused replies do not roll over.</li>
          </ul>

          <h2 className="text-2xl font-semibold mb-4">No surprise bills</h2>
          <p className="mb-4">
            Your workspace shows usage as it grows, and we email you when you
            reach 80% and 100% of your monthly replies. We never charge
            overages silently: at the limit, you choose to upgrade to a higher
            plan to keep answering. Until then, visitors see a clear message
            instead of an error, and every lead already captured stays in your
            inbox.
          </p>
        </div>

        <SeparatorHorizontal short={true} />

        <div id="usage-faq" className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8 scroll-mt-16">
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
