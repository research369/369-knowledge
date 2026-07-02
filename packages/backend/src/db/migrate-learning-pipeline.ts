/**
 * migrate-learning-pipeline.ts
 *
 * Schema-Erweiterung für:
 * 1. chat_sessions — Conversation Memory (Query + Antwort + Kontext)
 * 2. learned_few_shots — DB-basierte Few-Shots (aus echten Gesprächen gelernt)
 * 3. long_term_memory — Entity-spezifisches Langzeitgedächtnis pro Agent-Rolle
 * 4. learning_queue — Automatische Verarbeitungs-Queue für neue Chats
 */

import { db } from "./index.js";
import { sql } from "drizzle-orm";

export async function migrateLearningPipeline(): Promise<void> {
  console.log("[migrate-learning-pipeline] Starte Migration...");

  // 1. chat_sessions — Conversation Memory
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      agent_role TEXT NOT NULL,
      api_key_id TEXT,
      entity_id TEXT,
      entity_slug TEXT,
      query TEXT NOT NULL,
      response TEXT NOT NULL,
      intent TEXT,
      knowledge_view TEXT,
      few_shots_used INTEGER DEFAULT 0,
      prompt_tokens INTEGER,
      completion_tokens INTEGER,
      processing_ms INTEGER,
      validation_passed BOOLEAN DEFAULT TRUE,
      compliance_flags JSONB DEFAULT '[]',
      user_level TEXT DEFAULT 'intermediate',
      quality_score REAL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS chat_sessions_session_idx ON chat_sessions(session_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS chat_sessions_entity_idx ON chat_sessions(entity_slug)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS chat_sessions_role_idx ON chat_sessions(agent_role)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS chat_sessions_created_idx ON chat_sessions(created_at)
  `);

  // 2. learned_few_shots — DB-basierte Few-Shots (aus echten Gesprächen)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS learned_few_shots (
      id TEXT PRIMARY KEY,
      agent_role TEXT NOT NULL,
      entity_slug TEXT,
      tags JSONB DEFAULT '[]',
      user_query TEXT NOT NULL,
      ideal_response TEXT NOT NULL,
      quality REAL NOT NULL DEFAULT 0.7,
      source TEXT NOT NULL DEFAULT 'manual',
      source_session_id TEXT,
      approved BOOLEAN DEFAULT FALSE,
      active BOOLEAN DEFAULT TRUE,
      usage_count INTEGER DEFAULT 0,
      last_used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS learned_few_shots_role_idx ON learned_few_shots(agent_role)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS learned_few_shots_entity_idx ON learned_few_shots(entity_slug)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS learned_few_shots_active_idx ON learned_few_shots(active, approved)
  `);

  // 3. long_term_memory — Entity-spezifisches Langzeitgedächtnis
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS long_term_memory (
      id TEXT PRIMARY KEY,
      agent_role TEXT NOT NULL,
      entity_slug TEXT,
      memory_type TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      confidence REAL DEFAULT 0.8,
      source_session_ids JSONB DEFAULT '[]',
      reinforcement_count INTEGER DEFAULT 1,
      last_reinforced_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS long_term_memory_unique_idx 
    ON long_term_memory(agent_role, COALESCE(entity_slug, ''), memory_type, key)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS long_term_memory_role_entity_idx 
    ON long_term_memory(agent_role, entity_slug)
  `);

  // 4. learning_queue — Automatische Verarbeitungs-Queue
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS learning_queue (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      priority INTEGER DEFAULT 5,
      attempts INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 3,
      error TEXT,
      result JSONB,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      processed_at TIMESTAMP,
      next_retry_at TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS learning_queue_status_idx ON learning_queue(status, next_retry_at)
  `);

  console.log("[migrate-learning-pipeline] ✅ Migration abgeschlossen");
}
