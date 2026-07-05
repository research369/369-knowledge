/**
 * migrate-orchestrator.ts
 *
 * Phase 4 — Knowledge Orchestration
 * Erstellt die Orchestrator-Tabellen für Decisions und Tasks.
 *
 * ADDITIVE MIGRATION — keine bestehenden Felder werden verändert.
 */
import { db } from "./index.js";
import { sql } from "drizzle-orm";

export async function runOrchestratorMigration(): Promise<void> {
  try {
    // Sentinel: Prüfe ob Migration bereits gelaufen
    const check = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'orchestrator_decisions'
      ) as exists
    `) as any[];

    if (check[0]?.exists === true || check[0]?.exists === "true") {
      console.log("[OrchestratorMigration] Already applied, skipping.");
      return;
    }

    console.log("[OrchestratorMigration] Running Phase 4 Orchestrator migration...");

    // orchestrator_decisions
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS orchestrator_decisions (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        entity_slug TEXT NOT NULL,
        entity_name TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        trigger_detail TEXT,
        affected_systems JSONB NOT NULL DEFAULT '[]',
        affected_entities JSONB NOT NULL DEFAULT '[]',
        affected_stacks JSONB NOT NULL DEFAULT '[]',
        total_impact_score FLOAT NOT NULL DEFAULT 0,
        estimated_content_changes INT NOT NULL DEFAULT 0,
        estimated_agents_affected INT NOT NULL DEFAULT 0,
        estimated_seo_pages INT NOT NULL DEFAULT 0,
        estimated_academy_modules INT NOT NULL DEFAULT 0,
        immediate_count INT NOT NULL DEFAULT 0,
        deferred_count INT NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // orchestrator_tasks
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS orchestrator_tasks (
        id TEXT PRIMARY KEY,
        decision_id TEXT NOT NULL REFERENCES orchestrator_decisions(id) ON DELETE CASCADE,
        entity_id TEXT NOT NULL,
        system_target TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        reason TEXT,
        estimated_impact FLOAT NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Indices für Performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_orchestrator_decisions_entity ON orchestrator_decisions(entity_id);
      CREATE INDEX IF NOT EXISTS idx_orchestrator_decisions_created ON orchestrator_decisions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_decision ON orchestrator_tasks(decision_id);
      CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_status ON orchestrator_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_priority ON orchestrator_tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_scheduled ON orchestrator_tasks(scheduled_for);
    `);

    console.log("[OrchestratorMigration] ✅ Phase 4 Orchestrator migration completed.");
  } catch (err: any) {
    console.error("[OrchestratorMigration] ❌ Migration failed:", err?.message);
    throw err;
  }
}
