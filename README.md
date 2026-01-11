# pantaleone.net - AI Portfolio & Digital Solutions

<div align="center">

  <br />

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)

  <br />

  <h3>
    <a href="https://pantaleone.net">🌐 Live Demo</a>
    <span> | </span>
    <a href="#-getting-started">🚀 Getting Started</a>
  </h3>
</div>

<br />

A modern, AI-focused portfolio and digital solutions platform built with **Next.js 16 (App Router)**, **Tailwind CSS v4**, and **Shadcn UI**. Showcases AI products, automation workflows, and digital consulting services through an integrated shop, blog, and project showcase.

---

## 🛠️ Tech Stack

Built with cutting-edge web technologies and AI integrations for optimal performance and modern development experience.

| Category          | Technology                                                   | Description                                     |
| ----------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| **Framework**     | [Next.js 16](https://nextjs.org/)                            | App Router, Turbopack, Server Components        |
| **Styling**       | [Tailwind CSS v4](https://tailwindcss.com/)                  | Utility-first CSS framework                     |
| **UI Library**    | [shadcn/ui](https://ui.shadcn.com/)                          | Accessible & customizable components            |
| **Animation**     | [Motion](https://motion.dev/)                                | Declarative animations (formerly Framer Motion) |
| **Content**       | [Fumadocs](https://fumadocs.dev/)                            | MDX-based content management                    |
| **State**         | [Nuqs](https://nuqs.47ng.com/) & [Jotai](https://jotai.org/) | URL state & atomic state management             |
| **AI Integration**| [Model Context Protocol](https://modelcontextprotocol.io/)   | AI agent communication and tool integration     |
| **Analytics**     | [PostHog](https://posthog.com/)                              | Product analytics & insights                    |
| **Commerce**      | [Stripe](https://stripe.com/)                                | Payment processing for AI products              |
| **Deployment**    | [Vercel](https://vercel.com/)                                | Edge network deployment                         |

---

## ✨ Key Features

- **🛒 AI Product Shop**: E-commerce platform for selling AI apps, workflows, services, and artwork.
- **🤖 AI Agent Integration**: LLM-txt endpoints for AI agent discovery and MCP protocol support.
- **📝 MDX Blog**: Comprehensive content on AI, automation, and digital transformation.
- **🎨 Modern Aesthetic**: Minimalist design with interactive particle animations and smooth transitions.
- **🌗 Dark Mode**: Seamless theme switching with system preference detection.
- **⚡ High Performance**: Optimized Core Web Vitals, fast LCP/FCP using Next.js 16.
- **🔎 Smart Search**: Client-side fuzzy search with keyword highlighting across all content.
- **📱 Responsive**: Fluid layouts that adapt perfectly to mobile, tablet, and desktop.
- **🔍 SEO Ready**: JSON-LD schema, dynamic sitemap, robots.txt, and Open Graph tags.
- **💳 Payment Integration**: Stripe-powered checkout for AI products and services.
- **📊 Analytics**: PostHog integration for user behavior insights and conversion tracking.

---

## 🚀 Getting Started

Follow these steps to run the project locally.

### Prerequisites

- **Node.js** 20+ installed
- **npm** or **pnpm** (recommended)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/pantaleone-ai/pnet-2026-main.git
   cd pnet-2026-main
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure Environment**

   Copy the template to create your local environment file:

   ```bash
   cp env.template .env.local
   ```

   Open `.env.local` and add your API keys (e.g., Stripe, PostHog, Resend).

4. **Start the Development Server**
   ```bash
   npm run dev
   ```
   The site should be live at [http://localhost:1408](http://localhost:1408) (development port).

### Available Scripts

| Command                | Description                                  |
| :--------------------- | :------------------------------------------- |
| `npm run dev`          | Starts the development server with Turbopack |
| `npm run build`        | Builds the application for production        |
| `npm run start`        | Starts the production server                 |
| `npm run lint`         | Runs ESLint checks                           |
| `npm run format:write` | Formats code using Prettier                  |
| `npm run validate-seo` | Validates SEO configuration                  |

---

## 🏗️ Project Structure

A comprehensive overview of the project architecture:

```
pantaleone.net/
├── actions/           # Server actions for data mutations and API calls
├── app/               # Next.js App Router (pages, layouts, API routes)
│   ├── (app)/         # Main application routes
│   ├── (llms)/        # AI agent discovery endpoints (/llms.txt, /llms-full.txt)
│   └── api/           # REST API endpoints
├── components/        # Shared React components (atomic design)
├── config/            # Static configuration (site, navigation, SEO, analytics)
├── features/          # Feature-based modules
│   ├── blog/          # MDX blog system with search and categories
│   ├── shop/          # E-commerce platform for AI products
│   ├── projects/      # Portfolio project showcase
│   ├── home/          # Landing page components
│   └── common/        # Shared feature components
├── hooks/             # Custom React hooks
├── lib/               # Shared utilities and helpers
│   ├── mcp-utils.ts   # Model Context Protocol utilities
│   └── search-*.ts    # Search and indexing functionality
├── public/            # Static assets (images, fonts, favicons)
├── scripts/           # Build and utility scripts
├── styles/            # Global styles and Tailwind configuration
└── types/             # TypeScript type definitions
```

---

## 🤖 AI Agent Discovery

This platform includes LLM-txt endpoints for AI agent integration:

- **`/llms.txt`** - Basic AI agent discovery information
- **`/llms-full.txt`** - Comprehensive site information for AI agents
- **MCP Integration** - Model Context Protocol support for advanced AI tool integration

These endpoints allow AI agents to discover and interact with the platform's content, products, and services programmatically.

---

## 📄 License

This project is open source and available under the [MIT License](./LICENSE).

---

## 🙏 Acknowledgments

Special thanks HireTim for the awesome base template! to the open-source community and the creators of these tools:

- [Fumadocs](https://fumadocs.dev) for the amazing documentation framework.
- [shadcn/ui](https://ui.shadcn.com) for the beautiful component primitives.
- [Lucide](https://lucide.dev) for the crisp icon set.
