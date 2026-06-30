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
  // Compound hierarchy
  "compound",       // generic / top-level
  "peptide",        // amino acid chains
  "small_molecule", // synthetic small molecules
  "steroid",        // steroidal compounds
  "hormone",        // endogenous hormones
  "antibody",       // monoclonal antibodies
  "supplement",     // dietary supplements
  "natural_compound", // plant/food-derived
  "vitamin",        // vitamins
  "mineral",        // minerals/trace elements
  "cosmetic_ingredient", // topical actives
  // Knowledge graph nodes
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
  "biomarker",
  "stack",
  "protocol",
  "collection",
  "guide",
  "faq",
  "glossary_term",
  "source",
  "author",
  // Legacy (keep for backwards compat)
  "product",
  "academy_module",
  "video",
  "graphic",
]);

export const relationTypeEnum = pgEnum("relation_type", [
  // Core scientific relations
  "activates",
  "inhibits",
  "upregulates",
  "downregulates",
  "binds_to",
  "influences",
  "interacts_with",
  "regulates",
  "modulates",
  // Structural
  "is_part_of",
  "belongs_to",
  "is_subtype_of",
  "contains",
  // Clinical/research
  "relevant_for",
  "treats",
  "improves",
  "worsens",
  "studied_in",
  "evidenced_by",
  "contradicts",
  "confirms",
  "updates",
  // Compound combinations
  "combined_with",
  "synergizes_with",
  "antagonizes",
  "requires",
  "recommends",
  // Biological
  "occurs_in",
  "expressed_in",
  "codes_for",
  "measured_by",
  "marker_for",
  // Content
  "answers",
  "has_source",
  "has_evidence",
  "has_product",
]);

export const evidenceLevelEnum = pgEnum("evidence_level", [
  "preclinical",
  "in_vitro",
  "animal",
  "pilot_human",
  "clinical",
  "rct",
  "review",
  "meta_analysis",
  "anecdotal",
]);

export const studyTypeEnum = pgEnum("study_type", [
  "human",
  "animal",
  "in_vitro",
  "rct",
  "meta_analysis",
  "review",
  "case_study",
  "observational",
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
  "protocol",
  "collection",
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
    slug: varchar("slug", { length: 300 }).unique(), // URL-friendly slug
    type: entityTypeEnum("type").notNull(),
    // Compound subtype (for compound hierarchy)
    compoundSubtype: varchar("compound_subtype", { length: 100 }), // "peptide", "small_molecule", etc.
    canonicalName: varchar("canonical_name", { length: 500 }).notNull(),
    aliases: jsonb("aliases").notNull().default("[]"), // string[]
    language: varchar("language", { length: 10 }).notNull().default("de"),
    // Chemical identifiers
    casNumber: varchar("cas_number", { length: 100 }),
    molecularFormula: varchar("molecular_formula", { length: 200 }),
    molecularWeight: varchar("molecular_weight", { length: 100 }),
    iupacName: text("iupac_name"),
    // Classification
    categories: jsonb("categories").notNull().default("[]"), // string[]
    tags: jsonb("tags").notNull().default("[]"), // string[]
    shortDescription: varchar("short_description", { length: 300 }),
    status: contentStatusEnum("status").notNull().default("draft"),
    // SEO
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: varchar("seo_description", { length: 500 }),
    seoKeywords: jsonb("seo_keywords").notNull().default("[]"),
    // Media
    heroImageUrl: text("hero_image_url"),
    moleculeImageUrl: text("molecule_image_url"),
    // Metrics (displayed in hero)
    metrics: jsonb("metrics").notNull().default("[]"), // {label, value, unit}[]
    // Workflow & versioning
    generatedByAi: boolean("generated_by_ai").notNull().default(false),
    manuallyEdited: boolean("manually_edited").notNull().default(false),
    approvedBy: varchar("approved_by", { length: 200 }),
    approvedAt: timestamp("approved_at"),
    publishedAt: timestamp("published_at"),
    lastEditedBy: varchar("last_edited_by", { length: 200 }),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    typeIdx: index("entities_type_idx").on(t.type),
    statusIdx: index("entities_status_idx").on(t.status),
    slugIdx: index("entities_slug_idx").on(t.slug),
  })
);

/**
 * Studies — dedicated table for scientific publications
 * Linked to entities via relations (studied_in, evidenced_by)
 */
