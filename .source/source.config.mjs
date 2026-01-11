// source.config.ts
import { z as z2 } from "zod";
import {
  defineCollections,
  defineDocs,
  defineConfig,
  frontmatterSchema as frontmatterSchema2
} from "fumadocs-mdx/config";
import lastModified from "fumadocs-mdx/plugins/last-modified";

// config/schemas/base-schemas.ts
import { z } from "zod";
import { frontmatterSchema } from "fumadocs-mdx/config";
var baseProjectSchema = frontmatterSchema.extend({
  title: z.string(),
  description: z.string(),
  category: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  featured: z.boolean(),
  showOnPortfolio: z.boolean().default(true),
  websiteUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  videoEmbedUrl: z.string().optional(),
  videoEmbedAlt: z.string().optional(),
  techStacks: z.array(z.string()).optional(),
  weight: z.number().optional()
});
var blogPostSchema = frontmatterSchema.extend({
  title: z.string(),
  description: z.string(),
  created: z.string(),
  lastUpdated: z.string().optional(),
  image: z.string(),
  imageAlt: z.string().optional(),
  author: z.string().optional(),
  authorAvatar: z.string().optional(),
  authorAvatarAlt: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  seo: z.array(z.string()).optional()
});
var privacySchema = frontmatterSchema.extend({
  title: z.string(),
  description: z.string().optional(),
  lastModified: z.union([z.string(), z.number(), z.date()]).optional()
});
var changelogSchema = frontmatterSchema.extend({
  title: z.string(),
  description: z.string(),
  created: z.string()
});
var shopProductSchema = frontmatterSchema.extend({
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
  additionalImages: z.array(z.object({
    url: z.string(),
    alt: z.string().optional()
  })).optional(),
  featured: z.boolean().default(false),
  isDigital: z.boolean().default(true),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  websiteUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  videoEmbedUrl: z.string().optional(),
  videoEmbedAlt: z.string().optional(),
  techStacks: z.array(z.string()).optional(),
  weight: z.number().optional()
});

// source.config.ts
var featuredApps = defineDocs({
  dir: "features/home/content/featured-apps",
  docs: defineCollections({
    type: "doc",
    dir: "features/home/content/featured-apps",
    schema: baseProjectSchema.extend({
      imageUrl: baseProjectSchema.shape.imageUrl.unwrap(),
      imageAlt: baseProjectSchema.shape.imageAlt.unwrap()
    })
  })
});
var webApps = defineDocs({
  dir: "features/about/content/web-apps",
  docs: defineCollections({
    type: "doc",
    dir: "features/about/content/web-apps",
    schema: baseProjectSchema.extend({
      imageUrl: baseProjectSchema.shape.imageUrl.unwrap(),
      imageAlt: baseProjectSchema.shape.imageAlt.unwrap()
    })
  })
});
var projects = defineDocs({
  dir: "features/projects/content",
  docs: defineCollections({
    type: "doc",
    dir: "features/projects/content",
    schema: baseProjectSchema
  })
});
var experience = defineDocs({
  dir: "features/experience/content",
  docs: defineCollections({
    type: "doc",
    dir: "features/experience/content",
    schema: frontmatterSchema2.extend({
      title: z2.string(),
      description: z2.string().optional(),
      company: z2.string().optional(),
      position: z2.string().optional(),
      fromDate: z2.string().optional(),
      toDate: z2.string().optional(),
      location: z2.string().optional(),
      websiteUrl: z2.string().optional(),
      imageUrl: z2.string().optional(),
      imageAlt: z2.string().optional()
    })
  })
});
var education = defineDocs({
  dir: "features/education/content",
  docs: defineCollections({
    type: "doc",
    dir: "features/education/content",
    schema: frontmatterSchema2.extend({
      title: z2.string(),
      description: z2.string().optional(),
      institution: z2.string().optional(),
      degree: z2.string().optional(),
      fromDate: z2.string().optional(),
      toDate: z2.string().optional(),
      location: z2.string().optional(),
      websiteUrl: z2.string().optional(),
      imageUrl: z2.string().optional(),
      imageAlt: z2.string().optional()
    })
  })
});
var about = defineDocs({
  dir: "features/about/content",
  docs: defineCollections({
    type: "doc",
    dir: "features/about/content",
    schema: frontmatterSchema2.extend({
      title: z2.string(),
      description: z2.string().optional(),
      imageUrl: z2.string().optional(),
      imageUrlDesktop: z2.string().optional(),
      imageUrlMobile: z2.string().optional(),
      imageAlt: z2.string().optional()
    })
  })
});
var blog = defineDocs({
  dir: "features/blog/content",
  docs: defineCollections({
    type: "doc",
    dir: "features/blog/content",
    schema: blogPostSchema
  })
});
var privacy = defineDocs({
  dir: "features/privacy/content",
  docs: defineCollections({
    type: "doc",
    dir: "features/privacy/content",
    schema: privacySchema
  })
});
var changelog = defineDocs({
  dir: "features/changelog/content",
  docs: defineCollections({
    type: "doc",
    dir: "features/changelog/content",
    schema: changelogSchema
  })
});
var shopProductSchema2 = frontmatterSchema2.extend({
  title: z2.string(),
  description: z2.string(),
  category: z2.string(),
  price: z2.number(),
  currency: z2.string().default("USD"),
  sku: z2.string().optional(),
  inventory: z2.number().optional(),
  purchaseUrl: z2.string().optional(),
  stripeProductId: z2.string().optional(),
  stripePriceId: z2.string().optional(),
  stripePaymentLink: z2.string().optional(),
  imageUrl: z2.string().optional(),
  imageAlt: z2.string().optional(),
  additionalImages: z2.array(z2.object({
    url: z2.string(),
    alt: z2.string().optional()
  })).optional(),
  featured: z2.boolean().default(false),
  isDigital: z2.boolean().default(true),
  fromDate: z2.string().default(""),
  toDate: z2.string().default(""),
  websiteUrl: z2.string().optional(),
  githubUrl: z2.string().optional(),
  videoEmbedUrl: z2.string().optional(),
  videoEmbedAlt: z2.string().optional(),
  techStacks: z2.array(z2.string()).optional(),
  weight: z2.number().optional()
});
var shop = defineDocs({
  dir: "features/shop/content",
  docs: defineCollections({
    type: "doc",
    dir: "features/shop/content",
    schema: shopProductSchema2
  })
});
var source_config_default = defineConfig({
  plugins: [lastModified()]
});
export {
  about,
  blog,
  changelog,
  source_config_default as default,
  education,
  experience,
  featuredApps,
  privacy,
  projects,
  shop,
  webApps
};
