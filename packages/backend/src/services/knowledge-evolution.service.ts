/**
 * knowledge-evolution.service.ts
 *
 * Phase 3 — Self-Improving Knowledge System
 *
 * Zentrale Knowledge Evolution Engine.
 * Wird aufgerufen bei:
 *   - Neuer Quelle für eine Entity
 *   - Neuer/aktualisierter Content Block
 *   - Neuer Relation
 *   - Chat-Interaktion (über Learning Runtime)
 *   - Manuellem Trigger (Admin-Endpoint)
 *
 * Berechnet 6 interne Scores (nur für internes Qualitätsmanagement):
 *   1. Research Score    — Qualität und Breite der Forschungsbasis
 *   2. Evidence Score    — Evidenzlevel (RCT > Meta > Human > Animal > In Vitro)
 *   3. Freshness Score   — Aktualität der Quellen
 *   4. Confidence Score  — Gesamtvertrauen (aus confidence.service)
 *   5. Completeness Score — Vollständigkeit der Content-Blocks
 *   6. Knowledge Score   — Gesamtbewertung (gewichtete Summe)
 *
 * Löst bei Score-Änderungen automatisch Knowledge Propagation aus:
 *   Knowledge Graph → Academy → SEO → Shop → FAQ → Agenten
 *
 * ADDITIV — verändert keine bestehenden Funktionen.
 */

import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { computeConfidenceScore } from "./confidence.service.js";
import { fireWebhooks } from "./webhook.service.js";

// ─── Typen ────────────────────────────────────────────────────────────────────

export interface KnowledgeScores {
  entityId: string;
  entitySlug: string;
  entityName: string;
  // 6 Haupt-Scores (0.0–1.0)
  researchScore: number;
  evidenceScore: number;
  freshnessScore: number;
  confidenceScore: number;
  completenessScore: number;
  knowledgeScore: number; // Gesamtscore
  // Metadaten
  totalBlocks: number;
  totalSources: number;
  totalRelations: number;
  missingBlockTypes: string[];
  lastComputedAt: string;
  changeDetected: boolean;
  previousKnowledgeScore: number | null;
  scoreDelta: number | null;
}

export interface PropagationResult {
  entityId: string;
  triggeredSystems: string[];
  webhooksFired: number;
  contentUpdatesQueued: number;
  agentCacheInvalidated: boolean;
  timestamp: string;
}

// ─── Konstanten ───────────────────────────────────────────────────────────────

const REQUIRED_BLOCK_TYPES = [
  "definition",
  "simple_explanation",
  "mechanisms",
  "signaling",
  "research",
  "evidence_summary",
  "interpretation",
  "faq",
];

const SCORE_CHANGE_THRESHOLD = 0.05; // 5% Änderung = Propagation auslösen

// ─── Haupt-Funktion ───────────────────────────────────────────────────────────

/**
 * Vollständige Knowledge Evolution für eine Entity durchführen.
 * Berechnet alle 6 Scores und löst bei Änderungen Propagation aus.
 */
