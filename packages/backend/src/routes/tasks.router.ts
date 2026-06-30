/**
 * Scientific Tasks Router
 * Manages the platform's self-generated task queue.
 * Also handles lifecycle transitions and decision history.
 */
import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// ─── GET /tasks ───────────────────────────────────────────────────────────────

router.get("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      status,
      taskType,
      targetType,
      targetId,
      assignedTo,
      limit = "50",
      offset = "0",
    } = req.query as Record<string, string>;

    // Build dynamic query safely
    const conditions: string[] = ['1=1'];
    const bindings: any[] = [];
    let idx = 1;
    if (status) { conditions.push(`status = $${idx++}`); bindings.push(status); }
    if (taskType) { conditions.push(`task_type = $${idx++}`); bindings.push(taskType); }
    if (targetType) { conditions.push(`target_type = $${idx++}`); bindings.push(targetType); }
    if (targetId) { conditions.push(`target_id = $${idx++}`); bindings.push(targetId); }
    if (assignedTo) { conditions.push(`assigned_to = $${idx++}`); bindings.push(assignedTo); }
    bindings.push(parseInt(limit), parseInt(offset));

    const finalQuery = `SELECT * FROM scientific_tasks WHERE ${conditions.join(' AND ')} ORDER BY priority ASC, created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    const result = await db.execute(sql.raw(finalQuery));

    // Count
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM scientific_tasks
      WHERE status NOT IN ('completed', 'dismissed')
    `);

    res.json({
      tasks: result,
      total: parseInt((countResult as any[])[0]?.total ?? "0"),
      openCount: parseInt((countResult as any[])[0]?.total ?? "0"),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /tasks/:id ───────────────────────────────────────────────────────────

router.get("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT * FROM scientific_tasks WHERE id = ${id} LIMIT 1
    `);
    if ((result as any[]).length === 0) return res.status(404).json({ error: "Task not found" });
    res.json((result as any[])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /tasks ──────────────────────────────────────────────────────────────

router.post("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      taskType,
      title,
      description,
      targetType,
      targetId,
      triggeredBy = "admin",
      triggerReason,
      assignedTo,
      priority = 5,
      dueAt,
    } = req.body;

    if (!taskType || !title) {
      return res.status(400).json({ error: "taskType and title are required" });
    }

    const id = `task-${randomUUID().slice(0,10)}`;

    // Auto-generate checklist based on task type
    const checklist = generateChecklist(taskType, targetType);

    await db.execute(sql`
      INSERT INTO scientific_tasks (
        id, task_type, title, description,
        target_type, target_id,
        triggered_by, trigger_reason,
        assigned_to, priority, due_at,
        checklist, status,
        created_at, updated_at
      ) VALUES (
        ${id}, ${taskType}, ${title}, ${description ?? null},
        ${targetType ?? null}, ${targetId ?? null},
        ${triggeredBy}, ${triggerReason ?? null},
        ${assignedTo ?? null}, ${priority}, ${dueAt ?? null},
        ${JSON.stringify(checklist)}, 'open',
        NOW(), NOW()
      )
    `);

    res.status(201).json({ id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /tasks/:id ─────────────────────────────────────────────────────────

router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      status,
      assignedTo,
      priority,
      dueAt,
      checklist,
      completedBy,
      completionNote,
    } = req.body;

    const updates: string[] = [];

    if (status !== undefined) {
      updates.push(`status = '${String(status).replace(/'/g, "''")}'`);
      if (status === "completed") {
        updates.push(`completed_at = NOW()`);
        if (completedBy) updates.push(`completed_by = '${String(completedBy).replace(/'/g, "''")}'`);
        if (completionNote) updates.push(`completion_note = '${String(completionNote).replace(/'/g, "''")}'`);
      }
    }
    if (assignedTo !== undefined) updates.push(`assigned_to = '${String(assignedTo).replace(/'/g, "''")}'`);
    if (priority !== undefined) updates.push(`priority = ${parseInt(String(priority))}`);
    if (dueAt !== undefined) updates.push(`due_at = '${String(dueAt).replace(/'/g, "''")}'`);
    if (checklist !== undefined) updates.push(`checklist = '${JSON.stringify(checklist).replace(/'/g, "''")}'::jsonb`);

    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });

    updates.push("updated_at = NOW()");

    // Build update query
    const updateQuery = `UPDATE scientific_tasks SET ${updates.join(", ")} WHERE id = '${id.replace(/'/g, "''")}'`;
    await db.execute(sql.raw(updateQuery));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /tasks/lifecycle/:targetType/:targetId ──────────────────────────────
// Transition a knowledge object through the lifecycle.

