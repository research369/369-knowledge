DO $$ BEGIN
 CREATE TYPE "public"."content_status" AS ENUM('draft', 'pending_review', 'approved', 'published', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."content_type" AS ENUM('compound', 'guide', 'stack', 'module', 'faq', 'glossary');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."entity_type" AS ENUM('compound', 'study', 'mechanism', 'pathway', 'protein', 'gene', 'receptor', 'enzyme', 'organ', 'tissue', 'biological_process', 'disease', 'symptom', 'product', 'guide', 'faq', 'glossary_term', 'academy_module', 'video', 'graphic', 'source', 'author');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."evidence_level" AS ENUM('preclinical', 'clinical', 'review', 'meta_analysis', 'anecdotal');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."knowledge_layer" AS ENUM('L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."relation_type" AS ENUM('belongs_to', 'activates', 'inhibits', 'influences', 'interacts_with', 'regulates', 'is_part_of', 'relevant_for', 'studied_in', 'evidenced_by', 'contradicts', 'confirms', 'updates', 'combined_with', 'requires', 'recommends', 'answers', 'has_source', 'has_evidence', 'has_product');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."study_type" AS ENUM('human', 'animal', 'in_vitro', 'meta_analysis', 'review');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "admin_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"key_hash" text NOT NULL,
	"permissions" jsonb DEFAULT '[]' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_id" text NOT NULL,
	"layer" "knowledge_layer" NOT NULL,
	"scope" jsonb DEFAULT '["portal","academy","bedo"]' NOT NULL,
	"block_type" varchar(100) NOT NULL,
	"title" varchar(500),
	"body" text NOT NULL,
	"sources" jsonb DEFAULT '[]' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entities" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "entity_type" NOT NULL,
	"canonical_name" varchar(500) NOT NULL,
	"aliases" jsonb DEFAULT '[]' NOT NULL,
	"language" varchar(10) DEFAULT 'de' NOT NULL,
	"cas_number" varchar(100),
	"categories" jsonb DEFAULT '[]' NOT NULL,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"seo_title" varchar(200),
	"seo_description" varchar(500),
	"seo_keywords" jsonb DEFAULT '[]' NOT NULL,
	"hero_image_url" text,
	"molecule_image_url" text,
	"metrics" jsonb DEFAULT '[]' NOT NULL,
	"generated_by_ai" boolean DEFAULT false NOT NULL,
	"approved_by" varchar(200),
	"approved_at" timestamp,
	"published_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entity_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_id" text NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"changed_by" varchar(200),
	"change_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ontology_entity_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"required_fields" jsonb DEFAULT '[]' NOT NULL,
	"allowed_layers" jsonb DEFAULT '[]' NOT NULL,
	"allowed_scopes" jsonb DEFAULT '[]' NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ontology_relations" (
	"id" text PRIMARY KEY NOT NULL,
	"from_entity_type" "entity_type" NOT NULL,
	"relation_type" "relation_type" NOT NULL,
	"to_entity_type" "entity_type" NOT NULL,
	"allowed" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "relations" (
	"id" text PRIMARY KEY NOT NULL,
	"from_entity_id" text NOT NULL,
	"relation_type" "relation_type" NOT NULL,
	"to_entity_id" text NOT NULL,
	"layer" "knowledge_layer" DEFAULT 'L2' NOT NULL,
	"scope" jsonb DEFAULT '["portal","academy","bedo"]' NOT NULL,
	"description" text,
	"sources" jsonb DEFAULT '[]' NOT NULL,
	"study_types" jsonb DEFAULT '[]' NOT NULL,
	"confidence_score" real DEFAULT 0.5 NOT NULL,
	"evidence_level" "evidence_level" DEFAULT 'preclinical',
	"quality_rating" integer,
	"reviewed_by" varchar(200),
	"last_reviewed_at" timestamp,
	"next_review_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entity_versions" ADD CONSTRAINT "entity_versions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "relations" ADD CONSTRAINT "relations_from_entity_id_entities_id_fk" FOREIGN KEY ("from_entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "relations" ADD CONSTRAINT "relations_to_entity_id_entities_id_fk" FOREIGN KEY ("to_entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_blocks_entity_idx" ON "content_blocks" ("entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_blocks_layer_idx" ON "content_blocks" ("layer");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entities_type_idx" ON "entities" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entities_status_idx" ON "entities" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "relations_from_idx" ON "relations" ("from_entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "relations_to_idx" ON "relations" ("to_entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "relations_type_idx" ON "relations" ("relation_type");