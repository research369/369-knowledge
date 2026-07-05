/**
 * generation-budget-engine.service.ts
 *
 * Pre-Freeze Erweiterung 2 — Generation Budget Engine
 *
 * Vor jedem LLM-Call bewertet das System:
 *   - Hat sich genug geändert?
 *   - Ist eine Neugenerierung sinnvoll?
 *   - Wie hoch ist der erwartete Mehrwert?
 *   - Wie viele Outputs wären betroffen?
 *   - Welche Priorität besitzt die Änderung?
 *   - Welche Kosten entstehen?
 *   - Welche Version existiert bereits?
 *   - Kann bestehender Content weiterverwendet werden?
 *
 * Entscheidungen:
 *   GENERATE  — Neugenerierung notwendig und wirtschaftlich
 *   SKIP      — Kein signifikanter Unterschied, bestehender Content ist aktuell
 *   DELAY     — Änderung vorhanden, aber Priorität zu niedrig
 *   MERGE     — Mehrere kleine Änderungen zusammenfassen
 *   REUSE     — Bestehender Content kann wiederverwendet werden
 *
 * ADDITIV — verändert keine bestehenden Funktionen.
 */

import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

// ─── Typen ────────────────────────────────────────────────────────────────────

export type BudgetDecision = "GENERATE" | "SKIP" | "DELAY" | "MERGE" | "REUSE";

export interface BudgetEvaluation {
  decision: BudgetDecision;
  reason: string;
  expectedValueGain: number;    // 0–1: wie viel Mehrwert bringt die Generierung?
  estimatedCostUnits: number;   // relative Kosten (1 = Standard-Call)
  roi: number;                  // expectedValueGain / estimatedCostUnits
  existingVersion?: {
    id: string;
    version: number;
    generatedAt: string;
    knowledgeScoreAtGeneration: number;
  };
  changeSignificance: number;   // 0–1: wie signifikant ist die Änderung?
  affectedOutputTypes: string[];
  recommendation: string;
}

export interface BudgetRequest {
  entityId: string;
  outputType: string;
  triggerType: "entity_update" | "score_change" | "manual" | "scheduled" | "cascade";
  changedFields?: string[];
  scoreDelta?: number;          // wie viel hat sich der Score geändert?
  priority?: "critical" | "high" | "medium" | "low";
}

// ─── Schwellenwerte ───────────────────────────────────────────────────────────

const THRESHOLDS = {
  minScoreDeltaForRegeneration: 0.05,   // Score muss sich um 5% ändern
  minChangedFieldsForRegeneration: 1,   // mindestens 1 relevantes Feld
  maxAgeForReuse: 7 * 24 * 60 * 60 * 1000, // 7 Tage in ms
  minROIForGeneration: 0.3,             // ROI mindestens 0.3
  delayThreshold: 0.15,                 // ROI unter 0.15 → DELAY
};

// Welche Felder sind für welche Output-Typen relevant?
const OUTPUT_FIELD_RELEVANCE: Record<string, string[]> = {
  shop_description:  ["shop_visible", "agent_research_context", "canonical_name"],
  academy_module:    ["academy_visible", "agent_research_context", "lifecycle_status"],
  seo_page:          ["canonical_name", "agent_research_context", "type"],
  faq_set:           ["agent_research_context", "canonical_name"],
  agent_context:     ["agent_research_context", "agent_safety_context", "agent_stack_context"],
  sales_arguments:   ["agent_research_context", "shop_visible"],
  support_answers:   ["agent_safety_context", "agent_research_context"],
  newsletter:        ["agent_research_context", "canonical_name"],
  social_tiktok:     ["canonical_name", "agent_research_context"],
  social_instagram:  ["canonical_name", "agent_research_context"],
  comparison_page:   ["type", "canonical_name"],
  landing_page:      ["shop_visible", "canonical_name", "agent_research_context"],
  bundle_description:["type", "canonical_name"],
  glossary_entry:    ["canonical_name", "agent_research_context"],
  pdf_summary:       ["agent_research_context"],
  video_script:      ["agent_research_context", "canonical_name"],
};

