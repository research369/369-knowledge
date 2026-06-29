import {
  pgTable,
  text,
  varchar,
  integer,
  real,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const entityTypeEnum = pgEnum("entity_type", [
  "compound",
  "study",
  "mechanism",
  "pathway",
  "protein",
  "gene",
  "receptor",
  "enzyme",
  "organ",
  "tissue",
  "biological_process",
  "disease",
  "symptom",
  "product",
  "guide",
  "faq",
  "glossary_term",
  "academy_module",
  "video",
  "graphic",
  "source",
  "author",
]);

export const relationTypeEnum = pgEnum("relation_type", [
  "belongs_to",
  "activates",
  "inhibits",
  "influences",
  "interacts_with",
  "regulates",
  "is_part_of",
  "relevant_for",
  "studied_in",
  "evidenced_by",
  "contradicts",
  "confirms",
  "updates",
  "combined_with",
  "requires",
  "recommends",
  "answers",
  "has_source",
  "has_evidence",
  "has_product",
]);

export const evidenceLevelEnum = pgEnum("evidence_level", [
  "preclinical",
  "clinical",
  "review",
  "meta_analysis",
  "anecdotal",
]);

export const studyTypeEnum = pgEnum("study_type", [
  "human",
  "animal",
  "in_vitro",
  "meta_analysis",
  "review",
]);

export const knowledgeLayerEnum = pgEnum("knowledge_layer", [
  "L1",
  "L2",
  "L3",
  "L4",
  "L5",
  "L6",
  "L7",
]);

export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "pending_review",
  "approved",
  "published",
  "archived",
]);

export const contentTypeEnum = pgEnum("content_type", [
  "compound",
  "guide",
  "stack",
  "module",
  "faq",
  "glossary",
]);

// ─── Ontology Tables ──────────────────────────────────────────────────────────

/**
 * Defines allowed relation types between entity types (Scientific Ontology)
 */
