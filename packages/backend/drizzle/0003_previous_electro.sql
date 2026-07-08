DO $$ BEGIN
 CREATE TYPE "public"."agent_role" AS ENUM('bedo_ai', 'whatsapp_agent', 'sales_agent', 'support_agent', 'shop_agent', 'academy_agent', 'research_agent', 'review_agent', 'external_api', 'admin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."discussion_entry_type" AS ENUM('suggestion', 'comment', 'evidence', 'conflict', 'resolution', 'decision', 'system');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."lifecycle_status" AS ENUM('new', 'ai_draft', 'review', 'approved', 'published', 'monitoring', 'review_required', 'updated', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."prompt_type" AS ENUM('knowledge_article', 'faq', 'mechanism', 'study_summary', 'seo_meta', 'geo_snippet', 'social_media', 'newsletter', 'shop_description', 'json_ld', 'whatsapp', 'api_response', 'entity_extraction', 'relation_suggestion', 'source_summary');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."reasoning_edge_type" AS ENUM('leads_to', 'requires', 'recommends', 'contraindicates', 'monitors', 'escalates_to', 'alternative_to', 'part_of_stack', 'precedes', 'follows');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."reasoning_module_type" AS ENUM('goal_tree', 'qualification_tree', 'decision_tree_v2', 'stack_strategy', 'monitoring_strategy', 'risk_strategy', 'alternative_strategy', 'conversation_strategy', 'sales_strategy', 'coach_strategy');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."reasoning_node_type" AS ENUM('goal', 'compound', 'stack', 'monitoring', 'bloodwork', 'risk', 'decision', 'symptom', 'user_type', 'next_step');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."reasoning_status" AS ENUM('draft', 'review', 'active', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."scientific_task_status" AS ENUM('open', 'in_progress', 'completed', 'dismissed', 'blocked');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."scientific_task_type" AS ENUM('review_new_source', 'update_entity', 'review_faq', 'review_guide', 'review_protocol', 'review_relation', 'review_product_link', 'review_academy_link', 'validate_confidence', 'resolve_conflict', 'complete_lifecycle', 'custom');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."suggestion_status" AS ENUM('pending', 'under_review', 'approved', 'rejected', 'merged');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'persona';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'goal';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'side_effect';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'contraindication';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'interaction_profile';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'bloodwork_panel';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'lab_parameter';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'coach_note';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'sales_flow';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'support_note';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'bundle';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'has_protocol';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'has_stack';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'has_guide';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'part_of_academy';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'available_in_shop';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'related_topic';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'suggested_next';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'has_side_effect';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'has_contraindication';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'has_interaction';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'monitored_by';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'tracked_by';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'targets_persona';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'addresses_goal';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'has_coach_note';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'has_sales_flow';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'has_support_note';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'for_persona';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'achieves_goal';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'requires_panel';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'recommends_compound';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'recommends_stack';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'measured_via';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'resolved_by';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'has_goal';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'uses_stack';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'guided_by';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'enters_flow';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'includes_parameter';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'correlates_with';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'sells_product';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'sells_bundle';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'answers_via';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'resolves_via';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'references_product';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'recommends_protocol';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'recommends_stack_note';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'orders_panel';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'involves_compound';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'detected_via';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'mitigated_by';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'contraindicated_in';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE IF NOT EXISTS 'contraindicated_with';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_access_log" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_key_id" text,
	"agent_role" "agent_role",
	"endpoint" varchar(500) NOT NULL,
	"method" varchar(10) NOT NULL,
	"entity_id" text,
	"status_code" integer,
	"duration_ms" integer,
	"ip_address" varchar(100),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"agent_role" "agent_role" NOT NULL,
	"key_hash" text NOT NULL,
	"can_read" boolean DEFAULT true NOT NULL,
	"can_suggest" boolean DEFAULT false NOT NULL,
	"can_write" boolean DEFAULT false NOT NULL,
	"allowed_entity_types" jsonb DEFAULT '[]' NOT NULL,
	"allowed_topic_ids" jsonb DEFAULT '[]' NOT NULL,
	"rate_limit" integer DEFAULT 1000 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"request_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"description" text,
	CONSTRAINT "agent_api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"suggestion_id" text NOT NULL,
	"agent_key_id" text,
	"agent_role" "agent_role",
	"decision" varchar(50) NOT NULL,
	"feedback_type" varchar(100),
	"feedback_note" text,
	"correct_aspects" jsonb DEFAULT '[]' NOT NULL,
	"incorrect_aspects" jsonb DEFAULT '[]' NOT NULL,
	"improvement_hints" text,
	"agent_confidence" real,
	"actual_quality" real,
	"reviewed_by" varchar(200) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_suggestions" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_key_id" text,
	"agent_role" "agent_role",
	"suggestion_type" varchar(100) NOT NULL,
	"target_entity_id" text,
	"target_content_block_id" text,
	"payload" jsonb NOT NULL,
	"reasoning" text,
	"confidence" real,
	"source_ids" jsonb DEFAULT '[]' NOT NULL,
	"status" "suggestion_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" varchar(200),
	"reviewed_at" timestamp,
	"review_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_generation_log" (
	"id" text PRIMARY KEY NOT NULL,
	"prompt_id" text,
	"entity_id" text,
	"content_block_id" text,
	"prompt_slug" varchar(200),
	"input_variables" jsonb DEFAULT '{}' NOT NULL,
	"output_raw" text,
	"output_parsed" jsonb,
	"tokens_used" integer,
	"model_used" varchar(100),
	"duration_ms" integer,
	"quality_rating" integer,
	"review_note" text,
	"was_published" boolean DEFAULT false NOT NULL,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_prompts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"prompt_type" "prompt_type" NOT NULL,
	"target_entity_type" "entity_type",
	"target_layer" "knowledge_layer",
	"system_prompt" text NOT NULL,
	"user_prompt_template" text NOT NULL,
	"variables" jsonb DEFAULT '[]' NOT NULL,
	"output_format" varchar(50) DEFAULT 'markdown' NOT NULL,
	"output_schema" jsonb,
	"expected_length" varchar(100),
	"language" varchar(10) DEFAULT 'de' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"previous_version_id" text,
	"change_note" text,
	"active" boolean DEFAULT true NOT NULL,
	"tested_at" timestamp,
	"tested_by" varchar(200),
	"description" text,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"created_by" varchar(200),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_prompts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "confidence_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"target_type" varchar(100) NOT NULL,
	"target_id" text NOT NULL,
	"overall_score" real DEFAULT 0 NOT NULL,
	"evidence_level_score" real DEFAULT 0 NOT NULL,
	"source_count_score" real DEFAULT 0 NOT NULL,
	"human_study_score" real DEFAULT 0 NOT NULL,
	"animal_study_score" real DEFAULT 0 NOT NULL,
	"in_vitro_score" real DEFAULT 0 NOT NULL,
	"meta_analysis_score" real DEFAULT 0 NOT NULL,
	"recency_score" real DEFAULT 0 NOT NULL,
	"reviewer_validation_score" real DEFAULT 0 NOT NULL,
	"ai_validation_score" real DEFAULT 0 NOT NULL,
	"total_sources" integer DEFAULT 0 NOT NULL,
	"human_studies" integer DEFAULT 0 NOT NULL,
	"animal_studies" integer DEFAULT 0 NOT NULL,
	"in_vitro_studies" integer DEFAULT 0 NOT NULL,
	"rct_count" integer DEFAULT 0 NOT NULL,
	"meta_analysis_count" integer DEFAULT 0 NOT NULL,
	"open_conflicts" integer DEFAULT 0 NOT NULL,
	"newest_source_year" integer,
	"oldest_source_year" integer,
	"last_validated_at" timestamp,
	"last_validated_by" varchar(200),
	"next_validation_due" timestamp,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	"computation_version" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "confidence_scores_target_id_unique" UNIQUE("target_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_block_sources" (
	"content_block_id" text NOT NULL,
	"source_id" text NOT NULL,
	"relevance_note" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "content_block_sources_content_block_id_source_id_pk" PRIMARY KEY("content_block_id","source_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "decision_history" (
	"id" text PRIMARY KEY NOT NULL,
	"target_type" varchar(100) NOT NULL,
	"target_id" text NOT NULL,
	"decision" varchar(100) NOT NULL,
	"previous_status" varchar(100),
	"new_status" varchar(100),
	"reasoning" text,
	"evidence_summary" text,
	"evidence_level" "evidence_level",
	"confidence_score" real,
	"source_ids" jsonb DEFAULT '[]' NOT NULL,
	"related_task_id" text,
	"related_suggestion_id" text,
	"discussion_summary" text,
	"open_conflicts" jsonb DEFAULT '[]' NOT NULL,
	"reviewed_by" varchar(200) NOT NULL,
	"reviewer_role" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ecosystem_links" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_id" text NOT NULL,
	"link_type" varchar(100) NOT NULL,
	"external_id" text NOT NULL,
	"external_slug" text,
	"external_name" text,
	"external_system" varchar(100) DEFAULT '369research' NOT NULL,
	"relevance_score" real DEFAULT 1 NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_modules" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_id" text NOT NULL,
	"entity_slug" varchar(300) NOT NULL,
	"module_type" varchar(100) NOT NULL,
	"content" jsonb NOT NULL,
	"source" text,
	"evidence_level" varchar(100),
	"confidence_score" real DEFAULT 0.5,
	"last_reviewed" timestamp,
	"review_status" varchar(50) DEFAULT 'draft' NOT NULL,
	"allowed_agents" jsonb DEFAULT '["pepgpt","salesgpt","supportgpt"]' NOT NULL,
	"allowed_scope" jsonb DEFAULT '["agent","portal","academy"]' NOT NULL,
	"forbidden_scope" jsonb DEFAULT '[]' NOT NULL,
	"is_high_risk" boolean DEFAULT false NOT NULL,
	"risk_class" varchar(100),
	"version" integer DEFAULT 1 NOT NULL,
	"generated_by_ai" boolean DEFAULT true NOT NULL,
	"approved_by" varchar(200),
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_reasoning" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"entity_id" varchar(36),
	"entity_slug" varchar(500),
	"goal_context" varchar(200),
	"module_type" "reasoning_module_type" NOT NULL,
	"content" text NOT NULL,
	"allowed_agents" jsonb DEFAULT '["pepgpt","salesgpt","supportgpt"]' NOT NULL,
	"status" "reasoning_status" DEFAULT 'draft' NOT NULL,
	"confidence_score" real DEFAULT 0.8,
	"is_high_risk" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"generated_by" varchar(200) DEFAULT 'llm',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "monitoring_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"trigger_type" varchar(100) NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"applies_to" jsonb DEFAULT '[]' NOT NULL,
	"task_type_to_create" "scientific_task_type",
	"task_priority" integer DEFAULT 5 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reasoning_graph_edges" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"from_node_id" varchar(36) NOT NULL,
	"to_node_id" varchar(36) NOT NULL,
	"edge_type" "reasoning_edge_type" NOT NULL,
	"condition" text,
	"weight" real DEFAULT 1,
	"metadata" jsonb DEFAULT '{}',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reasoning_graph_nodes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"node_type" "reasoning_node_type" NOT NULL,
	"label" varchar(500) NOT NULL,
	"slug" varchar(500) NOT NULL,
	"entity_id" varchar(36),
	"entity_slug" varchar(500),
	"description" text,
	"metadata" jsonb DEFAULT '{}',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scientific_discussion" (
	"id" text PRIMARY KEY NOT NULL,
	"target_type" varchar(100) NOT NULL,
	"target_id" text NOT NULL,
	"thread_id" text,
	"parent_entry_id" text,
	"entry_type" "discussion_entry_type" NOT NULL,
	"content" text NOT NULL,
	"author_type" varchar(50) NOT NULL,
	"author_id" varchar(200),
	"author_role" varchar(100),
	"source_ids" jsonb DEFAULT '[]' NOT NULL,
	"confidence_score" real,
	"evidence_level" "evidence_level",
	"is_conflict" boolean DEFAULT false NOT NULL,
	"conflict_with" text,
	"conflict_resolved" boolean DEFAULT false NOT NULL,
	"resolved_by" varchar(200),
	"resolved_at" timestamp,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scientific_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"task_type" "scientific_task_type" NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"target_type" varchar(100),
	"target_id" text,
	"triggered_by" varchar(200),
	"trigger_reason" text,
	"trigger_source_id" text,
	"assigned_to" varchar(200),
	"priority" integer DEFAULT 5 NOT NULL,
	"due_at" timestamp,
	"checklist" jsonb DEFAULT '[]' NOT NULL,
	"status" "scientific_task_status" DEFAULT 'open' NOT NULL,
	"completed_by" varchar(200),
	"completed_at" timestamp,
	"completion_note" text,
	"linked_suggestion_ids" jsonb DEFAULT '[]' NOT NULL,
	"linked_decision_ids" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"pmid" varchar(50),
	"doi" varchar(500),
	"crossref_url" text,
	"pubmed_url" text,
	"title" text NOT NULL,
	"authors" jsonb DEFAULT '[]' NOT NULL,
	"journal" varchar(500),
	"year" integer,
	"volume" varchar(50),
	"issue" varchar(50),
	"pages" varchar(100),
	"impact_factor" real,
	"study_type" "study_type",
	"is_human" boolean DEFAULT false NOT NULL,
	"is_animal" boolean DEFAULT false NOT NULL,
	"is_in_vitro" boolean DEFAULT false NOT NULL,
	"is_rct" boolean DEFAULT false NOT NULL,
	"is_meta_analysis" boolean DEFAULT false NOT NULL,
	"sample_size" integer,
	"duration_weeks" integer,
	"abstract" text,
	"ai_summary_de" text,
	"ai_summary_en" text,
	"key_findings" jsonb DEFAULT '[]' NOT NULL,
	"evidence_level" "evidence_level",
	"quality_score" integer,
	"bias" text,
	"limitations" text,
	"funding" varchar(500),
	"conflict_of_interest" text,
	"linked_entity_ids" jsonb DEFAULT '[]' NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"generated_by_ai" boolean DEFAULT false NOT NULL,
	"imported_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sources_pmid_unique" UNIQUE("pmid"),
	CONSTRAINT "sources_doi_unique" UNIQUE("doi")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "topic_relations" (
	"id" text PRIMARY KEY NOT NULL,
	"from_topic_id" text NOT NULL,
	"to_topic_id" text NOT NULL,
	"relation_type" varchar(100) DEFAULT 'related' NOT NULL,
	"strength" real DEFAULT 0.5 NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_blocks" ADD COLUMN IF NOT EXISTS "ai_prompt_id" text;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD COLUMN IF NOT EXISTS "comprehension_level" varchar(50) DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD COLUMN IF NOT EXISTS "target_audience" varchar(50) DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD COLUMN IF NOT EXISTS "reading_time_seconds" integer;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD COLUMN IF NOT EXISTS "glossar_terms" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD COLUMN IF NOT EXISTS "lifecycle_status" "lifecycle_status" DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD COLUMN IF NOT EXISTS "approved_by" varchar(200);--> statement-breakpoint
ALTER TABLE "content_blocks" ADD COLUMN IF NOT EXISTS "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD COLUMN IF NOT EXISTS "last_reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD COLUMN IF NOT EXISTS "next_review_due" timestamp;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD COLUMN IF NOT EXISTS "review_note" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "lifecycle_status" "lifecycle_status" DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "academy_module_ids" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "shop_product_ids" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "protocol_ids" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "stack_ids" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "guide_ids" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "canonical_url" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "geo_qa" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "json_ld" jsonb;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "schema_org" jsonb;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "content_completeness" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "goldstandard_approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "goldstandard_approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "agent_sales_pitch" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "agent_support_faq" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "agent_research_context" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "agent_medical_disclaimer" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "agent_confidence_score" real DEFAULT 0.8;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "shop_headline" varchar(200);--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "shop_bullet_points" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "shop_target_audience" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "shop_contraindications" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "shop_storage_instructions" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "shop_badge_labels" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "bundle_synergy_ids" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "upsell_entity_ids" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "content_hook_30s" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "content_hook_60s" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "content_tiktok_angle" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "content_instagram_caption" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "content_viral_fact" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "content_misconception" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "seo_og_title" varchar(200);--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "seo_og_description" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "seo_faq_schema" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "seo_product_schema" jsonb;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "seo_index_priority" real DEFAULT 0.5;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "academy_learning_goals" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "academy_prerequisites" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "academy_difficulty" varchar(50);--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "academy_estimated_time_minutes" integer;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "academy_video_url" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "crm_customer_segments" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "crm_purchase_intent_score" real DEFAULT 0.5;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "crm_reorder_interval_days" integer;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "crm_whatsapp_trigger_keywords" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "short_description" varchar(300);--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "emoji" varchar(10);--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "nav_group" varchar(100);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_access_log" ADD CONSTRAINT "agent_access_log_agent_key_id_agent_api_keys_id_fk" FOREIGN KEY ("agent_key_id") REFERENCES "public"."agent_api_keys"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_suggestion_id_agent_suggestions_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."agent_suggestions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_agent_key_id_agent_api_keys_id_fk" FOREIGN KEY ("agent_key_id") REFERENCES "public"."agent_api_keys"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_suggestions" ADD CONSTRAINT "agent_suggestions_agent_key_id_agent_api_keys_id_fk" FOREIGN KEY ("agent_key_id") REFERENCES "public"."agent_api_keys"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_suggestions" ADD CONSTRAINT "agent_suggestions_target_entity_id_entities_id_fk" FOREIGN KEY ("target_entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_generation_log" ADD CONSTRAINT "ai_generation_log_prompt_id_ai_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."ai_prompts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_generation_log" ADD CONSTRAINT "ai_generation_log_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_block_sources" ADD CONSTRAINT "content_block_sources_content_block_id_content_blocks_id_fk" FOREIGN KEY ("content_block_id") REFERENCES "public"."content_blocks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_block_sources" ADD CONSTRAINT "content_block_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ecosystem_links" ADD CONSTRAINT "ecosystem_links_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_modules" ADD CONSTRAINT "knowledge_modules_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "topic_relations" ADD CONSTRAINT "topic_relations_from_topic_id_topics_id_fk" FOREIGN KEY ("from_topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "topic_relations" ADD CONSTRAINT "topic_relations_to_topic_id_topics_id_fk" FOREIGN KEY ("to_topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_access_log_agent_idx" ON "agent_access_log" ("agent_key_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_access_log_created_idx" ON "agent_access_log" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_api_keys_role_idx" ON "agent_api_keys" ("agent_role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_api_keys_active_idx" ON "agent_api_keys" ("active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_feedback_suggestion_idx" ON "agent_feedback" ("suggestion_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_feedback_agent_idx" ON "agent_feedback" ("agent_key_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_feedback_role_idx" ON "agent_feedback" ("agent_role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_feedback_created_idx" ON "agent_feedback" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_suggestions_status_idx" ON "agent_suggestions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_suggestions_entity_idx" ON "agent_suggestions" ("target_entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_suggestions_agent_idx" ON "agent_suggestions" ("agent_key_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_suggestions_created_idx" ON "agent_suggestions" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_gen_log_entity_idx" ON "ai_generation_log" ("entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_gen_log_prompt_idx" ON "ai_generation_log" ("prompt_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_gen_log_created_idx" ON "ai_generation_log" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_prompts_slug_idx" ON "ai_prompts" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_prompts_type_idx" ON "ai_prompts" ("prompt_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_prompts_active_idx" ON "ai_prompts" ("active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "confidence_scores_target_idx" ON "confidence_scores" ("target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "confidence_scores_type_idx" ON "confidence_scores" ("target_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "confidence_scores_score_idx" ON "confidence_scores" ("overall_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cbs_block_idx" ON "content_block_sources" ("content_block_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cbs_source_idx" ON "content_block_sources" ("source_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "decision_history_target_idx" ON "decision_history" ("target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "decision_history_type_idx" ON "decision_history" ("target_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "decision_history_reviewer_idx" ON "decision_history" ("reviewed_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "decision_history_created_idx" ON "decision_history" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ecosystem_links_entity_idx" ON "ecosystem_links" ("entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ecosystem_links_type_idx" ON "ecosystem_links" ("link_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ecosystem_links_system_idx" ON "ecosystem_links" ("external_system");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "km_entity_module_idx" ON "knowledge_modules" ("entity_id","module_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "km_slug_module_idx" ON "knowledge_modules" ("entity_slug","module_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "km_status_idx" ON "knowledge_modules" ("review_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kr_entity_module_idx" ON "knowledge_reasoning" ("entity_id","module_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kr_goal_module_idx" ON "knowledge_reasoning" ("goal_context","module_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kr_status_idx" ON "knowledge_reasoning" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitoring_rules_active_idx" ON "monitoring_rules" ("active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitoring_rules_type_idx" ON "monitoring_rules" ("trigger_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rge_from_idx" ON "reasoning_graph_edges" ("from_node_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rge_to_idx" ON "reasoning_graph_edges" ("to_node_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rge_type_idx" ON "reasoning_graph_edges" ("edge_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rge_unique_idx" ON "reasoning_graph_edges" ("from_node_id","to_node_id","edge_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rgn_slug_idx" ON "reasoning_graph_nodes" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rgn_type_idx" ON "reasoning_graph_nodes" ("node_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rgn_entity_idx" ON "reasoning_graph_nodes" ("entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sci_discussion_target_idx" ON "scientific_discussion" ("target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sci_discussion_thread_idx" ON "scientific_discussion" ("thread_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sci_discussion_conflict_idx" ON "scientific_discussion" ("is_conflict");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sci_discussion_created_idx" ON "scientific_discussion" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sci_tasks_status_idx" ON "scientific_tasks" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sci_tasks_type_idx" ON "scientific_tasks" ("task_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sci_tasks_target_idx" ON "scientific_tasks" ("target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sci_tasks_priority_idx" ON "scientific_tasks" ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sci_tasks_created_idx" ON "scientific_tasks" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sources_pmid_idx" ON "sources" ("pmid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sources_doi_idx" ON "sources" ("doi");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sources_year_idx" ON "sources" ("year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sources_status_idx" ON "sources" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "topic_relations_from_idx" ON "topic_relations" ("from_topic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "topic_relations_to_idx" ON "topic_relations" ("to_topic_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_ai_prompt_id_ai_prompts_id_fk" FOREIGN KEY ("ai_prompt_id") REFERENCES "public"."ai_prompts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
