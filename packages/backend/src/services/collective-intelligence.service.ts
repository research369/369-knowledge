/**
 * collective-intelligence.service.ts
 *
 * Phase 5 — Collective Intelligence
 *
 * Alle Agenten (PepGPT, SalesGPT, SupportGPT, zukünftige) schreiben ihre
 * Erkenntnisse in einen gemeinsamen Wissenspool.
 *
 * Kernprinzipien:
 *   - Kein doppeltes Lernen (Deduplizierung via content hash)
 *   - Globale Musterbewertung (alle Agenten stimmen ab)
 *   - Cross-Agent-Propagation (Sales → Support → PepGPT)
 *   - Qualitätsfilter (nur hochwertige Erkenntnisse werden übernommen)
 *
 * ADDITIV — verändert keine bestehenden Funktionen.
 */

import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { invokeLLM } from "./llm-provider.service.js";
import { createHash } from "crypto";

// ─── Typen ────────────────────────────────────────────────────────────────────

export type InsightType =
  | "objection"          // Einwand + Lösung
  | "question"           // Häufige Frage + Antwort
  | "explanation"        // Neue Erklärung / Analogie
  | "sales_argument"     // Kaufargument
  | "support_solution"   // Support-Lösung
  | "misconception"      // Missverständnis + Korrektur
  | "analogy"            // Neue Analogie
  | "buying_signal"      // Kaufsignal
  | "knowledge_gap"      // Wissenslücke erkannt
  | "error_pattern"      // Fehler-Muster (Agent-Fehler)
  | "new_fact"           // Neues Faktum aus Konversation
  | "user_need"          // Erkanntes Nutzerbedürfnis
  | "competitor_mention" // Konkurrenz-Erwähnung
  | "compliance_issue";  // Compliance-Problem erkannt

export interface CollectiveInsight {
  id: string;
  insightType: InsightType;
  content: string;            // Der Kern-Inhalt
  context: string;            // Kontext (Frage/Antwort)
  entityId?: string;          // Bezug zu Entity (optional)
  sourceAgent: string;        // Welcher Agent hat es entdeckt
  beneficiaryAgents: string[]; // Welche Agenten profitieren
  qualityScore: number;       // 0–1
  globalScore: number;        // Aggregierter Score über alle Agenten
  usageCount: number;         // Wie oft wurde es genutzt
  isApproved: boolean;
  contentHash: string;        // SHA-256 für Deduplizierung
  createdAt: string;
  updatedAt: string;
}

export interface CrossAgentLearningResult {
  newInsights: number;
  duplicatesSkipped: number;
  propagatedTo: string[];
  qualityFiltered: number;
}

// ─── Hauptfunktionen ──────────────────────────────────────────────────────────

/**
 * Verarbeitet eine Chat-Session und extrahiert Collective Insights.
 * Wird nach jeder Konversation aufgerufen (aus learning-runtime.service.ts).
 */
export async function extractCollectiveInsights(
  chatSessionId: string,
  agentRole: string,
  entityId?: string
): Promise<CrossAgentLearningResult> {
  const result: CrossAgentLearningResult = {
    newInsights: 0,
    duplicatesSkipped: 0,
    propagatedTo: [],
    qualityFiltered: 0,
  };

  try {
    // Chat-Session laden
    const sessions = await db.execute(sql`
      SELECT query, response, intent, quality_score, validation_passed
      FROM chat_sessions
      WHERE id = ${chatSessionId}
      LIMIT 1
    `) as any[];

    if (!sessions || sessions.length === 0) return result;
    const session = sessions[0];

    if (!session.query || !session.response) return result;

    // LLM-Analyse: Insights extrahieren
    const insights = await extractInsightsWithLLM(
      session.query,
      session.response,
      agentRole,
      entityId
    );

    for (const insight of insights) {
      // Qualitätsfilter
      if (insight.qualityScore < 0.6) {
        result.qualityFiltered++;
        continue;
      }

      // Deduplizierung via Content Hash
      const contentHash = createHash("sha256")
        .update(`${insight.insightType}:${insight.content}`)
        .digest("hex")
        .substring(0, 16);

      const existing = await db.execute(sql`
        SELECT id, global_score, usage_count FROM collective_insights
        WHERE content_hash = ${contentHash}
        LIMIT 1
      `) as any[];

      if (existing && existing.length > 0) {
        // Existiert bereits — Score erhöhen (Reinforcement)
        await db.execute(sql`
          UPDATE collective_insights
          SET
            global_score = LEAST(1.0, global_score + 0.05),
            usage_count = usage_count + 1,
            updated_at = NOW()
          WHERE content_hash = ${contentHash}
        `);
        result.duplicatesSkipped++;
        continue;
      }

      // Beneficiary Agents bestimmen
      const beneficiaries = determineBeneficiaryAgents(insight.insightType, agentRole);

      // Neuen Insight speichern
      const insightId = uuidv4();
      await db.execute(sql`
        INSERT INTO collective_insights (
          id, insight_type, content, context, entity_id,
          source_agent, beneficiary_agents, quality_score, global_score,
          usage_count, is_approved, content_hash, created_at, updated_at
        ) VALUES (
          ${insightId},
          ${insight.insightType},
          ${insight.content},
          ${insight.context},
          ${entityId ?? null},
          ${agentRole},
          ${JSON.stringify(beneficiaries)},
          ${insight.qualityScore},
          ${insight.qualityScore},
          1,
          ${insight.qualityScore >= 0.8},
          ${contentHash},
          NOW(),
          NOW()
        )
      `);

      result.newInsights++;
      if (beneficiaries.length > 0) {
        result.propagatedTo.push(...beneficiaries.filter(b => !result.propagatedTo.includes(b)));
      }
    }

    return result;
  } catch (error) {
    console.error("[CollectiveIntelligence] Error extracting insights:", error);
    return result;
  }
}

