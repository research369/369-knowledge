/**
 * pattern-library.service.ts
 *
 * Phase 3 — Continuous Improvement
 *
 * Automatische Mustererkennung aus Chat-Konversationen.
 * Erkennt und speichert:
 *   - Neue Einwände (objection)
 *   - Neue Fragen (question)
 *   - Neue Erklärungen/Analogien (explanation)
 *   - Neue Kaufargumente (sales_argument)
 *   - Neue Support-Lösungen (support_solution)
 *   - Neue Fehler/Missverständnisse (misconception)
 *
 * Wird nach jeder Konversation automatisch aufgerufen.
 * ADDITIV — verändert keine bestehenden Funktionen.
 */

import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { invokeLLM } from "./llm-provider.service.js";

// ─── Typen ────────────────────────────────────────────────────────────────────

export type PatternType =
  | "objection"
  | "question"
  | "explanation"
  | "sales_argument"
  | "support_solution"
  | "misconception"
  | "analogy"
  | "buying_signal";

export interface DetectedPattern {
  patternType: PatternType;
  patternText: string;
  exampleQuery: string;
  exampleResponse: string;
  entityId?: string;
  agentRole: string;
  qualityScore: number;
}

// ─── Haupt-Funktion ───────────────────────────────────────────────────────────

/**
 * Analysiert eine Chat-Session auf neue Muster.
 * Wird nach jeder Konversation aufgerufen.
 */
export async function analyzeConversationForPatterns(
  chatSessionId: string,
  agentRole: string,
  entityId?: string
): Promise<{ detected: number; saved: number }> {
  try {
    // Chat-Session laden
    const session = await loadChatSession(chatSessionId);
    if (!session || session.messages.length < 2) {
      return { detected: 0, saved: 0 };
    }

    // LLM-Analyse der Konversation
    const patterns = await detectPatternsWithLLM(session, agentRole, entityId);

    if (patterns.length === 0) {
      return { detected: 0, saved: 0 };
    }

    // Muster speichern (Duplikate vermeiden)
    let saved = 0;
    for (const pattern of patterns) {
      const wasSaved = await savePattern(pattern, chatSessionId);
      if (wasSaved) saved++;
    }

    console.log(`[pattern-library] Session ${chatSessionId}: ${patterns.length} detected, ${saved} saved`);
    return { detected: patterns.length, saved };
  } catch (err: any) {
    console.error(`[pattern-library] Error analyzing session ${chatSessionId}:`, err?.message);
    return { detected: 0, saved: 0 };
  }
}

// ─── LLM-Analyse ─────────────────────────────────────────────────────────────

async function detectPatternsWithLLM(
  session: any,
  agentRole: string,
  entityId?: string
): Promise<DetectedPattern[]> {
  const conversationText = session.messages
    .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const prompt = `Analysiere diese Konversation zwischen einem Nutzer und dem ${agentRole}-Agenten von 369 Research.

KONVERSATION:
${conversationText.substring(0, 3000)}

Erkenne NEUE, WERTVOLLE Muster die das System verbessern können:

1. EINWÄNDE (objection): Hat der Nutzer Bedenken geäußert? Wie wurde damit umgegangen?
2. FRAGEN (question): Welche Fragen wurden gestellt die häufig auftreten könnten?
3. ERKLÄRUNGEN (explanation): Gab es besonders gute oder schlechte Erklärungen?
4. KAUFARGUMENTE (sales_argument): Welche Argumente haben überzeugt?
5. SUPPORT-LÖSUNGEN (support_solution): Wie wurde ein Problem gelöst?
6. MISSVERSTÄNDNISSE (misconception): Gab es falsche Annahmen des Nutzers?
7. ANALOGIEN (analogy): Wurden gute Vergleiche/Analogien verwendet?
8. KAUFSIGNALE (buying_signal): Welche Aussagen zeigten Kaufbereitschaft?

Gib NUR Muster zurück die WIRKLICH NEU und WERTVOLL sind.
Maximal 3 Muster pro Analyse.

JSON-Format:
{
  "patterns": [
    {
      "pattern_type": "objection|question|explanation|sales_argument|support_solution|misconception|analogy|buying_signal",
      "pattern_text": "Beschreibung des Musters (max. 200 Zeichen)",
      "example_query": "Beispiel-Nutzeranfrage",
      "example_response": "Beste Antwort auf dieses Muster",
      "quality_score": 0.7
    }
  ]
}`;

  try {
    const response = await invokeLLM(
      [
        { role: "system", content: "Du bist ein Pattern-Erkennungs-System für Konversationsanalyse. Antworte immer als valides JSON." },
        { role: "user", content: prompt },
      ],
      { temperature: 0.2, responseFormat: "json" }
    );

    const raw = response.content ?? "{}";
    const parsed = JSON.parse(raw);
    const patterns = parsed.patterns ?? [];

    return patterns
      .filter((p: any) => p.quality_score >= 0.5)
      .map((p: any) => ({
        patternType: p.pattern_type as PatternType,
        patternText: p.pattern_text,
        exampleQuery: p.example_query,
        exampleResponse: p.example_response,
        entityId,
        agentRole,
        qualityScore: p.quality_score,
      }));
  } catch {
    return [];
  }
}

