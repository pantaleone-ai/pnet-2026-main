# SEO Writing Optimization — Hallmark Copy Rules

Branch: `seo/hallmark-writing-optimization`

All copy rewritten following Hallmark writing rules: specific verbs, active voice, no fabricated metrics, no startup cliches, no slop. Every headline and lede should pass the "vagueness test" — a reader should know what you do after scanning once.

---

## Changes by File

### 1. Home Page Hero — `features/home/components/Hero.tsx`

**Before:**
- Headline: "We Create the Future"
- Lede: "We help forward-thinking businesses and leaders architect the future through AI, automation, agentic workflows, and proprietary digital platforms."
- Sub-lede: "With nearly 20 years of experience optimizing the largest businesses in the world, we drive transformative change to businesses and governments."

**After:**
- Headline: "AI systems that run themselves."
- Lede: "We design and deploy autonomous agents, workflow automation, and AI-powered platforms for companies that need operations to scale without adding headcount."
- Sub-lede: "N8N workflows. LangChain pipelines. Custom LLM integrations. Built to ship, not to demo."

**Why:** Removed "forward-thinking", "architect the future", "proprietary digital platforms", "nearly 20 years", "optimizing the largest businesses", "transformative change". Replaced with specific tools and concrete value proposition.

---

### 2. Home Skills — `features/home/data/skills.ts`

**Before:**
- Automation: "Building autonomous agents."
- AI Products: "AI platforms and workflows."
- 16+ Years: "of diverse AI consulting experience."

**After:**
- Agentic AI: "Autonomous agents that handle multi-step workflows — from data extraction to customer support to internal tooling."
- Workflow Automation: "N8N, LangChain, and custom pipelines that connect your stack and run without intervention."
- LLM Integration: "Fine-tuning, RAG pipelines, and custom model deployments for production use cases."
- AI Strategy: "From audit to deployment — identifying where AI saves time, cuts cost, or unlocks new revenue."

**Why:** Each skill now names specific tools and use cases instead of generic claims. Removed the "16+ Years" count (unverifiable claim).

---

### 3. Experience Page — `app/(app)/(root)/experience/page.tsx`

**Before:**
- "I have extensive experience in software development, with a focus on building modern web applications..."
- "My professional journey includes working on various projects..."
- "While specific work history details are not available at this time..."

**After:**
- "Most of my career has been spent building and shipping software — frontend, backend, and the infrastructure in between. Recent years have focused almost entirely on AI systems: autonomous agents, LLM integrations, and production automation."
- "I've worked with clients ranging from startups to large enterprises, building things like document processing pipelines, conversational agents, and internal tooling that runs without human intervention."

**Why:** Removed placeholder text. Added specific project examples. Removed "cutting-edge technologies" and "wealth of practical knowledge".

---

### 4. Education Page — `app/(app)/(root)/education/page.tsx`

**Before:**
- "I have a strong foundation in computer science and software development..."
- "While specific academic details are not available at this time..."

**After:**
- "Computer science foundation with a focus on systems design and software engineering. Most of what I use daily — LangChain, N8N, LLM deployment — was learned by building production systems, not in a classroom."
- "I stay current through hands-on work: shipping AI agents, iterating on automation pipelines, and reading research papers when the problem demands it."

**Why:** Removed placeholder text. Honest about how skills were actually acquired. Names specific tools.

---

### 5. SEO Metadata — `config/seo/head.ts`

All page titles and descriptions rewritten:

| Page | Before | After |
|------|--------|-------|
| Home | "Pantaleone.ai \| AI Engineering & Agentic Automation Strategy" | "Pantaleone.ai \| AI Systems, Automation & LLM Integration" |
| About | "About Matt Pantaleone \| AI Strategy & Automation Engineering Expert" | "About Matt Pantaleone \| AI Engineering & Automation" |
| Experience | "Experience \| AI Engineering & Automation Strategy" | "Experience \| AI Engineering & Automation Work" |
| Education | "Education \| Technical Foundations in AI & Dev" | "Education \| Computer Science & AI Engineering" |
| Blog | "Blog \| AI Workflows & Automation Insights" | "Blog \| AI Workflows & Automation Notes" |
| Projects | "Projects \| AI Platforms, Rapigent, & AICEO" | "Projects \| AI Platforms & Automation Tools" |
| Shop | "Shop \| AI Apps, Workflows, Services & Artwork" | "Shop \| AI Workflows, Apps & Services" |
| Contact | "Hire AI Engineer \| Automation Consulting & Strategy Services" | "Contact \| AI Engineering & Automation Consulting" |
| Changelog | "Changelog \| Platform Evolution & Updates" | "Changelog \| Platform Updates & Development" |

**Why:** Removed keyword stuffing ("Expert", "Strategy Services", "Evolution"). Descriptions now state what the business does, not what the page contains.

---

### 6. Shop Heading — `app/(app)/(root)/shop/page.tsx`

**Before:** `"Shop AI Products, Services, Apps & Artwork"` (keyword-stuffed)

**After:** `"Shop"`

**Why:** Heading was a keyword list. One word is enough.

---

### 7. Blog PAGE Lookup Fix — `app/(app)/(root)/blog/page.tsx`

**Before:** `const PAGE = "AI Tech & Automation Blog"` — didn't match HEAD entry `page: "Blog"`, causing metadata lookup to fail.

**After:** `const PAGE = "Blog"`

**Why:** This was a bug. The PAGE constant must match the `page` field in HEAD for metadata to work. Also simplified the heading from "AI Tech & Automation Blog" to "Blog".

---

## Hallmark Rules Applied

| Rule | What Changed |
|------|-------------|
| No purple-gradient heroes | "We Create the Future" → "AI systems that run themselves." |
| No startup cliches | Removed "forward-thinking", "architect the future", "transformative change" |
| No fabricated metrics | Removed "nearly 20 years", "16+ Years", "largest businesses in the world" |
| Specific verbs/tools | Added N8N, LangChain, RAG pipelines, fine-tuning in place of generic "AI" |
| Active voice | "My work focuses on bridging the gap" → "Most of my career has been spent building" |
| No placeholder text | Removed "While specific details are not available" on both pages |
| Link text stands alone | Shop heading: keyword list → single word |
| Labels describe | Blog PAGE constant now matches HEAD entry |

---

## Not Changed (Per User Request)

- **About page** — explicitly skipped for now
- **Blog post content** — 28 MDX posts untouched
- **Project showcase data** — individual project descriptions untouched
- **Shop product data** — individual product descriptions untouched
- **Contact page** — returns null, no visible copy to change
- **Privacy/Changelog content** — legal/meta pages, no copy issues
