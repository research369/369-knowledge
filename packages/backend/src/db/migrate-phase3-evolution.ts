/**
 * migrate-phase3-evolution.ts
 *
 * Phase 3 — Self-Improving Knowledge System
 * Neue Tabellen für Knowledge Evolution Engine.
 *
 * ADDITIV — keine bestehenden Tabellen werden verändert.
 * Alle Tabellen mit IF NOT EXISTS gesichert.
 */

import { db } from "./index.js";
import { sql } from "drizzle-orm";

export async function runPhase3EvolutionMigration(): Promise<void> {
  try {
    // Sentinel: Prüfe ob Migration bereits gelaufen
    const check = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'knowledge_evolution_scores'
      ) as exists
    `);
    const alreadyRun = (check as any)[0]?.exists === true;
    if (alreadyRun) {
      console.log("[Phase 3 Evolution] Already complete — skipping");
      return;
    }

    console.log("[Phase 3 Evolution] Starting schema extensions...");

    // ── 1. Knowledge Evolution Scores ────────────────────────────────────────
    // Speichert die 6 berechneten Scores pro Entity (Upsert-Tabelle)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS knowledge_evolution_scores (
        id                  TEXT PRIMARY KEY,
        entity_id           TEXT NOT NULL UNIQUE,
        research_score      REAL NOT NULL DEFAULT 0.0,
        evidence_score      REAL NOT NULL DEFAULT 0.0,
        freshness_score     REAL NOT NULL DEFAULT 0.0,
        confidence_score    REAL NOT NULL DEFAULT 0.0,
        completeness_score  REAL NOT NULL DEFAULT 0.0,
        knowledge_score     REAL NOT NULL DEFAULT 0.0,
        total_blocks        INTEGER NOT NULL DEFAULT 0,
        total_sources       INTEGER NOT NULL DEFAULT 0,
        total_relations     INTEGER NOT NULL DEFAULT 0,
        missing_block_types JSONB NOT NULL DEFAULT '[]',
        computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[Phase 3 Evolution] ✓ knowledge_evolution_scores created");

    // ── 2. Knowledge Evolution Log ───────────────────────────────────────────
    // Zeitreihe aller Score-Berechnungen (für Trend-Analyse)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS knowledge_evolution_log (
        id                  TEXT PRIMARY KEY,
        entity_id           TEXT NOT NULL,
        trigger_type        TEXT NOT NULL,
        knowledge_score     REAL NOT NULL DEFAULT 0.0,
        research_score      REAL NOT NULL DEFAULT 0.0,
        evidence_score      REAL NOT NULL DEFAULT 0.0,
        freshness_score     REAL NOT NULL DEFAULT 0.0,
        confidence_score    REAL NOT NULL DEFAULT 0.0,
        completeness_score  REAL NOT NULL DEFAULT 0.0,
        score_delta         REAL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS kel_entity_idx ON knowledge_evolution_log (entity_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS kel_created_idx ON knowledge_evolution_log (created_at DESC)
    `);
    console.log("[Phase 3 Evolution] ✓ knowledge_evolution_log created");

    // ── 3. Knowledge Propagation Queue ───────────────────────────────────────
    // Queue für automatische Content-Updates bei Score-Änderungen
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS knowledge_propagation_queue (
        id              TEXT PRIMARY KEY,
        entity_id       TEXT NOT NULL,
        output_type     TEXT NOT NULL,
        trigger_reason  TEXT NOT NULL,
        scores_snapshot JSONB NOT NULL DEFAULT '{}',
        status          TEXT NOT NULL DEFAULT 'pending',
        error_message   TEXT,
        processed_at    TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (entity_id, output_type)
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS kpq_status_idx ON knowledge_propagation_queue (status)
    `);
    console.log("[Phase 3 Evolution] ✓ knowledge_propagation_queue created");

    // ── 4. Content Generation Requests ───────────────────────────────────────
    // Anfragen für automatische Content-Generierung (alle 16 Output-Typen)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS content_generation_requests (
        id              TEXT PRIMARY KEY,
        entity_id       TEXT NOT NULL,
        output_type     TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'pending',
        generated_content TEXT,
        error_message   TEXT,
        requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at    TIMESTAMPTZ,
        UNIQUE (entity_id, output_type)
      )
    `);
    console.log("[Phase 3 Evolution] ✓ content_generation_requests created");

    // ── 5. Pattern Library ────────────────────────────────────────────────────
    // Automatisch erkannte Muster aus Chat-Konversationen
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pattern_library (
        id              TEXT PRIMARY KEY,
        pattern_type    TEXT NOT NULL,
        agent_role      TEXT NOT NULL,
        entity_id       TEXT,
        pattern_text    TEXT NOT NULL,
        example_query   TEXT,
        example_response TEXT,
        frequency       INTEGER NOT NULL DEFAULT 1,
        quality_score   REAL NOT NULL DEFAULT 0.5,
        status          TEXT NOT NULL DEFAULT 'pending',
        source_chat_ids JSONB NOT NULL DEFAULT '[]',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS pl_type_idx ON pattern_library (pattern_type)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS pl_agent_idx ON pattern_library (agent_role)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS pl_entity_idx ON pattern_library (entity_id)
    `);
    console.log("[Phase 3 Evolution] ✓ pattern_library created");

    // ── 6. Knowledge Conflicts ────────────────────────────────────────────────
    // Erkannte Widersprüche zwischen Quellen oder Blocks
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS knowledge_conflicts (
        id              TEXT PRIMARY KEY,
        entity_id       TEXT NOT NULL,
        conflict_type   TEXT NOT NULL,
        description     TEXT NOT NULL,
        source_a_id     TEXT,
        source_b_id     TEXT,
        block_a_id      TEXT,
        block_b_id      TEXT,
        severity        TEXT NOT NULL DEFAULT 'low',
        status          TEXT NOT NULL DEFAULT 'open',
        resolution      TEXT,
        resolved_at     TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[Phase 3 Evolution] ✓ knowledge_conflicts created");

    // ── 7. Generated Content Store ────────────────────────────────────────────
    // Speichert alle automatisch generierten Outputs (Shop, Academy, SEO, Social...)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS generated_content_store (
        id              TEXT PRIMARY KEY,
        entity_id       TEXT NOT NULL,
        output_type     TEXT NOT NULL,
        content_json    JSONB NOT NULL DEFAULT '{}',
        knowledge_score_at_generation REAL,
        generation_model TEXT,
        status          TEXT NOT NULL DEFAULT 'draft',
        approved_at     TIMESTAMPTZ,
        published_at    TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (entity_id, output_type)
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS gcs_entity_idx ON generated_content_store (entity_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS gcs_type_idx ON generated_content_store (output_type)
    `);
    console.log("[Phase 3 Evolution] ✓ generated_content_store created");

    console.log("[Phase 3 Evolution] ✅ All tables created successfully");
  } catch (err: any) {
    console.error("[Phase 3 Evolution] Migration error:", err?.message);
    throw err;
  }
}
