import { getFeaturedStories } from "@/features/home/data/featuredStoriesSource";
import FeaturedStories from "@/features/home/components/FeaturedStories.client";

export default function FeaturedStoriesWrapper() {
  const stories = getFeaturedStories();
  const story = stories[0];
  if (!story) return null;
  const { body: _body, ...storyWithoutBody } = story;
  return <FeaturedStories story={storyWithoutBody} />;
}
