/**
 * Governance Service — Content Governance Layer
 * Architecture Freeze v1.0 — 08.07.2026
 *
 * Implements:
 * - Content Quality Score (0–100) per entity
 * - Knowledge Graph Validation (orphans, duplicates, missing fields)
 * - Governance enforcement helpers
 */

import { db } from "../db/index.js";
import { entities, relations, sources, contentBlocks } from "../db/schema.js";
import { eq, sql, inArray, and } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContentQualityScore {
  entityId: string;
  total: number; // 0–100
  breakdown: {
    completeness: number;     // 0–20: canonical name, description, type, categories, tags
    evidence: number;         // 0–20: evidenceLevel + sourceCount
    relations: number;        // 0–15: at least 1 relation
    contentBlocks: number;    // 0–15: at least 1 published content block
    faq: number;              // 0–10: agentSupportFaq not empty
    academy: number;          // 0–10: academyModuleIds not empty
    seo: number;              // 0–10: seoTitle + seoDescription
    freshness: number;        // 0–10: updatedAt within 90 days = 10, 180 days = 5, older = 0
  };
  issues: string[];
}

export interface GraphValidationReport {
  generatedAt: string;
  totalEntities: number;
  orphanedEntities: string[];         // entities with 0 relations
  missingRequiredFields: Array<{ entityId: string; missingFields: string[] }>;
  missingTopics: string[];            // entities with no topic assignment
  missingCategories: string[];        // entities with empty categories
  missingSources: string[];           // entities with sourceCount = 0
  duplicateSlugs: Array<{ slug: string; entityIds: string[] }>;
  lifecycleDistribution: Record<string, number>;
  publishedCount: number;
  draftCount: number;
  reviewCount: number;
  qualityScoreDistribution: {
    excellent: number;   // 80–100
    good: number;        // 60–79
    fair: number;        // 40–59
    poor: number;        // 0–39
  };
}

// ─── Content Quality Score ────────────────────────────────────────────────────

export async function calculateQualityScore(entityId: string): Promise<ContentQualityScore> {
  const [entity] = await db.select().from(entities).where(eq(entities.id, entityId)).limit(1);
  if (!entity) {
    return { entityId, total: 0, breakdown: { completeness: 0, evidence: 0, relations: 0, contentBlocks: 0, faq: 0, academy: 0, seo: 0, freshness: 0 }, issues: ["Entity not found"] };
  }

  const issues: string[] = [];
  const breakdown = { completeness: 0, evidence: 0, relations: 0, contentBlocks: 0, faq: 0, academy: 0, seo: 0, freshness: 0 };

  // 1. Completeness (0–20)
  let completenessScore = 0;
  if (entity.canonicalName) completenessScore += 5;
  if (entity.shortDescription) completenessScore += 5;
  if (entity.type) completenessScore += 3;
  const cats = (entity.categories as string[]) ?? [];
  if (cats.length > 0) completenessScore += 4;
  else issues.push("Missing categories");
  const tags = (entity.tags as string[]) ?? [];
  if (tags.length > 0) completenessScore += 3;
  else issues.push("Missing tags");
  breakdown.completeness = completenessScore;

  // 2. Evidence (0–20)
  let evidenceScore = 0;
  const el = (entity as any).evidenceLevel;
  if (el) {
    const levelScores: Record<string, number> = { meta_analysis: 20, rct: 18, review: 15, clinical: 12, pilot_human: 10, animal: 7, in_vitro: 5, preclinical: 3, anecdotal: 1 };
    evidenceScore = Math.min(10, levelScores[el] ?? 0);
  } else {
    issues.push("Missing evidence level");
  }
  const sc = (entity as any).sourceCount ?? 0;
  if (sc >= 5) evidenceScore += 10;
  else if (sc >= 3) evidenceScore += 7;
  else if (sc >= 1) evidenceScore += 4;
  else issues.push("No sources linked");
  breakdown.evidence = Math.min(20, evidenceScore);

  // 3. Relations (0–15)
  const [relCount] = await db.select({ count: sql<number>`count(*)::int` }).from(relations).where(
    sql`${relations.fromEntityId} = ${entityId} OR ${relations.toEntityId} = ${entityId}`
  );
  const rc = relCount?.count ?? 0;
  if (rc >= 5) breakdown.relations = 15;
  else if (rc >= 3) breakdown.relations = 10;
  else if (rc >= 1) breakdown.relations = 7;
  else { breakdown.relations = 0; issues.push("No relations — orphaned entity"); }

  // 4. Content Blocks (0–15)
  const [blockCount] = await db.select({ count: sql<number>`count(*)::int` }).from(contentBlocks).where(
    and(eq(contentBlocks.entityId, entityId), eq(contentBlocks.lifecycleStatus, "published" as any))
  );
  const bc = blockCount?.count ?? 0;
  if (bc >= 3) breakdown.contentBlocks = 15;
  else if (bc >= 1) breakdown.contentBlocks = 8;
  else { breakdown.contentBlocks = 0; issues.push("No published content blocks"); }

  // 5. FAQ (0–10)
  const faq = (entity as any).agentSupportFaq as any[];
  if (faq && faq.length >= 3) breakdown.faq = 10;
  else if (faq && faq.length >= 1) breakdown.faq = 5;
  else { breakdown.faq = 0; issues.push("No FAQ entries"); }

  // 6. Academy (0–10)
  const academyIds = (entity.academyModuleIds as string[]) ?? [];
  if (academyIds.length > 0) breakdown.academy = 10;
  else breakdown.academy = 0; // Not an issue — optional

  // 7. SEO (0–10)
  let seoScore = 0;
  if (entity.seoTitle) seoScore += 5;
  else issues.push("Missing SEO title");
  if (entity.seoDescription) seoScore += 5;
  else issues.push("Missing SEO description");
  breakdown.seo = seoScore;

  // 8. Freshness (0–10)
  const updatedAt = entity.updatedAt ? new Date(entity.updatedAt) : null;
  if (updatedAt) {
    const daysSince = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 90) breakdown.freshness = 10;
    else if (daysSince <= 180) breakdown.freshness = 5;
    else if (daysSince <= 365) breakdown.freshness = 2;
    else { breakdown.freshness = 0; issues.push("Content not updated in over 1 year"); }
  }

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { entityId, total: Math.min(100, total), breakdown, issues };
}