/**
 * Lädt relevante Collective Insights für einen Agenten.
 * Wird im Prompt Builder verwendet (Baustein: Collective Intelligence).
 */
export async function loadCollectiveInsightsForAgent(
  agentRole: string,
  entityId?: string,
  insightTypes?: InsightType[],
  limit: number = 5
): Promise<CollectiveInsight[]> {
  try {
    const typeFilter = insightTypes && insightTypes.length > 0
      ? insightTypes.map(t => `'${t}'`).join(",")
      : null;

    const rows = await db.execute(sql`
      SELECT
        id, insight_type, content, context, entity_id,
        source_agent, beneficiary_agents, quality_score, global_score,
        usage_count, is_approved, content_hash, created_at, updated_at
      FROM collective_insights
      WHERE
        is_approved = true
        AND (
          source_agent = ${agentRole}
          OR beneficiary_agents::text LIKE ${'%"' + agentRole + '"%'}
          OR beneficiary_agents::text LIKE '%"all"%'
        )
        ${entityId ? sql`AND (entity_id = ${entityId} OR entity_id IS NULL)` : sql``}
      ORDER BY global_score DESC, usage_count DESC
      LIMIT ${limit}
    `) as any[];

    return (rows || []).map(mapRowToInsight);
  } catch {
    return [];
  }
}

/**
 * Formatiert Collective Insights für den Prompt.
 */
export function formatCollectiveInsightsForPrompt(insights: CollectiveInsight[]): string {
  if (insights.length === 0) return "";

  const sections: Record<string, string[]> = {};
  for (const insight of insights) {
    if (!sections[insight.insightType]) sections[insight.insightType] = [];
    sections[insight.insightType].push(insight.content);
  }

  const lines: string[] = ["## Collective Intelligence (Gelernt aus allen Agenten)"];
  for (const [type, items] of Object.entries(sections)) {
    const label = INSIGHT_TYPE_LABELS[type as InsightType] || type;
    lines.push(`\n### ${label}`);
    items.forEach(item => lines.push(`- ${item}`));
  }

  return lines.join("\n");
}

/**
 * Gibt Collective Intelligence Stats zurück.
 */
