// In-memory store (default) with optional Postgres backing via DATABASE_URL.
// Application remains usable when n8n / Postgres are unavailable.
import {
  ID,
  Brand,
  Audience,
  SourceContent,
  Campaign,
  CampaignAsset,
  Channel,
  Publication,
  Metric,
  Experiment,
  Learning,
  Approval,
  AuditLog,
  CampaignEvent,
  Opportunity,
  AgentExecution,
  Organization,
} from "./types";

const now = () => new Date().toISOString();
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

export interface StoreSnapshot {
  organizations: Organization[];
  brands: Brand[];
  audiences: Audience[];
  sourceContent: SourceContent[];
  campaigns: Campaign[];
  assets: CampaignAsset[];
  channels: Channel[];
  publications: Publication[];
  metrics: Metric[];
  experiments: Experiment[];
  learnings: Learning[];
  approvals: Approval[];
  auditLogs: AuditLog[];
  events: CampaignEvent[];
  opportunities: Opportunity[];
  agentExecutions: AgentExecution[];
}

export function emptySnapshot(): StoreSnapshot {
  return {
    organizations: [],
    brands: [],
    audiences: [],
    sourceContent: [],
    campaigns: [],
    assets: [],
    channels: [],
    publications: [],
    metrics: [],
    experiments: [],
    learnings: [],
    approvals: [],
    auditLogs: [],
    events: [],
    opportunities: [],
    agentExecutions: [],
  };
}

export class CampaignStore {
  data: StoreSnapshot = emptySnapshot();

