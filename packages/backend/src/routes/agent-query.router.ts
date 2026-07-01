/**
 * Agent Query Router — Zentraler Einstiegspunkt für alle KI-Agenten
 *
 * POST /api/agent/query  — Semantische Suche + Knowledge-Graph-Traversal
 * GET  /api/agent/context/:slug — Vollständiger Agenten-Kontext für eine Entity
 * POST /api/agent/feedback — Fehlende-Daten-Report vom Agenten
 */

import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { entities, contentBlocks, relations, agentApiKeys, agentAccessLog } from "../db/schema.js";
import { eq, ilike, or, inArray, sql, and } from "drizzle-orm";
import { createHash, randomUUID } from "crypto";

const router = Router();

// ─── Auth: Agent API Key ──────────────────────────────────────────────────────
async function authenticateAgent(req: Request, res: Response): Promise<{ keyRecord: any } | null> {
  const rawKey = req.headers["x-agent-key"] as string ?? req.headers.authorization?.replace("Bearer ", "");
  if (!rawKey) {
    res.status(401).json({ error: "Agent API key required (x-agent-key header)" });
    return null;
  }
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const [keyRecord] = await db.select().from(agentApiKeys).where(
    and(eq(agentApiKeys.keyHash, keyHash), eq(agentApiKeys.active, true))
  ).limit(1);

  if (!keyRecord) {
    res.status(401).json({ error: "Invalid or inactive agent key" });
    return null;
  }

  // Update last used
  await db.execute(sql`
    UPDATE agent_api_keys
    SET last_used_at = NOW(), request_count = request_count + 1
    WHERE id = ${keyRecord.id}
  `);

  return { keyRecord };
}

// ─── POST /api/agent/query ────────────────────────────────────────────────────
router.post("/query", async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const auth = await authenticateAgent(req, res);
    if (!auth) return;

    const {
      query,
      entitySlugs,
      entityTypes,
      system = "agent",
      includeRelations = true,
      includeBlocks = true,
      maxRelationsDepth = 1,
      language = "de",
      sessionId,
    } = req.body;

    if (!query && !entitySlugs?.length) {
      return res.status(400).json({ error: "query or entitySlugs required" });
    }

    // 1. Find relevant entities
    let targetEntities: any[] = [];

    if (entitySlugs?.length) {
      targetEntities = await db.select().from(entities).where(
        or(...entitySlugs.map((s: string) => eq(entities.slug, s)))
      );
    } else if (query) {
      // Semantic search via text matching (full-text search fallback)
      targetEntities = await db.select().from(entities).where(
        or(
          ilike(entities.canonicalName, `%${query}%`),
          ilike(entities.shortDescription, `%${query}%`),
          sql`${entities.aliases}::text ILIKE ${'%' + query + '%'}`,
          sql`${entities.tags}::text ILIKE ${'%' + query + '%'}`
        )
      ).limit(10);
    }

    if (entityTypes?.length) {
      targetEntities = targetEntities.filter(e => entityTypes.includes(e.type));
    }

    // 2. Build knowledge context
    const result: any = {
      query,
      system,
      entities: [],
      totalEntities: targetEntities.length,
      generatedAt: new Date().toISOString(),
    };

    const entityIds = targetEntities.map(e => e.id);

    for (const entity of targetEntities) {
      const entityData: any = {
        id: entity.id,
        slug: entity.slug,
        type: entity.type,
        canonicalName: entity.canonicalName,
        shortDescription: entity.shortDescription,
        categories: entity.categories,
        tags: entity.tags,
        metrics: entity.metrics,
        contentCompleteness: entity.contentCompleteness,
        goldstandardApproved: entity.goldstandardApproved,
        // Agent-specific fields
        salesPitch: (entity as any).agentSalesPitch,
        supportFaq: (entity as any).agentSupportFaq ?? [],
        researchContext: (entity as any).agentResearchContext,
        medicalDisclaimer: (entity as any).agentMedicalDisclaimer,
        confidenceScore: (entity as any).agentConfidenceScore ?? 0.8,
      };

      // Include content blocks
      if (includeBlocks) {
        const blocks = await db.select({
          id: contentBlocks.id,
          layer: contentBlocks.layer,
          title: contentBlocks.title,
          body: contentBlocks.body,
          comprehensionLevel: contentBlocks.comprehensionLevel,
          targetAudience: contentBlocks.targetAudience,
          sortOrder: contentBlocks.sortOrder,
        }).from(contentBlocks).where(
          and(
            eq(contentBlocks.entityId, entity.id),
            eq(contentBlocks.lifecycleStatus, "approved" as any)
          )
        ).orderBy(contentBlocks.sortOrder);
        entityData.blocks = blocks;
      }

      // Include relations
      if (includeRelations) {
        const rels = await db.select().from(relations).where(
          or(
            eq(relations.fromEntityId, entity.id),
            eq(relations.toEntityId, entity.id)
          )
        );

        // Resolve targets
        const targetIds = rels.map(r => r.fromEntityId === entity.id ? r.toEntityId : r.fromEntityId);
        const uniqueTargetIds = [...new Set(targetIds)];
        let targets: Record<string, any> = {};
        if (uniqueTargetIds.length > 0) {
          const targetEntitiesData = await db.select({
            id: entities.id,
            slug: entities.slug,
            canonicalName: entities.canonicalName,
            type: entities.type,
            shortDescription: entities.shortDescription,
          }).from(entities).where(inArray(entities.id, uniqueTargetIds));
          targets = Object.fromEntries(targetEntitiesData.map(e => [e.id, e]));
        }

        entityData.relations = rels
          .filter(r => (r as any).agentVisible !== false)
          .map(r => ({
            id: r.id,
            type: r.relationType,
            direction: r.fromEntityId === entity.id ? "outgoing" : "incoming",
            target: targets[r.fromEntityId === entity.id ? r.toEntityId : r.fromEntityId] ?? null,
            description: r.description,
            confidenceScore: r.confidenceScore,
            evidenceLevel: r.evidenceLevel,
            context: (r as any).relationContext,
          }));
      }

      result.entities.push(entityData);
    }

    // 3. Log query
    const queryId = randomUUID();
    await db.execute(sql`
      INSERT INTO agent_queries (
        id, agent_role, query, entity_ids_accessed, language, duration_ms, session_id, created_at
      ) VALUES (
        ${queryId},
        ${auth.keyRecord.agentRole},
        ${query ?? "entity_lookup"},
        ${JSON.stringify(entityIds)},
        ${language},
        ${Date.now() - startTime},
        ${sessionId ?? null},
        NOW()
      )
    `);

    result.queryId = queryId;
    result.durationMs = Date.now() - startTime;

    res.json(result);
  } catch (err: any) {
    console.error("[agent-query] Error:", err?.message);
    res.status(500).json({ error: err?.message });
  }
});

