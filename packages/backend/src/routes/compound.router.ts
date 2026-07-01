/**
 * Compound Router — Unified View API
 *
 * GET /api/compound/:slug?system=portal|shop|academy|agent|content|seo
 *
 * Liefert eine system-spezifische Sicht auf eine Entity.
 * Jedes Downstream-System bekommt genau die Daten, die es braucht —
 * keine Überladung, keine fehlenden Felder.
 */

import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { entities, contentBlocks, relations, ecosystemLinks, sources, contentBlockSources } from "../db/schema.js";
import { eq, and, inArray, sql } from "drizzle-orm";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

type SystemView = "portal" | "shop" | "academy" | "agent" | "content" | "seo" | "full";

function getSystemView(req: Request): SystemView {
  const s = req.query.system as string;
  const valid: SystemView[] = ["portal", "shop", "academy", "agent", "content", "seo", "full"];
  return valid.includes(s as SystemView) ? (s as SystemView) : "portal";
}

async function getEntityBySlug(slug: string) {
  const [entity] = await db.select().from(entities).where(eq(entities.slug, slug)).limit(1);
  if (!entity) {
    const [byId] = await db.select().from(entities).where(eq(entities.id, slug)).limit(1);
    return byId ?? null;
  }
  return entity;
}

async function getBlocks(entityId: string, system: SystemView) {
  const blocks = await db.select().from(contentBlocks).where(eq(contentBlocks.entityId, entityId));

  // Filter by system scope
  if (system === "portal") return blocks.filter(b => b.lifecycleStatus !== "archived");
  if (system === "shop") return blocks.filter(b => {
    const formats = (b as any).outputFormats ?? ["portal"];
    return formats.includes("shop");
  });
  if (system === "academy") return blocks.filter(b => {
    const formats = (b as any).outputFormats ?? ["portal", "academy"];
    return formats.includes("academy");
  });
  return blocks;
}

async function getRelations(entityId: string, system: SystemView, depth: number = 1) {
  const rels = await db.select().from(relations).where(
    sql`${relations.fromEntityId} = ${entityId} OR ${relations.toEntityId} = ${entityId}`
  );

  // Filter by system visibility
  if (system === "shop") return rels.filter(r => (r as any).shopVisible === true);
  if (system === "agent") return rels.filter(r => (r as any).agentVisible !== false);
  if (system === "academy") return rels.filter(r => (r as any).academyVisible !== false);
  return rels;
}

async function getEcosystemLinks(entityId: string, system: SystemView) {
  const links = await db.select().from(ecosystemLinks).where(
    and(eq(ecosystemLinks.entityId, entityId), eq(ecosystemLinks.active, true))
  );

  if (system === "shop") return links.filter(l => l.externalSystem === "shop" || l.linkType === "shop_product");
  if (system === "academy") return links.filter(l => l.externalSystem === "academy" || l.linkType === "academy_module");
  return links;
}

