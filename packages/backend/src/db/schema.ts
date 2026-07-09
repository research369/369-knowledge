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
  "injury",               // injury / condition for Coach Layer
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
  // Phase 2 extensions — additive, 2026-07-08
  "persona",             // user archetype / target audience
  "goal",               // health or performance goal
  "side_effect",        // adverse effect of a compound
  "contraindication",   // condition that prevents use
  "interaction_profile", // compound-compound or compound-drug interaction
  "bloodwork_panel",    // lab test panel
  "lab_parameter",      // single lab value / biomarker measurement
  "coach_note",         // practitioner / coach guidance note
  "sales_flow",         // sales funnel step or flow
  "support_note",       // customer support knowledge entry
  "bundle",             // product bundle
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
  // Phase 2 extensions — additive, 2026-07-08
  // Compound → new targets
  "has_side_effect",        // Compound → SideEffect
  "has_contraindication",   // Compound → Contraindication
  "has_interaction",        // Compound → InteractionProfile
  "monitored_by",           // Compound → BloodworkPanel
  "tracked_by",             // Compound → LabParameter
  "targets_persona",        // Compound → Persona
  "addresses_goal",         // Compound → Goal
  "has_coach_note",         // Compound/Stack → CoachNote
  "has_sales_flow",         // Compound/Stack → SalesFlow
  "has_support_note",       // Compound/Stack → SupportNote
  // Stack → new targets
  "for_persona",            // Stack → Persona
  "achieves_goal",          // Stack → Goal
  "requires_panel",         // Stack → BloodworkPanel
  // Goal → targets
  "recommends_compound",    // Goal → Compound
  "recommends_stack",       // Goal → Stack
  "measured_via",           // Goal → Biomarker
  "resolved_by",            // Goal → Symptom (symptom resolved by goal)
  // Persona → targets
  "has_goal",               // Persona → Goal
  "uses_stack",             // Persona → Stack
  "guided_by",              // Persona → CoachNote
  "enters_flow",            // Persona → SalesFlow
  // BloodworkPanel → targets
  "includes_parameter",     // BloodworkPanel → LabParameter
  // LabParameter → targets
  "correlates_with",        // LabParameter → Biomarker
  // SalesFlow → targets
  "sells_product",          // SalesFlow → Product
  "sells_bundle",           // SalesFlow → Bundle
  "answers_via",            // SalesFlow → FAQ
  // SupportNote → targets
  "resolves_via",           // SupportNote → FAQ
  "references_product",     // SupportNote → Product
  // CoachNote → targets
  "recommends_protocol",    // CoachNote → Protocol
  "recommends_stack_note",  // CoachNote → Stack
  "orders_panel",           // CoachNote → BloodworkPanel
  // InteractionProfile → targets
  "involves_compound",      // InteractionProfile → Compound
  // SideEffect → targets
  "detected_via",           // SideEffect → Biomarker
  "mitigated_by",           // SideEffect → Protocol
  // Contraindication → targets
  "contraindicated_in",     // Contraindication → Disease
  "contraindicated_with",   // Contraindication → Compound
  // Coach Intelligence Layer — Phase 3 (2026-07-09)
  "alternative_to",         // Compound → Compound (alternative option)
  "recommended_for",        // Compound → Goal/Injury/Tissue (coach recommendation)
  "avoid_with",             // Compound → Compound/Condition (avoid combination)
  "works_best_when",        // Compound → Condition/Protocol (optimal context)
  "stack_component_of",     // Compound → Stack (compound is part of stack)
  "goal_supports",          // Compound → Goal (supports this goal)
  "mechanism_overlap",      // Compound → Compound (shared mechanism)
  "mechanism_complement",   // Compound → Compound (complementary mechanism)
  "tissue_target",          // Compound → Tissue (primary tissue target)
  "organ_target",           // Compound → Organ (primary organ target)
  "injury_type",            // Compound → InjuryType/Disease (relevant injury)
  "recovery_stage",         // Compound → RecoveryStage/Protocol (relevant stage)
  "next_best_option",       // Compound → Compound (next best alternative)
  "upgrade_path",           // Compound → Compound (upgrade to this)
  "downgrade_path",         // Compound → Compound (downgrade to this)
  "replacement_for",        // Compound → Compound (replaces this)
  "common_combination",     // Compound → Compound (frequently combined)
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

// ─── NEW: Phase 2b Enums ──────────────────────────────────────────────────────

