/**
 * smart-content-factory.service.ts
 *
 * Pre-Freeze Erweiterung 3 — Intelligente Content Factory
 *
 * Vor jeder Generierung:
 *   1. Budget-Check (Generate/Skip/Delay/Merge/Reuse)
 *   2. Impact Analysis (welche Downstream-Systeme sind betroffen?)
 *   3. Nur notwendige Inhalte erzeugen
 *   4. Vollständige Versionierung mit Snapshots
 *
 * ADDITIV — verändert keine bestehenden Funktionen.
 */

import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { invokeLLM, LLMMessage } from "../services/llm-provider.service.js";
import { evaluateBudget, evaluateAllOutputsForEntity } from "./generation-budget-engine.service.js";
// knowledge-value-engine wird indirekt über Budget Engine genutzt

// ─── Typen ────────────────────────────────────────────────────────────────────

export interface SmartGenerationRequest {
  entityId: string;
  outputTypes?: string[];   // leer = alle notwendigen
  triggerType?: "manual" | "entity_update" | "score_change" | "scheduled" | "cascade";
  changedFields?: string[];
  scoreDelta?: number;
  priority?: "critical" | "high" | "medium" | "low";
  dryRun?: boolean;         // true = nur Budget-Check, kein LLM-Call
}

export interface SmartGenerationResult {
  entityId: string;
  entitySlug: string;
  generated: GeneratedItem[];
  skipped: SkippedItem[];
  delayed: string[];
  merged: string[];
  reused: string[];
  totalCostUnits: number;
  totalExpectedValue: number;
  dryRun: boolean;
}

interface GeneratedItem {
  outputType: string;
  version: number;
  contentId: string;
  budgetDecision: string;
  roi: number;
}

interface SkippedItem {
  outputType: string;
  reason: string;
}

// ─── Prompt-Templates pro Output-Typ ─────────────────────────────────────────

function buildPrompt(outputType: string, entity: any, blocks: any[], sources: any[]): string {
  const entityName = entity.canonical_name || entity.id;
  const entityType = entity.type || "compound";
  const agentContext = entity.agent_research_context || "";
  const safetyContext = entity.agent_safety_context || "";

  const blockSummary = blocks.slice(0, 5).map((b: any) =>
    `[${b.block_type}] ${(b.body || "").substring(0, 300)}`
  ).join("\n");

  const sourcesSummary = sources.slice(0, 3).map((s: any) =>
    `${s.title} (${s.study_type || "study"}, ${s.year || "n.d."})`
  ).join("; ");

  const DISCLAIMER = "Nur für Forschungszwecke (RUO). Keine Heilversprechen. Keine Dosierungsangaben.";

  const prompts: Record<string, string> = {
    shop_description: `Erstelle eine professionelle Shop-Beschreibung für ${entityName} (${entityType}) für 369 Research.
Kontext: ${agentContext.substring(0, 500)}
Quellen: ${sourcesSummary}
Anforderungen:
- Headline (max 80 Zeichen)
- 5 Bullet Points (je max 120 Zeichen)
- Kurzbeschreibung (max 300 Zeichen)
- Disclaimer: "${DISCLAIMER}"
Format: JSON mit Feldern headline, bullets (Array), description, disclaimer`,

    academy_module: `Erstelle ein Academy-Modul für ${entityName} für die 369 Research Academy.
Kontext: ${agentContext.substring(0, 500)}
Blöcke: ${blockSummary}
Anforderungen:
- Titel des Moduls
- Lernziele (3–5 Punkte)
- Kapitelstruktur (4–6 Kapitel mit Titeln)
- 3 Quizfragen mit je 4 Antwortoptionen
- Weiterführende Themen
Format: JSON mit Feldern title, learningGoals, chapters, quiz, furtherTopics`,

    seo_page: `Erstelle SEO-Metadaten für ${entityName} für 369 Research.
Kontext: ${agentContext.substring(0, 400)}
Anforderungen:
- Meta Title (max 60 Zeichen)
- Meta Description (max 160 Zeichen)
- 5 primäre Keywords
- 5 Long-Tail-Keywords
- H1-Vorschlag
- Schema.org-Typ
Format: JSON mit Feldern metaTitle, metaDescription, primaryKeywords, longTailKeywords, h1, schemaType`,

    faq_set: `Erstelle 5 häufige Fragen und Antworten zu ${entityName} für 369 Research.
Kontext: ${agentContext.substring(0, 400)}
Sicherheitshinweis: ${safetyContext.substring(0, 200)}
Anforderungen:
- 5 Fragen mit je einer klaren Antwort (max 200 Zeichen)
- Keine Heilversprechen, keine Dosierungsangaben im öffentlichen Bereich
Format: JSON mit Feld faqs (Array von {question, answer})`,

    agent_context: `Erstelle einen strukturierten Agenten-Kontext für ${entityName} für PepGPT/SalesGPT/SupportGPT.
Kontext: ${agentContext.substring(0, 600)}
Sicherheit: ${safetyContext.substring(0, 300)}
Anforderungen:
- Kurzzusammenfassung (max 200 Zeichen)
- Mechanismus (max 300 Zeichen)
- Wichtigste Anwendungsbereiche (3–5 Punkte)
- Sicherheitshinweise (max 200 Zeichen)
- Typische Fragen und Antworten (3 Paare)
Format: JSON mit Feldern summary, mechanism, applications, safety, typicalQA`,

    sales_arguments: `Erstelle 5 starke Verkaufsargumente für ${entityName} für 369 Research.
Kontext: ${agentContext.substring(0, 400)}
Anforderungen:
- 5 Argumente mit Headline und Erklärung
- Evidenzbasiert, keine Heilversprechen
- Für Forschungsinteressierte und Biohacker
Format: JSON mit Feld arguments (Array von {headline, explanation, evidenceNote})`,

    support_answers: `Erstelle 5 typische Support-Antworten für ${entityName} für 369 Research.
Sicherheitskontext: ${safetyContext.substring(0, 300)}
Anforderungen:
- 5 typische Kundenfragen mit professionellen Antworten
- Immer auf RUO-Status hinweisen
- Keine medizinischen Ratschläge
Format: JSON mit Feld answers (Array von {question, answer, category})`,

    newsletter: `Erstelle einen Newsletter-Abschnitt über ${entityName} für 369 Research.
Kontext: ${agentContext.substring(0, 400)}
Anforderungen:
- Betreffzeile (max 60 Zeichen)
- Einleitung (max 200 Zeichen)
- Hauptinhalt (max 500 Zeichen)
- Call-to-Action
Format: JSON mit Feldern subject, intro, body, cta`,

    social_tiktok: `Erstelle ein TikTok-Skript über ${entityName} für 369 Research.
Kontext: ${agentContext.substring(0, 300)}
Anforderungen:
- Hook (max 15 Sekunden)
- Hauptinhalt (max 45 Sekunden)
- Call-to-Action (max 10 Sekunden)
- Hashtags (5–8)
Format: JSON mit Feldern hook, main, cta, hashtags`,

    social_instagram: `Erstelle einen Instagram-Post über ${entityName} für 369 Research.
Kontext: ${agentContext.substring(0, 300)}
Anforderungen:
- Caption (max 300 Zeichen)
- Hashtags (10–15)
- Story-Idee (1 Satz)
Format: JSON mit Feldern caption, hashtags, storyIdea`,

    glossary_entry: `Erstelle einen Glossar-Eintrag für ${entityName} für die 369 Research Academy.
Kontext: ${agentContext.substring(0, 300)}
Anforderungen:
- Definition (max 200 Zeichen)
- Ausführliche Erklärung (max 500 Zeichen)
- Verwandte Begriffe (3–5)
Format: JSON mit Feldern term, definition, explanation, relatedTerms`,
  };

  return prompts[outputType] || `Erstelle einen informativen Text über ${entityName} (${outputType}) für 369 Research. Format: JSON mit Feld content.`;
}

