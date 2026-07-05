/**
 * knowledge-roadmap.service.ts
 *
 * Phase 5 — Knowledge Roadmap Engine
 *
 * Erkennt automatisch fehlende Inhalte und erstellt eine priorisierte Roadmap.
 * Kategorien: Themen, Studien, FAQs, Academy, SEO, Bundles, Stacks, Compounds
 *
 * ADDITIV — verändert keine bestehenden Funktionen.
 */

import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// ─── Typen ────────────────────────────────────────────────────────────────────

export type RoadmapCategory =
  | "missing_compound"     // Neues Compound fehlt komplett
  | "missing_study"        // Wichtige Studie nicht referenziert
  | "missing_faq"          // FAQ-Block fehlt für Entity
  | "missing_academy"      // Academy-Content fehlt
  | "missing_seo"          // SEO-Artefakte fehlen
  | "missing_stack"        // Sinnvoller Stack nicht angelegt
  | "missing_relation"     // Wichtige Relation fehlt
  | "missing_shop"         // Shop-Beschreibung fehlt
  | "low_evidence"         // Evidence-Score < 0.4
  | "outdated_content"     // Content > 1 Jahr alt
  | "missing_agent_context"; // Agent-Felder nicht gesetzt

export type RoadmapPriority = "critical" | "high" | "medium" | "low";

export interface RoadmapItem {
  id: string;
  category: RoadmapCategory;
  priority: RoadmapPriority;
  title: string;
  description: string;
  entityId?: string;
  entityName?: string;
  estimatedImpact: number; // 0–1 (Score-Gewinn wenn behoben)
  effort: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "done" | "dismissed";
  createdAt: string;
}

// ─── Hauptfunktion ────────────────────────────────────────────────────────────

/**
 * Analysiert das gesamte Knowledge OS und erstellt eine priorisierte Roadmap.
 * Wird täglich vom Orchestrator aufgerufen.
 */
export async function buildKnowledgeRoadmap(): Promise<{
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  items: RoadmapItem[];
}> {
  const items: RoadmapItem[] = [];

  // Alle Checks parallel ausführen
  const [
    missingFaqs,
    missingAcademy,
    missingSeo,
    missingShop,
    missingAgentContext,
    lowEvidenceEntities,
    missingStacks,
  ] = await Promise.all([
    checkMissingFaqs(),
    checkMissingAcademy(),
    checkMissingSeo(),
    checkMissingShop(),
    checkMissingAgentContext(),
    checkLowEvidenceEntities(),
    checkMissingStacks(),
  ]);

  items.push(...missingFaqs, ...missingAcademy, ...missingSeo, ...missingShop,
    ...missingAgentContext, ...lowEvidenceEntities, ...missingStacks);

  // In DB speichern (nur neue Items)
  await saveRoadmapItems(items);

  const counts = {
    total: items.length,
    critical: items.filter(i => i.priority === "critical").length,
    high: items.filter(i => i.priority === "high").length,
    medium: items.filter(i => i.priority === "medium").length,
    low: items.filter(i => i.priority === "low").length,
  };

  return { ...counts, items: items.slice(0, 50) }; // Max 50 zurückgeben
}

/**
 * Gibt die aktuelle Roadmap aus der DB zurück.
 */
export async function getRoadmap(
  category?: RoadmapCategory,
  priority?: RoadmapPriority,
  limit: number = 20
): Promise<RoadmapItem[]> {
  try {
    const rows = await db.execute(sql`
      SELECT * FROM knowledge_roadmap
      WHERE status = 'pending'
      ${category ? sql`AND category = ${category}` : sql``}
      ${priority ? sql`AND priority = ${priority}` : sql``}
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        estimated_impact DESC
      LIMIT ${limit}
    `) as any[];

    return (rows || []).map(mapRowToRoadmapItem);
  } catch {
    return [];
  }
}

/**
 * Markiert ein Roadmap-Item als erledigt.
 */
export async function markRoadmapItemDone(itemId: string): Promise<void> {
  await db.execute(sql`
    UPDATE knowledge_roadmap SET status = 'done', updated_at = NOW()
    WHERE id = ${itemId}
  `);
}

// ─── Check-Funktionen ─────────────────────────────────────────────────────────

