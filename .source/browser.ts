// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
} & {
  DocData: {
    about: {
      /**
       * Last modified date of document file, obtained from version control.
       *
       */
      lastModified?: Date;
    },
    blog: {
      /**
       * Last modified date of document file, obtained from version control.
       *
       */
      lastModified?: Date;
    },
    changelog: {
      /**
       * Last modified date of document file, obtained from version control.
       *
       */
      lastModified?: Date;
    },
    education: {
      /**
       * Last modified date of document file, obtained from version control.
       *
       */
      lastModified?: Date;
    },
    experience: {
      /**
       * Last modified date of document file, obtained from version control.
       *
       */
      lastModified?: Date;
    },
    featuredApps: {
      /**
       * Last modified date of document file, obtained from version control.
       *
       */
      lastModified?: Date;
    },
    privacy: {
      /**
       * Last modified date of document file, obtained from version control.
       *
       */
      lastModified?: Date;
    },
    projects: {
      /**
       * Last modified date of document file, obtained from version control.
       *
       */
      lastModified?: Date;
    },
    webApps: {
      /**
       * Last modified date of document file, obtained from version control.
       *
       */
      lastModified?: Date;
    },
  }
}>();
const browserCollections = {
  about: create.doc("about", {"about.mdx": () => import("../features/about/content/about.mdx?collection=about"), "web-apps/full-stack-blog-app.mdx": () => import("../features/about/content/web-apps/full-stack-blog-app.mdx?collection=about"), "web-apps/portfolio-website-v1.mdx": () => import("../features/about/content/web-apps/portfolio-website-v1.mdx?collection=about"), "web-apps/portfolio-website-v2.mdx": () => import("../features/about/content/web-apps/portfolio-website-v2.mdx?collection=about"), "web-apps/portfolio-website-v3.mdx": () => import("../features/about/content/web-apps/portfolio-website-v3.mdx?collection=about"), }),
  blog: create.doc("blog", {"activate-top-oauth-providers-inapp.mdx": () => import("../features/blog/content/activate-top-oauth-providers-inapp.mdx?collection=blog"), "ai-agent-workflows.mdx": () => import("../features/blog/content/ai-agent-workflows.mdx?collection=blog"), "ai-companies.mdx": () => import("../features/blog/content/ai-companies.mdx?collection=blog"), "aisystem-prompts-hidden-blueprint.mdx": () => import("../features/blog/content/aisystem-prompts-hidden-blueprint.mdx?collection=blog"), "best-open-source-ways-to-create-synthetic-audiences.mdx": () => import("../features/blog/content/best-open-source-ways-to-create-synthetic-audiences.mdx?collection=blog"), "best-practices-for-local-redis-use-with-local-N8N.mdx": () => import("../features/blog/content/best-practices-for-local-redis-use-with-local-N8N.mdx?collection=blog"), "claude-opus-4.5-system-prompt-analysis-prompt-tips-tricks.mdx": () => import("../features/blog/content/claude-opus-4.5-system-prompt-analysis-prompt-tips-tricks.mdx?collection=blog"), "claude-sonnet-4-5-system-prompt-analysis.mdx": () => import("../features/blog/content/claude-sonnet-4-5-system-prompt-analysis.mdx?collection=blog"), "code-prompt-bytes.mdx": () => import("../features/blog/content/code-prompt-bytes.mdx?collection=blog"), "creative-coding.mdx": () => import("../features/blog/content/creative-coding.mdx?collection=blog"), "free-authentication-nextjs-ai-agent-saas-app-quickstart.mdx": () => import("../features/blog/content/free-authentication-nextjs-ai-agent-saas-app-quickstart.mdx?collection=blog"), "gpt5-system-prompt-leak.mdx": () => import("../features/blog/content/gpt5-system-prompt-leak.mdx?collection=blog"), "grok-4-systep-prompt-analysis-tips-prompting-tricks.mdx": () => import("../features/blog/content/grok-4-systep-prompt-analysis-tips-prompting-tricks.mdx?collection=blog"), "leaders-are-builders-time-to-lead.mdx": () => import("../features/blog/content/leaders-are-builders-time-to-lead.mdx?collection=blog"), "llms-txt-for-ai-agent-discovery-and-optimization.mdx": () => import("../features/blog/content/llms-txt-for-ai-agent-discovery-and-optimization.mdx?collection=blog"), "mcp-ai-server-for-highquality-ai.mdx": () => import("../features/blog/content/mcp-ai-server-for-highquality-ai.mdx?collection=blog"), "modern-saas-boilerplate-easy-setup-instructions.mdx": () => import("../features/blog/content/modern-saas-boilerplate-easy-setup-instructions.mdx?collection=blog"), "private-ai-stack-setup-in-minutes.mdx": () => import("../features/blog/content/private-ai-stack-setup-in-minutes.mdx?collection=blog"), "v0-system-ai-prompt-analysis.mdx": () => import("../features/blog/content/v0-system-ai-prompt-analysis.mdx?collection=blog"), "veo3-prompt-playbook-json-prompts-for-brand-alignment.mdx": () => import("../features/blog/content/veo3-prompt-playbook-json-prompts-for-brand-alignment.mdx?collection=blog"), }),
  changelog: create.doc("changelog", {"changelog.mdx": () => import("../features/changelog/content/changelog.mdx?collection=changelog"), }),
  education: create.doc("education", {"education.mdx": () => import("../features/education/content/education.mdx?collection=education"), }),
  experience: create.doc("experience", {"experience.mdx": () => import("../features/experience/content/experience.mdx?collection=experience"), }),
  featuredApps: create.doc("featuredApps", {}),
  privacy: create.doc("privacy", {"privacy.mdx": () => import("../features/privacy/content/privacy.mdx?collection=privacy"), "terms.mdx": () => import("../features/privacy/content/terms.mdx?collection=privacy"), }),
  projects: create.doc("projects", {"ai-saas-starter-nextjs-betterauth-supabase-free-boilerplate.mdx": () => import("../features/projects/content/ai-saas-starter-nextjs-betterauth-supabase-free-boilerplate.mdx?collection=projects"), "imgsquash.mdx": () => import("../features/projects/content/imgsquash.mdx?collection=projects"), "migratecms-migrate-anycms-to-nextjs.mdx": () => import("../features/projects/content/migratecms-migrate-anycms-to-nextjs.mdx?collection=projects"), "mixphd.mdx": () => import("../features/projects/content/mixphd.mdx?collection=projects"), "pantaleonenet.mdx": () => import("../features/projects/content/pantaleonenet.mdx?collection=projects"), "profitsignals-ai-chat-agent.mdx": () => import("../features/projects/content/profitsignals-ai-chat-agent.mdx?collection=projects"), "qrcode-generator-free-nextjs15-tailwind.mdx": () => import("../features/projects/content/qrcode-generator-free-nextjs15-tailwind.mdx?collection=projects"), "skillsnap-increase-ai-skills.mdx": () => import("../features/projects/content/skillsnap-increase-ai-skills.mdx?collection=projects"), }),
  webApps: create.doc("webApps", {"full-stack-blog-app.mdx": () => import("../features/about/content/web-apps/full-stack-blog-app.mdx?collection=webApps"), "portfolio-website-v1.mdx": () => import("../features/about/content/web-apps/portfolio-website-v1.mdx?collection=webApps"), "portfolio-website-v2.mdx": () => import("../features/about/content/web-apps/portfolio-website-v2.mdx?collection=webApps"), "portfolio-website-v3.mdx": () => import("../features/about/content/web-apps/portfolio-website-v3.mdx?collection=webApps"), }),
};
export default browserCollections;