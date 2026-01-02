import { truncateDescription, truncateTitle } from "@/lib/seo";
import type { HeadType } from "@/types";

const HEAD: HeadType[] = [
  {
    page: "Home",
    title: truncateTitle("Pantaleone.net | Forward Deployed AI Engineer"),
    description: truncateDescription(
      "Specializing in Forward Deployed AI, autonomous workflows, and enterprise automation. Building scalable AI-driven solutions at Pantaleone Digital Services.",
    ),
    slug: "/",
  },
  {
    page: "About",
    title: truncateTitle("About | Matt Pantaleone | AI & Automation Expert"),
    description: truncateDescription(
      "Founder of Pantaleone Digital Services LLC. Engineering custom LLM integrations and high-scale digital infrastructure.",
    ),
    slug: "/about",
  },
  {
    page: "Experience",
    title: truncateTitle("Experience | AI Engineering & Technical Strategy"),
    description: truncateDescription(
      "Professional history in Forward Deployed AI, automation architecture, and digital transformation.",
    ),
    slug: "/experience",
  },
  {
    page: "Education",
    title: truncateTitle("Education | Technical Foundations in AI & Dev"),
    description: truncateDescription("Academic background and certifications in software engineering and AI technologies."),
    slug: "/education",
  },
  {
    page: "Blog",
    title: truncateTitle("Blog | AI Workflows & Automation Insights"),
    description: truncateDescription(
      "Expert analysis on LLM implementation, agentic workflows, and the future of AI engineering.",
    ),
    slug: "/blog",
  },
  {
    page: "Projects",
    title: truncateTitle("Projects | AI Platforms, Rapigent, & AICEO"),
    description: truncateDescription(
      "Showcasing enterprise AI tools, autonomous agent workflows, and full-stack AI applications.",
    ),
    slug: "/projects",
  },
  {
    page: "Contact",
    title: truncateTitle("Contact | Hire for AI Engineering & Consulting"),
    description: truncateDescription(
      "Inquiries for AI automation, forward deployed engineering, and digital strategy. Let's build your AI roadmap.",
    ),
    slug: "/contact",
  },
  {
    page: "Privacy",
    title: truncateTitle("Privacy Policy | Pantaleone Digital Services"),
    description: truncateDescription(
      "Privacy practices and data protection policies for pantaleone.net, rapigent.com, and aiceo.io.",
    ),
    slug: "/privacy",
  },
  // {
  //   page: "Terms",
  //   title: truncateTitle("Terms of Use | Pantaleone Digital Services"),
  //   description: truncateDescription(
  //     "Legal terms and conditions for our AI-driven services, platforms, and consulting.",
  //   ),
  //   slug: "/terms",
  // },
  {
    page: "Changelog",
    title: truncateTitle("Changelog | Platform Evolution & Updates"),
    description: truncateDescription(
      "Development history and technical updates for the Pantaleone Digital ecosystem.",
    ),
    slug: "/changelog",
  },
];

export default HEAD;