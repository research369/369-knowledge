ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "visibility" jsonb DEFAULT '["PepGPT","SalesGPT","SupportGPT","Academy","Shop","Portal","SEO","GEO","WhatsApp","Content Factory"]' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "human_review_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "review_notes" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "reviewed_by" varchar(200);--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "review_date" timestamp;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "evidence_level" "evidence_level";--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "source_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "owner" varchar(200);--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "change_history" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entities_lifecycle_idx" ON "entities" ("lifecycle_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entities_evidence_idx" ON "entities" ("evidence_level");