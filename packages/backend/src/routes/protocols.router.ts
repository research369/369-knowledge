import { Router } from "express";
import { db } from "../db/index.js";
import { protocols } from "../db/schema.js";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

export const protocolsRouter = Router();

// ─── Public: List protocols ───────────────────────────────────────────────────
protocolsRouter.get("/", async (req, res) => {
  try {
    const { page = "1", limit = "20", q, goal, status = "published" } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];

    if (status) conditions.push(eq(protocols.status, status as any));
    if (goal) conditions.push(ilike(protocols.goal, `%${goal}%`));
    if (q) conditions.push(ilike(protocols.name, `%${q}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db.select().from(protocols).where(where).orderBy(desc(protocols.updatedAt)).limit(parseInt(limit)).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(protocols).where(where),
    ]);

    res.json({ data: rows, total: Number(countResult[0]?.count ?? 0), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Public: Get protocol by slug ─────────────────────────────────────────────
protocolsRouter.get("/slug/:slug", async (req, res) => {
  try {
    const [protocol] = await db.select().from(protocols).where(eq(protocols.slug, req.params.slug)).limit(1);
    if (!protocol) return res.status(404).json({ error: "Protocol not found" });
    res.json(protocol);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Public: Get protocol by ID ───────────────────────────────────────────────
protocolsRouter.get("/:id", async (req, res) => {
  try {
    const [protocol] = await db.select().from(protocols).where(eq(protocols.id, req.params.id)).limit(1);
    if (!protocol) return res.status(404).json({ error: "Protocol not found" });
    res.json(protocol);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: Create ────────────────────────────────────────────────────────────
protocolsRouter.post("/", requireAdmin, async (req, res) => {
  try {
    const id = req.body.id || `protocol-${uuidv4()}`;
    const [created] = await db.insert(protocols).values({ ...req.body, id }).returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: Update ────────────────────────────────────────────────────────────
protocolsRouter.put("/:id", requireAdmin, async (req, res) => {
  try {
    const [updated] = await db.update(protocols).set({ ...req.body, updatedAt: new Date() }).where(eq(protocols.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Protocol not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: Delete ────────────────────────────────────────────────────────────
protocolsRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const [deleted] = await db.delete(protocols).where(eq(protocols.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Protocol not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: Publish ───────────────────────────────────────────────────────────
protocolsRouter.post("/:id/publish", requireAdmin, async (req, res) => {
  try {
    const [updated] = await db.update(protocols).set({ status: "published", updatedAt: new Date() }).where(eq(protocols.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Protocol not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
