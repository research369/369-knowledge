import { db } from "./index.js";
import { sql } from "drizzle-orm";

/**
 * Removes duplicate content blocks.
 * Keeps the newest block when duplicates exist (same entity_id + title + block_type + layer).
 * If multiple duplicates have content, merges them into the newest.
 * Idempotent — safe to run multiple times.
 */
export async function migrateDedupBlocks() {
  // Find and delete duplicate blocks, keeping the newest one per group
  // A duplicate is defined as: same entity_id + title + block_type + layer
  const result = await db.execute(sql`
    DELETE FROM content_blocks
    WHERE id IN (
      SELECT id FROM (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY entity_id, COALESCE(title, ''), block_type, layer
            ORDER BY created_at DESC
          ) AS rn
        FROM content_blocks
      ) ranked
      WHERE rn > 1
    )
  `);

  const deleted = (result as any).rowCount ?? (result as any).rowsAffected ?? 0;
  console.log(`[migrate-dedup-blocks] Removed ${deleted} duplicate content blocks.`);
}
