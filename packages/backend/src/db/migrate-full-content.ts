import { db } from "./index.js";
import { sql } from "drizzle-orm";

/**
 * Adds full_content column to entities table for long-form markdown content.
 * Used by studies, guides, and other content-heavy entity types.
 * Idempotent — safe to run multiple times.
 */
export async function migrateFullContent() {
  // Add full_content column if it doesn't exist
  await db.execute(sql`
    ALTER TABLE entities
    ADD COLUMN IF NOT EXISTS full_content TEXT;
  `);
  console.log("[migrate-full-content] full_content column ensured on entities table.");
}
