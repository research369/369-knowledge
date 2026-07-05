/**
 * migrate-phase5-collective.ts
 *
 * Phase 5 — Collective Intelligence
 * Neue Tabellen: collective_insights, global_knowledge_index_snapshots, knowledge_roadmap
 */

import { db } from "./index.js";
import { sql } from "drizzle-orm";

export async function migratePhase5Collective(): Promise<void> {
  console.log("[Phase5Migration] Starting collective intelligence tables...");

  // 1. collective_insights
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS collective_insights (
      id                  TEXT PRIMARY KEY,
      insight_type        TEXT NOT NULL,
      content             TEXT NOT NULL,
      context             TEXT NOT NULL DEFAULT '',
      entity_id           TEXT,
      source_agent        TEXT NOT NULL,
      beneficiary_agents  JSONB NOT NULL DEFAULT '[]',
      quality_score       DECIMAL(4,3) NOT NULL DEFAULT 0,
      global_score        DECIMAL(4,3) NOT NULL DEFAULT 0,
      usage_count         INTEGER NOT NULL DEFAULT 1,
      is_approved         BOOLEAN NOT NULL DEFAULT false,
      content_hash        TEXT NOT NULL,
      created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_collective_insights_hash
    ON collective_insights (content_hash)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_collective_insights_agent
    ON collective_insights (source_agent, is_approved)
  `);

  // 2. global_knowledge_index_snapshots
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS global_knowledge_index_snapshots (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      index_data  JSONB NOT NULL,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_gki_snapshots_created
    ON global_knowledge_index_snapshots (created_at DESC)
  `);

  // 3. knowledge_roadmap
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS knowledge_roadmap (
      id                TEXT PRIMARY KEY,
      category          TEXT NOT NULL,
      priority          TEXT NOT NULL DEFAULT 'medium',
      title             TEXT NOT NULL,
      description       TEXT NOT NULL DEFAULT '',
      entity_id         TEXT,
      entity_name       TEXT,
      estimated_impact  DECIMAL(4,3) NOT NULL DEFAULT 0,
      effort            TEXT NOT NULL DEFAULT 'medium',
      status            TEXT NOT NULL DEFAULT 'pending',
      created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_knowledge_roadmap_status
    ON knowledge_roadmap (status, priority)
  `);

  console.log("[Phase5Migration] Collective intelligence tables ready.");
}
