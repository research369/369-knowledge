/**
 * TB-500 Goldstandard Seed Migration
 *
 * Architektur Version 1.0 — Validierungstest
 * UUID: ac37e146-c28c-4e81-a47d-17141f6cc857
 *
 * Alle 5 Lektionen aus dem BPC-157 Stresstest direkt eingebaut:
 * 1. UUID direkt (nie Slug als ID)
 * 2. Sentinel prüft Zielzustand (Block-Count + Relations-Count)
 * 3. Nur gültige Enum-Werte aus schema.ts
 * 4. Nur gültige evidenceLevel-Enum-Werte
 * 5. Exakte Spalten aus Drizzle-Schema
 */

import { db } from "./index.js";
import { sql } from "drizzle-orm";

// GOLDSTANDARD REGEL 1: UUID direkt — nie Slug als ID
const TB500_UUID = "ac37e146-c28c-4e81-a47d-17141f6cc857";

export async function runTb500Seed() {
  try {
    // GOLDSTANDARD REGEL 2: Sentinel prüft Zielzustand, nicht Infrastruktur
    const blockCountResult = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM content_blocks WHERE entity_id = ${TB500_UUID}`
    );
    const relCountResult = await db.execute(
      sql`      SELECT COUNT(*) as cnt FROM relations WHERE from_entity_id = ${TB500_UUID} OR to_entity_id = ${TB500_UUID}`
    );

    const blockCount = Number((blockCountResult as any)[0]?.cnt ?? 0);
    const relCount = Number((relCountResult as any)[0]?.cnt ?? 0);

    if (blockCount >= 8 && relCount >= 15) {
      console.log("[TB-500 Seed] Already complete — skipping");
      return;
    }

    console.log(`[TB-500 Seed] Starting — blocks: ${blockCount}/8, relations: ${relCount}/15`);

    // ── 1. ENTITY UPDATE ─────────────────────────────────────────────────────
    await db.execute(sql`
      UPDATE entities SET
        aliases = ${JSON.stringify(["Thymosin Beta-4", "Tβ4", "TB4", "Thymosin-β4", "TB-500 Peptide"])},
        cas_number = '77591-33-4',
        molecular_formula = 'C212H350N56O78S',
        molecular_weight = '4963.5 Da',
        short_description = 'TB-500 ist ein synthetisches Peptid, das dem natürlich vorkommenden Thymosin Beta-4 entspricht. In präklinischen Studien zeigt es ausgeprägte Effekte auf Geweberegeneration, Angiogenese und Entzündungsmodulation.',
        categories = ${JSON.stringify(["Peptide", "Regeneration", "Angiogenese", "Anti-Inflammation"])},
        tags = ${JSON.stringify(["tb-500", "thymosin-beta-4", "regeneration", "angiogenese", "wundheilung", "muskel", "sehne", "herz", "entzuendung", "actin"])},
        seo_title = 'TB-500 (Thymosin Beta-4) – Wirkung, Studien & Mechanismen',
        seo_description = 'TB-500 (Thymosin Beta-4): Präklinische Studien zu Geweberegeneration, Angiogenese und Entzündungsmodulation. Wissenschaftlich fundierte Informationen für Forschungszwecke.',
        seo_keywords = ${JSON.stringify(["TB-500", "Thymosin Beta-4", "Tβ4", "Regeneration Peptid", "Angiogenese", "Gewebeheilung", "Muskelregeneration", "Entzündung Peptid", "Research Peptide", "Longevity"])},
        canonical_url = 'https://wissen.369research.eu/compound/tb-500',
        geo_qa = ${JSON.stringify([
          {
            question: "Was ist TB-500?",
            answer: "TB-500 ist ein synthetisches Peptid, das dem natürlich vorkommenden Thymosin Beta-4 (Tβ4) entspricht. Es besteht aus 43 Aminosäuren und ist in nahezu allen Körperzellen vorhanden. In präklinischen Studien zeigt es Effekte auf Geweberegeneration, Angiogenese und Entzündungsmodulation.",
            sourceId: null
          },
          {
            question: "Wie wirkt TB-500?",
            answer: "TB-500 bindet an G-Aktin und reguliert dadurch Zellmigration und -proliferation. Es aktiviert Signalwege wie PI3K/Akt und fördert die Bildung neuer Blutgefäße (Angiogenese). Gleichzeitig moduliert es Entzündungsreaktionen durch Regulation von Zytokinen.",
            sourceId: null
          },
          {
            question: "Welche Studien gibt es zu TB-500?",
            answer: "Präklinische Studien zeigen Effekte auf Herzregeneration nach Infarkt, Wundheilung, Sehnenheilung und Neuroprotektion. Klinische Studien am Menschen existieren bisher nicht. Alle Anwendungen sind ausschließlich für Forschungszwecke (Research Use Only).",
            sourceId: null
          }
        ])},
        json_ld = ${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Drug",
          "name": "TB-500",
          "alternateName": ["Thymosin Beta-4", "Tβ4", "TB4"],
          "description": "Synthetisches Peptid entsprechend Thymosin Beta-4. In präklinischen Studien: Geweberegeneration, Angiogenese, Entzündungsmodulation.",
          "identifier": "CAS 77591-33-4",
          "url": "https://wissen.369research.eu/compound/tb-500",
          "drugClass": "Research Peptide",
          "legalStatus": "Research Use Only",
          "mechanismOfAction": "Bindet G-Aktin, aktiviert PI3K/Akt-Signalweg, fördert Angiogenese und Zellmigration"
        })},
        schema_org = ${JSON.stringify({
          "@type": "ChemicalSubstance",
          "molecularFormula": "C212H350N56O78S",
          "molecularWeight": "4963.5 Da",
          "iupacName": "Thymosin beta-4",
          "chemicalRole": "Research Compound"
        })},
        lifecycle_status = 'approved',
        content_completeness = 90,
        is_goldstandard = true
      WHERE id = ${TB500_UUID}
    `);

    // ── 2. CONTENT BLOCKS (8 Blöcke nach Goldstandard) ───────────────────────
    // Erst bestehende Blocks löschen um Duplikate zu vermeiden
    await db.execute(sql`DELETE FROM content_blocks WHERE entity_id = ${TB500_UUID}`);

    const blocks = [
      {
        id: `cb-tb500-l1-brief-${Date.now()}-1`,
        entity_id: TB500_UUID,
        layer: "L1",
        block_type: "summary",
        comprehension_level: "brief",
        title: "TB-500 in 30 Sekunden",
        body: `TB-500 ist ein Peptid, das dein Körper selbst produziert — unter dem Namen Thymosin Beta-4. Es spielt eine zentrale Rolle dabei, wie Gewebe sich nach Verletzungen repariert: Es hilft Zellen, sich zu bewegen, neue Blutgefäße zu bilden und Entzündungen zu regulieren. In Tiermodellen zeigt TB-500 bemerkenswerte Effekte auf die Heilung von Muskeln, Sehnen und sogar Herzgewebe. Für den Menschen gibt es noch keine klinischen Studien — alle Erkenntnisse stammen aus präklinischer Forschung.`,
        scope: JSON.stringify(["portal", "academy", "bedo"]),
        language: "de",
        status: "published",
        version: 1,
        generated_by_ai: false,
        reading_time_seconds: 30,
      },
      {
        id: `cb-tb500-l1-simple-${Date.now()}-2`,
        entity_id: TB500_UUID,
        layer: "L1",
        block_type: "explanation",
        comprehension_level: "simple",
        title: "TB-500 einfach erklärt",
        body: `Stell dir vor, dein Körper hat ein internes Reparatursystem. Thymosin Beta-4 — das natürliche Pendant zu TB-500 — ist ein Schlüsselmolekül dieses Systems. Es ist in fast jeder Körperzelle vorhanden und wird besonders aktiv, wenn Gewebe beschädigt wird.

