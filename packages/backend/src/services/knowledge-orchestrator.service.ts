/**
 * knowledge-orchestrator.service.ts
 *
 * Phase 4 — Knowledge Orchestration
 *
 * Der Knowledge Orchestrator ist das zentrale Gehirn des 369 Knowledge OS.
 * Er erzeugt KEINE Inhalte — er entscheidet ausschließlich:
 *   WAS  — welche Downstream-Systeme betroffen sind
 *   WANN — sofort (Critical) oder verzögert (Low)
 *   WARUM — welche Änderung hat die Kaskade ausgelöst
 *   WIE WICHTIG — Priority: Critical / High / Medium / Low
 *
 * Trigger-Quellen:
 *   - Neue Quelle für eine Entity
 *   - Neuer/aktualisierter Content Block
 *   - Neue Relation
 *   - Score-Änderung (Knowledge Score Delta > Schwellwert)
 *   - Neue Entity published
 *   - Stack-Änderung
 *   - Manueller Admin-Trigger
 *
 * ADDITIV — verändert keine bestehenden Funktionen.
 */
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// ─── Typen ────────────────────────────────────────────────────────────────────

export type OrchestratorPriority = "critical" | "high" | "medium" | "low";
export type OrchestratorTrigger =
  | "new_source"
  | "new_block"
  | "updated_block"
  | "new_relation"
  | "score_change"
  | "entity_published"
  | "entity_updated"
  | "stack_changed"
  | "manual";

export type DownstreamSystem =
  | "shop_description"
  | "academy_module"
  | "seo_page"
  | "faq_block"
  | "agent_context"
  | "stack_recommendation"
  | "comparison_page"
  | "newsletter_content"
  | "tiktok_script"
  | "instagram_caption"
  | "support_faq"
  | "bundle_suggestion"
  | "research_summary"
  | "glossary_entry";

export interface OrchestratorDecision {
  id: string;
  entityId: string;
  entitySlug: string;
  entityName: string;
  trigger: OrchestratorTrigger;
  triggerDetail: string;
  // Impact Analysis
  affectedSystems: DownstreamSystem[];
  affectedEntities: string[]; // IDs von direkt betroffenen verwandten Entities
  affectedStacks: string[];
  // Prioritätsliste
  tasks: OrchestratorTask[];
  // Metriken
  totalImpactScore: number; // 0.0–1.0
  estimatedContentChanges: number;
  estimatedAgentsAffected: number;
  estimatedSeoPages: number;
  estimatedAcademyModules: number;
  // Zeitsteuerung
  immediateActions: OrchestratorTask[]; // Critical + High
  deferredActions: OrchestratorTask[]; // Medium + Low
  createdAt: string;
}

export interface OrchestratorTask {
  id: string;
  decisionId: string;
  entityId: string;
  system: DownstreamSystem;
  priority: OrchestratorPriority;
  reason: string;
  estimatedImpact: number; // 0.0–1.0
  status: "pending" | "processing" | "completed" | "skipped";
  scheduledFor: string; // ISO timestamp
  completedAt?: string;
}

export interface ImpactAnalysis {
  entityId: string;
  trigger: OrchestratorTrigger;
  // Betroffene Systeme mit Begründung
  systemImpacts: {
    system: DownstreamSystem;
    priority: OrchestratorPriority;
    reason: string;
    estimatedImpact: number;
  }[];
  // Betroffene Entities (über Relations)
  relatedEntities: { id: string; slug: string; name: string; relationType: string }[];
  // Betroffene Stacks
  relatedStacks: { id: string; name: string }[];
  // Gesamtbewertung
  totalImpactScore: number;
  shouldPropagateImmediately: boolean;
}

// ─── Prioritätsregeln ─────────────────────────────────────────────────────────

/**
 * Entscheidet welche Systeme bei welchem Trigger mit welcher Priorität betroffen sind.
 * Kernlogik des Orchestrators.
 */
