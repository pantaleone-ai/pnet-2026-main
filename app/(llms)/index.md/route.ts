import { CANONICAL_ORIGIN } from "@/lib/seo/ai-discovery";

const content = `# Pantaleone — AI systems that eliminate expensive manual work

> Canonical URL: ${CANONICAL_ORIGIN}/

Pantaleone (Pantaleone Digital Services LLC, founder Matt Pantaleone) builds AI agents, workflow automation, AI integrations, and custom AI software for B2B teams.

## What Pantaleone does

- AI agents and agent builds (N8N, LangChain)
- Workflow automation with logging, retries, and kill switch
- AI integration with CRM, helpdesk, and warehouse tools
- Custom AI software (Next.js, TypeScript)

## Engagement

- Workflow audit: $2,500 one-time. Canonical pricing: ${CANONICAL_ORIGIN}/services
- Build engagement: $8,500/mo
- Retainer: custom per quarter
- Start: ${CANONICAL_ORIGIN}/contact (replies within two business days)

## Key pages

- Services and pricing: ${CANONICAL_ORIGIN}/services
- B2B: ${CANONICAL_ORIGIN}/b2b
- Projects: ${CANONICAL_ORIGIN}/projects
- Shop (AI apps and workflows): ${CANONICAL_ORIGIN}/shop
- Blog: ${CANONICAL_ORIGIN}/blog
- AI Readiness Guide: ${CANONICAL_ORIGIN}/resources/ai-readiness-guide
- Contact: ${CANONICAL_ORIGIN}/contact

## Machine resources

- llms.txt: ${CANONICAL_ORIGIN}/llms.txt
- Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml
- RSS: ${CANONICAL_ORIGIN}/rss.xml
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
