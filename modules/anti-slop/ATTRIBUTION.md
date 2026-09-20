# Attribution

All code in `@forwardos/anti-slop` is original implementation written for this
repository (MIT, same as the monorepo).

The detection *taxonomies* (categories of AI-generation tells: contrast frames,
temporal openers, SaaS template sequences, render-farming tokens, etc.) were
informed by studying the public problem statements and rule lists of community
projects. No code was copied from any of them:

- Nutlope/hallmark — https://github.com/Nutlope/hallmark
- Studio-Groei/anti-slop — https://github.com/Studio-Groei/anti-slop
- hap-team/deslop — https://github.com/hap-team/deslop
- voiscko/humanizer — https://github.com/voiscko/humanizer
- miqdadbadjuber/anti-slop — https://github.com/miqdadbadjuber/anti-slop
- prathameshagrawal/design-anti-slop — https://github.com/prathameshagrawal/design-anti-slop
- judetelan/ai-humanizer — https://github.com/judetelan/ai-humanizer
- haidrrrry/humanize-ai-writing — https://github.com/haidrrrry/humanize-ai-writing

If any reusable snippet from these projects is incorporated in the future, it will
be listed here with its license and a link to the source.

## Tropes taxonomy

The never-write lexicon and the structural-trope detection rules
(negative-parallelism family, countdown negation, self-answered questions,
bold-first bullets, anaphora/tricolon abuse, invented concept labels,
historical analogy stacking, "serves as" dodge, magic adverbs) are adapted
from **AI Writing Tropes to Avoid — [tropes.fyi](https://tropes.fyi) by
[ossama.is](https://ossama.is)**, via the fork chain
[ossa-ma/tropes.md](https://gist.github.com/ossa-ma/f3baa9d25154c33095e22272c631f5a1)
→ [pantaleone-ai/tropes.md](https://gist.github.com/pantaleone-ai/dab4e1d2132976c364e7d85d17cc98ad),
plus the project's own never-write word list. Taxonomy and rule ideas only —
all detection code is original implementation in this repository.