// ─── Hauptfunktion ────────────────────────────────────────────────────────────

export async function smartGenerate(request: SmartGenerationRequest): Promise<SmartGenerationResult> {
  const {
    entityId,
    outputTypes,
    triggerType = "manual",
    changedFields = [],
    scoreDelta = 0,
    priority = "medium",
    dryRun = false,
  } = request;

  // 1. Entity laden
  const entityRows = await db.execute(
    sql`SELECT * FROM entities WHERE id = ${entityId} LIMIT 1`
  ) as any[];
  const entity = entityRows[0] as any;
  if (!entity) throw new Error(`Entity nicht gefunden: ${entityId}`);

  // 2. Blocks und Sources laden
  const blocks = await db.execute(
    sql`SELECT block_type, body FROM content_blocks WHERE entity_id = ${entityId} ORDER BY created_at DESC LIMIT 20`
  ) as any[];

  const sources = await db.execute(
    sql`SELECT title, study_type, year FROM sources WHERE linked_entity_ids::text LIKE ${'%' + entityId + '%'} LIMIT 10`
  ) as any[];

  // 3. Zu generierende Output-Typen bestimmen
  const defaultOutputTypes = [
    "shop_description", "academy_module", "seo_page", "faq_set",
    "agent_context", "sales_arguments", "support_answers",
    "newsletter", "social_tiktok", "social_instagram", "glossary_entry",
  ];
  const targetOutputTypes = outputTypes || defaultOutputTypes;

  const result: SmartGenerationResult = {
    entityId,
    entitySlug: entity.id,
    generated: [],
    skipped: [],
    delayed: [],
    merged: [],
    reused: [],
    totalCostUnits: 0,
    totalExpectedValue: 0,
    dryRun,
  };

  // 4. Budget-Check und Generierung pro Output-Typ
  for (const outputType of targetOutputTypes) {
    const budgetEval = await evaluateBudget({
      entityId,
      outputType,
      triggerType,
      changedFields,
      scoreDelta,
      priority,
    });

    // Budget-Entscheidung loggen
    await db.execute(sql`
      INSERT INTO generation_budget_log
        (entity_id, output_type, trigger_type, decision, reason, expected_value_gain,
         estimated_cost_units, roi, change_significance, affected_output_types)
      VALUES
        (${entityId}, ${outputType}, ${triggerType}, ${budgetEval.decision},
         ${budgetEval.reason}, ${budgetEval.expectedValueGain},
         ${budgetEval.estimatedCostUnits}, ${budgetEval.roi},
         ${budgetEval.changeSignificance}, ${JSON.stringify(budgetEval.affectedOutputTypes)})
    `);

    if (budgetEval.decision === "SKIP") {
      result.skipped.push({ outputType, reason: budgetEval.reason });
      continue;
    }
    if (budgetEval.decision === "DELAY") {
      result.delayed.push(outputType);
      continue;
    }
    if (budgetEval.decision === "MERGE") {
      result.merged.push(outputType);
      continue;
    }
    if (budgetEval.decision === "REUSE" && budgetEval.existingVersion) {
      result.reused.push(outputType);
      continue;
    }

    // GENERATE
    if (dryRun) {
      result.generated.push({
        outputType,
        version: (budgetEval.existingVersion?.version || 0) + 1,
        contentId: "dry-run",
        budgetDecision: budgetEval.decision,
        roi: budgetEval.roi,
      });
      result.totalCostUnits += budgetEval.estimatedCostUnits;
      result.totalExpectedValue += budgetEval.expectedValueGain;
      continue;
    }

    try {
      // LLM-Call
      const prompt = buildPrompt(outputType, entity, blocks as any[], sources as any[]);
      const messages: LLMMessage[] = [
        { role: "system", content: "Du bist ein professioneller Content-Ersteller für 369 Research. Antworte immer auf Deutsch. Gib nur valides JSON zurück, kein Markdown." },
        { role: "user", content: prompt },
      ];
      const llmResponse = await invokeLLM(messages, { responseFormat: "json" });

      let contentData: any;
      try {
        contentData = JSON.parse(llmResponse.content || "{}");
      } catch {
        contentData = { content: llmResponse.content };
      }

      // Aktuelle Version ermitteln
      const versionRows = await db.execute(
        sql`SELECT MAX(version) as max_v FROM content_versions WHERE entity_id = ${entityId} AND output_type = ${outputType}`
      ) as any[];
      const nextVersion = ((versionRows[0] as any)?.max_v || 0) + 1;

      // Alte Versionen als nicht-aktuell markieren
      await db.execute(
        sql`UPDATE content_versions SET is_current = false WHERE entity_id = ${entityId} AND output_type = ${outputType}`
      );

      // Neue Version speichern
      const insertRows = await db.execute(sql`
        INSERT INTO content_versions
          (entity_id, entity_slug, output_type, version, content, status,
           factory_version, trigger_type, budget_decision, is_current)
        VALUES
          (${entityId}, ${entity.id}, ${outputType}, ${nextVersion},
           ${JSON.stringify(contentData)}::jsonb, 'generated',
           '1.0.0', ${triggerType}, ${budgetEval.decision}, true)
        RETURNING id
      `) as any[];

      const contentId = (insertRows[0] as any)?.id || "unknown";

      result.generated.push({
        outputType,
        version: nextVersion,
        contentId,
        budgetDecision: budgetEval.decision,
        roi: budgetEval.roi,
      });
      result.totalCostUnits += budgetEval.estimatedCostUnits;
      result.totalExpectedValue += budgetEval.expectedValueGain;

    } catch (err: any) {
      result.skipped.push({ outputType, reason: `LLM-Fehler: ${err.message}` });
    }
  }

  return result;
}

// ─── Aktuellen Content für eine Entity abrufen ───────────────────────────────

export async function getCurrentContent(entityId: string, outputType: string): Promise<any | null> {
  const rows = await db.execute(
    sql`SELECT * FROM content_versions
        WHERE entity_id = ${entityId} AND output_type = ${outputType} AND is_current = true
        ORDER BY version DESC LIMIT 1`
  ) as any[];
  return (rows[0] as any) || null;
}

// ─── Alle aktuellen Contents für eine Entity ─────────────────────────────────

export async function getAllCurrentContent(entityId: string): Promise<Record<string, any>> {
  const rows = await db.execute(
    sql`SELECT output_type, content, version, generated_at, budget_decision
        FROM content_versions
        WHERE entity_id = ${entityId} AND is_current = true
        ORDER BY output_type`
  ) as any[];

  const result: Record<string, any> = {};
  for (const row of rows as any[]) {
    result[row.output_type] = {
      content: row.content,
      version: row.version,
      generatedAt: row.generated_at,
      budgetDecision: row.budget_decision,
    };
  }
  return result;
}
