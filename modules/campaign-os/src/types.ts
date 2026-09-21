// Campaign OS — shared types. Source of truth for all entities.
// Follows ForwardOS isolation: pure TS, no imports from apps/ or core/framework.

export type ID = string;
export type ISODate = string; // ISO 8601

export type CampaignStatus =
  | "draft"
  | "planning"
  | "generating"
  | "review"
  | "approved"
  | "scheduled"
  | "active"
  | "paused"
  | "completed"
  | "failed"
  | "archived";

export type AssetStatus =
  | "draft"
  | "generating"
  | "qa"
  | "needs_revision"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "archived";

export type PublicationStatus =
  | "queued"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ExperimentStatus = "draft" | "running" | "completed" | "cancelled";
export type LearningStatus = "active" | "applied" | "expired" | "dismissed";
export type AutonomyLevel = 1 | 2 | 3 | 4; // assist, approve, autonomous, autonomous-optimization
export type ChannelType =
  | "website"
  | "linkedin"
  | "email"
  | "x"
  | "instagram"
  | "facebook"
  | "youtube";
export type AssetType =
  | "website_article"
  | "website_update"
  | "linkedin_post"
  | "x_post"
  | "email"
  | "newsletter_section"
  | "social_copy"
  | "campaign_cta"
  | "campaign_summary"
  | "metadata"
  | "seo_title"
  | "seo_description";
export type FatigueLevel = "LOW" | "MEDIUM" | "HIGH";

export interface Organization {
  id: ID;
  name: string;
  created_at: ISODate;
  updated_at: ISODate;
}
export interface Brand {
  id: ID;
  organization_id: ID;
  name: string;
  description: string;
  voice_config: VoiceConfig;
  strategy_config: StrategyConfig;
  autonomy_level: AutonomyLevel;
  created_at: ISODate;
  updated_at: ISODate;
}
export interface VoiceConfig {
  tone: string;
  vocabulary: string[];
  sentence_style: string;
  preferred_terminology: string[];
  prohibited_terminology: string[];
  examples: string[];
  banned_phrases?: string[];
}
export interface StrategyConfig {
  objectives: string[];
  audiences: string[];
  positioning: string;
  priorities: string[];
  topics_emphasize: string[];
  topics_avoid: string[];
  claims_policy: string;
  cta_rules: string[];
  formatting_rules: string[];
  channel_rules: Record<string, string>;
  frequency_limits: Record<string, number>;
  blackout_periods?: string[];
  utm_strategy?: UTMStrategy;
}
export interface Audience {
  id: ID;
  brand_id: ID;
  name: string;
  description: string;
  attributes: Record<string, unknown>;
  created_at: ISODate;
  updated_at: ISODate;
}
export interface SourceContent {
  id: ID;
  brand_id: ID;
  source_type: string;
  source_url: string;
  title: string;
  content: string;
  published_at?: ISODate;
  metadata: Record<string, unknown>;
  embedding?: number[];
  created_at: ISODate;
  updated_at: ISODate;
}
export interface CampaignStrategy {
  objective: string;
  audience: string[];
  primary_message: string;
  supporting_messages: string[];
  cta: string;
  channels: ChannelType[];
  duration_days: number;
  cadence: Record<string, unknown>;
  experiments: Array<Record<string, unknown>>;
  version: number;
}
export interface Campaign {
  id: ID;
  brand_id: string;
  name: string;
  objective: string;
  status: CampaignStatus;
  strategy?: CampaignStrategy;
  audience_id?: ID;
  start_at?: ISODate;
  end_at?: ISODate;
  autonomy_level: AutonomyLevel;
  created_at: ISODate;
  updated_at: ISODate;
}
export interface CampaignAsset {
  id: ID;
  campaign_id: ID;
  channel: ChannelType;
  asset_type: AssetType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  status: AssetStatus;
  version: number;
  parent_asset_id?: ID;
  source_content_id?: ID;
  experiment_id?: ID;
  scheduled_at?: ISODate;
  published_at?: ISODate;
  created_at: ISODate;
  updated_at: ISODate;
}
export interface Channel {
  id: ID;
  brand_id: ID;
  type: ChannelType;
  name: string;
  status: "connected" | "disconnected";
  configuration: Record<string, unknown>;
}
export interface Publication {
  id: ID;
  asset_id: ID;
  channel: ChannelType;
  external_id?: string;
  status: PublicationStatus;
  scheduled_at?: ISODate;
  published_at?: ISODate;
  error?: string;
  attempt_count: number;
  idempotency_key: string;
  created_at: ISODate;
  updated_at: ISODate;
}
export interface Metric {
  id: ID;
  publication_id: ID;
  metric_type: string;
  metric_value: number;
  captured_at: ISODate;
  metadata: Record<string, unknown>;
}
export interface Experiment {
  id: ID;
  campaign_id: ID;
  name: string;
  hypothesis: string;
  variable: string;
  control: Record<string, unknown>;
  variant: Record<string, unknown>;
  success_metric: string;
  status: ExperimentStatus;
  start_at?: ISODate;
  end_at?: ISODate;
  result?: "control" | "variant" | "inconclusive" | "insufficient_data";
  created_at: ISODate;
  updated_at: ISODate;
}
export interface Learning {
  id: ID;
  brand_id: ID;
  type: string;
  observation: string;
  evidence: Array<Record<string, unknown>>;
  confidence: number;
  recommended_action: string;
  status: LearningStatus;
  created_at: ISODate;
  expires_at?: ISODate | null;
}
export interface Approval {
  id: ID;
  campaign_id: ID;
  asset_id?: ID;
  status: ApprovalStatus;
  reviewer?: string;
  comments?: string;
  created_at: ISODate;
  updated_at: ISODate;
}
export interface AuditLog {
  id: ID;
  actor: string;
  action: string;
  entity: string;
  entity_id: ID;
  detail: Record<string, unknown>;
  created_at: ISODate;
}
export interface CampaignEvent {
  id: ID;
  type: string;
  entity_id: ID;
  payload: Record<string, unknown>;
  created_at: ISODate;
}
export interface Opportunity {
  id: ID;
  brand_id: ID;
  opportunity_type: string;
  source: string;
  reason: string;
  potential_value: string;
  recommended_action: string;
  status: "open" | "accepted" | "ignored" | "saved";
  created_at: ISODate;
  updated_at: ISODate;
}
export interface AgentExecution {
  id: ID;
  agent: string;
  task: string;
  input_ref: string;
  output: unknown;
  model: string;
  prompt_version: string;
  duration_ms: number;
  tokens_used?: number;
  status: "ok" | "error";
  error?: string;
  created_at: ISODate;
}
export interface UTMStrategy {
  utm_source_map?: Record<string, string>;
  utm_medium_map?: Record<string, string>;
}
export interface QAResult {
  status: "pass" | "revise" | "block";
  score: number;
  issues: Array<{ criterion: string; detail: string }>;
  suggested_changes: string[];
}
