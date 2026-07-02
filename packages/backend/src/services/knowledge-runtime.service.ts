/**
 * knowledge-runtime.service.ts
 *
 * Der zentrale Orchestrator des 369 Knowledge OS.
 * Jede Agenten-Anfrage läuft durch diese Runtime.
 *
 * Pipeline:
 * User → Intent → Memory → Knowledge OS → Product Runtime
 *      → Learning Runtime → Compliance → Prompt Builder
 *      → LLM → Validator → Antwort
 */

import { db } from "../db/index.js";
import { entities, contentBlocks, relations, agentAccessLog } from "../db/schema.js";
import { eq, or, inArray, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { invokeLLM } from "./llm-provider.service.js";
import { buildDynamicPrompt, PromptContext } from "./prompt-builder.service.js";
import { validateResponse, ValidationResult } from "./response-validator.service.js";
import { loadFewShots, loadConversationHistory, loadLongTermMemory, persistChatSession, formatLongTermMemoryForPrompt, LongTermMemoryEntry, ConversationMessage } from "./learning-runtime.service.js";
import { getProductContext } from "./product-runtime.service.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentRole = "pepgpt" | "salesgpt" | "supportgpt" | "academy" | "content";

export type UserLevel = "beginner" | "advanced" | "expert";

export interface RuntimeRequest {
  agentRole: AgentRole;
  query: string;
  entitySlug?: string;
  conversationHistory?: ConversationTurn[];
  sessionId?: string;
  apiKeyId?: string;
  outputScope?: "portal" | "shop" | "academy" | "agent" | "seo";
  userLevel?: UserLevel; // Optional: Beginner / Advanced / Expert
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface RuntimeResponse {
  answer: string;
  entitySlug?: string;
  entityName?: string;
  knowledgeUsed: string[];
  fewShotsUsed: number;
  complianceFlags: string[];
  validationPassed: boolean;
  validationWarnings: string[];
  queryId: string;
  meta: {
    intentDetected: string;
    knowledgeViewUsed: string;
    userLevelDetected: string;
    promptTokens?: number;
    completionTokens?: number;
    processingMs: number;
  };
}

export interface KnowledgeView {
  entity: any;
  blocks: any[];
  relations: any[];
  agentContext?: any;
}

// ─── Intent Detection ─────────────────────────────────────────────────────────

const INTENT_PATTERNS: Record<string, RegExp[]> = {
  product_info: [/preis|kosten|kaufen|bestellen|shop|produkt|verfügbar/i],
  mechanism: [/wirk|mechanismus|wie funktioniert|signalweg|rezeptor|protein/i],
  research: [/studie|forschung|evidenz|pubmed|klinisch|tier|in vitro/i],
  faq: [/was ist|was sind|erkläre|erklär|definition|bedeutet/i],
  stack: [/kombination|stack|zusammen|synerg|protokoll/i],
  academy: [/lernen|kurs|modul|kapitel|academy|vertiefung/i],
  support: [/problem|fehler|hilfe|support|frage|verstehe nicht/i],
  sales: [/empfehlung|welches|welche|für mich|ziel|abnehmen|aufbauen|regeneration/i],
  compliance: [/dosier|dosis|einnahme|anwenden|human|mensch/i],
};

export function detectIntent(query: string): string {
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some(p => p.test(query))) return intent;
  }
  return "general";
}

// ─── Knowledge View Selector ──────────────────────────────────────────────────

export function selectKnowledgeView(
  agentRole: AgentRole,
  intent: string
): "portal" | "shop" | "academy" | "agent" | "seo" {
  if (agentRole === "salesgpt" || intent === "product_info") return "shop";
  if (agentRole === "academy" || intent === "academy") return "academy";
  if (intent === "seo") return "seo";
  return "agent"; // Default: agent view (most complete)
}

// ─── Knowledge OS Loader ──────────────────────────────────────────────────────

