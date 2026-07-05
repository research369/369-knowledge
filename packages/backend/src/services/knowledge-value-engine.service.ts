/**
 * knowledge-value-engine.service.ts
 *
 * Pre-Freeze Erweiterung 1 — Business Intelligence Layer
 *
 * Bewertet jede Entity nicht nur wissenschaftlich, sondern auch nach
 * ihrem tatsächlichen Unternehmenswert. Die 10 Business-Scores fließen
 * NICHT in den wissenschaftlichen Score ein — sie bilden einen zweiten Layer.
 *
 * Scientific Intelligence (bestehend):
 *   evidenceLevel, sourceCount, humanStudy, metaAnalysis, recency, ...
 *
 * Business Intelligence (neu):
 *   1.  clinicalRelevance    — Wie relevant für aktuelle Forschungsthemen?
 *   2.  commercialValue      — Wie hoch ist das kommerzielle Potenzial?
 *   3.  seoOpportunity       — Wie hoch ist das SEO-Potenzial?
 *   4.  academyCoverage      — Wie vollständig ist der Academy-Content?
 *   5.  agentUsage           — Wie oft wird die Entity von Agenten abgefragt?
 *   6.  graphConnectivity    — Wie gut ist die Entity im Knowledge Graph vernetzt?
 *   7.  citationDensity      — Wie viele Quellen pro Block?
 *   8.  contentCompleteness  — Wie vollständig sind alle 16 Output-Typen?
 *   9.  bundlePotential      — Wie gut eignet sich die Entity für Bundles/Stacks?
 *   10. updatePriority       — Wie dringend ist eine Aktualisierung?
 *
 * ADDITIV — verändert keine bestehenden Funktionen.
 */

import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

// ─── Typen ────────────────────────────────────────────────────────────────────

export interface BusinessScores {
  clinicalRelevance: number;    // 0–1
  commercialValue: number;      // 0–1
  seoOpportunity: number;       // 0–1
  academyCoverage: number;      // 0–1
  agentUsage: number;           // 0–1
  graphConnectivity: number;    // 0–1
  citationDensity: number;      // 0–1
  contentCompleteness: number;  // 0–1
  bundlePotential: number;      // 0–1
  updatePriority: number;       // 0–1
  businessScore: number;        // gewichteter Gesamtscore 0–1
  computedAt: string;
}

export interface ScoreLayer {
  entityId: string;
  entitySlug: string;
  scientific: {
    overallScore: number;
    evidenceLevel: number;
    sourceCount: number;
    recency: number;
    completeness: number;
  };
  business: BusinessScores;
  combinedInsight: string;
}

// ─── Gewichtungen ─────────────────────────────────────────────────────────────

const BUSINESS_WEIGHTS = {
  clinicalRelevance:   0.15,
  commercialValue:     0.15,
  seoOpportunity:      0.10,
  academyCoverage:     0.10,
  agentUsage:          0.10,
  graphConnectivity:   0.10,
  citationDensity:     0.08,
  contentCompleteness: 0.10,
  bundlePotential:     0.07,
  updatePriority:      0.05,
};

// ─── Hauptfunktion ────────────────────────────────────────────────────────────

