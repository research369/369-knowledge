/**
 * global-knowledge-index.service.ts
 *
 * Phase 5 — Global Knowledge Index
 *
 * Berechnet 16 Unternehmenskennzahlen für das gesamte 369 Knowledge OS.
 * Nicht für einzelne Entities — für das gesamte Unternehmen.
 *
 * ADDITIV — verändert keine bestehenden Funktionen.
 */

import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

// ─── Typen ────────────────────────────────────────────────────────────────────

export interface GlobalKnowledgeIndex {
  // Wissensabdeckung
  knowledgeCoverage: number;      // % Entities mit vollständigen Blocks
  researchCoverage: number;       // % Entities mit 3+ Quellen
  seoCoverage: number;            // % Entities mit SEO-Artefakten
  academyCoverage: number;        // % Entities mit Academy-Blocks
  productCoverage: number;        // % Compounds mit Shop-Beschreibung

  // Agent-Qualität
  agentQuality: number;           // Durchschnittlicher Few-Shot-Score
  supportQuality: number;         // % Support-Anfragen korrekt beantwortet
  salesQuality: number;           // Durchschnittlicher Sales-Pattern-Score

  // Content
  contentCoverage: number;        // % Entities mit generiertem Content
  graphCompleteness: number;      // Relations / (Entities * erwartete Relations)

  // Evidenz & Lernen
  evidenceQuality: number;        // Durchschnittlicher Evidence-Score
  learningVelocity: number;       // Neue Few-Shots pro Woche
  automationRate: number;         // % automatisch generierter Content

  // Lücken & Wachstum
  missingKnowledge: number;       // Anzahl erkannter Wissenslücken
  openReviews: number;            // Anzahl offener Reviews
  growthTrend: number;            // Wachstum der Entities in den letzten 30 Tagen (%)

  // Meta
  calculatedAt: string;
  version: string;
}

// ─── Hauptfunktion ────────────────────────────────────────────────────────────

export async function calculateGlobalKnowledgeIndex(): Promise<GlobalKnowledgeIndex> {
  const [
    knowledgeCoverage,
    researchCoverage,
    seoCoverage,
    academyCoverage,
    productCoverage,
    agentQuality,
    contentCoverage,
    graphCompleteness,
    evidenceQuality,
    learningVelocity,
    automationRate,
    missingKnowledge,
    openReviews,
    growthTrend,
  ] = await Promise.all([
    calcKnowledgeCoverage(),
    calcResearchCoverage(),
    calcSeoCoverage(),
    calcAcademyCoverage(),
    calcProductCoverage(),
    calcAgentQuality(),
    calcContentCoverage(),
    calcGraphCompleteness(),
    calcEvidenceQuality(),
    calcLearningVelocity(),
    calcAutomationRate(),
    calcMissingKnowledge(),
    calcOpenReviews(),
    calcGrowthTrend(),
  ]);

  const index: GlobalKnowledgeIndex = {
    knowledgeCoverage,
    researchCoverage,
    seoCoverage,
    academyCoverage,
    productCoverage,
    agentQuality,
    supportQuality: agentQuality, // Proxy bis echte Support-Daten vorliegen
    salesQuality: agentQuality,   // Proxy bis echte Sales-Daten vorliegen
    contentCoverage,
    graphCompleteness,
    evidenceQuality,
    learningVelocity,
    automationRate,
    missingKnowledge,
    openReviews,
    growthTrend,
    calculatedAt: new Date().toISOString(),
    version: "5.0.0",
  };

  // Snapshot speichern
  await saveIndexSnapshot(index);

  return index;
}

/**
 * Lädt den letzten gespeicherten Index (ohne Neuberechnung).
 */
export async function getLatestGlobalIndex(): Promise<GlobalKnowledgeIndex | null> {
  try {
    const rows = await db.execute(sql`
      SELECT index_data FROM global_knowledge_index_snapshots
      ORDER BY created_at DESC
      LIMIT 1
    `) as any[];

    if (!rows || rows.length === 0) return null;
    const data = rows[0].index_data;
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return null;
  }
}

// ─── Berechnungsfunktionen ────────────────────────────────────────────────────

async function calcKnowledgeCoverage(): Promise<number> {
  try {
    const total = await db.execute(sql`SELECT COUNT(*) as cnt FROM entities WHERE status = 'published'`) as any[];
    const withBlocks = await db.execute(sql`
      SELECT COUNT(DISTINCT entity_id) as cnt FROM content_blocks
    `) as any[];
    const t = parseInt(total?.[0]?.cnt || "1");
    const w = parseInt(withBlocks?.[0]?.cnt || "0");
    return Math.round((w / t) * 100);
  } catch { return 0; }
}

async function calcResearchCoverage(): Promise<number> {
  try {
    const total = await db.execute(sql`SELECT COUNT(*) as cnt FROM entities WHERE status = 'published'`) as any[];
    // Quellen mit linkedEntityIds
    const withSources = await db.execute(sql`
      SELECT COUNT(DISTINCT e.id) as cnt
      FROM entities e
      WHERE e.status = 'published'
      AND (
        SELECT COUNT(*) FROM sources s
        WHERE s.linked_entity_ids::text LIKE '%' || e.id || '%'
      ) >= 3
    `) as any[];
    const t = parseInt(total?.[0]?.cnt || "1");
    const w = parseInt(withSources?.[0]?.cnt || "0");
    return Math.round((w / t) * 100);
  } catch { return 0; }
}

