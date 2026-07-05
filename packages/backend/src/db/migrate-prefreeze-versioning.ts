/**
 * migrate-prefreeze-versioning.ts
 *
 * Pre-Freeze Migration — Content-Versionierung + Business Scores
 *
 * Neue Tabellen:
 *   - content_versions: jeder generierte Content mit vollständigen Snapshots
 *   - business_scores: Business Intelligence Layer pro Entity
 *   - generation_budget_log: Protokoll aller Budget-Entscheidungen
 */

import { db } from "./index.js";
import { sql } from "drizzle-orm";

export async function migratePreFreezeVersioning(): Promise<void> {
  console.log("[Migration] Pre-Freeze Versioning + Business Scores...");

  // 1. content_versions Tabelle
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS content_versions (
      id                        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      entity_id                 TEXT NOT NULL,
      entity_slug               TEXT NOT NULL,
      output_type               TEXT NOT NULL,
      version                   INTEGER NOT NULL DEFAULT 1,
      content                   JSONB NOT NULL,
      status                    TEXT NOT NULL DEFAULT 'generated',

      -- Snapshots zum Zeitpunkt der Generierung
      knowledge_score_snapshot  NUMERIC(5,3),
      business_score_snapshot   NUMERIC(5,3),
      entity_version_snapshot   INTEGER,
      factory_version           TEXT NOT NULL DEFAULT '1.0.0',
      llm_version               TEXT,
      prompt_version            TEXT,
      knowledge_snapshot        JSONB,

      -- Metadaten
      generated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      generated_by              TEXT NOT NULL DEFAULT 'content-factory',
      trigger_type              TEXT,
      budget_decision           TEXT,
      is_current                BOOLEAN NOT NULL DEFAULT true,

      -- Indizes
      UNIQUE(entity_id, output_type, version)
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_content_versions_entity_output
    ON content_versions(entity_id, output_type)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_content_versions_current
    ON content_versions(entity_id, output_type, is_current)
    WHERE is_current = true
  `);

  // 2. business_scores Tabelle
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS business_scores (
      id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      entity_id             TEXT NOT NULL,
      entity_slug           TEXT NOT NULL,

      -- 10 Business-Intelligence-Scores
      clinical_relevance    NUMERIC(5,3) NOT NULL DEFAULT 0,
      commercial_value      NUMERIC(5,3) NOT NULL DEFAULT 0,
      seo_opportunity       NUMERIC(5,3) NOT NULL DEFAULT 0,
      academy_coverage      NUMERIC(5,3) NOT NULL DEFAULT 0,
      agent_usage           NUMERIC(5,3) NOT NULL DEFAULT 0,
      graph_connectivity    NUMERIC(5,3) NOT NULL DEFAULT 0,
      citation_density      NUMERIC(5,3) NOT NULL DEFAULT 0,
      content_completeness  NUMERIC(5,3) NOT NULL DEFAULT 0,
      bundle_potential      NUMERIC(5,3) NOT NULL DEFAULT 0,
      update_priority       NUMERIC(5,3) NOT NULL DEFAULT 0,
      business_score        NUMERIC(5,3) NOT NULL DEFAULT 0,

      computed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      computation_version   INTEGER NOT NULL DEFAULT 1
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_business_scores_entity
    ON business_scores(entity_id, computed_at DESC)
  `);

  // 3. generation_budget_log Tabelle
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS generation_budget_log (
      id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      entity_id             TEXT NOT NULL,
      output_type           TEXT NOT NULL,
      trigger_type          TEXT NOT NULL,
      decision              TEXT NOT NULL,
      reason                TEXT,
      expected_value_gain   NUMERIC(5,3),
      estimated_cost_units  NUMERIC(5,2),
      roi                   NUMERIC(5,3),
      change_significance   NUMERIC(5,3),
      affected_output_types JSONB,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_budget_log_entity
    ON generation_budget_log(entity_id, created_at DESC)
  `);

  console.log("[Migration] Pre-Freeze Versioning + Business Scores: OK");
}