function calculateSystemImpacts(
  trigger: OrchestratorTrigger,
  entityType: string,
  scoreDelta: number | null,
  blockType?: string
): { system: DownstreamSystem; priority: OrchestratorPriority; reason: string; estimatedImpact: number }[] {
  const impacts: { system: DownstreamSystem; priority: OrchestratorPriority; reason: string; estimatedImpact: number }[] = [];

  // ─── Neue Quelle ──────────────────────────────────────────────────────────
  if (trigger === "new_source") {
    impacts.push(
      { system: "research_summary", priority: "critical", reason: "Neue Quelle verändert Forschungsbasis direkt", estimatedImpact: 0.9 },
      { system: "agent_context", priority: "high", reason: "Agent-Kontext muss neue Evidenz kennen", estimatedImpact: 0.8 },
      { system: "shop_description", priority: "medium", reason: "Shop-Text kann neue Erkenntnisse einbeziehen", estimatedImpact: 0.5 },
      { system: "academy_module", priority: "medium", reason: "Academy-Modul sollte neue Quelle referenzieren", estimatedImpact: 0.6 },
      { system: "seo_page", priority: "low", reason: "SEO-Seite kann neue Quelle im Schema.org einbinden", estimatedImpact: 0.3 },
      { system: "faq_block", priority: "low", reason: "FAQ kann neue Erkenntnisse aufgreifen", estimatedImpact: 0.2 }
    );
  }

  // ─── Neuer/aktualisierter Block ───────────────────────────────────────────
  if (trigger === "new_block" || trigger === "updated_block") {
    const isAgentBlock = blockType && ["mechanisms", "signaling", "research", "evidence_summary"].includes(blockType);
    const isShopBlock = blockType && ["definition", "simple_explanation", "interpretation"].includes(blockType);
    const isFaqBlock = blockType === "faq";

    if (isAgentBlock) {
      impacts.push(
        { system: "agent_context", priority: "critical", reason: `Block '${blockType}' ist primäre Agent-Wissensbasis`, estimatedImpact: 0.95 },
        { system: "research_summary", priority: "high", reason: "Research-Summary muss neuen Block einbeziehen", estimatedImpact: 0.8 }
      );
    }
    if (isShopBlock) {
      impacts.push(
        { system: "shop_description", priority: "high", reason: `Block '${blockType}' ist Basis für Shop-Text`, estimatedImpact: 0.85 },
        { system: "seo_page", priority: "medium", reason: "SEO-Seite nutzt Definition und Erklärung", estimatedImpact: 0.6 }
      );
    }
    if (isFaqBlock) {
      impacts.push(
        { system: "faq_block", priority: "critical", reason: "FAQ-Block direkt aktualisiert", estimatedImpact: 1.0 },
        { system: "support_faq", priority: "high", reason: "Support-FAQ basiert auf FAQ-Block", estimatedImpact: 0.9 }
      );
    }
    // Immer: Academy und Newsletter
    impacts.push(
      { system: "academy_module", priority: "medium", reason: "Academy-Modul nutzt alle Block-Typen", estimatedImpact: 0.5 },
      { system: "newsletter_content", priority: "low", reason: "Newsletter kann neue Inhalte aufgreifen", estimatedImpact: 0.3 }
    );
  }

  // ─── Neue Relation ────────────────────────────────────────────────────────
  if (trigger === "new_relation") {
    impacts.push(
      { system: "stack_recommendation", priority: "critical", reason: "Neue Relation verändert Stack-Logik direkt", estimatedImpact: 0.9 },
      { system: "comparison_page", priority: "high", reason: "Vergleichsseiten basieren auf Relations", estimatedImpact: 0.8 },
      { system: "agent_context", priority: "high", reason: "Agent muss neue Verbindungen kennen", estimatedImpact: 0.75 },
      { system: "bundle_suggestion", priority: "medium", reason: "Bundle-Logik nutzt synergizes_with Relations", estimatedImpact: 0.6 },
      { system: "seo_page", priority: "medium", reason: "Interne Verlinkung basiert auf Relations", estimatedImpact: 0.5 },
      { system: "academy_module", priority: "low", reason: "Academy kann neue Verbindungen erwähnen", estimatedImpact: 0.3 }
    );
  }

  // ─── Score-Änderung ───────────────────────────────────────────────────────
  if (trigger === "score_change" && scoreDelta !== null) {
    const delta = Math.abs(scoreDelta);
    if (delta >= 0.2) {
      // Große Änderung — alles neu generieren
      impacts.push(
        { system: "agent_context", priority: "critical", reason: `Score-Delta ${(scoreDelta * 100).toFixed(0)}% — Agent-Kontext veraltet`, estimatedImpact: 0.95 },
        { system: "shop_description", priority: "high", reason: "Große Score-Änderung rechtfertigt Shop-Update", estimatedImpact: 0.8 },
        { system: "academy_module", priority: "high", reason: "Academy-Modul sollte aktuellen Stand reflektieren", estimatedImpact: 0.75 },
        { system: "seo_page", priority: "medium", reason: "SEO-Seite kann verbesserte Inhalte nutzen", estimatedImpact: 0.6 }
      );
    } else if (delta >= 0.1) {
      // Mittlere Änderung
      impacts.push(
        { system: "agent_context", priority: "high", reason: `Score-Delta ${(scoreDelta * 100).toFixed(0)}% — Agent-Update empfohlen`, estimatedImpact: 0.7 },
        { system: "research_summary", priority: "medium", reason: "Research-Summary kann verbessert werden", estimatedImpact: 0.5 }
      );
    } else {
      // Kleine Änderung — nur Agent
      impacts.push(
        { system: "agent_context", priority: "medium", reason: `Kleine Score-Änderung (${(scoreDelta * 100).toFixed(0)}%)`, estimatedImpact: 0.4 }
      );
    }
  }

  // ─── Entity published ─────────────────────────────────────────────────────
  if (trigger === "entity_published") {
    impacts.push(
      { system: "shop_description", priority: "critical", reason: "Neue Entity muss sofort im Shop sichtbar sein", estimatedImpact: 1.0 },
      { system: "seo_page", priority: "critical", reason: "SEO-Seite muss sofort indexierbar sein", estimatedImpact: 1.0 },
      { system: "agent_context", priority: "critical", reason: "Agenten müssen neue Entity kennen", estimatedImpact: 1.0 },
      { system: "academy_module", priority: "high", reason: "Academy-Modul für neue Entity erstellen", estimatedImpact: 0.9 },
      { system: "faq_block", priority: "high", reason: "FAQ für neue Entity erstellen", estimatedImpact: 0.85 },
      { system: "research_summary", priority: "high", reason: "Research-Summary für neue Entity", estimatedImpact: 0.8 },
      { system: "glossary_entry", priority: "medium", reason: "Glossar-Eintrag für neue Entity", estimatedImpact: 0.6 },
      { system: "comparison_page", priority: "medium", reason: "Vergleichsseite mit ähnlichen Entities", estimatedImpact: 0.5 },
      { system: "newsletter_content", priority: "low", reason: "Newsletter kann neue Entity vorstellen", estimatedImpact: 0.3 },
      { system: "tiktok_script", priority: "low", reason: "Social Content für neue Entity", estimatedImpact: 0.3 }
    );
  }

  // ─── Stack-Änderung ───────────────────────────────────────────────────────
  if (trigger === "stack_changed") {
    impacts.push(
      { system: "stack_recommendation", priority: "critical", reason: "Stack direkt geändert", estimatedImpact: 1.0 },
      { system: "bundle_suggestion", priority: "critical", reason: "Bundle-Logik basiert auf Stacks", estimatedImpact: 0.95 },
      { system: "agent_context", priority: "high", reason: "Sales-Agent muss Stack-Änderung kennen", estimatedImpact: 0.85 },
      { system: "shop_description", priority: "high", reason: "Shop-Texte können Stack-Hinweise enthalten", estimatedImpact: 0.7 },
      { system: "comparison_page", priority: "medium", reason: "Vergleichsseiten können Stack-Info nutzen", estimatedImpact: 0.5 }
    );
  }

  // Duplikate entfernen (höchste Priorität gewinnt)
  const seen = new Map<string, typeof impacts[0]>();
  for (const impact of impacts) {
    const existing = seen.get(impact.system);
    if (!existing || priorityRank(impact.priority) > priorityRank(existing.priority)) {
      seen.set(impact.system, impact);
    }
  }

  return Array.from(seen.values()).sort((a, b) => b.estimatedImpact - a.estimatedImpact);
}

