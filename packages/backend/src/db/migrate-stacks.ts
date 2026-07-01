/**
 * migrate-stacks.ts
 *
 * Schritt 2 des Architektur-Manifests:
 * Erste Stacks anlegen.
 *
 * Stacks:
 *   1. Regeneration Stack: BPC-157 + TB-500 + GHK-Cu
 *   2. Anti-Aging Stack: GHK-Cu + SS-31
 *   3. Metabolic Stack: Vorbereitet (Retatrutide + SS-31) — Status: draft
 *
 * entity_roles: { entityId: "primary" | "support" | "optional" }
 */

import { db } from "./index.js";
import { sql } from "drizzle-orm";

// Entity IDs (statisch, aus Migration bekannt)
const IDS = {
  BPC157: "7f796ffe-8714-46ec-aeb6-ac8f0e959bd0",
  TB500:  "ac37e146-c28c-4e81-a47d-17141f6cc857",
  GHKCU:  "b9b7a571-71a0-4f78-b7b8-53cb1ef1cd51",
  SS31:   "869d96e1-e1fa-44d0-8cef-0e17a670d065",
  // Retatrutide wird nach Goldstandard-Migration ergänzt
  RETATRUTIDE: "retatrutide", // Slug als Platzhalter
};

const stacks = [
  {
    id: "stack-regeneration-001",
    slug: "regeneration-stack",
    name: "Regeneration Stack",
    goal: "Maximale Geweberegeneration — Sehnen, Muskeln, Darm, Haut",
    description:
      "Der Regeneration Stack kombiniert drei komplementäre Peptide mit synergistischen Mechanismen: " +
      "BPC-157 aktiviert Angiogenese und Kollagensynthese lokal, TB-500 fördert systemische Zellmigration " +
      "und Aktin-Dynamik, GHK-Cu stimuliert Fibroblasten und schützt Gewebe antioxidativ. " +
      "Zusammen adressieren sie alle drei Phasen der Geweberegeneration: Entzündungsphase, Proliferationsphase, Remodeling. " +
      "Research Use Only.",
    targetAudience: ["biohacker", "athlete", "recovery_research", "anti_aging"],
    entityIds: [IDS.BPC157, IDS.TB500, IDS.GHKCU],
    entityRoles: {
      [IDS.BPC157]: "primary",
      [IDS.TB500]:  "primary",
      [IDS.GHKCU]:  "support",
    },
    synergyDescription:
      "BPC-157 und TB-500 wirken über unterschiedliche Mechanismen (VEGF/Angiogenese vs. Aktin-Regulierung) " +
      "und verstärken sich gegenseitig. GHK-Cu ergänzt durch Kollagensynthese-Stimulation und antioxidativen Schutz.",
    difficulty: "intermediate",
    durationWeeks: 8,
    evidenceLevel: "animal",
    isFeatured: true,
    contentHook:
      "Dein Körper hat ein eingebautes Reparatursystem. Diese drei Peptide aktivieren es gleichzeitig — " +
      "auf drei verschiedenen Ebenen.",
    status: "published",
  },
  {
    id: "stack-antiaging-001",
    slug: "anti-aging-stack",
    name: "Anti-Aging Stack",
    goal: "Zelluläres Anti-Aging — Mitochondrien, Haut, systemische Regeneration",
    description:
      "Der Anti-Aging Stack kombiniert GHK-Cu (epigenetische Regulation, Kollagensynthese, Hautregeneration) " +
      "mit SS-31 (mitochondriale Protektion, Cardiolipin-Stabilisierung, ATP-Optimierung). " +
      "Beide Compounds adressieren unterschiedliche Ebenen des Alterns: " +
      "GHK-Cu auf Gewebeebene (Haut, Kollagen, Wundheilung), SS-31 auf Zellenergieebene (Mitochondrien, ROS-Reduktion). " +
      "Research Use Only.",
    targetAudience: ["anti_aging", "biohacker", "longevity", "skin_research"],
    entityIds: [IDS.GHKCU, IDS.SS31],
    entityRoles: {
      [IDS.GHKCU]: "primary",
      [IDS.SS31]:  "primary",
    },
    synergyDescription:
      "GHK-Cu wirkt primär auf Gewebeebene (Kollagen, Fibroblasten, Epigenetik). " +
      "SS-31 wirkt auf Zellenergieebene (Mitochondrien, Cardiolipin, ATP). " +
      "Zusammen adressieren sie komplementäre Anti-Aging-Mechanismen ohne Überlappung.",
    difficulty: "beginner",
    durationWeeks: 12,
    evidenceLevel: "pilot_human",
    isFeatured: true,
    contentHook:
      "Altern passiert auf zwei Ebenen gleichzeitig: Gewebe und Zellenergie. " +
      "Dieser Stack adressiert beide — gleichzeitig.",
    status: "published",
  },
  {
    id: "stack-metabolic-001",
    slug: "metabolic-stack",
    name: "Metabolic Stack",
    goal: "Metabolische Optimierung — Fettverlust, Muskelschutz, mitochondriale Effizienz",
    description:
      "Der Metabolic Stack ist für die Kombination von Retatrutide (GLP-1/GIP/Glucagon Triple-Agonist) " +
      "mit SS-31 (mitochondriale Protektion) konzipiert. " +
      "Retatrutide adressiert Fettstoffwechsel, Insulinsensitivität und Appetitregulation. " +
      "SS-31 schützt die mitochondriale Funktion während metabolischer Umstellung und erhält die Muskelenergie. " +
      "Status: Vorbereitet — wird nach Retatrutide-Goldstandard-Migration aktiviert. " +
      "Research Use Only.",
    targetAudience: ["metabolic_research", "biohacker", "body_composition"],
    entityIds: [IDS.SS31], // Retatrutide wird nach Goldstandard ergänzt
    entityRoles: {
      [IDS.SS31]: "support",
      // Retatrutide: "primary" — wird nach Migration ergänzt
    },
    synergyDescription:
      "Retatrutide (GLP-1/GIP/Glucagon) aktiviert metabolische Umstellung. " +
      "SS-31 schützt Mitochondrien während dieser Umstellung und erhält die ATP-Produktion in Muskelzellen. " +
      "Mechanistisch komplementär: metabolische Aktivierung + mitochondrialer Schutz.",
    difficulty: "advanced",
    durationWeeks: 16,
    evidenceLevel: "animal",
    isFeatured: false,
    contentHook:
      "Fettverlust ohne Muskelverlust ist ein Mitochondrien-Problem. " +
      "Dieser Stack löst es auf molekularer Ebene.",
    status: "draft", // Erst nach Retatrutide-Goldstandard auf published setzen
  },
];