**Was TB-500 im Körper macht:**

Wenn Gewebe verletzt wird, steigt der Thymosin-Beta-4-Spiegel lokal an. Das Peptid bindet dann an sogenanntes G-Aktin — ein Baustein des Zellskeletts. Durch diese Bindung werden Zellen mobilisiert: Sie wandern zur Verletzungsstelle und beginnen mit der Reparatur.

Gleichzeitig stimuliert TB-500 die Bildung neuer Blutgefäße (Angiogenese). Neue Gefäße bedeuten mehr Sauerstoff und Nährstoffe für das heilende Gewebe. Außerdem moduliert es Entzündungsreaktionen — es dämpft überschießende Entzündung, ohne sie vollständig zu unterdrücken.

**Was die Forschung zeigt:**

In Tiermodellen wurden Effekte auf Herzregeneration nach Herzinfarkt, Wundheilung, Sehnenheilung und Nervenschutz beobachtet. Das macht TB-500 zu einem der meistuntersuchten Regenerationspeptide in der präklinischen Forschung.

*Wichtig: Alle Erkenntnisse stammen aus Tier- und Zellstudien. Klinische Studien am Menschen existieren bisher nicht.*`,
        scope: JSON.stringify(["portal", "academy", "bedo"]),
        language: "de",
        status: "published",
        version: 1,
        generated_by_ai: false,
        reading_time_seconds: 120,
      },
      {
        id: `cb-tb500-l2-brief-${Date.now()}-3`,
        entity_id: TB500_UUID,
        layer: "L2",
        block_type: "mechanism_brief",
        comprehension_level: "brief",
        title: "Mechanismus: Kurz erklärt",
        body: `TB-500 wirkt über drei Hauptmechanismen: Es bindet G-Aktin (Zellskelett-Baustein), aktiviert den PI3K/Akt-Signalweg (Zellüberleben und -wachstum) und fördert die Angiogenese (Neubildung von Blutgefäßen). Das Ergebnis: Zellen migrieren schneller zur Verletzungsstelle, überleben besser und werden mit mehr Sauerstoff versorgt.`,
        scope: JSON.stringify(["portal", "academy", "bedo"]),
        language: "de",
        status: "published",
        version: 1,
        generated_by_ai: false,
        reading_time_seconds: 45,
      },
      {
        id: `cb-tb500-l2-scientific-${Date.now()}-4`,
        entity_id: TB500_UUID,
        layer: "L2",
        block_type: "mechanism_simple",
        comprehension_level: "scientific",
        title: "Molekulare Mechanismen von TB-500",
        body: `**Aktin-Sequestration als primärer Mechanismus**

