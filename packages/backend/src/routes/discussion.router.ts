/**
 * Scientific Discussion Router
 * Threaded discussion per knowledge object.
 * Agents and reviewers can contribute. Conflicts are tracked, not overwritten.
 */
import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// ─── GET /discussion/:targetType/:targetId ────────────────────────────────────

router.get("/:targetType/:targetId", async (req: Request, res: Response) => {
  try {
    const { targetType, targetId } = req.params;

    const entries = await db.execute(sql`
      SELECT * FROM scientific_discussion
      WHERE target_type = ${targetType}
        AND target_id = ${targetId}
        AND active = true
      ORDER BY created_at ASC
    `);

    // Group by thread
    const threads: Record<string, any[]> = {};
    for (const entry of entries as any[]) {
      const threadId = entry.thread_id ?? entry.id;
      if (!threads[threadId]) threads[threadId] = [];
      threads[threadId].push(entry);
    }

    res.json({
      targetType,
      targetId,
      totalEntries: (entries as any[]).length,
      openConflicts: (entries as any[]).filter((e: any) => e.is_conflict && !e.conflict_resolved).length,
      threads: Object.values(threads),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /discussion/:targetType/:targetId ───────────────────────────────────
// Add a new discussion entry (comment, evidence, conflict flag, etc.)

router.post("/:targetType/:targetId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { targetType, targetId } = req.params;
    const {
      entryType,
      content,
      authorType = "reviewer",
      authorId,
      authorRole,
      sourceIds = [],
      confidenceScore,
      evidenceLevel,
      isConflict = false,
      conflictWith,
      threadId,
      parentEntryId,
    } = req.body;

    if (!entryType || !content) {
      return res.status(400).json({ error: "entryType and content are required" });
    }

    const id = `disc-${randomUUID().slice(0,10)}`;
    const resolvedThreadId = threadId ?? id; // start new thread if not specified

    await db.execute(sql`
      INSERT INTO scientific_discussion (
        id, target_type, target_id, thread_id, parent_entry_id,
        entry_type, content, author_type, author_id, author_role,
        source_ids, confidence_score, evidence_level,
        is_conflict, conflict_with,
        active, created_at
      ) VALUES (
        ${id}, ${targetType}, ${targetId}, ${resolvedThreadId}, ${parentEntryId ?? null},
        ${entryType}, ${content}, ${authorType}, ${authorId ?? null}, ${authorRole ?? null},
        ${JSON.stringify(sourceIds)}, ${confidenceScore ?? null}, ${evidenceLevel ?? null},
        ${isConflict}, ${conflictWith ?? null},
        true, NOW()
      )
    `);

    // If this is a conflict, create a scientific task automatically
    if (isConflict) {
      const taskId = `task-${randomUUID().slice(0,10)}`;
      await db.execute(sql`
        INSERT INTO scientific_tasks (
          id, task_type, title, description,
          target_type, target_id,
          triggered_by, trigger_reason,
          priority, status,
          checklist, created_at, updated_at
        ) VALUES (
          ${taskId}, 'resolve_conflict',
          ${'Konflikt in Diskussion: ' + targetId},
          ${content.substring(0, 200)},
          ${targetType}, ${targetId},
          ${authorId ?? 'system'}, ${'Konflikt in wissenschaftlicher Diskussion'},
          2, 'open',
          ${JSON.stringify([
            { item: "Konflikt analysieren", completed: false },
            { item: "Gegenargumente prüfen", completed: false },
            { item: "Quellen vergleichen", completed: false },
            { item: "Entscheidung treffen und dokumentieren", completed: false },
          ])},
          NOW(), NOW()
        )
      `);
    }

    res.status(201).json({ id, threadId: resolvedThreadId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /discussion/:entryId/resolve ──────────────────────────────────────
// Mark a conflict as resolved.

router.patch("/:entryId/resolve", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const { resolvedBy, resolutionNote } = req.body;

    await db.execute(sql`
      UPDATE scientific_discussion
      SET conflict_resolved = true,
          resolved_by = ${resolvedBy ?? 'admin'},
          resolved_at = NOW()
      WHERE id = ${entryId}
    `);

    // Add resolution entry to the thread
    const entry = await db.execute(sql`
      SELECT * FROM scientific_discussion WHERE id = ${entryId} LIMIT 1
    `);

    if ((entry as any[]).length > 0) {
      const e = (entry as any[])[0];
      const resolutionId = `disc-${randomUUID().slice(0,10)}`;
      await db.execute(sql`
        INSERT INTO scientific_discussion (
          id, target_type, target_id, thread_id, parent_entry_id,
          entry_type, content, author_type, author_id,
          source_ids, active, created_at
        ) VALUES (
          ${resolutionId}, ${e.target_type}, ${e.target_id}, ${e.thread_id}, ${entryId},
          'resolution', ${resolutionNote ?? 'Konflikt aufgelöst'}, 'reviewer', ${resolvedBy ?? 'admin'},
          '[]', true, NOW()
        )
      `);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /discussion/:entryId ─────────────────────────────────────────────
// Soft-delete a discussion entry.

router.delete("/:entryId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    await db.execute(sql`
      UPDATE scientific_discussion SET active = false WHERE id = ${entryId}
    `);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