function priorityRank(p: OrchestratorPriority): number {
  return { critical: 4, high: 3, medium: 2, low: 1 }[p];
}

// ─── Impact Analysis ──────────────────────────────────────────────────────────

export async function analyzeImpact(
  entityId: string,
  trigger: OrchestratorTrigger,
  options: {
    scoreDelta?: number;
    blockType?: string;
    relationTargetId?: string;
  } = {}
): Promise<ImpactAnalysis> {
  // Entity-Grunddaten
  const entityRows = await db.execute(sql`
    SELECT e.id, e.slug, e.type, e.canonical_name,
           kes.knowledge_score
    FROM entities e
    LEFT JOIN knowledge_evolution_scores kes ON kes.entity_id = e.id
    WHERE e.id = ${entityId}
    LIMIT 1
  `) as any[];

  const entity = entityRows[0];
  if (!entity) throw new Error(`Entity ${entityId} not found`);

  // Verwandte Entities über Relations
  const relatedRows = await db.execute(sql`
    SELECT r.relation_type, r.target_id, e.slug, e.canonical_name
    FROM relations r
    JOIN entities e ON e.id = r.target_id
    WHERE r.source_id = ${entityId}
      AND e.lifecycle_status = 'published'
    LIMIT 20
  `) as any[];

  // Betroffene Stacks
  const stackRows = await db.execute(sql`
    SELECT s.id, s.name
    FROM stacks s
    WHERE s.entity_ids::text LIKE ${'%' + entityId + '%'}
    LIMIT 10
  `) as any[];

  const systemImpacts = calculateSystemImpacts(
    trigger,
    entity.type,
    options.scoreDelta ?? null,
    options.blockType
  );

  const totalImpactScore = systemImpacts.reduce((sum, s) => sum + s.estimatedImpact, 0) / Math.max(systemImpacts.length, 1);
  const hasCritical = systemImpacts.some(s => s.priority === "critical");
  const hasHigh = systemImpacts.some(s => s.priority === "high");

  return {
    entityId,
    trigger,
    systemImpacts,
    relatedEntities: relatedRows.map(r => ({
      id: r.target_id,
      slug: r.slug,
      name: r.canonical_name,
      relationType: r.relation_type
    })),
    relatedStacks: stackRows.map(s => ({ id: s.id, name: s.name })),
    totalImpactScore,
    shouldPropagateImmediately: hasCritical || hasHigh
  };
}

