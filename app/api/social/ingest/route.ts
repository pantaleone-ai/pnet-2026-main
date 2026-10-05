import { checkRate, json, methodNotAllowed, readJsonBody } from "@/lib/campaign/http";
import { socialContentSchema } from "@/lib/social-growth/content-model";
import { socialIssueBody, socialIssueTitle } from "@/lib/social-growth/issue-body";
import { validateSocialNaming } from "@/lib/social-growth/social-utm";
import { logger } from "@/lib/logger";

// Shared social queue intake. Validates with the single social standard,
// deduplicates on contentId via GitHub search, creates the issue via REST.
// Auth: Bearer N8N_WEBHOOK_SECRET. Token: GITHUB_TOKEN (server-only).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GITHUB_API = "https://api.github.com";

function repo(): { owner: string; repo: string } | null {
  const slug = process.env.GITHUB_REPOSITORY ?? "pantaleone-ai/pnet-2026-main";
  const [owner, repoName] = slug.split("/");
  if (!owner || !repoName) return null;
  return { owner, repo: repoName };
}

async function titleExists(token: string, owner: string, repoName: string, contentId: string): Promise<boolean> {
  const query = encodeURIComponent(`repo:${owner}/${repoName} in:title "[Social] ${contentId}"`);
  const res = await fetch(`${GITHUB_API}/search/issues?q=${query}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { total_count?: number };
  return (data.total_count ?? 0) > 0;
}

export async function POST(request: Request) {
  const limited = await checkRate(request, 20, "write");
  if (limited) return limited;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return json({ error: "Unauthorized." }, 401);
  }
  const token = process.env.GITHUB_TOKEN;
  const repoInfo = repo();
  if (!token || !repoInfo) {
    return json({ error: "GitHub intake not configured (GITHUB_TOKEN)." }, 503);
  }
  try {
    const parsed = socialContentSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return json({ error: parsed.error.issues.map((i) => i.message).join(", ") }, 400);
    }
    const content = parsed.data;
    const naming = validateSocialNaming(content.campaignId, content.creativeId);
    if (!naming.campaign.valid || !naming.creative.valid) {
      return json(
        { error: [...naming.campaign.errors, ...naming.creative.errors].join("; ") },
        400,
      );
    }
    if (await titleExists(token, repoInfo.owner, repoInfo.repo, content.contentId)) {
      return json({ skipped: 1, reason: "contentId already queued" }, 200);
    }
    const labels = [
      "social",
      `site:${content.appId}`,
      `platform:${content.platform}`,
      `spillar:${content.pillar}`,
      `spri:${content.priority}`,
      "status:queued",
    ];
    const res = await fetch(`${GITHUB_API}/repos/${repoInfo.owner}/${repoInfo.repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: socialIssueTitle(content.contentId, content.hook),
        body: socialIssueBody(content),
        labels,
      }),
    });
    if (!res.ok) {
      logger.error("Social ingest GitHub create failed", new Error(await res.text()), {
        context: "social-api",
      });
      return json({ error: "GitHub issue creation failed." }, 502);
    }
    const issue = (await res.json()) as { number?: number; html_url?: string };
    return json({ created: 1, issue: issue.number, url: issue.html_url }, 201);
  } catch (error) {
    logger.error("Social ingest failed", error, { context: "social-api" });
    return json({ error: "Ingest failed." }, 500);
  }
}

export async function GET() {
  return methodNotAllowed("POST");
}