  // ---- organizations ----
  createOrganization(name: string): Organization {
    const org = { id: uid(), name, created_at: now(), updated_at: now() };
    this.data.organizations.push(org);
    return org;
  }
  // ---- brands ----
  createBrand(b: Omit<Brand, "id" | "created_at" | "updated_at">): Brand {
    const brand = { ...b, id: uid(), created_at: now(), updated_at: now() };
    this.data.brands.push(brand);
    return brand;
  }
  getBrand(id: ID): Brand | undefined {
    return this.data.brands.find((b) => b.id === id);
  }
  updateBrand(id: ID, patch: Partial<Brand>): Brand {
    const b = this.getBrand(id);
    if (!b) throw new Error(`brand not found: ${id}`);
    Object.assign(b, patch, { updated_at: now() });
    return b;
  }
  // ---- audiences ----
  createAudience(
    a: Omit<Audience, "id" | "created_at" | "updated_at">,
  ): Audience {
    const r = { ...a, id: uid(), created_at: now(), updated_at: now() };
    this.data.audiences.push(r);
    return r;
  }
  // ---- source content ----
  createSourceContent(
    s: Omit<SourceContent, "id" | "created_at" | "updated_at">,
  ): SourceContent {
    const r = { ...s, id: uid(), created_at: now(), updated_at: now() };
    this.data.sourceContent.push(r);
    return r;
  }
  listSourceContent(brand_id?: ID): SourceContent[] {
    return brand_id
      ? this.data.sourceContent.filter((s) => s.brand_id === brand_id)
      : this.data.sourceContent;
  }
  // ---- channels ----
  upsertChannel(c: Omit<Channel, "id"> & { id?: ID }): Channel {
    const existing = this.data.channels.find(
      (x) => x.brand_id === c.brand_id && x.type === c.type,
    );
    if (existing) {
      Object.assign(existing, c);
      return existing;
    }
    const r = { ...c, id: c.id ?? uid() } as Channel;
    this.data.channels.push(r);
    return r;
  }
  listChannels(brand_id: ID): Channel[] {
    return this.data.channels.filter((c) => c.brand_id === brand_id);
  }
  // ---- campaigns ----
  createCampaign(
    c: Omit<Campaign, "id" | "created_at" | "updated_at" | "status"> & {
      status?: Campaign["status"];
    },
  ): Campaign {
    const r: Campaign = {
      ...c,
      id: uid(),
      status: c.status ?? "draft",
      created_at: now(),
      updated_at: now(),
    };
    this.data.campaigns.push(r);
    return r;
  }
  getCampaign(id: ID): Campaign | undefined {
    return this.data.campaigns.find((c) => c.id === id);
  }
  transitionCampaign(id: ID, to: Campaign["status"]): Campaign {
    const c = this.getCampaign(id);
    if (!c) throw new Error(`campaign not found: ${id}`);
    const allowed: Record<string, string[]> = {
      draft: ["planning", "archived"],
      planning: ["generating", "failed", "archived"],
      generating: ["review", "failed"],
      review: ["approved", "failed"],
      approved: ["scheduled", "active", "paused"],
      scheduled: ["active", "paused", "failed"],
      active: ["paused", "completed", "failed"],
      paused: ["active", "completed", "archived"],
      completed: ["archived"],
      failed: ["draft", "archived"],
      archived: [],
    };
    if (!(allowed[c.status] ?? []).includes(to))
      throw new Error(`invalid campaign transition ${c.status} -> ${to}`);
    c.status = to;
    c.updated_at = now();
    return c;
  }
  // ---- assets ----
  createAsset(
    a: Omit<CampaignAsset, "id" | "created_at" | "updated_at" | "version"> & {
      version?: number;
    },
  ): CampaignAsset {
    const r: CampaignAsset = {
      ...a,
      id: uid(),
      version: a.version ?? 1,
      created_at: now(),
      updated_at: now(),
    };
    this.data.assets.push(r);
    return r;
  }
  getAsset(id: ID): CampaignAsset | undefined {
    return this.data.assets.find((a) => a.id === id);
  }
  updateAsset(
    id: ID,
    patch: Partial<CampaignAsset>,
    bumpVersion = false,
  ): CampaignAsset {
    const a = this.getAsset(id);
    if (!a) throw new Error(`asset not found: ${id}`);
    Object.assign(a, patch, { updated_at: now() });
    if (bumpVersion) a.version += 1;
    return a;
  }
  listAssets(campaign_id: ID): CampaignAsset[] {
    return this.data.assets.filter((a) => a.campaign_id === campaign_id);
  }
  // ---- publications (idempotent) ----
  findPublicationByKey(key: string): Publication | undefined {
    return this.data.publications.find((p) => p.idempotency_key === key);
  }
  createPublication(
    p: Omit<
      Publication,
      "id" | "created_at" | "updated_at" | "attempt_count"
    > & { attempt_count?: number },
  ): Publication {
    const existing = this.findPublicationByKey(p.idempotency_key);
    if (existing) return existing; // idempotent reuse
    const r: Publication = {
      ...p,
      id: uid(),
      attempt_count: p.attempt_count ?? 0,
      created_at: now(),
      updated_at: now(),
    };
    this.data.publications.push(r);
    return r;
  }
  updatePublication(id: ID, patch: Partial<Publication>): Publication {
    const p = this.data.publications.find((x) => x.id === id);
    if (!p) throw new Error(`publication not found: ${id}`);
    Object.assign(p, patch, { updated_at: now() });
    return p;
  }
  // ---- metrics ----
  addMetric(
    m: Omit<Metric, "id" | "captured_at"> & { captured_at?: string },
  ): Metric {
    const r = { ...m, id: uid(), captured_at: m.captured_at ?? now() };
    this.data.metrics.push(r);
    return r;
  }
  metricsForCampaign(campaign_id: ID): Metric[] {
    const assetIds = new Set(this.listAssets(campaign_id).map((a) => a.id));
    const pubIds = new Set(
      this.data.publications
        .filter((p) => assetIds.has(p.asset_id))
        .map((p) => p.id),
    );
    return this.data.metrics.filter((m) => pubIds.has(m.publication_id));
  }
  // ---- experiments / learnings / approvals / opportunities ----
  createExperiment(
    e: Omit<Experiment, "id" | "created_at" | "updated_at">,
  ): Experiment {
    const r = { ...e, id: uid(), created_at: now(), updated_at: now() };
    this.data.experiments.push(r);
    return r;
  }
  updateExperiment(id: ID, patch: Partial<Experiment>): Experiment {
    const e = this.data.experiments.find((x) => x.id === id);
    if (!e) throw new Error(`experiment not found: ${id}`);
    Object.assign(e, patch, { updated_at: now() });
    return e;
  }
  createLearning(l: Omit<Learning, "id" | "created_at">): Learning {
    const r = { ...l, id: uid(), created_at: now() };
    this.data.learnings.push(r);
    return r;
  }
  createApproval(
    a: Omit<Approval, "id" | "created_at" | "updated_at">,
  ): Approval {
    const r = { ...a, id: uid(), created_at: now(), updated_at: now() };
    this.data.approvals.push(r);
    return r;
  }
  updateApproval(id: ID, patch: Partial<Approval>): Approval {
    const a = this.data.approvals.find((x) => x.id === id);
    if (!a) throw new Error(`approval not found: ${id}`);
    Object.assign(a, patch, { updated_at: now() });
    return a;
  }
  createOpportunity(
    o: Omit<Opportunity, "id" | "created_at" | "updated_at">,
  ): Opportunity {
    const r = { ...o, id: uid(), created_at: now(), updated_at: now() };
    this.data.opportunities.push(r);
    return r;
  }
  // ---- audit / events / agent executions ----
  audit(
    actor: string,
    action: string,
    entity: string,
    entity_id: ID,
    detail: Record<string, unknown> = {},
  ): AuditLog {
    const r = {
      id: uid(),
      actor,
      action,
      entity,
      entity_id,
      detail,
      created_at: now(),
    };
    this.data.auditLogs.push(r);
    return r;
  }
  emit(
    type: string,
    entity_id: ID,
    payload: Record<string, unknown> = {},
  ): CampaignEvent {
    const r = { id: uid(), type, entity_id, payload, created_at: now() };
    this.data.events.push(r);
    return r;
  }
  recordAgentExecution(
    e: Omit<AgentExecution, "id" | "created_at">,
  ): AgentExecution {
    const r = { ...e, id: uid(), created_at: now() };
    this.data.agentExecutions.push(r);
    return r;
  }
}

// Singleton for Next.js route handlers (server memory; Postgres sync is additive).
export const globalStore = new CampaignStore();