// ─── Orchestrator Decision ────────────────────────────────────────────────────

export async function orchestrate(
  entityId: string,
  trigger: OrchestratorTrigger,
  options: {
    scoreDelta?: number;
    blockType?: string;
    triggerDetail?: string;
  } = {}
): Promise<OrchestratorDecision> {
  const impact = await analyzeImpact(entityId, trigger, options);

  // Entity-Daten
  const entityRows = await db.execute(sql`
    SELECT id, slug, canonical_name FROM entities WHERE id = ${entityId} LIMIT 1
  `) as any[];
  const entity = entityRows[0];

  const decisionId = uuidv4();
  const now = new Date().toISOString();

  // Tasks aus Impact Analysis erstellen
  const tasks: OrchestratorTask[] = impact.systemImpacts.map(si => {
    const isImmediate = si.priority === "critical" || si.priority === "high";
    const delayMinutes = si.priority === "medium" ? 30 : si.priority === "low" ? 120 : 0;
    const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

    return {
      id: uuidv4(),
      decisionId,
      entityId,
      system: si.system,
      priority: si.priority,
      reason: si.reason,
      estimatedImpact: si.estimatedImpact,
      status: "pending" as const,
      scheduledFor
    };
  });

  const immediateActions = tasks.filter(t => t.priority === "critical" || t.priority === "high");
  const deferredActions = tasks.filter(t => t.priority === "medium" || t.priority === "low");

  const decision: OrchestratorDecision = {
    id: decisionId,
    entityId,
    entitySlug: entity?.slug ?? entityId,
    entityName: entity?.canonical_name ?? entityId,
    trigger,
    triggerDetail: options.triggerDetail ?? `Trigger: ${trigger}`,
    affectedSystems: impact.systemImpacts.map(s => s.system),
    affectedEntities: impact.relatedEntities.map(e => e.id),
    affectedStacks: impact.relatedStacks.map(s => s.id),
    tasks,
    totalImpactScore: impact.totalImpactScore,
    estimatedContentChanges: tasks.length,
    estimatedAgentsAffected: tasks.filter(t => t.system === "agent_context").length,
    estimatedSeoPages: tasks.filter(t => t.system === "seo_page").length,
    estimatedAcademyModules: tasks.filter(t => t.system === "academy_module").length,
    immediateActions,
    deferredActions,
    createdAt: now
  };

  // Decision in DB speichern
  await saveDecision(decision);

  return decision;
}

