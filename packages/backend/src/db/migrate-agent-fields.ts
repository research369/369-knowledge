/**
 * migrate-agent-fields.ts
 *
 * Schritt 1 des Architektur-Manifests:
 * Agent-Felder für BPC-157, TB-500, GHK-Cu und SS-31 befüllen.
 *
 * Felder:
 *   agent_sales_pitch       — Destillat aus L1/L2 Blocks, konversionsorientiert
 *   agent_support_faq       — Strukturierte FAQ aus L7 Block + häufige Fragen
 *   agent_research_context  — Wissenschaftlicher Kontext aus L3/L4 Blocks
 *   agent_medical_disclaimer — Compliance-Disclaimer (immer gleich)
 *   agent_confidence_score  — Initiale Einschätzung basierend auf Evidenzlage
 *
 * Alle Inhalte sind aus bestehenden Content Blocks abgeleitet.
 * Keine neuen wissenschaftlichen Behauptungen ohne vorhandene Quellen.
 */

import { db } from "./index.js";
import { sql } from "drizzle-orm";

const DISCLAIMER =
  "Alle Informationen dienen ausschließlich Forschungszwecken (Research Use Only). " +
  "Dieses Compound ist nicht für den menschlichen Gebrauch bestimmt. " +
  "Keine Dosierungsempfehlungen, keine medizinischen Aussagen, keine Heilversprechen. " +
  "369 Research GmbH übernimmt keine Haftung für die Verwendung dieser Informationen.";

