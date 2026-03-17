import { truncateDescription, truncateTitle } from "@/lib/seo";
import type { HeadType } from "@/types";

const HEAD: HeadType[] = [
  {
    page: "Home",
    title: truncateTitle(
      "Pantaleone.ai | AI Engineering & Agentic Automation Strategy",
    ),
    description: truncateDescription(
      "Forward-deployed AI engineer specializing in agentic AI, business automation strategy, and autonomous workflows. Build scalable AI systems with enterprise-grade automation.",
    ),
    slug: "/",
  },
  {
    page: "About",
    title: truncateTitle(
      "About Matt Pantaleone | AI Strategy & Automation Engineering Expert",
    ),
    description: truncateDescription(
      "AI strategy consultant and forward-deployed engineer building agentic AI systems, automation architectures, and custom LLM integrations for enterprise businesses.",
    ),
    slug: "/about",
  },
  {
    page: "Experience",
    title: truncateTitle("Experience | AI Engineering & Automation Strategy"),
    description: truncateDescription(
      "Professional history in forward-deployed AI engineering, automation architecture, agentic AI development, and digital transformation strategy.",
    ),
    slug: "/experience",
  },
  {
    page: "Education",
    title: truncateTitle("Education | Technical Foundations in AI & Dev"),
    description: truncateDescription(
      "Academic background and certifications in software engineering and AI technologies.",
    ),
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
    page: "Shop",
    title: truncateTitle("Shop | AI Apps, Workflows, Services & Artwork"),
    description: truncateDescription(
      "Explore AI applications, N8N workflows, AI services, and digital artwork for purchase.",
    ),
    slug: "/shop",
  },
  {
    page: "Contact",
    title: truncateTitle(
      "Hire AI Engineer | Automation Consulting & Strategy Services",
    ),
    description: truncateDescription(
      "Contact for AI engineering, automation strategy implementation, and agentic workflow development. Get expert consultation on business automation solutions.",
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
