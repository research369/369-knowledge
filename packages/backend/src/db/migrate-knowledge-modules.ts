/**
 * migrate-knowledge-modules.ts
 *
 * Knowledge Modules Layer — zweite Wissensebene des 369 Knowledge OS
 *
 * Neue Tabellen:
 *   - knowledge_modules: 16 Modul-Typen als strukturierte Expertenwissen-Schicht
 *
 * Modul-Typen:
 *   protocol_reference, dosage_reference, decision_tree, monitoring,
 *   bloodwork, interaction, contraindication, stack_logic,
 *   coach_notes, sales_notes, support_notes, risk_profile,
 *   user_pattern, beginner_mistakes, comparison_logic, escalation_rule
 *
 * Contract:
 *   - Kein Agent schreibt in diese Tabelle
 *   - Nur approved + agent_available Module werden ausgegeben
 *   - Dosierungen nur als research_range, nie als direkte Empfehlung
 */

import { db } from "./index.js";
import { sql } from "drizzle-orm";

export async function migrateKnowledgeModules(): Promise<void> {
  console.log("[Migration] Knowledge Modules Layer...");

  // 1. knowledge_modules Tabelle
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS knowledge_modules (
      id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      entity_id           TEXT NOT NULL,
      entity_slug         TEXT NOT NULL,

      -- Modul-Typ (16 Typen)
      module_type         TEXT NOT NULL,

      -- Inhalt (strukturiertes JSON — je nach Typ unterschiedlich)
      content             JSONB NOT NULL,

      -- Qualitäts-Metadaten
      source              TEXT,                    -- Quellenangabe (PMID, DOI, URL, Buch)
      evidence_level      TEXT,                    -- preclinical | animal | pilot_human | clinical | rct | review | meta_analysis | anecdotal | expert_consensus
      confidence_score    NUMERIC(5,3) DEFAULT 0.5,
      last_reviewed       TIMESTAMPTZ,
      review_status       TEXT NOT NULL DEFAULT 'draft',  -- draft | review | approved | agent_available

      -- Zugriffskontrolle
      allowed_agents      JSONB NOT NULL DEFAULT '["pepgpt","salesgpt","supportgpt"]',
      allowed_scope       JSONB NOT NULL DEFAULT '["agent","portal","academy"]',
      forbidden_scope     JSONB NOT NULL DEFAULT '[]',

      -- Compliance
      is_high_risk        BOOLEAN NOT NULL DEFAULT false,
      risk_class          TEXT,                    -- aas | hgh | glp1 | thyroid | insulin | sarms | stimulants | unclear_human

      -- Versionierung
      version             INTEGER NOT NULL DEFAULT 1,
      generated_by_ai     BOOLEAN NOT NULL DEFAULT true,
      approved_by         TEXT,
      approved_at         TIMESTAMPTZ,

      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_knowledge_modules_entity
    ON knowledge_modules(entity_id, module_type)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_knowledge_modules_available
    ON knowledge_modules(entity_id, review_status)
    WHERE review_status = 'agent_available'
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_knowledge_modules_slug
    ON knowledge_modules(entity_slug, module_type)
  `);

  console.log("[Migration] Knowledge Modules Layer: OK");
}
