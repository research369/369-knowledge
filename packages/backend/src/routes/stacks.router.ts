/**
 * Stacks Router — Compound-Kombinationen mit Ziel-basierter Logik
 *
 * GET  /api/stacks           — Liste aller Stacks
 * GET  /api/stacks/:slug     — Stack-Detail mit Entity-Daten
 * POST /api/stacks           — Stack erstellen (Admin)
 * PATCH /api/stacks/:id      — Stack aktualisieren (Admin)
 */

import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { entities } from "../db/schema.js";
import { eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

// ─── Auth helper (reuse pattern from other routers) ───────────────────────────
function requireAdmin(req: Request, res: Response, next: any) {
  const token = req.headers["x-admin-token"] ?? req.headers.authorization?.replace("Bearer ", "");
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ─── GET /api/stacks ──────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string ?? "50"), 200);
    const offset = parseInt(req.query.offset as string ?? "0");
    const status = req.query.status as string;
    const goal = req.query.goal as string;

    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIdx = 1;

    if (status) {
      whereClause += ` AND status = $${paramIdx++}`;
      params.push(status);
    }
    if (goal) {
      whereClause += ` AND goal ILIKE $${paramIdx++}`;
      params.push(`%${goal}%`);
    }

    const stacks = await db.execute(sql`
      SELECT * FROM stacks
      ${status ? sql`WHERE status = ${status}` : sql``}
      ORDER BY is_featured DESC, created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total = await db.execute(sql`SELECT COUNT(*) as count FROM stacks`);

    res.json({
      data: stacks,
      total: Number((total as any)[0]?.count ?? 0),
      limit,
      offset,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── GET /api/stacks/:slug ────────────────────────────────────────────────────
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const [stack] = await db.execute(sql`
      SELECT * FROM stacks WHERE slug = ${slug} OR id = ${slug} LIMIT 1
    `) as any[];

    if (!stack) {
      return res.status(404).json({ error: "Stack not found", slug });
    }

    // Resolve entity details
    const entityIds: string[] = stack.entity_ids ?? [];
    let entityDetails: any[] = [];
    if (entityIds.length > 0) {
      entityDetails = await db.select({
        id: entities.id,
        slug: entities.slug,
        canonicalName: entities.canonicalName,
        type: entities.type,
        shortDescription: entities.shortDescription,
        heroImageUrl: entities.heroImageUrl,
        metrics: entities.metrics,
        contentCompleteness: entities.contentCompleteness,
        goldstandardApproved: entities.goldstandardApproved,
      }).from(entities).where(inArray(entities.id, entityIds));
    }

    res.json({
      stack,
      entities: entityDetails,
      entityRoles: stack.entity_roles ?? {},
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── POST /api/stacks ─────────────────────────────────────────────────────────
router.post("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      slug, name, goal, description, targetAudience, entityIds, entityRoles,
      synergyDescription, difficulty, durationWeeks, evidenceLevel,
      isFeatured, shopBundleId, academyModuleId, contentHook, status,
    } = req.body;

    if (!slug || !name || !goal) {
      return res.status(400).json({ error: "slug, name, goal are required" });
    }

    const id = randomUUID();
    await db.execute(sql`
      INSERT INTO stacks (
        id, slug, name, goal, description, target_audience, entity_ids, entity_roles,
        synergy_description, difficulty, duration_weeks, evidence_level,
        is_featured, shop_bundle_id, academy_module_id, content_hook, status
      ) VALUES (
        ${id}, ${slug}, ${name}, ${goal}, ${description ?? null},
        ${JSON.stringify(targetAudience ?? [])}, ${JSON.stringify(entityIds ?? [])},
        ${JSON.stringify(entityRoles ?? {})}, ${synergyDescription ?? null},
        ${difficulty ?? "intermediate"}, ${durationWeeks ?? null},
        ${evidenceLevel ?? "animal"}, ${isFeatured ?? false},
        ${shopBundleId ?? null}, ${academyModuleId ?? null},
        ${contentHook ?? null}, ${status ?? "draft"}
      )
    `);

    const [created] = await db.execute(sql`SELECT * FROM stacks WHERE id = ${id}`) as any[];
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── PATCH /api/stacks/:id ────────────────────────────────────────────────────
router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fieldMap: Record<string, string> = {
      name: "name", goal: "goal", description: "description",
      targetAudience: "target_audience", entityIds: "entity_ids",
      entityRoles: "entity_roles", synergyDescription: "synergy_description",
      difficulty: "difficulty", durationWeeks: "duration_weeks",
      evidenceLevel: "evidence_level", isFeatured: "is_featured",
      shopBundleId: "shop_bundle_id", academyModuleId: "academy_module_id",
      contentHook: "content_hook", status: "status",
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in updates) {
        const val = typeof updates[key] === "object" ? JSON.stringify(updates[key]) : updates[key];
        await db.execute(sql`UPDATE stacks SET ${sql.raw(col)} = ${val}, updated_at = NOW() WHERE id = ${id}`);
      }
    }

    const [updated] = await db.execute(sql`SELECT * FROM stacks WHERE id = ${id}`) as any[];
    if (!updated) return res.status(404).json({ error: "Stack not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export { router as stacksRouter };
