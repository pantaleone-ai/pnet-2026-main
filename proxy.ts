import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge-cache tags for targeted Cloudflare purges (never purge_everything).
 *
 * Cloudflare indexes the `Cache-Tag` response header on cached responses and
 * strips it before delivery — visitors never see it. Tags emitted:
 * - `pnet-html` ......... every cacheable HTML page (code-deploy target)
 * - `pnet-<section>` .... top-level section of the URL (data/content target)
 * - `pnet-feeds` ........ sitemaps, feeds, robots, llms/manifest files
 *
 * Skipped (never tagged, never bulk-purged): API, admin, _vercel, and binary
 * /media /font /code assets (immutable or purged by exact file URL instead).
 * Purged by .github/workflows/cloudflare-purge.yml on merge to main.
 */
const PFX = 'pnet';
const FEED_PATHS = new Set<string>(['/sitemap.xml', '/robots.txt', '/llms.txt', '/llms-full.txt', '/manifest.webmanifest', '/agents.txt', '/agents.md', '/agents.json', '/openapi.json', '/rss.xml', '/feed.xml']);
const FEED_PREFIXES: string[] = [['/feeds/', '/api/feeds/']];
const SKIP_PREFIXES = ['/api/', '/admin/', '/_vercel/'];
const SKIP_EXT = /\.(png|jpe?g|gif|webp|avif|ico|svg|css|js|map|woff2?|ttf|otf|eot|mp4|webm|mov|pdf|zip|gz|mp3|wav)$/i;

export default function proxy(req: NextRequest) {
  if (req.method !== 'GET') return NextResponse.next();
  let path = '/';
  try {
    path = new URL(req.url).pathname;
  } catch {
    return NextResponse.next();
  }
  if (SKIP_PREFIXES.some((p) => path.startsWith(p)) || SKIP_EXT.test(path)) {
    return NextResponse.next();
  }
  const res = NextResponse.next();
  const seg = path.split('/').filter(Boolean)[0] ?? '';
  const section = seg.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
  const isFeed = FEED_PATHS.has(path) || FEED_PREFIXES.some((p) => path.startsWith(p));
  const tags = isFeed
    ? [`${PFX}-feeds`]
    : [`${PFX}-html`, ...(section ? [`${PFX}-${section}`] : [])];
  res.headers.set('Cache-Tag', tags.join(','));
  return res;
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\.(?:png|jpe?g|gif|webp|avif|ico|svg|css|js|map|woff2?|ttf|otf|eot|mp4|webm|mov|pdf|zip|gz|mp3|wav)$).*)',
  ],
};