export async function loadKnowledgeView(
  slug: string,
  system: "portal" | "shop" | "academy" | "agent" | "seo"
): Promise<KnowledgeView | null> {
  // Load entity
  let [entity] = await db.select().from(entities)
    .where(eq(entities.slug, slug)).limit(1);
  if (!entity) {
    [entity] = await db.select().from(entities)
      .where(eq(entities.id, slug)).limit(1);
  }
  if (!entity) return null;

  // Scope mapping
  const scopeMap: Record<string, string[]> = {
    portal: ["portal", "bedo"],
    shop: ["shop", "bedo"],
    academy: ["academy", "bedo"],
    agent: ["portal", "shop", "academy", "agent", "bedo"],
    seo: ["seo", "portal", "bedo"],
  };
  const allowedScopes = scopeMap[system] ?? ["portal"];

  // Load blocks filtered by scope
  const allBlocks = await db.select().from(contentBlocks)
    .where(eq(contentBlocks.entityId, entity.id))
    .orderBy(contentBlocks.sortOrder);

  const filteredBlocks = allBlocks.filter(b => {
    const blockScope: string[] = Array.isArray(b.scope) ? b.scope : [];
    return blockScope.some(s => allowedScopes.includes(s));
  });

  // Load relations
  const rels = await db.select().from(relations).where(
    or(
      eq(relations.fromEntityId, entity.id),
      eq(relations.toEntityId, entity.id)
    )
  );

  // Load relation targets
  const targetIds = [...new Set(rels.map(r =>
    r.fromEntityId === entity.id ? r.toEntityId : r.fromEntityId
  ))].filter(Boolean);

  let relTargets: Record<string, any> = {};
  if (targetIds.length > 0) {
    const targets = await db.select({
      id: entities.id, slug: entities.slug,
      canonicalName: entities.canonicalName, type: entities.type,
    }).from(entities).where(inArray(entities.id, targetIds));
    relTargets = Object.fromEntries(targets.map(e => [e.id, e]));
  }

  const enrichedRelations = rels.map(r => ({
    ...r,
    target: relTargets[r.fromEntityId === entity.id ? r.toEntityId : r.fromEntityId] ?? null,
    direction: r.fromEntityId === entity.id ? "outgoing" : "incoming",
  }));

  // Agent context
  const agentContext = system === "agent" ? {
    shortSummary: (entity as any).agentShortSummary,
    keyMechanisms: (entity as any).agentKeyMechanisms ?? [],
    complianceFlags: (entity as any).agentComplianceFlags ?? ["ruo_only"],
    researchContext: (entity as any).agentResearchContext,
    salesPitch: (entity as any).agentSalesPitch,
    supportFaq: (entity as any).agentSupportFaq ?? [],
    medicalDisclaimer: (entity as any).agentMedicalDisclaimer,
  } : undefined;

  return { entity, blocks: filteredBlocks, relations: enrichedRelations, agentContext };
}

// ─── Entity Resolver ──────────────────────────────────────────────────────────

export async function resolveEntityFromQuery(query: string): Promise<string | null> {
  // Load all published compound slugs
  const compounds = await db.select({
    slug: entities.slug,
    canonicalName: entities.canonicalName,
    aliases: entities.aliases,
  }).from(entities)
    .where(and(
      eq(entities.type, "compound"),
      eq(entities.lifecycleStatus, "published")
    ));

  const queryLower = query.toLowerCase();

  for (const c of compounds) {
    if (c.slug && queryLower.includes(c.slug.toLowerCase())) return c.slug;
    if (queryLower.includes(c.canonicalName.toLowerCase())) return c.slug;
    const aliases: string[] = Array.isArray(c.aliases) ? c.aliases : [];
    if (aliases.some(a => queryLower.includes(a.toLowerCase()))) return c.slug;
  }

  return null;
}

// ─── User Level Detection ────────────────────────────────────────────────────

export function detectUserLevel(query: string, history: ConversationTurn[]): UserLevel {
  const expertTerms = /signalweg|rezeptor|phosphorylierung|mrna|transkription|kinase|peptidsequenz|aminosäure|halbwertszeit|bioavailabilität|pharmakokinetik|in vitro|in vivo|randomisiert|kontrolliert|placebo|meta-analyse/i;
  const advancedTerms = /mechanismus|studie|evidenz|forschung|stack|kombination|synerg|protokoll|dosier|wirkung|effekt|peptid|compound/i;

  const allText = query + " " + history.map(h => h.content).join(" ");

  if (expertTerms.test(allText)) return "expert";
  if (advancedTerms.test(allText)) return "advanced";
  return "beginner";
}

// ─── Main Runtime Function ────────────────────────────────────────────────────

