# Email Routing — catch-all map, Gmail labels, inbound triage pilot

All 9 zones: Email Routing **enabled**, catch-all → **forward to
`mattpantaleone@gmail.com`**, apex MX → `route*.mx.cloudflare.net`.
Applied 2026-10-14 via `wrangler email routing` (see git history).
Second destination `davidpantaleone@gmail.com` created 2026-10-20
(**pending verification** — do NOT add to any rule until `verified` is set;
an unverified destination stalls the rule). After David clicks the
verification link, extend the mixphd catch-all (or explicit rules) to
`["mattpantaleone@gmail.com", "davidpantaleone@gmail.com"]`.
(Note: a misspelled `david.pantaleone@gmail.com` entry also exists,
unverified and unreferenced — delete once Cloudflare's new-address
grace period lapses.)
Custom prio-0 rules (`matt@aicapturelab.com`, `aiceo@aiceo.io`,
`matt@synthetic.pics`) take precedence over their catch-alls and were left intact.
`send.proswing.net` (SES) untouched.

## Delivery evidence (2026-10-20)

Resend probe `probe@pantaleone.net → probe-<ts>@mixphd.com`
(Resend id `01a15a52-527a-7297-8a77-951b173273a2`) accepted for delivery
through the catch-all. Confirm receipt in the Gmail inbox (unique subject
`mixphd catch-all probe <ts>`). Earlier missing test mails were almost
certainly same-account sends (Gmail swallowing mail forwarded back into
the sending mailbox) — always retest from a different sender.

## Per-domain Gmail labels (manual, 5 min, one-time)

Forwarding preserves the original `To:` domain, so filter on it.
Gmail → Settings → Filters → Create filter → **To:** `*@<domain>` →
Create → Apply label `<Label>`, Never send to spam.

| To domain | Label |
|---|---|
| `*@aicapturelab.com` | `AICaptureLab` |
| `*@aiceo.io` | `AICEO` |
| `*@mixphd.com` | `MixPHD` |
| `*@pantaleone.net` | `Pantaleone` |
| `*@print3dmodels.com` | `Print3DModels` |
| `*@profitsignals.xyz` | `ProfitSignals` |
| `*@proswing.net` | `ProSwing` |
| `*@rapigent.com` | `Rapigent` |
| `*@synthetic.pics` | `SyntheticPics` |

## Inbound → GitHub pilot (MixPHD, n8n)

- Routing: `support@mixphd.com` explicit forward rule
  (`support triage pilot`, prio 0) → Gmail. Catch-all stays human-only.
- Workflow file: `workflows/n8n-mixphd-inbound-triage.json` — import into
  n8n (`Workflows → Import from file`), connect Gmail OAuth2 + GitHub
  credentials, activate. Default mode is **dry-run OFF but gated**: issues are
  created `status:queued` + `source:inbound-email` + `site:mixphd` + `P2`
  and assigned for human review — no auto-execution. Close the loop by
  resolving the issue in the repo queue (`pick-next` / orchestrators pick
  it up like any other queued issue).
- Verify: send test mail to `support@mixphd.com` → exactly one issue with a
  `Message-ID` dedupe key; send spam sample → no issue; resend same mail →
  still one issue.
- Rollback: disable the n8n workflow; delete the `support@` rule
  (catch-all keeps delivering to Gmail regardless).

## Rollback (per domain, instant)

`wrangler email routing rules update <domain> catch-all --action-type drop
--zone-id <zone-id>` then optionally
`wrangler email routing disable <domain>`. Destinations, MX, and prio-0
rules are untouched by a drop flip.
