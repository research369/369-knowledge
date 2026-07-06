/**
 * reasoning.router.ts
 *
 * Knowledge Reasoning Layer — v8.0.0
 * Dritte Ebene des 369 Knowledge OS
 *
 * Liefert ausschließlich strukturierte Entscheidungslogik.
 * Kein Chat. Kein LLM-Agent. Keine fertigen Antworten.
 *
 * Endpoints:
 *   GET  /api/reasoning/goal/:goal                    — Alle Module für ein Ziel
 *   GET  /api/reasoning/goal/:goal/:moduleType        — Einzelnes Modul für ein Ziel
 *   GET  /api/reasoning/entity/:slug                  — Alle Reasoning-Module für eine Entity
 *   GET  /api/reasoning/entity/:slug/:moduleType      — Einzelnes Reasoning-Modul
 *   GET  /api/reasoning/graph                         — Vollständiger Knowledge Graph
 *   GET  /api/reasoning/graph/node/:slug              — Einzelner Knoten + Nachbarn
 *   GET  /api/reasoning/graph/path/:fromSlug/:toSlug  — Pfad zwischen zwei Knoten
 *   POST /api/reasoning/generate/goal                 — LLM: Ziel-Reasoning generieren [Admin]
 *   POST /api/reasoning/generate/entity               — LLM: Entity-Reasoning generieren [Admin]
 *   POST /api/reasoning/graph/node                    — Graph-Knoten anlegen [Admin]
 *   POST /api/reasoning/graph/edge                    — Graph-Kante anlegen [Admin]
 *   GET  /api/reasoning/admin/pending                 — Alle draft/review Module [Admin]
 *   POST /api/reasoning/admin/:id/activate            — Modul aktivieren [Admin]
 */

import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { invokeLLM } from "../services/llm-provider.service.js";
import { requireAdmin } from "../middleware/auth.js";
import { randomUUID } from "crypto";

export const reasoningRouter = Router();

// ─── Agenten-Filter ───────────────────────────────────────────────────────────

const AGENT_MODULES: Record<string, string[]> = {
  pepgpt: [
    "goal_tree",
    "qualification_tree",
    "decision_tree_v2",
    "stack_strategy",
    "monitoring_strategy",
    "risk_strategy",
    "alternative_strategy",
    "conversation_strategy",
    "coach_strategy",
  ],
  salesgpt: [
    "qualification_tree",
    "decision_tree_v2",
    "stack_strategy",
    "alternative_strategy",
    "conversation_strategy",
    "sales_strategy",
  ],
  supportgpt: [
    "decision_tree_v2",
    "monitoring_strategy",
    "risk_strategy",
    "alternative_strategy",
  ],
};

// ─── Prompt-Templates für alle 10 Reasoning-Typen ────────────────────────────