async function checkMissingFaqs(): Promise<RoadmapItem[]> {
  try {
    const rows = await db.execute(sql`
      SELECT e.id, e.canonical_name
      FROM entities e
      WHERE e.status = 'published'
      AND e.type IN ('compound', 'peptide')
      AND NOT EXISTS (
        SELECT 1 FROM content_blocks cb
        WHERE cb.entity_id = e.id AND cb.block_type = 'faq'
      )
      LIMIT 20
    `) as any[];

    return (rows || []).map((row: any) => createRoadmapItem({
      category: "missing_faq",
      priority: "high",
      title: `FAQ fehlt: ${row.canonical_name}`,
      description: `Für ${row.canonical_name} ist kein FAQ-Block vorhanden. FAQs verbessern SEO und reduzieren Support-Anfragen.`,
      entityId: row.id,
      entityName: row.canonical_name,
      estimatedImpact: 0.15,
      effort: "low",
    }));
  } catch { return []; }
}

async function checkMissingAcademy(): Promise<RoadmapItem[]> {
  try {
    const rows = await db.execute(sql`
      SELECT e.id, e.canonical_name
      FROM entities e
      WHERE e.status = 'published'
      AND e.type IN ('compound', 'peptide')
      AND NOT EXISTS (
        SELECT 1 FROM content_blocks cb
        WHERE cb.entity_id = e.id
        AND cb.scope::text LIKE '%academy%'
      )
      LIMIT 20
    `) as any[];

    return (rows || []).map((row: any) => createRoadmapItem({
      category: "missing_academy",
      priority: "medium",
      title: `Academy-Content fehlt: ${row.canonical_name}`,
      description: `${row.canonical_name} hat keinen Academy-spezifischen Content. Wichtig für Premium-Mitglieder.`,
      entityId: row.id,
      entityName: row.canonical_name,
      estimatedImpact: 0.2,
      effort: "medium",
    }));
  } catch { return []; }
}

async function checkMissingSeo(): Promise<RoadmapItem[]> {
  try {
    const rows = await db.execute(sql`
      SELECT e.id, e.canonical_name
      FROM entities e
      WHERE e.status = 'published'
      AND e.type IN ('compound', 'peptide')
      AND NOT EXISTS (
        SELECT 1 FROM content_blocks cb
        WHERE cb.entity_id = e.id
        AND cb.block_type IN ('seo_title', 'seo_description')
      )
      LIMIT 20
    `) as any[];

    return (rows || []).map((row: any) => createRoadmapItem({
      category: "missing_seo",
      priority: "high",
      title: `SEO fehlt: ${row.canonical_name}`,
      description: `${row.canonical_name} hat keine SEO-Meta-Tags. Kritisch für organische Sichtbarkeit.`,
      entityId: row.id,
      entityName: row.canonical_name,
      estimatedImpact: 0.25,
      effort: "low",
    }));
  } catch { return []; }
}

async function checkMissingShop(): Promise<RoadmapItem[]> {
  try {
    const rows = await db.execute(sql`
      SELECT e.id, e.canonical_name
      FROM entities e
      WHERE e.status = 'published'
      AND e.type IN ('compound', 'peptide')
      AND NOT EXISTS (
        SELECT 1 FROM content_blocks cb
        WHERE cb.entity_id = e.id
        AND cb.scope::text LIKE '%shop%'
      )
      LIMIT 20
    `) as any[];

    return (rows || []).map((row: any) => createRoadmapItem({
      category: "missing_shop",
      priority: "critical",
      title: `Shop-Beschreibung fehlt: ${row.canonical_name}`,
      description: `${row.canonical_name} hat keine Shop-Beschreibung. Direkt umsatzrelevant.`,
      entityId: row.id,
      entityName: row.canonical_name,
      estimatedImpact: 0.4,
      effort: "low",
    }));
  } catch { return []; }
}

async function checkMissingAgentContext(): Promise<RoadmapItem[]> {
  try {
    const rows = await db.execute(sql`
      SELECT id, canonical_name
      FROM entities
      WHERE status = 'published'
      AND type IN ('compound', 'peptide')
      AND (
        agent_research_context IS NULL
        OR agent_research_context = ''
        OR agent_sales_context IS NULL
        OR agent_sales_context = ''
      )
      LIMIT 20
    `) as any[];

    return (rows || []).map((row: any) => createRoadmapItem({
      category: "missing_agent_context",
      priority: "high",
      title: `Agent-Kontext fehlt: ${row.canonical_name}`,
      description: `${row.canonical_name} hat keinen Agent-Kontext. Alle Agenten antworten dann ohne spezifisches Wissen.`,
      entityId: row.id,
      entityName: row.canonical_name,
      estimatedImpact: 0.3,
      effort: "low",
    }));
  } catch { return []; }
}

