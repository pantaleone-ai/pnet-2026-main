import {
  checkRate,
  json,
  methodNotAllowed,
  readJsonBody,
} from "@/lib/campaign/http";
import { getCampaignStore, persistCampaignStore } from "@/lib/campaign/store";
import { ingestSchema } from "@/lib/campaign/validation";
import { logger } from "@/lib/logger";
import { siteConfig } from "@/config/site";
import { getBlogPosts } from "@/features/blog/data/blogSource";

// Bridges the portfolio content engine into campaign-os: blog posts become
// source content that Promote This can build campaigns from. Deduplicates
// by source_url; never rewrites existing records.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = await checkRate(request, 20, "write");
  if (limited) return limited;
  try {
    const parsed = ingestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        400,
      );
    }
    const store = getCampaignStore();
    const brand =
      store.data.brands.find((b) => b.id === parsed.data.brand_id) ??
      store.data.brands[0];
    if (!brand) return json({ error: "No brand." }, 400);
    const existing = new Set(
      store.listSourceContent(brand.id).map((s) => s.source_url),
    );
    const posts = getBlogPosts().slice(0, parsed.data.limit ?? 50);
    let ingested = 0;
    let skipped = 0;
    for (const post of posts) {
      const url = `${siteConfig.url}/blog/${post.slug}`;
      if (existing.has(url)) {
        skipped += 1;
        continue;
      }
      store.createSourceContent({
        brand_id: brand.id,
        source_type: "article",
        source_url: url,
        title: post.title,
        content: `${post.description}\n\n${post.content}`.slice(0, 8000),
        metadata: {
          slug: post.slug,
          tags: post.tags ?? [],
          category: post.category ?? "",
        },
      });
      existing.add(url);
      ingested += 1;
    }
    store.emit("content.ingested", brand.id, { ingested, skipped });
    persistCampaignStore();
    return json({ ingested, skipped }, 201);
  } catch (error) {
    logger.error("Campaign ingest failed", error, {
      context: "campaign-api",
    });
    return json({ error: "Ingest failed." }, 500);
  }
}

export async function GET() {
  return methodNotAllowed("POST");
}