function buildReasoningPrompt(
  moduleType: string,
  context: { goal?: string; entityName?: string; entitySlug?: string }
): string {
  const complianceNote =
    "WICHTIG: Research Use Only. Keine persönlichen Empfehlungen. Keine Dosierungsanweisungen für Menschen. Nur strukturierte Metadaten.";

  const contextStr = context.goal
    ? `Ziel: ${context.goal}`
    : `Compound: ${context.entityName} (${context.entitySlug})`;

  const templates: Record<string, string> = {
    goal_tree: `
Du bist ein wissenschaftlicher Wissensstrukturierer für das 369 Research Knowledge OS.
${contextStr}

Erstelle einen vollständigen goal_tree für dieses Ziel als strukturiertes JSON.
Der goal_tree beschreibt:
- Welche biologischen Mechanismen relevant sind
- Welche Compound-Kategorien in Frage kommen
- Welche Nutzertypen typisch sind
- Welche Qualifikationsfragen gestellt werden sollten
- Welche Monitoring-Parameter wichtig sind
- Welche Risiken bekannt sind
- Welche Alternativen existieren

Format:
{
  "goal": "string",
  "goal_label": "string (deutsch)",
  "biological_mechanisms": ["string"],
  "relevant_compound_categories": ["string"],
  "typical_user_types": [{"type": "string", "description": "string"}],
  "qualification_questions": [{"question": "string", "purpose": "string", "options": ["string"]}],
  "monitoring_parameters": [{"parameter": "string", "timing": "string", "reason": "string"}],
  "known_risks": [{"risk": "string", "severity": "low|medium|high", "trigger": "string"}],
  "alternative_approaches": [{"approach": "string", "when": "string"}],
  "compliance_note": "string"
}

${complianceNote}
Antworte ausschließlich mit dem JSON-Objekt, ohne Markdown-Wrapper.`,

    qualification_tree: `
Du bist ein wissenschaftlicher Wissensstrukturierer für das 369 Research Knowledge OS.
${contextStr}

Erstelle einen vollständigen qualification_tree als strukturiertes JSON.
Der qualification_tree beschreibt, welche Informationen ein Agent zuerst sammeln muss,
bevor er Empfehlungen geben kann.

Format:
{
  "context": "string",
  "qualification_steps": [
    {
      "step": number,
      "question_key": "string",
      "question_label": "string",
      "type": "single_choice|multi_choice|numeric|boolean|text",
      "options": ["string"] (optional),
      "required": boolean,
      "affects_decision": ["string (downstream keys)"],
      "purpose": "string"
    }
  ],
  "minimum_required_steps": number,
  "disqualifying_conditions": [{"condition": "string", "reason": "string", "action": "escalate|skip|warn"}],
  "compliance_note": "string"
}

${complianceNote}
Antworte ausschließlich mit dem JSON-Objekt, ohne Markdown-Wrapper.`,

    decision_tree_v2: `
Du bist ein wissenschaftlicher Wissensstrukturierer für das 369 Research Knowledge OS.
${contextStr}

Erstelle einen vollständigen decision_tree_v2 als strukturiertes JSON.
Nicht produktbezogen — sondern komplette Entscheidungslogik: Wenn/Dann/Sonst.

Format:
{
  "context": "string",
  "entry_conditions": ["string"],
  "nodes": [
    {
      "id": "string",
      "type": "condition|action|terminal",
      "label": "string",
      "condition": "string (wenn type=condition)",
      "true_path": "string (node_id)",
      "false_path": "string (node_id)",
      "action": "string (wenn type=action)",
      "terminal_outcome": "string (wenn type=terminal)"
    }
  ],
  "compliance_note": "string"
}

${complianceNote}
Antworte ausschließlich mit dem JSON-Objekt, ohne Markdown-Wrapper.`,

    stack_strategy: `
Du bist ein wissenschaftlicher Wissensstrukturierer für das 369 Research Knowledge OS.
${contextStr}

Erstelle eine vollständige stack_strategy als strukturiertes JSON.
Nicht: "BPC passt zu TB". Sondern: Welcher Stack ist Anfänger/Fortgeschritten/Performance/Minimal/Premium/Budget.

Format:
{
  "context": "string",
  "stacks": [
    {
      "tier": "beginner|intermediate|advanced|performance|minimal|premium|budget",
      "label": "string",
      "compounds": ["string (slug)"],
      "rationale": "string",
      "typical_duration_weeks": number,
      "complexity": "low|medium|high",
      "monitoring_required": boolean,
      "prerequisites": ["string"],
      "contraindications": ["string"]
    }
  ],
  "stack_selection_logic": [{"condition": "string", "recommended_tier": "string"}],
  "compliance_note": "string"
}

${complianceNote}
Antworte ausschließlich mit dem JSON-Objekt, ohne Markdown-Wrapper.`,

    monitoring_strategy: `
Du bist ein wissenschaftlicher Wissensstrukturierer für das 369 Research Knowledge OS.
${contextStr}

Erstelle eine vollständige monitoring_strategy als strukturiertes JSON.
Wann, welche Blutwerte, welche Marker, welche Intervalle, welche Symptome beobachten.

Format:
{
  "context": "string",
  "baseline_required": [{"parameter": "string", "reason": "string"}],
  "monitoring_schedule": [
    {
      "timepoint": "string (z.B. 'Woche 4')",
      "parameters": ["string"],
      "reason": "string",
      "action_if_abnormal": "string"
    }
  ],
  "symptom_monitoring": [{"symptom": "string", "significance": "low|medium|high", "action": "string"}],
  "red_flags": [{"flag": "string", "action": "stop|reduce|escalate|consult"}],
  "compliance_note": "string"
}

${complianceNote}
Antworte ausschließlich mit dem JSON-Objekt, ohne Markdown-Wrapper.`,

    risk_strategy: `
Du bist ein wissenschaftlicher Wissensstrukturierer für das 369 Research Knowledge OS.
${contextStr}

Erstelle eine vollständige risk_strategy als strukturiertes JSON.
Welche Situationen führen zu Warnungen oder Eskalationen.

Format:
{
  "context": "string",
  "risk_levels": {
    "low": [{"risk": "string", "trigger": "string", "action": "string"}],
    "medium": [{"risk": "string", "trigger": "string", "action": "string"}],
    "high": [{"risk": "string", "trigger": "string", "action": "string", "escalate_to_human": boolean}]
  },
  "absolute_contraindications": ["string"],
  "relative_contraindications": ["string"],
  "population_specific_risks": [{"population": "string", "risk": "string", "action": "string"}],
  "drug_interactions": [{"drug_class": "string", "interaction": "string", "severity": "string"}],
  "compliance_note": "string"
}

${complianceNote}
Antworte ausschließlich mit dem JSON-Objekt, ohne Markdown-Wrapper.`,

    alternative_strategy: `
Du bist ein wissenschaftlicher Wissensstrukturierer für das 369 Research Knowledge OS.
${contextStr}

Erstelle eine vollständige alternative_strategy als strukturiertes JSON.
Falls Compound X nicht verfügbar oder ungeeignet ist — welche Alternativen existieren.

Format:
{
  "context": "string",
  "primary_compound": "string (slug, falls entity-gebunden)",
  "alternatives": [
    {
      "compound_slug": "string",
      "compound_name": "string",
      "similarity_score": number (0-1),
      "use_when": "string",
      "differences": ["string"],
      "advantages": ["string"],
      "disadvantages": ["string"]
    }
  ],
  "non_compound_alternatives": [{"approach": "string", "when": "string", "effectiveness": "string"}],
  "compliance_note": "string"
}

${complianceNote}
Antworte ausschließlich mit dem JSON-Objekt, ohne Markdown-Wrapper.`,

    conversation_strategy: `
Du bist ein wissenschaftlicher Wissensstrukturierer für das 369 Research Knowledge OS.
${contextStr}

Erstelle eine vollständige conversation_strategy als strukturiertes JSON.
NUR Metadaten. KEINE Antworten. Nur Informationen WIE ein Agent vorgehen soll.

Format:
{
  "context": "string",
  "conversation_flow": [
    {
      "phase": "string",
      "objective": "string",
      "do": ["string"],
      "dont": ["string"],
      "transition_condition": "string"
    }
  ],
  "qualification_first": boolean,
  "product_mention_timing": "string",
  "objection_handling_approach": "string",
  "escalation_triggers": ["string"],
  "compliance_note": "string"
}

${complianceNote}
Antworte ausschließlich mit dem JSON-Objekt, ohne Markdown-Wrapper.`,

    sales_strategy: `
Du bist ein wissenschaftlicher Wissensstrukturierer für das 369 Research Knowledge OS.
${contextStr}

Erstelle eine vollständige sales_strategy als strukturiertes JSON.
NUR Metadaten. Kein Verkaufstext. Nur typische Kaufgründe, Einwände, Entscheidungsfaktoren, Trigger, Vergleichsmerkmale.

Format:
{
  "context": "string",
  "typical_purchase_reasons": [{"reason": "string", "frequency": "high|medium|low"}],
  "common_objections": [{"objection": "string", "type": "price|safety|effectiveness|complexity", "response_approach": "string"}],
  "decision_factors": [{"factor": "string", "weight": "high|medium|low"}],
  "purchase_triggers": ["string"],
  "comparison_attributes": [{"attribute": "string", "our_position": "string"}],
  "typical_buyer_journey_steps": ["string"],
  "compliance_note": "string"
}

${complianceNote}
Antworte ausschließlich mit dem JSON-Objekt, ohne Markdown-Wrapper.`,

    coach_strategy: `
Du bist ein wissenschaftlicher Wissensstrukturierer für das 369 Research Knowledge OS.
${contextStr}

Erstelle eine vollständige coach_strategy als strukturiertes JSON.
NUR Metadaten. Kein Chat. Nur typische Anfängerfehler, Fortschritte, Plateaus, wann Monitoring, wann pausieren, wann umstellen.

Format:
{
  "context": "string",
  "beginner_mistakes": [{"mistake": "string", "consequence": "string", "prevention": "string"}],
  "typical_progress_timeline": [{"week": number, "expected_changes": ["string"], "monitoring_focus": ["string"]}],
  "plateau_indicators": [{"indicator": "string", "action": "string"}],
  "pause_conditions": ["string"],
  "switch_conditions": [{"condition": "string", "alternative": "string"}],
  "success_markers": ["string"],
  "compliance_note": "string"
}

${complianceNote}
Antworte ausschließlich mit dem JSON-Objekt, ohne Markdown-Wrapper.`,
  };

  return templates[moduleType] || `Erstelle ein ${moduleType} Modul für ${contextStr} als JSON.`;
}

