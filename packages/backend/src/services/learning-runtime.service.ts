/**
 * learning-runtime.service.ts v2
 *
 * Learning Runtime — vollständig aktiviert.
 *
 * Pipeline für jede Anfrage:
 * User → Intent → Entity → Knowledge Graph
 *   → ähnliche Few-Shots (DB + JSON)
 *   → ähnliche reale Gespräche (Conversation Memory)
 *   → Long-Term Memory
 *   → Prompt Builder → LLM
 *
 * Nach jeder Antwort:
 * Chat → Learning Queue → Pipeline → Few-Shot + Graph + Memory Update
 */

import { readFileSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data");

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FewShotExample {
  id: string;
  tags: string[];
  context?: string;
  userQuery: string;
  idealResponse: string;
  quality: number;
  agentRole: string;
  source?: "json" | "db" | "learned";
}

export interface LearnedKnowledge {
  version: string;
  agentRole: string;
  examples: FewShotExample[];
  lastUpdated: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface LongTermMemoryEntry {
  memoryType: string;
  key: string;
  value: string;
  confidence: number;
  reinforcementCount: number;
}

export interface LearningContext {
  fewShots: FewShotExample[];
  conversationHistory: ConversationMessage[];
  longTermMemory: LongTermMemoryEntry[];
  similarChats: Array<{ query: string; response: string; quality: number }>;
}

// ─── File Cache ───────────────────────────────────────────────────────────────

const fileCache: Record<string, LearnedKnowledge> = {};

function loadKnowledgeFile(agentRole: string): LearnedKnowledge {
  if (fileCache[agentRole]) return fileCache[agentRole];
  const filePath = join(DATA_DIR, `${agentRole}_learned_knowledge.json`);
  if (!existsSync(filePath)) {
    const empty: LearnedKnowledge = { version: "1.0", agentRole, examples: [], lastUpdated: new Date().toISOString() };
    fileCache[agentRole] = empty;
    return empty;
  }
  try {
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as LearnedKnowledge;
    fileCache[agentRole] = data;
    return data;
  } catch (err) {
    console.error(`[learning-runtime] Failed to load ${filePath}:`, err);
    return { version: "1.0", agentRole, examples: [], lastUpdated: "" };
  }
}

// ─── Semantic Similarity ──────────────────────────────────────────────────────

function computeRelevanceScore(query: string, example: FewShotExample): number {
  const queryWords = new Set(
    query.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(w => w.length > 2)
  );
  let score = 0;
  for (const tag of example.tags) {
    const tagLower = tag.toLowerCase();
    if (queryWords.has(tagLower)) score += 0.4;
    else if (query.toLowerCase().includes(tagLower)) score += 0.25;
  }
  const exampleWords = example.userQuery.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
  let wordMatches = 0;
  for (const word of exampleWords) { if (queryWords.has(word)) wordMatches++; }
  if (exampleWords.length > 0) score += (wordMatches / exampleWords.length) * 0.3;
  score *= (0.5 + example.quality * 0.5);
  return Math.min(score, 1.0);
}

// ─── DB Few-Shots ─────────────────────────────────────────────────────────────

async function loadDbFewShots(agentRole: string, query: string, entitySlug?: string, topN: number = 5): Promise<FewShotExample[]> {
  try {
    const rows = await db.execute(sql`
      SELECT id, agent_role, entity_slug, tags, user_query, ideal_response, quality, source
      FROM learned_few_shots
      WHERE agent_role = ${agentRole} AND active = TRUE AND approved = TRUE
      ORDER BY quality DESC, usage_count DESC LIMIT 50
    `);
    const examples: FewShotExample[] = (rows as any[]).map(row => ({
      id: row.id, agentRole: row.agent_role,
      tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || "[]"),
      userQuery: row.user_query, idealResponse: row.ideal_response,
      quality: row.quality ?? 0.7, source: "db" as const,
      context: row.entity_slug ? `Entity: ${row.entity_slug}` : undefined,
    }));
    const scored = examples
      .map(ex => ({ ex, score: computeRelevanceScore(query, ex) }))
      .filter(({ score }) => score > 0.05)
      .sort((a, b) => b.score - a.score).slice(0, topN);
    for (const { ex } of scored) {
      db.execute(sql`UPDATE learned_few_shots SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = ${ex.id}`).catch(() => {});
    }
    return scored.map(({ ex }) => ex);
  } catch { return []; }
}

// ─── Conversation Memory ──────────────────────────────────────────────────────

export async function loadConversationHistory(sessionId: string, limit: number = 10): Promise<ConversationMessage[]> {
  try {
    const rows = await db.execute(sql`
      SELECT query, response, created_at FROM chat_sessions
      WHERE session_id = ${sessionId} ORDER BY created_at DESC LIMIT ${limit}
    `);
    const messages: ConversationMessage[] = [];
    for (const row of (rows as any[]).reverse()) {
      messages.push({ role: "user", content: row.query, timestamp: row.created_at });
      messages.push({ role: "assistant", content: row.response, timestamp: row.created_at });
    }
    return messages;
  } catch { return []; }
}

// ─── Similar Chats ────────────────────────────────────────────────────────────

async function loadSimilarChats(query: string, entitySlug?: string, agentRole?: string, limit: number = 3): Promise<Array<{ query: string; response: string; quality: number }>> {
  try {
    const rows = await db.execute(sql`
      SELECT query, response, quality_score FROM chat_sessions
      WHERE quality_score >= 0.7
        AND (${entitySlug ?? null} IS NULL OR entity_slug = ${entitySlug ?? null})
        AND (${agentRole ?? null} IS NULL OR agent_role = ${agentRole ?? null})
      ORDER BY quality_score DESC, created_at DESC LIMIT 100
    `);
    const queryWords = new Set(query.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(w => w.length > 2));
    const scored = (rows as any[]).map(row => {
      const chatWords = new Set((row.query as string).toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(w => w.length > 2));
      let overlap = 0;
      for (const w of queryWords) { if (chatWords.has(w)) overlap++; }
      const score = queryWords.size > 0 ? overlap / queryWords.size : 0;
      return { query: row.query, response: row.response, quality: row.quality_score ?? 0.7, score };
    }).filter(r => r.score > 0.3).sort((a, b) => b.score - a.score).slice(0, limit);
    return scored.map(r => ({ query: r.query, response: r.response, quality: r.quality }));
  } catch { return []; }
}

// ─── Long-Term Memory ─────────────────────────────────────────────────────────

export async function loadLongTermMemory(agentRole: string, entitySlug?: string): Promise<LongTermMemoryEntry[]> {
  try {
    const rows = await db.execute(sql`
      SELECT memory_type, key, value, confidence, reinforcement_count FROM long_term_memory
      WHERE agent_role = ${agentRole}
        AND (${entitySlug ?? null} IS NULL OR entity_slug = ${entitySlug ?? null} OR entity_slug IS NULL)
        AND active = TRUE AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY confidence DESC, reinforcement_count DESC LIMIT 20
    `);
    return (rows as any[]).map(row => ({
      memoryType: row.memory_type, key: row.key, value: row.value,
      confidence: row.confidence ?? 0.8, reinforcementCount: row.reinforcement_count ?? 1,
    }));
  } catch { return []; }
}

async function updateLongTermMemory(agentRole: string, entitySlug: string | undefined, memoryType: string, key: string, value: string, confidence: number = 0.7): Promise<void> {
  try {
    const id = randomUUID();
    await db.execute(sql`
      INSERT INTO long_term_memory (id, agent_role, entity_slug, memory_type, key, value, confidence, reinforcement_count)
      VALUES (${id}, ${agentRole}, ${entitySlug ?? null}, ${memoryType}, ${key}, ${value}, ${confidence}, 1)
      ON CONFLICT (agent_role, COALESCE(entity_slug, ''), memory_type, key)
      DO UPDATE SET value = EXCLUDED.value,
        confidence = LEAST(1.0, long_term_memory.confidence + 0.05),
        reinforcement_count = long_term_memory.reinforcement_count + 1,
        last_reinforced_at = NOW(), updated_at = NOW()
    `);
  } catch {}
}

// ─── Main Few-Shot Loader (v2) ────────────────────────────────────────────────

export async function loadFewShots(
  agentRole: string,
  query: string,
  topN: number = 3,
  options?: { entitySlug?: string; sessionId?: string }
): Promise<FewShotExample[]> {
  const knowledge = loadKnowledgeFile(agentRole);
  const jsonExamples = knowledge.examples
    .map(ex => ({ ex: { ...ex, source: "json" as const }, score: computeRelevanceScore(query, ex) }))
    .filter(({ score }) => score > 0.05)
    .sort((a, b) => b.score - a.score).slice(0, topN).map(({ ex }) => ex);

  const dbExamples = await loadDbFewShots(agentRole, query, options?.entitySlug, topN);

  const merged = [...dbExamples, ...jsonExamples];
  const seen = new Set<string>();
  const deduped: FewShotExample[] = [];
  for (const ex of merged) {
    const key = ex.userQuery.toLowerCase().slice(0, 50);
    if (!seen.has(key)) { seen.add(key); deduped.push(ex); }
  }
  return deduped.slice(0, topN);
}

// ─── Full Learning Context Loader ────────────────────────────────────────────

export async function loadLearningContext(
  agentRole: string,
  query: string,
  options?: { entitySlug?: string; sessionId?: string; topFewShots?: number }
): Promise<LearningContext> {
  const [fewShots, conversationHistory, longTermMemory, similarChats] = await Promise.all([
    loadFewShots(agentRole, query, options?.topFewShots ?? 3, options),
    options?.sessionId ? loadConversationHistory(options.sessionId, 8) : Promise.resolve([]),
    loadLongTermMemory(agentRole, options?.entitySlug),
    loadSimilarChats(query, options?.entitySlug, agentRole, 2),
  ]);
  return { fewShots, conversationHistory, longTermMemory, similarChats };
}

// ─── Format for Prompt ────────────────────────────────────────────────────────

export function formatFewShotsForPrompt(examples: FewShotExample[]): string {
  if (examples.length === 0) return "";
  const lines = ["## Beispiele erfolgreicher Antworten\n"];
  for (const ex of examples) {
    const sourceLabel = ex.source === "db" ? " [gelernt]" : ex.source === "learned" ? " [aus Gespräch]" : "";
    lines.push(`**Beispiel-Anfrage${sourceLabel}:** ${ex.userQuery}`);
    if (ex.context) lines.push(`**Kontext:** ${ex.context}`);
    lines.push(`**Ideale Antwort:** ${ex.idealResponse}`);
    lines.push("---");
  }
  return lines.join("\n");
}

export function formatLongTermMemoryForPrompt(memory: LongTermMemoryEntry[]): string {
  if (memory.length === 0) return "";
  const lines = ["## Langzeitgedächtnis (bekannte Muster)\n"];
  for (const m of memory) {
    lines.push(`- **${m.key}**: ${m.value} (Konfidenz: ${(m.confidence * 100).toFixed(0)}%)`);
  }
  return lines.join("\n");
}

export function formatSimilarChatsForPrompt(chats: Array<{ query: string; response: string; quality: number }>): string {
  if (chats.length === 0) return "";
  const lines = ["## Ähnliche Gespräche (Referenz)\n"];
  for (const chat of chats) {
    lines.push(`**Ähnliche Frage:** ${chat.query}`);
    lines.push(`**Antwort:** ${chat.response.slice(0, 300)}${chat.response.length > 300 ? "..." : ""}`);
    lines.push("---");
  }
  return lines.join("\n");
}

// ─── Persist Chat Session ─────────────────────────────────────────────────────

export async function persistChatSession(data: {
  sessionId: string; agentRole: string; apiKeyId?: string;
  entityId?: string; entitySlug?: string; query: string; response: string;
  intent?: string; knowledgeView?: string; fewShotsUsed?: number;
  promptTokens?: number; completionTokens?: number; processingMs?: number;
  validationPassed?: boolean; complianceFlags?: string[]; userLevel?: string;
}): Promise<string> {
  const id = randomUUID();
  try {
    await db.execute(sql`
      INSERT INTO chat_sessions (
        id, session_id, agent_role, api_key_id, entity_id, entity_slug,
        query, response, intent, knowledge_view, few_shots_used,
        prompt_tokens, completion_tokens, processing_ms,
        validation_passed, compliance_flags, user_level
      ) VALUES (
        ${id}, ${data.sessionId}, ${data.agentRole}, ${data.apiKeyId ?? null},
        ${data.entityId ?? null}, ${data.entitySlug ?? null},
        ${data.query}, ${data.response}, ${data.intent ?? null},
        ${data.knowledgeView ?? null}, ${data.fewShotsUsed ?? 0},
        ${data.promptTokens ?? null}, ${data.completionTokens ?? null},
        ${data.processingMs ?? null}, ${data.validationPassed ?? true},
        ${JSON.stringify(data.complianceFlags ?? [])}, ${data.userLevel ?? "intermediate"}
      )
    `);
    await enqueueLearning(id);
    if (data.entitySlug) {
      await updateLongTermMemory(data.agentRole, data.entitySlug, "entity_interest", `${data.entitySlug}_interest`, `Häufig angefragtes Compound: ${data.entitySlug}`, 0.6);
    }
    if (data.intent) {
      await updateLongTermMemory(data.agentRole, data.entitySlug, "intent_pattern", `${data.intent}_pattern`, `Häufiger Intent: ${data.intent}`, 0.5);
    }
  } catch (err) {
    console.error("[learning-runtime] Failed to persist chat session:", err);
  }
  return id;
}

// ─── Learning Queue ───────────────────────────────────────────────────────────

async function enqueueLearning(chatSessionId: string): Promise<void> {
  try {
    const id = randomUUID();
    await db.execute(sql`INSERT INTO learning_queue (id, session_id, status, priority) VALUES (${id}, ${chatSessionId}, 'pending', 5)`);
  } catch {}
}

// ─── Learning Pipeline Processor ─────────────────────────────────────────────

export async function processLearningQueue(maxItems: number = 10): Promise<{ processed: number; errors: number; newFewShots: number }> {
  let processed = 0, errors = 0, newFewShots = 0;
  try {
    const pending = await db.execute(sql`
      SELECT lq.id as queue_id, lq.session_id,
             cs.agent_role, cs.entity_slug, cs.query, cs.response,
             cs.intent, cs.validation_passed, cs.quality_score
      FROM learning_queue lq
      JOIN chat_sessions cs ON cs.id = lq.session_id
      WHERE lq.status = 'pending' AND lq.attempts < lq.max_attempts
        AND (lq.next_retry_at IS NULL OR lq.next_retry_at <= NOW())
      ORDER BY lq.priority DESC, lq.created_at ASC LIMIT ${maxItems}
    `);
    for (const row of pending as any[]) {
      try {
        await db.execute(sql`UPDATE learning_queue SET status = 'processing', attempts = attempts + 1 WHERE id = ${row.queue_id}`);
        const result = await processLearningItem(row);
        if (result.createdFewShot) newFewShots++;
        await db.execute(sql`UPDATE learning_queue SET status = 'done', processed_at = NOW(), result = ${JSON.stringify(result)} WHERE id = ${row.queue_id}`);
        processed++;
      } catch (err) {
        errors++;
        await db.execute(sql`UPDATE learning_queue SET status = 'error', error = ${String(err)}, next_retry_at = NOW() + INTERVAL '5 minutes' WHERE id = ${row.queue_id}`).catch(() => {});
      }
    }
  } catch (err) {
    console.error("[learning-runtime] Queue processing error:", err);
    errors++;
  }
  return { processed, errors, newFewShots };
}

async function processLearningItem(row: any): Promise<{ createdFewShot: boolean; qualityScore: number; actions: string[] }> {
  const actions: string[] = [];
  const qualityScore = computeQualityScore(row);
  actions.push(`quality_scored: ${qualityScore.toFixed(2)}`);
  await db.execute(sql`UPDATE chat_sessions SET quality_score = ${qualityScore} WHERE id = ${row.session_id}`);
  let createdFewShot = false;
  if (qualityScore >= 0.75 && row.validation_passed !== false) {
    const tags = extractTags(row.query, row.entity_slug, row.intent);
    const id = randomUUID();
    await db.execute(sql`
      INSERT INTO learned_few_shots (id, agent_role, entity_slug, tags, user_query, ideal_response, quality, source, source_session_id, approved)
      VALUES (${id}, ${row.agent_role}, ${row.entity_slug ?? null}, ${JSON.stringify(tags)}, ${row.query}, ${row.response}, ${qualityScore}, 'auto_learned', ${row.session_id}, ${qualityScore >= 0.85})
      ON CONFLICT DO NOTHING
    `);
    createdFewShot = true;
    actions.push(`few_shot_created: ${id} (approved: ${qualityScore >= 0.85})`);
    invalidateLearningCache(row.agent_role);
  }
  if (qualityScore >= 0.85 && row.entity_slug) {
    await syncTopFewShotsToJson(row.agent_role);
    actions.push("json_synced");
  }
  return { createdFewShot, qualityScore, actions };
}

function computeQualityScore(row: { response: string; validation_passed?: boolean; intent?: string }): number {
  let score = 0.5;
  if (row.validation_passed !== false) score += 0.15;
  const responseLen = row.response.length;
  if (responseLen > 200) score += 0.1;
  if (responseLen > 500) score += 0.05;
  if (row.response.includes("**") || row.response.includes("##")) score += 0.1;
  if (row.response.includes("1.") || row.response.includes("- ")) score += 0.05;
  if (row.response.toLowerCase().includes("research use only") || row.response.toLowerCase().includes("ruo") || row.response.toLowerCase().includes("forschungszweck")) score += 0.05;
  return Math.min(score, 1.0);
}

function extractTags(query: string, entitySlug?: string, intent?: string): string[] {
  const tags: string[] = [];
  if (entitySlug) tags.push(entitySlug);
  if (intent) tags.push(intent);
  const stopWords = new Set(["wie", "was", "warum", "wann", "welche", "der", "die", "das", "ein", "eine", "und", "oder", "ist", "sind", "hat", "haben", "für", "mit", "von", "bei", "nach", "über"]);
  const words = query.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
  tags.push(...words.slice(0, 5));
  return [...new Set(tags)];
}

async function syncTopFewShotsToJson(agentRole: string): Promise<void> {
  try {
    const rows = await db.execute(sql`
      SELECT id, agent_role, entity_slug, tags, user_query, ideal_response, quality
      FROM learned_few_shots WHERE agent_role = ${agentRole} AND active = TRUE AND approved = TRUE
      ORDER BY quality DESC, usage_count DESC LIMIT 20
    `);
    const examples: FewShotExample[] = (rows as any[]).map(row => ({
      id: row.id, agentRole: row.agent_role,
      tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || "[]"),
      userQuery: row.user_query, idealResponse: row.ideal_response,
      quality: row.quality, source: "learned" as const,
    }));
    const filePath = join(DATA_DIR, `${agentRole}_learned_knowledge.json`);
    let existing: LearnedKnowledge = { version: "2.0", agentRole, examples: [], lastUpdated: new Date().toISOString() };
    if (existsSync(filePath)) { try { existing = JSON.parse(readFileSync(filePath, "utf-8")); } catch {} }
    const manualExamples = existing.examples.filter(e => e.source !== "learned");
    const merged = [...examples, ...manualExamples].slice(0, 30);
    writeFileSync(filePath, JSON.stringify({ ...existing, version: "2.0", examples: merged, lastUpdated: new Date().toISOString() }, null, 2), "utf-8");
    delete fileCache[agentRole];
  } catch (err) {
    console.error("[learning-runtime] Failed to sync few-shots to JSON:", err);
  }
}

