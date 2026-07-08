import { Router, Request, Response } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { aiPrompts, aiGenerationLog } from "../db/schema.js";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

// GET /api/prompts — list all prompts
router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const promptType = req.query.promptType as string;
    const active = req.query.active;
    const search = req.query.search as string;

    const conditions = [];
    if (promptType) conditions.push(eq(aiPrompts.promptType, promptType as any));
    if (active !== undefined) conditions.push(eq(aiPrompts.active, active === "true"));
    if (search) conditions.push(ilike(aiPrompts.name, `%${search}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db.select().from(aiPrompts)
        .where(where)
        .orderBy(desc(aiPrompts.updatedAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(aiPrompts).where(where),
    ]);

    res.json({ data: rows, total: countResult[0]?.count ?? 0, limit, offset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/prompts/:idOrSlug
router.get("/:idOrSlug", async (req: Request, res: Response) => {
  try {
    const { idOrSlug } = req.params;
    const [prompt] = await db.select().from(aiPrompts)
      .where(eq(aiPrompts.slug, idOrSlug));

    if (!prompt) {
      const [byId] = await db.select().from(aiPrompts).where(eq(aiPrompts.id, idOrSlug));
      if (!byId) return res.status(404).json({ error: "Prompt not found" });
      return res.json(byId);
    }

    res.json(prompt);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prompts — create new prompt
router.post("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.body.id || randomUUID();
    const [created] = await db.insert(aiPrompts).values({
      id,
      ...req.body,
      version: 1,
    }).returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/prompts/:id — update (creates new version)
router.put("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const [current] = await db.select().from(aiPrompts).where(eq(aiPrompts.id, req.params.id));
    if (!current) return res.status(404).json({ error: "Prompt not found" });

    const [updated] = await db.update(aiPrompts)
      .set({
        ...req.body,
        version: current.version + 1,
        previousVersionId: current.id,
        updatedAt: new Date(),
      })
      .where(eq(aiPrompts.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/prompts/:id — soft delete (set active = false)
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.update(aiPrompts)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(aiPrompts.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/prompts/:id/logs — generation history for this prompt
router.get("/:id/logs", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const logs = await db.select().from(aiGenerationLog)
      .where(eq(aiGenerationLog.promptId, req.params.id))
      .orderBy(desc(aiGenerationLog.createdAt))
      .limit(limit);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
