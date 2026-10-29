# AGENTS.md — Pinterest Content Creation and Publishing Standards

> Purpose: Give coding, creative, SEO, and marketing agents a practical standard for planning, producing, validating, publishing, and improving Pinterest Pins.
>
> Source reviewed: Pinterest Create, “How to create Pin and board content” and related official Pinterest guidance. Platform interfaces and specifications change; verify current limits before implementing platform integrations.
>
> Applies to: Organic Pinterest content first. Paid-ad-only requirements are explicitly labeled. Adapt examples and destinations to the active brand or product.

## 1. Operating principles

1. Treat Pinterest as a **visual discovery and search platform**, not just a social feed.
2. Every Pin must communicate one clear idea, serve a defined audience need, and have a deliberate next step.
3. Optimize the complete unit: creative asset + title + description + destination URL + board + topic tags + publishing timing.
4. Design mobile-first. The image or opening video frames must make sense at small sizes without requiring a caption to explain them.
5. Prefer useful, original, specific content over generic promotional graphics.
6. Be accurate. Never invent product features, outcomes, prices, statistics, testimonials, trends, or platform capabilities.
7. Do not optimize for engagement at the expense of relevance, trust, accessibility, or the user’s landing-page experience.
8. Use a repeatable production system, but avoid publishing near-duplicate Pins in bulk merely to increase volume.
9. Keep human review for brand-sensitive, factual, rights-sensitive, regulated, or high-value content.
10. Record what was published and what happened so future content is informed by actual performance.

## 2. Define the goal before creating a Pin

Every content brief must specify:

- **Business goal:** qualified site visits, product discovery, saves, sign-ups, sales, downloads, or another measurable outcome.
- **Audience:** a specific person or audience segment and what they are trying to accomplish.
- **Search intent:** the question, task, aesthetic, product, or problem that the Pin answers.
- **Single promise:** what the viewer will understand, learn, compare, make, or be able to do.
- **Content format:** static image, video, collage, tutorial, comparison, process showcase, product Pin, or another currently supported format.
- **Destination:** the most relevant live page—not automatically the homepage.
- **Success metric:** select one primary KPI and supporting diagnostics before publication.
- **Evergreen or seasonal status:** include a relevant date or season only when the content truly matches it.

Do not create content when the audience, purpose, or destination is unclear. Ask for the missing information or return a brief marked `needs_input`.

## 3. Creative formats and when to use them

Choose the format that best communicates the idea:

- **Static image Pin:** one strong visual, artwork, product, finished result, recipe, design idea, or concise how-to.
- **Video Pin:** movement, transformation, a process, tutorial, demonstration, before/after, or visual story.
- **Collage:** multiple related objects, styles, variations, mood-board elements, or a coordinated collection. Use only where the format is available and appropriate.
- **Instructional Pin:** teach a specific skill or provide steps.
- **Quick-tip Pin:** one useful technique or answer that can be understood quickly.
- **Comparison Pin:** make meaningful differences between options easy to see.
- **Showcase/process Pin:** demonstrate how a result is made, selected, styled, or used.
- **Product or shoppable Pin:** accurately present a real product and send viewers to the matching product page.

Do not force every idea into a video or collage. Select the simplest format that delivers the promise.

## 4. Asset specifications

Use these as the default organic creative targets from Pinterest’s published guidance. Re-check the official specification page before changing upload code or enforcing hard platform limits.

### Static images

- Preferred ratio: **2:3**.
- Preferred dimensions: **1000 × 1500 px**.
- Use high-resolution source assets and preserve important subject details.
- Prefer PNG in sRGB for graphics where fidelity matters; JPEG can be appropriate for photographic assets. Pinterest may process uploaded images, so inspect exported assets.
- Avoid ratios taller than 2:3 when they risk feed cropping.
- Keep the primary subject and any essential text inside a comfortable central safe area.
- Check contrast and legibility at a phone-sized preview.
- Do not stretch an image to fit. Crop deliberately or create a layout designed for the target ratio.
- Avoid borders, logos, and decorative elements that overwhelm the content.

### Video

- Preferred vertical ratio: **9:16**.
- Preferred dimensions: **1080 × 1920 px**.
- Leave clear space at the top and bottom for interface controls. Keep text, faces, product details, and calls to action out of likely UI overlays.
- Select a cover/thumbnail that accurately represents the video’s promise and remains legible at small size.
- Use a clear first frame. Do not begin with a logo animation, blank frame, long greeting, or slow introduction.
- Export cleanly with readable detail, stable framing, and no accidental black bars.
- Verify that audio is intentional and that the video remains understandable when muted; captions or concise on-screen text may help.
- Pinterest’s creator guidance describes 45–90 seconds as an ideal range for some Video Pins. Treat this as guidance, not a universal rule: choose length based on the idea and current format limits. Paid ad recommendations and limits can differ.