async function checkLowEvidenceEntities(): Promise<RoadmapItem[]> {
  try {
    const rows = await db.execute(sql`
      SELECT e.id, e.canonical_name, cs.overall_score
      FROM entities e
      JOIN confidence_scores cs ON cs.target_id = e.id
      WHERE e.status = 'published'
      AND cs.overall_score < 0.4
      ORDER BY cs.overall_score ASC
      LIMIT 15
    `) as any[];

    return (rows || []).map((row: any) => createRoadmapItem({
      category: "low_evidence",
      priority: "medium",
      title: `Schwacher Evidence-Score: ${row.canonical_name} (${Math.round(parseFloat(row.overall_score) * 100)}%)`,
      description: `${row.canonical_name} hat einen Evidence-Score von nur ${Math.round(parseFloat(row.overall_score) * 100)}%. Mehr Studien und Quellen hinzufügen.`,
      entityId: row.id,
      entityName: row.canonical_name,
      estimatedImpact: 0.2,
      effort: "high",
    }));
  } catch { return []; }
}

async function checkMissingStacks(): Promise<RoadmapItem[]> {
  // Bekannte sinnvolle Stacks die noch nicht existieren
  const expectedStacks = [
    { name: "Cognitive Performance Stack", compounds: ["selank", "semax", "bpc-157"], priority: "high" as RoadmapPriority },
    { name: "Longevity Stack", compounds: ["mots-c", "epithalon", "ss-31"], priority: "high" as RoadmapPriority },
    { name: "GH Optimization Stack", compounds: ["cjc-1295", "ipamorelin"], priority: "medium" as RoadmapPriority },
    { name: "Metabolic Stack", compounds: ["retatrutide", "mots-c"], priority: "medium" as RoadmapPriority },
    { name: "Skin & Collagen Stack", compounds: ["ghk-cu", "bpc-157", "tb-500"], priority: "medium" as RoadmapPriority },
  ];

  const items: RoadmapItem[] = [];

  for (const stack of expectedStacks) {
    try {
      const existing = await db.execute(sql`
        SELECT id FROM stacks WHERE LOWER(name) LIKE ${'%' + stack.name.toLowerCase().substring(0, 10) + '%'}
        LIMIT 1
      `) as any[];

      if (!existing || existing.length === 0) {
        items.push(createRoadmapItem({
          category: "missing_stack",
          priority: stack.priority,
          title: `Stack fehlt: ${stack.name}`,
          description: `Der ${stack.name} (${stack.compounds.join(" + ")}) ist noch nicht angelegt. Wichtig für Cross-Selling und Academy.`,
          estimatedImpact: 0.15,
          effort: "low",
        }));
      }
    } catch { /* ignore */ }
  }

  return items;
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

function createRoadmapItem(params: {
  category: RoadmapCategory;
  priority: RoadmapPriority;
  title: string;
  description: string;
  entityId?: string;
  entityName?: string;
  estimatedImpact: number;
  effort: "low" | "medium" | "high";
}): RoadmapItem {
  return {
    id: uuidv4(),
    ...params,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

async function saveRoadmapItems(items: RoadmapItem[]): Promise<void> {
  for (const item of items) {
    try {
      // Nur speichern wenn noch nicht vorhanden (Idempotenz via title)
      const existing = await db.execute(sql`
        SELECT id FROM knowledge_roadmap WHERE title = ${item.title} AND status = 'pending'
        LIMIT 1
      `) as any[];

      if (existing && existing.length > 0) continue;

      await db.execute(sql`
        INSERT INTO knowledge_roadmap (
          id, category, priority, title, description,
          entity_id, entity_name, estimated_impact, effort,
          status, created_at, updated_at
        ) VALUES (
          ${item.id}, ${item.category}, ${item.priority},
          ${item.title}, ${item.description},
          ${item.entityId ?? null}, ${item.entityName ?? null},
          ${item.estimatedImpact}, ${item.effort},
          'pending', NOW(), NOW()
        )
      `);
    } catch { /* ignore duplicates */ }
  }
}

function mapRowToRoadmapItem(row: any): RoadmapItem {
  return {
    id: row.id,
    category: row.category as RoadmapCategory,
    priority: row.priority as RoadmapPriority,
    title: row.title,
    description: row.description,
    entityId: row.entity_id,
    entityName: row.entity_name,
    estimatedImpact: parseFloat(row.estimated_impact || "0"),
    effort: row.effort as "low" | "medium" | "high",
    status: row.status as RoadmapItem["status"],
    createdAt: row.created_at,
  };
}
