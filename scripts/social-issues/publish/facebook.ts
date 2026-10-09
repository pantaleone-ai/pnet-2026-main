// Facebook Page publishing via the same system-user token
// (scopes: pages_manage_posts, pages_show_list).
// Link posts carry the UTM destination; photo posts carry a single visual.
import { graphDelete, graphGet, graphPost } from "./graph";

/** Feed writes need a Page-scoped token; the stored system-user token mints it. */
function pageToken(token: string, pageId: string): string {
  const res = graphGet<{ access_token?: string; error?: unknown }>(
    token,
    pageId,
    { fields: "access_token" },
  );
  if (!res.access_token)
    throw new Error(
      `page token exchange failed: ${JSON.stringify(res).slice(0, 200)}`,
    );
  return res.access_token;
}

export interface FbPublishResult {
  postId: string;
  permalink: string;
  scheduled?: boolean;
}

export interface FbSchedule {
  /** Unix timestamp for native FB scheduling (scheduled_publish_time). */
  publishAtUnix?: number;
}

/**
 * Pick the per-post FB visual: first public JPEG/PNG. AVIF is rejected
 * (Meta fetch fails) and bare link-scrape posts are refused upstream —
 * every FB post carries its own artwork image.
 */
export function selectFbImage(images: string[]): string | undefined {
  return images.find(
    (u) => /^https:\/\//.test(u) && /\.(jpe?g|png)(\?|$)/i.test(u),
  );
}

function scheduleParams(
  schedule?: FbSchedule,
): Record<string, string | number | boolean> {
  if (!schedule?.publishAtUnix) return {};
  return { published: false, scheduled_publish_time: schedule.publishAtUnix };
}

export function publishLinkPost(
  token: string,
  pageId: string,
  message: string,
  link: string,
  schedule?: FbSchedule,
): FbPublishResult {
  const page = pageToken(token, pageId);
  const created = graphPost<{ id?: string; error?: unknown }>(
    page,
    `${pageId}/feed`,
    {
      message,
      link,
      ...scheduleParams(schedule),
    },
  );
  if (!created.id)
    throw new Error(
      `feed post failed: ${JSON.stringify(created).slice(0, 300)}`,
    );
  if (schedule?.publishAtUnix)
    return {
      postId: created.id,
      permalink: `https://www.facebook.com/${created.id}`,
      scheduled: true,
    };
  const meta = graphGet<{ permalink_url?: string }>(token, created.id, {
    fields: "permalink_url",
  });
  return {
    postId: created.id,
    permalink: meta.permalink_url ?? `https://www.facebook.com/${created.id}`,
  };
}

export function publishPhotoPost(
  token: string,
  pageId: string,
  imageUrl: string,
  caption: string,
  schedule?: FbSchedule,
): FbPublishResult {
  const page = pageToken(token, pageId);
  const created = graphPost<{ id?: string; post_id?: string; error?: unknown }>(
    page,
    `${pageId}/photos`,
    {
      url: imageUrl,
      caption,
      ...scheduleParams(schedule),
    },
  );
  const postId = created.post_id ?? created.id;
  if (!postId)
    throw new Error(
      `photo post failed: ${JSON.stringify(created).slice(0, 300)}`,
    );
  if (schedule?.publishAtUnix)
    return {
      postId,
      permalink: `https://www.facebook.com/${postId}`,
      scheduled: true,
    };
  const meta = graphGet<{ permalink_url?: string }>(token, postId, {
    fields: "permalink_url",
  });
  return {
    postId,
    permalink: meta.permalink_url ?? `https://www.facebook.com/${postId}`,
  };
}

export function deletePost(token: string, postId: string): boolean {
  const pageId = postId.split("_")[0] ?? "";
  const page = /^\d+$/.test(pageId) ? pageToken(token, pageId) : token;
  const res = graphDelete<{ success?: boolean }>(page, postId);
  if (res.success !== true)
    throw new Error(`delete failed: ${JSON.stringify(res).slice(0, 200)}`);
  return true;
}
