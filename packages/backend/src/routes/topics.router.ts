import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { topics, entityTopics, entities } from "../db/schema.js";
import { eq, and, asc, inArray } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { z } from "zod";


const router = Router();

// ─── Public: List all active topics ──────────────────────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  try {
    const allTopics = await db
      .select()
      .from(topics)
      .where(eq(topics.active, true))
      .orderBy(asc(topics.sortOrder), asc(topics.name));
    res.json({ data: allTopics, total: allTopics.length });
  } catch (err) {
    console.error("Topics list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Public: Get topic by slug with its entities ──────────────────────────────
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { type, limit = "50", offset = "0" } = req.query;

    const topic = await db
      .select()
      .from(topics)
      .where(and(eq(topics.slug, slug), eq(topics.active, true)))
      .limit(1);

    if (!topic.length) {
      return res.status(404).json({ error: "Topic not found" });
    }

    // Get entity IDs for this topic
    const entityTopicRows = await db
      .select({ entityId: entityTopics.entityId, isPrimary: entityTopics.isPrimary, sortOrder: entityTopics.sortOrder })
      .from(entityTopics)
      .where(eq(entityTopics.topicId, topic[0].id))
      .orderBy(asc(entityTopics.sortOrder));

    const entityIds = entityTopicRows.map((r) => r.entityId);

    if (!entityIds.length) {
      return res.json({
        topic: topic[0],
        entities: [],
        total: 0,
      });
    }

    // Fetch published entities for this topic
    let query = db
      .select({
        id: entities.id,
        slug: entities.slug,
        type: entities.type,
        canonicalName: entities.canonicalName,
        shortDescription: entities.shortDescription,
        categories: entities.categories,
        tags: entities.tags,
        heroImageUrl: entities.heroImageUrl,
        metrics: entities.metrics,
        seoTitle: entities.seoTitle,
        publishedAt: entities.publishedAt,
        status: entities.status,
      })
      .from(entities)
      .where(
        and(
          eq(entities.status, "published"),
          inArray(entities.id, entityIds)
        )
      );

    const lim = parseInt(limit as string, 10);
    const off = parseInt(offset as string, 10);
    const allEntities = await query.limit(lim).offset(off);

    // Filter by type if provided
    const filtered = type
      ? allEntities.filter((e) => e.type === type)
      : allEntities;

    res.json({
      topic: topic[0],
      entities: filtered,
      total: filtered.length,
    });
  } catch (err) {
    console.error("Topic detail error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Protected: Create topic ──────────────────────────────────────────────────
const createTopicSchema = z.object({
  id: z.string().min(1).max(100),
  slug: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional(),
  description: z.string().optional(),
  heroImageUrl: z.string().url().optional(),
  iconName: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
  sortOrder: z.number().int().default(0),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(500).optional(),
});

router.post("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = createTopicSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    }

    const now = new Date();
    const [topic] = await db
      .insert(topics)
      .values({
        ...parsed.data,
        active: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    res.status(201).json({ topic });
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Topic with this slug already exists" });
    }
    console.error("Topic create error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Protected: Update topic ──────────────────────────────────────────────────
router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const allowed = ["name", "nameEn", "description", "heroImageUrl", "iconName", "color", "sortOrder", "active", "seoTitle", "seoDescription"];
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const [updated] = await db
      .update(topics)
      .set(updates)
      .where(eq(topics.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Topic not found" });
    res.json({ topic: updated });
  } catch (err) {
    console.error("Topic update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Protected: Assign entity to topic ───────────────────────────────────────
router.post("/:topicId/entities/:entityId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { topicId, entityId } = req.params;
    const { isPrimary = false, sortOrder = 0 } = req.body;

    await db
      .insert(entityTopics)
      .values({ topicId, entityId, isPrimary, sortOrder, createdAt: new Date() })
      .onConflictDoUpdate({
        target: [entityTopics.entityId, entityTopics.topicId],
        set: { isPrimary, sortOrder },
      });

    res.json({ message: "Entity assigned to topic" });
  } catch (err) {
    console.error("Assign entity to topic error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Protected: Remove entity from topic ─────────────────────────────────────
router.delete("/:topicId/entities/:entityId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { topicId, entityId } = req.params;
    await db
      .delete(entityTopics)
      .where(and(eq(entityTopics.topicId, topicId), eq(entityTopics.entityId, entityId)));
    res.json({ message: "Entity removed from topic" });
  } catch (err) {
    console.error("Remove entity from topic error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Protected: Bulk assign entities to topics ───────────────────────────────
router.post("/bulk-assign", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { links } = req.body as { links: Array<{ entityId: string; topicId: string; isPrimary?: boolean }> };
    if (!Array.isArray(links) || links.length === 0) {
      return res.status(400).json({ error: "links array required" });
    }
    let inserted = 0;
    let skipped = 0;
    const batchSize = 100;
    for (let i = 0; i < links.length; i += batchSize) {
      const batch = links.slice(i, i + batchSize);
      const values = batch.map((l) => ({
        entityId: l.entityId,
        topicId: l.topicId,
        isPrimary: l.isPrimary ?? false,
        sortOrder: 0,
        createdAt: new Date(),
      }));
      try {
        await db.insert(entityTopics).values(values).onConflictDoNothing();
        inserted += batch.length;
      } catch {
        for (const v of values) {
          try {
            await db.insert(entityTopics).values(v).onConflictDoNothing();
            inserted++;
          } catch {
            skipped++;
          }
        }
      }
    }
    res.json({ message: "Bulk assign complete", inserted, skipped, total: links.length });
  } catch (err: any) {
    console.error("Bulk assign error:", err);
    res.status(500).json({ error: err.message });
  }
});

export { router as topicsRouter };
