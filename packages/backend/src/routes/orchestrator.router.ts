/**
 * orchestrator.router.ts
 *
 * Phase 4 — Knowledge Orchestration
 * REST-Endpoints für Knowledge Orchestrator, Priority Engine und Mission Control.
 *
 * Endpoints:
 *   POST /api/orchestrator/analyze/:entityId        — Impact Analysis
 *   POST /api/orchestrator/orchestrate/:entityId    — Orchestrator Decision
 *   GET  /api/orchestrator/decisions                — Alle Decisions
 *   GET  /api/orchestrator/decisions/:id            — Einzelne Decision
 *   GET  /api/orchestrator/tasks                    — Alle Tasks (mit Filter)
 *   POST /api/orchestrator/tasks/:id/complete       — Task als erledigt markieren
 *   POST /api/orchestrator/tasks/:id/skip           — Task überspringen
 *   GET  /api/orchestrator/priorities               — Priority Recommendations
 *   GET  /api/orchestrator/mission-control          — Mission Control Stats
 *   POST /api/orchestrator/trigger/:trigger         — Manueller Trigger für alle Entities
 */
import { Router, Request, Response } from "express";
import { requireAdmin } from "../middleware/auth.js";
import {
  analyzeImpact,
  orchestrate,
  getPriorityRecommendations,
  getMissionControlStats,
  OrchestratorTrigger
} from "../services/knowledge-orchestrator.service.js";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

const router = Router();

// ─── Impact Analysis ──────────────────────────────────────────────────────────

/**
 * POST /api/orchestrator/analyze/:entityId
 * Berechnet Impact Analysis ohne eine Decision zu erstellen.
 * Zeigt: WAS wäre betroffen, WARUM, WIE WICHTIG.
 */
router.post("/analyze/:entityId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { trigger = "manual", scoreDelta, blockType } = req.body;

    const impact = await analyzeImpact(entityId, trigger as OrchestratorTrigger, { scoreDelta, blockType });
    res.json({ success: true, impact });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Impact analysis failed" });
  }
});

// ─── Orchestrator Decision ────────────────────────────────────────────────────

/**
 * POST /api/orchestrator/orchestrate/:entityId
 * Erstellt eine vollständige Orchestrator-Decision mit Aufgabenliste.
 */
router.post("/orchestrate/:entityId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { trigger = "manual", scoreDelta, blockType, triggerDetail } = req.body;

    const decision = await orchestrate(entityId, trigger as OrchestratorTrigger, {
      scoreDelta,
      blockType,
      triggerDetail
    });

    res.json({ success: true, decision });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Orchestration failed" });
  }
});

/**
 * POST /api/orchestrator/orchestrate-all
 * Orchestriert alle published Entities (Batch).
 */
router.post("/orchestrate-all", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { trigger = "manual" } = req.body;

    const entityRows = await db.execute(sql`
      SELECT id FROM entities
      WHERE lifecycle_status = 'published'
        AND type IN ('compound', 'peptide', 'biological_process')
      LIMIT 50
    `) as any[];

    const results = [];
    for (const row of entityRows) {
      try {
        const decision = await orchestrate(row.id, trigger as OrchestratorTrigger);
        results.push({ entityId: row.id, decisionId: decision.id, taskCount: decision.tasks.length });
      } catch (err: any) {
        results.push({ entityId: row.id, error: err?.message });
      }
    }

    res.json({ success: true, processed: results.length, results });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Batch orchestration failed" });
  }
});

// ─── Decisions ────────────────────────────────────────────────────────────────

/**
 * GET /api/orchestrator/decisions
 * Alle Decisions abrufen (neueste zuerst).
 */
