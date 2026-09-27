import { CANONICAL_ORIGIN } from "@/lib/seo/ai-discovery";

const content = `# Contact

> Canonical URL: ${CANONICAL_ORIGIN}/contact
> Summary: Start a workflow audit, build engagement, or retainer inquiry. Replies within two business days.

- General inquiries: ${CANONICAL_ORIGIN}/contact
- Workflow audit intake: ${CANONICAL_ORIGIN}/contact?assessment=true
- Build call: ${CANONICAL_ORIGIN}/contact?implementation=true
- B2B call: ${CANONICAL_ORIGIN}/contact?b2b=true
- Retainer inquiry: ${CANONICAL_ORIGIN}/contact?enterprise=true

Bring one workflow to a 30-minute call for scoping. Pricing is canonical at ${CANONICAL_ORIGIN}/services.
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