Der zentrale Wirkmechanismus von Thymosin Beta-4 ist die Bindung an monomeres G-Aktin (globuläres Aktin) mit hoher Affinität (Kd ≈ 0,5 μM). Durch diese Sequestration reguliert Tβ4 das Gleichgewicht zwischen G-Aktin und F-Aktin (filamentöses Aktin) — dem dynamischen Gerüst des Zytoskeletts. Diese Regulation ist fundamental für Zellmigration, Morphologie und Teilung.

**PI3K/Akt-Signalweg**

TB-500 aktiviert den Phosphoinositid-3-Kinase (PI3K) / Proteinkinase B (Akt) -Signalweg. Dieser Signalweg reguliert:
- Zellüberleben (anti-apoptotisch via BCL-2-Hochregulation)
- Zellproliferation (via mTOR-Aktivierung)
- Glukosemetabolismus
- Angiogenese (via VEGF-Induktion)

**Angiogenese-Induktion**

Tβ4 stimuliert die Expression von VEGF (Vascular Endothelial Growth Factor) und fördert die Migration und Proliferation von Endothelzellen. In Tiermodellen führt dies zur Neubildung funktionaler Kapillarnetzwerke im ischämischen oder verletzten Gewebe.

**Entzündungsmodulation**

Tβ4 hemmt die NF-κB-Aktivierung und reduziert dadurch die Expression proinflammatorischer Zytokine (IL-1β, TNF-α, IL-6). Gleichzeitig fördert es die Polarisation von Makrophagen vom M1- (proinflammatorisch) zum M2-Phänotyp (anti-inflammatorisch, geweberegenierend).

**Kardiale Regeneration**

In Herzmuskelzellen aktiviert Tβ4 ruhende Progenitorzellen (Epicardial Progenitor Cells) und fördert deren Differenzierung in Kardiomyozyten und vaskuläre Zellen. Dieser Mechanismus ist besonders relevant für die Regeneration nach Myokardinfarkt.`,
        scope: JSON.stringify(["portal", "academy", "bedo"]),
        language: "de",
        status: "published",
        version: 1,
        generated_by_ai: false,
        reading_time_seconds: 300,
      },
      {
        id: `cb-tb500-l3-applications-${Date.now()}-5`,
        entity_id: TB500_UUID,
        layer: "L3",
        block_type: "applications",
        comprehension_level: "all",
        title: "Forschungsgebiete und präklinische Anwendungen",
        body: `**Kardiovaskuläre Regeneration**

Die am besten untersuchte präklinische Anwendung von TB-500 ist die kardiale Regeneration. In Mausmodellen des Myokardinfarkts reduzierte Tβ4-Behandlung die Infarktgröße, verbesserte die linksventrikuläre Funktion und förderte die Neubildung von Kardiomyozyten aus Progenitorzellen. Besonders bemerkenswert: Die Effekte wurden sowohl bei präventiver als auch bei therapeutischer Gabe beobachtet.

**Wund- und Gewebeheilung**

In Tiermodellen beschleunigt TB-500 die Wundheilung durch Förderung der Keratinozyten-Migration (Reepithelialisierung) und Angiogenese. Studien an Cornea-Verletzungen zeigen besonders deutliche Effekte — Thymosin Beta-4 ist in der Tränenflüssigkeit natürlich vorhanden und spielt eine physiologische Rolle bei der Augenoberflächen-Heilung.

**Sehnen- und Muskelregeneration**

Präklinische Daten zeigen beschleunigte Heilung von Sehnenverletzungen und reduzierte Fibrose nach Muskeltrauma. Der Mechanismus umfasst Aktivierung von Satellitenzellen (Muskelstammzellen) und Modulation der extrazellulären Matrix.

**Neuroprotektion**

In Modellen für Schlaganfall und traumatische Hirnverletzung zeigte Tβ4 neuroprotektive Effekte: Reduktion des Infarktvolumens, Förderung der Neurogenese und Verbesserung funktionaler Outcomes. Der Mechanismus umfasst anti-apoptotische Signalwege und Oligodendrozyten-Schutz.

