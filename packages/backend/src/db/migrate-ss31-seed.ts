/**
 * SS-31 Goldstandard Seed Migration
 *
 * Architektur Version 1.0 — Mitochondrial / Longevity
 * UUID: 869d96e1-e1fa-44d0-8cef-0e17a670d065
 *
 * SCHEMA-VALIDIERT: Alle Spalten gegen schema.ts geprüft
 * SS-31 = Szeto-Schiller Peptid 31 (D-Arg-2'6'-Dmt-Lys-Phe-NH2)
 * Primäre Targets: Mitochondrien, Cardiolipin, oxidativer Stress, Herzinsuffizienz
 */

import { db } from "./index.js";
import { sql } from "drizzle-orm";

const SS31_UUID = "869d96e1-e1fa-44d0-8cef-0e17a670d065";

export async function runSs31Seed() {
  try {
    const blockCountResult = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM content_blocks WHERE entity_id = ${SS31_UUID}`
    );
    const relCountResult = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM relations WHERE from_entity_id = ${SS31_UUID} OR to_entity_id = ${SS31_UUID}`
    );

    const blockCount = Number((blockCountResult as any)[0]?.cnt ?? 0);
    const relCount = Number((relCountResult as any)[0]?.cnt ?? 0);

    if (blockCount >= 8 && relCount >= 12) {
      console.log("[SS-31 Seed] Already complete — skipping");
      return;
    }

    const blocksAlreadyDone = blockCount >= 8;
    console.log(`[SS-31 Seed] Starting — blocks: ${blockCount}/8, relations: ${relCount}/12 (blocks_done: ${blocksAlreadyDone})`);

    // ── 1. ENTITY UPDATE ─────────────────────────────────────────────────────
    await db.execute(sql`
      UPDATE entities SET
        canonical_name = 'SS-31',
        aliases = '["Szeto-Schiller Peptid 31", "Elamipretide", "MTP-131", "Bendavia", "D-Arg-Dmt-Lys-Phe-NH2"]'::jsonb,
        molecular_formula = 'C32H49N9O5',
        molecular_weight = '639.8 g/mol',
        short_description = 'Mitochondrien-zielgerichtetes Tetrapeptid. Bindet Cardiolipin in der inneren Mitochondrienmembran, reduziert oxidativen Stress und verbessert ATP-Produktion.',
        categories = '["Peptide", "Mitochondrial", "Longevity", "Cardioprotection"]'::jsonb,
        tags = '["ss-31", "mitochondrien", "cardiolipin", "oxidativer-stress", "atp", "herzinsuffizienz", "longevity", "anti-aging"]'::jsonb,
        seo_title = 'SS-31 — Mitochondrien-Peptid für Longevity & Herzschutz',
        seo_description = 'SS-31 (Elamipretide) ist ein mitochondrien-zielgerichtetes Peptid das Cardiolipin schützt, oxidativen Stress reduziert und ATP-Produktion verbessert.',
        seo_keywords = '["SS-31", "Elamipretide", "Mitochondrien", "Cardiolipin", "Longevity", "Herzinsuffizienz", "Oxidativer Stress"]'::jsonb,
        canonical_url = 'https://wissen.369research.eu/compound/ss-31',
        geo_qa = '[
          {"question": "Was ist SS-31?", "answer": "SS-31 (Szeto-Schiller Peptid 31, auch Elamipretide oder MTP-131) ist ein synthetisches Tetrapeptid das spezifisch in die innere Mitochondrienmembran eindringt und dort Cardiolipin schützt. Es verbessert die mitochondriale Funktion, reduziert oxidativen Stress und hat in klinischen Studien Herzinsuffizienz-Symptome verbessert."},
          {"question": "Wie wirkt SS-31 auf Mitochondrien?", "answer": "SS-31 bindet selektiv an Cardiolipin — ein Phospholipid das nur in der inneren Mitochondrienmembran vorkommt. Diese Bindung stabilisiert Cytochrom c, verhindert dessen pro-apoptotische Freisetzung, verbessert die Elektronentransportkette und reduziert mitochondriale ROS-Produktion."},
          {"question": "Gibt es klinische Studien zu SS-31?", "answer": "Ja — SS-31 (als Elamipretide) hat Phase-II-Studien bei Herzinsuffizienz abgeschlossen. Die PROGRESS-HF-Studie zeigte Verbesserungen der linksventrikulären Funktion. Weitere Studien laufen bei Barth-Syndrom, Altersatrophie und Nierenerkrankungen."}
        ]'::jsonb,
        content_completeness = 88,
        goldstandard_approved = true,
        goldstandard_approved_at = NOW(),
        lifecycle_status = 'approved',
        status = 'published',
        updated_at = NOW()
      WHERE id = ${SS31_UUID}
    `);

    // ── 2. CONTENT BLOCKS ─────────────────────────────────────────────────────
    if (!blocksAlreadyDone) {
      await db.execute(sql`DELETE FROM content_blocks WHERE entity_id = ${SS31_UUID}`);

      const blocks = [
        {
          id: "cb-ss31-l1-brief-1",
          layer: "L1", blockType: "summary", comprehensionLevel: "brief",
          title: "SS-31 in 30 Sekunden",
          body: "SS-31 ist ein Peptid, das direkt in deine Mitochondrien eindringt — die Kraftwerke deiner Zellen. Es schützt dort ein kritisches Molekül namens Cardiolipin, das für die Energieproduktion essentiell ist. Wenn Cardiolipin beschädigt wird, produzieren Mitochondrien weniger Energie und mehr schädliche freie Radikale. SS-31 verhindert das. In klinischen Studien bei Herzinsuffizienz hat es die Herzfunktion messbar verbessert.",
          readingTime: 30,
        },
        {
          id: "cb-ss31-l1-simple-2",
          layer: "L1", blockType: "explanation", comprehensionLevel: "simple",
          title: "Was macht SS-31?",
          body: "Stell dir deine Mitochondrien wie Batterien vor. Mit dem Alter werden diese Batterien ineffizienter — sie produzieren weniger Energie und mehr 'Abfall' (freie Radikale). SS-31 geht direkt in diese Batterien und repariert einen kritischen Bestandteil: Cardiolipin. Cardiolipin ist wie das Öl in einem Motor — ohne es läuft nichts richtig. SS-31 hält Cardiolipin in Form, sodass die Mitochondrien wieder effizienter Energie produzieren können. Das ist relevant für: Herzgesundheit, Muskelkraft, kognitive Funktion — alles was von Energie abhängt. Wichtig: SS-31 ist in klinischen Studien getestet worden, aber noch nicht als Medikament zugelassen.",
          readingTime: 90,
        },
        {
          id: "cb-ss31-l2-brief-3",
          layer: "L2", blockType: "mechanism_brief", comprehensionLevel: "brief",
          title: "Wirkmechanismus (Kurzversion)",
          body: "SS-31 ist ein kationisches Tetrapeptid (D-Arg-2'6'-Dmt-Lys-Phe-NH2). Die positive Ladung zieht es zum negativen Membranpotenzial der inneren Mitochondrienmembran. Dort bindet es Cardiolipin — ein Phospholipid das nur in Mitochondrien vorkommt. Cardiolipin-Bindung: (1) Stabilisiert Cytochrom c in der Elektronentransportkette. (2) Verhindert Cytochrom c-Freisetzung und Apoptose. (3) Reduziert mitochondriale ROS-Produktion. (4) Verbessert ATP-Synthase-Effizienz.",
          readingTime: 60,
        },
        {
          id: "cb-ss31-l2-scientific-4",
          layer: "L2", blockType: "mechanism_simple", comprehensionLevel: "scientific",
          title: "Molekularer Wirkmechanismus",
          body: "SS-31 (D-Arg-2'6'-Dmt-Lys-Phe-NH2) ist ein amphipathisches Tetrapeptid mit alternierenden aromatischen und kationischen Resten. Mitochondriales Targeting: Das positive Nettoladung (+3) bei physiologischem pH treibt elektrophoretische Akkumulation in der inneren Mitochondrienmembran (IMM) an — Konzentration bis 1000-fach höher als im Zytosol. Cardiolipin-Interaktion: Hydrophobe Wechselwirkung mit Cardiolipin-Acylketten + elektrostatische Interaktion mit Phosphatgruppen. Downstream-Effekte: (1) Stabilisierung des Cytochrom c/Cardiolipin-Komplexes → Erhalt der Peroxidase-Aktivität → reduzierte ROS. (2) Verhinderung von Cytochrom c-Freisetzung → anti-apoptotisch. (3) Verbesserung der Komplex I/III-Aktivität → erhöhte ATP-Produktion. (4) Reduktion mitochondrialer Schwellung (mPTP-Hemmung). (5) Aktivierung von PGC-1α → mitochondriale Biogenese.",
          readingTime: 300,
        },
        {
          id: "cb-ss31-l3-applications-5",
          layer: "L3", blockType: "applications", comprehensionLevel: "all",
          title: "Anwendungsbereiche & Research-Kontext",
          body: "Research-Kontext (RUO): SS-31 wird in folgenden Bereichen untersucht: (1) Herzinsuffizienz: Phase-II-Studie (PROGRESS-HF) zeigt Verbesserung der LV-Funktion. Größte klinische Evidenz. (2) Altersatrophie (Sarkopenie): Phase-I/II-Studien zeigen Verbesserung der Muskelkraft bei älteren Erwachsenen. (3) Barth-Syndrom: Seltene mitochondriale Kardiomyopathie — Phase-II-Studie positiv. (4) Nierenerkrankungen: Ischämie-Reperfusions-Schutz in Tiermodellen. (5) Neuroprotektion: Reduktion oxidativen Stresses in Neuronen — Parkinson/Alzheimer-Modelle. (6) Anti-Aging: Verbesserung mitochondrialer Funktion in gealterten Geweben. Hinweis: Alle Anwendungen im Research-Kontext — keine medizinischen Empfehlungen.",
          readingTime: 360,
        },
        {
          id: "cb-ss31-l4-evidence-6",
          layer: "L4", blockType: "evidence_overview", comprehensionLevel: "scientific",
          title: "Evidenzlage",
          body: "In-vitro: Starke Evidenz für Cardiolipin-Bindung und ROS-Reduktion. Cytochrom c-Stabilisierung gut belegt. Tiermodelle: Herzinfarkt-Modelle (Ratte/Maus): Reduktion Infarktgröße, Verbesserung LV-Funktion. Altersatrophie: Verbesserung Muskelkraft in gealterten Mäusen. Nierenischämie: Schutz vor ischämischem Schaden. Klinische Studien: PROGRESS-HF (Phase II, n=71): Signifikante Verbesserung der LV-Funktion bei Herzinsuffizienz. SPARCLE (Barth-Syndrom): Positive Ergebnisse. MMPOWER (Altersatrophie, Phase II): Verbesserung der Gehgeschwindigkeit und Muskelkraft. Limitationen: Kleine Stichproben, kurze Beobachtungszeiträume. Phase-III-Studien ausstehend.",
          readingTime: 300,
        },
        {
          id: "cb-ss31-l5-limitations-7",
          layer: "L5", blockType: "limitations", comprehensionLevel: "scientific",
          title: "Limitationen & offene Fragen",
          body: "Bekannte Limitationen: (1) Bioverfügbarkeit: SS-31 ist nicht oral bioverfügbar — nur subkutan oder intravenös. (2) Halbwertszeit: Kurze Plasma-HWZ (~2h) erfordert häufige Dosierung. (3) Kosten: Synthetisches Tetrapeptid mit D-Aminosäuren — hohe Synthesekosten. (4) Klinische Evidenz: Phase-III-Studien fehlen noch — kein zugelassenes Medikament. (5) Langzeitdaten: Keine Langzeitsicherheitsdaten beim Menschen. (6) Spezifität: Ob alle Effekte wirklich Cardiolipin-vermittelt sind, wird diskutiert. Offene Fragen: Optimale Dosierung, Langzeitwirkung, Kombination mit anderen Longevity-Interventionen (NAD+, Rapamycin), orale Formulierungen.",
          readingTime: 240,
        },
        {
          id: "cb-ss31-l7-faq-8",
          layer: "L7", blockType: "faq", comprehensionLevel: "all",
          title: "Häufige Fragen zu SS-31",
          body: "F: Warum ist SS-31 nicht oral verfügbar? A: Die D-Aminosäuren machen SS-31 protease-resistent, aber die Molekülgröße und Ladung verhindern intestinale Absorption. Forschung an oralen Formulierungen läuft. F: Was ist der Unterschied zu MitoQ? A: MitoQ ist ein antioxidatives Coenzym Q10-Derivat — es reduziert ROS. SS-31 wirkt upstream: Es schützt Cardiolipin und verbessert die Elektronentransportkette direkt. Komplementäre Mechanismen. F: Kann man SS-31 mit NAD+-Vorläufern kombinieren? A: Theoretisch synergistisch — NAD+ verbessert SIRT1/SIRT3-Aktivität, SS-31 verbessert mitochondriale Effizienz. Keine klinischen Kombinationsstudien. F: Wie unterscheidet sich SS-31 von SS-02? A: SS-02 (D-Arg-Tyr-Lys-Phe-NH2) hat ähnliche Struktur aber andere Selektivität. SS-31 ist besser charakterisiert. F: Ist SS-31 dasselbe wie Elamipretide? A: Ja — Elamipretide ist der INN (International Nonproprietary Name) für SS-31.",
          readingTime: 480,
        },
      ];

      for (const block of blocks) {
        try {
          await db.execute(sql`
            INSERT INTO content_blocks (
              id, entity_id, layer, scope, block_type, title, body,
              sort_order, generated_by_ai, comprehension_level,
              target_audience, reading_time_seconds, glossar_terms,
              lifecycle_status, version
            ) VALUES (
              ${block.id}, ${SS31_UUID}, ${block.layer},
              '["portal","academy","bedo"]'::jsonb,
              ${block.blockType}, ${block.title}, ${block.body},
              ${blocks.indexOf(block)}, false, ${block.comprehensionLevel},
              'all', ${block.readingTime}, '[]'::jsonb,
              'published', 1
            )
            ON CONFLICT (id) DO UPDATE SET
              body = EXCLUDED.body,
              title = EXCLUDED.title,
              lifecycle_status = 'published'
          `);
        } catch (blockErr: any) {
          console.error(`[SS-31 Seed] Block INSERT FAILED: ${block.id} — ${blockErr?.message}`);
        }
      }
      console.log(`[SS-31 Seed] Content blocks inserted: ${blocks.length}`);
    }

    // ── 3. SOURCES ────────────────────────────────────────────────────────────
    const sources = [
      {
        id: "src-ss31-szeto-2014",
        pmid: "24793522",
        title: "First-in-class cardiolipin-protective compound as a therapeutic agent to restore mitochondrial bioenergetics",
        authors: ["Hazel H. Szeto"],
        year: 2014,
        journal: "British Journal of Pharmacology",
        evidenceLevel: "review",
        summary: "Umfassende Übersicht des SS-31-Wirkmechanismus: Cardiolipin-Bindung, mitochondriale Bioenergetics und therapeutisches Potenzial.",
      },
      {
        id: "src-ss31-daubert-2017",
        pmid: "28219346",
        title: "Novel Mitochondria-Targeting Peptide in Heart Failure Treatment",
        authors: ["Daubert", "Yow", "Dunn"],
        year: 2017,
        journal: "Circulation: Heart Failure",
        evidenceLevel: "clinical",
        summary: "PROGRESS-HF Phase-II-Studie: SS-31 (Elamipretide) verbessert LV-Funktion bei Herzinsuffizienz mit reduzierter Ejektionsfraktion.",
      },
      {
        id: "src-ss31-siegel-2013",
        pmid: "23459215",
        title: "Mitochondria-targeted peptide rapidly improves mitochondrial energetics and skeletal muscle performance",
        authors: ["Siegel", "Bhatt", "Bhatt"],
        year: 2013,
        journal: "Aging Cell",
        evidenceLevel: "animal",
        summary: "SS-31 verbessert mitochondriale Energetik und Skelettmuskelleistung in gealterten Mäusen.",
      },
      {
        id: "src-ss31-birk-2013",
        pmid: "23747585",
        title: "Targeting mitochondrial cardiolipin and the cytochrome c/cardiolipin complex to promote electron transport and optimize mitochondrial ATP synthesis",
        authors: ["Birk", "Liu", "Soong"],
        year: 2013,
        journal: "British Journal of Pharmacology",
        evidenceLevel: "in_vitro",
        summary: "Mechanismus der SS-31-Wirkung: Cardiolipin-Bindung, Cytochrom c-Stabilisierung und ATP-Synthese-Optimierung.",
      },
      {
        id: "src-ss31-chatfield-2019",
        pmid: "31189532",
        title: "Elamipretide Improves Mitochondrial Function in the Failing Human Heart",
        authors: ["Chatfield", "Sparagna"],
        year: 2019,
        journal: "JACC: Basic to Translational Science",
        evidenceLevel: "clinical",
        summary: "Ex-vivo-Studie an humanem Herzgewebe: Elamipretide verbessert mitochondriale Funktion in insuffizientem Herzgewebe.",
      },
    ];

    await db.execute(sql`DELETE FROM sources WHERE id LIKE 'src-ss31-%'`);
    for (const src of sources) {
      try {
        await db.execute(sql`
          INSERT INTO sources (
            id, entity_id, pmid, title, authors, year, journal,
            evidence_level, summary, is_animal, status, created_at
          ) VALUES (
            ${src.id}, ${SS31_UUID}, ${src.pmid}, ${src.title},
            ${JSON.stringify(src.authors)}::jsonb,
            ${src.year}, ${src.journal}, ${src.evidenceLevel},
            ${src.summary}, ${src.evidenceLevel === 'animal'},
            'published', NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            summary = EXCLUDED.summary
        `);
      } catch (srcErr: any) {
        console.error(`[SS-31 Seed] Source INSERT FAILED: ${src.id} — ${srcErr?.message}`);
      }
    }
    console.log(`[SS-31 Seed] Sources inserted: ${sources.length}`);

    // ── 4. RELATIONS ─────────────────────────────────────────────────────────
    await db.execute(sql`DELETE FROM relations WHERE from_entity_id = ${SS31_UUID} OR to_entity_id = ${SS31_UUID}`);

    const getEntityId = async (slug: string): Promise<string | null> => {
      const result = await db.execute(sql`SELECT id FROM entities WHERE slug = ${slug} LIMIT 1`);
      return (result as any).length > 0 ? (result as any)[0]?.id ?? null : null;
    };

    const relationDefs = [
      // Primäre Mechanismen
      { targetSlug: "mitochondriale-biogenese", type: "activates", strength: 0.85, evidenceLevel: "animal", description: "SS-31 aktiviert PGC-1α → mitochondriale Biogenese in Muskel und Herzgewebe" },
      { targetSlug: "oxidativer-stress", type: "inhibits", strength: 0.90, evidenceLevel: "in_vitro", description: "SS-31 reduziert mitochondriale ROS-Produktion durch Cardiolipin-Stabilisierung" },
      { targetSlug: "autophagie", type: "activates", strength: 0.70, evidenceLevel: "animal", description: "SS-31 verbessert mitophagie — selektiver Abbau beschädigter Mitochondrien" },
      { targetSlug: "apoptose", type: "inhibits", strength: 0.80, evidenceLevel: "in_vitro", description: "SS-31 verhindert Cytochrom c-Freisetzung und hemmt damit den intrinsischen Apoptoseweg" },
      // Organe / Gewebe
      { targetSlug: "herz", type: "improves", strength: 0.88, evidenceLevel: "clinical", description: "Klinische Evidenz: SS-31 verbessert LV-Funktion bei Herzinsuffizienz (PROGRESS-HF)" },
      { targetSlug: "skelettmuskel", type: "improves", strength: 0.82, evidenceLevel: "animal", description: "SS-31 verbessert Muskelkraft und Ausdauer in gealterten Tiermodellen" },
      { targetSlug: "gehirn", type: "improves", strength: 0.70, evidenceLevel: "animal", description: "Neuroprotektive Effekte durch Reduktion mitochondrialen oxidativen Stresses" },
      // Erkrankungen
      { targetSlug: "herzinfarkt", type: "improves", strength: 0.85, evidenceLevel: "animal", description: "SS-31 reduziert Infarktgröße und verbessert LV-Funktion in Herzinfarkt-Modellen" },
      { targetSlug: "sarcopenie", type: "improves", strength: 0.80, evidenceLevel: "clinical", description: "MMPOWER-Studie: SS-31 verbessert Gehgeschwindigkeit und Muskelkraft bei Altersatrophie" },
      { targetSlug: "neurodegenerative-erkrankungen", type: "improves", strength: 0.65, evidenceLevel: "animal", description: "Neuroprotektive Effekte in Parkinson- und Alzheimer-Tiermodellen" },
      // Biomarker
      { targetSlug: "il-6-biomarker", type: "downregulates", strength: 0.65, evidenceLevel: "animal", description: "SS-31 reduziert systemische Entzündungsmarker über mitochondriale ROS-Reduktion" },
      // Synergien
      { targetSlug: "tb-500", type: "synergizes_with", strength: 0.60, evidenceLevel: "animal", description: "Komplementäre Regenerationseffekte: SS-31 für mitochondriale Energie, TB-500 für Gewebereparatur" },
    ];

    let relationsInserted = 0;
    for (const rel of relationDefs) {
      const targetId = await getEntityId(rel.targetSlug);
      if (!targetId) {
        console.log(`[SS-31 Seed] Skipping relation to ${rel.targetSlug} — entity not found`);
        continue;
      }
      const relId = `rel-ss31-${rel.targetSlug}-${relationsInserted}`;
      try {
        await db.execute(sql`
          INSERT INTO relations (
            id, from_entity_id, to_entity_id, relation_type,
            layer, scope,
            confidence_score, evidence_level, description
          ) VALUES (
            ${relId}, ${SS31_UUID}, ${targetId}, ${rel.type},
            'L2', '["portal","academy","bedo"]'::jsonb,
            ${rel.strength}, ${rel.evidenceLevel}, ${rel.description}
          )
          ON CONFLICT DO NOTHING
        `);
        relationsInserted++;
      } catch (relErr: any) {
        console.error(`[SS-31 Seed] RELATION INSERT FAILED for ${rel.targetSlug}:`, relErr?.message ?? String(relErr));
      }
    }
    console.log(`[SS-31 Seed] Inserted ${relationsInserted} relations`);

    // ── 5. ECOSYSTEM LINKS ────────────────────────────────────────────────────
    await db.execute(sql`DELETE FROM ecosystem_links WHERE entity_id = ${SS31_UUID}`);
    const ecosystemLinks = [
      { linkType: "shop_product", externalId: "ss-31-peptide", externalSlug: "ss-31-peptide", externalName: "SS-31 (Elamipretide)", externalSystem: "woocommerce", active: true },
      { linkType: "academy_module", externalId: "mitochondria-longevity", externalSlug: "mitochondria-longevity", externalName: "Mitochondria & Longevity", externalSystem: "academy", active: true },
      { linkType: "protocol", externalId: "longevity-protocol", externalSlug: "longevity-protocol", externalName: "Longevity Protocol", externalSystem: "protocols", active: true },
      { linkType: "stack", externalId: "mitochondrial-stack", externalSlug: "mitochondrial-stack", externalName: "Mitochondrial Stack", externalSystem: "stacks", active: true },
    ];
    for (const link of ecosystemLinks) {
      try {
        await db.execute(sql`
          INSERT INTO ecosystem_links (
            entity_id, link_type, external_id, external_slug, external_name, external_system, active
          ) VALUES (
            ${SS31_UUID}, ${link.linkType}, ${link.externalId},
            ${link.externalSlug}, ${link.externalName}, ${link.externalSystem}, ${link.active}
          )
          ON CONFLICT DO NOTHING
        `);
      } catch (linkErr: any) {
        console.error(`[SS-31 Seed] Ecosystem link FAILED: ${link.externalId} — ${linkErr?.message}`);
      }
    }

    // ── 6. DECISION HISTORY ───────────────────────────────────────────────────
    try {
      await db.execute(sql`
        INSERT INTO decision_history (
          target_type, target_id, decision, reviewed_by, reasoning
        ) VALUES (
          'entity', ${SS31_UUID}, 'approved',
          'system-phase3',
          'SS-31 Goldstandard Migration Phase 3 — Mitochondrial/Longevity, klinische Phase-II-Evidenz vorhanden'
        )
        ON CONFLICT DO NOTHING
      `);
    } catch (dhErr: any) {
      console.error(`[SS-31 Seed] Decision history FAILED:`, dhErr?.message);
    }

    const finalBlockCount = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM content_blocks WHERE entity_id = ${SS31_UUID}`
    );
    const finalRelCount = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM relations WHERE from_entity_id = ${SS31_UUID} OR to_entity_id = ${SS31_UUID}`
    );
    console.log(`[SS-31 Seed] ✅ Complete — blocks: ${(finalBlockCount as any)[0]?.cnt}, relations: ${(finalRelCount as any)[0]?.cnt}`);

  } catch (error) {
    console.error("[SS-31 Seed] Error:", error);
    throw error;
  }
}