/**
 * Knowledge Lifecycle — 9-stage lifecycle for all knowledge objects
 */
export const lifecycleStatusEnum = pgEnum("lifecycle_status", [
  "new",             // just created, no content yet
  "ai_draft",        // AI has generated a draft
  "review",          // human review required
  "approved",        // approved by reviewer, not yet published
  "published",       // live on portal
  "monitoring",      // published, being monitored for new evidence
  "review_required", // new evidence found, needs update
  "updated",         // updated after new evidence
  "archived",        // no longer active, kept for history
]);

/**
 * Scientific Task types — tasks the platform generates automatically
 */
export const scientificTaskTypeEnum = pgEnum("scientific_task_type", [
  "review_new_source",      // new study appeared, review for entity
  "update_entity",          // entity needs update based on new evidence
  "review_faq",             // FAQ may need update
  "review_guide",           // guide may need update
  "review_protocol",        // protocol may need update
  "review_relation",        // relation may need update
  "review_product_link",    // product relation may need update
  "review_academy_link",    // academy module may need update
  "validate_confidence",    // confidence score needs manual validation
  "resolve_conflict",       // conflicting suggestions need resolution
  "complete_lifecycle",     // lifecycle transition needs review
  "custom",                 // manually created task
]);

/**
 * Scientific Task status
 */
export const scientificTaskStatusEnum = pgEnum("scientific_task_status", [
  "open",
  "in_progress",
  "completed",
  "dismissed",
  "blocked",
]);

/**
 * Discussion entry types
 */
