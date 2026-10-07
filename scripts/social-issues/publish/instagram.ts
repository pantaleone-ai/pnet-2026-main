// Instagram Content Publishing (carousel). Proven live 2026-10-06 (#91, #101).
// Flow: item containers (is_carousel_item) -> CAROUSEL container -> media_publish.
// Requires token scopes: instagram_basic, instagram_content_publish (present on
// the stored system-user token). Images must be public JPEG/PNG (see public/ig/).
import { graphGet, graphPost, sleep } from "./graph";

export interface IgPublishResult {
  mediaId: string;
  permalink: string;
  shortcode: string;
  timestamp: string;
}

async function waitFinished(token: string, containerId: string, label: string): Promise<void> {
  for (let i = 0; i < 24; i += 1) {
    const status = graphGet<{ status_code?: string }>(token, containerId, { fields: "status_code" });
    if (status.status_code === "FINISHED") return;
    if (status.status_code === "ERROR") throw new Error(`${label} container ${containerId} errored`);
    await sleep(10_000);
  }
  throw new Error(`${label} container ${containerId} timed out`);
}

export async function publishCarousel(
  token: string,
  igUserId: string,
  images: string[],
  caption: string,
): Promise<IgPublishResult> {
  if (images.length < 2 || images.length > 10) {
    throw new Error(`carousel needs 2-10 images, got ${images.length}`);
  }
  const children: string[] = [];
  for (const url of images) {
    const created = graphPost<{ id?: string; error?: unknown }>(token, `${igUserId}/media`, {
      image_url: url,
      is_carousel_item: "true",
    });
    if (!created.id) throw new Error(`item container failed: ${JSON.stringify(created).slice(0, 300)}`);
    children.push(created.id);
  }
  for (const id of children) await waitFinished(token, id, "item");
  const carousel = graphPost<{ id?: string; error?: unknown }>(token, `${igUserId}/media`, {
    media_type: "CAROUSEL",
    children: children.join(","),
    caption,
  });
  if (!carousel.id) throw new Error(`carousel container failed: ${JSON.stringify(carousel).slice(0, 300)}`);
  await waitFinished(token, carousel.id, "carousel");
  const published = graphPost<{ id?: string; error?: unknown }>(token, `${igUserId}/media_publish`, {
    creation_id: carousel.id,
  });
  if (!published.id) throw new Error(`media_publish failed: ${JSON.stringify(published).slice(0, 300)}`);
  const meta = graphGet<IgPublishResult & { id: string }>(token, published.id, {
    fields: "permalink,shortcode,timestamp",
  });
  return { mediaId: published.id, permalink: meta.permalink, shortcode: meta.shortcode, timestamp: meta.timestamp };
}
