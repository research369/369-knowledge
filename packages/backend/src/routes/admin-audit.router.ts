/**
 * admin-audit.router.ts
 *
 * Admin-Befüllungsflow — Task 3
 *
 * GET  /api/admin/entity-audit/:slug     → Vollständigkeitsprüfung einer Entity
 * GET  /api/admin/entity-audit           → Übersicht aller Entities mit Completeness-Score
 * POST /api/admin/entity-audit/:slug/approve → Entity genehmigen
 * POST /api/admin/entity-audit/:slug/publish → Entity veröffentlichen
 */

import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import {
  entities,
  contentBlocks,
  relations,
  sources,
  confidenceScores,
} from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { onEntityPublished } from "../services/webhook.service.js";

const router = Router();

// ─── Goldstandard-Anforderungen ───────────────────────────────────────────────
const REQUIRED_BLOCK_TYPES = [
  "definition",
  "simple_explanation",
  "mechanisms",
  "signaling",
  "research",
  "evidence_summary",
  "interpretation",
  "faq",
];

const REQUIRED_AGENT_FIELDS = [
  "agentSalesPitch",
  "agentSupportFaq",
  "agentResearchContext",
  "agentMedicalDisclaimer",
];

const REQUIRED_ENTITY_FIELDS = [
  "shortDescription",
  "seoTitle",
  "seoDescription",
  "seoKeywords",
];

// ─── Completeness-Checker ─────────────────────────────────────────────────────
async function checkEntityCompleteness(entityId: string, entityData: any) {
  // 1. Content Blocks
  const blocks = await db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.entityId, entityId));

  const existingBlockTypes = new Set(blocks.map((b) => b.blockType));
  const missingBlockTypes = REQUIRED_BLOCK_TYPES.filter(
    (t) => !existingBlockTypes.has(t)
  );

  // Block-Übersicht nach Layer
  const blocksByLayer: Record<string, { count: number; types: string[] }> = {};
  for (const b of blocks) {
    const layer = b.layer ?? "L1";
    if (!blocksByLayer[layer]) blocksByLayer[layer] = { count: 0, types: [] };
    blocksByLayer[layer].count++;
    blocksByLayer[layer].types.push(b.blockType);
  }

  // 2. Relations
  const rels = await db
    .select()
    .from(relations)
    .where(eq(relations.fromEntityId, entityId));

  // 3. Quellen
  const srcs = await db
    .select()
    .from(sources)
    .where(sql`${sources.linkedEntityIds}::text LIKE ${"%" + entityId + "%"}`);

  // 4. Agent-Felder
  const missingAgentFields = REQUIRED_AGENT_FIELDS.filter((f) => {
    const val = entityData[f];
    return !val || (Array.isArray(val) && val.length === 0);
  });

  // 5. Entity-Felder
  const missingEntityFields = REQUIRED_ENTITY_FIELDS.filter((f) => {
    const val = entityData[f];
    return !val || (Array.isArray(val) && val.length === 0);
  });

  // 6. Confidence Score
  const confScore = await db
    .select()
    .from(confidenceScores)
    .where(eq(confidenceScores.targetId, entityId))
    .limit(1);

  // 7. Completeness Score berechnen (0-100)
  let score = 0;
  const maxScore = 100;

  // Blocks: 40 Punkte (5 pro Pflicht-Block-Typ, max 8)
  const blockScore = Math.min(
    40,
    (REQUIRED_BLOCK_TYPES.length - missingBlockTypes.length) * 5
  );
  score += blockScore;

  // Agent-Felder: 20 Punkte (5 pro Feld)
  const agentScore = Math.min(
    20,
    (REQUIRED_AGENT_FIELDS.length - missingAgentFields.length) * 5
  );
  score += agentScore;

  // Entity-Felder: 10 Punkte
  const entityFieldScore = Math.min(
    10,
    (REQUIRED_ENTITY_FIELDS.length - missingEntityFields.length) * 2.5
  );
  score += entityFieldScore;

  // Relations: 15 Punkte (3 pro Relation, max 5)
  const relScore = Math.min(15, rels.length * 3);
  score += relScore;

  // Quellen: 15 Punkte (5 pro Quelle, max 3)
  const srcScore = Math.min(15, srcs.length * 5);
  score += srcScore;

  const completenessScore = Math.round(score);
  const isGoldstandard = completenessScore >= 80;
  const readyForPublish =
    completenessScore >= 60 &&
    missingAgentFields.length === 0 &&
    blocks.length >= 6;

  return {
    entityId,
    slug: entityData.slug,
    canonicalName: entityData.canonicalName,
    lifecycleStatus: entityData.lifecycleStatus,
    completenessScore,
    isGoldstandard,
    readyForPublish,
    summary: {
      totalBlocks: blocks.length,
      totalRelations: rels.length,
      totalSources: srcs.length,
      confidenceScore:
        confScore[0]?.overallScore ?? entityData.agentConfidenceScore ?? null,
    },
    checks: {
      blocks: {
        required: REQUIRED_BLOCK_TYPES.length,
        present: REQUIRED_BLOCK_TYPES.length - missingBlockTypes.length,
        missing: missingBlockTypes,
        byLayer: blocksByLayer,
        allBlocks: blocks.map((b) => ({
          id: b.id,
          layer: b.layer,
          blockType: b.blockType,
          title: b.title,
          lifecycleStatus: b.lifecycleStatus,
          bodyLength: b.body?.length ?? 0,
        })),
      },
      agentFields: {
        required: REQUIRED_AGENT_FIELDS.length,
        present: REQUIRED_AGENT_FIELDS.length - missingAgentFields.length,
        missing: missingAgentFields,
        filled: REQUIRED_AGENT_FIELDS.filter((f) => !missingAgentFields.includes(f)),
      },
      entityFields: {
        required: REQUIRED_ENTITY_FIELDS.length,
        present: REQUIRED_ENTITY_FIELDS.length - missingEntityFields.length,
        missing: missingEntityFields,
      },
      relations: {
        total: rels.length,
        byType: rels.reduce((acc: Record<string, number>, r) => {
          acc[r.relationType] = (acc[r.relationType] ?? 0) + 1;
          return acc;
        }, {}),
        list: rels.map((r) => ({
          toEntityId: r.toEntityId,
          relationType: r.relationType,
          confidenceScore: r.confidenceScore,
        })),
      },
      sources: {
        total: srcs.length,
        list: srcs.map((s) => ({
          id: s.id,
          title: s.title,
          pmid: s.pmid,
          year: s.year,
          studyType: s.studyType,
          evidenceLevel: s.evidenceLevel,
        })),
      },
    },
    nextSteps: [
      ...(missingBlockTypes.length > 0
        ? [`Fehlende Blocks hinzufügen: ${missingBlockTypes.join(", ")}`]
        : []),
      ...(missingAgentFields.length > 0
        ? [`Agent-Felder befüllen: ${missingAgentFields.join(", ")}`]
        : []),
      ...(rels.length < 5
        ? [`Mehr Relations hinzufügen (aktuell: ${rels.length}, empfohlen: 8+)`]
        : []),
      ...(srcs.length < 3
        ? [`Mehr Quellen hinzufügen (aktuell: ${srcs.length}, empfohlen: 3+)`]
        : []),
      ...(entityData.lifecycleStatus === "review"
        ? [`Entity genehmigen: POST /api/admin/entity-audit/${entityData.slug}/approve`]
        : []),
      ...(entityData.lifecycleStatus === "approved"
        ? [`Entity veröffentlichen: POST /api/admin/entity-audit/${entityData.slug}/publish`]
        : []),
    ],
  };
}

