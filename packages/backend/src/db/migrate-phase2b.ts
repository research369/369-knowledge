/**
 * Phase 2b Migration Script
 * Run once to apply Scientific Memory & Knowledge Lifecycle schema changes.
 * Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS).
 */
import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString, { max: 1 });

console.log("[Phase 2b Migration] Starting...");

try {
  // ─── New Enums ────────────────────────────────────────────────────────────

  await sql`
    DO $$ BEGIN
      CREATE TYPE lifecycle_status AS ENUM (
        'new', 'ai_draft', 'review', 'approved', 'published',
        'monitoring', 'review_required', 'updated', 'archived'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  console.log("[Phase 2b] lifecycle_status enum OK");

  await sql`
    DO $$ BEGIN
      CREATE TYPE scientific_task_type AS ENUM (
        'review_new_source', 'update_entity', 'review_faq', 'review_guide',
        'review_protocol', 'review_relation', 'review_product_link',
        'review_academy_link', 'validate_confidence', 'resolve_conflict',
        'complete_lifecycle', 'custom'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  console.log("[Phase 2b] scientific_task_type enum OK");

  await sql`
    DO $$ BEGIN
      CREATE TYPE scientific_task_status AS ENUM (
        'open', 'in_progress', 'completed', 'dismissed', 'blocked'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  console.log("[Phase 2b] scientific_task_status enum OK");

  await sql`
    DO $$ BEGIN
      CREATE TYPE discussion_entry_type AS ENUM (
        'suggestion', 'comment', 'evidence', 'conflict', 'resolution', 'decision', 'system'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  console.log("[Phase 2b] discussion_entry_type enum OK");

  // ─── Extend entities table ────────────────────────────────────────────────

  await sql`
    ALTER TABLE entities
      ADD COLUMN IF NOT EXISTS lifecycle_status lifecycle_status NOT NULL DEFAULT 'new'
  `;
  // Sync existing status values
  await sql`UPDATE entities SET lifecycle_status = 'published' WHERE status = 'published'`;
  await sql`UPDATE entities SET lifecycle_status = 'review' WHERE status = 'pending_review'`;
  await sql`UPDATE entities SET lifecycle_status = 'archived' WHERE status = 'archived'`;
  await sql`UPDATE entities SET lifecycle_status = 'ai_draft' WHERE status = 'draft' AND generated_by_ai = true`;
  console.log("[Phase 2b] entities.lifecycle_status OK");

  // ─── Extend content_blocks table ─────────────────────────────────────────

  await sql`
    ALTER TABLE content_blocks
      ADD COLUMN IF NOT EXISTS lifecycle_status lifecycle_status NOT NULL DEFAULT 'new',
      ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS approved_by VARCHAR(200),
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS next_review_due TIMESTAMP,
      ADD COLUMN IF NOT EXISTS review_note TEXT
  `;
  console.log("[Phase 2b] content_blocks lifecycle fields OK");

  // ─── decision_history ─────────────────────────────────────────────────────

  await sql`
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
  `;
  await sql`CREATE INDEX IF NOT EXISTS decision_history_target_idx ON decision_history(target_id)`;
  await sql`CREATE INDEX IF NOT EXISTS decision_history_type_idx ON decision_history(target_type)`;
  await sql`CREATE INDEX IF NOT EXISTS decision_history_reviewer_idx ON decision_history(reviewed_by)`;
  await sql`CREATE INDEX IF NOT EXISTS decision_history_created_idx ON decision_history(created_at)`;
  console.log("[Phase 2b] decision_history table OK");

  // ─── scientific_discussion ────────────────────────────────────────────────

  await sql`
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
  `;
  await sql`CREATE INDEX IF NOT EXISTS sci_discussion_target_idx ON scientific_discussion(target_id)`;
  await sql`CREATE INDEX IF NOT EXISTS sci_discussion_thread_idx ON scientific_discussion(thread_id)`;
  await sql`CREATE INDEX IF NOT EXISTS sci_discussion_conflict_idx ON scientific_discussion(is_conflict)`;
  await sql`CREATE INDEX IF NOT EXISTS sci_discussion_created_idx ON scientific_discussion(created_at)`;
  console.log("[Phase 2b] scientific_discussion table OK");

  // ─── confidence_scores ────────────────────────────────────────────────────

  await sql`
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
  `;
  await sql`CREATE INDEX IF NOT EXISTS confidence_scores_target_idx ON confidence_scores(target_id)`;
  await sql`CREATE INDEX IF NOT EXISTS confidence_scores_type_idx ON confidence_scores(target_type)`;
  await sql`CREATE INDEX IF NOT EXISTS confidence_scores_score_idx ON confidence_scores(overall_score)`;
  console.log("[Phase 2b] confidence_scores table OK");

  // ─── scientific_tasks ─────────────────────────────────────────────────────

  await sql`
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
  `;
  await sql`CREATE INDEX IF NOT EXISTS sci_tasks_status_idx ON scientific_tasks(status)`;
  await sql`CREATE INDEX IF NOT EXISTS sci_tasks_type_idx ON scientific_tasks(task_type)`;
  await sql`CREATE INDEX IF NOT EXISTS sci_tasks_target_idx ON scientific_tasks(target_id)`;
  await sql`CREATE INDEX IF NOT EXISTS sci_tasks_priority_idx ON scientific_tasks(priority)`;
  await sql`CREATE INDEX IF NOT EXISTS sci_tasks_created_idx ON scientific_tasks(created_at)`;
  console.log("[Phase 2b] scientific_tasks table OK");

  // ─── agent_feedback ───────────────────────────────────────────────────────

  await sql`
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
  `;
  await sql`CREATE INDEX IF NOT EXISTS agent_feedback_suggestion_idx ON agent_feedback(suggestion_id)`;
  await sql`CREATE INDEX IF NOT EXISTS agent_feedback_agent_idx ON agent_feedback(agent_key_id)`;
  await sql`CREATE INDEX IF NOT EXISTS agent_feedback_role_idx ON agent_feedback(agent_role)`;
  await sql`CREATE INDEX IF NOT EXISTS agent_feedback_created_idx ON agent_feedback(created_at)`;
  console.log("[Phase 2b] agent_feedback table OK");

  // ─── monitoring_rules ─────────────────────────────────────────────────────

  await sql`
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
  `;
  await sql`CREATE INDEX IF NOT EXISTS monitoring_rules_active_idx ON monitoring_rules(active)`;
  await sql`CREATE INDEX IF NOT EXISTS monitoring_rules_type_idx ON monitoring_rules(trigger_type)`;
  console.log("[Phase 2b] monitoring_rules table OK");

  // ─── Seed default monitoring rules ───────────────────────────────────────

  await sql`
    INSERT INTO monitoring_rules (id, name, description, trigger_type, config, applies_to, task_type_to_create, task_priority)
    VALUES
      ('rule-new-source', 'Neue Quelle für Entity', 'Wenn eine neue Quelle für eine Entity importiert wird', 'new_source_for_entity', '{"minImpactFactor": 2.0}', '["compound","peptide","mechanism"]', 'review_new_source', 3),
      ('rule-confidence-drop', 'Confidence Score Drop', 'Wenn der Confidence Score um mehr als 10% fällt', 'confidence_drop', '{"minConfidenceDrop": 0.1}', '[]', 'validate_confidence', 4),
      ('rule-time-since-review', 'Überprüfungsfrist überschritten', 'Wenn eine Entity länger als 180 Tage nicht geprüft wurde', 'time_since_review', '{"maxDaysSinceReview": 180}', '["compound","peptide","mechanism","protocol"]', 'update_entity', 6),
      ('rule-open-conflict', 'Offener Konflikt', 'Wenn ein offener Konflikt in der Diskussion besteht', 'open_conflict', '{}', '[]', 'resolve_conflict', 2),
      ('rule-new-meta-analysis', 'Neue Meta-Analyse', 'Wenn eine neue Meta-Analyse importiert wird', 'new_meta_analysis', '{}', '[]', 'review_new_source', 1)
    ON CONFLICT DO NOTHING
  `;
  console.log("[Phase 2b] monitoring_rules seeded OK");

  console.log("[Phase 2b Migration] ✅ All done!");
} catch (err: any) {
  console.error("[Phase 2b Migration] ❌ Error:", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
