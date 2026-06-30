import { Router } from "express";
import { db } from "../db/index.js";
import { collections, entities } from "../db/schema.js";
import { eq, desc, ilike, and, sql, inArray } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

export const collectionsRouter = Router();

// ─── Public: List collections ─────────────────────────────────────────────────
collectionsRouter.get("/", async (req, res) => {
  try {
    const { page = "1", limit = "20", q, status = "published" } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];

    if (status) conditions.push(eq(collections.status, status as any));
    if (q) conditions.push(ilike(collections.name, `%${q}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db.select().from(collections).where(where).orderBy(desc(collections.updatedAt)).limit(parseInt(limit)).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(collections).where(where),
    ]);

    res.json({ data: rows, total: Number(countResult[0]?.count ?? 0), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Public: Get collection by slug (with resolved entities) ─────────────────
collectionsRouter.get("/slug/:slug", async (req, res) => {
  try {
    const [collection] = await db.select().from(collections).where(eq(collections.slug, req.params.slug)).limit(1);
    if (!collection) return res.status(404).json({ error: "Collection not found" });

    // Resolve entities: manual + filter-based
    let entityIds: string[] = (collection.manualEntityIds as string[]) ?? [];

    // Apply type filter
    if ((collection.filterEntityTypes as string[])?.length > 0) {
      const filtered = await db
        .select({ id: entities.id })
        .from(entities)
        .where(
          and(
            eq(entities.status, "published"),
            inArray(entities.type, collection.filterEntityTypes as any[])
          )
        )
        .limit(100);
      entityIds = [...new Set([...entityIds, ...filtered.map((e) => e.id)])];
    }

    // Exclude
    const excludeIds = (collection.excludeEntityIds as string[]) ?? [];
    entityIds = entityIds.filter((id) => !excludeIds.includes(id));

    // Fetch resolved entities
    const resolvedEntities = entityIds.length > 0
      ? await db.select().from(entities).where(inArray(entities.id, entityIds))
      : [];

    res.json({ ...collection, entities: resolvedEntities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Public: Get collection by ID ─────────────────────────────────────────────
collectionsRouter.get("/:id", async (req, res) => {
  try {
    const [collection] = await db.select().from(collections).where(eq(collections.id, req.params.id)).limit(1);
    if (!collection) return res.status(404).json({ error: "Collection not found" });
    res.json(collection);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: Create ────────────────────────────────────────────────────────────
collectionsRouter.post("/", requireAdmin, async (req, res) => {
  try {
    const id = req.body.id || `collection-${uuidv4()}`;
    const [created] = await db.insert(collections).values({ ...req.body, id }).returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: Update ────────────────────────────────────────────────────────────
collectionsRouter.put("/:id", requireAdmin, async (req, res) => {
  try {
    const [updated] = await db.update(collections).set({ ...req.body, updatedAt: new Date() }).where(eq(collections.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Collection not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: Delete ────────────────────────────────────────────────────────────
collectionsRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const [deleted] = await db.delete(collections).where(eq(collections.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Collection not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: Publish ───────────────────────────────────────────────────────────
collectionsRouter.post("/:id/publish", requireAdmin, async (req, res) => {
  try {
    const [updated] = await db.update(collections).set({ status: "published", updatedAt: new Date() }).where(eq(collections.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Collection not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
