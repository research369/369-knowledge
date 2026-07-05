/**
 * collective.router.ts
 *
 * Phase 5 — Collective Intelligence Endpoints
 *
 * GET  /api/collective/stats              — Collective Intelligence Statistiken
 * GET  /api/collective/insights           — Insights abrufen
 * POST /api/collective/insights/extract   — Insights aus Chat-Session extrahieren
 * GET  /api/collective/global-index       — Global Knowledge Index
 * POST /api/collective/global-index/calculate — Index neu berechnen
 * GET  /api/collective/roadmap            — Knowledge Roadmap
 * POST /api/collective/roadmap/build      — Roadmap neu aufbauen
 * POST /api/collective/roadmap/:id/done   — Roadmap-Item als erledigt markieren
 */

import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import {
  extractCollectiveInsights,
  loadCollectiveInsightsForAgent,
  getCollectiveIntelligenceStats,
  formatCollectiveInsightsForPrompt,
} from "../services/collective-intelligence.service.js";
import {
  calculateGlobalKnowledgeIndex,
  getLatestGlobalIndex,
} from "../services/global-knowledge-index.service.js";
import {
  buildKnowledgeRoadmap,
  getRoadmap,
  markRoadmapItemDone,
} from "../services/knowledge-roadmap.service.js";

const router = Router();

// ─── Collective Intelligence Stats ───────────────────────────────────────────

router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const stats = await getCollectiveIntelligenceStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ─── Insights ─────────────────────────────────────────────────────────────────

router.get("/insights", requireAdmin, async (req, res) => {
  try {
    const { agentRole = "pepgpt", entityId, limit = "10" } = req.query as Record<string, string>;
    const insights = await loadCollectiveInsightsForAgent(agentRole, entityId, undefined, parseInt(limit));
    res.json({ success: true, insights, count: insights.length });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

router.get("/insights/prompt/:agentRole", requireAdmin, async (req, res) => {
  try {
    const { agentRole } = req.params;
    const { entityId } = req.query as Record<string, string>;
    const insights = await loadCollectiveInsightsForAgent(agentRole, entityId, undefined, 8);
    const prompt = formatCollectiveInsightsForPrompt(insights);
    res.json({ success: true, prompt, insightCount: insights.length });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

router.post("/insights/extract", requireAdmin, async (req, res) => {
  try {
    const { chatSessionId, agentRole, entityId } = req.body;
    if (!chatSessionId || !agentRole) {
      return res.status(400).json({ success: false, error: "chatSessionId and agentRole required" });
    }
    const result = await extractCollectiveInsights(chatSessionId, agentRole, entityId);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ─── Global Knowledge Index ───────────────────────────────────────────────────

router.get("/global-index", requireAdmin, async (req, res) => {
  try {
    const { recalculate } = req.query;
    let index;
    if (recalculate === "true") {
      index = await calculateGlobalKnowledgeIndex();
    } else {
      index = await getLatestGlobalIndex();
      if (!index) {
        index = await calculateGlobalKnowledgeIndex();
      }
    }
    res.json({ success: true, index });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

router.post("/global-index/calculate", requireAdmin, async (req, res) => {
  try {
    const index = await calculateGlobalKnowledgeIndex();
    res.json({ success: true, index });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ─── Knowledge Roadmap ────────────────────────────────────────────────────────

router.get("/roadmap", requireAdmin, async (req, res) => {
  try {
    const { category, priority, limit = "20" } = req.query as Record<string, string>;
    const items = await getRoadmap(
      category as any,
      priority as any,
      parseInt(limit)
    );
    res.json({ success: true, items, count: items.length });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

router.post("/roadmap/build", requireAdmin, async (req, res) => {
  try {
    const result = await buildKnowledgeRoadmap();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

router.post("/roadmap/:id/done", requireAdmin, async (req, res) => {
  try {
    await markRoadmapItemDone(req.params.id);
    res.json({ success: true, message: "Roadmap item marked as done" });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;
