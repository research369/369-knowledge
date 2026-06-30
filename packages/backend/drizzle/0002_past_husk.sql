ALTER TYPE "content_type" ADD VALUE 'protocol';--> statement-breakpoint
ALTER TYPE "content_type" ADD VALUE 'collection';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE 'peptide';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE 'small_molecule';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE 'steroid';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE 'hormone';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE 'antibody';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE 'supplement';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE 'natural_compound';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE 'vitamin';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE 'mineral';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE 'cosmetic_ingredient';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE 'biomarker';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE 'stack';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE 'protocol';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE 'collection';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE 'source';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE 'author';--> statement-breakpoint
ALTER TYPE "entity_type" ADD VALUE 'product';--> statement-breakpoint
ALTER TYPE "evidence_level" ADD VALUE 'in_vitro';--> statement-breakpoint
ALTER TYPE "evidence_level" ADD VALUE 'animal';--> statement-breakpoint
ALTER TYPE "evidence_level" ADD VALUE 'pilot_human';--> statement-breakpoint
ALTER TYPE "evidence_level" ADD VALUE 'rct';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE 'upregulates';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE 'downregulates';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE 'binds_to';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE 'modulates';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE 'belongs_to';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE 'is_subtype_of';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE 'contains';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE 'treats';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE 'improves';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE 'worsens';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE 'synergizes_with';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE 'antagonizes';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE 'occurs_in';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE 'expressed_in';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE 'codes_for';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE 'measured_by';--> statement-breakpoint
ALTER TYPE "relation_type" ADD VALUE 'marker_for';--> statement-breakpoint
ALTER TYPE "study_type" ADD VALUE 'rct';--> statement-breakpoint
ALTER TYPE "study_type" ADD VALUE 'case_study';--> statement-breakpoint
ALTER TYPE "study_type" ADD VALUE 'observational';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collections" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" varchar(300) NOT NULL,
	"name" varchar(500) NOT NULL,
	"description" text,
	"filter_entity_types" jsonb DEFAULT '[]' NOT NULL,
	"filter_tags" jsonb DEFAULT '[]' NOT NULL,
	"filter_topic_ids" jsonb DEFAULT '[]' NOT NULL,
	"filter_categories" jsonb DEFAULT '[]' NOT NULL,
	"manual_entity_ids" jsonb DEFAULT '[]' NOT NULL,
	"exclude_entity_ids" jsonb DEFAULT '[]' NOT NULL,
	"sort_by" varchar(100) DEFAULT 'name',
	"seo_title" varchar(200),
	"seo_description" varchar(500),
	"hero_image_url" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "protocols" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" varchar(300) NOT NULL,
	"name" varchar(500) NOT NULL,
	"goal" varchar(500),
	"description" text,
	"compound_ids" jsonb DEFAULT '[]' NOT NULL,
	"dosages" jsonb DEFAULT '[]' NOT NULL,
	"combinations" jsonb DEFAULT '[]' NOT NULL,
	"monitoring" text,
	"biomarker_ids" jsonb DEFAULT '[]' NOT NULL,
	"study_ids" jsonb DEFAULT '[]' NOT NULL,
	"risks" text,
	"contraindications" text,
	"seo_title" varchar(200),
	"seo_description" varchar(500),
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"generated_by_ai" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "protocols_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studies" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_id" text,
	"pmid" varchar(50),
	"doi" varchar(300),
	"title" text NOT NULL,
	"authors" jsonb DEFAULT '[]' NOT NULL,
	"journal" varchar(500),
	"year" integer,
	"impact_factor" real,
	"study_type" "study_type",
	"is_human" boolean DEFAULT false NOT NULL,
	"is_animal" boolean DEFAULT false NOT NULL,
	"is_in_vitro" boolean DEFAULT false NOT NULL,
	"is_rct" boolean DEFAULT false NOT NULL,
	"is_meta_analysis" boolean DEFAULT false NOT NULL,
	"sample_size" integer,
	"duration_weeks" integer,
	"dosage" varchar(500),
	"primary_endpoints" jsonb DEFAULT '[]' NOT NULL,
	"secondary_endpoints" jsonb DEFAULT '[]' NOT NULL,
	"abstract" text,
	"results" text,
	"limitations" text,
	"bias" text,
	"funding" varchar(500),
	"ai_summary" text,
	"ai_summary_de" text,
	"evidence_level" "evidence_level",
	"quality_score" integer,
	"linked_entity_ids" jsonb DEFAULT '[]' NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"generated_by_ai" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_blocks" ADD COLUMN "generated_by_ai" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "compound_subtype" varchar(100);--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "molecular_formula" varchar(200);--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "molecular_weight" varchar(100);--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "iupac_name" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "manually_edited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "last_edited_by" varchar(200);--> statement-breakpoint
ALTER TABLE "entity_versions" ADD COLUMN "is_ai_generated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "entity_versions" ADD COLUMN "is_manual_edit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "relations" ADD COLUMN "weight" real DEFAULT 1;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studies" ADD CONSTRAINT "studies_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collections_slug_idx" ON "collections" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "protocols_slug_idx" ON "protocols" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "protocols_status_idx" ON "protocols" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studies_pmid_idx" ON "studies" ("pmid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studies_doi_idx" ON "studies" ("doi");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studies_year_idx" ON "studies" ("year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studies_status_idx" ON "studies" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entities_slug_idx" ON "entities" ("slug");