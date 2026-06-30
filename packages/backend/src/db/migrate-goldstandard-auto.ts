/**
 * Goldstandard Auto-Migration
 * Runs idempotently at server startup after Phase 2b migration.
 * Sentinel: checks for 'canonical_url' column on entities table.
 * Also seeds BPC-157 Goldstandard data.
 */
import { db } from "./index.js";
import { sql } from "drizzle-orm";

export async function runGoldstandardMigration(): Promise<void> {
  try {
    // Sentinel: check if already migrated
    const check = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'entities' AND column_name = 'canonical_url'
      LIMIT 1
    `);

    if ((check as unknown as unknown[]).length > 0) {
      console.log("[Goldstandard Migration] Already migrated, skipping.");
      return;
    }

    console.log("[Goldstandard Migration] Running for the first time...");

    // ─── entities: Goldstandard fields ────────────────────────────────────────
    await db.execute(sql`
      ALTER TABLE entities
        ADD COLUMN IF NOT EXISTS canonical_url TEXT,
        ADD COLUMN IF NOT EXISTS geo_qa JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS json_ld JSONB,
        ADD COLUMN IF NOT EXISTS schema_org JSONB,
        ADD COLUMN IF NOT EXISTS content_completeness INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS goldstandard_approved BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS goldstandard_approved_at TIMESTAMP
    `);

    // ─── content_blocks: Verständlichkeitsebenen ──────────────────────────────
    await db.execute(sql`
      ALTER TABLE content_blocks
        ADD COLUMN IF NOT EXISTS comprehension_level VARCHAR(50) NOT NULL DEFAULT 'all',
        ADD COLUMN IF NOT EXISTS target_audience VARCHAR(50) NOT NULL DEFAULT 'all',
        ADD COLUMN IF NOT EXISTS reading_time_seconds INTEGER,
        ADD COLUMN IF NOT EXISTS glossar_terms JSONB NOT NULL DEFAULT '[]'
    `);

    // ─── ecosystem_links: new table ───────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ecosystem_links (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
        link_type VARCHAR(100) NOT NULL,
        external_id TEXT NOT NULL,
        external_slug TEXT,
        external_name TEXT,
        external_system VARCHAR(100) NOT NULL DEFAULT '369research',
        relevance_score REAL NOT NULL DEFAULT 1.0,
        notes TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`CREATE INDEX IF NOT EXISTS ecosystem_links_entity_idx ON ecosystem_links(entity_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ecosystem_links_type_idx ON ecosystem_links(link_type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ecosystem_links_system_idx ON ecosystem_links(external_system)`);

    // ─── relations: add missing columns if needed ─────────────────────────────
    await db.execute(sql`
      ALTER TABLE relations
        ADD COLUMN IF NOT EXISTS source_ids JSONB NOT NULL DEFAULT '[]'
    `);

    console.log("[Goldstandard Migration] Schema migration completed.");

    // ─── Seed: BPC-157 Entity update ──────────────────────────────────────────
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
        status = 'published',
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
      WHERE id = 'bpc-157'
    `);

    // ─── Seed: Neue Entities für Relationen ───────────────────────────────────
    const newEntities = [
      ['vegf-signalweg', 'pathway', 'VEGF-Signalweg', 'Vascular Endothelial Growth Factor Signalweg – reguliert Angiogenese und Gefäßneubildung'],
      ['fak-paxillin-signalweg', 'pathway', 'FAK-Paxillin-Signalweg', 'Focal Adhesion Kinase / Paxillin Signalweg – reguliert Zellmigration und -adhäsion'],
      ['no-synthase', 'enzyme', 'NO-Synthase (NOS)', 'Stickstoffmonoxid-Synthase – Enzym, das NO aus L-Arginin synthetisiert'],
      ['egf-rezeptor', 'receptor', 'EGF-Rezeptor (EGFR)', 'Epidermal Growth Factor Receptor – Tyrosinkinase-Rezeptor'],
      ['vegf-protein', 'protein', 'VEGF (Vascular Endothelial Growth Factor)', 'Wachstumsfaktor für Blutgefäßneubildung'],
      ['angiogenese', 'biological_process', 'Angiogenese', 'Biologischer Prozess der Neubildung von Blutgefäßen'],
      ['gewebereparatur', 'biological_process', 'Gewebereparatur', 'Biologischer Prozess der Wiederherstellung von beschädigtem Gewebe'],
      ['entzuendungshemmung', 'biological_process', 'Entzündungshemmung (Antiinflammation)', 'Biologischer Prozess der Dämpfung von Entzündungsreaktionen'],
      ['magen-darm-trakt', 'organ', 'Magen-Darm-Trakt', 'Verdauungssystem bestehend aus Magen, Dünndarm und Dickdarm'],
      ['sehne', 'tissue', 'Sehne', 'Bindegewebsstruktur, die Muskeln mit Knochen verbindet'],
      ['muskelgewebe', 'tissue', 'Muskelgewebe', 'Kontraktiles Gewebe, das Bewegung ermöglicht'],
      ['knochen', 'organ', 'Knochen', 'Hartes Stützgewebe des Skeletts'],
      ['gehirn', 'organ', 'Gehirn', 'Zentrales Organ des Nervensystems'],
      ['herz', 'organ', 'Herz', 'Pumporgan des Kreislaufsystems'],
      ['ibd', 'disease', 'Entzündliche Darmerkrankung (IBD)', 'Chronische Entzündungserkrankung des Magen-Darm-Trakts'],
      ['magengeschwuer', 'disease', 'Magengeschwür (Ulcus ventriculi)', 'Schleimhautdefekt im Magen'],
      ['sehnenverletzung', 'disease', 'Sehnenverletzung', 'Riss oder Überdehnung von Sehnengewebe'],
      ['vegf-biomarker', 'biomarker', 'VEGF (Biomarker)', 'VEGF als Biomarker für Angiogenese und Gewebeheilung'],
    ];

    for (const [id, type, name, desc] of newEntities) {
      await db.execute(sql`
        INSERT INTO entities (id, slug, type, canonical_name, language, short_description, status, lifecycle_status, version, created_at, updated_at)
        VALUES (${id}, ${id}, ${type as any}, ${name}, 'de', ${desc}, 'published', 'published', 1, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `);
    }

    // ─── Seed: Content Blocks L1–L7 ───────────────────────────────────────────
    const blocks = [
      {
        id: 'bpc157-l1-brief', layer: 'L1', blockType: 'summary', title: 'BPC-157 – kurz erklärt',
        comprehensionLevel: 'brief', targetAudience: 'beginner', readingTime: 30, sortOrder: 10,
        body: `BPC-157 ist ein kleines Peptid – eine Kette aus 15 Aminosäuren – das ursprünglich aus dem menschlichen Magensaft isoliert wurde.

In präklinischen Studien zeigt es eine bemerkenswerte Fähigkeit: Es beschleunigt die Heilung von Gewebe. Muskeln, Sehnen, Knochen, der Magen-Darm-Trakt und sogar das Nervensystem reagieren in Tiermodellen positiv auf BPC-157.

Der Name "Body Protection Compound" beschreibt genau das: ein Molekül, das den Körper schützt und repariert.

**Wichtig:** BPC-157 ist ausschließlich für Forschungszwecke verfügbar (Research Use Only). Es ist nicht für den menschlichen Gebrauch zugelassen.`
      },
      {
        id: 'bpc157-l1-simple', layer: 'L1', blockType: 'explanation', title: 'Was ist BPC-157 – einfach erklärt',
        comprehensionLevel: 'simple', targetAudience: 'intermediate', readingTime: 120, sortOrder: 20,
        body: `Stell dir vor, dein Körper hat ein eingebautes Reparatursystem. Wenn du dich verletzt, schüttet dein Körper bestimmte Signalmoleküle aus, die Zellen zur Verletzungsstelle locken und den Heilungsprozess starten.

BPC-157 ist ein solches Signalmolekül – aber ein besonders vielseitiges. Es wurde ursprünglich aus dem Magensaft des Menschen isoliert, wo es natürlicherweise vorkommt und den Magen-Darm-Trakt schützt.

**Was macht es so interessant für die Forschung?**

BPC-157 aktiviert gleichzeitig mehrere Heilungsprozesse im Körper. Es regt die Bildung neuer Blutgefäße an (Angiogenese), fördert die Wanderung von Zellen zur Verletzungsstelle und dämpft überschießende Entzündungsreaktionen.

Das Ergebnis in Tiermodellen: Wunden heilen schneller, Sehnen reißen weniger leicht, der Magen-Darm-Trakt erholt sich von Schäden, und sogar Nervenzellen scheinen besser geschützt zu sein.

Ein wichtiger Punkt: Die meisten dieser Erkenntnisse stammen aus Tier- und Zellstudien. Klinische Studien am Menschen sind noch begrenzt.`
      },
      {
        id: 'bpc157-l2-brief', layer: 'L2', blockType: 'mechanism_brief', title: 'Wie wirkt BPC-157 – kurz erklärt',
        comprehensionLevel: 'brief', targetAudience: 'beginner', readingTime: 45, sortOrder: 40,
        body: `BPC-157 wirkt wie ein Dirigent für Heilungsprozesse. Es aktiviert gleichzeitig mehrere biologische Programme:

**Mehr Blutgefäße** → Bessere Versorgung des verletzten Gewebes (VEGF-Aktivierung)
**Zellwanderung** → Heilungszellen kommen schneller zur Verletzungsstelle (FAK-Paxillin)
**Weniger Entzündung** → Überschießende Reaktionen werden gedämpft (NO-Synthase)
**Nervenschutz** → Nervenzellen werden vor Schäden geschützt`
      },
      {
        id: 'bpc157-l2-simple', layer: 'L2', blockType: 'mechanism_simple', title: 'Wirkungsmechanismus – einfach erklärt',
        comprehensionLevel: 'simple', targetAudience: 'intermediate', readingTime: 240, sortOrder: 50,
        body: `Wenn du dir vorstellst, wie eine Stadt nach einer Naturkatastrophe wiederaufgebaut wird, gibt es drei entscheidende Schritte: Versorgungsleitungen (Blutgefäße) reparieren, Bauarbeiter (Zellen) zur Baustelle bringen, und die Aufräumarbeit (Entzündung) irgendwann beenden.

Genau das koordiniert BPC-157 auf molekularer Ebene:

**Schritt 1: Neue Blutgefäße (Angiogenese)**
BPC-157 erhöht die Produktion von VEGF – einem Wachstumsfaktor, der neue Blutgefäße sprießen lässt. Mehr Blutgefäße bedeuten mehr Sauerstoff und Nährstoffe für das verletzte Gewebe.

**Schritt 2: Zellmigration (FAK-Paxillin-Signalweg)**
BPC-157 aktiviert den FAK-Paxillin-Signalweg, der Zellen dabei hilft, sich zu bewegen und an der richtigen Stelle anzuheften. Stell dir das vor wie ein GPS-System für Heilungszellen.

**Schritt 3: Entzündungsregulation (NO-Synthase)**
BPC-157 moduliert die Stickstoffmonoxid-Produktion (NO). NO ist ein wichtiges Signalmolekül, das Blutgefäße erweitert und Entzündungsreaktionen reguliert.

**Schritt 4: Geweberegeneration (EGF-Rezeptor)**
BPC-157 interagiert mit dem EGF-Rezeptor, der Zellwachstum und Geweberegeneration steuert.`
      },
      {
        id: 'bpc157-l3-applications', layer: 'L3', blockType: 'applications', title: 'Forschungsbereiche von BPC-157',
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
        id: 'bpc157-l4-evidence', layer: 'L4', blockType: 'evidence_overview', title: 'Studienlage und Evidenz',
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
        id: 'bpc157-l5-limitations', layer: 'L5', blockType: 'limitations', title: 'Limitationen und offene Fragen',
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
        id: 'bpc157-l7-faq', layer: 'L7', blockType: 'faq', title: 'Häufig gestellte Fragen zu BPC-157',
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
        INSERT INTO content_blocks (id, entity_id, layer, scope, block_type, title, body, sort_order, comprehension_level, target_audience, reading_time_seconds, lifecycle_status, generated_by_ai, version, created_at, updated_at)
        VALUES (
          ${block.id}, 'bpc-157', ${block.layer as any}, '["portal","academy","bedo"]',
          ${block.blockType}, ${block.title}, ${block.body},
          ${block.sortOrder}, ${block.comprehensionLevel}, ${block.targetAudience},
          ${block.readingTime}, 'review', false, 1, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET body = EXCLUDED.body, updated_at = NOW()
      `);
    }

    // ─── Seed: Ecosystem Links ────────────────────────────────────────────────
    const ecosystemLinks = [
      ['eco-bpc157-academy-grundlagen', 'academy_module', 'academy-module-bpc157-grundlagen', 'bpc-157-grundlagen', 'BPC-157 Grundlagen – Modul', 'academy', 1.0, 10],
      ['eco-bpc157-shop-product', 'shop_product', 'bpc-157-5mg', 'bpc-157-5mg', 'BPC-157 5mg – Research Grade', 'shop', 1.0, 10],
      ['eco-bpc157-protocol-regeneration', 'protocol', 'protocol-regeneration-basic', 'regeneration-protokoll', 'Regenerations-Protokoll (Research)', 'portal', 0.9, 10],
      ['eco-bpc157-stack-recovery', 'stack', 'stack-recovery-basic', 'recovery-stack', 'Recovery Stack – BPC-157 + TB-500', 'portal', 0.95, 10],
    ];

    for (const [id, linkType, extId, extSlug, extName, extSystem, score, sortOrder] of ecosystemLinks) {
      await db.execute(sql`
        INSERT INTO ecosystem_links (id, entity_id, link_type, external_id, external_slug, external_name, external_system, relevance_score, sort_order, active, created_at, updated_at)
        VALUES (${id as string}, 'bpc-157', ${linkType as string}, ${extId as string}, ${extSlug as string}, ${extName as string}, ${extSystem as string}, ${score as number}, ${sortOrder as number}, false, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `);
    }

    console.log("[Goldstandard Migration] BPC-157 seed data inserted.");
    console.log("[Goldstandard Migration] Completed successfully.");
  } catch (err) {
    console.error("[Goldstandard Migration] Error:", err);
    // Non-fatal: server continues even if migration fails
  }
}
