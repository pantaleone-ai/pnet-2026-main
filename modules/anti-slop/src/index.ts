/**
 * @forwardos/anti-slop public exports.
 */
export type * from "./types.js";
export { scanText } from "./engine/scanner.js";
export { scoreText } from "./engine/quality-model.js";
export { rewriteMinimal } from "./engine/rewrite.js";
export { runQualityGate, GATE_CHECKLIST } from "./engine/quality-gate.js";
export { audit, scan, guard } from "./engine/orchestrator.js";
export { protect, unprotect } from "./engine/protected.js";
export { loadTasteMemory, recordFeedback, applyTasteMemory } from "./engine/taste-memory.js";
export { analyzeSeo } from "./rules/seo.js";
export { analyzeDesign } from "./rules/design.js";
export { analyzeImagePrompt } from "./rules/image-prompt.js";
export { analyzeCode } from "./rules/code.js";
export { analyzeRhythm } from "./rules/rhythm.js";
export { analyzeEditorial } from "./rules/editorial.js";
export { analyzePrecisionRaw, analyzePrecisionText } from "./rules/precision.js";
export { analyzeCopywriting, DEFAULT_TIER3_CATEGORIES } from "./rules/copywriting.js";
export { analyzeDeception } from "./rules/deception.js";
export { scanVoiceExtras } from "./rules/voice-extras.js";
export {
  loadVoiceProfile,
  loadDesignProfile,
  loadProjectProfile,
  loadProtectedTerms,
  loadVoiceExtras,
  loadCopywritingPack,
  mergeVoiceExtras,
} from "./profiles.js";
export * as api from "./api.js";
