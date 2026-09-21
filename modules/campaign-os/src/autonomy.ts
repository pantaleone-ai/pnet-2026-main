// Autonomy levels: 1 assist, 2 approve, 3 autonomous, 4 autonomous-optimization.
// Observability: agent execution records (Langfuse-compatible shape).
import { AutonomyLevel, Brand, Campaign } from "./types";
import { CampaignStore } from "./store";

export function requiresApproval(brand: Brand, campaign?: Campaign): boolean {
  const level: AutonomyLevel =
    campaign?.autonomy_level ?? brand.autonomy_level ?? 2;
  return level <= 2;
}

export function canAutoOptimize(brand: Brand): boolean {
  return brand.autonomy_level === 4;
}

export function autonomyLabel(level: AutonomyLevel): string {
  return level === 1
    ? "ASSIST"
    : level === 2
      ? "APPROVE"
      : level === 3
        ? "AUTONOMOUS"
        : "AUTONOMOUS OPTIMIZATION";
}

export function logAgentExecution(
  store: CampaignStore,
  e: {
    agent: string;
    task: string;
    input_ref: string;
    output: unknown;
    model: string;
    prompt_version: string;
    duration_ms: number;
    status?: "ok" | "error";
    error?: string;
  },
) {
  return store.recordAgentExecution({ status: "ok", ...e });
}