export async function evolveEntityKnowledge(
  entityId: string,
  trigger: "source_added" | "block_updated" | "relation_added" | "chat" | "manual" | "scheduled"
): Promise<KnowledgeScores> {
  const startTime = Date.now();
  console.log(`[knowledge-evolution] Starting evolution for ${entityId} (trigger: ${trigger})`);

  try {
    // 1. Entity-Daten laden
    const entityData = await loadEntityData(entityId);
    if (!entityData) {
      throw new Error(`Entity ${entityId} not found`);
    }

    // 2. Confidence Score neu berechnen (bestehender Service)
    const confidenceScore = await computeConfidenceScore(entityId);

    // 3. Alle 6 Scores berechnen
    const scores = await computeAllScores(entityId, entityData, confidenceScore);

    // 4. Vorherigen Score laden um Delta zu berechnen
    const previousScore = await loadPreviousKnowledgeScore(entityId);
    const scoreDelta = previousScore !== null ? scores.knowledgeScore - previousScore : null;
    const changeDetected = scoreDelta !== null && Math.abs(scoreDelta) >= SCORE_CHANGE_THRESHOLD;

    // 5. Scores in DB speichern
    await saveKnowledgeScores(entityId, scores, trigger);

    // 6. Evolution-Event loggen
    await logEvolutionEvent(entityId, trigger, scores, scoreDelta);

    // 7. Propagation auslösen wenn signifikante Änderung
    if (changeDetected || trigger === "manual") {
      await triggerKnowledgePropagation(entityId, entityData, scores, trigger);
    }

    const duration = Date.now() - startTime;
    console.log(`[knowledge-evolution] ✓ ${entityData.slug} → knowledge: ${scores.knowledgeScore.toFixed(2)} (${duration}ms)`);

    return {
      ...scores,
      entityId,
      entitySlug: entityData.slug,
      entityName: entityData.canonicalName,
      changeDetected,
      previousKnowledgeScore: previousScore,
      scoreDelta,
      lastComputedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error(`[knowledge-evolution] Error for ${entityId}:`, err?.message);
    throw err;
  }
}

// ─── Score-Berechnung ─────────────────────────────────────────────────────────

async function computeAllScores(
  entityId: string,
  entityData: any,
  confidenceScore: number
): Promise<Omit<KnowledgeScores, "entityId" | "entitySlug" | "entityName" | "changeDetected" | "previousKnowledgeScore" | "scoreDelta" | "lastComputedAt">> {

  // Quellen laden
  const sources = await db.execute(sql`
    SELECT study_type, evidence_level, year, quality_score
    FROM sources
    WHERE linked_entity_ids::text LIKE ${'%' + entityId + '%'}
  `) as any[];

  // Content Blocks laden
  const blocks = await db.execute(sql`
    SELECT block_type, layer, scope, body
    FROM content_blocks
    WHERE entity_id = ${entityId}
  `) as any[];

  // Relations laden
  const relations = await db.execute(sql`
    SELECT relation_type, to_entity_id
    FROM relations
    WHERE from_entity_id = ${entityId} OR to_entity_id = ${entityId}
  `) as any[];

  const totalSources = sources.length;
  const totalBlocks = blocks.length;
  const totalRelations = relations.length;

  // ── 1. Research Score (0.0–1.0) ──────────────────────────────────────────
  // Bewertet Breite und Tiefe der Forschungsbasis
  const humanStudies = sources.filter((s: any) =>
    ["rct", "human_observational", "case_series"].includes(s.study_type)
  ).length;
  const metaAnalyses = sources.filter((s: any) => s.study_type === "meta_analysis").length;
  const animalStudies = sources.filter((s: any) => s.study_type === "animal").length;
  const inVitro = sources.filter((s: any) => s.study_type === "in_vitro").length;

  const researchScore = Math.min(1.0,
    (humanStudies * 0.4) +
    (metaAnalyses * 0.3) +
    (animalStudies * 0.15) +
    (inVitro * 0.05) +
    (totalSources > 0 ? Math.min(0.1, totalSources * 0.01) : 0)
  );

  // ── 2. Evidence Score (0.0–1.0) ──────────────────────────────────────────
  // Höchstes Evidenzlevel der Quellen
  const evidenceWeights: Record<string, number> = {
    meta_analysis: 1.0,
    systematic_review: 0.9,
    rct: 0.8,
    human_observational: 0.6,
    case_series: 0.5,
    animal: 0.35,
    in_vitro: 0.2,
    expert_opinion: 0.1,
    review: 0.4,
  };
  const maxEvidence = sources.reduce((max: number, s: any) => {
    const w = evidenceWeights[s.study_type] ?? 0.1;
    return Math.max(max, w);
  }, 0);
  const avgQuality = totalSources > 0
    ? sources.reduce((sum: number, s: any) => sum + (s.quality_score ?? 3), 0) / totalSources / 5
    : 0;
  const evidenceScore = Math.min(1.0, maxEvidence * 0.7 + avgQuality * 0.3);

  // ── 3. Freshness Score (0.0–1.0) ─────────────────────────────────────────
  // Aktualität der Quellen (letzte 5 Jahre = 1.0, älter = linear fallend)
  const currentYear = new Date().getFullYear();
  const years = sources
    .map((s: any) => s.year)
    .filter((y: any) => y && y > 1990);
  const newestYear = years.length > 0 ? Math.max(...years) : null;
  const freshnessScore = newestYear
    ? Math.max(0, 1.0 - (currentYear - newestYear) / 10)
    : 0.1; // Kein Datum = sehr niedrig aber nicht 0

  // ── 4. Confidence Score (aus bestehender Berechnung) ─────────────────────
  // Bereits berechnet durch computeConfidenceScore()

  // ── 5. Completeness Score (0.0–1.0) ──────────────────────────────────────
  // Vollständigkeit der Content-Blocks
  const existingBlockTypes = new Set(blocks.map((b: any) => b.block_type));
  const missingBlockTypes = REQUIRED_BLOCK_TYPES.filter(t => !existingBlockTypes.has(t));
  const blockCompleteness = (REQUIRED_BLOCK_TYPES.length - missingBlockTypes.length) / REQUIRED_BLOCK_TYPES.length;

  // Bonus für Relations und Quellen
  const relationBonus = Math.min(0.2, totalRelations * 0.02);
  const sourceBonus = Math.min(0.1, totalSources * 0.02);
  const completenessScore = Math.min(1.0, blockCompleteness * 0.7 + relationBonus + sourceBonus);

  // ── 6. Knowledge Score (gewichtete Summe aller 5 Scores) ─────────────────
  const knowledgeScore = Math.min(1.0,
    researchScore    * 0.25 +
    evidenceScore    * 0.25 +
    freshnessScore   * 0.15 +
    confidenceScore  * 0.20 +
    completenessScore * 0.15
  );

  return {
    researchScore: Math.round(researchScore * 100) / 100,
    evidenceScore: Math.round(evidenceScore * 100) / 100,
    freshnessScore: Math.round(freshnessScore * 100) / 100,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    completenessScore: Math.round(completenessScore * 100) / 100,
    knowledgeScore: Math.round(knowledgeScore * 100) / 100,
    totalBlocks,
    totalSources,
    totalRelations,
    missingBlockTypes,
  };
}

// ─── Knowledge Propagation ────────────────────────────────────────────────────

/**
 * Löst automatische Propagation aus wenn sich Wissen ändert.
 * Cascade: Knowledge Graph → Academy → SEO → Shop → FAQ → Agenten
 */
async function triggerKnowledgePropagation(
  entityId: string,
  entityData: any,
  scores: any,
  trigger: string
): Promise<PropagationResult> {
  const triggeredSystems: string[] = [];
  let webhooksFired = 0;
  let contentUpdatesQueued = 0;

  try {
    // 1. Knowledge Graph — Relations-Cache invalidieren
    await db.execute(sql`
      UPDATE entities
      SET
        updated_at = NOW(),
        agent_confidence_score = ${scores.confidenceScore}
      WHERE id = ${entityId}
    `);
    triggeredSystems.push("knowledge_graph");

    // 2. Content-Update-Queue — alle betroffenen Output-Typen eintragen
    const outputTypes = [
      "academy", "seo", "shop", "faq", "agent_context",
      "newsletter", "social_tiktok", "social_instagram",
    ];

    for (const outputType of outputTypes) {
      await db.execute(sql`
        INSERT INTO knowledge_propagation_queue
          (id, entity_id, output_type, trigger_reason, scores_snapshot, status, created_at)
        VALUES
          (${uuidv4()}, ${entityId}, ${outputType}, ${trigger},
           ${JSON.stringify(scores)}::jsonb, 'pending', NOW())
        ON CONFLICT (entity_id, output_type)
        DO UPDATE SET
          trigger_reason = EXCLUDED.trigger_reason,
          scores_snapshot = EXCLUDED.scores_snapshot,
          status = 'pending',
          updated_at = NOW()
      `);
      contentUpdatesQueued++;
    }
    triggeredSystems.push("propagation_queue");

    // 3. Webhook feuern für externe Systeme (n8n, Shop, Academy)
    await fireWebhooks("entity.knowledge_evolved", {
      event: "entity.knowledge_evolved",
      entityId,
      entitySlug: entityData.slug,
      entityType: entityData.type,
      entityName: entityData.canonicalName,
      timestamp: new Date().toISOString(),
      data: {
        trigger,
        knowledgeScore: scores.knowledgeScore,
        confidenceScore: scores.confidenceScore,
        completenessScore: scores.completenessScore,
        missingBlockTypes: scores.missingBlockTypes,
        outputTypesQueued: outputTypes,
      },
    });
    webhooksFired++;
    triggeredSystems.push("webhooks");

    // 4. Agent-Cache invalidieren (Learning Runtime)
    await db.execute(sql`
      UPDATE long_term_memory
      SET updated_at = NOW()
      WHERE entity_slug = ${entityData.slug}
    `);
    triggeredSystems.push("agent_cache");

    console.log(`[knowledge-evolution] ✓ Propagation triggered for ${entityData.slug}: ${triggeredSystems.join(", ")}`);

    return {
      entityId,
      triggeredSystems,
      webhooksFired,
      contentUpdatesQueued,
      agentCacheInvalidated: true,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error(`[knowledge-evolution] Propagation error for ${entityId}:`, err?.message);
    return {
      entityId,
      triggeredSystems,
      webhooksFired,
      contentUpdatesQueued,
      agentCacheInvalidated: false,
      timestamp: new Date().toISOString(),
    };
  }
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

async function loadEntityData(entityId: string): Promise<any | null> {
  const result = await db.execute(sql`
    SELECT id, slug, type, canonical_name, lifecycle_status, agent_confidence_score
    FROM entities
    WHERE id = ${entityId}
    LIMIT 1
  `) as any[];
  if (!result || result.length === 0) return null;
  return {
    id: result[0].id,
    slug: result[0].slug,
    type: result[0].type,
    canonicalName: result[0].canonical_name,
    lifecycleStatus: result[0].lifecycle_status,
    agentConfidenceScore: result[0].agent_confidence_score,
  };
}

async function loadPreviousKnowledgeScore(entityId: string): Promise<number | null> {
  const result = await db.execute(sql`
    SELECT knowledge_score
    FROM knowledge_evolution_log
    WHERE entity_id = ${entityId}
    ORDER BY created_at DESC
    LIMIT 1
  `) as any[];
  if (!result || result.length === 0) return null;
  return result[0].knowledge_score ?? null;
}

async function saveKnowledgeScores(
  entityId: string,
  scores: any,
  trigger: string
): Promise<void> {
  // In knowledge_evolution_scores Tabelle speichern (Upsert)
  await db.execute(sql`
    INSERT INTO knowledge_evolution_scores
      (id, entity_id, research_score, evidence_score, freshness_score,
       confidence_score, completeness_score, knowledge_score,
       total_blocks, total_sources, total_relations,
       missing_block_types, computed_at, updated_at)
    VALUES
      (${uuidv4()}, ${entityId},
       ${scores.researchScore}, ${scores.evidenceScore}, ${scores.freshnessScore},
       ${scores.confidenceScore}, ${scores.completenessScore}, ${scores.knowledgeScore},
       ${scores.totalBlocks}, ${scores.totalSources}, ${scores.totalRelations},
       ${JSON.stringify(scores.missingBlockTypes)}::jsonb,
       NOW(), NOW())
    ON CONFLICT (entity_id)
    DO UPDATE SET
      research_score = EXCLUDED.research_score,
      evidence_score = EXCLUDED.evidence_score,
      freshness_score = EXCLUDED.freshness_score,
      confidence_score = EXCLUDED.confidence_score,
      completeness_score = EXCLUDED.completeness_score,
      knowledge_score = EXCLUDED.knowledge_score,
      total_blocks = EXCLUDED.total_blocks,
      total_sources = EXCLUDED.total_sources,
      total_relations = EXCLUDED.total_relations,
      missing_block_types = EXCLUDED.missing_block_types,
      computed_at = NOW(),
      updated_at = NOW()
  `);
}

async function logEvolutionEvent(
  entityId: string,
  trigger: string,
  scores: any,
  scoreDelta: number | null
): Promise<void> {
  await db.execute(sql`
    INSERT INTO knowledge_evolution_log
      (id, entity_id, trigger_type, knowledge_score, research_score,
       evidence_score, freshness_score, confidence_score, completeness_score,
       score_delta, created_at)
    VALUES
      (${uuidv4()}, ${entityId}, ${trigger},
       ${scores.knowledgeScore}, ${scores.researchScore},
       ${scores.evidenceScore}, ${scores.freshnessScore},
       ${scores.confidenceScore}, ${scores.completenessScore},
       ${scoreDelta}, NOW())
  `);
}

// ─── Batch-Evolution ──────────────────────────────────────────────────────────

/**
 * Alle published Entities neu bewerten (für Cron-Job / Scheduled Task).
 */
export async function evolveAllEntities(
  trigger: "scheduled" | "manual" = "scheduled"
): Promise<{ processed: number; errors: number; avgKnowledgeScore: number }> {
  const entities = await db.execute(sql`
    SELECT id FROM entities
    WHERE lifecycle_status = 'published'
    ORDER BY updated_at ASC
  `) as any[];

  let processed = 0;
  let errors = 0;
  let totalScore = 0;

  for (const entity of entities) {
    try {
      const result = await evolveEntityKnowledge(entity.id, trigger);
      totalScore += result.knowledgeScore;
      processed++;
    } catch {
      errors++;
    }
    // Kurze Pause um DB nicht zu überlasten
    await new Promise(r => setTimeout(r, 50));
  }

  return {
    processed,
    errors,
    avgKnowledgeScore: processed > 0 ? Math.round((totalScore / processed) * 100) / 100 : 0,
  };
}

// ─── Propagation Queue Processor ─────────────────────────────────────────────

/**
 * Verarbeitet die Knowledge Propagation Queue.
 * Generiert fehlende Content für alle Output-Typen.
 */
export async function processPropagationQueue(
  limit = 20
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    const pending = await db.execute(sql`
      SELECT q.id, q.entity_id, q.output_type, q.trigger_reason,
             e.slug, e.canonical_name, e.type
      FROM knowledge_propagation_queue q
      JOIN entities e ON e.id = q.entity_id
      WHERE q.status = 'pending'
      ORDER BY q.created_at ASC
      LIMIT ${limit}
    `) as any[];

    for (const item of pending) {
      try {
        // Status auf 'processing' setzen
        await db.execute(sql`
          UPDATE knowledge_propagation_queue
          SET status = 'processing', updated_at = NOW()
          WHERE id = ${item.id}
        `);

        // Output-spezifische Aktion
        await processOutputTypeUpdate(item);

        // Status auf 'done' setzen
        await db.execute(sql`
          UPDATE knowledge_propagation_queue
          SET status = 'done', processed_at = NOW(), updated_at = NOW()
          WHERE id = ${item.id}
        `);
        processed++;
      } catch (err: any) {
        await db.execute(sql`
          UPDATE knowledge_propagation_queue
          SET status = 'error', error_message = ${err?.message ?? 'unknown'}, updated_at = NOW()
          WHERE id = ${item.id}
        `);
        errors++;
      }
    }
  } catch (err: any) {
    console.error(`[knowledge-evolution] Queue processor error:`, err?.message);
  }

  return { processed, errors };
}

async function processOutputTypeUpdate(item: any): Promise<void> {
  // Für jeden Output-Typ: prüfen ob Content existiert, ggf. Flag setzen
  // Die eigentliche Generierung erfolgt durch die Content Factory (Phase 5)
  // Hier nur: Metadaten aktualisieren und Review-Queue-Eintrag erstellen

  await db.execute(sql`
    INSERT INTO content_generation_requests
      (id, entity_id, output_type, status, requested_at)
    VALUES
      (${uuidv4()}, ${item.entity_id}, ${item.output_type}, 'pending', NOW())
    ON CONFLICT (entity_id, output_type)
    DO UPDATE SET
      status = 'pending',
      requested_at = NOW()
  `);

  console.log(`[knowledge-evolution] Queued content generation: ${item.slug} → ${item.output_type}`);
}