router.post("/lifecycle/:targetType/:targetId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { targetType, targetId } = req.params;
    const {
      newStatus,
      reasoning,
      evidenceSummary,
      evidenceLevel,
      confidenceScore,
      sourceIds = [],
      reviewedBy = "admin",
      reviewerRole,
    } = req.body;

    if (!newStatus || !reasoning) {
      return res.status(400).json({ error: "newStatus and reasoning are required" });
    }

    // Get current status
    let previousStatus = "unknown";
    if (targetType === "entity") {
      const entity = await db.execute(sql`
        SELECT lifecycle_status FROM entities WHERE id = ${targetId} LIMIT 1
      `);
      previousStatus = (entity as any[])[0]?.lifecycle_status ?? "unknown";

      // Update entity lifecycle status
      await db.execute(sql`
        UPDATE entities SET lifecycle_status = ${newStatus}, updated_at = NOW()
        WHERE id = ${targetId}
      `);

      // If published, also update status field for backwards compat
      if (newStatus === "published") {
        await db.execute(sql`
          UPDATE entities SET status = 'published', published_at = NOW() WHERE id = ${targetId}
        `);
      }
    } else if (targetType === "content_block") {
      const block = await db.execute(sql`
        SELECT lifecycle_status FROM content_blocks WHERE id = ${targetId} LIMIT 1
      `);
      previousStatus = (block as any[])[0]?.lifecycle_status ?? "unknown";

      await db.execute(sql`
        UPDATE content_blocks
        SET lifecycle_status = ${newStatus},
            approved_by = ${newStatus === 'approved' ? reviewedBy : null},
            approved_at = ${newStatus === 'approved' ? sql`NOW()` : null},
            last_reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = ${targetId}
      `);
    }

    // Record decision history
    const decisionId = `dec-${randomUUID().slice(0,10)}`;
    await db.execute(sql`
      INSERT INTO decision_history (
        id, target_type, target_id,
        decision, previous_status, new_status,
        reasoning, evidence_summary, evidence_level,
        confidence_score, source_ids,
        reviewed_by, reviewer_role,
        created_at
      ) VALUES (
        ${decisionId}, ${targetType}, ${targetId},
        'lifecycle_transition', ${previousStatus}, ${newStatus},
        ${reasoning}, ${evidenceSummary ?? null}, ${evidenceLevel ?? null},
        ${confidenceScore ?? null}, ${JSON.stringify(sourceIds)},
        ${reviewedBy}, ${reviewerRole ?? null},
        NOW()
      )
    `);

    // Add system entry to discussion
    const discussionId = `disc-${randomUUID().slice(0,10)}`;
    await db.execute(sql`
      INSERT INTO scientific_discussion (
        id, target_type, target_id, thread_id,
        entry_type, content, author_type, author_id,
        source_ids, active, created_at
      ) VALUES (
        ${discussionId}, ${targetType}, ${targetId}, ${discussionId},
        'decision',
        ${'Lifecycle-Übergang: ' + previousStatus + ' → ' + newStatus + '. Begründung: ' + reasoning},
        'reviewer', ${reviewedBy},
        ${JSON.stringify(sourceIds)}, true, NOW()
      )
    `);

    res.json({
      decisionId,
      previousStatus,
      newStatus,
      targetType,
      targetId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /tasks/history/:targetType/:targetId ─────────────────────────────────
// Get decision history for a knowledge object.

router.get("/history/:targetType/:targetId", async (req: Request, res: Response) => {
  try {
    const { targetType, targetId } = req.params;

    const history = await db.execute(sql`
      SELECT * FROM decision_history
      WHERE target_type = ${targetType} AND target_id = ${targetId}
      ORDER BY created_at DESC
    `);

    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /tasks/stats/overview ────────────────────────────────────────────────

router.get("/stats/overview", requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') as open_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE priority <= 2 AND status = 'open') as urgent_tasks,
        COUNT(*) FILTER (WHERE task_type = 'resolve_conflict' AND status = 'open') as open_conflicts,
        COUNT(*) FILTER (WHERE task_type = 'review_new_source' AND status = 'open') as pending_source_reviews
      FROM scientific_tasks
    `);

    res.json((stats as any[])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Helper: Auto-generate checklist per task type ────────────────────────────

function generateChecklist(taskType: string, targetType?: string): Array<{item: string; completed: boolean}> {
  const checklists: Record<string, string[]> = {
    review_new_source: [
      "Quelle auf Relevanz prüfen",
      "Evidenzlevel bewerten",
      "Bias und Limitationen prüfen",
      "Mit bestehenden Quellen vergleichen",
      "Entity-Verlinkung prüfen",
      "Confidence Score neu berechnen",
      "Quelle freigeben oder ablehnen",
    ],
    update_entity: [
      "Neue Evidenz sichten",
      "Betroffene Content Blocks identifizieren",
      "Blocks aktualisieren",
      "Quellen ergänzen",
      "Confidence Score neu berechnen",
      "Review abschließen und Lifecycle-Übergang dokumentieren",
    ],
    review_faq: [
      "FAQ auf Aktualität prüfen",
      "Neue Antwort formulieren falls nötig",
      "Quellen prüfen",
      "FAQ freigeben",
    ],
    review_guide: [
      "Guide auf Aktualität prüfen",
      "Neue Erkenntnisse einarbeiten",
      "Quellen aktualisieren",
      "Guide freigeben",
    ],
    review_protocol: [
      "Protokoll auf Aktualität prüfen",
      "Dosierungsempfehlungen prüfen",
      "Neue Studien einarbeiten",
      "Protokoll freigeben",
    ],
    review_relation: [
      "Relation auf Aktualität prüfen",
      "Evidenz für Relation prüfen",
      "Confidence Score anpassen",
      "Relation freigeben oder entfernen",
    ],
    validate_confidence: [
      "Alle Quellen der Entity prüfen",
      "Confidence Score manuell validieren",
      "Abweichungen dokumentieren",
      "Score bestätigen oder korrigieren",
    ],
    resolve_conflict: [
      "Konflikt analysieren",
      "Beide Seiten prüfen",
      "Quellen vergleichen",
      "Entscheidung treffen",
      "Konflikt als gelöst markieren",
      "Entscheidung dokumentieren",
    ],
    complete_lifecycle: [
      "Lifecycle-Status prüfen",
      "Voraussetzungen für Übergang prüfen",
      "Übergang durchführen",
      "Dokumentieren",
    ],
    custom: [
      "Aufgabe analysieren",
      "Maßnahmen ergreifen",
      "Ergebnis dokumentieren",
    ],
  };

  const items = checklists[taskType] ?? checklists.custom;
  return items.map(item => ({ item, completed: false }));
}

export default router;