export const studies = pgTable(
  "studies",
  {
    id: text("id").primaryKey(), // e.g. "pmid-12345678"
    entityId: text("entity_id").references(() => entities.id, { onDelete: "set null" }), // optional link to entity
    // Identifiers
    pmid: varchar("pmid", { length: 50 }),
    doi: varchar("doi", { length: 300 }),
    // Publication info
    title: text("title").notNull(),
    authors: jsonb("authors").notNull().default("[]"), // string[]
    journal: varchar("journal", { length: 500 }),
    year: integer("year"),
    impactFactor: real("impact_factor"),
    // Study characteristics
    studyType: studyTypeEnum("study_type"),
    isHuman: boolean("is_human").notNull().default(false),
    isAnimal: boolean("is_animal").notNull().default(false),
    isInVitro: boolean("is_in_vitro").notNull().default(false),
    isRct: boolean("is_rct").notNull().default(false),
    isMetaAnalysis: boolean("is_meta_analysis").notNull().default(false),
    sampleSize: integer("sample_size"),
    durationWeeks: integer("duration_weeks"),
    dosage: varchar("dosage", { length: 500 }),
    // Endpoints
    primaryEndpoints: jsonb("primary_endpoints").notNull().default("[]"), // string[]
    secondaryEndpoints: jsonb("secondary_endpoints").notNull().default("[]"), // string[]
    // Results
    abstract: text("abstract"),
    results: text("results"), // KI-Zusammenfassung der Ergebnisse
    limitations: text("limitations"),
    bias: text("bias"),
    funding: varchar("funding", { length: 500 }),
    // AI-generated summary
    aiSummary: text("ai_summary"),
    aiSummaryDe: text("ai_summary_de"), // German AI summary
    evidenceLevel: evidenceLevelEnum("evidence_level"),
    qualityScore: integer("quality_score"), // 1–5
    // Linked entities (compounds, biomarkers, etc.)
    linkedEntityIds: jsonb("linked_entity_ids").notNull().default("[]"), // string[]
    // Status
    status: contentStatusEnum("status").notNull().default("draft"),
    generatedByAi: boolean("generated_by_ai").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    pmidIdx: index("studies_pmid_idx").on(t.pmid),
    doiIdx: index("studies_doi_idx").on(t.doi),
    yearIdx: index("studies_year_idx").on(t.year),
    statusIdx: index("studies_status_idx").on(t.status),
  })
);

/**
 * Protocols — goal-oriented research protocols
 * e.g. "Fettverlust-Protokoll", "Anti-Aging-Protokoll"
 */
export const protocols = pgTable(
  "protocols",
  {
    id: text("id").primaryKey(),
    slug: varchar("slug", { length: 300 }).notNull().unique(),
    name: varchar("name", { length: 500 }).notNull(),
    goal: varchar("goal", { length: 500 }), // e.g. "Fettverlust"
    description: text("description"),
    // Compounds in this protocol
    compoundIds: jsonb("compound_ids").notNull().default("[]"), // string[] entity IDs
    // Protocol details
    dosages: jsonb("dosages").notNull().default("[]"), // {compoundId, dosage, frequency, duration}[]
    combinations: jsonb("combinations").notNull().default("[]"), // combination notes
    monitoring: text("monitoring"), // what to monitor
    biomarkerIds: jsonb("biomarker_ids").notNull().default("[]"), // string[] entity IDs
    studyIds: jsonb("study_ids").notNull().default("[]"), // string[] study IDs
    risks: text("risks"),
    contraindications: text("contraindications"),
    // SEO
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: varchar("seo_description", { length: 500 }),
    // Status
    status: contentStatusEnum("status").notNull().default("draft"),
    generatedByAi: boolean("generated_by_ai").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: index("protocols_slug_idx").on(t.slug),
    statusIdx: index("protocols_status_idx").on(t.status),
  })
);

/**
 * Collections — dynamic auto-generated collection pages
 * e.g. "Alle GLP-1 Agonisten", "Beste Peptide für Haut"
 */
export const collections = pgTable(
  "collections",
  {
    id: text("id").primaryKey(),
    slug: varchar("slug", { length: 300 }).notNull().unique(),
    name: varchar("name", { length: 500 }).notNull(),
    description: text("description"),
    // Filter criteria (used to auto-populate entities)
    filterEntityTypes: jsonb("filter_entity_types").notNull().default("[]"), // entityTypeEnum[]
    filterTags: jsonb("filter_tags").notNull().default("[]"), // string[] tags to match
    filterTopicIds: jsonb("filter_topic_ids").notNull().default("[]"), // topic IDs
    filterCategories: jsonb("filter_categories").notNull().default("[]"), // string[]
    // Manual overrides
    manualEntityIds: jsonb("manual_entity_ids").notNull().default("[]"), // pinned entities
    excludeEntityIds: jsonb("exclude_entity_ids").notNull().default("[]"), // excluded entities
    sortBy: varchar("sort_by", { length: 100 }).default("name"), // "name", "date", "relevance"
    // SEO
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: varchar("seo_description", { length: 500 }),
    heroImageUrl: text("hero_image_url"),
    // Status
    status: contentStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: index("collections_slug_idx").on(t.slug),
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
    blockType: varchar("block_type", { length: 100 }).notNull(),
    title: varchar("title", { length: 500 }),
    body: text("body").notNull(),
    sources: jsonb("sources").notNull().default("[]"), // PMID/DOI strings
    sortOrder: integer("sort_order").notNull().default(0),
    generatedByAi: boolean("generated_by_ai").notNull().default(false),
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
    weight: real("weight").default(1.0), // optional weighting for graph traversal
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
  isAiGenerated: boolean("is_ai_generated").notNull().default(false),
  isManualEdit: boolean("is_manual_edit").notNull().default(false),
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
    slug: varchar("slug", { length: 200 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    nameEn: varchar("name_en", { length: 200 }),
    description: text("description"),
    heroImageUrl: text("hero_image_url"),
    iconName: varchar("icon_name", { length: 100 }),
    color: varchar("color", { length: 50 }),
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
    isPrimary: boolean("is_primary").notNull().default(false),
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
export type Study = typeof studies.$inferSelect;
export type NewStudy = typeof studies.$inferInsert;
export type Protocol = typeof protocols.$inferSelect;
export type NewProtocol = typeof protocols.$inferInsert;
export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