export async function computeBusinessScores(entityId: string): Promise<BusinessScores> {
  // 1. Entity-Basisdaten laden
  const entityRows = await db.execute(
    sql`SELECT id, slug, type, lifecycle_status, agent_research_context
        FROM entities WHERE id = ${entityId} LIMIT 1`
  ) as any[];
  const entity = entityRows[0];
  if (!entity) throw new Error(`Entity not found: ${entityId}`);

  // 2. Blocks zählen (nach Typ)
  const blockRows = await db.execute(
    sql`SELECT block_type, COUNT(*) as cnt FROM content_blocks WHERE entity_id = ${entityId} GROUP BY block_type`
  ) as any[];
  const blockMap: Record<string, number> = {};
  for (const r of blockRows) blockMap[r.block_type] = parseInt(r.cnt);
  const totalBlocks = Object.values(blockMap).reduce((a, b) => a + b, 0);

  // 3. Quellen zählen
  const sourceRows = await db.execute(
    sql`SELECT COUNT(*) as cnt FROM sources WHERE linked_entity_ids::text LIKE ${'%' + entityId + '%'}`
  ) as any[];
  const sourceCount = parseInt((sourceRows[0] as any)?.cnt || '0');

  // 4. Relations zählen
  const relationRows = await db.execute(
    sql`SELECT COUNT(*) as cnt FROM relations WHERE from_entity_id = ${entityId} OR to_entity_id = ${entityId}`
  ) as any[];
  const relationCount = parseInt((relationRows[0] as any)?.cnt || '0');

  // 5. Agent-Nutzung (letzten 30 Tage)
  const agentRows = await db.execute(
    sql`SELECT COUNT(*) as cnt FROM agent_access_log WHERE entity_id = ${entityId} AND created_at > NOW() - INTERVAL '30 days'`
  ) as any[];
  const agentCalls = parseInt((agentRows[0] as any)?.cnt || '0');

  // 6. Stack/Bundle-Zugehörigkeit
  const stackRows = await db.execute(
    sql`SELECT COUNT(*) as cnt FROM relations WHERE (from_entity_id = ${entityId} OR to_entity_id = ${entityId}) AND relation_type IN ('belongs_to_stack', 'synergizes_with', 'part_of_bundle')`
  ) as any[];
  const stackCount = parseInt((stackRows[0] as any)?.cnt || '0');

  // 7. Generierte Content-Typen (aus content_versions — neue Pre-Freeze Tabelle)
  const genRows = await db.execute(
    sql`SELECT COUNT(DISTINCT output_type) as cnt FROM content_versions WHERE entity_id = ${entityId} AND status = 'generated'`
  ) as any[];
  const generatedTypes = parseInt((genRows[0] as any)?.cnt || '0');

  // 8. Freshness (neueste Quelle)
  const freshRows = await db.execute(
    sql`SELECT MAX(year) as max_year FROM sources WHERE linked_entity_ids::text LIKE ${'%' + entityId + '%'}`
  ) as any[];
  const maxYear = parseInt((freshRows[0] as any)?.max_year || '2015');
  const currentYear = new Date().getFullYear();
  const freshness = Math.max(0, Math.min(1, (maxYear - 2015) / (currentYear - 2015)));

  // ─── Score-Berechnung ──────────────────────────────────────────────────────

  // Clinical Relevance: Quellen + Agent-Kontext vorhanden
  const clinicalRelevance = Math.min(1, (sourceCount / 5) * 0.6 + (entity.agent_research_context ? 0.4 : 0));

  // Commercial Value: Blocks vorhanden + Relations (shop_visible/academy_visible nicht in DB)
  const commercialValue = Math.min(1,
    Math.min(0.5, totalBlocks / 10 * 0.5) +
    Math.min(0.3, relationCount / 15 * 0.3) +
    (entity.agent_research_context ? 0.2 : 0)
  );

  // SEO Opportunity: SEO-Block vorhanden + Relations
  const hasSeoBlock = (blockMap['seo_page'] || blockMap['seo'] || 0) > 0;
  const seoOpportunity = Math.min(1, (hasSeoBlock ? 0.5 : 0.1) + Math.min(0.5, relationCount / 20 * 0.5));

  // Academy Coverage: Academy-Blocks vorhanden
  const academyBlocks = (blockMap['academy_module'] || 0) + (blockMap['academy'] || 0);
  const academyCoverage = Math.min(1, academyBlocks / 3);

  // Agent Usage: Nutzungsfrequenz
  const agentUsage = Math.min(1, agentCalls / 100);

  // Graph Connectivity: Relations-Dichte
  const graphConnectivity = Math.min(1, relationCount / 25);

  // Citation Density: Quellen pro Block
  const citationDensity = totalBlocks > 0 ? Math.min(1, sourceCount / totalBlocks) : 0;

  // Content Completeness: generierte Output-Typen (von 16)
  const contentCompleteness = Math.min(1, generatedTypes / 16);

  // Bundle Potential: Stack-Zugehörigkeit
  const bundlePotential = Math.min(1, stackCount / 5);

  // Update Priority: Freshness-Inverse (alte Quellen = hohe Priorität)
  const updatePriority = 1 - freshness;

  // Gewichteter Business Score
  const businessScore =
    clinicalRelevance   * BUSINESS_WEIGHTS.clinicalRelevance +
    commercialValue     * BUSINESS_WEIGHTS.commercialValue +
    seoOpportunity      * BUSINESS_WEIGHTS.seoOpportunity +
    academyCoverage     * BUSINESS_WEIGHTS.academyCoverage +
    agentUsage          * BUSINESS_WEIGHTS.agentUsage +
    graphConnectivity   * BUSINESS_WEIGHTS.graphConnectivity +
    citationDensity     * BUSINESS_WEIGHTS.citationDensity +
    contentCompleteness * BUSINESS_WEIGHTS.contentCompleteness +
    bundlePotential     * BUSINESS_WEIGHTS.bundlePotential +
    updatePriority      * BUSINESS_WEIGHTS.updatePriority;

  return {
    clinicalRelevance,
    commercialValue,
    seoOpportunity,
    academyCoverage,
    agentUsage,
    graphConnectivity,
    citationDensity,
    contentCompleteness,
    bundlePotential,
    updatePriority,
    businessScore: Math.round(businessScore * 1000) / 1000,
    computedAt: new Date().toISOString(),
  };
}

// ─── Score Layer: Scientific + Business kombiniert ────────────────────────────

