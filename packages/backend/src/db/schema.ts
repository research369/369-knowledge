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
  // Ecosystem relations (new — Phase 2a)
  "has_protocol",
  "has_stack",
  "has_guide",
  "part_of_academy",
  "available_in_shop",
  "related_topic",
  "suggested_next",
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

// ─── NEW: Prompt type enum (Phase 2a) ─────────────────────────────────────────

export const promptTypeEnum = pgEnum("prompt_type", [
  "knowledge_article",   // L1–L7 Wissensartikel
  "faq",                 // FAQ-Generierung
  "mechanism",           // Mechanismus-Erklärung
  "study_summary",       // Studienzusammenfassung
  "seo_meta",            // SEO Title + Description
  "geo_snippet",         // GEO / AI-Search Snippet
  "social_media",        // Social Media Post
  "newsletter",          // Newsletter-Abschnitt
  "shop_description",    // Shop-Produktbeschreibung
  "json_ld",             // Schema.org JSON-LD
  "whatsapp",            // WhatsApp-Bot Antwort
  "api_response",        // Strukturierte API-Antwort
  "entity_extraction",   // Entitäten aus Text extrahieren
  "relation_suggestion", // Neue Relationen vorschlagen
  "source_summary",      // Quellen-Zusammenfassung
]);

// ─── NEW: Agent role enum (Phase 2a) ──────────────────────────────────────────

export const agentRoleEnum = pgEnum("agent_role", [
  "bedo_ai",
  "whatsapp_agent",
  "sales_agent",
  "support_agent",
  "shop_agent",
  "academy_agent",
  "research_agent",
  "review_agent",
  "external_api",
  "admin",
]);

// ─── NEW: Suggestion status enum (Phase 2a) ───────────────────────────────────

export const suggestionStatusEnum = pgEnum("suggestion_status", [
  "pending",
  "under_review",
  "approved",
  "rejected",
  "merged",
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
    // Ecosystem links (Phase 2a) — IDs pointing to external systems
    // These are intentionally nullable — filled in as systems are built
    academyModuleIds: jsonb("academy_module_ids").notNull().default("[]"),  // future Academy
    shopProductIds: jsonb("shop_product_ids").notNull().default("[]"),       // WaWi product IDs
    protocolIds: jsonb("protocol_ids").notNull().default("[]"),              // linked protocols
    stackIds: jsonb("stack_ids").notNull().default("[]"),                    // linked stacks
    guideIds: jsonb("guide_ids").notNull().default("[]"),                    // linked guides
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

// ─── MODULE 1: Scientific Sources System ──────────────────────────────────────

/**
 * Sources — scientific publications, websites, books as citable references.
 * This is the Single Source of Truth for all citations in the knowledge base.
 * Separate from the `studies` table which is a richer entity for full study pages.
 */
export const sources = pgTable(
  "sources",
  {
    id: text("id").primaryKey(), // e.g. "pmid-12345678" or "doi-10.xxxx"
    // Primary identifiers
    pmid: varchar("pmid", { length: 50 }).unique(),
    doi: varchar("doi", { length: 500 }).unique(),
    crossrefUrl: text("crossref_url"),
    pubmedUrl: text("pubmed_url"),
    // Publication info
    title: text("title").notNull(),
    authors: jsonb("authors").notNull().default("[]"), // string[]
    journal: varchar("journal", { length: 500 }),
    year: integer("year"),
    volume: varchar("volume", { length: 50 }),
    issue: varchar("issue", { length: 50 }),
    pages: varchar("pages", { length: 100 }),
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
    // Content
    abstract: text("abstract"),
    // AI-generated summaries
    aiSummaryDe: text("ai_summary_de"),   // German summary for portal
    aiSummaryEn: text("ai_summary_en"),   // English summary
    keyFindings: jsonb("key_findings").notNull().default("[]"), // string[] bullet points
    // Evidence quality
    evidenceLevel: evidenceLevelEnum("evidence_level"),
    qualityScore: integer("quality_score"), // 1–5 (JADAD, Cochrane, etc.)
    // Critical appraisal
    bias: text("bias"),                    // known biases
    limitations: text("limitations"),
    funding: varchar("funding", { length: 500 }), // who funded the study
    conflictOfInterest: text("conflict_of_interest"),
    // Linked entities (auto-detected or manually assigned)
    linkedEntityIds: jsonb("linked_entity_ids").notNull().default("[]"), // string[]
    // Status
    status: contentStatusEnum("status").notNull().default("draft"),
    generatedByAi: boolean("generated_by_ai").notNull().default(false),
    importedAt: timestamp("imported_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    pmidIdx: index("sources_pmid_idx").on(t.pmid),
    doiIdx: index("sources_doi_idx").on(t.doi),
    yearIdx: index("sources_year_idx").on(t.year),
    statusIdx: index("sources_status_idx").on(t.status),
  })
);

/**
 * Content Block Sources — M:N link between content blocks and sources.
 * Tracks which specific source supports which claim in which block.
 */
export const contentBlockSources = pgTable(
  "content_block_sources",
  {
    contentBlockId: text("content_block_id")
      .notNull()
      .references(() => contentBlocks.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    relevanceNote: text("relevance_note"), // why this source supports this block
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.contentBlockId, t.sourceId] }),
    blockIdx: index("cbs_block_idx").on(t.contentBlockId),
    sourceIdx: index("cbs_source_idx").on(t.sourceId),
  })
);

