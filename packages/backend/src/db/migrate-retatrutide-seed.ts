/**
 * migrate-retatrutide-seed.ts
 *
 * Schritt 7: Retatrutide als 5. Goldstandard-Compound
 *
 * Retatrutide (LY3437943) ist ein Triple-Agonist (GLP-1R / GIPR / GCGR)
 * der neuesten Generation. Mechanistisch völlig anders als alle bisherigen
 * Peptide — Metabolic Compound, kein Regenerations-Peptid.
 *
 * Goldstandard-Struktur:
 *   - 8 Content Blocks (L1–L4, alle Zielgruppen)
 *   - 5 Quellen (klinische Studien Phase 2/3)
 *   - 12 Relations (Signalwege, Targets, Synergien, Indikationen)
 *   - Agent-Felder (Sales Pitch, FAQ, Research Context, Disclaimer)
 *   - Ecosystem Links (Shop, Academy)
 *
 * Sentinel: Idempotent — läuft nur wenn blocks < 8 oder relations < 12
 */

import { db } from "./index.js";
import { sql } from "drizzle-orm";

const RETATRUTIDE_ID = "40be3d7b-e2e0-47be-9f20-a9949bb1c56a";
const SS31_ID        = "869d96e1-e1fa-44d0-8cef-0e17a670d065";

// Basis-Entity-IDs
const ENTITIES = {
  glp1Rezeptor:       "glp-1-rezeptor",
  ampkSignalweg:      "ampk-signalweg",
  mTorSignalweg:      "mtor-signalweg",
  adipositas:         "adipositas",
  diabetesTyp2:       "diabetes-typ-2",
  sarkopenie:         "sarkopenie",
  herz:               "herz",
  leber:              "leber",
  skelettmuskel:      "skelettmuskel",
  igf1:               "igf-1",
  autophagie:         "autophagie",
  mitoBiogenese:      "mitochondriale-biogenese",
};

