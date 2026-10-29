# Copywriting pack — external lexicon integration

Two external CSVs (kept in `~/Downloads`, **not vendored**) feed a tier-tagged
pack compiled into `config/copywriting/pack.json`:

- `anti_slop_copywriting_rules.csv` — 2012 rows: word/phrase lexicon with
  per-term why + repair + legitimate-use guidance, 351 pattern rules,
  67 legitimate-use rules, 11 deception CRITICALs.
- `aiceo_prioritized_anti_slop_rules.csv` — same 2012 rows plus
  `aiceo_Implementation_Tier` (1: 172 · 2: 306 · 3: 1153 · 4: 381) and
  `aiceo_Deployment_Target`.

Reproduce with: `node scripts/build-pack.mjs <csv> [--out <pack>] [--report-only]`

## Tier mapping (how each tier runs in the engine)

| Tier | Engine home | Severity | Gate | Notes |
| --- | --- | --- | --- | --- |
| 1 markers (161) | `rules/copywriting.ts` (`copywriting-marker:*`, L1 lexical) | medium 0.7, phrase 0.8, formal-register low 0.5 | soft | Deduped vs engine banned habits + lexical signals; formal transitions (`moreover`, `hence`…) stay low |
| 1 CRITICAL (11) | `rules/deception.ts` (`deception-risk:*`, L4 content) | high 0.8–0.9, **soft** | soft | Deterministic subset only (see below); rest are LLM-critique prompts |
| 2 patterns (306) | `rules/text.ts` new `RHETORICAL_PATTERNS` + emoji-headings | per-pattern med/low | soft | 14 genuinely new patterns implemented; rest already covered (audit below) |
| 3 long tail (1141) | `rules/copywriting.ts` (`copywriting-pack:*`, L1 lexical) | low 0.45–0.65, frequency-scaled | soft | Domain-filtered (`projectProfile.copywritingCategories`, tech-writing defaults); single ordinary words need count ≥ 2; phrases fire on first use |
| 4 guardrails (314+67) | suppression tests + this doc | never findings | n/a | Literal domain terms must stay silent; KEEP-WHEN-PRECISE conditions documented |

### Deliberate deviations from the CSVs

1. **No bulk import.** Markers/patterns are curated into code; the long tail runs
   through frequency attenuation + domain filter. The CSVs' own editorial note
   ("this flag alone does not identify AI authorship") is load-bearing.
2. **Severities downgraded.** CSV HIGH → engine medium/low. Nothing subjective was
   added to `hardGates` (factual-integrity only). Promoting deception patterns to
   hard gates requires explicit approval.
3. **Tier-4 terms never flag.** `agent, latency, prompt, pipeline, user flow…`
   used literally are signal, not slop (covered by `tests/run.mjs` §18).

## Overlap audit (Phase 3+ verdicts)

Already covered by the engine before the pack (not re-implemented):
rhetorical contrast frames (`not just X but Y`, `it's more than X`, `isn't just`),
temporal openers, chatbot scaffolding (`let's dive in`, `in conclusion`),
engagement bait, countdown negation, self-answered questions, bold-bullet
symmetry, rule-of-three, em-dash/monotony/repetition checks, `fake-specificity`,
`unsupported-superlative`, vague-authority, invented labels, analogy stacking,
`generic-conclusion`, `keyword-stuffing`, voice-drift lexicon (~200 habits).

Adopted as new (Tier 2): `not-about-but-about`, `more-than-inverted`,
`reality-frame` (excludes `truth-is-simple` overlap via lookahead),
`false-intimacy`, `heres-why`, `no-secret`, `what-if-told`, `at-its-core`,
`everyone-knows`, `goes-without-saying`, `magic-happens`, `think-about-it`,
`in-todays-world`, `our-commitment`, `simple-answer`, `emoji-headings`.
Skipped as covered: `let's break it down` (= chatbot `lets-dive`),
`this is where` (= `voice-contrast-cliche`), `picture this` (= voice-drift),
`imagine…` (= `imagine-world`), `think of it as` (= `patronizing-analogy`).

## LLM-critique prompt pack (non-deterministic rows — do NOT regex these)

Use as `llmCritique` input or agent review checklist. Deterministic versions
would false-positive on honest prose.

**Deception CRITICAL (Tier 1):**
- AS-1894 fabricated first-person experience → "Flag any first-person success
  story ('I built/scaled…') with no verifiable entity, date, or artifact. Quote
  the sentence; do not rewrite it — ask the author for proof or removal."
- AS-1898/1899 invented case study / testimonial → "Flag named-client results
  without a source link, company, or permission note."
- AS-1897 citation that doesn't support the claim → "For each citation, state
  what exact claim it supports; flag mismatches."
- AS-1925 trimmed quote reversing meaning → "Flag ellipsized quotes where the
  omitted context could change the meaning."
- AS-1927 disclaimer excusing a misleading claim → "Flag when fine print
  contradicts the headline promise."
- AS-1893 typo-voice / AS-1892 slang-voice → "Flag deliberate errors/slang
  used as authenticity costume."

**Governance (Tier 4 HIGH, LLM class):** unlinked source claims; undisclosed
hypotheticals; unclear forecast sources; subject-less claims; adjectives that
don't change buying decisions; outcomes/baselines/denominators/percentages
without grounding; superlatives without comparison sets; safety claims without
threat models; universal-audience claims; company-generic claims; headlines
stronger than evidence; false certainty; "understands/knows" without data;
autonomy without permissions; charts without source/date; recommendation-less
pages; trade-off-less pitches; audience-undifferentiated house style.
(Deterministic subset implemented: statistic/denominator + superlative/comparison
→ `fake-specificity`/`unsupported-superlative`; understanding/autonomy claims →
`deception-risk:anthropomorphic-knowing`/`autonomy-without-permissions`.)

**Formatting (Tier 2, LLM/class judgment):** long intro before the answer;
testimonials promising universal outcomes; pages with no recommendation;
emoji-led headings are deterministic (`emoji-headings`, low).

## Tier-4 legitimate-use conditions (sampling; full list in pack.json)

Finance terms stay KEEP-WHEN-PRECISE: CAGR (report start/end dates + values),
EBITDA (define adjustments), LTV:CAC (disclose cohort/window/margin), ARR
(call it revenue vs bookings), alpha/beta (name benchmark + period). These
are the model for exemption-writing: condition, not just term.
