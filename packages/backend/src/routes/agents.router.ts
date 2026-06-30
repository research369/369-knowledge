import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db/index.js";
import { agentApiKeys, agentSuggestions, agentAccessLog, entities, sources } from "../db/schema.js";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { createHash } from "crypto";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function generateApiKey(): string {
  return `369k_${randomUUID().replace(/-/g, "")}`;
}

// ─── Admin: API Key Management ────────────────────────────────────────────────

// GET /api/agents/keys — list all agent keys (admin)
router.get("/keys", async (req: Request, res: Response) => {
  try {
    const keys = await db.select({
      id: agentApiKeys.id,
      name: agentApiKeys.name,
      agentRole: agentApiKeys.agentRole,
      canRead: agentApiKeys.canRead,
      canSuggest: agentApiKeys.canSuggest,
      canWrite: agentApiKeys.canWrite,
      active: agentApiKeys.active,
      lastUsedAt: agentApiKeys.lastUsedAt,
      requestCount: agentApiKeys.requestCount,
      createdAt: agentApiKeys.createdAt,
      expiresAt: agentApiKeys.expiresAt,
      description: agentApiKeys.description,
      rateLimit: agentApiKeys.rateLimit,
    }).from(agentApiKeys).orderBy(desc(agentApiKeys.createdAt));

    res.json(keys);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agents/keys — create new agent key (admin)
router.post("/keys", async (req: Request, res: Response) => {
  try {
    const rawKey = generateApiKey();
    const keyHash = hashKey(rawKey);
    const id = randomUUID();

    const [created] = await db.insert(agentApiKeys).values({
      id,
      name: req.body.name,
      agentRole: req.body.agentRole,
      keyHash,
      canRead: req.body.canRead ?? true,
      canSuggest: req.body.canSuggest ?? false,
      canWrite: req.body.canWrite ?? false,
      allowedEntityTypes: req.body.allowedEntityTypes ?? [],
      allowedTopicIds: req.body.allowedTopicIds ?? [],
      rateLimit: req.body.rateLimit ?? 1000,
      description: req.body.description,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
    }).returning();

    // Return the raw key ONCE — it cannot be retrieved again
    res.status(201).json({ ...created, rawKey, warning: "Store this key securely — it will not be shown again." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agents/keys/:id — update key settings
router.put("/keys/:id", async (req: Request, res: Response) => {
  try {
    const [updated] = await db.update(agentApiKeys)
      .set({
        name: req.body.name,
        canRead: req.body.canRead,
        canSuggest: req.body.canSuggest,
        canWrite: req.body.canWrite,
        active: req.body.active,
        rateLimit: req.body.rateLimit,
        description: req.body.description,
        allowedEntityTypes: req.body.allowedEntityTypes,
        allowedTopicIds: req.body.allowedTopicIds,
      })
      .where(eq(agentApiKeys.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Key not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agents/keys/:id — deactivate key
router.delete("/keys/:id", async (req: Request, res: Response) => {
  try {
    await db.update(agentApiKeys).set({ active: false }).where(eq(agentApiKeys.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Suggestions ──────────────────────────────────────────────────────────────

// GET /api/agents/suggestions — list suggestions (admin review queue)
router.get("/suggestions", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string || "pending";

    const conditions = [];
    if (status !== "all") conditions.push(eq(agentSuggestions.status, status as any));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db.select().from(agentSuggestions)
        .where(where)
        .orderBy(desc(agentSuggestions.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(agentSuggestions).where(where),
    ]);

    res.json({ data: rows, total: countResult[0]?.count ?? 0, limit, offset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agents/suggestions — agent submits a suggestion
// Requires valid agent API key with canSuggest = true
router.post("/suggestions", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Agent API key required" });
    }

    const rawKey = authHeader.slice(7);
    const keyHash = hashKey(rawKey);
    const [agentKey] = await db.select().from(agentApiKeys)
      .where(and(eq(agentApiKeys.keyHash, keyHash), eq(agentApiKeys.active, true)));

    if (!agentKey) return res.status(401).json({ error: "Invalid or inactive API key" });
    if (!agentKey.canSuggest) return res.status(403).json({ error: "This key does not have suggestion permissions" });

    // Validate suggestion type
    const VALID_SUGGESTION_TYPES = [
      "new_faq", "new_guide", "new_source", "new_module",
      "new_relation", "new_stack", "update_block", "new_glossar",
      "new_entity", "update_entity", "new_protocol", "new_collection",
    ];
    if (!req.body.suggestionType || !VALID_SUGGESTION_TYPES.includes(req.body.suggestionType)) {
      return res.status(400).json({
        error: `Invalid suggestionType. Must be one of: ${VALID_SUGGESTION_TYPES.join(", ")}`,
      });
    }

    // Sources are required for content suggestions, optional for structural suggestions
    const SOURCE_OPTIONAL_TYPES = ["new_relation", "new_stack", "new_module", "new_collection"];
    const sourceIds: string[] = req.body.sourceIds || [];
    if (sourceIds.length === 0 && !SOURCE_OPTIONAL_TYPES.includes(req.body.suggestionType)) {
      return res.status(400).json({ error: `Suggestions of type '${req.body.suggestionType}' must cite at least one source (sourceIds required)` });
    }

    // Validate sources exist
    for (const sourceId of sourceIds) {
      const [src] = await db.select().from(sources).where(eq(sources.id, sourceId));
      if (!src) return res.status(400).json({ error: `Source not found: ${sourceId}` });
    }

    const id = randomUUID();
    const [created] = await db.insert(agentSuggestions).values({
      id,
      agentKeyId: agentKey.id,
      agentRole: agentKey.agentRole,
      suggestionType: req.body.suggestionType,
      targetEntityId: req.body.targetEntityId,
      targetContentBlockId: req.body.targetContentBlockId,
      payload: req.body.payload,
      reasoning: req.body.reasoning,
      confidence: req.body.confidence,
      sourceIds,
      status: "pending",
    }).returning();

    // Update key usage stats
    await db.update(agentApiKeys)
      .set({ lastUsedAt: new Date(), requestCount: sql`request_count + 1` })
      .where(eq(agentApiKeys.id, agentKey.id));

    // Log access
    await db.insert(agentAccessLog).values({
      id: randomUUID(),
      agentKeyId: agentKey.id,
      agentRole: agentKey.agentRole,
      endpoint: "/api/agents/suggestions",
      method: "POST",
      entityId: req.body.targetEntityId,
      statusCode: 201,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agents/suggestions/:id/review — admin reviews a suggestion
router.put("/suggestions/:id/review", async (req: Request, res: Response) => {
  try {
    const { status, reviewNote, reviewedBy } = req.body;
    if (!["approved", "rejected", "under_review", "merged"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [updated] = await db.update(agentSuggestions)
      .set({
        status,
        reviewNote,
        reviewedBy,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentSuggestions.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Suggestion not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Access Log ───────────────────────────────────────────────────────────────

// GET /api/agents/logs — access log (admin)
router.get("/logs", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await db.select().from(agentAccessLog)
      .orderBy(desc(agentAccessLog.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Public Agent Read API ────────────────────────────────────────────────────

// GET /api/agents/entity/:slug — agent reads entity (requires valid API key)
router.get("/entity/:slug", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Agent API key required" });
    }

    const rawKey = authHeader.slice(7);
    const keyHash = hashKey(rawKey);
    const [agentKey] = await db.select().from(agentApiKeys)
      .where(and(eq(agentApiKeys.keyHash, keyHash), eq(agentApiKeys.active, true)));

    if (!agentKey) return res.status(401).json({ error: "Invalid or inactive API key" });
    if (!agentKey.canRead) return res.status(403).json({ error: "Read permission denied" });

    // Log access
    await db.insert(agentAccessLog).values({
      id: randomUUID(),
      agentKeyId: agentKey.id,
      agentRole: agentKey.agentRole,
      endpoint: `/api/agents/entity/${req.params.slug}`,
      method: "GET",
      entityId: req.params.slug,
      statusCode: 200,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Update usage
    await db.update(agentApiKeys)
      .set({ lastUsedAt: new Date(), requestCount: sql`request_count + 1` })
      .where(eq(agentApiKeys.id, agentKey.id));

    const [entity] = await db.select().from(entities)
      .where(eq(entities.slug, req.params.slug));

    if (!entity) return res.status(404).json({ error: "Entity not found" });
    res.json(entity);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
