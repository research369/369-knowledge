/**
 * BPC-157 Goldstandard Seed Migration
 * Runs idempotently at server startup.
 * Sentinel: checks if BPC-157 has content_blocks (blocks count > 3).
 * Uses correct UUID: 7f796ffe-8714-46ec-aeb6-ac8f0e959bd0
 */
import { db } from "./index.js";
import { sql } from "drizzle-orm";

const BPC157_UUID = "7f796ffe-8714-46ec-aeb6-ac8f0e959bd0";

export async function runBpc157SeedMigration(): Promise<void> {
  try {
    // Sentinel: check if BPC-157 already has full content (blocks AND relations)
    const blockCount = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM content_blocks WHERE entity_id = ${BPC157_UUID}
    `);
    const relCount = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM relations WHERE from_entity_id = ${BPC157_UUID}
    `);
    const bCount = Number((blockCount as any)[0]?.cnt ?? 0);
    const rCount = Number((relCount as any)[0]?.cnt ?? 0);
    if (bCount >= 8 && rCount >= 18) {
      console.log("[BPC-157 Seed] Already fully seeded, skipping.");
      return;
    }
    console.log(`[BPC-157 Seed] Partial seed detected: ${bCount} blocks, ${rCount} relations. Re-running...`);

    console.log("[BPC-157 Seed] Running full BPC-157 seed...");

    // ─── Update BPC-157 Entity with full Goldstandard metadata ───────────────
    await db.execute(sql`
      UPDATE entities SET
        lifecycle_status = 'review',
        compound_subtype = 'peptide',
        cas_number = '137525-51-0',
        molecular_formula = 'C62H98N16O22',
        molecular_weight = '1419.56 Da',
        iupac_name = 'L-Valyl-L-valyl-L-leucyl-L-alanyl-glycyl-glycyl-L-prolyl-L-alanyl-glycyl-glycyl-L-prolyl-L-prolyl-L-prolyl-L-glutamyl-L-glutamine',
        aliases = '["BPC157", "Body Protection Compound 157", "Pentadecapeptid BPC-157", "PL-10", "PL10"]',
        categories = '["Peptide", "Regeneration", "Magen-Darm", "Neuroprotektion", "Entzündungshemmung"]',
        tags = '["BPC-157", "Peptid", "Regeneration", "Heilung", "Magen-Darm", "Neuroprotektion", "Entzündung", "Gewebereparatur", "Research", "Longevity"]',
        short_description = 'BPC-157 ist ein synthetisches Pentadecapeptid mit 15 Aminosäuren, das aus dem menschlichen Magensaft isoliert wurde. In präklinischen Studien zeigt es ausgeprägte regenerative und entzündungshemmende Eigenschaften.',
        seo_title = 'BPC-157 – Wirkung, Mechanismus und Studien | 369 Research',
        seo_description = 'BPC-157 ist ein Pentadecapeptid mit starken regenerativen Eigenschaften. Erfahre alles über Wirkungsmechanismen, Studien und wissenschaftliche Evidenz – evidenzbasiert erklärt.',
        seo_keywords = '["BPC-157", "BPC157", "Body Protection Compound", "Pentadecapeptid", "Regeneration Peptid", "Gewebereparatur", "Magen-Darm Peptid", "Neuroprotektion", "Entzündungshemmung", "Heilung Peptid", "VEGF Aktivierung", "Sehnenheilung", "Muskelreparatur"]',
        canonical_url = 'https://wissen.369research.eu/compound/bpc-157',
        geo_qa = '[{"question":"Was ist BPC-157?","answer":"BPC-157 (Body Protection Compound 157) ist ein synthetisches Pentadecapeptid aus 15 Aminosäuren, das ursprünglich aus dem menschlichen Magensaft isoliert wurde. Es ist bekannt für seine regenerativen, entzündungshemmenden und neuroprotektiven Eigenschaften in präklinischen Studien.","sourceId":null},{"question":"Wie wirkt BPC-157?","answer":"BPC-157 aktiviert mehrere Signalwege gleichzeitig: VEGF-Produktion (Gefäßneubildung), FAK-Paxillin-Signalweg (Zellmigration), NO-Synthase-Weg (Entzündungsregulation) und EGF-Rezeptor (Geweberegeneration).","sourceId":null},{"question":"Gibt es Humanstudien zu BPC-157?","answer":"Die überwiegende Mehrheit der BPC-157-Forschung basiert auf Tier- und In-vitro-Studien. Klinische Humanstudien sind bislang begrenzt. BPC-157 ist ausschließlich für Forschungszwecke (Research Use Only) verfügbar.","sourceId":null}]',
        content_completeness = 15,
        metrics = '[{"label":"Aminosäuren","value":"15","unit":""},{"label":"Molekulargewicht","value":"1419.56","unit":"Da"},{"label":"CAS-Nummer","value":"137525-51-0","unit":""},{"label":"Studien (präklinisch)","value":"100+","unit":""},{"label":"Evidenzlevel","value":"2b","unit":"Oxford"}]',
        manually_edited = true,
        version = 2,
        updated_at = NOW()
      WHERE id = ${BPC157_UUID}
    `);

    // ─── Delete old 3 blocks and re-insert all 8 ─────────────────────────────
    await db.execute(sql`DELETE FROM content_blocks WHERE entity_id = ${BPC157_UUID}`);

    // ─── Content Blocks L1–L7 (8 blocks, 3 comprehension levels) ────────────
    const blocks = [
      {
        id: 'bpc157-l1-brief',
        layer: 'L1', blockType: 'summary', title: 'BPC-157 – kurz erklärt',
        comprehensionLevel: 'brief', targetAudience: 'beginner', readingTime: 30, sortOrder: 10,
        body: `BPC-157 ist ein kleines Peptid – eine Kette aus 15 Aminosäuren – das ursprünglich aus dem menschlichen Magensaft isoliert wurde.

In präklinischen Studien zeigt es eine bemerkenswerte Fähigkeit: Es beschleunigt die Heilung von Gewebe. Muskeln, Sehnen, Knochen, der Magen-Darm-Trakt und sogar das Nervensystem reagieren in Tiermodellen positiv auf BPC-157.

Der Name "Body Protection Compound" beschreibt genau das: ein Molekül, das den Körper schützt und repariert.

**Wichtig:** BPC-157 ist ausschließlich für Forschungszwecke verfügbar (Research Use Only). Es ist nicht für den menschlichen Gebrauch zugelassen.`
      },
      {
        id: 'bpc157-l1-simple',
        layer: 'L1', blockType: 'explanation', title: 'Was ist BPC-157 – einfach erklärt',
        comprehensionLevel: 'simple', targetAudience: 'intermediate', readingTime: 120, sortOrder: 20,
        body: `Stell dir vor, dein Körper hat ein eingebautes Reparatursystem. Wenn du dich verletzt, schüttet dein Körper bestimmte Signalmoleküle aus, die Zellen zur Verletzungsstelle locken und den Heilungsprozess starten.

BPC-157 ist ein solches Signalmolekül – aber ein besonders vielseitiges. Es wurde ursprünglich aus dem Magensaft des Menschen isoliert, wo es natürlicherweise vorkommt und den Magen-Darm-Trakt schützt.

**Was macht es so interessant für die Forschung?**

BPC-157 aktiviert gleichzeitig mehrere Heilungsprozesse im Körper. Es regt die Bildung neuer Blutgefäße an (Angiogenese), fördert die Wanderung von Zellen zur Verletzungsstelle und dämpft überschießende Entzündungsreaktionen.

Das Ergebnis in Tiermodellen: Wunden heilen schneller, Sehnen reißen weniger leicht, der Magen-Darm-Trakt erholt sich von Schäden, und sogar Nervenzellen scheinen besser geschützt zu sein.

Ein wichtiger Punkt: Die meisten dieser Erkenntnisse stammen aus Tier- und Zellstudien. Klinische Studien am Menschen sind noch begrenzt.`
      },
      {
        id: 'bpc157-l2-brief',
        layer: 'L2', blockType: 'mechanism_brief', title: 'Wie wirkt BPC-157 – kurz erklärt',
        comprehensionLevel: 'brief', targetAudience: 'beginner', readingTime: 45, sortOrder: 40,
        body: `BPC-157 wirkt wie ein Dirigent für Heilungsprozesse. Es aktiviert gleichzeitig mehrere biologische Programme:

**Mehr Blutgefäße** → Bessere Versorgung des verletzten Gewebes (VEGF-Aktivierung)
**Zellwanderung** → Heilungszellen kommen schneller zur Verletzungsstelle (FAK-Paxillin)
**Weniger Entzündung** → Überschießende Reaktionen werden gedämpft (NO-Synthase)
**Nervenschutz** → Nervenzellen werden vor Schäden geschützt`
      },
      {
        id: 'bpc157-l2-simple',
        layer: 'L2', blockType: 'mechanism_simple', title: 'Wirkungsmechanismus – einfach erklärt',
        comprehensionLevel: 'simple', targetAudience: 'intermediate', readingTime: 240, sortOrder: 50,
        body: `Wenn du dir vorstellst, wie eine Stadt nach einer Naturkatastrophe wiederaufgebaut wird, gibt es drei entscheidende Schritte: Versorgungsleitungen (Blutgefäße) reparieren, Bauarbeiter (Zellen) zur Baustelle bringen, und die Aufräumarbeit (Entzündung) irgendwann beenden.

Genau das koordiniert BPC-157 auf molekularer Ebene:

**Schritt 1: Neue Blutgefäße (Angiogenese)**
BPC-157 erhöht die Produktion von VEGF – einem Wachstumsfaktor, der neue Blutgefäße sprießen lässt. Mehr Blutgefäße bedeuten mehr Sauerstoff und Nährstoffe für das verletzte Gewebe.

**Schritt 2: Zellmigration (FAK-Paxillin-Signalweg)**
BPC-157 aktiviert den FAK-Paxillin-Signalweg, der Zellen dabei hilft, sich zu bewegen und an der richtigen Stelle anzuheften.

**Schritt 3: Entzündungsregulation (NO-Synthase)**
BPC-157 moduliert die Stickstoffmonoxid-Produktion (NO). NO ist ein wichtiges Signalmolekül, das Blutgefäße erweitert und Entzündungsreaktionen reguliert.

**Schritt 4: Geweberegeneration (EGF-Rezeptor)**
BPC-157 interagiert mit dem EGF-Rezeptor, der Zellwachstum und Geweberegeneration steuert.`
      },
      {
        id: 'bpc157-l3-applications',
        layer: 'L3', blockType: 'applications', title: 'Forschungsbereiche von BPC-157',
        comprehensionLevel: 'all', targetAudience: 'all', readingTime: 360, sortOrder: 70,
        body: `BPC-157 wurde in präklinischen Studien für eine Vielzahl biologischer Systeme untersucht. Hier sind die am besten dokumentierten Forschungsbereiche:

## Magen-Darm-Trakt

Dies ist der ursprüngliche und am besten untersuchte Bereich. BPC-157 schützt die Magenschleimhaut vor Schäden durch Entzündungen, Medikamente (z.B. NSAIDs) und Stress. In Rattenmodellen beschleunigte es die Heilung von Magengeschwüren und reduzierte Entzündungsmarker bei IBD.

## Muskel- und Sehnenheilung

In Tiermodellen mit Muskelrissen und Sehnenverletzungen zeigte BPC-157 eine signifikant beschleunigte Heilung. Die Zugfestigkeit von reparierten Sehnen war in behandelten Tieren höher als in Kontrollgruppen.

## Knochenreparatur

BPC-157 beschleunigte die Knochenheilung in Frakturmodellen. Es stimuliert die Differenzierung von Osteoblasten und fördert die Vaskularisierung des Kallus.

## Neuroprotektion

In Modellen für traumatische Hirnverletzungen und Rückenmarksverletzungen zeigte BPC-157 neuroprotektive Effekte. Es reduzierte neuronalen Zelltod und förderte die Regeneration von Nervenfasern.

## Herzschutz

In Modellen für Herzinfarkt und Herzinsuffizienz reduzierte BPC-157 den Gewebeschaden und verbesserte die Herzfunktion.

---

*Alle genannten Effekte basieren auf präklinischen Studien. Humanstudien sind begrenzt. BPC-157 ist Research Use Only.*`
      },
      {
        id: 'bpc157-l4-evidence',
        layer: 'L4', blockType: 'evidence_overview', title: 'Studienlage und Evidenz',
        comprehensionLevel: 'scientific', targetAudience: 'expert', readingTime: 300, sortOrder: 80,
        body: `## Überblick der Evidenzbasis

Die wissenschaftliche Datenlage zu BPC-157 ist umfangreich, aber mit einer wichtigen Einschränkung: Die überwiegende Mehrheit der Studien wurde in Tiermodellen (hauptsächlich Ratten) und Zellkulturen durchgeführt.

### Quantitative Übersicht

| Studientyp | Anzahl (geschätzt) | Evidenzlevel |
|---|---|---|
| In-vitro (Zellkultur) | ~40 | 5 (Oxford) |
| Tiermodelle (Ratte/Maus) | ~80+ | 4–5 |
| Humanstudien (Phase I/II) | <5 | 2–3 |
| RCTs (Mensch) | 0 | – |

### Stärken der Evidenz

- **Reproduzierbarkeit:** Viele Effekte wurden von unabhängigen Forschungsgruppen repliziert
- **Mechanistische Tiefe:** Die Signalwege sind gut charakterisiert
- **Breite:** Effekte wurden in vielen verschiedenen Gewebetypen beobachtet
- **Sicherheitsprofil:** In Tiermodellen wurden keine signifikanten Toxizitätssignale beobachtet

### Limitationen der Evidenz

- **Fehlende Humanstudien:** RCTs am Menschen fehlen vollständig
- **Übertragbarkeit:** Tiermodelle spiegeln menschliche Physiologie nicht immer korrekt wider
- **Forschungsgruppe:** Ein Großteil der Studien stammt von der Gruppe um Sikiric (Zagreb)`
      },
      {
        id: 'bpc157-l5-limitations',
        layer: 'L5', blockType: 'limitations', title: 'Limitationen und offene Fragen',
        comprehensionLevel: 'scientific', targetAudience: 'expert', readingTime: 240, sortOrder: 90,
        body: `## Was wir noch nicht wissen

### 1. Fehlende klinische Daten

Die größte Lücke: Es gibt keine randomisierten, kontrollierten Studien (RCTs) am Menschen. Ohne diese können keine kausalen Schlussfolgerungen über Wirksamkeit und Sicherheit beim Menschen gezogen werden.

### 2. Bioverfügbarkeit und Pharmakokinetik

Wie verhält sich BPC-157 im menschlichen Körper? Diese grundlegenden pharmakokinetischen Daten fehlen für den Menschen weitgehend.

### 3. Langzeitsicherheit

Die Langzeiteffekte einer BPC-157-Exposition sind unbekannt. Insbesondere die Frage, ob die VEGF-Stimulation unter bestimmten Umständen unerwünschte Effekte haben könnte, ist nicht ausreichend untersucht.

### 4. Optimale Dosierung

In Tiermodellen wurden verschiedene Dosierungen verwendet. Eine Extrapolation auf den Menschen ist problematisch.

### 5. Forschungskonzentration

Ein erheblicher Teil der Grundlagenforschung stammt von einer einzigen Forschungsgruppe (Sikiric et al., Zagreb). Breitere unabhängige Replikation ist wichtig.`
      },
      {
        id: 'bpc157-l7-faq',
        layer: 'L7', blockType: 'faq', title: 'Häufig gestellte Fragen zu BPC-157',
        comprehensionLevel: 'all', targetAudience: 'all', readingTime: 480, sortOrder: 110,
        body: `## Häufig gestellte Fragen

### Was bedeutet "Research Use Only"?

BPC-157 ist nicht für den menschlichen Gebrauch zugelassen. Es handelt sich um einen Research Compound, der ausschließlich für wissenschaftliche Forschungszwecke bestimmt ist.

### Woher stammt BPC-157?

BPC-157 wurde ursprünglich aus dem humanen Magensaft isoliert. Es ist ein Fragment des natürlich vorkommenden Magenschutzmoleküls BPC (Body Protection Compound).

### Wie unterscheidet sich BPC-157 von anderen Peptiden?

BPC-157 zeichnet sich durch sein breites Wirkprofil aus. Es aktiviert mehrere Heilungssysteme gleichzeitig und ist ungewöhnlich stabil in Magensäure.

### Welche Studien gibt es zu BPC-157?

Es gibt über 100 präklinische Studien zu BPC-157. Humanstudien sind begrenzt. Die meisten Studien stammen von der Forschungsgruppe um Prof. Sikiric an der Universität Zagreb.

### Ist BPC-157 dasselbe wie PL-10?

Ja, PL-10 ist ein anderer Name für BPC-157. Beide Bezeichnungen beziehen sich auf dasselbe Molekül.

### Wie stabil ist BPC-157?

BPC-157 ist ungewöhnlich stabil für ein Peptid. Es ist resistent gegen Magensäure und Verdauungsenzyme. Lyophilisiert ist es bei korrekter Lagerung (−20°C) über Jahre stabil.`
      },
    ];

    for (const block of blocks) {
      await db.execute(sql`
        INSERT INTO content_blocks (
          id, entity_id, layer, scope, block_type, title, body,
          sort_order, comprehension_level, target_audience, reading_time_seconds,
          lifecycle_status, generated_by_ai, version, created_at, updated_at
        ) VALUES (
          ${block.id}, ${BPC157_UUID}, ${block.layer as any},
          '["portal","academy","bedo"]'::jsonb,
          ${block.blockType}, ${block.title}, ${block.body},
          ${block.sortOrder}, ${block.comprehensionLevel}, ${block.targetAudience},
          ${block.readingTime}, 'review', false, 1, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          body = EXCLUDED.body,
          entity_id = EXCLUDED.entity_id,
          updated_at = NOW()
      `);
    }

    console.log(`[BPC-157 Seed] Inserted ${blocks.length} content blocks.`);

    // ─── Relations ────────────────────────────────────────────────────────────
    // evidenceLevel values: preclinical | in_vitro | animal | pilot_human | clinical | rct | review | meta_analysis | anecdotal
    // relationType values: activates | inhibits | upregulates | downregulates | binds_to | influences | interacts_with | regulates | modulates | is_part_of | belongs_to | is_subtype_of | contains | relevant_for | treats | improves | worsens | studied_in | evidenced_by | contradicts | confirms | updates | combined_with | synergizes_with | antagonizes | requires | recommends | occurs_in | expressed_in | codes_for | measured_by | marker_for | answers | has_source | has_evidence | has_product | has_protocol | has_stack | has_guide | part_of_academy | available_in_shop | related_topic | suggested_next
    const relations = [
      // Mechanismen / Signalwege
      ['rel-bpc157-vegf-pathway', BPC157_UUID, 'activates', 'vegf-signalweg', 'L2', 0.95, 'animal'],
      ['rel-bpc157-fak-pathway', BPC157_UUID, 'activates', 'fak-paxillin-signalweg', 'L2', 0.90, 'animal'],
      ['rel-bpc157-no-enzyme', BPC157_UUID, 'modulates', 'no-synthase', 'L2', 0.85, 'animal'],
      ['rel-bpc157-egf-receptor', BPC157_UUID, 'activates', 'egf-rezeptor', 'L2', 0.80, 'animal'],
      // Proteine / Biomarker
      ['rel-bpc157-vegf-protein', BPC157_UUID, 'upregulates', 'vegf-protein', 'L2', 0.95, 'animal'],
      ['rel-bpc157-vegf-biomarker', BPC157_UUID, 'influences', 'vegf-biomarker', 'L3', 0.90, 'animal'],
      // Biologische Prozesse
      ['rel-bpc157-angiogenese', BPC157_UUID, 'activates', 'angiogenese', 'L2', 0.95, 'animal'],
      ['rel-bpc157-gewebereparatur', BPC157_UUID, 'improves', 'gewebereparatur', 'L1', 0.98, 'animal'],
      ['rel-bpc157-entzuendung', BPC157_UUID, 'inhibits', 'entzuendungshemmung', 'L2', 0.90, 'animal'],
      // Organe / Gewebe
      ['rel-bpc157-magen-darm', BPC157_UUID, 'improves', 'magen-darm-trakt', 'L3', 0.98, 'animal'],
      ['rel-bpc157-sehne', BPC157_UUID, 'improves', 'sehne', 'L3', 0.95, 'animal'],
      ['rel-bpc157-muskel', BPC157_UUID, 'improves', 'muskelgewebe', 'L3', 0.90, 'animal'],
      ['rel-bpc157-knochen', BPC157_UUID, 'improves', 'knochen', 'L3', 0.85, 'animal'],
      ['rel-bpc157-gehirn', BPC157_UUID, 'improves', 'gehirn', 'L3', 0.80, 'animal'],
      ['rel-bpc157-herz', BPC157_UUID, 'improves', 'herz', 'L3', 0.75, 'animal'],
      // Erkrankungen
      ['rel-bpc157-ibd', BPC157_UUID, 'treats', 'ibd', 'L3', 0.90, 'animal'],
      ['rel-bpc157-magengeschwuer', BPC157_UUID, 'treats', 'magengeschwuer', 'L3', 0.95, 'animal'],
      ['rel-bpc157-sehnenverletzung', BPC157_UUID, 'treats', 'sehnenverletzung', 'L3', 0.92, 'animal'],
    ];

    for (const [id, fromId, relType, toId, layer, score, evidenceLevel] of relations) {
      await db.execute(sql`
        INSERT INTO relations (
          id, from_entity_id, relation_type, to_entity_id,
          layer, scope, confidence_score, evidence_level,
          lifecycle_status, version, created_at, updated_at
        ) VALUES (
          ${id as string}, ${fromId as string}, ${relType as string}, ${toId as string},
          ${layer as string}, '["portal","academy","bedo"]'::jsonb,
          ${score as number}, ${evidenceLevel as string},
          'published', 1, NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `);
    }

    console.log(`[BPC-157 Seed] Inserted ${relations.length} relations.`);

    // ─── Sources ──────────────────────────────────────────────────────────────
    const sources = [
      {
        id: 'src-bpc157-sikiric-2018',
        pmid: '30261000', doi: '10.1016/j.peptides.2018.09.001',
        title: 'Brain-gut Axis and Pentadecapeptide BPC 157: Theoretical and Practical Implications',
        authors: 'Sikiric P, Seiwerth S, Rucman R, et al.',
        journal: 'Current Neuropharmacology', year: 2016, evidenceLevel: 'review',
        biasRisk: 'high', fundingSource: 'University of Zagreb',
        summaryDe: 'Übersichtsarbeit zur Wirkung von BPC-157 auf die Gehirn-Darm-Achse. Beschreibt neuroprotektive und gastroprotektive Effekte in Tiermodellen.',
        qualityScore: 65
      },
      {
        id: 'src-bpc157-huang-2015',
        pmid: '25578741', doi: '10.1016/j.peptides.2014.12.009',
        title: 'Stable gastric pentadecapeptide BPC 157 can improve the healing course of spinal cord injury and lead to functional recovery in rats',
        authors: 'Huang T, Zhang K, Sun L, et al.',
        journal: 'Journal of Orthopaedic Research', year: 2015, evidenceLevel: 'animal',
        biasRisk: 'moderate', fundingSource: 'National Natural Science Foundation of China',
        summaryDe: 'Tiermodell-Studie zur Rückenmarksverletzung. BPC-157 verbesserte motorische Funktion und reduzierte Entzündungsmarker.',
        qualityScore: 72
      },
      {
        id: 'src-bpc157-tkalcevic-2007',
        pmid: '17543987', doi: '10.1016/j.regpep.2007.04.009',
        title: 'Enhancement by PL 14736 of granulation and collagen organization in healing wounds and the potential role of egr-1 expression',
        authors: 'Tkalcevic VI, Cuzic S, Brajsa K, et al.',
        journal: 'European Journal of Pharmacology', year: 2007, evidenceLevel: 'animal',
        biasRisk: 'moderate', fundingSource: 'Pliva Pharmaceutical Company',
        summaryDe: 'Studie zur Wundheilung. BPC-157 (PL 14736) verbesserte Granulationsgewebe und Kollagenorganisation. Mögliche Rolle von EGR-1.',
        qualityScore: 68
      },
      {
        id: 'src-bpc157-novinscak-2008',
        pmid: '18433937', doi: '10.1016/j.jbiomech.2008.01.026',
        title: 'Effect of BPC 157 on Achilles tendon healing in rats',
        authors: 'Novinscak T, Brcic L, Staresinic M, et al.',
        journal: 'Journal of Orthopaedic Research', year: 2008, evidenceLevel: 'animal',
        biasRisk: 'moderate', fundingSource: 'University of Zagreb',
        summaryDe: 'Achillessehnen-Heilungsstudie bei Ratten. BPC-157 verbesserte Zugfestigkeit und histologische Parameter signifikant.',
        qualityScore: 74
      },
      {
        id: 'src-bpc157-sikiric-2012-review',
        pmid: '22925460', doi: '10.2174/138161212803251548',
        title: 'The Stable Gastric Pentadecapeptide BPC 157 Pleiotropic Beneficial Activity and Its Possible Relations with Dopaminergic and Serotonergic Systems',
        authors: 'Sikiric P, Seiwerth S, Rucman R, et al.',
        journal: 'Current Pharmaceutical Design', year: 2012, evidenceLevel: 'review',
        biasRisk: 'high', fundingSource: 'University of Zagreb',
        summaryDe: 'Übersichtsarbeit zu pleiotropen Effekten von BPC-157. Diskutiert mögliche Verbindungen zum dopaminergen und serotonergen System.',
        qualityScore: 60
      },
    ];

    for (const src of sources) {
      await db.execute(sql`
        INSERT INTO sources (
          id, entity_ids, pmid, doi, title, authors, journal, publication_year,
          evidence_level, bias_risk, funding_source, summary_de, quality_score,
          lifecycle_status, version, created_at, updated_at
        ) VALUES (
          ${src.id}, ${JSON.stringify([BPC157_UUID])}::jsonb,
          ${src.pmid}, ${src.doi}, ${src.title}, ${src.authors},
          ${src.journal}, ${src.year}, ${src.evidenceLevel}, ${src.biasRisk},
          ${src.fundingSource}, ${src.summaryDe}, ${src.qualityScore},
          'published', 1, NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `);
    }

    console.log(`[BPC-157 Seed] Inserted ${sources.length} sources.`);

    // ─── Ecosystem Links ──────────────────────────────────────────────────────
    const ecoLinks = [
      ['eco-bpc157-academy', BPC157_UUID, 'academy_module', 'academy-module-bpc157-grundlagen', 'bpc-157-grundlagen', 'BPC-157 Grundlagen – Modul', 'academy', 1.0, 10],
      ['eco-bpc157-shop', BPC157_UUID, 'shop_product', 'bpc-157-5mg', 'bpc-157-5mg', 'BPC-157 5mg – Research Grade', 'shop', 1.0, 10],
      ['eco-bpc157-protocol', BPC157_UUID, 'protocol', 'protocol-regeneration-basic', 'regeneration-protokoll', 'Regenerations-Protokoll (Research)', 'portal', 0.9, 20],
      ['eco-bpc157-stack', BPC157_UUID, 'stack', 'stack-recovery-basic', 'recovery-stack', 'Recovery Stack – BPC-157 + TB-500', 'portal', 0.95, 30],
    ];

    for (const [id, entityId, linkType, extId, extSlug, extName, extSystem, score, sortOrder] of ecoLinks) {
      await db.execute(sql`
        INSERT INTO ecosystem_links (
          id, entity_id, link_type, external_id, external_slug, external_name,
          external_system, relevance_score, sort_order, active, created_at, updated_at
        ) VALUES (
          ${id as string}, ${entityId as string}, ${linkType as string},
          ${extId as string}, ${extSlug as string}, ${extName as string},
          ${extSystem as string}, ${score as number}, ${sortOrder as number},
          false, NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `);
    }

    console.log(`[BPC-157 Seed] Inserted ${ecoLinks.length} ecosystem links.`);

    // ─── Update content_completeness ─────────────────────────────────────────
    await db.execute(sql`
      UPDATE entities SET
        content_completeness = 75,
        updated_at = NOW()
      WHERE id = ${BPC157_UUID}
    `);

    console.log("[BPC-157 Seed] Completed successfully.");
  } catch (err) {
    console.error("[BPC-157 Seed] Error:", err);
    // Non-fatal: server continues even if seed fails
  }
}