// ─── Cache Invalidation ───────────────────────────────────────────────────────

export function invalidateLearningCache(agentRole?: string): void {
  if (agentRole) { delete fileCache[agentRole]; }
  else { Object.keys(fileCache).forEach(k => delete fileCache[k]); }
}

// ─── Learning Stats ───────────────────────────────────────────────────────────

export async function getLearningStats(): Promise<{ totalChats: number; totalFewShots: number; approvedFewShots: number; pendingQueue: number; byRole: Record<string, { chats: number; fewShots: number }> }> {
  try {
    const [chatsResult, fewShotsResult, queueResult] = await Promise.all([
      db.execute(sql`SELECT agent_role, COUNT(*) as count FROM chat_sessions GROUP BY agent_role`),
      db.execute(sql`SELECT agent_role, COUNT(*) as total, SUM(CASE WHEN approved THEN 1 ELSE 0 END) as approved FROM learned_few_shots WHERE active = TRUE GROUP BY agent_role`),
      db.execute(sql`SELECT COUNT(*) as count FROM learning_queue WHERE status = 'pending'`),
    ]);
    const byRole: Record<string, { chats: number; fewShots: number }> = {};
    for (const row of chatsResult as any[]) {
      if (!byRole[row.agent_role]) byRole[row.agent_role] = { chats: 0, fewShots: 0 };
      byRole[row.agent_role].chats = parseInt(row.count);
    }
    let totalFewShots = 0, approvedFewShots = 0;
    for (const row of fewShotsResult as any[]) {
      if (!byRole[row.agent_role]) byRole[row.agent_role] = { chats: 0, fewShots: 0 };
      byRole[row.agent_role].fewShots = parseInt(row.total);
      totalFewShots += parseInt(row.total);
      approvedFewShots += parseInt(row.approved ?? 0);
    }
    const totalChats = Object.values(byRole).reduce((sum, r) => sum + r.chats, 0);
    const pendingQueue = parseInt((queueResult as any[])[0]?.count ?? "0");
    return { totalChats, totalFewShots, approvedFewShots, pendingQueue, byRole };
  } catch { return { totalChats: 0, totalFewShots: 0, approvedFewShots: 0, pendingQueue: 0, byRole: {} }; }
}
