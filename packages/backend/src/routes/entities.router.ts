import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { entities, contentBlocks, relations, entityVersions } from "../db/schema.js";
import { eq, and, ilike, inArray, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { validateEntity } from "../services/ontology.service.js";
import { generateEntityContent } from "../services/ai-generate.service.js";
import { requireAdmin, requireApiKey } from "../middleware/auth.js";
import { z } from "zod";
import { onEntityPublished, onEntityUpdated } from "../services/webhook.service.js";
import { calculateQualityScore, validateKnowledgeGraph } from "../services/governance.service.js";

const router = Router();

// ─── Public: List published entities ─────────────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const { type, category, q, limit = "50", offset = "0" } = req.query;

    // Build WHERE conditions
    const conditions: any[] = [eq(entities.status, "published")];

    // Fix: actually apply type filter when provided
    if (type && typeof type === "string" && type.trim() !== "") {
      conditions.push(eq(entities.type, type.trim() as any));
    }

    // Optional: full-text search on canonicalName
    if (q && typeof q === "string" && q.trim() !== "") {
      conditions.push(ilike(entities.canonicalName, `%${q.trim()}%`));
    }

    const rows = await db
      .select()
      .from(entities)
      .where(and(...conditions))
      .orderBy(desc(entities.publishedAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({ data: rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Public: Get entity by slug ─────────────────────────────────────────────

router.get("/slug/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const scope = (req.query.scope as string) ?? "portal";

    // Try slug field first, then fall back to id
    let entity = await db
      .select()
      .from(entities)
      .where(and(eq(entities.slug, slug), eq(entities.status, "published")))
      .limit(1);

    if (entity.length === 0) {
      // Fallback: try id
      entity = await db
        .select()
        .from(entities)
        .where(and(eq(entities.id, slug), eq(entities.status, "published")))
        .limit(1);
    }

    if (entity.length === 0) {
      return res.status(404).json({ error: "Entity not found" });
    }

    const id = entity[0].id;
    const portalLayers = ["L1", "L2", "L3"];
    const academyLayers = ["L1", "L2", "L3", "L4", "L5", "L6"];
    const allowedLayers = scope === "academy" || scope === "bedo" ? academyLayers : portalLayers;

    const blocks = await db
      .select()
      .from(contentBlocks)
      .where(and(eq(contentBlocks.entityId, id), inArray(contentBlocks.layer, allowedLayers as any[])))
      .orderBy(contentBlocks.sortOrder);

        // Only return meaningful scientific/compound relations — no internal content types
    const MEANINGFUL_RELATION_TYPES = [
      "synergizes_with", "activates", "inhibits", "improves", "worsens",
      "upregulates", "downregulates", "interacts_with", "combined_with",
      "antagonizes", "binds_to", "influences", "regulates", "modulates",
      "treats", "relevant_for", "studied_in", "evidenced_by",
    ];
    const relatedEdgesRaw = await db
      .select()
      .from(relations)
      .where(
        and(
          eq(relations.fromEntityId, id),
          inArray(relations.relationType, MEANINGFUL_RELATION_TYPES as any[])
        )
      );
    // Deduplicate: keep only one relation per (fromEntityId, toEntityId, relationType)
    const seen = new Set<string>();
    const dedupedEdges = relatedEdgesRaw.filter((rel) => {
      const key = `${rel.fromEntityId}|${rel.toEntityId}|${rel.relationType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Enrich relations with toEntity canonicalName + slug
    const toEntityIds = [...new Set(dedupedEdges.map((r) => r.toEntityId))];
    const toEntityMap: Record<string, { canonicalName: string; slug: string; type: string }> = {};
    if (toEntityIds.length > 0) {
      const toEntities = await db
        .select({ id: entities.id, canonicalName: entities.canonicalName, slug: entities.slug, type: entities.type })
        .from(entities)
        .where(inArray(entities.id, toEntityIds));
      for (const e of toEntities) {
        toEntityMap[e.id] = { canonicalName: e.canonicalName, slug: e.slug ?? e.id, type: e.type ?? "" };
      }
    }
    const relatedEdges = dedupedEdges.map((rel) => ({
      ...rel,
      toEntityName: toEntityMap[rel.toEntityId]?.canonicalName ?? rel.toEntityId,
      toEntitySlug: toEntityMap[rel.toEntityId]?.slug ?? rel.toEntityId,
      toEntityType: toEntityMap[rel.toEntityId]?.type ?? null,
    }));
    res.json({ entity: entity[0], blocks, relations: relatedEdges });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Public: Get single published entity with content blocks ─────────────────

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const scope = (req.query.scope as string) ?? "portal";

    const entity = await db
      .select()
      .from(entities)
      .where(and(eq(entities.id, id), eq(entities.status, "published")))
      .limit(1);

    if (entity.length === 0) {
      return res.status(404).json({ error: "Entity not found" });
    }

    // Only return blocks accessible to the requested scope
    const portalLayers = ["L1", "L2", "L3"];
    const academyLayers = ["L1", "L2", "L3", "L4", "L5", "L6"];
    const allowedLayers =
      scope === "academy" || scope === "bedo" ? academyLayers : portalLayers;

    const blocks = await db
      .select()
      .from(contentBlocks)
      .where(
        and(
          eq(contentBlocks.entityId, id),
          inArray(contentBlocks.layer, allowedLayers as any[])
        )
      )
      .orderBy(contentBlocks.sortOrder);

    // Only return meaningful scientific/compound relations — no internal content types
    const MEANINGFUL_RELATION_TYPES_2 = [
      "synergizes_with", "activates", "inhibits", "improves", "worsens",
      "upregulates", "downregulates", "interacts_with", "combined_with",
      "antagonizes", "binds_to", "influences", "regulates", "modulates",
      "treats", "relevant_for", "studied_in", "evidenced_by",
    ];
    const relatedEdgesRaw2 = await db
      .select()
      .from(relations)
      .where(
        and(
          eq(relations.fromEntityId, id),
          inArray(relations.relationType, MEANINGFUL_RELATION_TYPES_2 as any[])
        )
      );
    // Deduplicate: keep only one relation per (fromEntityId, toEntityId, relationType)
    const seen2 = new Set<string>();
    const dedupedEdges2 = relatedEdgesRaw2.filter((rel) => {
      const key = `${rel.fromEntityId}|${rel.toEntityId}|${rel.relationType}`;
      if (seen2.has(key)) return false;
      seen2.add(key);
      return true;
    });
    // Enrich relations with toEntity canonicalName + slug
    const toEntityIds2 = [...new Set(dedupedEdges2.map((r) => r.toEntityId))];
    const toEntityMap2: Record<string, { canonicalName: string; slug: string; type: string }> = {};
    if (toEntityIds2.length > 0) {
      const toEntities2 = await db
        .select({ id: entities.id, canonicalName: entities.canonicalName, slug: entities.slug, type: entities.type })
        .from(entities)
        .where(inArray(entities.id, toEntityIds2));
      for (const e of toEntities2) {
        toEntityMap2[e.id] = { canonicalName: e.canonicalName, slug: e.slug ?? e.id, type: e.type ?? "" };
      }
    }
    const relatedEdges2 = dedupedEdges2.map((rel) => ({
      ...rel,
      toEntityName: toEntityMap2[rel.toEntityId]?.canonicalName ?? rel.toEntityId,
      toEntitySlug: toEntityMap2[rel.toEntityId]?.slug ?? rel.toEntityId,
      toEntityType: toEntityMap2[rel.toEntityId]?.type ?? null,
    }));
    res.json({
      entity: entity[0],
      blocks,
      relations: relatedEdges2,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Protected: Admin / API — Create entity ───────────────────────────────────

const createEntitySchema = z.object({
  id: z.string().min(1).max(200), // slug
  type: z.string(),
  canonicalName: z.string().min(1),
  aliases: z.array(z.string()).optional(),
  language: z.string().optional(),
  casNumber: z.string().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  shortDescription: z.string().max(300).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.array(z.string()).optional(),
  heroImageUrl: z.string().optional(),
  metrics: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
});

router.post(
  "/",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const parsed = createEntitySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const validation = validateEntity(parsed.data);
      if (!validation.valid) {
        return res.status(422).json({ errors: validation.errors });
      }

      const now = new Date();
      const entity = await db
        .insert(entities)
        .values({
          id: parsed.data.id,
          type: parsed.data.type as any,
          canonicalName: parsed.data.canonicalName,
          aliases: parsed.data.aliases ?? [],
          language: parsed.data.language ?? "de",
          casNumber: parsed.data.casNumber,
          categories: parsed.data.categories ?? [],
          tags: parsed.data.tags ?? [],
          seoTitle: parsed.data.seoTitle,
          seoDescription: parsed.data.seoDescription,
          seoKeywords: parsed.data.seoKeywords ?? [],
          heroImageUrl: parsed.data.heroImageUrl,
          shortDescription: parsed.data.shortDescription,
          metrics: parsed.data.metrics ?? [],
          slug: parsed.data.id, // default slug = id
          status: "draft" as const,
          version: 1,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      res.status(201).json({ entity: entity[0] });
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(409).json({ error: "Entity with this ID already exists" });
      }
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Protected: AI Generate content for entity ───────────────────────────────

router.post(
  "/:id/generate",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { context } = req.body;

      const entity = await db
        .select()
        .from(entities)
        .where(eq(entities.id, id))
        .limit(1);

      if (entity.length === 0) {
        return res.status(404).json({ error: "Entity not found" });
      }

      const e = entity[0];
      const generated = await generateEntityContent(
        e.canonicalName,
        e.type,
        context
      );

      // Save generated content blocks
      const blockInserts = generated.blocks.map((b) => ({
        id: uuidv4(),
        entityId: id,
        layer: b.layer as any,
        scope: b.scope,
        blockType: b.blockType,
        title: b.title,
        body: b.body,
        sources: b.sources,
        sortOrder: b.sortOrder,
      }));

      if (blockInserts.length > 0) {
        await db.insert(contentBlocks).values(blockInserts);
      }

      // Update entity with SEO data and metrics
      await db
        .update(entities)
        .set({
          seoTitle: generated.seoTitle,
          seoDescription: generated.seoDescription,
          seoKeywords: generated.seoKeywords,
          metrics: generated.metrics,
          generatedByAi: true,
          status: "pending_review",
          updatedAt: new Date(),
        })
        .where(eq(entities.id, id));

      res.json({
        message: "Content generated. Status set to pending_review. Manual approval required before publishing.",
        blocksCreated: blockInserts.length,
        suggestedRelations: generated.suggestedRelations,
        seoTitle: generated.seoTitle,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Protected: Approve / Publish entity ─────────────────────────────────────

router.post(
  "/:id/publish",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const entity = await db
        .select()
        .from(entities)
        .where(eq(entities.id, id))
        .limit(1);

      if (entity.length === 0) {
        return res.status(404).json({ error: "Entity not found" });
      }

      const now = new Date();
      await db
        .update(entities)
        .set({
          status: "published",
          publishedAt: now,
          updatedAt: now,
        })
        .where(eq(entities.id, id));

      // Webhook Auto-Sync: entity.published event feuern (non-blocking)
      const [publishedEntity] = await db.select().from(entities).where(eq(entities.id, id)).limit(1);
      if (publishedEntity) {
        onEntityPublished({
          id: publishedEntity.id,
          slug: publishedEntity.slug ?? undefined,
          type: publishedEntity.type ?? undefined,
          canonicalName: publishedEntity.canonicalName,
          publishedAt: now.toISOString(),
          contentCompleteness: publishedEntity.contentCompleteness ?? undefined,
          goldstandardApproved: publishedEntity.goldstandardApproved ?? undefined,
        }).catch(() => {});
      }

      res.json({ message: "Entity published successfully", publishedAt: now });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Protected: Update entity (with versioning trigger) ──────────────────────

router.patch(
  "/:id",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const changedBy = req.headers["x-changed-by"] as string ?? "api";
      const changeNote = updates._changeNote as string | undefined;

      // Prevent status manipulation through this endpoint
      delete updates.id;
      delete updates.createdAt;
      delete updates._changeNote;

      // 1. Snapshot der aktuellen Version VOR dem Update
      const [current] = await db
        .select()
        .from(entities)
        .where(eq(entities.id, id))
        .limit(1);

      if (!current) return res.status(404).json({ error: "Entity not found" });

      // 2. Entity updaten (Version inkrementieren)
      await db
        .update(entities)
        .set({ ...updates, updatedAt: new Date(), version: (current.version ?? 0) + 1 })
        .where(eq(entities.id, id));

      // 3. Versionseintrag anlegen (Snapshot des Zustands VOR dem Update)
      await db.insert(entityVersions).values({
        id: uuidv4(),
        entityId: id,
        version: current.version ?? 1,
        snapshot: current as any,
        changedBy: changedBy,
        changeNote: changeNote ?? undefined,
        isAiGenerated: updates.generatedByAi === true,
        isManualEdit: !updates.generatedByAi,
        createdAt: new Date(),
      });

      const updated = await db
        .select()
        .from(entities)
        .where(eq(entities.id, id))
        .limit(1);

      // Webhook Auto-Sync: entity.updated event feuern (non-blocking)
      const updatedEntity = updated[0];
      onEntityUpdated({
        id: updatedEntity.id,
        slug: updatedEntity.slug ?? undefined,
        type: updatedEntity.type ?? undefined,
        canonicalName: updatedEntity.canonicalName,
        version: (current.version ?? 0) + 1,
      }).catch(() => {});

      res.json({ entity: updated[0], versionSaved: true, newVersion: (current.version ?? 0) + 1 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Protected: Unpublish / Archive ──────────────────────────────────────────

router.post(
  "/:id/unpublish",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db
        .update(entities)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(entities.id, id));
      res.json({ message: "Entity archived" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Protected: Get all entities (admin view) ─────────────────────────────────

router.get(
  "/admin/all",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const rows = await db
        .select()
        .from(entities)
        .orderBy(desc(entities.updatedAt));
      res.json({ data: rows, total: rows.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Governance: Quality Score per Entity ────────────────────────────────────
// GET /api/entities/:id/quality-score — Content Quality Score (0–100)
router.get(
  "/:id/quality-score",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const score = await calculateQualityScore(id);
      res.json(score);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Governance: Knowledge Graph Validation Report ───────────────────────────
// GET /api/entities/admin/graph-validation — Full Knowledge Graph Validation
router.get(
  "/admin/graph-validation",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const report = await validateKnowledgeGraph();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

export { router as entitiesRouter };
