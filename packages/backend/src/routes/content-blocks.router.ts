import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { contentBlocks } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireAdmin } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

const blockSchema = z.object({
  entityId: z.string().min(1),
  layer: z.enum(["L1", "L2", "L3", "L4", "L5", "L6", "L7"]),
  scope: z.array(z.string()).default(["portal", "academy", "bedo"]),
  blockType: z.string().min(1),
  title: z.string().optional(),
  body: z.string().min(1),
  sources: z.array(z.string()).default([]),
  sortOrder: z.number().default(0),
});

// ─── Get all blocks for an entity ────────────────────────────────────────────

router.get("/entity/:entityId", async (req: Request, res: Response) => {
  try {
    const blocks = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.entityId, req.params.entityId))
      .orderBy(contentBlocks.sortOrder);
    res.json({ data: blocks });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Create block ─────────────────────────────────────────────────────────────

router.post("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = blockSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const block = await db
      .insert(contentBlocks)
      .values({ id: uuidv4(), ...parsed.data })
      .returning();

    res.status(201).json({ block: block[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Update block ─────────────────────────────────────────────────────────────

router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    delete updates.id;
    delete updates.entityId;
    delete updates.createdAt;

    await db
      .update(contentBlocks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contentBlocks.id, req.params.id));

    const updated = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.id, req.params.id))
      .limit(1);

    res.json({ block: updated[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Delete block ─────────────────────────────────────────────────────────────

router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.delete(contentBlocks).where(eq(contentBlocks.id, req.params.id));
    res.json({ message: "Block deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as contentBlocksRouter };
