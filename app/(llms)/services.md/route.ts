import { CANONICAL_ORIGIN } from "@/lib/seo/ai-discovery";

const content = `# Services and pricing

> Canonical URL: ${CANONICAL_ORIGIN}/services
> Summary: Fixed-price workflow audit, monthly build engagement, and retainer. N8N, LangChain, and Next.js.

One workflow at a time. Audit first, then build, then handoff of repo and runbook. If the audit says don't build, the client keeps the ranked list.

## Workflow audit — $2,500 one-time

- One process mapped end to end
- Time cost per manual step
- Ranked list of automatable steps
- Build vs. skip recommendation
- 90-minute walkthrough call
- Start: ${CANONICAL_ORIGIN}/contact?assessment=true

## Build engagement — $8,500 per month

- Everything in the workflow audit
- N8N or LangChain build
- Wired to CRM, helpdesk, or warehouse
- Retries, logging, and a kill switch
- Weekly 30-minute review
- 30-day fix window after handoff
- Start: ${CANONICAL_ORIGIN}/contact?implementation=true

## Retainer — custom per quarter

- Named engineer (Matt)
- One active build at a time
- Shared backlog, re-ranked monthly
- Two team working sessions per build
- Runbook per system
- Email support on business days
- Start: ${CANONICAL_ORIGIN}/contact?enterprise=true

## How engagements work

- One process per engagement
- Client keeps artifacts: repo, workflow JSON, credentials map, runbook
- Every automated run writes a readable log
- Every build ships with a kill switch

## Related

- B2B: ${CANONICAL_ORIGIN}/b2b
- AI Readiness Guide: ${CANONICAL_ORIGIN}/resources/ai-readiness-guide
- Projects: ${CANONICAL_ORIGIN}/projects
- Contact: ${CANONICAL_ORIGIN}/contact
`;

export const dynamic = "force-static";

export async function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown;charset=utf-8",
      "Cache-Control":
        "public, s-maxage=31536000, stale-while-revalidate=31536000",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=31536000, stale-while-revalidate=31536000, stale-if-error=86400",
    },
  });
}