// ─── GET /api/compound/:slug ──────────────────────────────────────────────────
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const system = getSystemView(req);
    const includeBlocks = req.query.blocks !== "false";
    const includeRelations = req.query.relations !== "false";
    const includeLinks = req.query.links !== "false";

    const entity = await getEntityBySlug(slug);
    if (!entity) {
      return res.status(404).json({ error: "Entity not found", slug });
    }

    // Build system-specific view
    const view: Record<string, any> = { system, entity };

    if (includeBlocks) {
      view.blocks = await getBlocks(entity.id, system);
    }

    if (includeRelations) {
      const rels = await getRelations(entity.id, system);
      // Resolve relation targets
      const targetIds = rels.map(r => r.fromEntityId === entity.id ? r.toEntityId : r.fromEntityId);
      const uniqueIds = [...new Set(targetIds)];
      let targets: Record<string, any> = {};
      if (uniqueIds.length > 0) {
        const targetEntities = await db.select({
          id: entities.id,
          slug: entities.slug,
          canonicalName: entities.canonicalName,
          type: entities.type,
          shortDescription: entities.shortDescription,
        }).from(entities).where(inArray(entities.id, uniqueIds));
        targets = Object.fromEntries(targetEntities.map(e => [e.id, e]));
      }
      view.relations = rels.map(r => ({
        ...r,
        target: targets[r.fromEntityId === entity.id ? r.toEntityId : r.fromEntityId] ?? null,
        direction: r.fromEntityId === entity.id ? "outgoing" : "incoming",
      }));
    }

    if (includeLinks) {
      view.ecosystemLinks = await getEcosystemLinks(entity.id, system);
    }

    // System-specific extras
    if (system === "seo") {
      view.seo = {
        canonicalUrl: entity.canonicalUrl,
        seoTitle: entity.seoTitle,
        seoDescription: entity.seoDescription,
        seoKeywords: entity.seoKeywords,
        jsonLd: entity.jsonLd,
        schemaOrg: entity.schemaOrg,
        geoQa: entity.geoQa,
        ogTitle: (entity as any).seoOgTitle,
        ogDescription: (entity as any).seoOgDescription,
        ogImageUrl: (entity as any).seoOgImageUrl,
        twitterCard: (entity as any).seoTwitterCard,
        hreflang: (entity as any).seoHreflang,
        breadcrumb: (entity as any).seoBreadcrumb,
        faqSchema: (entity as any).seoFaqSchema,
        articleSchema: (entity as any).seoArticleSchema,
        productSchema: (entity as any).seoProductSchema,
        indexPriority: (entity as any).seoIndexPriority,
        lastIndexedAt: (entity as any).seoLastIndexedAt,
      };
    }

    if (system === "shop") {
      view.shop = {
        headline: (entity as any).shopHeadline,
        subheadline: (entity as any).shopSubheadline,
        bulletPoints: (entity as any).shopBulletPoints ?? [],
        useCasePrimary: (entity as any).shopUseCasePrimary,
        useCaseSecondary: (entity as any).shopUseCaseSecondary ?? [],
        targetAudience: (entity as any).shopTargetAudience ?? [],
        contraindications: (entity as any).shopContraindications ?? [],
        storageInstructions: (entity as any).shopStorageInstructions,
        legalDisclaimer: (entity as any).shopLegalDisclaimer,
        badgeLabels: (entity as any).shopBadgeLabels ?? [],
        bundleSynergyIds: entity.shopProductIds ?? [],
        upsellEntityIds: (entity as any).upsellEntityIds ?? [],
        crossSellEntityIds: (entity as any).crossSellEntityIds ?? [],
        metrics: entity.metrics ?? [],
      };
    }

    if (system === "agent") {
      view.agent = {
        salesPitch: (entity as any).agentSalesPitch,
        supportFaq: (entity as any).agentSupportFaq ?? [],
        researchContext: (entity as any).agentResearchContext,
        medicalDisclaimer: (entity as any).agentMedicalDisclaimer,
        confidenceScore: (entity as any).agentConfidenceScore ?? 0.8,
        lastReviewedAt: (entity as any).agentLastReviewedAt,
        reviewPriority: (entity as any).agentReviewPriority ?? 0,
      };
    }

    if (system === "content") {
      view.content = {
        hook30s: (entity as any).contentHook30s,
        hook60s: (entity as any).contentHook60s,
        tiktokAngle: (entity as any).contentTiktokAngle,
        instagramCaption: (entity as any).contentInstagramCaption,
        newsletterTeaser: (entity as any).contentNewsletterTeaser,
        comparisonIds: (entity as any).contentComparisonIds ?? [],
        stackPosition: (entity as any).contentStackPosition,
        viralFact: (entity as any).contentViralFact,
        misconception: (entity as any).contentMisconception,
      };
    }

    if (system === "academy") {
      view.academy = {
        learningGoals: (entity as any).academyLearningGoals ?? [],
        prerequisites: (entity as any).academyPrerequisites ?? [],
        difficulty: (entity as any).academyDifficulty ?? "intermediate",
        estimatedTimeMinutes: (entity as any).academyEstimatedTimeMinutes,
        moduleOrder: (entity as any).academyModuleOrder,
        isFeatured: (entity as any).academyIsFeatured ?? false,
        videoUrl: (entity as any).academyVideoUrl,
        quizIds: (entity as any).academyQuizIds ?? [],
      };
    }

    view.meta = {
      generatedAt: new Date().toISOString(),
      entityVersion: entity.version,
      contentCompleteness: entity.contentCompleteness,
      goldstandardApproved: entity.goldstandardApproved,
    };

    res.json(view);
  } catch (err: any) {
    console.error("[compound.router] Error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

// ─── GET /api/compound — List all compounds ───────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const system = getSystemView(req);
    const type = req.query.type as string ?? "compound";
    const status = req.query.status as string;
    const limit = Math.min(parseInt(req.query.limit as string ?? "50"), 200);
    const offset = parseInt(req.query.offset as string ?? "0");

    let query = db.select({
      id: entities.id,
      slug: entities.slug,
      type: entities.type,
      canonicalName: entities.canonicalName,
      shortDescription: entities.shortDescription,
      status: entities.status,
      contentCompleteness: entities.contentCompleteness,
      goldstandardApproved: entities.goldstandardApproved,
      heroImageUrl: entities.heroImageUrl,
      metrics: entities.metrics,
      categories: entities.categories,
      tags: entities.tags,
      createdAt: entities.createdAt,
      updatedAt: entities.updatedAt,
    }).from(entities);

    const conditions = [];
    if (type !== "all") conditions.push(eq(entities.type, type as any));
    if (status) conditions.push(eq(entities.status, status as any));

    const results = await query
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset)
      .orderBy(entities.canonicalName);

    const total = await db.select({ count: sql<number>`count(*)` }).from(entities)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json({
      data: results,
      total: Number(total[0]?.count ?? 0),
      limit,
      offset,
      system,
    });
  } catch (err: any) {
    console.error("[compound.router] List error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

export { router as compoundRouter };
