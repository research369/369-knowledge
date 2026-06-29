import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { entities, contentBlocks, relations, entityVersions } from "../db/schema.js";
import { eq, and, ilike, inArray, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { validateEntity } from "../services/ontology.service.js";
import { generateEntityContent } from "../services/ai-generate.service.js";
import { requireAdmin, requireApiKey } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

// ─── Public: List published entities ─────────────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const { type, category, q, limit = "50", offset = "0" } = req.query;

    let query = db
      .select()
      .from(entities)
      .where(eq(entities.status, "published"))
      .orderBy(desc(entities.publishedAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const rows = await query;
    res.json({ data: rows, total: rows.length });
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

    // Get related entities
    const relatedEdges = await db
      .select()
      .from(relations)
      .where(eq(relations.fromEntityId, id));

    res.json({
      entity: entity[0],
      blocks,
      relations: relatedEdges,
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
          metrics: parsed.data.metrics ?? [],
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

      res.json({ message: "Entity published successfully", publishedAt: now });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Protected: Update entity ─────────────────────────────────────────────────

router.patch(
  "/:id",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Prevent status manipulation through this endpoint
      delete updates.id;
      delete updates.createdAt;

      await db
        .update(entities)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(entities.id, id));

      const updated = await db
        .select()
        .from(entities)
        .where(eq(entities.id, id))
        .limit(1);

      res.json({ entity: updated[0] });
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

export { router as entitiesRouter };