// ─── DB-Persistenz ────────────────────────────────────────────────────────────

async function saveDecision(decision: OrchestratorDecision): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO orchestrator_decisions (
        id, entity_id, entity_slug, entity_name,
        trigger_type, trigger_detail,
        affected_systems, affected_entities, affected_stacks,
        total_impact_score, estimated_content_changes,
        estimated_agents_affected, estimated_seo_pages, estimated_academy_modules,
        immediate_count, deferred_count,
        status, created_at
      ) VALUES (
        ${decision.id},
        ${decision.entityId},
        ${decision.entitySlug},
        ${decision.entityName},
        ${decision.trigger},
        ${decision.triggerDetail},
        ${JSON.stringify(decision.affectedSystems)},
        ${JSON.stringify(decision.affectedEntities)},
        ${JSON.stringify(decision.affectedStacks)},
        ${decision.totalImpactScore},
        ${decision.estimatedContentChanges},
        ${decision.estimatedAgentsAffected},
        ${decision.estimatedSeoPages},
        ${decision.estimatedAcademyModules},
        ${decision.immediateActions.length},
        ${decision.deferredActions.length},
        'pending',
        ${decision.createdAt}
      )
      ON CONFLICT (id) DO NOTHING
    `);

    // Tasks speichern
    for (const task of decision.tasks) {
      await db.execute(sql`
        INSERT INTO orchestrator_tasks (
          id, decision_id, entity_id, system_target,
          priority, reason, estimated_impact,
          status, scheduled_for, created_at
        ) VALUES (
          ${task.id},
          ${task.decisionId},
          ${task.entityId},
          ${task.system},
          ${task.priority},
          ${task.reason},
          ${task.estimatedImpact},
          'pending',
          ${task.scheduledFor},
          ${new Date().toISOString()}
        )
        ON CONFLICT (id) DO NOTHING
      `);
    }
  } catch (err: any) {
    // Tabelle existiert noch nicht — Migration noch nicht gelaufen
    console.warn("[Orchestrator] Could not save decision (migration pending):", err?.message);
  }
}

// ─── Knowledge Priority Engine ────────────────────────────────────────────────

export interface PriorityRecommendation {
  entityId: string;
  entitySlug: string;
  entityName: string;
  currentScore: number;
  targetScore: number;
  gap: number;
  recommendations: {
    action: string;
    expectedImpact: number;
    priority: OrchestratorPriority;
    reason: string;
  }[];
}

/**
 * Analysiert alle Entities und gibt priorisierte Verbesserungsempfehlungen.
 * Das ist der "Self-Improvement"-Kern des Systems.
 */
export async function getPriorityRecommendations(limit = 10): Promise<PriorityRecommendation[]> {
  const rows = await db.execute(sql`
    SELECT
      e.id, e.slug, e.canonical_name, e.type,
      kes.knowledge_score,
      kes.research_score,
      kes.evidence_score,
      kes.freshness_score,
      kes.confidence_score,
      kes.completeness_score,
      kes.total_blocks,
      kes.total_sources,
      kes.total_relations,
      kes.missing_block_types
    FROM entities e
    LEFT JOIN knowledge_evolution_scores kes ON kes.entity_id = e.id
    WHERE e.lifecycle_status = 'published'
      AND e.type IN ('compound', 'peptide', 'biological_process')
    ORDER BY COALESCE(kes.knowledge_score, 0) ASC
    LIMIT ${limit}
  `) as any[];

  return rows.map(row => {
    const score = row.knowledge_score ?? 0;
    const targetScore = 0.8; // Goldstandard
    const gap = targetScore - score;

    const recommendations: PriorityRecommendation["recommendations"] = [];

    // Quellen fehlen
    if ((row.total_sources ?? 0) < 3) {
      recommendations.push({
        action: "add_sources",
        expectedImpact: 0.15,
        priority: "critical",
        reason: `Nur ${row.total_sources ?? 0} Quellen vorhanden (Ziel: 5+). Neue Studien suchen und hinzufügen.`
      });
    }

    // Freshness schlecht
    if ((row.freshness_score ?? 0) < 0.3) {
      recommendations.push({
        action: "update_sources",
        expectedImpact: 0.12,
        priority: "high",
        reason: "Quellen sind veraltet (>5 Jahre). Neuere Studien (2020–2026) ergänzen."
      });
    }

    // Blocks fehlen
    const missingBlocks = row.missing_block_types ? JSON.parse(row.missing_block_types) : [];
    if (missingBlocks.length > 0) {
      recommendations.push({
        action: "run_factory",
        expectedImpact: 0.2,
        priority: "critical",
        reason: `${missingBlocks.length} Block-Typen fehlen: ${missingBlocks.slice(0, 3).join(", ")}. Factory ausführen.`
      });
    }

    // Relations fehlen
    if ((row.total_relations ?? 0) < 5) {
      recommendations.push({
        action: "add_relations",
        expectedImpact: 0.08,
        priority: "medium",
        reason: `Nur ${row.total_relations ?? 0} Relations vorhanden. Mechanismen und Targets verknüpfen.`
      });
    }

    // Confidence Score niedrig
    if ((row.confidence_score ?? 0) < 0.5) {
      recommendations.push({
        action: "improve_evidence",
        expectedImpact: 0.1,
        priority: "medium",
        reason: "Confidence Score niedrig. Humanstudien oder Meta-Analysen ergänzen."
      });
    }

    return {
      entityId: row.id,
      entitySlug: row.slug,
      entityName: row.canonical_name,
      currentScore: score,
      targetScore,
      gap,
      recommendations: recommendations.sort((a, b) => b.expectedImpact - a.expectedImpact)
    };
  });
}

// ─── Mission Control Stats ────────────────────────────────────────────────────

export interface MissionControlStats {
  // Entities
  totalEntities: number;
  byType: Record<string, number>;
  publishedEntities: number;
  draftEntities: number;

  // Knowledge Graph
  totalRelations: number;
  graphDensity: number;
  totalSources: number;
  totalBlocks: number;

  // Scores
  avgKnowledgeScore: number;
  avgResearchScore: number;
  avgFreshnessScore: number;
  avgConfidenceScore: number;
  avgCompletenessScore: number;
  topEntities: { slug: string; name: string; score: number }[];
  weakestEntities: { slug: string; name: string; score: number }[];

  // Content
  generatedContentCount: number;
  patternCount: number;
  fewShotCount: number;
  chatSessionCount: number;

  // Queues
  propagationQueueSize: number;
  orchestratorPendingTasks: number;
  reviewQueueSize: number;
  openConflicts: number;

  // Lücken
  missingContentByType: Record<string, number>;
  topSeoOpportunities: { slug: string; name: string; gap: number }[];
  topAcademyGaps: { slug: string; name: string; missingBlocks: string[] }[];

  // Zeitstempel
  computedAt: string;
}

export async function getMissionControlStats(): Promise<MissionControlStats> {
  // Entities by type
  const entityTypeRows = await db.execute(sql`
    SELECT type, lifecycle_status, COUNT(*) as count
    FROM entities
    GROUP BY type, lifecycle_status
  `) as any[];

  const byType: Record<string, number> = {};
  let totalEntities = 0;
  let publishedEntities = 0;
  let draftEntities = 0;

  for (const row of entityTypeRows) {
    byType[row.type] = (byType[row.type] ?? 0) + Number(row.count);
    totalEntities += Number(row.count);
    if (row.lifecycle_status === "published") publishedEntities += Number(row.count);
    else draftEntities += Number(row.count);
  }

  // Relations
  const relationsRow = await db.execute(sql`SELECT COUNT(*) as count FROM relations`) as any[];
  const totalRelations = Number(relationsRow[0]?.count ?? 0);
  const graphDensity = totalEntities > 1 ? totalRelations / (totalEntities * (totalEntities - 1)) : 0;

  // Sources & Blocks
  const sourcesRow = await db.execute(sql`SELECT COUNT(*) as count FROM sources`) as any[];
  const blocksRow = await db.execute(sql`SELECT COUNT(*) as count FROM content_blocks`) as any[];
  const totalSources = Number(sourcesRow[0]?.count ?? 0);
  const totalBlocks = Number(blocksRow[0]?.count ?? 0);

  // Scores
  const scoreRows = await db.execute(sql`
    SELECT
      AVG(knowledge_score) as avg_knowledge,
      AVG(research_score) as avg_research,
      AVG(freshness_score) as avg_freshness,
      AVG(confidence_score) as avg_confidence,
      AVG(completeness_score) as avg_completeness
    FROM knowledge_evolution_scores
  `) as any[];

  const avgKnowledgeScore = Number(scoreRows[0]?.avg_knowledge ?? 0);
  const avgResearchScore = Number(scoreRows[0]?.avg_research ?? 0);
  const avgFreshnessScore = Number(scoreRows[0]?.avg_freshness ?? 0);
  const avgConfidenceScore = Number(scoreRows[0]?.avg_confidence ?? 0);
  const avgCompletenessScore = Number(scoreRows[0]?.avg_completeness ?? 0);

  // Top & Weakest Entities
  const topRows = await db.execute(sql`
    SELECT e.slug, e.canonical_name, kes.knowledge_score
    FROM entities e
    JOIN knowledge_evolution_scores kes ON kes.entity_id = e.id
    WHERE e.lifecycle_status = 'published'
    ORDER BY kes.knowledge_score DESC
    LIMIT 5
  `) as any[];

  const weakestRows = await db.execute(sql`
    SELECT e.slug, e.canonical_name, kes.knowledge_score
    FROM entities e
    JOIN knowledge_evolution_scores kes ON kes.entity_id = e.id
    WHERE e.lifecycle_status = 'published'
    ORDER BY kes.knowledge_score ASC
    LIMIT 5
  `) as any[];

  // Content & Learning
  const generatedRow = await db.execute(sql`SELECT COUNT(*) as count FROM generated_content_store`) as any[];
  const patternRow = await db.execute(sql`SELECT COUNT(*) as count FROM pattern_library`) as any[];
  const fewShotRow = await db.execute(sql`SELECT COUNT(*) as count FROM learned_few_shots WHERE approved = true`) as any[];
  const chatRow = await db.execute(sql`SELECT COUNT(*) as count FROM chat_sessions`) as any[];

  // Queues
  const propQueueRow = await db.execute(sql`SELECT COUNT(*) as count FROM knowledge_propagation_queue WHERE status = 'pending'`) as any[];
  const reviewQueueRow = await db.execute(sql`SELECT COUNT(*) as count FROM review_queue WHERE status = 'pending'`) as any[];
  const conflictsRow = await db.execute(sql`SELECT COUNT(*) as count FROM knowledge_conflicts WHERE resolved = false`) as any[];

  // Orchestrator pending tasks
  let orchestratorPending = 0;
  try {
    const orchRow = await db.execute(sql`SELECT COUNT(*) as count FROM orchestrator_tasks WHERE status = 'pending'`) as any[];
    orchestratorPending = Number(orchRow[0]?.count ?? 0);
  } catch { /* Tabelle noch nicht migriert */ }

  // Missing content by type
  const missingRows = await db.execute(sql`
    SELECT kes.missing_block_types
    FROM knowledge_evolution_scores kes
    WHERE kes.missing_block_types != '[]'
  `) as any[];

  const missingContentByType: Record<string, number> = {};
  for (const row of missingRows) {
    const missing = JSON.parse(row.missing_block_types ?? "[]");
    for (const bt of missing) {
      missingContentByType[bt] = (missingContentByType[bt] ?? 0) + 1;
    }
  }

  // SEO Opportunities (Entities ohne SEO-Content)
  const seoGapRows = await db.execute(sql`
    SELECT e.slug, e.canonical_name,
           (0.8 - COALESCE(kes.knowledge_score, 0)) as gap
    FROM entities e
    LEFT JOIN knowledge_evolution_scores kes ON kes.entity_id = e.id
    WHERE e.lifecycle_status = 'published'
      AND e.type IN ('compound', 'peptide')
    ORDER BY gap DESC
    LIMIT 5
  `) as any[];

  // Academy Gaps
  const academyGapRows = await db.execute(sql`
    SELECT e.slug, e.canonical_name, kes.missing_block_types
    FROM entities e
    JOIN knowledge_evolution_scores kes ON kes.entity_id = e.id
    WHERE e.lifecycle_status = 'published'
      AND kes.missing_block_types != '[]'
    ORDER BY kes.knowledge_score ASC
    LIMIT 5
  `) as any[];

  return {
    totalEntities,
    byType,
    publishedEntities,
    draftEntities,
    totalRelations,
    graphDensity: Math.round(graphDensity * 10000) / 10000,
    totalSources,
    totalBlocks,
    avgKnowledgeScore: Math.round(avgKnowledgeScore * 100) / 100,
    avgResearchScore: Math.round(avgResearchScore * 100) / 100,
    avgFreshnessScore: Math.round(avgFreshnessScore * 100) / 100,
    avgConfidenceScore: Math.round(avgConfidenceScore * 100) / 100,
    avgCompletenessScore: Math.round(avgCompletenessScore * 100) / 100,
    topEntities: topRows.map(r => ({ slug: r.slug, name: r.canonical_name, score: Number(r.knowledge_score) })),
    weakestEntities: weakestRows.map(r => ({ slug: r.slug, name: r.canonical_name, score: Number(r.knowledge_score) })),
    generatedContentCount: Number(generatedRow[0]?.count ?? 0),
    patternCount: Number(patternRow[0]?.count ?? 0),
    fewShotCount: Number(fewShotRow[0]?.count ?? 0),
    chatSessionCount: Number(chatRow[0]?.count ?? 0),
    propagationQueueSize: Number(propQueueRow[0]?.count ?? 0),
    orchestratorPendingTasks: orchestratorPending,
    reviewQueueSize: Number(reviewQueueRow[0]?.count ?? 0),
    openConflicts: Number(conflictsRow[0]?.count ?? 0),
    missingContentByType,
    topSeoOpportunities: seoGapRows.map(r => ({ slug: r.slug, name: r.canonical_name, gap: Number(r.gap) })),
    topAcademyGaps: academyGapRows.map(r => ({
      slug: r.slug,
      name: r.canonical_name,
      missingBlocks: JSON.parse(r.missing_block_types ?? "[]")
    })),
    computedAt: new Date().toISOString()
  };
}