const agentData: Record<string, {
  agentSalesPitch: string;
  agentSupportFaq: Array<{ q: string; a: string }>;
  agentResearchContext: string;
  agentMedicalDisclaimer: string;
  agentConfidenceScore: number;
}> = {
  "bpc-157": {
    agentSalesPitch:
      "BPC-157 ist ein synthetisches Pentadekapeptid (15 Aminosäuren), das aus dem menschlichen Magensaft isoliert wurde. " +
      "In präklinischen Studien zeigt es außergewöhnliche regenerative Eigenschaften: Es aktiviert gleichzeitig Angiogenese, " +
      "Kollagensynthese und Neuroprotektion. Besonders untersucht für Sehnen-, Muskel- und Darmbeschwerden. " +
      "Eines der am besten erforschten Peptide im präklinischen Bereich mit über 100 publizierten Studien. " +
      "Research Use Only.",

    agentSupportFaq: [
      {
        q: "Was bedeutet 'Research Use Only'?",
        a: "BPC-157 ist nicht für den menschlichen Gebrauch zugelassen. Es handelt sich ausschließlich um ein Forschungsprodukt für wissenschaftliche Zwecke.",
      },
      {
        q: "Wie wird BPC-157 in der Forschung eingesetzt?",
        a: "In präklinischen Studien wird BPC-157 hauptsächlich für Geweberegenerationsmodelle, Entzündungsmodelle und gastrointestinale Forschung eingesetzt.",
      },
      {
        q: "Gibt es Humanstudien zu BPC-157?",
        a: "Die überwiegende Mehrheit der Studien ist präklinisch (Tier- und In-vitro-Modelle). Klinische Humanstudien fehlen weitgehend — das ist die größte Limitation der aktuellen Datenlage.",
      },
      {
        q: "Was ist der Hauptmechanismus von BPC-157?",
        a: "BPC-157 aktiviert primär den VEGF-Signalweg (Angiogenese), den PI3K/Akt-Signalweg (Zellschutz) und fördert die Kollagensynthese über Fibroblasten-Aktivierung.",
      },
      {
        q: "Ist BPC-157 stabil?",
        a: "BPC-157 ist in wässriger Lösung bei Raumtemperatur instabil. Für Forschungszwecke wird Lagerung bei -20°C empfohlen.",
      },
      {
        q: "Wie unterscheidet sich BPC-157 von TB-500?",
        a: "BPC-157 wirkt primär lokal (Gewebe, Darm, Sehnen) über Angiogenese und Kollagensynthese. TB-500 (Thymosin Beta-4) wirkt systemischer über Aktin-Regulierung und Zellmigration. Beide werden in Regenerationsforschung eingesetzt, haben aber unterschiedliche Mechanismen.",
      },
    ],

    agentResearchContext:
      "BPC-157 (Body Protection Compound-157) ist ein synthetisches Pentadekapeptid mit der Sequenz GEPPPGKPADDAGLV. " +
      "Es wurde ursprünglich aus dem humanen Magensaft isoliert. Die Forschungsschwerpunkte liegen auf: " +
      "(1) Muskuloskelettaler Regeneration — Sehnen, Bänder, Muskeln; " +
      "(2) Gastrointestinaler Protektion — Magenulzera, entzündliche Darmerkrankungen; " +
      "(3) Neuroprotektion — dopaminerge und serotonerge Systeme; " +
      "(4) Angiogenese — VEGF-Aktivierung, Gefäßneubildung. " +
      "Evidenzlage: Über 100 präklinische Studien, hauptsächlich Rattenmodelle. Keine randomisierten klinischen Studien. " +
      "Confidence Score: 0.72 (starke präklinische Basis, fehlende Humandaten).",

    agentMedicalDisclaimer: DISCLAIMER,
    agentConfidenceScore: 0.72,
  },

  "tb-500": {
    agentSalesPitch:
      "TB-500 ist ein synthetisches Analogon von Thymosin Beta-4 (Tβ4), einem natürlich vorkommenden Peptid in nahezu allen menschlichen Zellen. " +
      "Es reguliert G-Aktin — das Bauprinzip jeder Zellbewegung. In präklinischen Studien zeigt TB-500 systemische Regenerationswirkung: " +
      "Herzmuskel, Skelettmuskel, Sehnen, Augen und ZNS. Besonders interessant: Kombination mit BPC-157 für synergistische Regeneration. " +
      "Research Use Only.",

    agentSupportFaq: [
      {
        q: "Was ist der Unterschied zwischen TB-500 und Thymosin Beta-4?",
        a: "TB-500 ist ein synthetisches Fragment von Thymosin Beta-4 (Aminosäuren 17-23: LKKTETQ). Es enthält den aktiven Kern des Moleküls und ist stabiler in der Herstellung.",
      },
      {
        q: "Für welche Forschungsbereiche wird TB-500 eingesetzt?",
        a: "Hauptsächlich: Herzregeneration nach Ischämie, Skelettmuskelregeneration, Sehnenheilung, Wundheilung, Neuroprotektion und Angiogenese.",
      },
      {
        q: "Wie wirkt TB-500 auf molekularer Ebene?",
        a: "TB-500 bindet an G-Aktin und reguliert das Verhältnis von G-Aktin zu F-Aktin. Dadurch fördert es Zellmigration, Proliferation und Differenzierung — grundlegende Prozesse jeder Geweberegeneration.",
      },
      {
        q: "Gibt es Humanstudien zu TB-500?",
        a: "Wie bei BPC-157: Die Datenlage ist überwiegend präklinisch. Einige Pilotdaten aus Sportmedizin-Kontext existieren, aber keine kontrollierten klinischen Studien.",
      },
      {
        q: "Kann TB-500 mit BPC-157 kombiniert werden?",
        a: "In präklinischen Modellen zeigen beide Peptide synergistische Effekte bei Geweberegeneration. Sie wirken über unterschiedliche Mechanismen (Aktin-Regulierung vs. VEGF/Angiogenese), was die Kombination theoretisch interessant macht.",
      },
      {
        q: "Wie wird TB-500 gelagert?",
        a: "Lyophilisiertes TB-500 ist bei -20°C stabil. Nach Rekonstitution sollte es bei 4°C gelagert und innerhalb weniger Tage verwendet werden.",
      },
    ],

    agentResearchContext:
      "TB-500 ist ein synthetisches Analogon des aktiven Fragments von Thymosin Beta-4 (Tβ4). " +
      "Thymosin Beta-4 ist eines der häufigsten intrazellulären Peptide im menschlichen Körper und spielt eine zentrale Rolle " +
      "in der Aktin-Dynamik. TB-500 enthält die Aktin-bindende Domäne (LKKTETQ). " +
      "Forschungsschwerpunkte: (1) Herzregeneration — Kardiomyozyten-Schutz nach Ischämie; " +
      "(2) Skelettmuskel — Satellitenzell-Aktivierung; (3) Sehnen/Bänder — Fibroblasten-Proliferation; " +
      "(4) Neuroprotektion — Oligodendrozyten-Differenzierung. " +
      "Evidenzlage: Solide präklinische Basis (Tier- und In-vitro-Studien), keine klinischen RCTs. " +
      "Confidence Score: 0.68 (gute präklinische Daten, Humanstudien fehlen).",

    agentMedicalDisclaimer: DISCLAIMER,
    agentConfidenceScore: 0.68,
  },

  "ghk-cu": {
    agentSalesPitch:
      "GHK-Cu (Glycyl-L-Histidyl-L-Lysin-Kupfer) ist ein natürlich vorkommendes Tripeptid-Kupfer-Komplex, " +
      "der im menschlichen Plasma, Urin und Speichel vorkommt. Mit dem Alter sinkt der GHK-Cu-Spiegel deutlich. " +
      "In der Forschung zeigt GHK-Cu außergewöhnliche Wirkung auf Kollagensynthese, Wundheilung und Genexpression — " +
      "es reguliert über 4.000 Gene. Besonders relevant für Hautforschung, Anti-Aging und Geweberegenerationsmodelle. " +
      "Research Use Only.",

    agentSupportFaq: [
      {
        q: "Was ist GHK-Cu und wo kommt es natürlich vor?",
        a: "GHK-Cu ist ein Tripeptid-Kupfer-Komplex, der natürlich im menschlichen Plasma (ca. 200 ng/ml bei Jungen, sinkend auf 80 ng/ml bei Älteren), Urin und Speichel vorkommt.",
      },
      {
        q: "Wie wirkt GHK-Cu auf die Haut?",
        a: "GHK-Cu stimuliert Fibroblasten zur Kollagen- und Elastinsynthese, fördert Angiogenese (VEGF-Aktivierung) und aktiviert antioxidative Enzyme (SOD, Katalase). In Hautforschungsmodellen zeigt es Wundheilungs- und Anti-Aging-Effekte.",
      },
      {
        q: "Was bedeutet 'reguliert 4.000 Gene'?",
        a: "Studien zeigen, dass GHK-Cu die Expression von über 4.000 Genen beeinflusst — darunter Gene für Kollagensynthese, Entzündungsregulation, DNA-Reparatur und Zellschutz. Dies macht es zu einem der am breitesten wirkenden Peptide in der Forschung.",
      },
      {
        q: "Für welche Forschungsbereiche wird GHK-Cu eingesetzt?",
        a: "Hauptsächlich: Hautregeneration und Anti-Aging-Forschung, Wundheilungsmodelle, Haarwachstumsforschung, Knochenregeneration und systemische Anti-Aging-Modelle.",
      },
      {
        q: "Wie unterscheidet sich GHK-Cu von anderen Kupfer-Peptiden?",
        a: "GHK-Cu ist das am besten erforschte Kupfer-Tripeptid. Die Kupfer-Koordination ist essentiell für seine biologische Aktivität — freies GHK ohne Kupfer zeigt deutlich reduzierte Wirkung in Forschungsmodellen.",
      },
    ],

    agentResearchContext:
      "GHK-Cu (Glycyl-L-Histidyl-L-Lysin-Kupfer) ist ein natürlich vorkommendes Tripeptid mit hoher Kupfer-Affinität. " +
      "Es wurde 1973 von Loren Pickart entdeckt. Molekulare Mechanismen: " +
      "(1) Kollagensynthese-Stimulation über Fibroblasten-Aktivierung; " +
      "(2) Angiogenese über VEGF und FGF-Aktivierung; " +
      "(3) Antioxidativer Schutz über SOD und Katalase; " +
      "(4) Epigenetische Regulation — beeinflusst über 4.000 Gene (Pickart et al., 2012). " +
      "Forschungsschwerpunkte: Dermatologie, Wundheilung, Anti-Aging, Haarwachstum, Knochenregeneration. " +
      "Evidenzlage: Gute In-vitro-Daten, einige Tier- und Pilot-Humanstudien (Kosmetik-Kontext). " +
      "Confidence Score: 0.65 (solide In-vitro-Basis, begrenzte klinische Daten).",

    agentMedicalDisclaimer: DISCLAIMER,
    agentConfidenceScore: 0.65,
  },

  "ss-31": {
    agentSalesPitch:
      "SS-31 (Elamipretide / MTP-131) ist ein synthetisches tetrapeptidisches Mitochondrien-Targeting-Peptid. " +
      "Es bindet spezifisch an Cardiolipin — einen Phospholipid-Komplex in der inneren Mitochondrienmembran. " +
      "In präklinischen Studien zeigt SS-31 außergewöhnliche Wirkung bei mitochondrialer Dysfunktion, " +
      "Herzinsuffizienz, Ischämie-Reperfusion und altersbedingtem Energieverlust. " +
      "Einzigartig: Es ist eines der wenigen Peptide mit klinischen Phase-II-Daten (Herzinsuffizienz). " +
      "Research Use Only.",

    agentSupportFaq: [
      {
        q: "Was ist SS-31 und wie unterscheidet es sich von anderen Peptiden?",
        a: "SS-31 (auch Elamipretide oder MTP-131) ist ein Mitochondrien-Targeting-Peptid. Es ist einzigartig, weil es spezifisch an Cardiolipin in der inneren Mitochondrienmembran bindet — ein Mechanismus, den kein anderes bekanntes Peptid teilt.",
      },
      {
        q: "Was ist Cardiolipin und warum ist es wichtig?",
        a: "Cardiolipin ist ein einzigartiger Phospholipid-Komplex, der fast ausschließlich in der inneren Mitochondrienmembran vorkommt. Es ist essentiell für die Funktion der Elektronentransportkette und ATP-Synthese. Mit dem Alter oxidiert Cardiolipin — SS-31 schützt es vor dieser Oxidation.",
      },
      {
        q: "Für welche Forschungsbereiche wird SS-31 eingesetzt?",
        a: "Hauptsächlich: Herzinsuffizienz und kardiale Ischämie, mitochondriale Dysfunktion, Nierenprotektion, Skelettmuskel-Alterung (Sarkopenie), neurodegenerative Erkrankungsmodelle.",
      },
      {
        q: "Gibt es klinische Daten zu SS-31?",
        a: "Ja — SS-31 (als Elamipretide) hat Phase-II-Studien bei Herzinsuffizienz mit reduzierter Ejektionsfraktion (HFrEF) durchlaufen. Das macht es zu einem der wenigen Peptide mit klinischen Daten. Die Ergebnisse waren gemischt, zeigten aber Sicherheit und Verträglichkeit.",
      },
      {
        q: "Wie wirkt SS-31 auf die ATP-Produktion?",
        a: "SS-31 stabilisiert Cardiolipin, was die Struktur der Cristae (Mitochondrienmembran-Einstülpungen) erhält. Dies optimiert die Effizienz der Elektronentransportkette und steigert die ATP-Synthese in Forschungsmodellen.",
      },
      {
        q: "Kann SS-31 mit anderen Compounds kombiniert werden?",
        a: "In Forschungsmodellen wird SS-31 häufig mit NAD+-Vorläufern (NMN, NR) kombiniert, da beide auf mitochondriale Funktion abzielen. Auch Kombination mit GHK-Cu (Anti-Aging-Stack) ist Gegenstand von Forschungsinteresse.",
      },
    ],

    agentResearchContext:
      "SS-31 (D-Arg-Dmt-Lys-Phe-NH2) ist ein synthetisches, zellpenetrierendes Tetrapeptid der Szeto-Schiller-Peptid-Familie. " +
      "Entwickelt von Hazel Szeto (Cornell University). Einzigartiger Mechanismus: Hochaffine Bindung an Cardiolipin " +
      "in der inneren Mitochondrienmembran (Kd ~100 nM). " +
      "Biologische Effekte: (1) Schutz vor Cardiolipin-Oxidation; (2) Erhalt der Cristae-Struktur; " +
      "(3) Optimierung der Elektronentransportkette (Komplex I–IV); (4) Reduktion mitochondrialer ROS. " +
      "Forschungsschwerpunkte: Herzinsuffizienz (Phase II: PROGRESS-HF Trial), " +
      "Ischämie-Reperfusion, Nierenprotektion (AKI-Modelle), Sarkopenie, Neurodegeneration. " +
      "Evidenzlage: Stärkste klinische Datenbasis aller 4 Compounds — Phase-II-Daten vorhanden. " +
      "Confidence Score: 0.78 (präklinisch + klinische Phase-II-Daten).",

    agentMedicalDisclaimer: DISCLAIMER,
    agentConfidenceScore: 0.78,
  },
};

export async function runAgentFieldsMigration() {
  console.log("[migrate-agent-fields] Starting...");

  // Check if already done
  const check = await db.execute(sql`
    SELECT agent_sales_pitch FROM entities
    WHERE slug = 'bpc-157' AND agent_sales_pitch IS NOT NULL
    LIMIT 1
  `) as any[];

  if (check.length > 0) {
    console.log("[migrate-agent-fields] Already done, skipping.");
    return;
  }

  let updated = 0;
  for (const [slug, data] of Object.entries(agentData)) {
    await db.execute(sql`
      UPDATE entities SET
        agent_sales_pitch = ${data.agentSalesPitch},
        agent_support_faq = ${JSON.stringify(data.agentSupportFaq)},
        agent_research_context = ${data.agentResearchContext},
        agent_medical_disclaimer = ${data.agentMedicalDisclaimer},
        agent_confidence_score = ${data.agentConfidenceScore},
        updated_at = NOW()
      WHERE slug = ${slug}
    `);
    console.log(`[migrate-agent-fields] Updated: ${slug}`);
    updated++;
  }

  console.log(`[migrate-agent-fields] Done. Updated ${updated} compounds.`);
}
