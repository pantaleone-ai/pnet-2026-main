/**
 * Pantaleone Chat SaaS database schema (D1 + SQLite via Drizzle).
 *
 * Tables:
 * - better-auth tables (user, session, account, verification) — field
 *   names match better-auth defaults exactly; do not rename. Auth logic
 *   must never be hand-rolled around these.
 * - organizations + organization_members — one org per customer at signup
 *   (auto-created, see lib/auth.ts hooks); roles expand later.
 * - chatbots — minimal P0 row; configuration surface grows in P2+.
 *
 * Every future tenant-owned table MUST carry organization_id and be
 * filtered by membership server-side (see docs/CUSTOM_BUSINESS_CHATBOT_PLAN.md).
 */
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// better-auth tables (names + columns match better-auth defaults)
// ---------------------------------------------------------------------------

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

// ---------------------------------------------------------------------------
// SaaS tables
// ---------------------------------------------------------------------------

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const organizationMembers = sqliteTable("organization_members", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("owner"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const chatbots = sqliteTable("chatbots", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  publicId: text("public_id").notNull().unique(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Organization = typeof organizations.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type Chatbot = typeof chatbots.$inferSelect;

// ---------------------------------------------------------------------------
// Knowledge ingestion (P3). Every tenant row carries organization_id and is
// filtered by membership server-side. Retrieval additionally filters by
// chatbot via chatbot_knowledge_sources + Vectorize metadata
// (organization_id, chatbot_id, source_id — never omit the filter).
// ---------------------------------------------------------------------------

/** A website, sitemap, uploaded file, or manual FAQ set to ingest. */
export const knowledgeSources = sqliteTable("knowledge_sources", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** website | sitemap | file | faq */
  sourceType: text("source_type").notNull(),
  sourceUrl: text("source_url"),
  /** R2 object key for uploaded files. */
  storageKey: text("storage_key"),
  /** pending | processing | ready | failed */
  status: text("status").notNull().default("pending"),
  pageCount: integer("page_count").notNull().default(0),
  error: text("error"),
  /** JSON array of path prefixes excluded from crawling. */
  excludedPathsJson: text("excluded_paths_json").notNull().default("[]"),
  /** FAQ pairs payload (JSON) for source_type=faq; consumed by the worker. */
  contentJson: text("content_json"),
  lastIndexedAt: integer("last_indexed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** One crawled page or uploaded file within a source. */
export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  knowledgeSourceId: text("knowledge_source_id")
    .notNull()
    .references(() => knowledgeSources.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  fileType: text("file_type"),
  sizeBytes: integer("size_bytes"),
  storageKey: text("storage_key"),
  /** pending | processing | ready | failed */
  status: text("status").notNull().default("pending"),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Text chunks for retrieval. Vectors live in Vectorize; embedding_id is the vector id. */
export const documentChunks = sqliteTable("document_chunks", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  text: text("text").notNull(),
  embeddingId: text("embedding_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Which sources feed which chatbot (both cascade). */
export const chatbotKnowledgeSources = sqliteTable(
  "chatbot_knowledge_sources",
  {
    id: text("id").primaryKey(),
    chatbotId: text("chatbot_id")
      .notNull()
      .references(() => chatbots.id, { onDelete: "cascade" }),
    knowledgeSourceId: text("knowledge_source_id")
      .notNull()
      .references(() => knowledgeSources.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("chatbot_knowledge_source_unique").on(
      t.chatbotId,
      t.knowledgeSourceId,
    ),
  ],
);

/** Per-chatbot retrieval + generation knobs (advanced, hidden by default). */
export const chatbotSettings = sqliteTable("chatbot_settings", {
  chatbotId: text("chatbot_id")
    .primaryKey()
    .references(() => chatbots.id, { onDelete: "cascade" }),
  model: text("model"),
  temperature: integer("temperature"),
  topK: integer("top_k"),
  contextLimit: integer("context_limit"),
  citationBehavior: text("citation_behavior"),
  fallbackMessage: text("fallback_message"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentChunk = typeof documentChunks.$inferSelect;
