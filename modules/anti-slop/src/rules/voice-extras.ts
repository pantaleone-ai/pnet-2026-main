/**
 * Pnet extra voice layer — scans config/voice/anti-patterns.json categories
 * as contextual voice-drift signals. Full port, soft severity only.
 *
 * Respects: allowlist (pattern name or exact phrase), protectedTerms
 * (handled upstream by protect()), vocabulary/brandTerms (exact-term skip).
 */

import type { Finding, ScanOptions, Severity } from "../types.js";

let seq = 0;
const nid = (p: string) => `${p}-${++seq}-${Date.now().toString(36)}`;

function excerpt(text: string, index: number, radius = 48): string {
  const s = Math.max(0, index - radius);
  const e = Math.min(text.length, index + radius);
  return (s > 0 ? "…" : "") + text.slice(s, e).replace(/\s+/g, " ") + (e > text.length ? "" : "…");
}

interface Bucket {
  phrases: string[] | undefined;
  pattern: string;
  severity: Severity;
  confidence: number;
  action: string;
}

function isAllowedPhrase(phrase: string, opts: ScanOptions): boolean {
  const t = phrase.toLowerCase();
  const allow = [...(opts.projectProfile?.allowlist ?? [])].map((a) => a.toLowerCase());
  if (allow.includes(t)) return true;
  const vocab = [...(opts.voiceProfile?.vocabulary ?? []), ...(opts.voiceProfile?.brandTerms ?? [])].map((a) => a.toLowerCase());
  if (vocab.includes(t)) return true;
  if ((opts.projectProfile?.protectedTerms ?? []).map((a) => a.toLowerCase()).includes(t)) return true;
  if ((opts.protectedTerms ?? []).map((a) => a.toLowerCase()).includes(t)) return true;
  return false;
}

export function scanVoiceExtras(text: string, opts: ScanOptions): Finding[] {
  const out: Finding[] = [];
  const ex = opts.voiceExtras;
  const v = opts.voiceProfile;
  const buckets: Bucket[] = [
    {
      phrases: [...(v?.genericOpeners ?? []), ...(ex?.generic_openers ?? [])],
      pattern: "voice-generic-opener",
      severity: "medium",
      confidence: 0.7,
      action: "Delete the opener; start with the point.",
    },
    {
      phrases: [...(v?.fillerTransitions ?? []), ...(ex?.filler_transitions ?? [])],
      pattern: "voice-filler",
      severity: "medium",
      confidence: 0.65,
      action: "Delete the filler transition; state the observation.",
    },
    {
      phrases: [...(v?.contrastCliches ?? []), ...(ex?.contrast_cliches ?? [])],
      pattern: "voice-contrast-cliche",
      severity: "medium",
      confidence: 0.65,
      action: "State the concrete distinction without the contrast frame.",
    },
    {
      phrases: [...(v?.rhetoricalClosers ?? []), ...(ex?.rhetorical_closers ?? [])],
      pattern: "voice-closer",
      severity: "medium",
      confidence: 0.65,
      action: "Cut the closer or replace it with a verifiable decision or next step.",
    },
    {
      phrases: [...(v?.marketingHype ?? []), ...(ex?.marketing_hype ?? [])],
      pattern: "voice-hype",
      severity: "low",
      confidence: 0.6,
      action: "Swap the hype term for the concrete capability or cut it.",
    },
    {
      phrases: [...(v?.hedgeSuperlatives ?? []), ...(ex?.hedge_superlatives ?? [])],
      pattern: "voice-hedge",
      severity: "low",
      confidence: 0.55,
      action: "Commit where evidence allows; qualify only the genuinely uncertain claim.",
    },
  ];

  // Avoid triple-flagging: single-word habits already emit voice-drift with
  // alternatives. Extras own the multi-word frames (openers/fillers/closers).
  const bannedSet = new Set((opts.voiceProfile?.bannedStylisticHabits ?? []).map((h) => h.toLowerCase()));
  for (const b of buckets) {
    if (!b.phrases || b.phrases.length === 0) continue;
    if (opts.projectProfile?.allowlist?.includes(b.pattern)) continue;
    for (const raw of b.phrases) {
      const phrase = raw.trim();
      if (!phrase || isAllowedPhrase(phrase, opts)) continue;
      if ((b.pattern === "voice-hype" || b.pattern === "voice-hedge") && bannedSet.has(phrase.toLowerCase())) continue;
      const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(phrase.length <= 24 && !phrase.includes(" ") ? `(?<![A-Za-z])${esc}(?![A-Za-z])` : esc, "i");
      const m = re.exec(text);
      if (m) {
        out.push({
          id: nid("vext"),
          category: "voice",
          severity: b.severity,
          location: excerpt(text, m.index ?? 0),
          pattern: `${b.pattern}:${phrase.toLowerCase().slice(0, 40)}`,
          explanation: `Pnet voice pattern ("${phrase}") — marketing/default phrasing, not founder-technical voice.`,
          suggested_action: b.action,
          confidence: b.confidence,
          layer: 4,
          offset: m.index ?? 0,
        });
      }
      if (out.length > 40) return out;
    }
  }
  return out;
}
