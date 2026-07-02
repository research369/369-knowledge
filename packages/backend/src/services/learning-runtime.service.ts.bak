/**
 * learning-runtime.service.ts
 *
 * Learning Runtime — lädt Few-Shot-Beispiele aus den learned_knowledge.json Dateien.
 * Vor jedem LLM-Call werden die relevantesten Muster geladen.
 * Nicht alle — nur die Top-N passend zur Anfrage.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data");

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FewShotExample {
  id: string;
  tags: string[];
  context?: string;
  userQuery: string;
  idealResponse: string;
  quality: number; // 0-1
  agentRole: string;
}

export interface LearnedKnowledge {
  version: string;
  agentRole: string;
  examples: FewShotExample[];
  lastUpdated: string;
}

// ─── File Cache ───────────────────────────────────────────────────────────────

const fileCache: Record<string, LearnedKnowledge> = {};

function loadKnowledgeFile(agentRole: string): LearnedKnowledge {
  if (fileCache[agentRole]) return fileCache[agentRole];

  const filePath = join(DATA_DIR, `${agentRole}_learned_knowledge.json`);

  if (!existsSync(filePath)) {
    // Return empty knowledge if file doesn't exist yet
    const empty: LearnedKnowledge = {
      version: "1.0",
      agentRole,
      examples: [],
      lastUpdated: new Date().toISOString(),
    };
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

// ─── Semantic Similarity (keyword-based) ─────────────────────────────────────
// Lightweight keyword matching — no embedding needed.
// Scores based on shared keywords between query and example.

function computeRelevanceScore(query: string, example: FewShotExample): number {
  const queryWords = new Set(
    query.toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3)
  );

  let score = 0;

  // Check tags
  for (const tag of example.tags) {
    if (queryWords.has(tag.toLowerCase())) score += 0.3;
    if (query.toLowerCase().includes(tag.toLowerCase())) score += 0.2;
  }

  // Check example query words
  const exampleWords = example.userQuery.toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3);

  for (const word of exampleWords) {
    if (queryWords.has(word)) score += 0.1;
  }

  // Boost by quality
  score *= (0.5 + example.quality * 0.5);

  return Math.min(score, 1.0);
}

// ─── Main Few-Shot Loader ─────────────────────────────────────────────────────

export async function loadFewShots(
  agentRole: string,
  query: string,
  topN: number = 3
): Promise<FewShotExample[]> {
  const knowledge = loadKnowledgeFile(agentRole);

  if (knowledge.examples.length === 0) return [];

  // Score all examples
  const scored = knowledge.examples
    .map(ex => ({ ex, score: computeRelevanceScore(query, ex) }))
    .filter(({ score }) => score > 0.1) // Minimum relevance threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return scored.map(({ ex }) => ex);
}

// ─── Format Few-Shots for Prompt ─────────────────────────────────────────────

export function formatFewShotsForPrompt(examples: FewShotExample[]): string {
  if (examples.length === 0) return "";

  const lines = ["## Beispiele erfolgreicher Antworten\n"];

  for (const ex of examples) {
    lines.push(`**Beispiel-Anfrage:** ${ex.userQuery}`);
    if (ex.context) lines.push(`**Kontext:** ${ex.context}`);
    lines.push(`**Ideale Antwort:** ${ex.idealResponse}`);
    lines.push("---");
  }

  return lines.join("\n");
}

// ─── Cache Invalidation ───────────────────────────────────────────────────────

export function invalidateLearningCache(agentRole?: string): void {
  if (agentRole) {
    delete fileCache[agentRole];
  } else {
    Object.keys(fileCache).forEach(k => delete fileCache[k]);
  }
}
