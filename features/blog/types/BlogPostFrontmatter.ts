type BlogPostFrontmatter = {
  title: string;
  description: string;
  created: string;
  lastUpdated?: string;
  image: string;
  imageAlt?: string;
  author?: string;
  authorAvatar?: string;
  authorAvatarAlt?: string;
  category?: string;
  tags?: string[];
  seo?: string[];
  /** Advisory taxonomy. Optional until pillar hubs ship. See config/content/*. */
  pillar?: string;
  cluster?: string;
  intent?: string;
  status?: string;
};

export type { BlogPostFrontmatter };