// ─── Speichern ────────────────────────────────────────────────────────────────

async function savePattern(
  pattern: DetectedPattern,
  chatSessionId: string
): Promise<boolean> {
  try {
    // Ähnliches Muster suchen (Duplikat-Check via Text-Ähnlichkeit)
    const existing = await db.execute(sql`
      SELECT id, frequency, source_chat_ids
      FROM pattern_library
      WHERE agent_role = ${pattern.agentRole}
        AND pattern_type = ${pattern.patternType}
        AND pattern_text ILIKE ${'%' + pattern.patternText.substring(0, 50) + '%'}
      LIMIT 1
    `) as any[];

    if (existing && existing.length > 0) {
      // Existierendes Muster: Frequenz erhöhen
      const existingItem = existing[0];
      const sourceChatIds = existingItem.source_chat_ids ?? [];
      if (!sourceChatIds.includes(chatSessionId)) {
        sourceChatIds.push(chatSessionId);
        await db.execute(sql`
          UPDATE pattern_library
          SET
            frequency = frequency + 1,
            source_chat_ids = ${JSON.stringify(sourceChatIds)}::jsonb,
            updated_at = NOW()
          WHERE id = ${existingItem.id}
        `);
      }
      return false; // Kein neues Muster
    }

    // Neues Muster speichern
    await db.execute(sql`
      INSERT INTO pattern_library
        (id, pattern_type, agent_role, entity_id, pattern_text,
         example_query, example_response, frequency, quality_score,
         status, source_chat_ids, created_at, updated_at)
      VALUES
        (${uuidv4()}, ${pattern.patternType}, ${pattern.agentRole},
         ${pattern.entityId ?? null}, ${pattern.patternText},
         ${pattern.exampleQuery}, ${pattern.exampleResponse},
         1, ${pattern.qualityScore}, 'pending',
         ${JSON.stringify([chatSessionId])}::jsonb,
         NOW(), NOW())
    `);
    return true;
  } catch (err: any) {
    console.error(`[pattern-library] Error saving pattern:`, err?.message);
    return false;
  }
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

async function loadChatSession(sessionId: string): Promise<any | null> {
  const result = await db.execute(sql`
    SELECT id, messages, agent_role, entity_slug
    FROM chat_sessions
    WHERE id = ${sessionId}
    LIMIT 1
  `) as any[];

  if (!result || result.length === 0) return null;
  return {
    id: result[0].id,
    messages: result[0].messages ?? [],
    agentRole: result[0].agent_role,
    entitySlug: result[0].entity_slug,
  };
}

// ─── Abruf ────────────────────────────────────────────────────────────────────

/**
 * Relevante Muster für einen Agenten und eine Entity abrufen.
 * Wird vom Prompt Builder verwendet.
 */
export async function getRelevantPatterns(
  agentRole: string,
  entityId?: string,
  limit = 5
): Promise<DetectedPattern[]> {
  const result = await db.execute(sql`
    SELECT pattern_type, pattern_text, example_query, example_response,
           entity_id, agent_role, quality_score
    FROM pattern_library
    WHERE agent_role = ${agentRole}
      AND status = 'approved'
      AND (${entityId ?? null} IS NULL OR entity_id = ${entityId ?? null} OR entity_id IS NULL)
    ORDER BY frequency DESC, quality_score DESC
    LIMIT ${limit}
  `) as any[];

  return (result ?? []).map((r: any) => ({
    patternType: r.pattern_type as PatternType,
    patternText: r.pattern_text,
    exampleQuery: r.example_query,
    exampleResponse: r.example_response,
    entityId: r.entity_id,
    agentRole: r.agent_role,
    qualityScore: r.quality_score,
  }));
}

/**
 * Pattern-Statistiken abrufen.
 */
export async function getPatternStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  byType: Record<string, number>;
  byAgent: Record<string, number>;
}> {
  const stats = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'approved') as approved,
      pattern_type,
      agent_role
    FROM pattern_library
    GROUP BY pattern_type, agent_role
  `) as any[];

  const byType: Record<string, number> = {};
  const byAgent: Record<string, number> = {};
  let total = 0;
  let pending = 0;
  let approved = 0;

  for (const row of stats ?? []) {
    byType[row.pattern_type] = (byType[row.pattern_type] ?? 0) + parseInt(row.total);
    byAgent[row.agent_role] = (byAgent[row.agent_role] ?? 0) + parseInt(row.total);
    total += parseInt(row.total);
    pending += parseInt(row.pending);
    approved += parseInt(row.approved);
  }

  return { total, pending, approved, byType, byAgent };
}