export async function getScoreLayer(entityId: string): Promise<ScoreLayer> {
  // Scientific Score aus confidenceScores
  const sciRows = await db.execute(
    sql`SELECT overall_score, evidence_level, source_count, recency, completeness
        FROM confidence_scores WHERE target_id = ${entityId} ORDER BY computed_at DESC LIMIT 1`
  ) as any[];
  const sci = sciRows[0] || {};

  // Business Score berechnen
  const business = await computeBusinessScores(entityId);

  // Entity-Slug laden
  const entityRows = await db.execute(
    sql`SELECT slug FROM entities WHERE id = ${entityId} LIMIT 1`
  ) as any[];
  const slug = (entityRows[0] as any)?.slug || entityId;

  // Combined Insight
  const sciScore = parseFloat(sci.overall_score || '0');
  const bizScore = business.businessScore;
  let combinedInsight = '';
  if (sciScore > 0.7 && bizScore > 0.7) {
    combinedInsight = 'Goldstandard: Hohe wissenschaftliche Qualität UND hoher Unternehmenswert.';
  } else if (sciScore > 0.7 && bizScore < 0.4) {
    combinedInsight = 'Wissenschaftlich stark, aber kommerziell unterentwickelt. Content-Factory priorisieren.';
  } else if (sciScore < 0.4 && bizScore > 0.7) {
    combinedInsight = 'Kommerziell wertvoll, aber wissenschaftlich schwach. Mehr Quellen und Studien nötig.';
  } else if (sciScore < 0.4 && bizScore < 0.4) {
    combinedInsight = 'Niedrige Priorität. Grundlegende Befüllung nötig.';
  } else {
    combinedInsight = 'Mittleres Niveau. Gezielte Verbesserungen in Schwachbereichen empfohlen.';
  }

  return {
    entityId,
    entitySlug: slug,
    scientific: {
      overallScore: sciScore,
      evidenceLevel: parseFloat(sci.evidence_level || '0'),
      sourceCount: parseFloat(sci.source_count || '0'),
      recency: parseFloat(sci.recency || '0'),
      completeness: parseFloat(sci.completeness || '0'),
    },
    business,
    combinedInsight,
  };
}

// ─── Batch: alle Entities ─────────────────────────────────────────────────────

export async function computeAllBusinessScores(): Promise<{
  processed: number;
  errors: number;
  topByBusiness: Array<{ entityId: string; slug: string; businessScore: number }>;
}> {
  const entityRows = await db.execute(
    sql`SELECT id, slug FROM entities WHERE lifecycle_status = 'published' ORDER BY slug`
  ) as any[];

  let processed = 0;
  let errors = 0;
  const results: Array<{ entityId: string; slug: string; businessScore: number }> = [];

  for (const entity of entityRows) {
    try {
      const scores = await computeBusinessScores(entity.id);
      results.push({ entityId: entity.id, slug: entity.slug, businessScore: scores.businessScore });
      processed++;
    } catch {
      errors++;
    }
  }

  results.sort((a, b) => b.businessScore - a.businessScore);

  return {
    processed,
    errors,
    topByBusiness: results.slice(0, 10),
  };
}

// ─── Pre-Freeze Ergänzungen: Letzte Scores abrufen ───────────────────────────

/**
 * Letzte Business Scores für eine Entity aus der DB laden.
 * Gibt null zurück wenn noch keine Scores berechnet wurden.
 */
export async function getLatestBusinessScores(entityId: string): Promise<(BusinessScores & { entityId: string; entitySlug: string }) | null> {
  const rows = await db.execute(
    sql`SELECT * FROM business_scores
        WHERE entity_id = ${entityId}
        ORDER BY computed_at DESC LIMIT 1`
  ) as any[];
  const row = rows[0] as any;
  if (!row) return null;

  return {
    entityId: row.entity_id,
    entitySlug: row.entity_slug,
    clinicalRelevance: parseFloat(row.clinical_relevance),
    commercialValue: parseFloat(row.commercial_value),
    seoOpportunity: parseFloat(row.seo_opportunity),
    academyCoverage: parseFloat(row.academy_coverage),
    agentUsage: parseFloat(row.agent_usage),
    graphConnectivity: parseFloat(row.graph_connectivity),
    citationDensity: parseFloat(row.citation_density),
    contentCompleteness: parseFloat(row.content_completeness),
    bundlePotential: parseFloat(row.bundle_potential),
    updatePriority: parseFloat(row.update_priority),
    businessScore: parseFloat(row.business_score),
    computedAt: row.computed_at,
  };
}

/**
 * Top-Entities nach Business Score aus der DB laden.
 */
export async function getTopEntitiesByBusinessScore(limit: number = 10): Promise<Array<{
  entityId: string;
  entitySlug: string;
  businessScore: number;
  computedAt: string;
}>> {
  const rows = await db.execute(
    sql`SELECT DISTINCT ON (entity_id) entity_id, entity_slug, business_score, computed_at
        FROM business_scores
        ORDER BY entity_id, computed_at DESC`
  ) as any[];

  return (rows as any[])
    .sort((a: any, b: any) => parseFloat(b.business_score) - parseFloat(a.business_score))
    .slice(0, limit)
    .map((row: any) => ({
      entityId: row.entity_id,
      entitySlug: row.entity_slug,
      businessScore: parseFloat(row.business_score),
      computedAt: row.computed_at,
    }));
}
