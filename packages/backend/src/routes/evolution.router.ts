/**
 * evolution.router.ts
 *
 * Phase 3 — Self-Improving Knowledge System
 * REST-Endpoints für Knowledge Evolution Engine, Content Factory und Pattern Library.
 *
 * Endpoints:
 *   POST /api/evolution/evolve/:entityId       — Entity-Wissen neu bewerten
 *   POST /api/evolution/evolve-all             — Alle Entities neu bewerten
 *   GET  /api/evolution/scores/:entityId       — Aktuelle Scores abrufen
 *   GET  /api/evolution/scores                 — Alle Scores (Ranking)
 *   POST /api/evolution/propagate/:entityId    — Propagation manuell auslösen
 *   GET  /api/evolution/queue                  — Propagation Queue Status
 *   POST /api/evolution/queue/process          — Queue verarbeiten
 *   POST /api/evolution/content/:entityId/:type — Content generieren
 *   GET  /api/evolution/content/:entityId/:type — Generierten Content abrufen
 *   POST /api/evolution/content/:entityId/all  — Alle 16 Outputs generieren
 *   GET  /api/evolution/patterns               — Pattern Library abrufen
 *   POST /api/evolution/patterns/:id/approve   — Pattern approven
 *   GET  /api/evolution/stats                  — Gesamt-Statistiken
 */

import { Router, Request, Response } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { evolveEntityKnowledge, evolveAllEntities, processPropagationQueue } from "../services/knowledge-evolution.service.js";
import { generateContent, generateAllContent, getGeneratedContent, OutputType } from "../services/content-factory.service.js";
import { getPatternStats, getRelevantPatterns } from "../services/pattern-library.service.js";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

const router = Router();

// ─── Knowledge Evolution ──────────────────────────────────────────────────────

/**
 * POST /api/evolution/evolve/:entityId
 * Entity-Wissen neu bewerten und Scores berechnen.
 */
router.post("/evolve/:entityId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const trigger = (req.body?.trigger ?? "manual") as any;

    const scores = await evolveEntityKnowledge(entityId, trigger);
    res.json({ success: true, scores });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Evolution failed" });
  }
});

/**
 * POST /api/evolution/evolve-all
 * Alle published Entities neu bewerten.
 */
router.post("/evolve-all", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await evolveAllEntities("manual");
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Batch evolution failed" });
  }
});

/**
 * GET /api/evolution/scores/:entityId
 * Aktuelle Knowledge Scores für eine Entity.
 */