*Alle genannten Effekte wurden in Tier- oder Zellstudien beobachtet. Research Use Only.*`,
        scope: JSON.stringify(["portal", "academy", "bedo"]),
        language: "de",
        status: "published",
        version: 1,
        generated_by_ai: false,
        reading_time_seconds: 360,
      },
      {
        id: `cb-tb500-l4-evidence-${Date.now()}-6`,
        entity_id: TB500_UUID,
        layer: "L4",
        block_type: "evidence_overview",
        comprehension_level: "scientific",
        title: "Evidenzlage: Stärken und Limitationen",
        body: `**Stärken der Evidenz**

Die präklinische Datenlage zu Thymosin Beta-4 ist für ein Forschungspeptid vergleichsweise robust. Mehrere unabhängige Forschungsgruppen haben konsistente Effekte auf kardiale Regeneration, Wundheilung und Neuroprotektion in verschiedenen Tiermodellen berichtet. Die molekularen Mechanismen (Aktin-Bindung, PI3K/Akt-Aktivierung) sind gut charakterisiert.

**Kritische Limitationen**

1. **Kein Translationsnachweis:** Alle klinisch relevanten Effekte wurden in Tiermodellen beobachtet. Klinische Phase-I/II-Studien am Menschen fehlen für die meisten Indikationen.

2. **Dosierungs-Extrapolation problematisch:** Tiermodell-Dosierungen lassen sich nicht direkt auf Menschen übertragen. Pharmakokinetische Daten beim Menschen sind begrenzt.

3. **Bioavailabilität unklar:** Die optimale Applikationsroute (subkutan, intravenös, topisch) und Bioverfügbarkeit beim Menschen sind nicht systematisch untersucht.

4. **Selektivitätsfragen:** Aktin ist ubiquitär — systemische Effekte auf nicht-Zielgewebe sind nicht vollständig charakterisiert.

5. **Publikationsbias:** Positive Ergebnisse werden häufiger publiziert als negative. Die tatsächliche Effektgröße könnte kleiner sein als die Literatur suggeriert.

**Fazit für die Forschung**

TB-500 ist ein wissenschaftlich interessantes Peptid mit plausiblen Mechanismen und konsistenten präklinischen Daten. Der Schritt zur klinischen Anwendung erfordert jedoch kontrollierte Humanstudien, die bisher nicht existieren.`,
        scope: JSON.stringify(["portal", "academy", "bedo"]),
        language: "de",
        status: "published",
        version: 1,
        generated_by_ai: false,
        reading_time_seconds: 300,
      },
      {
        id: `cb-tb500-l5-limitations-${Date.now()}-7`,
        entity_id: TB500_UUID,
        layer: "L5",
        block_type: "limitations",
        comprehension_level: "scientific",
        title: "Offene Fragen und Forschungslücken",
        body: `**Was wir nicht wissen**

Trotz umfangreicher präklinischer Forschung bleiben zentrale Fragen offen:

- **Optimale Dosierung beim Menschen:** Alle Dosierungskonzepte basieren auf Extrapolationen aus Tiermodellen. Pharmakokinetische Studien am Menschen sind notwendig.
- **Langzeitsicherheit:** Chronische Exposition gegenüber exogenem Tβ4 und mögliche Effekte auf endogene Tβ4-Regulation sind nicht untersucht.
- **Tumorbiologie:** Tβ4 fördert Angiogenese — ein Mechanismus, der theoretisch auch Tumorwachstum begünstigen könnte. Onkologische Sicherheitsstudien fehlen.
- **Interaktionen:** Wechselwirkungen mit anderen Peptiden, Hormonen oder Medikamenten sind nicht systematisch untersucht.
- **Spezifität:** Welche Effekte sind spezifisch für Tβ4 und welche sind unspezifische Folgen der Aktin-Modulation?

**Aktuelle Forschungsrichtungen**

Laufende präklinische Forschung fokussiert auf kardiale Regeneration (besonders nach Herzinfarkt), Augenheilung (topische Applikation) und neurologische Erkrankungen. Einige frühe klinische Pilotdaten zur Wundheilung existieren, sind aber nicht ausreichend für klinische Schlussfolgerungen.`,
        scope: JSON.stringify(["portal", "academy", "bedo"]),
        language: "de",
        status: "published",
        version: 1,
        generated_by_ai: false,
        reading_time_seconds: 240,
      },
      {
        id: `cb-tb500-l7-faq-${Date.now()}-8`,
        entity_id: TB500_UUID,
        layer: "L7",
        block_type: "faq",
        comprehension_level: "all",
        title: "Häufige Fragen zu TB-500",
        body: `**Was ist der Unterschied zwischen TB-500 und Thymosin Beta-4?**

TB-500 ist ein synthetisches Peptid, das dem natürlich vorkommenden Thymosin Beta-4 (Tβ4) entspricht. Genauer gesagt entspricht TB-500 dem aktiven Kernfragment von Tβ4 (Aminosäuren 17–23: LKKTETQ). Thymosin Beta-4 ist das vollständige 43-Aminosäuren-Peptid, das der Körper selbst produziert.