export async function getCollectiveIntelligenceStats(): Promise<{
  totalInsights: number;
  approvedInsights: number;
  byType: Record<string, number>;
  byAgent: Record<string, number>;
  topInsights: Array<{ content: string; globalScore: number; usageCount: number }>;
  crossAgentPropagations: number;
}> {
  try {
    const total = await db.execute(sql`SELECT COUNT(*) as cnt FROM collective_insights`) as any[];
    const approved = await db.execute(sql`SELECT COUNT(*) as cnt FROM collective_insights WHERE is_approved = true`) as any[];
    const byType = await db.execute(sql`
      SELECT insight_type, COUNT(*) as cnt FROM collective_insights GROUP BY insight_type
    `) as any[];
    const byAgent = await db.execute(sql`
      SELECT source_agent, COUNT(*) as cnt FROM collective_insights GROUP BY source_agent
    `) as any[];
    const topInsights = await db.execute(sql`
      SELECT content, global_score, usage_count FROM collective_insights
      WHERE is_approved = true
      ORDER BY global_score DESC, usage_count DESC
      LIMIT 5
    `) as any[];
    const crossAgent = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM collective_insights
      WHERE beneficiary_agents != '[]' AND beneficiary_agents != 'null'
    `) as any[];

    return {
      totalInsights: parseInt(total?.[0]?.cnt || "0"),
      approvedInsights: parseInt(approved?.[0]?.cnt || "0"),
      byType: Object.fromEntries((byType || []).map((r: any) => [r.insight_type, parseInt(r.cnt)])),
      byAgent: Object.fromEntries((byAgent || []).map((r: any) => [r.source_agent, parseInt(r.cnt)])),
      topInsights: (topInsights || []).map((r: any) => ({
        content: r.content?.substring(0, 100) + "...",
        globalScore: parseFloat(r.global_score || "0"),
        usageCount: parseInt(r.usage_count || "0"),
      })),
      crossAgentPropagations: parseInt(crossAgent?.[0]?.cnt || "0"),
    };
  } catch {
    return { totalInsights: 0, approvedInsights: 0, byType: {}, byAgent: {}, topInsights: [], crossAgentPropagations: 0 };
  }
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

async function extractInsightsWithLLM(
  query: string,
  response: string,
  agentRole: string,
  entityId?: string
): Promise<Array<{ insightType: InsightType; content: string; context: string; qualityScore: number }>> {
  try {
    const systemPrompt = `Du bist ein Wissensextraktions-System für ein Peptid-Forschungsunternehmen.
Analysiere die folgende Konversation und extrahiere wertvolle Erkenntnisse.

Mögliche Insight-Typen: objection, question, explanation, sales_argument, support_solution, misconception, analogy, buying_signal, knowledge_gap, new_fact, user_need

Gib NUR Insights zurück die allgemein wiederverwendbar sind und Compliance-konform sind (keine Heilversprechen).
Antworte AUSSCHLIESSLICH als JSON: {"insights":[{"insightType":"...","content":"...","context":"...","qualityScore":0.8}]}`;

    const userPrompt = `Agent: ${agentRole}\nEntity: ${entityId || "allgemein"}\n\nFrage: ${query.substring(0, 500)}\n\nAntwort: ${response.substring(0, 1000)}\n\nExtrahiere Insights als JSON.`;

    const llmResponse = await invokeLLM(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { responseFormat: "json" }
    );

    const raw = llmResponse?.content || "{}";
    const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
    return parsed.insights || [];
  } catch {
    return [];
  }
}

function determineBeneficiaryAgents(insightType: InsightType, sourceAgent: string): string[] {
  const ALL_AGENTS = ["pepgpt", "salesgpt", "supportgpt"];

  const propagationMap: Record<InsightType, string[]> = {
    objection: ["salesgpt", "supportgpt"],
    question: ALL_AGENTS,
    explanation: ALL_AGENTS,
    sales_argument: ["salesgpt"],
    support_solution: ["supportgpt", "pepgpt"],
    misconception: ALL_AGENTS,
    analogy: ALL_AGENTS,
    buying_signal: ["salesgpt"],
    knowledge_gap: ALL_AGENTS,
    error_pattern: ALL_AGENTS,
    new_fact: ALL_AGENTS,
    user_need: ["salesgpt", "supportgpt"],
    competitor_mention: ["salesgpt"],
    compliance_issue: ALL_AGENTS,
  };

  return (propagationMap[insightType] || ALL_AGENTS).filter(a => a !== sourceAgent);
}

function mapRowToInsight(row: any): CollectiveInsight {
  return {
    id: row.id,
    insightType: row.insight_type as InsightType,
    content: row.content,
    context: row.context,
    entityId: row.entity_id,
    sourceAgent: row.source_agent,
    beneficiaryAgents: typeof row.beneficiary_agents === "string"
      ? JSON.parse(row.beneficiary_agents)
      : (row.beneficiary_agents || []),
    qualityScore: parseFloat(row.quality_score || "0"),
    globalScore: parseFloat(row.global_score || "0"),
    usageCount: parseInt(row.usage_count || "0"),
    isApproved: row.is_approved === true || row.is_approved === 1,
    contentHash: row.content_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  objection: "Einwände & Lösungen",
  question: "Häufige Fragen",
  explanation: "Erklärungen",
  sales_argument: "Kaufargumente",
  support_solution: "Support-Lösungen",
  misconception: "Missverständnisse",
  analogy: "Analogien",
  buying_signal: "Kaufsignale",
  knowledge_gap: "Wissenslücken",
  error_pattern: "Fehler-Muster",
  new_fact: "Neue Fakten",
  user_need: "Nutzerbedürfnisse",
  competitor_mention: "Konkurrenz-Erwähnungen",
  compliance_issue: "Compliance-Hinweise",
};