// ─── GET /api/reasoning/goal/:goal ───────────────────────────────────────────

reasoningRouter.get("/goal/:goal", async (req: Request, res: Response) => {
  try {
    const { goal } = req.params;
    const agent = req.query.agent as string | undefined;

    let whereClause = `goal_context = '${goal.replace(/'/g, "''")}' AND status = 'active'`;
    if (agent && AGENT_MODULES[agent]) {
      const types = AGENT_MODULES[agent].map((t) => `'${t}'`).join(",");
      whereClause += ` AND module_type IN (${types})`;
    }

    const rows = (await db.execute(
      sql.raw(`SELECT * FROM knowledge_reasoning WHERE ${whereClause} ORDER BY module_type`)
    )) as any[];

    // Deduplizieren nach module_type (neueste Version)
    const moduleMap: Record<string, any> = {};
    for (const row of rows) {
      const existing = moduleMap[row.module_type];
      if (!existing || row.version > existing.version) {
        moduleMap[row.module_type] = row;
      }
    }

    const modules: Record<string, any> = {};
    for (const [type, row] of Object.entries(moduleMap)) {
      let content = row.content;
      try {
        content = JSON.parse(row.content);
      } catch {}
      modules[type] = {
        id: row.id,
        moduleType: row.module_type,
        content,
        confidenceScore: row.confidence_score,
        version: row.version,
        status: row.status,
      };
    }

    res.json({
      goalContext: goal,
      modulesCount: Object.keys(modules).length,
      availableTypes: Object.keys(modules),
      agentFilter: agent || null,
      modules,
    });
  } catch (err: any) {
    console.error("[Reasoning] GET /goal/:goal error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/reasoning/goal/:goal/:moduleType ───────────────────────────────

reasoningRouter.get("/goal/:goal/:moduleType", async (req: Request, res: Response) => {
  try {
    const { goal, moduleType } = req.params;

    const rows = (await db.execute(
      sql.raw(
        `SELECT * FROM knowledge_reasoning
         WHERE goal_context = '${goal.replace(/'/g, "''")}' 
           AND module_type = '${moduleType}'
           AND status = 'active'
         ORDER BY version DESC LIMIT 1`
      )
    )) as any[];

    if (!rows.length) {
      return res.status(404).json({ error: `Kein ${moduleType} Modul für Ziel '${goal}' gefunden` });
    }

    const row = rows[0];
    let content = row.content;
    try { content = JSON.parse(row.content); } catch {}

    res.json({
      goalContext: goal,
      moduleType: row.module_type,
      content,
      confidenceScore: row.confidence_score,
      version: row.version,
      status: row.status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/reasoning/entity/:slug ─────────────────────────────────────────

reasoningRouter.get("/entity/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const agent = req.query.agent as string | undefined;

    let whereClause = `entity_slug = '${slug.replace(/'/g, "''")}' AND status = 'active'`;
    if (agent && AGENT_MODULES[agent]) {
      const types = AGENT_MODULES[agent].map((t) => `'${t}'`).join(",");
      whereClause += ` AND module_type IN (${types})`;
    }

    const rows = (await db.execute(
      sql.raw(`SELECT * FROM knowledge_reasoning WHERE ${whereClause} ORDER BY module_type`)
    )) as any[];

    const moduleMap: Record<string, any> = {};
    for (const row of rows) {
      const existing = moduleMap[row.module_type];
      if (!existing || row.version > existing.version) {
        moduleMap[row.module_type] = row;
      }
    }

    const modules: Record<string, any> = {};
    for (const [type, row] of Object.entries(moduleMap)) {
      let content = row.content;
      try { content = JSON.parse(row.content); } catch {}
      modules[type] = {
        id: row.id,
        moduleType: row.module_type,
        content,
        confidenceScore: row.confidence_score,
        version: row.version,
      };
    }

    res.json({
      entitySlug: slug,
      modulesCount: Object.keys(modules).length,
      availableTypes: Object.keys(modules),
      agentFilter: agent || null,
      modules,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/reasoning/entity/:slug/:moduleType ──────────────────────────────

reasoningRouter.get("/entity/:slug/:moduleType", async (req: Request, res: Response) => {
  try {
    const { slug, moduleType } = req.params;

    const rows = (await db.execute(
      sql.raw(
        `SELECT * FROM knowledge_reasoning
         WHERE entity_slug = '${slug.replace(/'/g, "''")}' 
           AND module_type = '${moduleType}'
           AND status = 'active'
         ORDER BY version DESC LIMIT 1`
      )
    )) as any[];

    if (!rows.length) {
      return res.status(404).json({ error: `Kein ${moduleType} Modul für Entity '${slug}' gefunden` });
    }

    const row = rows[0];
    let content = row.content;
    try { content = JSON.parse(row.content); } catch {}

    res.json({
      entitySlug: slug,
      moduleType: row.module_type,
      content,
      confidenceScore: row.confidence_score,
      version: row.version,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/reasoning/graph ─────────────────────────────────────────────────

reasoningRouter.get("/graph", async (req: Request, res: Response) => {
  try {
    const nodeType = req.query.nodeType as string | undefined;
    const limit = parseInt(req.query.limit as string || "200");

    let nodeWhere = "is_active = TRUE";
    if (nodeType) nodeWhere += ` AND node_type = '${nodeType}'`;

    const nodes = (await db.execute(
      sql.raw(`SELECT * FROM reasoning_graph_nodes WHERE ${nodeWhere} ORDER BY node_type, label LIMIT ${limit}`)
    )) as any[];

    const edges = (await db.execute(
      sql.raw(`SELECT * FROM reasoning_graph_edges WHERE is_active = TRUE ORDER BY edge_type LIMIT ${limit * 3}`)
    )) as any[];

    // Statistiken
    const nodeTypeCounts: Record<string, number> = {};
    for (const n of nodes) {
      nodeTypeCounts[n.node_type] = (nodeTypeCounts[n.node_type] || 0) + 1;
    }

    const edgeTypeCounts: Record<string, number> = {};
    for (const e of edges) {
      edgeTypeCounts[e.edge_type] = (edgeTypeCounts[e.edge_type] || 0) + 1;
    }

    res.json({
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        nodeTypeCounts,
        edgeTypeCounts,
      },
      nodes: nodes.map((n) => ({
        id: n.id,
        nodeType: n.node_type,
        label: n.label,
        slug: n.slug,
        entitySlug: n.entity_slug,
        description: n.description,
        metadata: n.metadata,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        fromNodeId: e.from_node_id,
        toNodeId: e.to_node_id,
        edgeType: e.edge_type,
        condition: e.condition,
        weight: e.weight,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/reasoning/graph/node/:slug ─────────────────────────────────────

reasoningRouter.get("/graph/node/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const nodes = (await db.execute(
      sql.raw(`SELECT * FROM reasoning_graph_nodes WHERE slug = '${slug.replace(/'/g, "''")}' AND is_active = TRUE LIMIT 1`)
    )) as any[];

    if (!nodes.length) {
      return res.status(404).json({ error: `Knoten '${slug}' nicht gefunden` });
    }

    const node = nodes[0];

    // Ausgehende Kanten
    const outEdges = (await db.execute(
      sql.raw(
        `SELECT e.*, n.label as to_label, n.node_type as to_type, n.slug as to_slug
         FROM reasoning_graph_edges e
         JOIN reasoning_graph_nodes n ON n.id = e.to_node_id
         WHERE e.from_node_id = '${node.id}' AND e.is_active = TRUE`
      )
    )) as any[];

    // Eingehende Kanten
    const inEdges = (await db.execute(
      sql.raw(
        `SELECT e.*, n.label as from_label, n.node_type as from_type, n.slug as from_slug
         FROM reasoning_graph_edges e
         JOIN reasoning_graph_nodes n ON n.id = e.from_node_id
         WHERE e.to_node_id = '${node.id}' AND e.is_active = TRUE`
      )
    )) as any[];

    res.json({
      node: {
        id: node.id,
        nodeType: node.node_type,
        label: node.label,
        slug: node.slug,
        entitySlug: node.entity_slug,
        description: node.description,
        metadata: node.metadata,
      },
      outgoing: outEdges.map((e) => ({
        edgeType: e.edge_type,
        condition: e.condition,
        weight: e.weight,
        target: { id: e.to_node_id, label: e.to_label, type: e.to_type, slug: e.to_slug },
      })),
      incoming: inEdges.map((e) => ({
        edgeType: e.edge_type,
        condition: e.condition,
        weight: e.weight,
        source: { id: e.from_node_id, label: e.from_label, type: e.from_type, slug: e.from_slug },
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/reasoning/graph/path/:fromSlug/:toSlug ─────────────────────────
// BFS-Pfadsuche zwischen zwei Knoten (max. 5 Hops)

reasoningRouter.get("/graph/path/:fromSlug/:toSlug", async (req: Request, res: Response) => {
  try {
    const { fromSlug, toSlug } = req.params;

    const fromNodes = (await db.execute(
      sql.raw(`SELECT id, label, slug, node_type FROM reasoning_graph_nodes WHERE slug = '${fromSlug.replace(/'/g, "''")}' LIMIT 1`)
    )) as any[];

    const toNodes = (await db.execute(
      sql.raw(`SELECT id, label, slug, node_type FROM reasoning_graph_nodes WHERE slug = '${toSlug.replace(/'/g, "''")}' LIMIT 1`)
    )) as any[];

    if (!fromNodes.length || !toNodes.length) {
      return res.status(404).json({ error: "Start- oder Zielknoten nicht gefunden" });
    }

    const fromNode = fromNodes[0];
    const toNode = toNodes[0];

    // Alle Kanten laden für BFS
    const allEdges = (await db.execute(
      sql.raw(`SELECT from_node_id, to_node_id, edge_type, weight FROM reasoning_graph_edges WHERE is_active = TRUE`)
    )) as any[];

    // Alle Knoten laden
    const allNodes = (await db.execute(
      sql.raw(`SELECT id, label, slug, node_type FROM reasoning_graph_nodes WHERE is_active = TRUE`)
    )) as any[];

    const nodeMap: Record<string, any> = {};
    for (const n of allNodes) nodeMap[n.id] = n;

    // BFS
    const queue: Array<{ nodeId: string; path: any[] }> = [
      { nodeId: fromNode.id, path: [{ node: fromNode, edge: null }] },
    ];
    const visited = new Set<string>([fromNode.id]);
    let foundPath: any[] | null = null;

    while (queue.length > 0 && !foundPath) {
      const { nodeId, path } = queue.shift()!;
      if (path.length > 6) continue; // max 5 Hops

      const outgoing = allEdges.filter((e) => e.from_node_id === nodeId);
      for (const edge of outgoing) {
        if (visited.has(edge.to_node_id)) continue;
        const nextNode = nodeMap[edge.to_node_id];
        if (!nextNode) continue;

        const newPath = [...path, { node: nextNode, edge: { type: edge.edge_type, weight: edge.weight } }];

        if (edge.to_node_id === toNode.id) {
          foundPath = newPath;
          break;
        }

        visited.add(edge.to_node_id);
        queue.push({ nodeId: edge.to_node_id, path: newPath });
      }
    }

    if (!foundPath) {
      return res.json({
        found: false,
        message: `Kein Pfad von '${fromSlug}' zu '${toSlug}' innerhalb von 5 Hops gefunden`,
        from: fromNode,
        to: toNode,
      });
    }

    res.json({
      found: true,
      hops: foundPath.length - 1,
      path: foundPath.map((step) => ({
        node: { id: step.node.id, label: step.node.label, type: step.node.node_type, slug: step.node.slug },
        via: step.edge,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/reasoning/generate/goal [Admin] ───────────────────────────────

reasoningRouter.post("/generate/goal", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { goal, moduleTypes, dryRun = false } = req.body as {
      goal: string;
      moduleTypes?: string[];
      dryRun?: boolean;
    };

    if (!goal) return res.status(400).json({ error: "goal ist erforderlich" });

    const allTypes = [
      "goal_tree", "qualification_tree", "decision_tree_v2",
      "stack_strategy", "monitoring_strategy", "risk_strategy",
      "alternative_strategy", "conversation_strategy",
      "sales_strategy", "coach_strategy",
    ];

    const typesToGenerate = moduleTypes || allTypes;
    const results: any[] = [];

    for (const moduleType of typesToGenerate) {
      if (dryRun) {
        results.push({ moduleType, status: "would_generate", goal });
        continue;
      }

      try {
        const prompt = buildReasoningPrompt(moduleType, { goal });
        const llmResponse = await invokeLLM([
          { role: "system", content: "Du bist ein wissenschaftlicher Wissensstrukturierer. Antworte ausschließlich mit validem JSON." },
          { role: "user", content: prompt },
        ]);

        const content = llmResponse.content || "{}";
        const id = randomUUID();

        await db.execute(sql.raw(`
          INSERT INTO knowledge_reasoning (id, goal_context, module_type, content, status, confidence_score, generated_by, created_at, updated_at)
          VALUES ('${id}', '${goal.replace(/'/g, "''")}', '${moduleType}', '${content.replace(/'/g, "''")}', 'active', 0.85, 'llm-auto', NOW(), NOW())
        `));

        results.push({ moduleType, status: "generated", id, goal });
      } catch (err: any) {
        results.push({ moduleType, status: "error", error: err.message, goal });
      }
    }

    res.json({
      goal,
      dryRun,
      generated: results.filter((r) => r.status === "generated").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/reasoning/generate/entity [Admin] ─────────────────────────────

reasoningRouter.post("/generate/entity", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { entitySlug, entityName, moduleTypes, dryRun = false } = req.body as {
      entitySlug: string;
      entityName: string;
      moduleTypes?: string[];
      dryRun?: boolean;
    };

    if (!entitySlug || !entityName) {
      return res.status(400).json({ error: "entitySlug und entityName sind erforderlich" });
    }

    const allTypes = [
      "decision_tree_v2", "stack_strategy", "monitoring_strategy",
      "risk_strategy", "alternative_strategy", "coach_strategy",
    ];

    const typesToGenerate = moduleTypes || allTypes;
    const results: any[] = [];

    for (const moduleType of typesToGenerate) {
      if (dryRun) {
        results.push({ moduleType, status: "would_generate", entitySlug });
        continue;
      }

      try {
        const prompt = buildReasoningPrompt(moduleType, { entityName, entitySlug });
        const llmResponse = await invokeLLM([
          { role: "system", content: "Du bist ein wissenschaftlicher Wissensstrukturierer. Antworte ausschließlich mit validem JSON." },
          { role: "user", content: prompt },
        ]);

        const content = llmResponse.content || "{}";
        const id = randomUUID();

        await db.execute(sql.raw(`
          INSERT INTO knowledge_reasoning (id, entity_slug, module_type, content, status, confidence_score, generated_by, created_at, updated_at)
          VALUES ('${id}', '${entitySlug.replace(/'/g, "''")}', '${moduleType}', '${content.replace(/'/g, "''")}', 'active', 0.85, 'llm-auto', NOW(), NOW())
        `));

        results.push({ moduleType, status: "generated", id, entitySlug });
      } catch (err: any) {
        results.push({ moduleType, status: "error", error: err.message, entitySlug });
      }
    }

    res.json({
      entitySlug,
      dryRun,
      generated: results.filter((r) => r.status === "generated").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/reasoning/graph/node [Admin] ──────────────────────────────────

reasoningRouter.post("/graph/node", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { nodeType, label, slug, entityId, entitySlug, description, metadata } = req.body;

    if (!nodeType || !label || !slug) {
      return res.status(400).json({ error: "nodeType, label und slug sind erforderlich" });
    }

    // Duplikat-Check
    const existing = (await db.execute(
      sql.raw(`SELECT id FROM reasoning_graph_nodes WHERE slug = '${slug.replace(/'/g, "''")}' LIMIT 1`)
    )) as any[];

    if (existing.length) {
      return res.status(409).json({ error: `Knoten mit slug '${slug}' existiert bereits`, id: existing[0].id });
    }

    const id = randomUUID();
    const metaJson = JSON.stringify(metadata || {}).replace(/'/g, "''");

    await db.execute(sql.raw(`
      INSERT INTO reasoning_graph_nodes (id, node_type, label, slug, entity_id, entity_slug, description, metadata, is_active, created_at)
      VALUES (
        '${id}',
        '${nodeType}',
        '${label.replace(/'/g, "''")}',
        '${slug.replace(/'/g, "''")}',
        ${entityId ? `'${entityId}'` : "NULL"},
        ${entitySlug ? `'${entitySlug.replace(/'/g, "''")}'` : "NULL"},
        ${description ? `'${description.replace(/'/g, "''")}'` : "NULL"},
        '${metaJson}',
        TRUE,
        NOW()
      )
    `));

    res.status(201).json({ id, nodeType, label, slug, created: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/reasoning/graph/edge [Admin] ──────────────────────────────────

reasoningRouter.post("/graph/edge", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { fromNodeId, toNodeId, edgeType, condition, weight, metadata } = req.body;

    if (!fromNodeId || !toNodeId || !edgeType) {
      return res.status(400).json({ error: "fromNodeId, toNodeId und edgeType sind erforderlich" });
    }

    // Duplikat-Check
    const existing = (await db.execute(
      sql.raw(
        `SELECT id FROM reasoning_graph_edges 
         WHERE from_node_id = '${fromNodeId}' AND to_node_id = '${toNodeId}' AND edge_type = '${edgeType}'
         LIMIT 1`
      )
    )) as any[];

    if (existing.length) {
      return res.status(409).json({ error: "Kante existiert bereits", id: existing[0].id });
    }

    const id = randomUUID();
    const metaJson = JSON.stringify(metadata || {}).replace(/'/g, "''");

    await db.execute(sql.raw(`
      INSERT INTO reasoning_graph_edges (id, from_node_id, to_node_id, edge_type, condition, weight, metadata, is_active, created_at)
      VALUES (
        '${id}',
        '${fromNodeId}',
        '${toNodeId}',
        '${edgeType}',
        ${condition ? `'${condition.replace(/'/g, "''")}'` : "NULL"},
        ${weight || 1.0},
        '${metaJson}',
        TRUE,
        NOW()
      )
    `));

    res.status(201).json({ id, fromNodeId, toNodeId, edgeType, created: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/reasoning/admin/pending [Admin] ────────────────────────────────

reasoningRouter.get("/admin/pending", requireAdmin, async (req: Request, res: Response) => {
  try {
    const rows = (await db.execute(
      sql.raw(
        `SELECT id, entity_slug, goal_context, module_type, status, confidence_score, version, created_at
         FROM knowledge_reasoning
         WHERE status IN ('draft', 'review')
         ORDER BY created_at DESC LIMIT 100`
      )
    )) as any[];

    res.json({
      pendingCount: rows.length,
      modules: rows.map((r) => ({
        id: r.id,
        entitySlug: r.entity_slug,
        goalContext: r.goal_context,
        moduleType: r.module_type,
        status: r.status,
        confidenceScore: r.confidence_score,
        version: r.version,
        createdAt: r.created_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/reasoning/admin/:id/activate [Admin] ──────────────────────────

reasoningRouter.post("/admin/:id/activate", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.execute(
      sql.raw(`UPDATE knowledge_reasoning SET status = 'active', updated_at = NOW() WHERE id = '${id}'`)
    );

    res.json({ id, status: "active", activated: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/reasoning/status ───────────────────────────────────────────────

reasoningRouter.get("/status", async (_req: Request, res: Response) => {
  try {
    const moduleCounts = (await db.execute(
      sql.raw(
        `SELECT status, COUNT(*) as count FROM knowledge_reasoning GROUP BY status`
      )
    )) as any[];

    const goalCounts = (await db.execute(
      sql.raw(
        `SELECT goal_context, COUNT(*) as count FROM knowledge_reasoning WHERE goal_context IS NOT NULL GROUP BY goal_context ORDER BY count DESC`
      )
    )) as any[];

    const entityCounts = (await db.execute(
      sql.raw(
        `SELECT entity_slug, COUNT(*) as count FROM knowledge_reasoning WHERE entity_slug IS NOT NULL GROUP BY entity_slug ORDER BY count DESC LIMIT 20`
      )
    )) as any[];

    const nodeCount = (await db.execute(
      sql.raw(`SELECT COUNT(*) as count FROM reasoning_graph_nodes WHERE is_active = TRUE`)
    )) as any[];

    const edgeCount = (await db.execute(
      sql.raw(`SELECT COUNT(*) as count FROM reasoning_graph_edges WHERE is_active = TRUE`)
    )) as any[];

    const statusMap: Record<string, number> = {};
    for (const r of moduleCounts) statusMap[r.status] = parseInt(r.count);

    res.json({
      layer: "knowledge_reasoning",
      version: "8.0.0",
      modules: {
        total: Object.values(statusMap).reduce((a, b) => a + b, 0),
        byStatus: statusMap,
      },
      goals: goalCounts.map((r) => ({ goal: r.goal_context, modules: parseInt(r.count) })),
      entities: entityCounts.map((r) => ({ slug: r.entity_slug, modules: parseInt(r.count) })),
      graph: {
        nodes: parseInt(nodeCount[0]?.count || "0"),
        edges: parseInt(edgeCount[0]?.count || "0"),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