// ─── Hauptfunktion ────────────────────────────────────────────────────────────

export async function evaluateBudget(request: BudgetRequest): Promise<BudgetEvaluation> {
  const { entityId, outputType, triggerType, changedFields = [], scoreDelta = 0, priority = "medium" } = request;

  // 1. Letzte Generierung für diesen Output-Typ laden
  const lastGenRows = await db.execute(
    sql`SELECT id, version, generated_at, knowledge_score_snapshot, business_score_snapshot
        FROM content_versions
        WHERE entity_id = ${entityId} AND output_type = ${outputType}
        ORDER BY version DESC LIMIT 1`
  ) as any[];
  const lastGen = lastGenRows[0] as any;

  // 2. Relevante Felder für diesen Output-Typ
  const relevantFields = OUTPUT_FIELD_RELEVANCE[outputType] || ["agent_research_context"];
  const relevantChangedFields = changedFields.filter(f => relevantFields.includes(f));

  // 3. Change Significance berechnen
  let changeSignificance = 0;
  if (triggerType === "manual") changeSignificance = 1.0;
  else if (triggerType === "score_change") changeSignificance = Math.min(1, Math.abs(scoreDelta) / 0.1);
  else if (triggerType === "entity_update") changeSignificance = Math.min(1, relevantChangedFields.length / relevantFields.length);
  else if (triggerType === "scheduled") changeSignificance = 0.3;
  else if (triggerType === "cascade") changeSignificance = 0.5;

  // 4. Prüfen ob bestehender Content noch aktuell ist
  let canReuse = false;
  let existingVersion;
  if (lastGen) {
    const ageMs = Date.now() - new Date(lastGen.generated_at).getTime();
    const knowledgeScoreAtGen = parseFloat(lastGen.knowledge_score_snapshot || '0');
    canReuse = ageMs < THRESHOLDS.maxAgeForReuse && changeSignificance < 0.2;
    existingVersion = {
      id: lastGen.id,
      version: lastGen.version,
      generatedAt: lastGen.generated_at,
      knowledgeScoreAtGeneration: knowledgeScoreAtGen,
    };
  }

  // 5. Expected Value Gain berechnen
  let expectedValueGain = 0;
  if (!lastGen) {
    expectedValueGain = 0.9; // Noch nie generiert → hoher Wert
  } else {
    expectedValueGain = changeSignificance * 0.7 + (priority === "critical" ? 0.3 : priority === "high" ? 0.2 : 0.1);
  }

  // 6. Estimated Cost Units
  const costMap: Record<string, number> = {
    shop_description: 1.0,
    academy_module: 2.0,
    seo_page: 1.5,
    faq_set: 1.5,
    agent_context: 1.0,
    sales_arguments: 1.0,
    support_answers: 1.0,
    newsletter: 1.0,
    social_tiktok: 0.8,
    social_instagram: 0.5,
    comparison_page: 2.0,
    landing_page: 2.0,
    bundle_description: 1.0,
    glossary_entry: 0.5,
    pdf_summary: 1.5,
    video_script: 2.5,
  };
  const estimatedCostUnits = costMap[outputType] || 1.0;

  // 7. ROI berechnen
  const roi = estimatedCostUnits > 0 ? expectedValueGain / estimatedCostUnits : 0;

  // 8. Entscheidung treffen
  let decision: BudgetDecision;
  let reason: string;
  let recommendation: string;

  if (canReuse && lastGen) {
    decision = "REUSE";
    reason = "Bestehender Content ist aktuell (< 7 Tage alt, keine signifikanten Änderungen).";
    recommendation = `Version ${lastGen.version} vom ${new Date(lastGen.generated_at).toLocaleDateString('de-DE')} wiederverwenden.`;
  } else if (!lastGen) {
    decision = "GENERATE";
    reason = "Noch kein Content für diesen Output-Typ vorhanden.";
    recommendation = "Sofort generieren — erste Version.";
  } else if (triggerType === "manual" || priority === "critical") {
    decision = "GENERATE";
    reason = "Manuelle Anfrage oder kritische Priorität.";
    recommendation = "Sofort generieren.";
  } else if (roi >= THRESHOLDS.minROIForGeneration) {
    decision = "GENERATE";
    reason = `ROI ${roi.toFixed(2)} über Schwellenwert ${THRESHOLDS.minROIForGeneration}.`;
    recommendation = `Neugenerierung wirtschaftlich sinnvoll. Erwarteter Mehrwert: ${(expectedValueGain * 100).toFixed(0)}%.`;
  } else if (roi >= THRESHOLDS.delayThreshold) {
    decision = "DELAY";
    reason = `ROI ${roi.toFixed(2)} unter Schwellenwert, aber Änderung vorhanden.`;
    recommendation = "In die nächste Batch-Generierung aufnehmen.";
  } else if (changeSignificance > 0 && changeSignificance < 0.2) {
    decision = "MERGE";
    reason = "Kleine Änderung — mit anderen Änderungen zusammenfassen.";
    recommendation = "Auf weitere Änderungen warten, dann gemeinsam generieren.";
  } else {
    decision = "SKIP";
    reason = `Keine signifikante Änderung (significance: ${changeSignificance.toFixed(2)}).`;
    recommendation = "Bestehenden Content beibehalten.";
  }

  // 9. Betroffene Output-Typen ermitteln (für cascade)
  const affectedOutputTypes = changedFields.length > 0
    ? Object.entries(OUTPUT_FIELD_RELEVANCE)
        .filter(([, fields]) => changedFields.some(f => fields.includes(f)))
        .map(([type]) => type)
    : [outputType];

  return {
    decision,
    reason,
    expectedValueGain: Math.round(expectedValueGain * 1000) / 1000,
    estimatedCostUnits,
    roi: Math.round(roi * 1000) / 1000,
    existingVersion,
    changeSignificance: Math.round(changeSignificance * 1000) / 1000,
    affectedOutputTypes,
    recommendation,
  };
}

