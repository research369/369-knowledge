import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { entities, contentBlocks } from "../db/schema.js";
import { eq, and, or, ilike, sql } from "drizzle-orm";

const router = Router();

// ─── Public: Full-text search ─────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const { q, type, limit = "20", offset = "0" } = req.query;

    if (!q || typeof q !== "string" || q.trim().length < 2) {
      return res.status(400).json({ error: "Query must be at least 2 characters" });
    }

    const searchTerm = `%${q.trim()}%`;
    const lim = Math.min(parseInt(limit as string, 10), 50);
    const off = parseInt(offset as string, 10);

    // Search in entities: canonicalName, aliases (jsonb), tags (jsonb), seoTitle, seoDescription
    let baseQuery = db
      .select({
        id: entities.id,
        slug: entities.slug,
        type: entities.type,
        canonicalName: entities.canonicalName,
        shortDescription: entities.shortDescription,
        seoTitle: entities.seoTitle,
        heroImageUrl: entities.heroImageUrl,
        publishedAt: entities.publishedAt,
      })
      .from(entities)
      .where(
        and(
          eq(entities.status, "published"),
          or(
            ilike(entities.canonicalName, searchTerm),
            ilike(entities.seoTitle, searchTerm),
            ilike(entities.seoDescription, searchTerm),
            sql`${entities.aliases}::text ILIKE ${searchTerm}`,
            sql`${entities.tags}::text ILIKE ${searchTerm}`
          )
        )
      )
      .limit(lim)
      .offset(off);

    const results = await baseQuery;

    // Filter by type if provided
    const filtered = type ? results.filter((r) => r.type === type) : results;

    res.json({
      data: filtered,
      total: filtered.length,
      query: q.trim(),
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as searchRouter };