// ─── MODULE 2: Prompt Management System ───────────────────────────────────────

/**
 * AI Prompts — centrally managed, versioned prompt templates.
 * No prompts are hardcoded in the application code.
 */
export const aiPrompts = pgTable(
  "ai_prompts",
  {
    id: text("id").primaryKey(),
    // Identity
    name: varchar("name", { length: 200 }).notNull(),          // human-readable name
    slug: varchar("slug", { length: 200 }).notNull().unique(), // machine-readable key
    promptType: promptTypeEnum("prompt_type").notNull(),
    // Target
    targetEntityType: entityTypeEnum("target_entity_type"),    // null = universal
    targetLayer: knowledgeLayerEnum("target_layer"),            // null = universal
    // Prompt content
    systemPrompt: text("system_prompt").notNull(),
    userPromptTemplate: text("user_prompt_template").notNull(), // supports {{variable}} placeholders
    // Available variables documented here
    variables: jsonb("variables").notNull().default("[]"),     // {name, description, required}[]
    // Output format
    outputFormat: varchar("output_format", { length: 50 }).notNull().default("markdown"), // "markdown", "json", "html", "plain"
    outputSchema: jsonb("output_schema"),                       // JSON Schema if outputFormat = "json"
    // Quality
    expectedLength: varchar("expected_length", { length: 100 }), // e.g. "200-400 words"
    language: varchar("language", { length: 10 }).notNull().default("de"),
    // Versioning
    version: integer("version").notNull().default(1),
    previousVersionId: text("previous_version_id"),            // chain of versions
    changeNote: text("change_note"),
    // Status
    active: boolean("active").notNull().default(true),
    testedAt: timestamp("tested_at"),
    testedBy: varchar("tested_by", { length: 200 }),
    // Metadata
    description: text("description"),
    tags: jsonb("tags").notNull().default("[]"),
    createdBy: varchar("created_by", { length: 200 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: index("ai_prompts_slug_idx").on(t.slug),
    typeIdx: index("ai_prompts_type_idx").on(t.promptType),
    activeIdx: index("ai_prompts_active_idx").on(t.active),
  })
);

/**
 * AI Generation Log — tracks every AI generation call for audit and quality control.
 */
export const aiGenerationLog = pgTable(
  "ai_generation_log",
  {
    id: text("id").primaryKey(),
    promptId: text("prompt_id").references(() => aiPrompts.id, { onDelete: "set null" }),
    entityId: text("entity_id").references(() => entities.id, { onDelete: "set null" }),
    contentBlockId: text("content_block_id"),
    // Input
    promptSlug: varchar("prompt_slug", { length: 200 }),
    inputVariables: jsonb("input_variables").notNull().default("{}"),
    // Output
    outputRaw: text("output_raw"),
    outputParsed: jsonb("output_parsed"),
    tokensUsed: integer("tokens_used"),
    modelUsed: varchar("model_used", { length: 100 }),
    durationMs: integer("duration_ms"),
    // Quality
    qualityRating: integer("quality_rating"), // 1–5, set after review
    reviewNote: text("review_note"),
    wasPublished: boolean("was_published").notNull().default(false),
    // Status
    success: boolean("success").notNull().default(true),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    entityIdx: index("ai_gen_log_entity_idx").on(t.entityId),
    promptIdx: index("ai_gen_log_prompt_idx").on(t.promptId),
    createdIdx: index("ai_gen_log_created_idx").on(t.createdAt),
  })
);

// ─── MODULE 3: Topic Foundation ───────────────────────────────────────────────

/**
 * Topic Relations — semantic connections between topics.
 * Enables topic-to-topic navigation and related topic suggestions.
 */