export async function runStacksMigration() {
  console.log("[migrate-stacks] Starting...");

  // Sentinel: Prüfe ob Stacks bereits angelegt
  const check = await db.execute(sql`
    SELECT COUNT(*) as count FROM stacks WHERE id LIKE 'stack-%'
  `) as any[];

  const existingCount = Number(check[0]?.count ?? 0);
  if (existingCount >= 3) {
    console.log(`[migrate-stacks] Already done (${existingCount} stacks found), skipping.`);
    return;
  }

  let inserted = 0;
  for (const stack of stacks) {
    await db.execute(sql`
      INSERT INTO stacks (
        id, slug, name, goal, description,
        target_audience, entity_ids, entity_roles,
        synergy_description, difficulty, duration_weeks,
        evidence_level, is_featured, content_hook, status,
        created_at, updated_at
      ) VALUES (
        ${stack.id},
        ${stack.slug},
        ${stack.name},
        ${stack.goal},
        ${stack.description},
        ${JSON.stringify(stack.targetAudience)},
        ${JSON.stringify(stack.entityIds)},
        ${JSON.stringify(stack.entityRoles)},
        ${stack.synergyDescription},
        ${stack.difficulty},
        ${stack.durationWeeks},
        ${stack.evidenceLevel},
        ${stack.isFeatured},
        ${stack.contentHook},
        ${stack.status},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `);
    console.log(`[migrate-stacks] Inserted: ${stack.name} (${stack.status})`);
    inserted++;
  }

  // Stack-IDs in entity stackIds-Felder eintragen
  // BPC-157 + TB-500 + GHK-Cu → Regeneration Stack
  await db.execute(sql`
    UPDATE entities SET
      stack_ids = COALESCE(stack_ids, '[]'::jsonb) || '["stack-regeneration-001"]'::jsonb,
      updated_at = NOW()
    WHERE id IN (${IDS.BPC157}, ${IDS.TB500}, ${IDS.GHKCU})
    AND NOT (stack_ids @> '["stack-regeneration-001"]'::jsonb)
  `);

  // GHK-Cu + SS-31 → Anti-Aging Stack
  await db.execute(sql`
    UPDATE entities SET
      stack_ids = COALESCE(stack_ids, '[]'::jsonb) || '["stack-antiaging-001"]'::jsonb,
      updated_at = NOW()
    WHERE id IN (${IDS.GHKCU}, ${IDS.SS31})
    AND NOT (stack_ids @> '["stack-antiaging-001"]'::jsonb)
  `);

  // SS-31 → Metabolic Stack (Vorbereitung)
  await db.execute(sql`
    UPDATE entities SET
      stack_ids = COALESCE(stack_ids, '[]'::jsonb) || '["stack-metabolic-001"]'::jsonb,
      updated_at = NOW()
    WHERE id = ${IDS.SS31}
    AND NOT (stack_ids @> '["stack-metabolic-001"]'::jsonb)
  `);

  console.log(`[migrate-stacks] Done. Inserted ${inserted} stacks. Entity stackIds updated.`);
}