export async function runKnowledgeRuntime(
  request: RuntimeRequest
): Promise<RuntimeResponse> {
  const startMs = Date.now();
  const queryId = randomUUID();

  // 1. Intent Detection
  const intent = detectIntent(request.query);

  // 2. Entity Resolution
  const entitySlug = request.entitySlug ?? await resolveEntityFromQuery(request.query);

  // 3. Knowledge View Selection
  const knowledgeView = selectKnowledgeView(request.agentRole, intent);

  // 4. Load Knowledge OS
  let knowledge: KnowledgeView | null = null;
  if (entitySlug) {
    knowledge = await loadKnowledgeView(entitySlug, knowledgeView);
  }

  // 5. Product Runtime
  const productContext = entitySlug
    ? await getProductContext(entitySlug)
    : null;

  // 6. Learning Runtime — Few-Shot Loading + Conversation Memory + Long-Term Memory
  const sessionId = request.sessionId ?? queryId;
  const [fewShots, dbConversationHistory, longTermMemory] = await Promise.all([
    loadFewShots(request.agentRole, request.query, 3, { entitySlug: entitySlug ?? undefined, sessionId }),
    request.sessionId ? loadConversationHistory(request.sessionId, 8) : Promise.resolve([]),
    loadLongTermMemory(request.agentRole, entitySlug ?? undefined),
  ]);

  // Merge: prefer request-provided history, fall back to DB history
  const conversationHistory = (request.conversationHistory && request.conversationHistory.length > 0)
    ? request.conversationHistory
    : dbConversationHistory.map(m => ({ role: m.role, content: m.content }));

  // Format long-term memory for prompt
  const longTermMemoryText = formatLongTermMemoryForPrompt(longTermMemory);

  // 6b. Auto-detect user level from conversation history if not provided
  const userLevel: UserLevel = request.userLevel ?? detectUserLevel(request.query, conversationHistory);

  // 7. Build Prompt
  const promptCtx: PromptContext = {
    agentRole: request.agentRole,
    intent,
    query: request.query,
    conversationHistory,
    knowledge,
    productContext,
    fewShots,
    knowledgeViewUsed: knowledgeView,
    entitySlug: entitySlug ?? undefined,
    longTermMemoryText,
    userLevel,
  };

  const { systemPrompt, userPrompt } = buildDynamicPrompt(promptCtx);

  // 8. LLM Call
  const llmResponse = await invokeLLM(
    [
      { role: "system", content: systemPrompt },
      ...(request.conversationHistory ?? []).map(t => ({
        role: t.role as "user" | "assistant",
        content: t.content,
      })),
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.4, maxTokens: 1500 }
  );

  const rawAnswer = llmResponse.content;

  // 9. Response Validation
  const validation: ValidationResult = validateResponse(rawAnswer, {
    agentRole: request.agentRole,
    intent,
    entitySlug: entitySlug ?? undefined,
    knowledge,
  });

  // 10. Apply corrections if needed
  const finalAnswer = validation.correctedAnswer ?? rawAnswer;

  // 11. Persist query log + Chat Session (Learning Pipeline)
  const complianceFlags: string[] = knowledge?.agentContext?.complianceFlags ?? ["ruo_only"];
  const processingMs = Date.now() - startMs;

  // Persist to chat_sessions (triggers learning pipeline)
  persistChatSession({
    sessionId,
    agentRole: request.agentRole,
    apiKeyId: request.apiKeyId,
    entityId: knowledge?.entity?.id,
    entitySlug: entitySlug ?? undefined,
    query: request.query,
    response: finalAnswer,
    intent,
    knowledgeView,
    fewShotsUsed: fewShots.length,
    promptTokens: llmResponse.usage?.prompt_tokens,
    completionTokens: llmResponse.usage?.completion_tokens,
    processingMs,
    validationPassed: validation.passed,
    complianceFlags,
  }).catch(() => {}); // fire-and-forget

  // Also log to agentAccessLog
  try {
    await db.insert(agentAccessLog).values({
      id: queryId,
      agentKeyId: request.apiKeyId ?? null,
      agentRole: request.agentRole as any,
      endpoint: "/api/runtime/query",
      method: "POST",
      entityId: knowledge?.entity?.id ?? null,
      statusCode: 200,
      durationMs: processingMs,
    });
  } catch {
    // Non-critical
  }

  return {
    answer: finalAnswer,
    entitySlug: entitySlug ?? undefined,
    entityName: knowledge?.entity?.canonicalName,
    knowledgeUsed: knowledge ? [entitySlug!] : [],
    fewShotsUsed: fewShots.length,
    complianceFlags,
    validationPassed: validation.passed,
    validationWarnings: validation.warnings,
    queryId,
    meta: {
      intentDetected: intent,
      knowledgeViewUsed: knowledgeView,
      userLevelDetected: userLevel,
      promptTokens: llmResponse.usage?.prompt_tokens,
      completionTokens: llmResponse.usage?.completion_tokens,
      processingMs,
    },
  };
}
