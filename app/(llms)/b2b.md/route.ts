import { CANONICAL_ORIGIN } from "@/lib/seo/ai-discovery";

const content = `# B2B AI work for teams

> Canonical URL: ${CANONICAL_ORIGIN}/b2b
> Summary: Audit one workflow, build the automation, hand over repo and runbook. N8N and LangChain wired to existing tools.

## What the work covers

- Fewer repetitive tickets: intake, triage, filing via N8N
- Coverage without night shifts: agents run documented paths on schedule with logs
- Answers from client docs: RAG over runbooks and tickets with source citations
- Systems teams can keep running: repo, workflow JSON, runbook handoff

## How it is measured

No pre-baked percentages. One baseline before the build (median handling time, tickets closed per week, or hours on manual entry), compared four weeks after handoff.

## Services

- Workflow audit: two weeks on one process, ranked automatable steps with time cost
- Agent and pipeline builds: N8N or LangChain against client APIs, retries, logging, kill switch
- Integration: CRM, helpdesk, warehouse; credentials stay in client vault
- Team handoff: two working sessions plus runbook

## Pricing

Canonical pricing: ${CANONICAL_ORIGIN}/services (audit $2,500; build $8,500/mo; retainer custom).

## Related

- Services: ${CANONICAL_ORIGIN}/services
- AI Readiness Guide: ${CANONICAL_ORIGIN}/resources/ai-readiness-guide
- Projects: ${CANONICAL_ORIGIN}/projects
- Contact: ${CANONICAL_ORIGIN}/contact?b2b=true
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