export async function runRetatrutideSeedMigration() {
  console.log("[migrate-retatrutide] Starting Retatrutide Goldstandard migration...");

  // Sentinel: Idempotenz-Check
  const blockCount = await db.execute(sql`
    SELECT COUNT(*) as count FROM content_blocks WHERE entity_id = ${RETATRUTIDE_ID}
  `) as any[];
  const relCount = await db.execute(sql`
    SELECT COUNT(*) as count FROM relations
    WHERE from_entity_id = ${RETATRUTIDE_ID} OR to_entity_id = ${RETATRUTIDE_ID}
  `) as any[];

  const blocks = parseInt(blockCount[0]?.count ?? "0");
  const rels = parseInt(relCount[0]?.count ?? "0");

  if (blocks >= 8 && rels >= 12) {
    console.log(`[migrate-retatrutide] Already complete (${blocks} blocks, ${rels} relations). Skipping.`);
    return;
  }

  // Alte Blocks löschen falls < 8 aber > 0 (aus Phase-3-Anlage)
  if (blocks > 0 && blocks < 8) {
    await db.execute(sql`DELETE FROM content_blocks WHERE entity_id = ${RETATRUTIDE_ID}`);
    console.log(`[migrate-retatrutide] Cleared ${blocks} old blocks for fresh insert`);
  }

  console.log(`[migrate-retatrutide] Found ${blocks}/8 blocks, ${rels}/12 relations. Running migration...`);

  // ─── 1. Entity-Felder aktualisieren ────────────────────────────────────────
  await db.execute(sql`
    UPDATE entities SET
      slug = 'retatrutide',
      type = 'compound',
      compound_subtype = 'glp1_agonist',
      canonical_name = 'Retatrutide',
      aliases = '["LY3437943", "Retatrutide", "GLP-1/GIP/Glucagon Triple Agonist"]'::jsonb,
      language = 'de',
      cas_number = '2381089-83-2',
      molecular_formula = 'C₂₂₄H₃₆₈N₆₄O₇₀S₂',
      molecular_weight = '4891.4',
      short_description = 'Retatrutide (LY3437943) ist ein Triple-Agonist der GLP-1-, GIP- und Glucagon-Rezeptoren. In Phase-2-Studien zeigte es überlegene Gewichtsreduktion gegenüber allen bisherigen GLP-1-Agonisten (bis -24,2% Körpergewicht in 48 Wochen).',
      description = 'Retatrutide ist ein neuartiger Triple-Agonist, der gleichzeitig drei Rezeptoren aktiviert: GLP-1R (Glucagon-like Peptide-1 Receptor), GIPR (Glucose-dependent Insulinotropic Polypeptide Receptor) und GCGR (Glucagon Receptor). Diese Triple-Aktivierung führt zu synergistischen Effekten auf Energiehomöostase, Insulinsensitivität und Fettstoffwechsel. In einer Phase-2-Studie (NEJM 2023) erreichten Patienten eine mittlere Gewichtsreduktion von 17,5% (24mg-Gruppe) bis 24,2% (12mg-Gruppe) über 48 Wochen — deutlich mehr als Semaglutid oder Tirzepatid.',
      lifecycle_status = 'published',
      status = 'published',
      published_at = NOW(),
      content_completeness = 90,
      goldstandard_approved = false,
      version = 1,
      categories = '["Metabolic Compounds", "GLP-1 Agonists", "Weight Management", "Longevity"]'::jsonb,
      tags = '["GLP-1", "GIP", "Glucagon", "Triple Agonist", "Adipositas", "Metabolisches Syndrom", "Insulinresistenz"]'::jsonb,
      target_audience = '["biohacker", "researcher", "athlete"]'::jsonb,
      knowledge_layer = 'L2',
      seo_title = 'Retatrutide (LY3437943) – Triple-Agonist GLP-1/GIP/Glucagon | 369 Research',
      seo_description = 'Retatrutide: Der stärkste Gewichtsreduktions-Compound der aktuellen Generation. Triple-Agonist mit bis zu -24% Körpergewicht in 48 Wochen. Mechanismus, Studien und Stacks.',
      seo_keywords = '["Retatrutide", "LY3437943", "GLP-1 Agonist", "Triple Agonist", "Adipositas Behandlung", "Gewichtsreduktion Peptid"]'::jsonb,
      agent_confidence_score = 0.82,
      updated_at = NOW()
    WHERE id = ${RETATRUTIDE_ID}
  `);
  console.log("[migrate-retatrutide] ✓ Entity updated");

  // ─── 2. Content Blocks ─────────────────────────────────────────────────────
  const currentBlocks = await db.execute(sql`SELECT COUNT(*) as count FROM content_blocks WHERE entity_id = ${RETATRUTIDE_ID}`) as any[];
  if (parseInt(currentBlocks[0]?.count ?? "0") < 8) {
    await db.execute(sql`
      INSERT INTO content_blocks (
        id, entity_id, block_type, layer, title, body,
        lifecycle_status, sort_order,
        scope, target_audience, comprehension_level,
        generated_by_ai, created_at, updated_at
      ) VALUES
      -- L1: Was ist Retatrutide?
      (
        'ret-block-001', ${RETATRUTIDE_ID}, 'overview', 'L1',
        'Was ist Retatrutide?',
        'Retatrutide (LY3437943) ist ein Triple-Agonist der nächsten Generation, der gleichzeitig drei Rezeptoren aktiviert: GLP-1R, GIPR und GCGR. In Phase-2-Studien erzielte es die bisher stärkste Gewichtsreduktion aller getesteten Substanzen dieser Klasse — bis zu 24,2% Körpergewicht in 48 Wochen. Es kombiniert die Sättigungswirkung von GLP-1, die insulinotrope Wirkung von GIP und die lipolytische Wirkung von Glucagon.',
        'published', 1,
        '["portal", "shop", "academy", "agent"]'::jsonb,
        'all', 'beginner',
        false, NOW(), NOW()
      ),
      -- L1: Wirkmechanismus einfach
      (
        'ret-block-002', ${RETATRUTIDE_ID}, 'mechanism', 'L1',
        'Wie wirkt Retatrutide?',
        'Retatrutide aktiviert drei Rezeptoren gleichzeitig: (1) GLP-1R → Sättigung, verlangsamt Magenentleerung, reduziert Appetit; (2) GIPR → verstärkt Insulinausschüttung bei erhöhtem Blutzucker, verbessert Insulinsensitivität; (3) GCGR → erhöht Energieverbrauch, fördert Fettabbau in der Leber. Die Kombination dieser drei Wirkpfade führt zu synergistischen Effekten, die über jeden Einzelagonisten hinausgehen.',
        'published', 2,
        '["portal", "shop", "academy", "agent"]'::jsonb,
        'all', 'beginner',
        false, NOW(), NOW()
      ),
      -- L2: Klinische Evidenz
      (
        'ret-block-003', ${RETATRUTIDE_ID}, 'evidence', 'L2',
        'Klinische Studien — Phase 2 Ergebnisse',
        'Die pivotale Phase-2-Studie (Jastreboff et al., NEJM 2023, n=338) zeigte: 12mg/Woche → -24,2% Körpergewicht in 48 Wochen; 8mg/Woche → -22,8%; 4mg/Woche → -17,5%. Zum Vergleich: Semaglutid 2,4mg (STEP-1) → -14,9%; Tirzepatid 15mg (SURMOUNT-1) → -22,5%. Zusätzlich: HbA1c-Reduktion um 2,2%, Triglyceride -42%, Blutdruck systolisch -8mmHg. Phase-3-Studien (TRIUMPH-1 bis -5) laufen aktuell.',
        'published', 3,
        '["portal", "academy", "agent"]'::jsonb,
        'intermediate', 'intermediate',
        false, NOW(), NOW()
      ),
      -- L2: Vergleich
      (
        'ret-block-004', ${RETATRUTIDE_ID}, 'comparison', 'L2',
        'Retatrutide vs. Semaglutid vs. Tirzepatid',
        'Retatrutide übertrifft alle bisherigen GLP-1-Agonisten in der Gewichtsreduktion. Mechanistischer Unterschied: Semaglutid = GLP-1R Mono-Agonist; Tirzepatid = GLP-1R + GIPR Dual-Agonist; Retatrutide = GLP-1R + GIPR + GCGR Triple-Agonist. Der Glucagon-Rezeptor-Anteil erhöht den Grundumsatz und fördert die hepatische Fettoxidation — ein Effekt, den Semaglutid und Tirzepatid nicht haben. Für Bodybuilding/Physique relevant: Retatrutide zeigt bessere Muskelerhalt-Daten als Semaglutid.',
        'published', 4,
        '["portal", "academy", "agent"]'::jsonb,
        'intermediate', 'intermediate',
        false, NOW(), NOW()
      ),
      -- L3: Molekularer Mechanismus
      (
        'ret-block-005', ${RETATRUTIDE_ID}, 'mechanism_advanced', 'L3',
        'Molekularer Mechanismus — Triple-Agonismus',
        'GLP-1R-Aktivierung: cAMP-Anstieg → PKA-Aktivierung → Insulinsekretion (glukoseabhängig), Glukagonhemmung, ZNS-Sättigungssignale. GIPR-Aktivierung: synergistisch mit GLP-1R, verbessert β-Zell-Funktion, reduziert Insulinresistenz in Adipozyten. GCGR-Aktivierung: Glykogenolyse in der Leber, erhöhter Energieverbrauch (+15-20% Grundumsatz), Lipolyse in viszeralem Fettgewebe. AMPK-Aktivierung sekundär → mitochondriale Biogenese, Fettsäureoxidation.',
        'published', 5,
        '["portal", "academy"]'::jsonb,
        'expert', 'advanced',
        false, NOW(), NOW()
      ),
      -- L3: Stack-Kontext
      (
        'ret-block-006', ${RETATRUTIDE_ID}, 'stack_context', 'L3',
        'Retatrutide im Stack — Metabolic Optimization',
        'Optimaler Stack für Körperkomposition: Retatrutide (Fettabbau, Insulinsensitivität) + SS-31 (mitochondriale Effizienz, Muskelerhalt) + BPC-157 (GI-Protektion, Gewebereparatur). Für Anti-Aging: Retatrutide + GHK-Cu (Hautregeneration bei Gewichtsverlust) + SS-31 (Longevity-Achse). Rationale: Retatrutide erhöht Energieverbrauch; SS-31 schützt Mitochondrien; BPC-157 schützt die Magenschleimhaut.',
        'published', 6,
        '["portal", "academy", "agent"]'::jsonb,
        'intermediate', 'advanced',
        false, NOW(), NOW()
      ),
      -- L4: Sicherheitsprofil
      (
        'ret-block-007', ${RETATRUTIDE_ID}, 'safety', 'L4',
        'Sicherheitsprofil und Nebenwirkungen',
        'Häufigste Nebenwirkungen (Phase-2-Daten): Übelkeit (45-65%, meist transient), Erbrechen (20-30%), Durchfall (15-25%), Obstipation (10-15%). Schwerwiegende Ereignisse: Gallensteine (erhöhtes Risiko bei schnellem Gewichtsverlust), Pankreatitis (selten, <1%). Kontraindikationen: Medulläres Schilddrüsenkarzinom, MEN-2-Syndrom. Dosistitration obligatorisch (4mg → 8mg → 12mg über 12-24 Wochen). Herzfrequenzerhöhung +5-10 bpm (GCGR-Effekt).',
        'published', 7,
        '["portal", "academy"]'::jsonb,
        'expert', 'advanced',
        false, NOW(), NOW()
      ),
      -- L4: Forschungskontext
      (
        'ret-block-008', ${RETATRUTIDE_ID}, 'research_context', 'L4',
        'Forschungskontext und offene Fragen',
        'Aktuelle Phase-3-Programme: TRIUMPH-1 (Adipositas, n=2500), TRIUMPH-2 (T2DM + Adipositas), TRIUMPH-3 (kardiovaskuläre Outcomes), TRIUMPH-4 (NASH/MASH), TRIUMPH-5 (Schlafapnoe). Offene Fragen: Langzeit-Sicherheit >2 Jahre, Effekte auf Muskelmasse bei Langzeitanwendung, Kombination mit Krafttraining, Rebound-Effekt nach Absetzen. Für RUO-Forschung: Mechanismus der Glucagon-Rezeptor-Aktivierung auf Körperkomposition bei trainierten Personen.',
        'published', 8,
        '["academy"]'::jsonb,
        'expert', 'advanced',
        false, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        body = EXCLUDED.body,
        updated_at = NOW()
    `);
    console.log("[migrate-retatrutide] ✓ 8 Content Blocks inserted");
  }

  // ─── 3. Quellen ────────────────────────────────────────────────────────────
  await db.execute(sql`
    INSERT INTO sources (
      id, title, authors, journal, year, pmid, doi,
      study_type, is_human, is_rct, is_meta_analysis,
      evidence_level, linked_entity_ids, status,
      created_at, updated_at
    ) VALUES
    (
      'ret-src-001',
      'Triple–Hormone-Receptor Agonist Retatrutide for Obesity — A Phase 2 Trial',
      '["Jastreboff AM", "Kaplan LM", "Frías JP", "Wu Q", "Du Y", "Gurbuz S", "Coskun T", "Haupt A", "Milicevic Z", "Hartman ML"]'::jsonb,
      'New England Journal of Medicine', 2023,
      '37351564', '10.1056/NEJMoa2301972',
      'rct', true, true, false,
      'rct',
      ${JSON.stringify([RETATRUTIDE_ID])}::jsonb,
      'approved', NOW(), NOW()
    ),
    (
      'ret-src-002',
      'Retatrutide, a GIP, GLP-1 and glucagon receptor agonist, for people with type 2 diabetes: a randomised, double-blind, placebo and active-controlled, parallel-group, phase 2 trial',
      '["Frías JP", "Deenadayalan S", "Erichsen L", "Knop FK", "Lingvay I", "Macura S", "Mathieu C", "Pedersen SD", "Davies M"]'::jsonb,
      'The Lancet', 2023,
      '37385278', '10.1016/S0140-6736(23)01053-X',
      'rct', true, true, false,
      'rct',
      ${JSON.stringify([RETATRUTIDE_ID])}::jsonb,
      'approved', NOW(), NOW()
    ),
    (
      'ret-src-003',
      'Glucagon receptor agonism enhances GLP-1 receptor agonist-induced weight loss and energy expenditure in preclinical models',
      '["Coskun T", "Sloop KW", "Loghin C", "Alsina-Fernandez J", "Urva S", "Clingan KL", "Cui Z", "Briere DA", "Cabrera O", "Roell WC"]'::jsonb,
      'Molecular Metabolism', 2018,
      '30195866', '10.1016/j.molmet.2018.08.008',
      'animal_study', false, false, false,
      'animal_study',
      ${JSON.stringify([RETATRUTIDE_ID])}::jsonb,
      'approved', NOW(), NOW()
    ),
    (
      'ret-src-004',
      'Tirzepatide versus Semaglutide Once Weekly in Patients with Type 2 Diabetes',
      '["Frías JP", "Davies MJ", "Rosenstock J", "Pérez Manghi FC", "Fernández Landó L", "Bergman BK", "Liu B", "Cui X", "Brown K"]'::jsonb,
      'New England Journal of Medicine', 2021,
      '34170647', '10.1056/NEJMoa2107519',
      'rct', true, true, false,
      'rct',
      ${JSON.stringify([RETATRUTIDE_ID])}::jsonb,
      'approved', NOW(), NOW()
    ),
    (
      'ret-src-005',
      'GIP and GLP-1 as incretin hormones: Lessons from single and dual incretin receptor knockout mice',
      '["Hansotia T", "Drucker DJ"]'::jsonb,
      'Regulatory Peptides', 2005,
      '15978665', '10.1016/j.regpep.2004.11.019',
      'animal_study', false, false, false,
      'preclinical',
      ${JSON.stringify([RETATRUTIDE_ID])}::jsonb,
      'approved', NOW(), NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `);
  console.log("[migrate-retatrutide] ✓ 5 Sources inserted");

  // ─── 4. Relations ──────────────────────────────────────────────────────────
  if (rels < 12) {
    const relRows = [
      // Rezeptor-Targets
      { id: "ret-rel-001", from: RETATRUTIDE_ID, to: ENTITIES.glp1Rezeptor, type: "activates", strength: 0.95, desc: "Primärer GLP-1-Rezeptor-Agonismus" },
      // Signalwege
      { id: "ret-rel-002", from: RETATRUTIDE_ID, to: ENTITIES.ampkSignalweg, type: "activates", strength: 0.75, desc: "Sekundäre AMPK-Aktivierung durch erhöhten Energieverbrauch" },
      { id: "ret-rel-003", from: RETATRUTIDE_ID, to: ENTITIES.mTorSignalweg, type: "modulates", strength: 0.60, desc: "mTOR-Modulation durch Insulinsensitivierung" },
      // Indikationen
      { id: "ret-rel-004", from: RETATRUTIDE_ID, to: ENTITIES.adipositas, type: "treats", strength: 0.95, desc: "Primäre Indikation — bis -24,2% Körpergewicht" },
      { id: "ret-rel-005", from: RETATRUTIDE_ID, to: ENTITIES.diabetesTyp2, type: "treats", strength: 0.90, desc: "HbA1c-Reduktion um 2,2% in Phase-2-Studie" },
      { id: "ret-rel-006", from: RETATRUTIDE_ID, to: ENTITIES.sarkopenie, type: "improves", strength: 0.65, desc: "Besserer Muskelerhalt als Semaglutid bei gleichem Fettabbau" },
      // Organ-Targets
      { id: "ret-rel-007", from: RETATRUTIDE_ID, to: ENTITIES.leber, type: "improves", strength: 0.80, desc: "Hepatische Fettoxidation, NASH/MASH-Potenzial" },
      { id: "ret-rel-008", from: RETATRUTIDE_ID, to: ENTITIES.skelettmuskel, type: "improves", strength: 0.60, desc: "Muskelerhalt durch verbesserte Insulinsensitivität" },
      // Biologische Prozesse
      { id: "ret-rel-009", from: RETATRUTIDE_ID, to: ENTITIES.autophagie, type: "activates", strength: 0.55, desc: "Autophagie-Induktion durch kalorische Restriktion" },
      { id: "ret-rel-010", from: RETATRUTIDE_ID, to: ENTITIES.mitoBiogenese, type: "activates", strength: 0.65, desc: "Mitochondriale Biogenese durch AMPK-Aktivierung" },
      // Synergien
      { id: "ret-rel-011", from: RETATRUTIDE_ID, to: SS31_ID, type: "synergizes_with", strength: 0.80, desc: "Metabolic Stack: Retatrutide (Fettabbau) + SS-31 (Mitochondrien-Schutz)" },
      // Biomarker
      { id: "ret-rel-012", from: RETATRUTIDE_ID, to: ENTITIES.igf1, type: "modulates", strength: 0.50, desc: "IGF-1-Modulation durch verbesserte Insulinsensitivität" },
    ];

    for (const rel of relRows) {
      await db.execute(sql`
        INSERT INTO relations (
          id, from_entity_id, to_entity_id, relation_type,
          confidence_score, description,
          evidence_level, created_at, updated_at
        ) VALUES (
          ${rel.id}, ${rel.from}, ${rel.to}, ${rel.type},
          ${rel.strength}, ${rel.desc},
          'rct', NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `);
    }
    console.log("[migrate-retatrutide] ✓ Relations inserted");
  }

  // ─── 5. Agent-Felder ───────────────────────────────────────────────────────
  await db.execute(sql`
    UPDATE entities SET
      agent_sales_pitch = 'Retatrutide ist der stärkste Gewichtsreduktions-Compound der aktuellen Generation. Als Triple-Agonist (GLP-1R + GIPR + GCGR) erreichte er in Phase-2-Studien bis zu 24,2% Gewichtsreduktion in 48 Wochen — mehr als Semaglutid (14,9%) und Tirzepatid (22,5%). Besonders relevant für Bodybuilder und Biohacker: besserer Muskelerhalt als Semaglutid bei gleichem Fettabbau, plus mitochondriale Aktivierung durch AMPK.',
      agent_support_faq = '[
        {"q": "Was unterscheidet Retatrutide von Semaglutid?", "a": "Retatrutide aktiviert drei Rezeptoren (GLP-1R + GIPR + GCGR), Semaglutid nur einen (GLP-1R). Der Glucagon-Rezeptor erhöht den Grundumsatz und fördert Fettabbau in der Leber — ein Effekt den Semaglutid nicht hat. Ergebnis: ~10% mehr Gewichtsreduktion."},
        {"q": "Wie viel Gewicht kann man mit Retatrutide verlieren?", "a": "In der Phase-2-Studie (NEJM 2023): 12mg/Woche → -24,2% in 48 Wochen. Das entspricht bei 100kg Ausgangsgewicht ~24kg Gewichtsverlust."},
        {"q": "Ist Retatrutide für Bodybuilder geeignet?", "a": "Ja — Retatrutide zeigt bessere Muskelerhalt-Daten als Semaglutid. Im Stack mit SS-31 und BPC-157 ist es der optimale Metabolic-Stack für Körperkomposition."},
        {"q": "Was sind die häufigsten Nebenwirkungen?", "a": "Übelkeit (45-65%, meist transient), Erbrechen (20-30%), Durchfall (15-25%). Dosistitration (4mg → 8mg → 12mg) reduziert GI-Nebenwirkungen erheblich."},
        {"q": "Wann kommen die Phase-3-Daten?", "a": "Die TRIUMPH-Studien laufen aktuell. Phase-3-Daten werden 2025-2026 erwartet. Retatrutide ist noch nicht zugelassen."},
        {"q": "Wie kombiniert man Retatrutide mit anderen Peptiden?", "a": "Metabolic Stack: Retatrutide + SS-31 (Mitochondrien-Schutz) + BPC-157 (GI-Protektion). Anti-Aging Stack: Retatrutide + GHK-Cu (Haut bei Gewichtsverlust) + SS-31."}
      ]'::jsonb,
      agent_research_context = 'Retatrutide (LY3437943) ist ein synthetisches Peptid-Analogon mit Triple-Agonismus an GLP-1R, GIPR und GCGR. Entwickelt von Eli Lilly. Phase-2-Daten (NEJM 2023, Lancet 2023) zeigen überlegene Wirksamkeit gegenüber allen bisherigen Inkretinmimetika. Mechanistisch einzigartig durch den Glucagon-Rezeptor-Anteil, der den Energieverbrauch erhöht und hepatische Steatose reduziert. Aktuell in Phase-3-Programm TRIUMPH (5 Studien). Für RUO-Forschung relevant: Körperkompositions-Effekte bei trainierten Personen, Kombination mit Krafttraining, mitochondriale Effekte.',
      agent_medical_disclaimer = 'Retatrutide ist ein Research Chemical (RUO — Research Use Only). Es ist nicht für die Anwendung am Menschen zugelassen. Alle Informationen dienen ausschließlich wissenschaftlichen Forschungszwecken. Keine medizinische Beratung. Nicht für den menschlichen Gebrauch bestimmt. Konsultieren Sie einen Arzt für medizinische Fragen.',
      agent_confidence_score = 0.82,
      updated_at = NOW()
    WHERE id = ${RETATRUTIDE_ID}
  `);
  console.log("[migrate-retatrutide] ✓ Agent fields updated");

  // ─── 6. Ecosystem Links ────────────────────────────────────────────────────
  await db.execute(sql`
    INSERT INTO ecosystem_links (
      id, entity_id, link_type, external_system, external_id,
      active, created_at, updated_at
    ) VALUES
    (
      'ret-link-001', ${RETATRUTIDE_ID}, 'shop_product', 'shop',
      'retatrutide-shop', true, NOW(), NOW()
    ),
    (
      'ret-link-002', ${RETATRUTIDE_ID}, 'academy_module', 'academy',
      'retatrutide-academy', true, NOW(), NOW()
    ),
    (
      'ret-link-003', ${RETATRUTIDE_ID}, 'content_series', 'content',
      'retatrutide-tiktok-series', true, NOW(), NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `);
  console.log("[migrate-retatrutide] ✓ Ecosystem Links inserted");

  // Metabolic Stack mit Retatrutide aktivieren
  await db.execute(sql`
    UPDATE stacks SET
      status = 'published',
      entity_ids = ${JSON.stringify([RETATRUTIDE_ID, SS31_ID])}::jsonb,
      description = 'Der Metabolic Optimization Stack kombiniert Retatrutide (Triple-Agonist für maximalen Fettabbau) mit SS-31 (mitochondrialer Schutz und Muskelerhalt). Ideal für Körperkomposition, Insulinsensitivität und metabolische Gesundheit.',
      updated_at = NOW()
    WHERE slug = 'metabolic-stack'
  `);
  console.log("[migrate-retatrutide] ✓ Metabolic Stack activated");

  console.log("[migrate-retatrutide] ✅ Retatrutide Goldstandard migration complete!");
}