router.get("/scores/:entityId", async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const result = await db.execute(sql`
      SELECT kes.*, e.slug, e.canonical_name, e.type
      FROM knowledge_evolution_scores kes
      JOIN entities e ON e.id = kes.entity_id
      WHERE kes.entity_id = ${entityId}
      LIMIT 1
    `) as any[];

    if (!result || result.length === 0) {
      return res.status(404).json({ error: "No scores found for this entity" });
    }
    res.json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

/**
 * GET /api/evolution/scores
 * Alle Entities nach Knowledge Score gerankt.
 */
router.get("/scores", async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`
      SELECT kes.entity_id, kes.knowledge_score, kes.research_score,
             kes.evidence_score, kes.freshness_score, kes.confidence_score,
             kes.completeness_score, kes.total_blocks, kes.total_sources,
             kes.total_relations, kes.missing_block_types, kes.computed_at,
             e.slug, e.canonical_name, e.type
      FROM knowledge_evolution_scores kes
      JOIN entities e ON e.id = kes.entity_id
      ORDER BY kes.knowledge_score DESC
    `) as any[];

    res.json({
      total: result?.length ?? 0,
      entities: result ?? [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── Knowledge Propagation ────────────────────────────────────────────────────

/**
 * GET /api/evolution/queue
 * Propagation Queue Status.
 */
router.get("/queue", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const stats = await db.execute(sql`
      SELECT
        status,
        output_type,
        COUNT(*) as count
      FROM knowledge_propagation_queue
      GROUP BY status, output_type
      ORDER BY status, output_type
    `) as any[];

    const pending = await db.execute(sql`
      SELECT q.entity_id, q.output_type, q.trigger_reason, q.created_at,
             e.slug, e.canonical_name
      FROM knowledge_propagation_queue q
      JOIN entities e ON e.id = q.entity_id
      WHERE q.status = 'pending'
      ORDER BY q.created_at ASC
      LIMIT 20
    `) as any[];

    res.json({ stats: stats ?? [], pending: pending ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

/**
 * POST /api/evolution/queue/process
 * Propagation Queue verarbeiten.
 */
router.post("/queue/process", requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.body?.limit ?? "20");
    const result = await processPropagationQueue(limit);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── Content Factory ──────────────────────────────────────────────────────────

/**
 * POST /api/evolution/content/:entityId/:outputType
 * Spezifischen Content-Typ generieren.
 */
router.post("/content/:entityId/:outputType", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { entityId, outputType } = req.params;
    const result = await generateContent(entityId, outputType as OutputType);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

/**
 * GET /api/evolution/content/:entityId/:outputType
 * Gespeicherten generierten Content abrufen.
 */
router.get("/content/:entityId/:outputType", async (req: Request, res: Response) => {
  try {
    const { entityId, outputType } = req.params;
    const content = await getGeneratedContent(entityId, outputType as OutputType);
    if (!content) {
      return res.status(404).json({ error: "No generated content found" });
    }
    res.json(content);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

/**
 * POST /api/evolution/content/:entityId/all
 * Alle 16 Output-Typen generieren.
 */
router.post("/content/:entityId/all", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const result = await generateAllContent(entityId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── Pattern Library ──────────────────────────────────────────────────────────

/**
 * GET /api/evolution/patterns
 * Pattern Library abrufen.
 */
router.get("/patterns", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { agentRole, entityId, status, limit } = req.query;

    let query = sql`
      SELECT id, pattern_type, agent_role, entity_id, pattern_text,
             example_query, example_response, frequency, quality_score,
             status, created_at
      FROM pattern_library
      WHERE 1=1
    `;

    if (agentRole) {
      query = sql`${query} AND agent_role = ${agentRole as string}`;
    }
    if (entityId) {
      query = sql`${query} AND entity_id = ${entityId as string}`;
    }
    if (status) {
      query = sql`${query} AND status = ${status as string}`;
    }

    query = sql`${query} ORDER BY frequency DESC, quality_score DESC LIMIT ${parseInt(limit as string ?? "50")}`;

    const patterns = await db.execute(query) as any[];
    const stats = await getPatternStats();

    res.json({ patterns: patterns ?? [], stats });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

/**
 * POST /api/evolution/patterns/:id/approve
 * Pattern approven.
 */
router.post("/patterns/:id/approve", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.execute(sql`
      UPDATE pattern_library
      SET status = 'approved', updated_at = NOW()
      WHERE id = ${id}
    `);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── Gesamt-Statistiken ───────────────────────────────────────────────────────

/**
 * GET /api/evolution/stats
 * Gesamt-Statistiken des Self-Improving Systems.
 */
router.get("/stats", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [scoreStats, queueStats, patternStats, contentStats, logStats] = await Promise.all([
      // Score-Statistiken
      db.execute(sql`
        SELECT
          COUNT(*) as total_entities,
          AVG(knowledge_score) as avg_knowledge_score,
          AVG(completeness_score) as avg_completeness,
          AVG(evidence_score) as avg_evidence,
          COUNT(*) FILTER (WHERE knowledge_score >= 0.8) as high_quality_count,
          COUNT(*) FILTER (WHERE knowledge_score < 0.5) as low_quality_count
        FROM knowledge_evolution_scores
      `),
      // Queue-Statistiken
      db.execute(sql`
        SELECT status, COUNT(*) as count
        FROM knowledge_propagation_queue
        GROUP BY status
      `),
      // Pattern-Statistiken
      getPatternStats(),
      // Content-Statistiken
      db.execute(sql`
        SELECT output_type, status, COUNT(*) as count
        FROM generated_content_store
        GROUP BY output_type, status
        ORDER BY output_type
      `),
      // Evolution-Log (letzte 24h)
      db.execute(sql`
        SELECT COUNT(*) as evolutions_24h,
               AVG(knowledge_score) as avg_score_24h,
               AVG(score_delta) as avg_delta_24h
        FROM knowledge_evolution_log
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `),
    ]);

    res.json({
      scores: (scoreStats as any[])[0] ?? {},
      queue: queueStats ?? [],
      patterns: patternStats,
      content: contentStats ?? [],
      evolution_24h: (logStats as any[])[0] ?? {},
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