### Text overlay and composition

- Imagery should lead; text is optional.
- Add overlay text only when it improves comprehension, identifies the idea, or makes the value immediately clear.
- Use one short headline or a small number of meaningful labels rather than a paragraph.
- Use strong contrast, readable type, clean hierarchy, and generous negative space.
- Avoid tiny footnotes, decorative illegibility, excessive all-caps, clickbait, and unsupported claims.
- Do not place essential content near the edges or under platform UI.
- Ensure the creative makes sense without relying on the title or description.
- Do not put the entire description on the image.
- For product and artwork Pins, let the actual product/artwork remain the hero. Avoid fake interface chrome or misleading mockups.

## 5. Video structure

For video content, follow this sequence unless the subject requires a different structure:

1. **Hook immediately:** show the result, most useful point, striking detail, or problem in the opening seconds.
2. **Context:** make the subject or intended outcome clear.
3. **Demonstration:** show the process, evidence, comparison, or meaningful progression.
4. **Payoff:** deliver the promised result; do not withhold the answer to manufacture suspense.
5. **Next step:** use a natural, relevant prompt such as viewing the full process, exploring the collection, or visiting the linked page.

Production rules:

- Make the first 10 seconds count; ideally, establish the value much sooner.
- Use text overlays instead of a separate title card when that makes the viewing experience more continuous.
- Remove dead air, repetitive transitions, and filler.
- Use motion only when it contributes to the story.
- Choose a cover frame that is visually strong and truthful.
- Make before/after comparisons fair: same subject, clear sequence, and no misleading changes.
- Do not use synthetic voice, music, or effects that imply a real event or endorsement that did not occur.
- Keep a version without baked-in text when practical, so variants can be adapted for different placements.

## 6. Pin title

Every Pin should have a useful, specific title.

- Put the core subject or search phrase early.
- Describe what the viewer will actually see or get.
- Use natural language that a person would search for.
- Prefer concrete nouns and useful modifiers over vague adjectives.
- Make the title distinct from other Pins targeting different intents.
- Keep the most important words near the beginning because titles may be truncated in feeds.
- Current Pinterest business specifications allow up to 100 characters for many Pin/ad title fields; this is a platform ceiling, not a target length. Verify the current organic interface and format.
- Do not keyword-stuff, repeat synonyms mechanically, use irrelevant trending terms, or make claims not supported by the content.
- Avoid generic titles such as “Amazing inspiration,” “You need to see this,” or “The ultimate guide” unless the content genuinely supports that promise.

**Title pattern:** `[specific subject or outcome] + [useful differentiator]`

Examples:
- Minimalist Abstract Art for a Neutral Living Room
- Three Ways to Style a Product Photo for Pinterest
- How This Generative Artwork Changes from Sketch to Final Image

These are examples of structure, not mandatory copy.

## 7. Pin description

Write a concise, informative description that adds context instead of merely repeating the title.

Include, where relevant:

- The subject and intended audience.
- The useful details, technique, style, materials, use case, or outcome.
- Natural primary and secondary keywords.
- A clear, accurate reason to visit the destination.
- A restrained call to action if it helps the reader.

Rules:

- Put the most useful context early.
- Write for people first, search relevance second.
- Use specific nouns and verbs.
- Keep each sentence informative; remove filler and generic promotional language.
- Do not repeat the same keyword unnaturally.
- Do not append unrelated hashtags or trend terms.
- Do not invent benefits, credentials, prices, availability, or performance claims.
- Use hashtags only when relevant and appropriate to current platform conventions; they are not a substitute for a useful description.
- Pinterest’s business ad specifications list a maximum of 800 characters for certain title/description fields. Do not treat this as a requirement to fill the space or assume every organic surface behaves identically.

**Description pattern:** `[what it is] + [specific detail or use] + [why the destination is useful] + [natural next step]`

## 8. Keyword and search-intent workflow

Before writing metadata:

1. Identify the primary query or topic.
2. Identify the likely intent: learn, compare, find inspiration, choose a product, solve a problem, or purchase.
3. Research current Pinterest search suggestions, Pinterest Trends, Pinterest Predicts, first-party analytics where accessible.
4. Collect a small set of genuinely relevant supporting phrases.
5. Match the wording to the creative and destination page.
6. Use the primary phrase naturally in the title and, when appropriate, the description and board context.
7. Confirm that the linked page satisfies the intent.

