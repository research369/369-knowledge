import { Router } from "express";
import { db } from "../db/index.js";
import { studies } from "../db/schema.js";
import { eq, desc, ilike, and, or, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

export const studiesRouter = Router();

// ─── Public: List studies ─────────────────────────────────────────────────────
studiesRouter.get("/", async (req, res) => {
  try {
    const {
      page = "1",
      limit = "20",
      q,
      entityId,
      studyType,
      isHuman,
      isRct,
      yearFrom,
      yearTo,
      status = "published",
    } = req.query as Record<string, string>;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];

    if (status) conditions.push(eq(studies.status, status as any));
    if (entityId) conditions.push(eq(studies.entityId, entityId));
    if (studyType) conditions.push(eq(studies.studyType, studyType as any));
    if (isHuman === "true") conditions.push(eq(studies.isHuman, true));
    if (isRct === "true") conditions.push(eq(studies.isRct, true));
    if (yearFrom) conditions.push(sql`${studies.year} >= ${parseInt(yearFrom)}`);
    if (yearTo) conditions.push(sql`${studies.year} <= ${parseInt(yearTo)}`);
    if (q) {
      conditions.push(
        or(
          ilike(studies.title, `%${q}%`),
          ilike(studies.journal, `%${q}%`),
          ilike(studies.aiSummaryDe, `%${q}%`)
        )
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(studies)
        .where(where)
        .orderBy(desc(studies.year))
        .limit(parseInt(limit))
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(studies).where(where),
    ]);

    res.json({
      data: rows,
      total: Number(countResult[0]?.count ?? 0),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Public: Get study by ID ──────────────────────────────────────────────────
studiesRouter.get("/:id", async (req, res) => {
  try {
    const [study] = await db
      .select()
      .from(studies)
      .where(eq(studies.id, req.params.id))
      .limit(1);

    if (!study) return res.status(404).json({ error: "Study not found" });
    res.json(study);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: Create study ──────────────────────────────────────────────────────
studiesRouter.post("/", requireAdmin, async (req, res) => {
  try {
    const id = req.body.id || `study-${uuidv4()}`;
    const [created] = await db
      .insert(studies)
      .values({ ...req.body, id })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: Update study ──────────────────────────────────────────────────────
studiesRouter.put("/:id", requireAdmin, async (req, res) => {
  try {
    const [updated] = await db
      .update(studies)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(studies.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Study not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: Delete study ──────────────────────────────────────────────────────
studiesRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const [deleted] = await db
      .delete(studies)
      .where(eq(studies.id, req.params.id))
      .returning();

    if (!deleted) return res.status(404).json({ error: "Study not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: Publish study ─────────────────────────────────────────────────────
studiesRouter.post("/:id/publish", requireAdmin, async (req, res) => {
  try {
    const [updated] = await db
      .update(studies)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(studies.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Study not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