// ─── Knowledge Graph Validation ───────────────────────────────────────────────

export async function validateKnowledgeGraph(): Promise<GraphValidationReport> {
  const allEntities = await db.select({
    id: entities.id,
    slug: entities.slug,
    canonicalName: entities.canonicalName,
    type: entities.type,
    categories: entities.categories,
    tags: entities.tags,
    shortDescription: entities.shortDescription,
    lifecycleStatus: entities.lifecycleStatus,
    status: entities.status,
    seoTitle: entities.seoTitle,
    seoDescription: entities.seoDescription,
    updatedAt: entities.updatedAt,
  }).from(entities);

  const allRelations = await db.select({
    fromEntityId: relations.fromEntityId,
    toEntityId: relations.toEntityId,
  }).from(relations);

  // Build relation set
  const entityRelationCount: Record<string, number> = {};
  for (const rel of allRelations) {
    entityRelationCount[rel.fromEntityId] = (entityRelationCount[rel.fromEntityId] ?? 0) + 1;
    entityRelationCount[rel.toEntityId] = (entityRelationCount[rel.toEntityId] ?? 0) + 1;
  }

  const orphanedEntities: string[] = [];
  const missingRequiredFields: Array<{ entityId: string; missingFields: string[] }> = [];
  const missingCategories: string[] = [];
  const missingTopics: string[] = []; // Placeholder — topic_relations check would need join
  const lifecycleDistribution: Record<string, number> = {};
  let publishedCount = 0;
  let draftCount = 0;
  let reviewCount = 0;

  // Slug duplicate detection
  const slugMap: Record<string, string[]> = {};
  const duplicateSlugs: Array<{ slug: string; entityIds: string[] }> = [];

  for (const entity of allEntities) {
    // Lifecycle distribution
    const ls = entity.lifecycleStatus ?? "unknown";
    lifecycleDistribution[ls] = (lifecycleDistribution[ls] ?? 0) + 1;
    if (ls === "published") publishedCount++;
    if (ls === "new" || ls === "ai_draft") draftCount++;
    if (ls === "review" || ls === "review_required") reviewCount++;

    // Orphaned check
    if (!entityRelationCount[entity.id]) {
      orphanedEntities.push(entity.id);
    }

    // Required fields check
    const missing: string[] = [];
    if (!entity.canonicalName) missing.push("canonicalName");
    if (!entity.shortDescription) missing.push("shortDescription");
    if (!entity.type) missing.push("type");
    const cats = (entity.categories as string[]) ?? [];
    if (cats.length === 0) { missing.push("categories"); missingCategories.push(entity.id); }
    if (missing.length > 0) {
      missingRequiredFields.push({ entityId: entity.id, missingFields: missing });
    }

    // Slug duplicates
    if (entity.slug) {
      if (!slugMap[entity.slug]) slugMap[entity.slug] = [];
      slugMap[entity.slug].push(entity.id);
    }
  }

  for (const [slug, ids] of Object.entries(slugMap)) {
    if (ids.length > 1) duplicateSlugs.push({ slug, entityIds: ids });
  }

  // Missing sources (sourceCount = 0 and published)
  const missingSources = await db.select({ id: entities.id })
    .from(entities)
    .where(sql`${entities.lifecycleStatus} = 'published' AND COALESCE((entities.source_count), 0) = 0`)
    .then(rows => rows.map(r => r.id));

  // Quality score distribution (sample: all entities)
  const qualityScoreDistribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
  // Calculate for published entities only (performance)
  const publishedEntities = allEntities.filter(e => e.lifecycleStatus === "published").slice(0, 100);
  for (const entity of publishedEntities) {
    const score = await calculateQualityScore(entity.id);
    if (score.total >= 80) qualityScoreDistribution.excellent++;
    else if (score.total >= 60) qualityScoreDistribution.good++;
    else if (score.total >= 40) qualityScoreDistribution.fair++;
    else qualityScoreDistribution.poor++;
  }

  return {
    generatedAt: new Date().toISOString(),
    totalEntities: allEntities.length,
    orphanedEntities,
    missingRequiredFields,
    missingTopics,
    missingCategories,
    missingSources,
    duplicateSlugs,
    lifecycleDistribution,
    publishedCount,
    draftCount,
    reviewCount,
    qualityScoreDistribution,
  };
}

// ─── Governance Enforcement ───────────────────────────────────────────────────

/**
 * Returns true if an entity is accessible to agents.
 * Agents may ONLY use entities with lifecycleStatus = "published".
 */
export function isAgentAccessible(entity: { lifecycleStatus?: string | null; status?: string | null }): boolean {
  return entity.lifecycleStatus === "published";
}

/**
 * Returns true if an entity is visible to a specific agent/channel context.
 * Checks the visibility JSONB array.
 */
export function isVisibleTo(entity: { visibility?: unknown }, context: string): boolean {
  const vis = entity.visibility as string[] | null;
  if (!vis || !Array.isArray(vis)) return true; // Default: visible to all
  return vis.includes(context);
}
