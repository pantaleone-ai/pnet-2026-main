import { z } from "zod";
import {
  defineCollections,
  defineDocs,
  defineConfig,
  frontmatterSchema,
} from "fumadocs-mdx/config";
import lastModified from "fumadocs-mdx/plugins/last-modified";
import {
  baseProjectSchema,
  blogPostSchema,
  privacySchema,
  changelogSchema,
} from "@/config/schemas/base-schemas";

export const featuredApps = defineDocs({
  dir: "features/home/content/featured-apps",
  docs: defineCollections({
    type: "doc",
    dir: "features/home/content/featured-apps",
    schema: baseProjectSchema.extend({
      imageUrl: baseProjectSchema.shape.imageUrl.unwrap(),
      imageAlt: baseProjectSchema.shape.imageAlt.unwrap(),
    }),
  }),
});

export const about = defineDocs({
  dir: "features/about/content",
  docs: defineCollections({
    type: "doc",
    dir: "features/about/content",
    schema: frontmatterSchema.extend({
      title: z.string(),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      imageUrlDesktop: z.string().optional(),
      imageUrlMobile: z.string().optional(),
      imageAlt: z.string().optional(),
    }),
  }),
});

export const webApps = defineDocs({
  dir: "features/about/content/web-apps",
  docs: defineCollections({
    type: "doc",
    dir: "features/about/content/web-apps",
    schema: baseProjectSchema.extend({
      imageUrl: baseProjectSchema.shape.imageUrl.unwrap(),
      imageAlt: baseProjectSchema.shape.imageAlt.unwrap(),
    }),
  }),
});

export const projects = defineDocs({
  dir: "features/projects/content",
  docs: defineCollections({
    type: "doc",
    dir: "features/projects/content",
    schema: baseProjectSchema,
  }),
});

export const experience = defineDocs({
  dir: "features/experience/content",
});

export const education = defineDocs({
  dir: "features/education/content",
});

export const blog = defineDocs({
  dir: "features/blog/content",
  docs: defineCollections({
    type: "doc",
    dir: "features/blog/content",
    schema: blogPostSchema,
  }),
});

export const privacy = defineDocs({
  dir: "features/privacy/content",
  docs: defineCollections({
    type: "doc",
    dir: "features/privacy/content",
    schema: privacySchema,
  }),
});

export const changelog = defineDocs({
  dir: "features/changelog/content",
  docs: defineCollections({
    type: "doc",
    dir: "features/changelog/content",
    schema: changelogSchema,
  }),
});

// Define shop product schema directly here to avoid import issues
const shopProductSchema = frontmatterSchema.extend({
  title: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.number(),
  currency: z.string().default("USD"),
  sku: z.string().optional(),
  inventory: z.number().optional(),
  purchaseUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  featured: z.boolean().default(false),
  isDigital: z.boolean().default(true),
  fromDate: z.string().default(""),
  toDate: z.string().default(""),
  websiteUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  videoEmbedUrl: z.string().optional(),
  videoEmbedAlt: z.string().optional(),
  techStacks: z.array(z.string()).optional(),
  weight: z.number().optional(),
});

export const shop = defineDocs({
  dir: "features/shop/content",
  docs: defineCollections({
    type: "doc",
    dir: "features/shop/content",
    schema: shopProductSchema,
  }),
});

export const aiApps = defineDocs({
  dir: "features/ai-apps/content",
});

export const aiWorkflows = defineDocs({
  dir: "features/ai-workflows/content",
});

export const aiServices = defineDocs({
  dir: "features/ai-services/content",
});

export const aiArt = defineDocs({
  dir: "features/ai-art/content",
});

export default defineConfig({
  plugins: [lastModified()],
});