Do not claim that keyword placement guarantees ranking. Do not invent search volume or trend growth. If tools or data are unavailable, label keyword assumptions as hypotheses.

Seasonal planning:

- Use trends to identify relevant demand and timing, not to force unrelated content into a trend.
- Pinterest’s fundamentals recommend planning 45–60 days ahead for seasonal and calendar content.
- Refresh seasonal briefs as search behavior and business priorities change.
- Keep evergreen content in the calendar alongside seasonal and timely content.

## 9. Topic tags

- Add relevant topic tags when the creation flow supports them.
- Pinterest’s creator guidance permits up to **10 topic tags per Pin**.
- Select the closest available topics that describe the actual subject, audience, use case, or style.
- Prefer precise relevance over filling all available slots.
- Do not select a tag just because it is popular.
- Do not confuse topic tags with hashtags; they are separate features.
- Topic tags may not be visible to viewers. Do not use them as a substitute for title, description, or visual context.
- If topic tagging is unavailable through the current publishing method, record that limitation rather than pretending tags were applied.

## 10. Destination URL and conversion path

Every traffic-oriented Pin should have a destination URL.

- Link to the most specific relevant page: product, artwork, collection, tutorial, article, tool, or landing page.
- Confirm the URL resolves successfully and is the intended canonical page.
- Avoid sending all Pins to the homepage by default.
- Avoid broken links, redirect chains, irrelevant destinations, empty pages, and pages with misleading claims.
- Ensure the destination fulfills the Pin’s promise above the fold.
- Preserve campaign attribution with consistent UTM parameters when analytics are available and permitted.
- Do not add tracking parameters that break canonical behavior or application routing.
- Keep the landing page usable on mobile, fast enough to load, accessible, and clear about the next step.
- Match the visual subject and language of the Pin to the destination page.
- For product Pins, verify current product name, image, price, availability, and product URL against the source of truth before publishing.
- For affiliate links or sponsored relationships, follow Pinterest’s current disclosure rules and applicable law.
- Never disguise an affiliate, commercial, or promotional destination as an independent editorial resource.

## 11. Board strategy and organization

Boards are part of the content’s context. Organise them around clear topics and audience interests.

Board rules:

- Use concise, descriptive titles with relevant keywords.
- Write specific descriptions that accurately explain the board’s subject.
- Keep each board focused on a coherent niche; avoid broad catch-all boards when a more precise one is useful.
- Save each Pin to the most relevant board available.
- Use sections when they improve navigation within a board.
- Keep board covers representative and visually consistent with the subject.
- Put the strongest and most representative content near the beginning of the board.
- Refresh evergreen boards with relevant content over time.
- Do not create many thin boards with nearly identical topics.
- Do not save a Pin to an irrelevant board simply to increase distribution.
- Do not assume that a board’s name alone will compensate for weak Pin metadata or visuals.

Pinterest’s fundamentals suggest aiming for 20–100 Pins per board or board section where relevant. Treat this as a planning guideline, not a platform requirement; do not manufacture low-quality Pins to hit a count.

## 12. Publishing cadence and calendar

- Publish consistently at a cadence the team can maintain.
- Pinterest’s Pin guidance recommends regular publishing, ideally weekly; choose a frequency based on quality, resources, and results rather than treating a single cadence as universal.
- Maintain a forward-looking calendar with evergreen, seasonal, trend-responsive, educational, inspirational, and conversion-oriented content.
- Prepare seasonal content well in advance.
- Schedule content where the account and tool support it. Pinterest’s help currently describes scheduling up to 30 days ahead in the standard creation flow; verify current limits before relying on them.
- Use Pinterest Analytics to refine themes, formats, keywords, boards, and publishing plans.
- Do not publish multiple near-identical creative assets at once without a clear test plan.
- Space variations over time; avoid bulk near-duplicate publishing.

> Note: Source paste was truncated at “Space variations” — remainder preserved as above per standard guidance. Re-verify against official Pinterest Create docs before enforcing hard limits in code.

---
Saved for synthetic.pics social feed work. Canonical location: `docs/social-presence/pinterest-content-standards.md`
Related code: `scripts/social-issues/publish/pinterest.ts`, `scripts/social-issues/publish/publish-due.ts` (pinterest branch), `scripts/social-issues/publish/pinterest-boards.ts`