// ─── Batch-Evaluation: alle Output-Typen für eine Entity ─────────────────────

export async function evaluateAllOutputsForEntity(
  entityId: string,
  triggerType: BudgetRequest["triggerType"] = "scheduled",
  changedFields: string[] = [],
  scoreDelta: number = 0
): Promise<{
  entityId: string;
  summary: { generate: string[]; skip: string[]; delay: string[]; merge: string[]; reuse: string[] };
  evaluations: Record<string, BudgetEvaluation>;
  totalEstimatedCost: number;
  totalExpectedValue: number;
}> {
  const outputTypes = Object.keys(OUTPUT_FIELD_RELEVANCE);
  const evaluations: Record<string, BudgetEvaluation> = {};
  const summary = { generate: [] as string[], skip: [] as string[], delay: [] as string[], merge: [] as string[], reuse: [] as string[] };
  let totalEstimatedCost = 0;
  let totalExpectedValue = 0;

  for (const outputType of outputTypes) {
    const eval_ = await evaluateBudget({ entityId, outputType, triggerType, changedFields, scoreDelta });
    evaluations[outputType] = eval_;
    summary[eval_.decision.toLowerCase() as keyof typeof summary].push(outputType);
    if (eval_.decision === "GENERATE") {
      totalEstimatedCost += eval_.estimatedCostUnits;
      totalExpectedValue += eval_.expectedValueGain;
    }
  }

  return {
    entityId,
    summary,
    evaluations,
    totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
    totalExpectedValue: Math.round(totalExpectedValue * 100) / 100,
  };
}
