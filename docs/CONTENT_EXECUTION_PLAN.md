# Content Auto-Execution Plan — pantaleone.net

Status: PROPOSAL (branch `plan/content-auto-execution`, not implemented).
Parent: content-issues queue (`feature/content-issues-queue`, merged as #68).

## 1. Problem

The content engine today only manages queue *state*. Every 12h the
orchestrator claims an issue (`status:in-progress`), but no component writes
the article. Unchecked, ticks pile up claimed issues with zero output —
#33 and #34 were claimed twice and manually released, then closed as
not planned. The queue does not execute.

## 2. Goal

A claimed issue ends as a merged MDX article without manual drafting:
claim → draft → validate → PR (`Closes #N` + evidence) → human merge →
auto-close. Human keeps exactly one gate: the merge itself (per engine §8,
never auto-delete/merge).

## 3. Proposed pipeline (per claimed issue)

1. `pick-and-claim` outputs `issue_number` + `target_branch` (exists today).
2. New `draft-article` job (same workflow, `needs: pick-and-claim`):
   - Checks out `target_branch` (created from `main`).
   - Runs the writer agent with the issue body + `docs/CONTENT_ENGINE.md`
     §§4–7 + `docs/EDITORIAL.md` as context.
   - Writer produces `features/blog/content/<slug>.mdx`: frontmatter per
     §6, shape per §4, internal links via `content-graph.ts` (§5).
   - Runs gates: `npm run editorial`, `npm run content:validate`,
     `npm run check-types`. Max 2 fix passes; if the draft fails the
     §7 quality gate (originality/expertise), it is deleted and the
     issue is commented + released back to `status:queued` — never
     shipped thin.
   - Opens a PR with `Closes #N` and the evidence section. Issue moves
     to `status:in-review`.
3. Human reviews + merges. Existing `evidence-and-close` closes the issue
   with the evidence bundle (`status:done`).
4. Skip conditions (idempotency): branch already exists, open PR already
   references `#N`, or a WIP cap is hit (see §5) — job exits cleanly.

## 4. Writer implementation options

- **A. Agentic CI action (recommended):** Claude Code Action (or equivalent)
  with a scoped prompt file (`.github/content-writer.md`), allowed tools
  limited to the repo checkout, `ANTHROPIC_API_KEY` secret, per-run
  timeout ≤30 min, max 1 issue per run.
- **B. Local runner:** `scripts/content-issues/draft.ts` invoking the same
  prompt via API for supervised runs. Useful for piloting before CI.
- Start with B on one P1, promote to A once the gate pass-rate is trusted.

## 5. Guardrails (non-negotiable)

- WIP cap: `pick-next.ts` skips claiming while any issue is
  `status:in-progress` without a linked PR (prevents the #33/#34 pile-up
  from recurring).
- Voice/claims: `docs/EDITORIAL.md` is binding on the writer — no invented
  customers, metrics, or credentials; unprovable claims are cut, not hedged.
- Protected spans: code fences, quotes, frontmatter, and
  `config/anti-slop/protected-terms.json` are never rewritten.
- Cost: fixed model, token ceiling, no retries beyond the 2 fix passes.
- Secrets: writer key in GitHub Secrets only; never logged or echoed.
- Scope: writer may touch only `features/blog/content/<slug>.mdx` (+ images
  via the existing pipeline). All other paths fail the run.

## 6. Phased rollout

1. WIP cap in `pick-next.ts` + test (`--dry-run` + unit).
2. Writer prompt file + local `draft.ts` runner (supervised, `--dry-run`
   prints the draft without writing).
3. Live pilot: one P1 issue end-to-end (draft → PR → human merge →
   auto-close verification — the first live test of `evidence-and-close`).
4. Wire `draft-article` CI job behind a workflow input flag (default off).
5. Enable on schedule; monitor 2 full 12h cycles; then remove the flag.

## 7. Acceptance criteria

- Claimed P1 produces a PR within one tick with zero manual drafting.
- `npm run editorial && npm run content:validate && npm run check-types`
  green on the PR before human review.
- Failed-gate drafts never reach PR (issue released with reason comment).
- No more than 1 issue in-flight without a linked PR at any time.
- P0 fundamentals (#33/#34 topics) re-created from the issue template and
  worked in priority order once the pilot passes.