// ─── GET /api/admin/entity-audit ─────────────────────────────────────────────
// Übersicht aller Entities mit Completeness-Score
router.get("/", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const allEntities = await db
      .select({
        id: entities.id,
        slug: entities.slug,
        canonicalName: entities.canonicalName,
        type: entities.type,
        lifecycleStatus: entities.lifecycleStatus,
        agentSalesPitch: entities.agentSalesPitch,
        agentSupportFaq: entities.agentSupportFaq,
        agentResearchContext: entities.agentResearchContext,
        agentMedicalDisclaimer: entities.agentMedicalDisclaimer,
        agentConfidenceScore: entities.agentConfidenceScore,
        shortDescription: entities.shortDescription,
        seoTitle: entities.seoTitle,
        seoDescription: entities.seoDescription,
        seoKeywords: entities.seoKeywords,
        generatedByAi: entities.generatedByAi,
        updatedAt: entities.updatedAt,
      })
      .from(entities)
      .orderBy(entities.canonicalName);

    // Nur Compounds und wichtige Typen für Audit
    const compoundsOnly = allEntities.filter(
      (e) => e.type === "compound" || e.type === "peptide"
    );

    const audits = await Promise.all(
      compoundsOnly.map(async (e) => {
        const blockCount = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(contentBlocks)
          .where(eq(contentBlocks.entityId, e.id));
        const relCount = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(relations)
          .where(eq(relations.fromEntityId, e.id));

        const blocks = Number(blockCount[0]?.count ?? 0);
        const rels = Number(relCount[0]?.count ?? 0);
        const hasAgentFields =
          !!e.agentSalesPitch &&
          !!e.agentSupportFaq &&
          !!e.agentResearchContext;

        // Schnell-Score
        let quickScore = 0;
        quickScore += Math.min(40, blocks * 5);
        quickScore += hasAgentFields ? 20 : 0;
        quickScore += e.shortDescription ? 5 : 0;
        quickScore += e.seoTitle ? 5 : 0;
        quickScore += Math.min(15, rels * 3);

        return {
          id: e.id,
          slug: e.slug,
          canonicalName: e.canonicalName,
          type: e.type,
          lifecycleStatus: e.lifecycleStatus,
          completenessScore: Math.round(quickScore),
          blockCount: blocks,
          relationCount: rels,
          hasAgentFields,
          generatedByAi: e.generatedByAi,
          auditUrl: `/api/admin/entity-audit/${e.slug}`,
          approveUrl: `/api/admin/entity-audit/${e.slug}/approve`,
          publishUrl: `/api/admin/entity-audit/${e.slug}/publish`,
          factoryFillUrl: `/api/factory/generate-for/${e.id}`,
        };
      })
    );

    // Sortiert nach Completeness-Score (aufsteigend — niedrigste zuerst)
    audits.sort((a, b) => a.completenessScore - b.completenessScore);

    res.json({
      total: audits.length,
      published: audits.filter((a) => a.lifecycleStatus === "published").length,
      approved: audits.filter((a) => a.lifecycleStatus === "approved").length,
      inReview: audits.filter((a) => a.lifecycleStatus === "review").length,
      goldstandard: audits.filter((a) => a.completenessScore >= 80).length,
      entities: audits,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/entity-audit/:slug ───────────────────────────────────────
// Vollständige Prüfung einer einzelnen Entity
router.get("/:slug", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const entityRows = await db
      .select()
      .from(entities)
      .where(eq(entities.slug, slug))
      .limit(1);

    if (entityRows.length === 0) {
      // Fallback: ID
      const byId = await db
        .select()
        .from(entities)
        .where(eq(entities.id, slug))
        .limit(1);
      if (byId.length === 0) {
        return res.status(404).json({
          error: `Entity "${slug}" nicht gefunden`,
          hint: "Prüfe den Slug oder nutze GET /api/admin/entity-audit für alle Entities",
        });
      }
      const audit = await checkEntityCompleteness(byId[0].id, byId[0]);
      return res.json(audit);
    }

    const audit = await checkEntityCompleteness(entityRows[0].id, entityRows[0]);
    res.json(audit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/entity-audit/:slug/approve ───────────────────────────────
router.post("/:slug/approve", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const entityRows = await db
      .select()
      .from(entities)
      .where(eq(entities.slug, slug))
      .limit(1);

    if (entityRows.length === 0) {
      return res.status(404).json({ error: `Entity "${slug}" nicht gefunden` });
    }

    const e = entityRows[0];
    if (e.lifecycleStatus === "published") {
      return res.status(400).json({
        error: `Entity "${e.canonicalName}" ist bereits published`,
      });
    }

    await db
      .update(entities)
      .set({ lifecycleStatus: "approved" as any, updatedAt: new Date() })
      .where(eq(entities.id, e.id));

    await db
      .update(contentBlocks)
      .set({ lifecycleStatus: "approved" as any, updatedAt: new Date() })
      .where(eq(contentBlocks.entityId, e.id));

    res.json({
      success: true,
      slug,
      previousStatus: e.lifecycleStatus,
      status: "approved",
      message: `Entity "${e.canonicalName}" genehmigt.`,
      nextStep: `POST /api/admin/entity-audit/${slug}/publish`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/entity-audit/:slug/publish ───────────────────────────────
router.post("/:slug/publish", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const entityRows = await db
      .select()
      .from(entities)
      .where(eq(entities.slug, slug))
      .limit(1);

    if (entityRows.length === 0) {
      return res.status(404).json({ error: `Entity "${slug}" nicht gefunden` });
    }

    const e = entityRows[0];
    if (e.lifecycleStatus !== "approved") {
      return res.status(400).json({
        error: `Entity "${e.canonicalName}" muss zuerst approved sein (aktuell: ${e.lifecycleStatus})`,
        hint: `POST /api/admin/entity-audit/${slug}/approve`,
      });
    }

    await db
      .update(entities)
      .set({
        lifecycleStatus: "published" as any,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(entities.id, e.id));

    await db
      .update(contentBlocks)
      .set({ lifecycleStatus: "published" as any, updatedAt: new Date() })
      .where(eq(contentBlocks.entityId, e.id));

    await onEntityPublished({
      id: e.id,
      slug: e.slug ?? undefined,
      type: e.type,
      canonicalName: e.canonicalName,
    });

    res.json({
      success: true,
      slug,
      status: "published",
      publicUrl: `/api/compound/${slug}`,
      message: `Entity "${e.canonicalName}" veröffentlicht. Webhooks gefeuert.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
