CREATE TABLE IF NOT EXISTS "entity_topics" (
	"entity_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "entity_topics_entity_id_topic_id_pk" PRIMARY KEY("entity_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "topics" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" varchar(200) NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_en" varchar(200),
	"description" text,
	"hero_image_url" text,
	"icon_name" varchar(100),
	"color" varchar(50),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"seo_title" varchar(200),
	"seo_description" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "slug" varchar(300);--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "short_description" varchar(300);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entity_topics" ADD CONSTRAINT "entity_topics_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entity_topics" ADD CONSTRAINT "entity_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entity_topics_entity_idx" ON "entity_topics" ("entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entity_topics_topic_idx" ON "entity_topics" ("topic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "topics_slug_idx" ON "topics" ("slug");--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_slug_unique" UNIQUE("slug");