export const discussionEntryTypeEnum = pgEnum("discussion_entry_type", [
  "suggestion",    // agent submitted a suggestion
  "comment",       // reviewer added a comment
  "evidence",      // new evidence cited
  "conflict",      // conflicting claim identified
  "resolution",    // conflict resolved
  "decision",      // final decision made
  "system",        // automated system event
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
    // Phase 2b: Lifecycle status (replaces simple contentStatusEnum for entities)
    lifecycleStatus: lifecycleStatusEnum("lifecycle_status").notNull().default("new"),
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
    // Goldstandard: GEO / JSON-LD / Schema.org
    canonicalUrl: text("canonical_url"),                             // full canonical URL
    geoQa: jsonb("geo_qa").notNull().default("[]"),                  // [{question, answer, sourceId}]
    jsonLd: jsonb("json_ld"),                                        // Schema.org JSON-LD object
    schemaOrg: jsonb("schema_org"),                                  // additional Schema.org metadata
    // Goldstandard: Content completeness
    contentCompleteness: integer("content_completeness").notNull().default(0), // 0–100 %
    goldstandardApproved: boolean("goldstandard_approved").notNull().default(false),
    goldstandardApprovedAt: timestamp("goldstandard_approved_at"),
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
    // ─── Phase 4: Agent Fields ───────────────────────────────────────────────
    agentSalesPitch: text("agent_sales_pitch"),
    agentSupportFaq: jsonb("agent_support_faq").notNull().default("[]"),
    agentResearchContext: text("agent_research_context"),
    agentMedicalDisclaimer: text("agent_medical_disclaimer"),
    agentConfidenceScore: real("agent_confidence_score").default(0.8),
    // ─── Phase 4: Shop Fields ────────────────────────────────────────────────
    shopHeadline: varchar("shop_headline", { length: 200 }),
    shopBulletPoints: jsonb("shop_bullet_points").notNull().default("[]"),
    shopTargetAudience: jsonb("shop_target_audience").notNull().default("[]"),
    shopContraindications: jsonb("shop_contraindications").notNull().default("[]"),
    shopStorageInstructions: text("shop_storage_instructions"),
    shopBadgeLabels: jsonb("shop_badge_labels").notNull().default("[]"),
    bundleSynergyIds: jsonb("bundle_synergy_ids").notNull().default("[]"),
    upsellEntityIds: jsonb("upsell_entity_ids").notNull().default("[]"),
    // ─── Phase 4: Content Fields ─────────────────────────────────────────────
    contentHook30s: text("content_hook_30s"),
    contentHook60s: text("content_hook_60s"),
    contentTiktokAngle: text("content_tiktok_angle"),
    contentInstagramCaption: text("content_instagram_caption"),
    contentViralFact: text("content_viral_fact"),
    contentMisconception: text("content_misconception"),
    // ─── Phase 4: SEO Extended Fields ────────────────────────────────────────
    seoOgTitle: varchar("seo_og_title", { length: 200 }),
    seoOgDescription: text("seo_og_description"),
    seoFaqSchema: jsonb("seo_faq_schema").notNull().default("[]"),
    seoProductSchema: jsonb("seo_product_schema"),
    seoIndexPriority: real("seo_index_priority").default(0.5),
    // ─── Phase 4: Academy Fields ─────────────────────────────────────────────
    academyLearningGoals: jsonb("academy_learning_goals").notNull().default("[]"),
    academyPrerequisites: jsonb("academy_prerequisites").notNull().default("[]"),
    academyDifficulty: varchar("academy_difficulty", { length: 50 }),
    academyEstimatedTimeMinutes: integer("academy_estimated_time_minutes"),
    academyVideoUrl: text("academy_video_url"),
    // ─── Phase 4: CRM Fields ─────────────────────────────────────────────────
    crmCustomerSegments: jsonb("crm_customer_segments").notNull().default("[]"),
    crmPurchaseIntentScore: real("crm_purchase_intent_score").default(0.5),
    crmReorderIntervalDays: integer("crm_reorder_interval_days"),
    crmWhatsappTriggerKeywords: jsonb("crm_whatsapp_trigger_keywords").notNull().default("[]"),
    // ─── Content Governance Layer (Architecture Freeze v1.0 — 08.07.2026) ────────
    // Visibility: which agent/channel contexts may use this entity
    // Allowed values: "PepGPT"|"SalesGPT"|"SupportGPT"|"Academy"|"Shop"|"Portal"|"SEO"|"GEO"|"WhatsApp"|"Content Factory"
    visibility: jsonb("visibility").notNull().default('["PepGPT","SalesGPT","SupportGPT","Academy","Shop","Portal","SEO","GEO","WhatsApp","Content Factory"]'),
    // Review workflow
    humanReviewRequired: boolean("human_review_required").notNull().default(false),
    reviewNotes: text("review_notes"),
    reviewedBy: varchar("reviewed_by", { length: 200 }),
    reviewDate: timestamp("review_date"),
    // Evidence & quality
    evidenceLevel: evidenceLevelEnum("evidence_level"),
    sourceCount: integer("source_count").notNull().default(0),
    // Ownership
    owner: varchar("owner", { length: 200 }),
    // Change history (append-only JSONB log: [{date, by, action, note}])
    changeHistory: jsonb("change_history").notNull().default("[]"),
  },
  (t) => ({
    typeIdx: index("entities_type_idx").on(t.type),
    statusIdx: index("entities_status_idx").on(t.status),
    slugIdx: index("entities_slug_idx").on(t.slug),
    lifecycleIdx: index("entities_lifecycle_idx").on(t.lifecycleStatus),
    evidenceIdx: index("entities_evidence_idx").on(t.evidenceLevel),
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

// ─── MODULE 6: Phase 2b — Scientific Memory & Knowledge Lifecycle ────────────

/**
 * Scientific Decision History — every review decision with full context.
 * Replaces the shallow reviewNote/reviewedBy fields with a rich audit trail.
 */
export const decisionHistory = pgTable(
  "decision_history",
  {
    id: text("id").primaryKey(),
    // What was decided
    targetType: varchar("target_type", { length: 100 }).notNull(), // "entity", "content_block", "relation", "source", "suggestion"
    targetId: text("target_id").notNull(),
    // Decision
    decision: varchar("decision", { length: 100 }).notNull(), // "approved", "rejected", "updated", "archived", "lifecycle_transition"
    previousStatus: varchar("previous_status", { length: 100 }),
    newStatus: varchar("new_status", { length: 100 }),
    // Scientific reasoning
    reasoning: text("reasoning"),              // why the decision was made
    evidenceSummary: text("evidence_summary"), // evidence considered
    evidenceLevel: evidenceLevelEnum("evidence_level"),
    confidenceScore: real("confidence_score"), // 0.0–1.0
    // References
    sourceIds: jsonb("source_ids").notNull().default("[]"),    // sources consulted
    relatedTaskId: text("related_task_id"),                    // linked scientific task
    relatedSuggestionId: text("related_suggestion_id"),        // linked suggestion
    // Discussion
    discussionSummary: text("discussion_summary"),             // summary of discussion
    openConflicts: jsonb("open_conflicts").notNull().default("[]"), // unresolved conflicts
    // Who decided
    reviewedBy: varchar("reviewed_by", { length: 200 }).notNull(),
    reviewerRole: varchar("reviewer_role", { length: 100 }),
    // When
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    targetIdx: index("decision_history_target_idx").on(t.targetId),
    typeIdx: index("decision_history_type_idx").on(t.targetType),
    reviewerIdx: index("decision_history_reviewer_idx").on(t.reviewedBy),
    createdIdx: index("decision_history_created_idx").on(t.createdAt),
  })
);

/**
 * Scientific Discussion — threaded discussion per knowledge object.
 * Multiple agents/reviewers can contribute. Conflicts are tracked, not overwritten.
 */
export const scientificDiscussion = pgTable(
  "scientific_discussion",
  {
    id: text("id").primaryKey(),
    // Thread anchor
    targetType: varchar("target_type", { length: 100 }).notNull(),
    targetId: text("target_id").notNull(),
    threadId: text("thread_id"),               // groups entries into a thread
    parentEntryId: text("parent_entry_id"),    // for nested replies
    // Entry
    entryType: discussionEntryTypeEnum("entry_type").notNull(),
    content: text("content").notNull(),
    // Author
    authorType: varchar("author_type", { length: 50 }).notNull(), // "agent", "reviewer", "system"
    authorId: varchar("author_id", { length: 200 }),  // agent key ID or reviewer name
    authorRole: varchar("author_role", { length: 100 }),
    // Evidence
    sourceIds: jsonb("source_ids").notNull().default("[]"),
    confidenceScore: real("confidence_score"),
    evidenceLevel: evidenceLevelEnum("evidence_level"),
    // Conflict tracking
    isConflict: boolean("is_conflict").notNull().default(false),
    conflictWith: text("conflict_with"),        // ID of conflicting entry
    conflictResolved: boolean("conflict_resolved").notNull().default(false),
    resolvedBy: varchar("resolved_by", { length: 200 }),
    resolvedAt: timestamp("resolved_at"),
    // Status
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    targetIdx: index("sci_discussion_target_idx").on(t.targetId),
    threadIdx: index("sci_discussion_thread_idx").on(t.threadId),
    conflictIdx: index("sci_discussion_conflict_idx").on(t.isConflict),
    createdIdx: index("sci_discussion_created_idx").on(t.createdAt),
  })
);

/**
 * Confidence Scores — computed scientific confidence per knowledge object.
 * Automatically calculated and stored for entities, blocks, relations, sources.
 */
export const confidenceScores = pgTable(
  "confidence_scores",
  {
    id: text("id").primaryKey(),
    // Target
    targetType: varchar("target_type", { length: 100 }).notNull(),
    targetId: text("target_id").notNull().unique(), // one score per object
    // Composite score
    overallScore: real("overall_score").notNull().default(0.0), // 0.0–1.0
    // Component scores
    evidenceLevelScore: real("evidence_level_score").notNull().default(0.0),
    sourceCountScore: real("source_count_score").notNull().default(0.0),
    humanStudyScore: real("human_study_score").notNull().default(0.0),
    animalStudyScore: real("animal_study_score").notNull().default(0.0),
    inVitroScore: real("in_vitro_score").notNull().default(0.0),
    metaAnalysisScore: real("meta_analysis_score").notNull().default(0.0),
    recencyScore: real("recency_score").notNull().default(0.0),
    reviewerValidationScore: real("reviewer_validation_score").notNull().default(0.0),
    aiValidationScore: real("ai_validation_score").notNull().default(0.0),
    // Raw counts
    totalSources: integer("total_sources").notNull().default(0),
    humanStudies: integer("human_studies").notNull().default(0),
    animalStudies: integer("animal_studies").notNull().default(0),
    inVitroStudies: integer("in_vitro_studies").notNull().default(0),
    rctCount: integer("rct_count").notNull().default(0),
    metaAnalysisCount: integer("meta_analysis_count").notNull().default(0),
    openConflicts: integer("open_conflicts").notNull().default(0),
    // Temporal
    newestSourceYear: integer("newest_source_year"),
    oldestSourceYear: integer("oldest_source_year"),
    lastValidatedAt: timestamp("last_validated_at"),
    lastValidatedBy: varchar("last_validated_by", { length: 200 }),
    nextValidationDue: timestamp("next_validation_due"),
    // Computation
    computedAt: timestamp("computed_at").defaultNow().notNull(),
    computationVersion: integer("computation_version").notNull().default(1),
    notes: text("notes"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    targetIdx: index("confidence_scores_target_idx").on(t.targetId),
    typeIdx: index("confidence_scores_type_idx").on(t.targetType),
    scoreIdx: index("confidence_scores_score_idx").on(t.overallScore),
  })
);

/**
 * Scientific Tasks — tasks generated by the platform or manually.
 * Enables the platform to organize itself.
 */
export const scientificTasks = pgTable(
  "scientific_tasks",
  {
    id: text("id").primaryKey(),
    // Type & context
    taskType: scientificTaskTypeEnum("task_type").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    // Target
    targetType: varchar("target_type", { length: 100 }),
    targetId: text("target_id"),
    // Trigger
    triggeredBy: varchar("triggered_by", { length: 200 }), // agent ID, system, or reviewer
    triggerReason: text("trigger_reason"),
    triggerSourceId: text("trigger_source_id"),            // e.g. new study that triggered this
    // Assignment
    assignedTo: varchar("assigned_to", { length: 200 }),
    priority: integer("priority").notNull().default(5),    // 1 (highest) – 10 (lowest)
    dueAt: timestamp("due_at"),
    // Checklist (auto-generated based on task type)
    checklist: jsonb("checklist").notNull().default("[]"), // {item, completed, completedAt, completedBy}[]
    // Status
    status: scientificTaskStatusEnum("status").notNull().default("open"),
    completedBy: varchar("completed_by", { length: 200 }),
    completedAt: timestamp("completed_at"),
    completionNote: text("completion_note"),
    // Linked objects
    linkedSuggestionIds: jsonb("linked_suggestion_ids").notNull().default("[]"),
    linkedDecisionIds: jsonb("linked_decision_ids").notNull().default("[]"),
    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("sci_tasks_status_idx").on(t.status),
    typeIdx: index("sci_tasks_type_idx").on(t.taskType),
    targetIdx: index("sci_tasks_target_idx").on(t.targetId),
    priorityIdx: index("sci_tasks_priority_idx").on(t.priority),
    createdIdx: index("sci_tasks_created_idx").on(t.createdAt),
  })
);