// ─── GET /api/agent/context/:slug ─────────────────────────────────────────────
router.get("/context/:slug", async (req: Request, res: Response) => {
  try {
    const auth = await authenticateAgent(req, res);
    if (!auth) return;

    const { slug } = req.params;
    const role = auth.keyRecord.agentRole as string;

    // Get entity
    let [entity] = await db.select().from(entities).where(eq(entities.slug, slug)).limit(1);
    if (!entity) {
      [entity] = await db.select().from(entities).where(eq(entities.id, slug)).limit(1);
    }
    if (!entity) return res.status(404).json({ error: "Entity not found" });

    // Get all blocks
    const blocks = await db.select().from(contentBlocks).where(
      eq(contentBlocks.entityId, entity.id)
    ).orderBy(contentBlocks.sortOrder);

    // Get all relations with targets
    const rels = await db.select().from(relations).where(
      or(
        eq(relations.fromEntityId, entity.id),
        eq(relations.toEntityId, entity.id)
      )
    );

    const targetIds = [...new Set(rels.map(r =>
      r.fromEntityId === entity.id ? r.toEntityId : r.fromEntityId
    ))];

    let relTargets: Record<string, any> = {};
    if (targetIds.length > 0) {
      const targets = await db.select({
        id: entities.id, slug: entities.slug,
        canonicalName: entities.canonicalName, type: entities.type,
        shortDescription: entities.shortDescription,
      }).from(entities).where(inArray(entities.id, targetIds));
      relTargets = Object.fromEntries(targets.map(e => [e.id, e]));
    }

    // Role-specific context
    const context: Record<string, any> = {
      role,
      entity: {
        ...entity,
        // Role-specific extras
        ...(role === "sales" && {
          salesPitch: (entity as any).agentSalesPitch,
          shopBulletPoints: (entity as any).shopBulletPoints ?? [],
          targetAudience: (entity as any).shopTargetAudience ?? [],
          badgeLabels: (entity as any).shopBadgeLabels ?? [],
          upsellEntityIds: (entity as any).upsellEntityIds ?? [],
        }),
        ...(role === "support" && {
          supportFaq: (entity as any).agentSupportFaq ?? [],
          contraindications: (entity as any).shopContraindications ?? [],
          storageInstructions: (entity as any).shopStorageInstructions,
          medicalDisclaimer: (entity as any).agentMedicalDisclaimer,
        }),
        ...(role === "research" && {
          researchContext: (entity as any).agentResearchContext,
          casNumber: entity.casNumber,
          molecularFormula: entity.molecularFormula,
          iupacName: entity.iupacName,
        }),
        ...(role === "content" && {
          hook30s: (entity as any).contentHook30s,
          hook60s: (entity as any).contentHook60s,
          tiktokAngle: (entity as any).contentTiktokAngle,
          instagramCaption: (entity as any).contentInstagramCaption,
          viralFact: (entity as any).contentViralFact,
          misconception: (entity as any).contentMisconception,
        }),
      },
      blocks: blocks.filter(b => {
        if (role === "sales") return ["L1", "L2"].includes(b.layer);
        if (role === "support") return ["L1", "L2", "L3"].includes(b.layer);
        return true;
      }),
      relations: rels.map(r => ({
        ...r,
        target: relTargets[r.fromEntityId === entity.id ? r.toEntityId : r.fromEntityId] ?? null,
        direction: r.fromEntityId === entity.id ? "outgoing" : "incoming",
      })),
      meta: {
        generatedAt: new Date().toISOString(),
        entityVersion: entity.version,
        contentCompleteness: entity.contentCompleteness,
        goldstandardApproved: entity.goldstandardApproved,
        blocksCount: blocks.length,
        relationsCount: rels.length,
      },
    };

    res.json(context);
  } catch (err: any) {
    console.error("[agent-query] Context error:", err?.message);
    res.status(500).json({ error: err?.message });
  }
});

// ─── POST /api/agent/feedback ─────────────────────────────────────────────────
router.post("/feedback", async (req: Request, res: Response) => {
  try {
    const auth = await authenticateAgent(req, res);
    if (!auth) return;

    const { queryId, entityId, missingDataReport, improvementSuggestions, responseQuality } = req.body;

    if (queryId) {
      await db.execute(sql`
        UPDATE agent_queries
        SET
          missing_data_report = ${missingDataReport ?? null},
          improvement_suggestions = ${JSON.stringify(improvementSuggestions ?? [])},
          response_quality = ${responseQuality ?? null}
        WHERE id = ${queryId}
      `);
    }

    res.json({ success: true, message: "Feedback recorded" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export { router as agentQueryRouter };