export const ontologyRelations = pgTable("ontology_relations", {
  id: text("id").primaryKey(),
  fromEntityType: entityTypeEnum("from_entity_type").notNull(),
  relationType: relationTypeEnum("relation_type").notNull(),
  toEntityType: entityTypeEnum("to_entity_type").notNull(),
  allowed: boolean("allowed").notNull().default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Defines required fields per entity type (Scientific Ontology)
 */
export const ontologyEntityRules = pgTable("ontology_entity_rules", {
  id: text("id").primaryKey(),
  entityType: entityTypeEnum("entity_type").notNull(),
  requiredFields: jsonb("required_fields").notNull().default("[]"),
  allowedLayers: jsonb("allowed_layers").notNull().default("[]"),
  allowedScopes: jsonb("allowed_scopes").notNull().default("[]"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Core Knowledge Graph Tables ──────────────────────────────────────────────

/**
 * Entities — nodes in the Knowledge Graph
 */
export const entities = pgTable(
  "entities",
  {
    id: text("id").primaryKey(), // slug, e.g. "bpc-157"
    slug: varchar("slug", { length: 300 }).unique(), // URL-friendly slug, e.g. "bpc-157"
    type: entityTypeEnum("type").notNull(),
    canonicalName: varchar("canonical_name", { length: 500 }).notNull(),
    aliases: jsonb("aliases").notNull().default("[]"), // string[]
    language: varchar("language", { length: 10 }).notNull().default("de"),
    casNumber: varchar("cas_number", { length: 100 }),
    categories: jsonb("categories").notNull().default("[]"), // string[]
    tags: jsonb("tags").notNull().default("[]"), // string[]
    shortDescription: varchar("short_description", { length: 300 }), // 1-2 Sätze für Cards/Previews
    status: contentStatusEnum("status").notNull().default("draft"),
    // SEO
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: varchar("seo_description", { length: 500 }),
    seoKeywords: jsonb("seo_keywords").notNull().default("[]"),
    // Media
    heroImageUrl: text("hero_image_url"),
    moleculeImageUrl: text("molecule_image_url"),
    // Metrics (displayed in hero)
    metrics: jsonb("metrics").notNull().default("[]"), // {label, value}[]
    // Workflow
    generatedByAi: boolean("generated_by_ai").notNull().default(false),
    approvedBy: varchar("approved_by", { length: 200 }),
    approvedAt: timestamp("approved_at"),
    publishedAt: timestamp("published_at"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    typeIdx: index("entities_type_idx").on(t.type),
    statusIdx: index("entities_status_idx").on(t.status),
  })
);

/**
 * Content blocks — the actual text content per entity, per layer, per scope
 */
export const contentBlocks = pgTable(
  "content_blocks",
  {
    id: text("id").primaryKey(),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    layer: knowledgeLayerEnum("layer").notNull(),
    scope: jsonb("scope").notNull().default('["portal","academy","bedo"]'), // string[]
    blockType: varchar("block_type", { length: 100 }).notNull(), // "definition", "mechanism", "research", "faq", "practice", etc.
    title: varchar("title", { length: 500 }),
    body: text("body").notNull(),
    sources: jsonb("sources").notNull().default("[]"), // PMID/DOI strings
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    entityIdx: index("content_blocks_entity_idx").on(t.entityId),
    layerIdx: index("content_blocks_layer_idx").on(t.layer),
  })
);

/**
 * Relations — edges in the Knowledge Graph
 */
export const relations = pgTable(
  "relations",
  {
    id: text("id").primaryKey(),
    fromEntityId: text("from_entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    relationType: relationTypeEnum("relation_type").notNull(),
    toEntityId: text("to_entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    layer: knowledgeLayerEnum("layer").notNull().default("L2"),
    scope: jsonb("scope").notNull().default('["portal","academy","bedo"]'),
    description: text("description"),
    // Evidence
    sources: jsonb("sources").notNull().default("[]"), // PMID/DOI strings
    studyTypes: jsonb("study_types").notNull().default("[]"), // studyTypeEnum[]
    confidenceScore: real("confidence_score").notNull().default(0.5), // 0.0–1.0
    evidenceLevel: evidenceLevelEnum("evidence_level").default("preclinical"),
    qualityRating: integer("quality_rating"), // 1–5
    reviewedBy: varchar("reviewed_by", { length: 200 }),
    lastReviewedAt: timestamp("last_reviewed_at"),
    nextReviewAt: timestamp("next_review_at"),
    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    fromIdx: index("relations_from_idx").on(t.fromEntityId),
    toIdx: index("relations_to_idx").on(t.toEntityId),
    typeIdx: index("relations_type_idx").on(t.relationType),
  })
);

/**
 * Version history for entities
 */
export const entityVersions = pgTable("entity_versions", {
  id: text("id").primaryKey(),
  entityId: text("entity_id")
    .notNull()
    .references(() => entities.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").notNull(), // full entity + content blocks snapshot
  changedBy: varchar("changed_by", { length: 200 }),
  changeNote: text("change_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * API keys for external access (BEDO, agents, etc.)
 */
export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  keyHash: text("key_hash").notNull().unique(),
  permissions: jsonb("permissions").notNull().default("[]"), // permission strings
  active: boolean("active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

/**
 * Admin sessions (simple password-based for admin panel)
 */
export const adminSessions = pgTable("admin_sessions", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

/**
 * Topics — thematic hubs (Longevity, Mitochondrien, Fettverlust, etc.)
 */
export const topics = pgTable(
  "topics",
  {
    id: text("id").primaryKey(), // e.g. "longevity"
    slug: varchar("slug", { length: 200 }).notNull().unique(), // URL slug
    name: varchar("name", { length: 200 }).notNull(), // e.g. "Longevity"
    nameEn: varchar("name_en", { length: 200 }), // English name for SEO
    description: text("description"), // Short description for topic hub page
    heroImageUrl: text("hero_image_url"),
    iconName: varchar("icon_name", { length: 100 }), // Lucide icon name
    color: varchar("color", { length: 50 }), // Accent color for this topic
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: varchar("seo_description", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: index("topics_slug_idx").on(t.slug),
  })
);

/**
 * Entity-Topic assignments (many-to-many)
 */
export const entityTopics = pgTable(
  "entity_topics",
  {
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false), // primary topic for this entity
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.entityId, t.topicId] }),
    entityIdx: index("entity_topics_entity_idx").on(t.entityId),
    topicIdx: index("entity_topics_topic_idx").on(t.topicId),
  })
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type Entity = typeof entities.$inferSelect;
export type NewEntity = typeof entities.$inferInsert;
export type ContentBlock = typeof contentBlocks.$inferSelect;
export type NewContentBlock = typeof contentBlocks.$inferInsert;
export type Relation = typeof relations.$inferSelect;
export type NewRelation = typeof relations.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type EntityVersion = typeof entityVersions.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;
export type EntityTopic = typeof entityTopics.$inferSelect;
