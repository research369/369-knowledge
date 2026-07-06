/**
 * migrate-knowledge-reasoning.ts
 *
 * Migration für den Knowledge Reasoning Layer (v8.0.0)
 * Erstellt drei neue Tabellen additiv — keine bestehenden Tabellen werden verändert.
 *
 * Tabellen:
 *   - knowledge_reasoning: Reasoning-Module (9 Typen, entity- oder goal-gebunden)
 *   - reasoning_graph_nodes: Knoten des Knowledge Reasoning Graphs
 *   - reasoning_graph_edges: Kanten des Knowledge Reasoning Graphs
 */

import { db } from "./index.js";
import { sql } from "drizzle-orm";

export async function migrateKnowledgeReasoning(): Promise<void> {
  console.log("[Migration] Knowledge Reasoning Layer — Start");

  // ─── Enums ────────────────────────────────────────────────────────────────

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE reasoning_module_type AS ENUM (
        'goal_tree',
        'qualification_tree',
        'decision_tree_v2',
        'stack_strategy',
        'monitoring_strategy',
        'risk_strategy',
        'alternative_strategy',
        'conversation_strategy',
        'sales_strategy',
        'coach_strategy'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE reasoning_status AS ENUM (
        'draft',
        'review',
        'active',
        'archived'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE reasoning_node_type AS ENUM (
        'goal',
        'compound',
        'stack',
        'monitoring',
        'bloodwork',
        'risk',
        'decision',
        'symptom',
        'user_type',
        'next_step'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE reasoning_edge_type AS ENUM (
        'leads_to',
        'requires',
        'recommends',
        'contraindicates',
        'monitors',
        'escalates_to',
        'alternative_to',
        'part_of_stack',
        'precedes',
        'follows'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  // ─── knowledge_reasoning ──────────────────────────────────────────────────

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS knowledge_reasoning (
      id                VARCHAR(36)              PRIMARY KEY,
      entity_id         VARCHAR(36),
      entity_slug       VARCHAR(500),
      goal_context      VARCHAR(200),
      module_type       reasoning_module_type    NOT NULL,
      content           TEXT                     NOT NULL,
      allowed_agents    JSONB                    NOT NULL DEFAULT '["pepgpt","salesgpt","supportgpt"]',
      status            reasoning_status         NOT NULL DEFAULT 'draft',
      confidence_score  REAL                     DEFAULT 0.8,
      is_high_risk      BOOLEAN                  NOT NULL DEFAULT FALSE,
      version           INTEGER                  NOT NULL DEFAULT 1,
      generated_by      VARCHAR(200)             DEFAULT 'llm',
      created_at        TIMESTAMP                NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMP                NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS kr_entity_module_idx
      ON knowledge_reasoning (entity_id, module_type);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS kr_goal_module_idx
      ON knowledge_reasoning (goal_context, module_type);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS kr_status_idx
      ON knowledge_reasoning (status);
  `);

  // ─── reasoning_graph_nodes ────────────────────────────────────────────────

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS reasoning_graph_nodes (
      id           VARCHAR(36)          PRIMARY KEY,
      node_type    reasoning_node_type  NOT NULL,
      label        VARCHAR(500)         NOT NULL,
      slug         VARCHAR(500)         NOT NULL,
      entity_id    VARCHAR(36),
      entity_slug  VARCHAR(500),
      description  TEXT,
      metadata     JSONB                DEFAULT '{}',
      is_active    BOOLEAN              NOT NULL DEFAULT TRUE,
      created_at   TIMESTAMP            NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS rgn_slug_idx ON reasoning_graph_nodes (slug);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS rgn_type_idx ON reasoning_graph_nodes (node_type);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS rgn_entity_idx ON reasoning_graph_nodes (entity_id);
  `);

  // ─── reasoning_graph_edges ────────────────────────────────────────────────

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS reasoning_graph_edges (
      id            VARCHAR(36)          PRIMARY KEY,
      from_node_id  VARCHAR(36)          NOT NULL,
      to_node_id    VARCHAR(36)          NOT NULL,
      edge_type     reasoning_edge_type  NOT NULL,
      condition     TEXT,
      weight        REAL                 DEFAULT 1.0,
      metadata      JSONB                DEFAULT '{}',
      is_active     BOOLEAN              NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMP            NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS rge_from_idx ON reasoning_graph_edges (from_node_id);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS rge_to_idx ON reasoning_graph_edges (to_node_id);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS rge_type_idx ON reasoning_graph_edges (edge_type);
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS rge_unique_idx
      ON reasoning_graph_edges (from_node_id, to_node_id, edge_type);
  `);

  console.log("[Migration] Knowledge Reasoning Layer — Abgeschlossen ✅");
  console.log("  → knowledge_reasoning: Tabelle erstellt");
  console.log("  → reasoning_graph_nodes: Tabelle erstellt");
  console.log("  → reasoning_graph_edges: Tabelle erstellt");
}
