import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { relations, entities } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { validateRelation } from "../services/ontology.service.js";
import { requireAdmin } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

const createRelationSchema = z.object({
  fromEntityId: z.string().min(1),
  relationType: z.string().min(1),
  toEntityId: z.string().min(1),
  layer: z.string().optional().default("L2"),
  scope: z.array(z.string()).optional().default(["portal", "academy", "bedo"]),
  description: z.string().optional(),
  sources: z.array(z.string()).optional().default([]),
  studyTypes: z.array(z.string()).optional().default([]),
  confidenceScore: z.number().min(0).max(1).optional().default(0.5),
  evidenceLevel: z.string().optional(),
});

// ─── Public: Get relations for an entity ─────────────────────────────────────

router.get("/entity/:entityId", async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const rows = await db
      .select()
      .from(relations)
      .where(eq(relations.fromEntityId, entityId));
    res.json({ data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Protected: Create relation (with ontology validation) ───────────────────

router.post("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = createRelationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { fromEntityId, relationType, toEntityId } = parsed.data;

    // Fetch entity types for ontology validation
    const fromEntity = await db
      .select({ type: entities.type })
      .from(entities)
      .where(eq(entities.id, fromEntityId))
      .limit(1);

    const toEntity = await db
      .select({ type: entities.type })
      .from(entities)
      .where(eq(entities.id, toEntityId))
      .limit(1);

    if (fromEntity.length === 0) {
      return res.status(404).json({ error: `Source entity "${fromEntityId}" not found` });
    }
    if (toEntity.length === 0) {
      return res.status(404).json({ error: `Target entity "${toEntityId}" not found` });
    }

    // Ontology validation
    const validation = await validateRelation(
      fromEntity[0].type,
      relationType,
      toEntity[0].type
    );

    if (!validation.valid) {
      return res.status(422).json({
        error: "Ontology validation failed",
        details: validation.errors,
      });
    }

    const relation = await db
      .insert(relations)
      .values({
        id: uuidv4(),
        fromEntityId: parsed.data.fromEntityId,
        relationType: parsed.data.relationType as any,
        toEntityId: parsed.data.toEntityId,
        layer: parsed.data.layer as any,
        scope: parsed.data.scope,
        description: parsed.data.description,
        sources: parsed.data.sources,
        studyTypes: parsed.data.studyTypes,
        confidenceScore: parsed.data.confidenceScore,
        evidenceLevel: parsed.data.evidenceLevel as any,
      })
      .returning();

    res.status(201).json({ relation: relation[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Protected: Delete relation ───────────────────────────────────────────────

router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.delete(relations).where(eq(relations.id, req.params.id));
    res.json({ message: "Relation deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as relationsRouter };
