import { db } from "./index.js";
import { sql } from "drizzle-orm";

/**
 * Removes duplicate relations from the relations table.
 * Keeps the newest relation when duplicates exist (same fromEntityId + toEntityId + relationType).
 * Idempotent — safe to run multiple times.
 */
export async function migrateDedupRelations() {
  const result = await db.execute(sql`
    DELETE FROM relations
    WHERE id IN (
      SELECT id FROM (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY from_entity_id, to_entity_id, relation_type
            ORDER BY created_at DESC
          ) AS rn
        FROM relations
      ) ranked
      WHERE rn > 1
    )
  `);
  const deleted = (result as any).rowCount ?? (result as any).rowsAffected ?? 0;
  console.log(`[migrate-dedup-relations] Removed ${deleted} duplicate relations.`);
}