/**
 * Agent Feedback — reviewer decisions are stored as feedback for agents.
 * Enables agents to learn from past decisions without direct KB write access.
 */
export const agentFeedback = pgTable(
  "agent_feedback",
  {
    id: text("id").primaryKey(),
    // Which suggestion was reviewed
    suggestionId: text("suggestion_id")
      .notNull()
      .references(() => agentSuggestions.id, { onDelete: "cascade" }),
    agentKeyId: text("agent_key_id").references(() => agentApiKeys.id, { onDelete: "set null" }),
    agentRole: agentRoleEnum("agent_role"),
    // Feedback
    decision: varchar("decision", { length: 50 }).notNull(), // "approved", "rejected", "merged"
    feedbackType: varchar("feedback_type", { length: 100 }), // "correct", "partially_correct", "incorrect", "duplicate", "insufficient_evidence"
    feedbackNote: text("feedback_note"),
    // What the agent got right/wrong
    correctAspects: jsonb("correct_aspects").notNull().default("[]"),    // string[]
    incorrectAspects: jsonb("incorrect_aspects").notNull().default("[]"), // string[]
    improvementHints: text("improvement_hints"),
    // Confidence calibration
    agentConfidence: real("agent_confidence"),   // what the agent claimed
    actualQuality: real("actual_quality"),        // reviewer's assessment 0.0–1.0
    // Reviewer
    reviewedBy: varchar("reviewed_by", { length: 200 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    suggestionIdx: index("agent_feedback_suggestion_idx").on(t.suggestionId),
    agentIdx: index("agent_feedback_agent_idx").on(t.agentKeyId),
    roleIdx: index("agent_feedback_role_idx").on(t.agentRole),
    createdIdx: index("agent_feedback_created_idx").on(t.createdAt),
  })
);

/**
 * Monitoring Rules — defines what triggers a lifecycle transition to "review_required".
 * The platform uses these to automatically flag entities that need attention.
 */
export const monitoringRules = pgTable(
  "monitoring_rules",
  {
    id: text("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    // Trigger conditions
    triggerType: varchar("trigger_type", { length: 100 }).notNull(),
    // "new_source_for_entity", "confidence_drop", "time_since_review",
    // "new_agent_suggestion", "open_conflict", "new_meta_analysis"
    // Configuration
    config: jsonb("config").notNull().default("{}"),
    // e.g. { minConfidenceDrop: 0.1, maxDaysSinceReview: 180, minSourceCount: 3 }
    // Target scope
    appliesTo: jsonb("applies_to").notNull().default("[]"), // entity types or "all"
    // Action
    taskTypeToCreate: scientificTaskTypeEnum("task_type_to_create"),
    taskPriority: integer("task_priority").notNull().default(5),
    // Status
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    activeIdx: index("monitoring_rules_active_idx").on(t.active),
    typeIdx: index("monitoring_rules_type_idx").on(t.triggerType),
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
    // Goldstandard: Verständlichkeitsebenen
    comprehensionLevel: varchar("comprehension_level", { length: 50 }).notNull().default("all"), // 'brief'|'simple'|'scientific'|'all'
    targetAudience: varchar("target_audience", { length: 50 }).notNull().default("all"),         // 'beginner'|'intermediate'|'expert'|'all'
    readingTimeSeconds: integer("reading_time_seconds"),                                         // estimated reading time
    glossarTerms: jsonb("glossar_terms").notNull().default("[]"),                               // [{term, entityId, slug}]
    // Phase 2b: Lifecycle & review
    lifecycleStatus: lifecycleStatusEnum("lifecycle_status").notNull().default("new"),
    version: integer("version").notNull().default(1),
    approvedBy: varchar("approved_by", { length: 200 }),
    approvedAt: timestamp("approved_at"),
    lastReviewedAt: timestamp("last_reviewed_at"),
    nextReviewDue: timestamp("next_review_due"),
    reviewNote: text("review_note"),
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

// ─── Goldstandard: Ecosystem Links ──────────────────────────────────────────

/**
 * Ecosystem Links — connects entities to external systems (Academy, Shop, Guides, Protocols, Stacks).
 * Not visible to users — used for internal routing and future cross-system navigation.
 */
export const ecosystemLinks = pgTable(
  "ecosystem_links",
  {
    id: text("id").primaryKey(),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    linkType: varchar("link_type", { length: 100 }).notNull(), // 'academy_module'|'shop_product'|'guide'|'protocol'|'stack'|'collection'
    externalId: text("external_id").notNull(),                  // ID in the external system
    externalSlug: text("external_slug"),                        // slug/URL in the external system
    externalName: text("external_name"),                        // human-readable name
    externalSystem: varchar("external_system", { length: 100 }).notNull().default("369research"), // 'academy'|'shop'|'wawi'|'whatsapp'
    relevanceScore: real("relevance_score").notNull().default(1.0), // 0.0–1.0
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    entityIdx: index("ecosystem_links_entity_idx").on(t.entityId),
    typeIdx: index("ecosystem_links_type_idx").on(t.linkType),
    systemIdx: index("ecosystem_links_system_idx").on(t.externalSystem),
  })
);

// ─── Phase 2b Types ──────────────────────────────────────────────────────────
export type DecisionHistory = typeof decisionHistory.$inferSelect;
export type NewDecisionHistory = typeof decisionHistory.$inferInsert;
export type ScientificDiscussion = typeof scientificDiscussion.$inferSelect;
export type NewScientificDiscussion = typeof scientificDiscussion.$inferInsert;
export type ConfidenceScore = typeof confidenceScores.$inferSelect;
export type NewConfidenceScore = typeof confidenceScores.$inferInsert;
export type ScientificTask = typeof scientificTasks.$inferSelect;
export type NewScientificTask = typeof scientificTasks.$inferInsert;
export type AgentFeedback = typeof agentFeedback.$inferSelect;
export type NewAgentFeedback = typeof agentFeedback.$inferInsert;
export type MonitoringRule = typeof monitoringRules.$inferSelect;

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
// Goldstandard types
export type EcosystemLink = typeof ecosystemLinks.$inferSelect;
export type NewEcosystemLink = typeof ecosystemLinks.$inferInsert;

// ─── Knowledge Modules Layer ──────────────────────────────────────────────────

/**
 * Knowledge Modules — zweite Wissensebene des 369 Knowledge OS
 *
 * 16 Modul-Typen als strukturierte Expertenwissen-Schicht.
 * Kein Agent schreibt in diese Tabelle.
 * Nur review_status = 'agent_available' wird an Agenten ausgegeben.
 */
export const knowledgeModules = pgTable(
  "knowledge_modules",
  {
    id: text("id").primaryKey(),
    entityId: text("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
    entitySlug: varchar("entity_slug", { length: 300 }).notNull(),

    // Modul-Typ
    moduleType: varchar("module_type", { length: 100 }).notNull(),

    // Inhalt (strukturiertes JSON — je nach Typ unterschiedlich)
    content: jsonb("content").notNull(),

    // Qualitäts-Metadaten
    source: text("source"),
    evidenceLevel: varchar("evidence_level", { length: 100 }),
    confidenceScore: real("confidence_score").default(0.5),
    lastReviewed: timestamp("last_reviewed"),
    reviewStatus: varchar("review_status", { length: 50 }).notNull().default("draft"),

    // Zugriffskontrolle
    allowedAgents: jsonb("allowed_agents").notNull().default('["pepgpt","salesgpt","supportgpt"]'),
    allowedScope: jsonb("allowed_scope").notNull().default('["agent","portal","academy"]'),
    forbiddenScope: jsonb("forbidden_scope").notNull().default("[]"),

    // Compliance
    isHighRisk: boolean("is_high_risk").notNull().default(false),
    riskClass: varchar("risk_class", { length: 100 }),

    // Versionierung
    version: integer("version").notNull().default(1),
    generatedByAi: boolean("generated_by_ai").notNull().default(true),
    approvedBy: varchar("approved_by", { length: 200 }),
    approvedAt: timestamp("approved_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    entityModuleIdx: index("km_entity_module_idx").on(t.entityId, t.moduleType),
    slugModuleIdx: index("km_slug_module_idx").on(t.entitySlug, t.moduleType),
    statusIdx: index("km_status_idx").on(t.reviewStatus),
  })
);

export type KnowledgeModule = typeof knowledgeModules.$inferSelect;
export type NewKnowledgeModule = typeof knowledgeModules.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE REASONING LAYER (v8.0.0)
// Dritte Ebene des 369 Knowledge OS
// Zielbasierte Entscheidungslogik — ausschließlich strukturierte JSON-Daten
// Keine Texte, keine Antworten, keine Gesprächslogik
// ─────────────────────────────────────────────────────────────────────────────

// ─── Enums ────────────────────────────────────────────────────────────────────

export const reasoningModuleTypeEnum = pgEnum("reasoning_module_type", [
  "goal_tree",           // Zielstruktur: Fettverlust, Muskelaufbau, etc.
  "qualification_tree",  // Welche Infos zuerst sammeln
  "decision_tree_v2",    // Wenn/Dann/Sonst — nicht produktbezogen
  "stack_strategy",      // Anfänger/Fortgeschritten/Performance/Minimal/Premium/Budget
  "monitoring_strategy", // Wann, welche Blutwerte, welche Marker, welche Intervalle
  "risk_strategy",       // Warnungen und Eskalationsauslöser
  "alternative_strategy",// Alternativen wenn Compound X nicht verfügbar/geeignet
  "conversation_strategy",// Meta: wie qualifizieren, wann Produkt nennen, etc.
  "sales_strategy",      // Meta: Kaufgründe, Einwände, Trigger, Vergleichsmerkmale
  "coach_strategy",      // Meta: Anfängerfehler, Plateaus, wann pausieren
]);

export const reasoningStatusEnum = pgEnum("reasoning_status", [
  "draft",
  "review",
  "active",
  "archived",
]);

export const reasoningNodeTypeEnum = pgEnum("reasoning_node_type", [
  "goal",       // Ziel (Fettverlust, Muskelaufbau, etc.)
  "compound",   // Produkt/Compound
  "stack",      // Kombination
  "monitoring", // Monitoring-Schritt
  "bloodwork",  // Blutwert
  "risk",       // Risiko/Warnung
  "decision",   // Entscheidungspunkt
  "symptom",    // Symptom/Beobachtung
  "user_type",  // Nutzertyp (Anfänger, Fortgeschritten, etc.)
  "next_step",  // Nächster Schritt
]);

export const reasoningEdgeTypeEnum = pgEnum("reasoning_edge_type", [
  "leads_to",        // A führt zu B
  "requires",        // A erfordert B
  "recommends",      // A empfiehlt B
  "contraindicates", // A kontraindiziert B
  "monitors",        // A überwacht B
  "escalates_to",    // A eskaliert zu B
  "alternative_to",  // A ist Alternative zu B
  "part_of_stack",   // A ist Teil von Stack B
  "precedes",        // A kommt vor B
  "follows",         // A folgt auf B
]);

// ─── knowledge_reasoning Tabelle ─────────────────────────────────────────────
// Reasoning-Module: zielbasierte Entscheidungslogik
// Kann entity-gebunden (entitySlug gesetzt) oder global (entitySlug = null) sein

export const knowledgeReasoning = pgTable(
  "knowledge_reasoning",
  {
    id: varchar("id", { length: 36 }).primaryKey(),

    // Kontext: entweder entity-gebunden oder global (goal-basiert)
    entityId: varchar("entity_id", { length: 36 }),    // nullable: global wenn null
    entitySlug: varchar("entity_slug", { length: 500 }), // nullable
    goalContext: varchar("goal_context", { length: 200 }), // z.B. "fat_loss", "muscle_gain"

    // Modul-Typ
    moduleType: reasoningModuleTypeEnum("module_type").notNull(),

    // Inhalt — immer strukturiertes JSON
    content: text("content").notNull(), // JSON-String

    // Agenten-Zugriff
    allowedAgents: jsonb("allowed_agents").notNull().default('["pepgpt","salesgpt","supportgpt"]'),

    // Status
    status: reasoningStatusEnum("status").notNull().default("draft"),

    // Qualität
    confidenceScore: real("confidence_score").default(0.8),
    isHighRisk: boolean("is_high_risk").notNull().default(false),

    // Versionierung
    version: integer("version").notNull().default(1),
    generatedBy: varchar("generated_by", { length: 200 }).default("llm"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    entityModuleIdx: index("kr_entity_module_idx").on(t.entityId, t.moduleType),
    goalModuleIdx: index("kr_goal_module_idx").on(t.goalContext, t.moduleType),
    statusIdx: index("kr_status_idx").on(t.status),
  })
);

// ─── reasoning_graph_nodes Tabelle ───────────────────────────────────────────
// Knoten des Knowledge Reasoning Graphs
// Verbindet Ziele, Compounds, Stacks, Monitoring, Blutwerte, Risiken

export const reasoningGraphNodes = pgTable(
  "reasoning_graph_nodes",
  {
    id: varchar("id", { length: 36 }).primaryKey(),

    // Knoten-Identität
    nodeType: reasoningNodeTypeEnum("node_type").notNull(),
    label: varchar("label", { length: 500 }).notNull(), // Anzeigename
    slug: varchar("slug", { length: 500 }).notNull(),   // URL-safe ID

    // Verknüpfung zu bestehenden Entities
    entityId: varchar("entity_id", { length: 36 }),     // nullable
    entitySlug: varchar("entity_slug", { length: 500 }), // nullable

    // Metadaten
    description: text("description"),
    metadata: jsonb("metadata").default("{}"),

    // Status
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: index("rgn_slug_idx").on(t.slug),
    nodeTypeIdx: index("rgn_type_idx").on(t.nodeType),
    entityIdx: index("rgn_entity_idx").on(t.entityId),
  })
);

// ─── reasoning_graph_edges Tabelle ───────────────────────────────────────────
// Kanten des Knowledge Reasoning Graphs
// Verbindet Knoten mit typisierten Beziehungen

export const reasoningGraphEdges = pgTable(
  "reasoning_graph_edges",
  {
    id: varchar("id", { length: 36 }).primaryKey(),

    // Kante
    fromNodeId: varchar("from_node_id", { length: 36 }).notNull(),
    toNodeId: varchar("to_node_id", { length: 36 }).notNull(),
    edgeType: reasoningEdgeTypeEnum("edge_type").notNull(),

    // Kontext
    condition: text("condition"),   // Wenn-Bedingung (optional)
    weight: real("weight").default(1.0), // Relevanz-Gewicht
    metadata: jsonb("metadata").default("{}"),

    // Status
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    fromIdx: index("rge_from_idx").on(t.fromNodeId),
    toIdx: index("rge_to_idx").on(t.toNodeId),
    edgeTypeIdx: index("rge_type_idx").on(t.edgeType),
    // Unique-Constraint: keine doppelten Kanten gleichen Typs
    uniqueEdge: index("rge_unique_idx").on(t.fromNodeId, t.toNodeId, t.edgeType),
  })
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type KnowledgeReasoning = typeof knowledgeReasoning.$inferSelect;
export type NewKnowledgeReasoning = typeof knowledgeReasoning.$inferInsert;
export type ReasoningGraphNode = typeof reasoningGraphNodes.$inferSelect;
export type NewReasoningGraphNode = typeof reasoningGraphNodes.$inferInsert;
export type ReasoningGraphEdge = typeof reasoningGraphEdges.$inferSelect;
export type NewReasoningGraphEdge = typeof reasoningGraphEdges.$inferInsert;
