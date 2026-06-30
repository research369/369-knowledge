/**
 * Phase 2b Auto-Migration
 * Runs idempotently at server startup.
 * Uses IF NOT EXISTS / DO $$ EXCEPTION pattern — safe to run multiple times.
 */
import { db } from "./index.js";
import { sql } from "drizzle-orm";

export async function runPhase2bMigration(): Promise<void> {
  try {
    // Check if already migrated by looking for lifecycle_status column
    const check = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'entities' AND column_name = 'lifecycle_status'
      LIMIT 1
    `);

    if ((check as unknown as unknown[]).length > 0) {
      console.log("[Phase 2b] Already migrated, skipping.");
      return;
    }

    console.log("[Phase 2b Migration] Running for the first time...");

    // Enums
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE lifecycle_status AS ENUM (
          'new', 'ai_draft', 'review', 'approved', 'published',
          'monitoring', 'review_required', 'updated', 'archived'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE scientific_task_type AS ENUM (
          'review_new_source', 'update_entity', 'review_faq', 'review_guide',
          'review_protocol', 'review_relation', 'review_product_link',
          'review_academy_link', 'validate_confidence', 'resolve_conflict',
          'complete_lifecycle', 'custom'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE scientific_task_status AS ENUM (
          'open', 'in_progress', 'completed', 'dismissed', 'blocked'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE discussion_entry_type AS ENUM (
          'suggestion', 'comment', 'evidence', 'conflict', 'resolution', 'decision', 'system'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // Extend entities
    await db.execute(sql`
      ALTER TABLE entities
        ADD COLUMN IF NOT EXISTS lifecycle_status lifecycle_status NOT NULL DEFAULT 'new'
    `);
    await db.execute(sql`UPDATE entities SET lifecycle_status = 'published' WHERE status = 'published'`);
    await db.execute(sql`UPDATE entities SET lifecycle_status = 'review' WHERE status = 'pending_review'`);
    await db.execute(sql`UPDATE entities SET lifecycle_status = 'archived' WHERE status = 'archived'`);
    await db.execute(sql`UPDATE entities SET lifecycle_status = 'ai_draft' WHERE status = 'draft' AND generated_by_ai = true`);

    // Extend content_blocks
    await db.execute(sql`
      ALTER TABLE content_blocks
        ADD COLUMN IF NOT EXISTS lifecycle_status lifecycle_status NOT NULL DEFAULT 'new',
        ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS approved_by VARCHAR(200),
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS next_review_due TIMESTAMP,
        ADD COLUMN IF NOT EXISTS review_note TEXT
    `);

    // decision_history
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS decision_history (
        id TEXT PRIMARY KEY,
        target_type VARCHAR(100) NOT NULL,
        target_id TEXT NOT NULL,
        decision VARCHAR(100) NOT NULL,
        previous_status VARCHAR(100),
        new_status VARCHAR(100),
        reasoning TEXT,
        evidence_summary TEXT,
        evidence_level evidence_level,
        confidence_score REAL,
        source_ids JSONB NOT NULL DEFAULT '[]',
        related_task_id TEXT,
        related_suggestion_id TEXT,
        discussion_summary TEXT,
        open_conflicts JSONB NOT NULL DEFAULT '[]',
        reviewed_by VARCHAR(200) NOT NULL,
        reviewer_role VARCHAR(100),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS decision_history_target_idx ON decision_history(target_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS decision_history_type_idx ON decision_history(target_type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS decision_history_created_idx ON decision_history(created_at)`);

    // scientific_discussion
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS scientific_discussion (
        id TEXT PRIMARY KEY,
        target_type VARCHAR(100) NOT NULL,
        target_id TEXT NOT NULL,
        thread_id TEXT,
        parent_entry_id TEXT,
        entry_type discussion_entry_type NOT NULL,
        content TEXT NOT NULL,
        author_type VARCHAR(50) NOT NULL,
        author_id VARCHAR(200),
        author_role VARCHAR(100),
        source_ids JSONB NOT NULL DEFAULT '[]',
        confidence_score REAL,
        evidence_level evidence_level,
        is_conflict BOOLEAN NOT NULL DEFAULT FALSE,
        conflict_with TEXT,
        conflict_resolved BOOLEAN NOT NULL DEFAULT FALSE,
        resolved_by VARCHAR(200),
        resolved_at TIMESTAMP,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sci_discussion_target_idx ON scientific_discussion(target_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sci_discussion_thread_idx ON scientific_discussion(thread_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sci_discussion_conflict_idx ON scientific_discussion(is_conflict)`);

    // confidence_scores
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS confidence_scores (
        id TEXT PRIMARY KEY,
        target_type VARCHAR(100) NOT NULL,
        target_id TEXT NOT NULL UNIQUE,
        overall_score REAL NOT NULL DEFAULT 0.0,
        evidence_level_score REAL NOT NULL DEFAULT 0.0,
        source_count_score REAL NOT NULL DEFAULT 0.0,
        human_study_score REAL NOT NULL DEFAULT 0.0,
        animal_study_score REAL NOT NULL DEFAULT 0.0,
        in_vitro_score REAL NOT NULL DEFAULT 0.0,
        meta_analysis_score REAL NOT NULL DEFAULT 0.0,
        recency_score REAL NOT NULL DEFAULT 0.0,
        reviewer_validation_score REAL NOT NULL DEFAULT 0.0,
        ai_validation_score REAL NOT NULL DEFAULT 0.0,
        total_sources INTEGER NOT NULL DEFAULT 0,
        human_studies INTEGER NOT NULL DEFAULT 0,
        animal_studies INTEGER NOT NULL DEFAULT 0,
        in_vitro_studies INTEGER NOT NULL DEFAULT 0,
        rct_count INTEGER NOT NULL DEFAULT 0,
        meta_analysis_count INTEGER NOT NULL DEFAULT 0,
        open_conflicts INTEGER NOT NULL DEFAULT 0,
        newest_source_year INTEGER,
        oldest_source_year INTEGER,
        last_validated_at TIMESTAMP,
        last_validated_by VARCHAR(200),
        next_validation_due TIMESTAMP,
        computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        computation_version INTEGER NOT NULL DEFAULT 1,
        notes TEXT,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS confidence_scores_target_idx ON confidence_scores(target_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS confidence_scores_score_idx ON confidence_scores(overall_score)`);

    // scientific_tasks
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS scientific_tasks (
        id TEXT PRIMARY KEY,
        task_type scientific_task_type NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        target_type VARCHAR(100),
        target_id TEXT,
        triggered_by VARCHAR(200),
        trigger_reason TEXT,
        trigger_source_id TEXT,
        assigned_to VARCHAR(200),
        priority INTEGER NOT NULL DEFAULT 5,
        due_at TIMESTAMP,
        checklist JSONB NOT NULL DEFAULT '[]',
        status scientific_task_status NOT NULL DEFAULT 'open',
        completed_by VARCHAR(200),
        completed_at TIMESTAMP,
        completion_note TEXT,
        linked_suggestion_ids JSONB NOT NULL DEFAULT '[]',
        linked_decision_ids JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sci_tasks_status_idx ON scientific_tasks(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sci_tasks_type_idx ON scientific_tasks(task_type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sci_tasks_target_idx ON scientific_tasks(target_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sci_tasks_priority_idx ON scientific_tasks(priority)`);

    // agent_feedback
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS agent_feedback (
        id TEXT PRIMARY KEY,
        suggestion_id TEXT NOT NULL REFERENCES agent_suggestions(id) ON DELETE CASCADE,
        agent_key_id TEXT REFERENCES agent_api_keys(id) ON DELETE SET NULL,
        agent_role agent_role,
        decision VARCHAR(50) NOT NULL,
        feedback_type VARCHAR(100),
        feedback_note TEXT,
        correct_aspects JSONB NOT NULL DEFAULT '[]',
        incorrect_aspects JSONB NOT NULL DEFAULT '[]',
        improvement_hints TEXT,
        agent_confidence REAL,
        actual_quality REAL,
        reviewed_by VARCHAR(200) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS agent_feedback_suggestion_idx ON agent_feedback(suggestion_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS agent_feedback_agent_idx ON agent_feedback(agent_key_id)`);

    // monitoring_rules
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS monitoring_rules (
        id TEXT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        trigger_type VARCHAR(100) NOT NULL,
        config JSONB NOT NULL DEFAULT '{}',
        applies_to JSONB NOT NULL DEFAULT '[]',
        task_type_to_create scientific_task_type,
        task_priority INTEGER NOT NULL DEFAULT 5,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS monitoring_rules_active_idx ON monitoring_rules(active)`);

    // Seed monitoring rules
    await db.execute(sql`
      INSERT INTO monitoring_rules (id, name, description, trigger_type, config, applies_to, task_type_to_create, task_priority)
      VALUES
        ('rule-new-source', 'Neue Quelle für Entity', 'Neue Quelle importiert', 'new_source_for_entity', '{"minImpactFactor": 2.0}', '["compound","peptide","mechanism"]', 'review_new_source', 3),
        ('rule-confidence-drop', 'Confidence Score Drop', 'Score fällt um mehr als 10%', 'confidence_drop', '{"minConfidenceDrop": 0.1}', '[]', 'validate_confidence', 4),
        ('rule-time-since-review', 'Überprüfungsfrist', 'Länger als 180 Tage nicht geprüft', 'time_since_review', '{"maxDaysSinceReview": 180}', '["compound","peptide","mechanism","protocol"]', 'update_entity', 6),
        ('rule-open-conflict', 'Offener Konflikt', 'Offener Konflikt in Diskussion', 'open_conflict', '{}', '[]', 'resolve_conflict', 2),
        ('rule-new-meta-analysis', 'Neue Meta-Analyse', 'Neue Meta-Analyse importiert', 'new_meta_analysis', '{}', '[]', 'review_new_source', 1)
      ON CONFLICT DO NOTHING
    `);

    console.log("[Phase 2b Migration] ✅ Complete — 6 new tables, 4 new enums, 2 table extensions.");
  } catch (err: any) {
    console.error("[Phase 2b Migration] Error:", err.message);
    throw err;
  }
}
