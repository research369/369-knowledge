/**
 * prefreeze.router.ts
 *
 * Pre-Freeze Endpoints — Budget Engine + Smart Content Factory + Business Intelligence
 *
 * POST /api/prefreeze/budget-check          — Budget-Evaluation für einen Output-Typ
 * POST /api/prefreeze/budget-check-all      — Alle Output-Typen für eine Entity
 * POST /api/prefreeze/smart-generate        — Intelligente Generierung mit Budget-Check
 * GET  /api/prefreeze/content/:entityId/:outputType — Aktuellen Content abrufen
 * GET  /api/prefreeze/content/:entityId     — Alle aktuellen Contents
 * GET  /api/prefreeze/business-scores/:entityId     — Business Intelligence Scores
 * POST /api/prefreeze/business-scores/:entityId     — Business Scores neu berechnen
 * GET  /api/prefreeze/budget-log/:entityId  — Budget-Entscheidungsprotokoll
 */

import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import {
  evaluateBudget,
  evaluateAllOutputsForEntity,
} from "../services/generation-budget-engine.service.js";
import {
  smartGenerate,
  getCurrentContent,
  getAllCurrentContent,
} from "../services/smart-content-factory.service.js";
import {
  computeBusinessScores,
  getLatestBusinessScores,
  getTopEntitiesByBusinessScore,
} from "../services/knowledge-value-engine.service.js";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

const router = Router();

// ─── Budget-Check: einzelner Output-Typ ──────────────────────────────────────

router.post("/budget-check", requireAdmin, async (req, res) => {
  try {
    const {
      entityId,
      outputType,
      triggerType = "manual",
      changedFields = [],
      scoreDelta = 0,
      priority = "medium",
    } = req.body;

    if (!entityId || !outputType) {
      return res.status(400).json({ success: false, error: "entityId und outputType erforderlich" });
    }

    const evaluation = await evaluateBudget({
      entityId,
      outputType,
      triggerType,
      changedFields,
      scoreDelta,
      priority,
    });

    res.json({ success: true, evaluation });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ─── Budget-Check: alle Output-Typen für eine Entity ─────────────────────────

router.post("/budget-check-all", requireAdmin, async (req, res) => {
  try {
    const {
      entityId,
      triggerType = "scheduled",
      changedFields = [],
      scoreDelta = 0,
    } = req.body;

    if (!entityId) {
      return res.status(400).json({ success: false, error: "entityId erforderlich" });
    }

    const result = await evaluateAllOutputsForEntity(entityId, triggerType, changedFields, scoreDelta);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ─── Smart Generate: Intelligente Generierung mit Budget-Check ───────────────

router.post("/smart-generate", requireAdmin, async (req, res) => {
  try {
    const {
      entityId,
      outputTypes,
      triggerType = "manual",
      changedFields = [],
      scoreDelta = 0,
      priority = "medium",
      dryRun = false,
    } = req.body;

    if (!entityId) {
      return res.status(400).json({ success: false, error: "entityId erforderlich" });
    }

    const result = await smartGenerate({
      entityId,
      outputTypes,
      triggerType,
      changedFields,
      scoreDelta,
      priority,
      dryRun,
    });

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ─── Content abrufen: einzelner Output-Typ ───────────────────────────────────

router.get("/content/:entityId/:outputType", requireAdmin, async (req, res) => {
  try {
    const { entityId, outputType } = req.params;
    const content = await getCurrentContent(entityId, outputType);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: `Kein Content für ${entityId}/${outputType} gefunden`,
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ─── Content abrufen: alle Output-Typen ──────────────────────────────────────

router.get("/content/:entityId", requireAdmin, async (req, res) => {
  try {
    const { entityId } = req.params;
    const contents = await getAllCurrentContent(entityId);
    const count = Object.keys(contents).length;

    res.json({ success: true, entityId, contents, count });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ─── Business Scores: abrufen ────────────────────────────────────────────────

router.get("/business-scores/:entityId", requireAdmin, async (req, res) => {
  try {
    const { entityId } = req.params;
    const scores = await getLatestBusinessScores(entityId);

    if (!scores) {
      return res.status(404).json({
        success: false,
        error: `Keine Business Scores für ${entityId} gefunden. POST /api/prefreeze/business-scores/${entityId} zum Berechnen.`,
      });
    }

    res.json({ success: true, scores });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ─── Business Scores: neu berechnen ──────────────────────────────────────────

router.post("/business-scores/:entityId", requireAdmin, async (req, res) => {
  try {
    const { entityId } = req.params;
    const scores = await computeBusinessScores(entityId);
    res.json({ success: true, scores });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ─── Top-Entities nach Business Score ────────────────────────────────────────

router.get("/business-scores", requireAdmin, async (req, res) => {
  try {
    const limit = parseInt((req.query.limit as string) || "10");
    const top = await getTopEntitiesByBusinessScore(limit);
    res.json({ success: true, top, count: top.length });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ─── Budget-Log: Entscheidungsprotokoll ──────────────────────────────────────

router.get("/budget-log/:entityId", requireAdmin, async (req, res) => {
  try {
    const { entityId } = req.params;
    const limit = parseInt((req.query.limit as string) || "50");

    const rows = await db.execute(
      sql`SELECT * FROM generation_budget_log
          WHERE entity_id = ${entityId}
          ORDER BY created_at DESC
          LIMIT ${limit}`
    ) as any[];

    res.json({ success: true, log: rows, count: rows.length });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ─── Content-Versionen: Versionsverlauf ──────────────────────────────────────

router.get("/versions/:entityId/:outputType", requireAdmin, async (req, res) => {
  try {
    const { entityId, outputType } = req.params;

    const rows = await db.execute(
      sql`SELECT id, version, status, is_current, generated_at, budget_decision, trigger_type
          FROM content_versions
          WHERE entity_id = ${entityId} AND output_type = ${outputType}
          ORDER BY version DESC`
    ) as any[];

    res.json({ success: true, versions: rows, count: rows.length });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;