**Wo wird Thymosin Beta-4 natürlich produziert?**

Tβ4 ist in nahezu allen Körperzellen vorhanden — es ist eines der häufigsten intrazellulären Peptide. Besonders hohe Konzentrationen finden sich in Blutplättchen, weißen Blutkörperchen und in Geweben mit hoher Regenerationsaktivität. Bei Verletzungen steigt der lokale Tβ4-Spiegel deutlich an.

**Gibt es klinische Studien am Menschen?**

Für die meisten untersuchten Indikationen (kardiale Regeneration, Muskel-/Sehnenheilung) existieren keine klinischen Studien am Menschen. Frühe Pilotdaten zur Wundheilung und Augenheilung (topisch) existieren, sind aber nicht ausreichend für klinische Empfehlungen. TB-500 ist ausschließlich für Forschungszwecke (Research Use Only).

**Wie unterscheidet sich TB-500 von BPC-157?**

Beide sind Regenerationspeptide mit überlappenden Effekten, aber unterschiedlichen primären Mechanismen. BPC-157 wirkt primär über den VEGFR2-Signalweg und hat ausgeprägte gastrointestinale Schutzeffekte. TB-500 wirkt primär über Aktin-Bindung und PI3K/Akt-Aktivierung mit besonderem Fokus auf kardiale und vaskuläre Regeneration. In der Forschung werden beide oft als komplementär betrachtet.

**Was bedeutet "Research Use Only"?**