async function calcSeoCoverage(): Promise<number> {
  try {
    const total = await db.execute(sql`SELECT COUNT(*) as cnt FROM entities WHERE status = 'published'`) as any[];
    const withSeo = await db.execute(sql`
      SELECT COUNT(DISTINCT entity_id) as cnt FROM content_blocks
      WHERE block_type IN ('seo_title', 'seo_description', 'seo_keywords')
    `) as any[];
    const t = parseInt(total?.[0]?.cnt || "1");
    const w = parseInt(withSeo?.[0]?.cnt || "0");
    return Math.round((w / t) * 100);
  } catch { return 0; }
}

async function calcAcademyCoverage(): Promise<number> {
  try {
    const total = await db.execute(sql`SELECT COUNT(*) as cnt FROM entities WHERE status = 'published'`) as any[];
    const withAcademy = await db.execute(sql`
      SELECT COUNT(DISTINCT entity_id) as cnt FROM content_blocks
      WHERE scope::text LIKE '%academy%'
    `) as any[];
    const t = parseInt(total?.[0]?.cnt || "1");
    const w = parseInt(withAcademy?.[0]?.cnt || "0");
    return Math.round((w / t) * 100);
  } catch { return 0; }
}

async function calcProductCoverage(): Promise<number> {
  try {
    const total = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM entities WHERE type IN ('compound', 'peptide') AND status = 'published'
    `) as any[];
    const withShop = await db.execute(sql`
      SELECT COUNT(DISTINCT entity_id) as cnt FROM content_blocks
      WHERE scope::text LIKE '%shop%'
    `) as any[];
    const t = parseInt(total?.[0]?.cnt || "1");
    const w = parseInt(withShop?.[0]?.cnt || "0");
    return Math.round((w / t) * 100);
  } catch { return 0; }
}

async function calcAgentQuality(): Promise<number> {
  try {
    const rows = await db.execute(sql`
      SELECT AVG(quality_score) as avg_score FROM learned_few_shots
      WHERE is_approved = true
    `) as any[];
    const avg = parseFloat(rows?.[0]?.avg_score || "0");
    return Math.round(avg * 100);
  } catch { return 0; }
}

async function calcContentCoverage(): Promise<number> {
  try {
    const total = await db.execute(sql`SELECT COUNT(*) as cnt FROM entities WHERE status = 'published'`) as any[];
    const withContent = await db.execute(sql`
      SELECT COUNT(DISTINCT entity_id) as cnt FROM generated_content_store
      WHERE status = 'generated'
    `) as any[];
    const t = parseInt(total?.[0]?.cnt || "1");
    const w = parseInt(withContent?.[0]?.cnt || "0");
    return Math.round((w / t) * 100);
  } catch { return 0; }
}

async function calcGraphCompleteness(): Promise<number> {
  try {
    const entities = await db.execute(sql`SELECT COUNT(*) as cnt FROM entities WHERE status = 'published'`) as any[];
    const relations = await db.execute(sql`SELECT COUNT(*) as cnt FROM relations`) as any[];
    const e = parseInt(entities?.[0]?.cnt || "1");
    const r = parseInt(relations?.[0]?.cnt || "0");
    // Erwartete Relations: ~5 pro Entity
    const expected = e * 5;
    return Math.min(100, Math.round((r / expected) * 100));
  } catch { return 0; }
}

async function calcEvidenceQuality(): Promise<number> {
  try {
    const rows = await db.execute(sql`
      SELECT AVG(overall_score) as avg_score FROM confidence_scores
    `) as any[];
    const avg = parseFloat(rows?.[0]?.avg_score || "0");
    return Math.round(avg * 100);
  } catch { return 0; }
}

async function calcLearningVelocity(): Promise<number> {
  try {
    const rows = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM learned_few_shots
      WHERE created_at > NOW() - INTERVAL '7 days'
    `) as any[];
    return parseInt(rows?.[0]?.cnt || "0");
  } catch { return 0; }
}

async function calcAutomationRate(): Promise<number> {
  try {
    const total = await db.execute(sql`SELECT COUNT(*) as cnt FROM content_blocks`) as any[];
    const automated = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM generated_content_store
      WHERE status = 'generated'
    `) as any[];
    const t = parseInt(total?.[0]?.cnt || "1");
    const a = parseInt(automated?.[0]?.cnt || "0");
    return Math.min(100, Math.round((a / t) * 100));
  } catch { return 0; }
}

async function calcMissingKnowledge(): Promise<number> {
  try {
    const rows = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM knowledge_roadmap
      WHERE status = 'pending'
    `) as any[];
    return parseInt(rows?.[0]?.cnt || "0");
  } catch { return 0; }
}

async function calcOpenReviews(): Promise<number> {
  try {
    const rows = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM review_queue
      WHERE status = 'pending'
    `) as any[];
    return parseInt(rows?.[0]?.cnt || "0");
  } catch { return 0; }
}

async function calcGrowthTrend(): Promise<number> {
  try {
    const now = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM entities
      WHERE status = 'published'
    `) as any[];
    const monthAgo = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM entities
      WHERE status = 'published'
      AND created_at < NOW() - INTERVAL '30 days'
    `) as any[];
    const current = parseInt(now?.[0]?.cnt || "0");
    const previous = parseInt(monthAgo?.[0]?.cnt || "1");
    if (previous === 0) return 100;
    return Math.round(((current - previous) / previous) * 100);
  } catch { return 0; }
}

async function saveIndexSnapshot(index: GlobalKnowledgeIndex): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO global_knowledge_index_snapshots (id, index_data, created_at)
      VALUES (gen_random_uuid(), ${JSON.stringify(index)}::jsonb, NOW())
    `);
  } catch {
    // Tabelle existiert noch nicht — Migration läuft beim nächsten Start
  }
}