export const topicRelations = pgTable(
  "topic_relations",
  {
    id: text("id").primaryKey(),
    fromTopicId: text("from_topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    toTopicId: text("to_topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    relationType: varchar("relation_type", { length: 100 }).notNull().default("related"), // "related", "parent", "child", "overlaps"
    strength: real("strength").notNull().default(0.5), // 0.0–1.0
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    fromIdx: index("topic_relations_from_idx").on(t.fromTopicId),
    toIdx: index("topic_relations_to_idx").on(t.toTopicId),
  })
);

// ─── MODULE 5: Agent Architecture ─────────────────────────────────────────────

/**
 * Agent API Keys — per-agent access keys with role-based permissions.
 * Replaces the generic api_keys table with a richer agent-specific model.
 */
export const agentApiKeys = pgTable(
  "agent_api_keys",
  {
    id: text("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),          // e.g. "BEDO AI Production"
    agentRole: agentRoleEnum("agent_role").notNull(),
    keyHash: text("key_hash").notNull().unique(),               // bcrypt hash of the key
    // Permissions (fine-grained)
    canRead: boolean("can_read").notNull().default(true),
    canSuggest: boolean("can_suggest").notNull().default(false), // can submit suggestions
    canWrite: boolean("can_write").notNull().default(false),     // direct write (admin only)
    allowedEntityTypes: jsonb("allowed_entity_types").notNull().default("[]"), // [] = all
    allowedTopicIds: jsonb("allowed_topic_ids").notNull().default("[]"),       // [] = all
    // Rate limiting
    rateLimit: integer("rate_limit").notNull().default(1000),   // requests/hour
    // Status
    active: boolean("active").notNull().default(true),
    lastUsedAt: timestamp("last_used_at"),
    requestCount: integer("request_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
    description: text("description"),
  },
  (t) => ({
    roleIdx: index("agent_api_keys_role_idx").on(t.agentRole),
    activeIdx: index("agent_api_keys_active_idx").on(t.active),
  })
);

/**
 * Agent Suggestions — agents can propose new content, relations, sources.
 * All suggestions go through a human review process before being applied.
 */
export const agentSuggestions = pgTable(
  "agent_suggestions",
  {
    id: text("id").primaryKey(),
    // Who suggested it
    agentKeyId: text("agent_key_id").references(() => agentApiKeys.id, { onDelete: "set null" }),
    agentRole: agentRoleEnum("agent_role"),
    // What type of suggestion
    suggestionType: varchar("suggestion_type", { length: 100 }).notNull(),
    // "new_entity", "update_entity", "new_relation", "new_source",
    // "update_content_block", "mark_outdated", "new_faq", "flag_error"
    // Target
    targetEntityId: text("target_entity_id").references(() => entities.id, { onDelete: "set null" }),
    targetContentBlockId: text("target_content_block_id"),
    // Suggestion payload
    payload: jsonb("payload").notNull(), // structured suggestion data
    reasoning: text("reasoning"),        // why the agent suggests this
    confidence: real("confidence"),      // 0.0–1.0
    // Required: source backing the suggestion
    sourceIds: jsonb("source_ids").notNull().default("[]"), // must cite sources
    // Review
    status: suggestionStatusEnum("status").notNull().default("pending"),
    reviewedBy: varchar("reviewed_by", { length: 200 }),
    reviewedAt: timestamp("reviewed_at"),
    reviewNote: text("review_note"),
    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("agent_suggestions_status_idx").on(t.status),
    entityIdx: index("agent_suggestions_entity_idx").on(t.targetEntityId),
    agentIdx: index("agent_suggestions_agent_idx").on(t.agentKeyId),
    createdIdx: index("agent_suggestions_created_idx").on(t.createdAt),
  })
);

/**
 * Agent Access Log — every API call by an agent is logged for audit.
 */
export const agentAccessLog = pgTable(
  "agent_access_log",
  {
    id: text("id").primaryKey(),
    agentKeyId: text("agent_key_id").references(() => agentApiKeys.id, { onDelete: "set null" }),
    agentRole: agentRoleEnum("agent_role"),
    endpoint: varchar("endpoint", { length: 500 }).notNull(),
    method: varchar("method", { length: 10 }).notNull(),
    entityId: text("entity_id"),
    statusCode: integer("status_code"),
    durationMs: integer("duration_ms"),
    ipAddress: varchar("ip_address", { length: 100 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    agentIdx: index("agent_access_log_agent_idx").on(t.agentKeyId),
    createdIdx: index("agent_access_log_created_idx").on(t.createdAt),
  })
);

// ─── Existing tables (unchanged) ──────────────────────────────────────────────

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
 */
export const protocols = pgTable(
  "protocols",
  {
    id: text("id").primaryKey(),
    slug: varchar("slug", { length: 300 }).notNull().unique(),
    name: varchar("name", { length: 500 }).notNull(),
    goal: varchar("goal", { length: 500 }),
    description: text("description"),
    compoundIds: jsonb("compound_ids").notNull().default("[]"),
    dosages: jsonb("dosages").notNull().default("[]"),
    combinations: jsonb("combinations").notNull().default("[]"),
    monitoring: text("monitoring"),
    biomarkerIds: jsonb("biomarker_ids").notNull().default("[]"),
    studyIds: jsonb("study_ids").notNull().default("[]"),
    risks: text("risks"),
    contraindications: text("contraindications"),
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: varchar("seo_description", { length: 500 }),
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
 */
export const collections = pgTable(
  "collections",
  {
    id: text("id").primaryKey(),
    slug: varchar("slug", { length: 300 }).notNull().unique(),
    name: varchar("name", { length: 500 }).notNull(),
    description: text("description"),
    filterEntityTypes: jsonb("filter_entity_types").notNull().default("[]"),
    filterTags: jsonb("filter_tags").notNull().default("[]"),
    filterTopicIds: jsonb("filter_topic_ids").notNull().default("[]"),
    filterCategories: jsonb("filter_categories").notNull().default("[]"),
    manualEntityIds: jsonb("manual_entity_ids").notNull().default("[]"),
    excludeEntityIds: jsonb("exclude_entity_ids").notNull().default("[]"),
    sortBy: varchar("sort_by", { length: 100 }).default("name"),
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: varchar("seo_description", { length: 500 }),
    heroImageUrl: text("hero_image_url"),
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
    sources: jsonb("sources").notNull().default("[]"), // PMID/DOI strings (legacy — use content_block_sources)
    sortOrder: integer("sort_order").notNull().default(0),
    generatedByAi: boolean("generated_by_ai").notNull().default(false),
    aiPromptId: text("ai_prompt_id").references(() => aiPrompts.id, { onDelete: "set null" }),
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
    sources: jsonb("sources").notNull().default("[]"), // PMID/DOI strings
    studyTypes: jsonb("study_types").notNull().default("[]"),
    confidenceScore: real("confidence_score").notNull().default(0.5),
    evidenceLevel: evidenceLevelEnum("evidence_level").default("preclinical"),
    qualityRating: integer("quality_rating"),
    weight: real("weight").default(1.0),
    reviewedBy: varchar("reviewed_by", { length: 200 }),
    lastReviewedAt: timestamp("last_reviewed_at"),
    nextReviewAt: timestamp("next_review_at"),
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
  snapshot: jsonb("snapshot").notNull(),
  changedBy: varchar("changed_by", { length: 200 }),
  changeNote: text("change_note"),
  isAiGenerated: boolean("is_ai_generated").notNull().default(false),
  isManualEdit: boolean("is_manual_edit").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * API keys for external access (legacy — use agent_api_keys for new integrations)
 */
export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  keyHash: text("key_hash").notNull().unique(),
  permissions: jsonb("permissions").notNull().default("[]"),
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
    id: text("id").primaryKey(),
    slug: varchar("slug", { length: 200 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    nameEn: varchar("name_en", { length: 200 }),
    description: text("description"),
    shortDescription: varchar("short_description", { length: 300 }),
    heroImageUrl: text("hero_image_url"),
    iconName: varchar("icon_name", { length: 100 }),
    emoji: varchar("emoji", { length: 10 }),
    color: varchar("color", { length: 50 }),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    // Navigation grouping
    navGroup: varchar("nav_group", { length: 100 }), // "primary", "secondary", "hidden"
    // SEO
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
// Phase 2a types
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type ContentBlockSource = typeof contentBlockSources.$inferSelect;
export type AiPrompt = typeof aiPrompts.$inferSelect;
export type NewAiPrompt = typeof aiPrompts.$inferInsert;
export type AiGenerationLog = typeof aiGenerationLog.$inferSelect;
export type TopicRelation = typeof topicRelations.$inferSelect;
export type AgentApiKey = typeof agentApiKeys.$inferSelect;
export type AgentSuggestion = typeof agentSuggestions.$inferSelect;
export type NewAgentSuggestion = typeof agentSuggestions.$inferInsert;
export type AgentAccessLog = typeof agentAccessLog.$inferSelect;