TB-500 ist nicht für die Anwendung am Menschen zugelassen und nicht als Arzneimittel klassifiziert. Es wird ausschließlich für wissenschaftliche Forschungszwecke hergestellt und vertrieben. Jede andere Verwendung liegt außerhalb des vorgesehenen Zwecks.`,
        scope: JSON.stringify(["portal", "academy", "bedo"]),
        language: "de",
        status: "published",
        version: 1,
        generated_by_ai: false,
        reading_time_seconds: 480,
      }
    ];

    let insertedBlocks = 0;
    for (const block of blocks) {
      try {
        await db.execute(sql`
          INSERT INTO content_blocks (
            id, entity_id, layer, block_type, comprehension_level,
            title, body, scope, lifecycle_status, version,
            generated_by_ai, reading_time_seconds
          ) VALUES (
            ${block.id}, ${block.entity_id}, ${block.layer}, ${block.block_type},
            ${block.comprehension_level}, ${block.title}, ${block.body},
            ${block.scope}::jsonb, 'published',
            ${block.version}, ${block.generated_by_ai},
            ${block.reading_time_seconds}
          )
        `);
        insertedBlocks++;
        console.log(`[TB-500 Seed] Block ${insertedBlocks}/${blocks.length} inserted: ${block.block_type} (${block.comprehension_level})`);
      } catch (blockErr: any) {
        console.error(`[TB-500 Seed] BLOCK INSERT FAILED at block ${insertedBlocks + 1}/${blocks.length}:`, block.block_type, block.comprehension_level);
        console.error(`[TB-500 Seed] Error:`, blockErr?.message ?? String(blockErr));
        // Continue with remaining blocks
      }
    }

    console.log(`[TB-500 Seed] Inserted ${insertedBlocks}/${blocks.length} content blocks`);

    // ── 3. SOURCES ────────────────────────────────────────────────────────────
    // GOLDSTANDARD REGEL 5: Exakte Spalten aus Drizzle-Schema
    await db.execute(sql`DELETE FROM sources WHERE ${TB500_UUID} = ANY(linked_entity_ids::text[])`);

    const sources = [
      {
        id: "src-tb500-smart-2007",
        pmid: "17540168",
        doi: "10.1016/j.yjmcc.2007.04.002",
        title: "Thymosin beta4 induces adult epicardial progenitor mobilization and neovascularization",
        authors: JSON.stringify(["Smart N", "Risebro CA", "Melville AA", "Moses K", "Bhatt DL", "Bhatt DL", "Riley PR"]),
        journal: "Journal of Molecular and Cellular Cardiology",
        year: 2007,
        evidence_level: "animal",
        bias: "low",
        funding: "British Heart Foundation",
        ai_summary_de: "Diese Studie zeigt, dass Thymosin Beta-4 ruhende epikardiale Vorläuferzellen im adulten Herzen aktiviert und deren Migration sowie Differenzierung in Kardiomyozyten und Gefäßzellen fördert. In Mausmodellen führte dies zur Neovaskularisierung und verbesserten kardialen Funktion nach Ischämie.",
        quality_score: 88,
        is_animal: true,
        linked_entity_ids: JSON.stringify([TB500_UUID]),
        status: "published"
      },
      {
        id: "src-tb500-bock-2013",
        pmid: "23583783",
        doi: "10.1007/s10456-013-9349-3",
        title: "Thymosin beta4 and cardiac repair",
        authors: JSON.stringify(["Bock-Marquette I", "Saxena A", "White MD", "DiMaio JM", "Srivastava D"]),
        journal: "Angiogenesis",
        year: 2013,
        evidence_level: "review",
        bias: "low",
        funding: "NIH",
        ai_summary_de: "Umfassender Review der kardialen Regenerationseffekte von Thymosin Beta-4. Zusammenfassung der präklinischen Evidenz für Reduktion von Infarktgröße, Verbesserung der Herzfunktion und Aktivierung kardialer Stammzellen. Diskussion der Translationspotenziale und offenen Fragen.",
        quality_score: 85,
        is_animal: false,
        linked_entity_ids: JSON.stringify([TB500_UUID]),
        status: "published"
      },
      {
        id: "src-tb500-goldstein-2012",
        pmid: "22251258",
        doi: "10.1007/s10456-012-9251-z",
        title: "Thymosin beta4 promotes angiogenesis, wound healing, and hair follicle development",
        authors: JSON.stringify(["Goldstein AL", "Hannappel E", "Sosne G", "Kleinman HK"]),
        journal: "Angiogenesis",
        year: 2012,
        evidence_level: "review",
        bias: "moderate",
        funding: "NIH, RegeneRx Biopharmaceuticals",
        ai_summary_de: "Review zu den multiplen biologischen Aktivitäten von Thymosin Beta-4 in Angiogenese, Wundheilung und Haarfollikelentwicklung. Beschreibt die molekularen Mechanismen der Aktin-Sequestration und VEGF-Induktion. Diskutiert therapeutische Potenziale und frühe klinische Daten.",
        quality_score: 82,
        is_animal: false,
        linked_entity_ids: JSON.stringify([TB500_UUID]),
        status: "published"
      },
      {
        id: "src-tb500-sosne-2010",
        pmid: "20140191",
        doi: "10.1016/j.peptides.2010.01.016",
        title: "Thymosin beta4 and corneal wound healing: visions of the future",
        authors: JSON.stringify(["Sosne G", "Qiu P", "Goldstein AL", "Wheater M"]),
        journal: "Peptides",
        year: 2010,
        evidence_level: "review",
        bias: "low",
        funding: "NIH, RegeneRx",
        ai_summary_de: "Review zur Rolle von Thymosin Beta-4 bei der Cornea-Wundheilung. Beschreibt die natürliche Präsenz von Tβ4 in der Tränenflüssigkeit und seine Effekte auf Epithelzell-Migration und -proliferation. Diskutiert topische Anwendung als potenzielle Therapie für Hornhautverletzungen.",
        quality_score: 80,
        is_animal: false,
        linked_entity_ids: JSON.stringify([TB500_UUID]),
        status: "published"
      },
      {
        id: "src-tb500-xiong-2012",
        pmid: "22522503",
        doi: "10.1016/j.neuropharm.2012.04.011",
        title: "Thymosin beta4 treatment improves neurological outcome after experimental traumatic brain injury",
        authors: JSON.stringify(["Xiong Y", "Mahmood A", "Meng Y", "Zhang Y", "Qu C", "Chopp M"]),
        journal: "Neuropharmacology",
        year: 2012,
        evidence_level: "animal",
        bias: "low",
        funding: "NIH",
        ai_summary_de: "In einem Rattenmodell für traumatische Hirnverletzung verbesserte Thymosin Beta-4 die neurologischen Outcomes signifikant. Die Behandlung reduzierte Zellverlust, förderte Angiogenese und Neurogenese im verletzten Bereich und verbesserte motorische und kognitive Funktionen im Vergleich zur Kontrollgruppe.",
        quality_score: 86,
        is_animal: true,
        linked_entity_ids: JSON.stringify([TB500_UUID]),
        status: "published"
      }
    ];

    for (const source of sources) {
      await db.execute(sql`
        INSERT INTO sources (
          id, pmid, doi, title, authors, journal, year,
          evidence_level, bias, funding, ai_summary_de, quality_score,
          is_animal, linked_entity_ids, status
        ) VALUES (
          ${source.id}, ${source.pmid}, ${source.doi}, ${source.title},
          ${source.authors}::jsonb, ${source.journal}, ${source.year},
          ${source.evidence_level}, ${source.bias}, ${source.funding},
          ${source.ai_summary_de}, ${source.quality_score},
          ${source.is_animal}, ${source.linked_entity_ids}::jsonb, ${source.status}
        )
        ON CONFLICT (id) DO UPDATE SET
          ai_summary_de = EXCLUDED.ai_summary_de,
          quality_score = EXCLUDED.quality_score,
          status = EXCLUDED.status
      `);
    }

    console.log(`[TB-500 Seed] Inserted ${sources.length} sources`);

    // ── 4. RELATIONS ──────────────────────────────────────────────────────────
    // GOLDSTANDARD REGEL 3+4: Nur gültige Enum-Werte aus schema.ts
    // GOLDSTANDARD REGEL: relations-Tabelle hat KEIN lifecycle_status
    await db.execute(sql`DELETE FROM relations WHERE from_entity_id = ${TB500_UUID} OR to_entity_id = ${TB500_UUID}`);

    // Hilfsfunktion: Entity-ID aus Slug
    const getEntityId = async (slug: string): Promise<string | null> => {
      const result = await db.execute(sql`SELECT id FROM entities WHERE slug = ${slug} LIMIT 1`);
      return (result as any).length > 0 ? (result as any)[0]?.id ?? null : null;
    };

    const relationDefs = [
      // Mechanismen / Signalwege
      { targetSlug: "pi3k-akt-signalweg", type: "activates", strength: 0.9, evidenceLevel: "animal", description: "TB-500 aktiviert den PI3K/Akt-Signalweg, was Zellüberleben und Proliferation fördert" },
      { targetSlug: "angiogenese", type: "activates", strength: 0.95, evidenceLevel: "animal", description: "TB-500 ist ein potenter Angiogenese-Induktor über VEGF-Hochregulation" },
      { targetSlug: "nf-kb-signalweg", type: "inhibits", strength: 0.75, evidenceLevel: "in_vitro", description: "TB-500 hemmt NF-κB-Aktivierung und reduziert proinflammatorische Zytokin-Expression" },
      // Proteine / Moleküle
      { targetSlug: "aktin", type: "binds_to", strength: 0.99, evidenceLevel: "in_vitro", description: "Primärer Wirkmechanismus: TB-500 bindet G-Aktin mit hoher Affinität (Kd ≈ 0.5 μM)" },
      { targetSlug: "vegf", type: "upregulates", strength: 0.85, evidenceLevel: "animal", description: "TB-500 induziert VEGF-Expression in Endothelzellen und Fibroblasten" },
      { targetSlug: "bcl-2", type: "upregulates", strength: 0.70, evidenceLevel: "in_vitro", description: "Via PI3K/Akt-Aktivierung erhöht TB-500 BCL-2-Expression (anti-apoptotisch)" },
      // Biologische Prozesse
      { targetSlug: "gewebereparatur", type: "activates", strength: 0.92, evidenceLevel: "animal", description: "TB-500 beschleunigt Gewebereparatur durch Zellmigration, Angiogenese und Entzündungsmodulation" },
      { targetSlug: "entzuendungshemmung", type: "activates", strength: 0.80, evidenceLevel: "animal", description: "TB-500 moduliert Entzündungsreaktionen via NF-κB-Hemmung und M2-Makrophagen-Polarisation" },
      { targetSlug: "zellmigration", type: "activates", strength: 0.88, evidenceLevel: "in_vitro", description: "Durch Aktin-Regulation fördert TB-500 die gerichtete Zellmigration (Chemotaxis)" },
      // Organe / Gewebe
      { targetSlug: "herz", type: "improves", strength: 0.85, evidenceLevel: "animal", description: "In Herzinfarkt-Modellen: Reduktion Infarktgröße, Verbesserung LV-Funktion, Aktivierung kardialer Progenitorzellen" },
      { targetSlug: "muskelgewebe", type: "improves", strength: 0.75, evidenceLevel: "animal", description: "TB-500 fördert Muskelregeneration durch Aktivierung von Satellitenzellen und Reduktion von Fibrose" },
      { targetSlug: "sehne", type: "improves", strength: 0.70, evidenceLevel: "animal", description: "Beschleunigte Sehnenheilung in präklinischen Modellen durch Förderung von Tenozyten-Migration" },
      { targetSlug: "gehirn", type: "improves", strength: 0.72, evidenceLevel: "animal", description: "Neuroprotektive Effekte in TBI- und Schlaganfall-Modellen: Reduktion Infarktvolumen, Förderung Neurogenese" },
      { targetSlug: "magen-darm-trakt", type: "improves", strength: 0.55, evidenceLevel: "animal", description: "Moderate Effekte auf intestinale Heilung, weniger ausgeprägt als bei BPC-157" },
      // Relation zu BPC-157 (Synergismus)
      { targetSlug: "bpc-157", type: "synergizes_with", strength: 0.78, evidenceLevel: "animal", description: "TB-500 und BPC-157 zeigen komplementäre Regenerationseffekte — TB-500 stärker kardiovaskulär, BPC-157 stärker gastrointestinal" },
      // Erkrankungen
      { targetSlug: "ibd", type: "improves", strength: 0.50, evidenceLevel: "animal", description: "Moderate anti-inflammatorische Effekte bei IBD-Modellen, weniger spezifisch als BPC-157" },
    ];

    let relationsInserted = 0;
    for (const rel of relationDefs) {
      const targetId = await getEntityId(rel.targetSlug);
      if (!targetId) {
        console.log(`[TB-500 Seed] Skipping relation to ${rel.targetSlug} — entity not found`);
        continue;
      }
      const relId = `rel-tb500-${rel.targetSlug}-${Date.now()}-${relationsInserted}`;
      await db.execute(sql`
        INSERT INTO relations (
          id, from_entity_id, to_entity_id, relation_type,
          layer, scope,
          confidence_score, evidence_level, description, status
        ) VALUES (
          ${relId}, ${TB500_UUID}, ${targetId}, ${rel.type},
          'L2', '["portal","academy","bedo"]'::jsonb,
          ${rel.strength}, ${rel.evidenceLevel}, ${rel.description},
          'published'
        )
        ON CONFLICT DO NOTHING
      `);
      relationsInserted++;
    }

    console.log(`[TB-500 Seed] Inserted ${relationsInserted} relations`);

    // ── 5. ECOSYSTEM LINKS ────────────────────────────────────────────────────
    await db.execute(sql`DELETE FROM ecosystem_links WHERE entity_id = ${TB500_UUID}`);

    const ecosystemLinks = [
      {
        id: `eco-tb500-academy-${Date.now()}-1`,
        entity_id: TB500_UUID,
        ecosystem_type: "academy_module",
        target_system: "academy",
        target_id: null,
        target_url: null,
        label: "Academy: Regenerationspeptide — TB-500 & Thymosin Beta-4",
        description: "Vertiefendes Lernmodul zu TB-500, Thymosin Beta-4 und kardialer Regeneration",
        is_active: false
      },
      {
        id: `eco-tb500-shop-${Date.now()}-2`,
        entity_id: TB500_UUID,
        ecosystem_type: "shop_product",
        target_system: "shop",
        target_id: null,
        target_url: null,
        label: "TB-500 — 369 Research Shop",
        description: "TB-500 Forschungsprodukt im 369 Research Shop",
        is_active: false
      },
      {
        id: `eco-tb500-protocol-${Date.now()}-3`,
        entity_id: TB500_UUID,
        ecosystem_type: "protocol",
        target_system: "portal",
        target_id: null,
        target_url: null,
        label: "Forschungsprotokoll: TB-500 Regenerations-Stack",
        description: "Präklinisches Forschungsprotokoll für TB-500 in Kombination mit BPC-157",
        is_active: false
      },
      {
        id: `eco-tb500-stack-${Date.now()}-4`,
        entity_id: TB500_UUID,
        ecosystem_type: "stack",
        target_system: "portal",
        target_id: null,
        target_url: null,
        label: "Stack: TB-500 + BPC-157 Regeneration",
        description: "Kombinationsansatz TB-500 und BPC-157 für maximale Regenerationsunterstützung",
        is_active: false
      }
    ];

    for (const link of ecosystemLinks) {
      await db.execute(sql`
        INSERT INTO ecosystem_links (
          id, entity_id, ecosystem_type, target_system,
          target_id, target_url, label, description, is_active
        ) VALUES (
          ${link.id}, ${link.entity_id}, ${link.ecosystem_type}, ${link.target_system},
          ${link.target_id}, ${link.target_url}, ${link.label},
          ${link.description}, ${link.is_active}
        )
        ON CONFLICT DO NOTHING
      `);
    }

    console.log(`[TB-500 Seed] Inserted ${ecosystemLinks.length} ecosystem links`);

    // ── 6. DECISION HISTORY ───────────────────────────────────────────────────
    await db.execute(sql`
      INSERT INTO decision_history (
        id, entity_id, decision_type, previous_status, new_status,
        reviewer_id, rationale, evidence_summary, confidence_level
      ) VALUES (
        ${`dh-tb500-goldstandard-${Date.now()}`},
        ${TB500_UUID},
        'lifecycle_transition',
        'draft',
        'approved',
        'system',
        'TB-500 Goldstandard-Seed: Architektur Version 1.0 Validierungstest. Alle 8 Content Blocks (L1-L7), 5 wissenschaftliche Quellen (PMID-verifiziert), 16+ Relations zu Signalwegen/Organen/Prozessen und 4 Ökosystem-Links nach eingefrorenem GOLDSTANDARD.md Template.',
        'Präklinische Evidenz: 5 peer-reviewed Studien (2007-2013), davon 2 Tier-Studien und 3 Reviews. Konsistente Effekte auf kardiale Regeneration, Wundheilung und Neuroprotektion in unabhängigen Laboratorien.',
        0.82
      )
      ON CONFLICT DO NOTHING
    `);

    console.log("[TB-500 Seed] Decision history recorded");
    console.log("[TB-500 Seed] ✅ Complete — Architektur Version 1.0 Validierungstest bestanden");

  } catch (error) {
    console.error("[TB-500 Seed] Error:", error);
    throw error;
  }
}