router.get("/decisions", requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit ?? 20);
    const entitySlug = req.query.entitySlug as string | undefined;

    let rows: any[];
    if (entitySlug) {
      rows = await db.execute(sql`
        SELECT * FROM orchestrator_decisions
        WHERE entity_slug = ${entitySlug}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `) as any[];
    } else {
      rows = await db.execute(sql`
        SELECT * FROM orchestrator_decisions
        ORDER BY created_at DESC
        LIMIT ${limit}
      `) as any[];
    }

    res.json({ success: true, decisions: rows });
  } catch (err: any) {
    // Tabelle noch nicht migriert
    res.json({ success: true, decisions: [], note: "Migration pending" });
  }
});

/**
 * GET /api/orchestrator/decisions/:id
 * Einzelne Decision mit allen Tasks.
 */
router.get("/decisions/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const decisionRows = await db.execute(sql`
      SELECT * FROM orchestrator_decisions WHERE id = ${id} LIMIT 1
    `) as any[];

    if (!decisionRows[0]) {
      return res.status(404).json({ error: "Decision not found" });
    }

    const taskRows = await db.execute(sql`
      SELECT * FROM orchestrator_tasks
      WHERE decision_id = ${id}
      ORDER BY priority DESC, estimated_impact DESC
    `) as any[];

    res.json({ success: true, decision: decisionRows[0], tasks: taskRows });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── Tasks ────────────────────────────────────────────────────────────────────

/**
 * GET /api/orchestrator/tasks
 * Alle Tasks abrufen (mit optionalem Filter).
 */
router.get("/tasks", requireAdmin, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const priority = req.query.priority as string | undefined;
    const limit = Number(req.query.limit ?? 50);

    let rows: any[];
    if (status && priority) {
      rows = await db.execute(sql`
        SELECT * FROM orchestrator_tasks
        WHERE status = ${status} AND priority = ${priority}
        ORDER BY scheduled_for ASC
        LIMIT ${limit}
      `) as any[];
    } else if (status) {
      rows = await db.execute(sql`
        SELECT * FROM orchestrator_tasks
        WHERE status = ${status}
        ORDER BY scheduled_for ASC
        LIMIT ${limit}
      `) as any[];
    } else {
      rows = await db.execute(sql`
        SELECT * FROM orchestrator_tasks
        ORDER BY scheduled_for ASC
        LIMIT ${limit}
      `) as any[];
    }

    res.json({ success: true, tasks: rows });
  } catch (err: any) {
    res.json({ success: true, tasks: [], note: "Migration pending" });
  }
});

/**
 * POST /api/orchestrator/tasks/:id/complete
 * Task als erledigt markieren.
 */
router.post("/tasks/:id/complete", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.execute(sql`
      UPDATE orchestrator_tasks
      SET status = 'completed', completed_at = ${new Date().toISOString()}
      WHERE id = ${id}
    `);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

/**
 * POST /api/orchestrator/tasks/:id/skip
 * Task überspringen (z.B. wenn nicht relevant).
 */
router.post("/tasks/:id/skip", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.execute(sql`
      UPDATE orchestrator_tasks
      SET status = 'skipped', completed_at = ${new Date().toISOString()}
      WHERE id = ${id}
    `);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── Priority Engine ──────────────────────────────────────────────────────────

/**
 * GET /api/orchestrator/priorities
 * Priorisierte Verbesserungsempfehlungen für alle Entities.
 * Das ist der "Self-Improvement"-Kern des Systems.
 */
router.get("/priorities", requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit ?? 10);
    const recommendations = await getPriorityRecommendations(limit);
    res.json({ success: true, recommendations });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Priority engine failed" });
  }
});

// ─── Mission Control ──────────────────────────────────────────────────────────

/**
 * GET /api/orchestrator/mission-control
 * Alle 30+ Kennzahlen für das Mission Control Dashboard.
 * Öffentlich zugänglich (kein Admin-Auth) für das Frontend.
 */
router.get("/mission-control", async (req: Request, res: Response) => {
  try {
    const stats = await getMissionControlStats();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Mission control stats failed" });
  }
});

export default router;
