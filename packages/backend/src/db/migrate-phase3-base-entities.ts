/**
 * Phase 3 — Basis-Entity-Migration
 *
 * Baut das Fundament des semantischen Wissensgraphen:
 * Signalwege, Proteine, Enzyme, Rezeptoren, Biologische Prozesse,
 * Organe/Gewebe, Krankheiten, Biomarker, Symptome
 *
 * Alle Entities sind schema-validiert gegen schema.ts.
 * Sentinel: prüft ob bereits ≥ 50 Entities existieren.
 */

import { db } from "./index.js";
import { sql } from "drizzle-orm";

export async function runPhase3BaseEntities() {
  try {
    // Sentinel: prüft ob Migration bereits gelaufen
    const countResult = await db.execute(sql`SELECT COUNT(*) as cnt FROM entities`);
    const count = Number((countResult as any)[0]?.cnt ?? 0);

    if (count >= 60) {
      console.log(`[Phase3 Base] Already complete (${count} entities) — skipping`);
      return;
    }

    console.log(`[Phase3 Base] Starting — current entity count: ${count}`);

    // ── HELPER ────────────────────────────────────────────────────────────────
    const upsertEntity = async (entity: {
      id: string;
      slug: string;
      type: string;
      canonical_name: string;
      aliases?: string[];
      short_description?: string;
      categories?: string[];
      tags?: string[];
      seo_title?: string;
      seo_description?: string;
    }) => {
      try {
        await db.execute(sql`
          INSERT INTO entities (
            id, slug, type, canonical_name, aliases,
            short_description, categories, tags,
            seo_title, seo_description,
            lifecycle_status, status, content_completeness
          ) VALUES (
            ${entity.id}, ${entity.slug}, ${entity.type},
            ${entity.canonical_name},
            ${JSON.stringify(entity.aliases ?? [])}::jsonb,
            ${entity.short_description ?? null},
            ${JSON.stringify(entity.categories ?? [])}::jsonb,
            ${JSON.stringify(entity.tags ?? [])}::jsonb,
            ${entity.seo_title ?? null},
            ${entity.seo_description ?? null},
            'published', 'published', 30
          )
          ON CONFLICT (id) DO UPDATE SET
            canonical_name = EXCLUDED.canonical_name,
            aliases = EXCLUDED.aliases,
            short_description = EXCLUDED.short_description,
            categories = EXCLUDED.categories,
            tags = EXCLUDED.tags,
            seo_title = EXCLUDED.seo_title,
            seo_description = EXCLUDED.seo_description,
            lifecycle_status = 'published',
            status = 'published'
        `);
        return true;
      } catch (err: any) {
        console.error(`[Phase3 Base] FAILED: ${entity.id} — ${err?.message ?? String(err)}`);
        return false;
      }
    };

    let inserted = 0;

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. SIGNALWEGE (pathway)
    // ═══════════════════════════════════════════════════════════════════════════
    const pathways = [
      {
        id: "pi3k-akt-signalweg",
        slug: "pi3k-akt-signalweg",
        type: "pathway",
        canonical_name: "PI3K/Akt-Signalweg",
        aliases: ["PI3K/Akt", "Phosphoinositid-3-Kinase/Proteinkinase-B", "PI3K-Akt-mTOR"],
        short_description: "Zentraler Signalweg für Zellüberleben, Proliferation und Stoffwechsel. Aktiviert durch Wachstumsfaktoren und Peptide wie TB-500 und BPC-157.",
        categories: ["Signalweg", "Zellüberleben", "Proliferation"],
        tags: ["pi3k", "akt", "mtor", "zellüberleben", "proliferation", "apoptose", "signalweg"],
        seo_title: "PI3K/Akt-Signalweg — Funktion, Aktivierung & Bedeutung",
        seo_description: "Der PI3K/Akt-Signalweg reguliert Zellüberleben, Wachstum und Stoffwechsel. Zentral für die Wirkung von Regenerationspeptiden wie TB-500 und BPC-157.",
      },
      {
        id: "nf-kb-signalweg",
        slug: "nf-kb-signalweg",
        type: "pathway",
        canonical_name: "NF-κB-Signalweg",
        aliases: ["NF-kB", "Nuclear Factor kappa B", "NF-κB-Pathway"],
        short_description: "Hauptregulator der Entzündungsreaktion. Aktiviert proinflammatorische Gene. Wird durch TB-500 und BPC-157 gehemmt.",
        categories: ["Signalweg", "Entzündung", "Immunsystem"],
        tags: ["nf-kb", "entzündung", "zytokine", "immunsystem", "signalweg", "inflammation"],
        seo_title: "NF-κB-Signalweg — Entzündungsregulation & Hemmung",
        seo_description: "NF-κB ist der zentrale Transkriptionsfaktor der Entzündungsreaktion. Peptide wie TB-500 und BPC-157 hemmen diesen Signalweg.",
      },
      {
        id: "mapk-erk-signalweg",
        slug: "mapk-erk-signalweg",
        type: "pathway",
        canonical_name: "MAPK/ERK-Signalweg",
        aliases: ["MAPK", "ERK", "Ras-MAPK", "MEK-ERK"],
        short_description: "Mitogen-aktivierter Proteinkinase-Signalweg. Reguliert Zellproliferation, Differenzierung und Überleben.",
        categories: ["Signalweg", "Proliferation", "Differenzierung"],
        tags: ["mapk", "erk", "ras", "proliferation", "differenzierung", "signalweg"],
        seo_title: "MAPK/ERK-Signalweg — Zellproliferation & Differenzierung",
        seo_description: "Der MAPK/ERK-Signalweg reguliert Zellwachstum und Differenzierung. Relevant für Regenerationsprozesse und Tumorbiologie.",
      },
      {
        id: "mtor-signalweg",
        slug: "mtor-signalweg",
        type: "pathway",
        canonical_name: "mTOR-Signalweg",
        aliases: ["mTOR", "mechanistic Target of Rapamycin", "mTORC1", "mTORC2"],
        short_description: "Zentraler Regulator von Zellwachstum, Proteinsynthese und Autophagie. Schlüsselweg für Muskelaufbau und Longevity.",
        categories: ["Signalweg", "Proteinsynthese", "Autophagie", "Longevity"],
        tags: ["mtor", "proteinsynthese", "autophagie", "muskelaufbau", "longevity", "rapamycin"],
        seo_title: "mTOR-Signalweg — Muskelaufbau, Autophagie & Longevity",
        seo_description: "mTOR reguliert Proteinsynthese, Zellwachstum und Autophagie. Zentral für Muskelaufbau, Regeneration und Longevity-Strategien.",
      },
      {
        id: "wnt-signalweg",
        slug: "wnt-signalweg",
        type: "pathway",
        canonical_name: "Wnt-Signalweg",
        aliases: ["Wnt", "Wingless", "β-Catenin-Signalweg"],
        short_description: "Reguliert Stammzellaktivierung, Geweberegeneration und Knochenaufbau. Relevant für GHK-Cu und Kollagensynthese.",
        categories: ["Signalweg", "Stammzellen", "Regeneration", "Knochen"],
        tags: ["wnt", "beta-catenin", "stammzellen", "knochen", "regeneration", "kollagen"],
        seo_title: "Wnt-Signalweg — Stammzellen, Knochen & Geweberegeneration",
        seo_description: "Der Wnt-Signalweg aktiviert Stammzellen und reguliert Knochenaufbau sowie Geweberegeneration.",
      },
      {
        id: "ampk-signalweg",
        slug: "ampk-signalweg",
        type: "pathway",
        canonical_name: "AMPK-Signalweg",
        aliases: ["AMPK", "AMP-aktivierte Proteinkinase", "Energiesensor"],
        short_description: "Zentraler Energiesensor der Zelle. Aktiviert bei Energiemangel, fördert Fettverbrennung und Autophagie. Relevant für Metabolic Compounds.",
        categories: ["Signalweg", "Stoffwechsel", "Fettverbrennung", "Longevity"],
        tags: ["ampk", "stoffwechsel", "fettverbrennung", "autophagie", "longevity", "energiesensor"],
        seo_title: "AMPK-Signalweg — Energiestoffwechsel & Fettverbrennung",
        seo_description: "AMPK ist der Energiesensor der Zelle und reguliert Fettverbrennung, Autophagie und Longevity-Prozesse.",
      },
      {
        id: "tgf-beta-signalweg",
        slug: "tgf-beta-signalweg",
        type: "pathway",
        canonical_name: "TGF-β-Signalweg",
        aliases: ["TGF-beta", "Transforming Growth Factor Beta", "TGF-β/Smad"],
        short_description: "Reguliert Fibrose, Wundheilung und Immunmodulation. Übermäßige Aktivierung führt zu Narbenbildung.",
        categories: ["Signalweg", "Fibrose", "Wundheilung", "Immunsystem"],
        tags: ["tgf-beta", "fibrose", "wundheilung", "smad", "narbenbildung", "immunmodulation"],
        seo_title: "TGF-β-Signalweg — Fibrose, Wundheilung & Immunmodulation",
        seo_description: "TGF-β reguliert Wundheilung und Fibrose. Übermäßige Aktivierung führt zu Narbengewebe.",
      },
      {
        id: "jak-stat-signalweg",
        slug: "jak-stat-signalweg",
        type: "pathway",
        canonical_name: "JAK/STAT-Signalweg",
        aliases: ["JAK-STAT", "Janus Kinase/Signal Transducer"],
        short_description: "Vermittelt Signale von Zytokinen und Wachstumsfaktoren. Reguliert Immunantwort, Entzündung und Zellproliferation.",
        categories: ["Signalweg", "Immunsystem", "Entzündung", "Zytokine"],
        tags: ["jak", "stat", "zytokine", "immunsystem", "entzündung", "signalweg"],
        seo_title: "JAK/STAT-Signalweg — Zytokin-Signaling & Immunantwort",
        seo_description: "Der JAK/STAT-Signalweg vermittelt Zytokin-Signale und reguliert Immunantwort und Entzündung.",
      },
    ];

    for (const e of pathways) {
      if (await upsertEntity(e)) inserted++;
    }
    console.log(`[Phase3 Base] Pathways inserted: ${inserted}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. PROTEINE (protein)
    // ═══════════════════════════════════════════════════════════════════════════
    const proteins = [
      {
        id: "aktin",
        slug: "aktin",
        type: "protein",
        canonical_name: "Aktin",
        aliases: ["Actin", "G-Aktin", "F-Aktin", "Beta-Aktin"],
        short_description: "Ubiquitäres Strukturprotein des Zytoskeletts. Primäres Bindungsziel von TB-500 (Thymosin Beta-4). Reguliert Zellmigration und -form.",
        categories: ["Protein", "Zytoskelett", "Strukturprotein"],
        tags: ["aktin", "zytoskelett", "zellmigration", "tb-500", "thymosin-beta-4", "g-aktin", "f-aktin"],
        seo_title: "Aktin — Zytoskelett-Protein & Bindungsziel von TB-500",
        seo_description: "Aktin ist das zentrale Strukturprotein des Zytoskeletts und primäres Bindungsziel von TB-500 (Thymosin Beta-4).",
      },
      {
        id: "vegf",
        slug: "vegf",
        type: "protein",
        canonical_name: "VEGF",
        aliases: ["Vascular Endothelial Growth Factor", "VEGF-A", "Gefäßwachstumsfaktor"],
        short_description: "Wichtigster Angiogenese-Wachstumsfaktor. Wird durch TB-500 und BPC-157 hochreguliert. Fördert Neubildung von Blutgefäßen.",
        categories: ["Protein", "Wachstumsfaktor", "Angiogenese"],
        tags: ["vegf", "angiogenese", "blutgefäße", "wachstumsfaktor", "tb-500", "bpc-157"],
        seo_title: "VEGF — Angiogenese-Wachstumsfaktor & Gefäßneubildung",
        seo_description: "VEGF ist der zentrale Wachstumsfaktor für Angiogenese. Wird durch Regenerationspeptide wie TB-500 und BPC-157 aktiviert.",
      },
      {
        id: "bcl-2",
        slug: "bcl-2",
        type: "protein",
        canonical_name: "BCL-2",
        aliases: ["B-cell lymphoma 2", "Anti-Apoptose-Protein", "BCL2"],
        short_description: "Anti-apoptotisches Protein. Schützt Zellen vor programmierten Zelltod. Wird durch PI3K/Akt-Aktivierung hochreguliert.",
        categories: ["Protein", "Apoptose", "Zellüberleben"],
        tags: ["bcl-2", "apoptose", "zellüberleben", "anti-apoptose", "pi3k-akt"],
        seo_title: "BCL-2 — Anti-Apoptose-Protein & Zellüberleben",
        seo_description: "BCL-2 schützt Zellen vor Apoptose und wird durch den PI3K/Akt-Signalweg reguliert.",
      },
      {
        id: "kollagen",
        slug: "kollagen",
        type: "protein",
        canonical_name: "Kollagen",
        aliases: ["Collagen", "Kollagen Typ I", "Kollagen Typ III", "Bindegewebsprotein"],
        short_description: "Häufigstes Strukturprotein im menschlichen Körper. Grundlage von Haut, Sehnen, Knochen und Bindegewebe. Synthese wird durch GHK-Cu stimuliert.",
        categories: ["Protein", "Strukturprotein", "Bindegewebe", "Haut"],
        tags: ["kollagen", "haut", "sehnen", "knochen", "bindegewebe", "ghk-cu", "wundheilung"],
        seo_title: "Kollagen — Strukturprotein für Haut, Sehnen & Knochen",
        seo_description: "Kollagen ist das wichtigste Strukturprotein des Körpers. GHK-Cu stimuliert die Kollagensynthese für Haut und Bindegewebe.",
      },
      {
        id: "igf-1",
        slug: "igf-1",
        type: "protein",
        canonical_name: "IGF-1",
        aliases: ["Insulin-like Growth Factor 1", "Somatomedin C", "Wachstumsfaktor"],
        short_description: "Wachstumsfaktor der GH-Achse. Mediiert anabole Effekte des Wachstumshormons. Relevant für Muskelaufbau und Regeneration.",
        categories: ["Protein", "Wachstumsfaktor", "GH-Achse", "Muskelaufbau"],
        tags: ["igf-1", "wachstumshormon", "muskelaufbau", "gh-achse", "anabolismus", "regeneration"],
        seo_title: "IGF-1 — Wachstumsfaktor der GH-Achse & Muskelaufbau",
        seo_description: "IGF-1 mediiert die anabolen Effekte des Wachstumshormons und ist zentral für Muskelaufbau und Regeneration.",
      },
      {
        id: "hif-1alpha",
        slug: "hif-1alpha",
        type: "protein",
        canonical_name: "HIF-1α",
        aliases: ["Hypoxia-Inducible Factor 1-alpha", "HIF-1alpha", "Hypoxie-Transkriptionsfaktor"],
        short_description: "Transkriptionsfaktor der Hypoxie-Antwort. Aktiviert Angiogenese und Glykolyse bei Sauerstoffmangel. Reguliert VEGF-Expression.",
        categories: ["Protein", "Transkriptionsfaktor", "Hypoxie", "Angiogenese"],
        tags: ["hif-1alpha", "hypoxie", "angiogenese", "vegf", "sauerstoff", "transkriptionsfaktor"],
        seo_title: "HIF-1α — Hypoxie-Transkriptionsfaktor & Angiogenese",
        seo_description: "HIF-1α aktiviert bei Sauerstoffmangel die Angiogenese und reguliert VEGF-Expression.",
      },
      {
        id: "superoxid-dismutase",
        slug: "superoxid-dismutase",
        type: "enzyme",
        canonical_name: "Superoxid-Dismutase",
        aliases: ["SOD", "SOD1", "SOD2", "Antioxidatives Enzym"],
        short_description: "Wichtigstes antioxidatives Enzym. Neutralisiert reaktive Sauerstoffspezies (ROS). Relevant für Mitochondrienschutz und SS-31.",
        categories: ["Enzym", "Antioxidans", "Mitochondrien", "Oxidativer Stress"],
        tags: ["sod", "antioxidans", "ros", "oxidativer-stress", "mitochondrien", "ss-31"],
        seo_title: "Superoxid-Dismutase (SOD) — Antioxidatives Enzym & Mitochondrienschutz",
        seo_description: "SOD ist das zentrale antioxidative Enzym und schützt Mitochondrien vor oxidativem Stress.",
      },
      {
        id: "kupfer-peptid-komplex",
        slug: "kupfer-peptid-komplex",
        type: "protein",
        canonical_name: "Kupfer-Peptid-Komplex",
        aliases: ["GHK-Cu Komplex", "Glycyl-L-histidyl-L-lysin-Kupfer", "Copper Peptide"],
        short_description: "Natürlich vorkommender Kupfer-Peptid-Komplex im menschlichen Plasma. Stimuliert Kollagensynthese, Wundheilung und Haarwachstum.",
        categories: ["Protein", "Kupfer", "Haut", "Wundheilung"],
        tags: ["ghk-cu", "kupfer", "kollagen", "wundheilung", "haut", "haarwachstum"],
        seo_title: "GHK-Cu Kupfer-Peptid-Komplex — Kollagen & Hautverjüngung",
        seo_description: "GHK-Cu ist ein natürlicher Kupfer-Peptid-Komplex der Kollagensynthese stimuliert und Hautalterung entgegenwirkt.",
      },
    ];

    const startCount = inserted;
    for (const e of proteins) {
      if (await upsertEntity(e)) inserted++;
    }
    console.log(`[Phase3 Base] Proteins/Enzymes inserted: ${inserted - startCount}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. BIOLOGISCHE PROZESSE (biological_process)
    // ═══════════════════════════════════════════════════════════════════════════
    const processes = [
      {
        id: "zellmigration",
        slug: "zellmigration",
        type: "biological_process",
        canonical_name: "Zellmigration",
        aliases: ["Cell Migration", "Chemotaxis", "Zellwanderung"],
        short_description: "Gerichtete Bewegung von Zellen zu Verletzungsstellen. Fundamental für Wundheilung und Immunantwort. Wird durch TB-500 über Aktin-Regulation gefördert.",
        categories: ["Biologischer Prozess", "Wundheilung", "Immunsystem"],
        tags: ["zellmigration", "chemotaxis", "wundheilung", "aktin", "tb-500", "immunantwort"],
        seo_title: "Zellmigration — Wundheilung & Immunantwort",
        seo_description: "Zellmigration ist die gerichtete Bewegung von Zellen zur Verletzungsstelle — fundamental für Wundheilung.",
      },
      {
        id: "autophagie",
        slug: "autophagie",
        type: "biological_process",
        canonical_name: "Autophagie",
        aliases: ["Autophagy", "Zellselbstreinigung", "Makroautophagie"],
        short_description: "Zellulärer Selbstreinigungsprozess. Abbau beschädigter Organellen und Proteine. Zentral für Longevity und Zellgesundheit.",
        categories: ["Biologischer Prozess", "Longevity", "Zellgesundheit"],
        tags: ["autophagie", "longevity", "zellgesundheit", "mtor", "ampk", "mitochondrien"],
        seo_title: "Autophagie — Zelluläre Selbstreinigung & Longevity",
        seo_description: "Autophagie ist der zelluläre Selbstreinigungsprozess und zentral für Longevity und Zellgesundheit.",
      },
      {
        id: "mitochondriale-biogenese",
        slug: "mitochondriale-biogenese",
        type: "biological_process",
        canonical_name: "Mitochondriale Biogenese",
        aliases: ["Mitochondrienbildung", "PGC-1α-Aktivierung", "Mitochondrial Biogenesis"],
        short_description: "Neubildung von Mitochondrien. Verbessert zelluläre Energieproduktion und Ausdauer. Wird durch SS-31 und AMPK-Aktivierung gefördert.",
        categories: ["Biologischer Prozess", "Mitochondrien", "Energie", "Longevity"],
        tags: ["mitochondrien", "biogenese", "pgc-1alpha", "energie", "ss-31", "ampk", "ausdauer"],
        seo_title: "Mitochondriale Biogenese — Energieproduktion & Longevity",
        seo_description: "Mitochondriale Biogenese ist die Neubildung von Mitochondrien und zentral für Energie und Longevity.",
      },
      {
        id: "oxidativer-stress",
        slug: "oxidativer-stress",
        type: "biological_process",
        canonical_name: "Oxidativer Stress",
        aliases: ["Reactive Oxygen Species", "ROS", "Freie Radikale"],
        short_description: "Ungleichgewicht zwischen freien Radikalen und Antioxidantien. Schädigt Zellen, DNA und Mitochondrien. Zentral für Alterungsprozesse.",
        categories: ["Biologischer Prozess", "Oxidativer Stress", "Alterung"],
        tags: ["oxidativer-stress", "ros", "freie-radikale", "alterung", "mitochondrien", "antioxidans"],
        seo_title: "Oxidativer Stress — Freie Radikale & Zellschäden",
        seo_description: "Oxidativer Stress durch freie Radikale schädigt Zellen und Mitochondrien und treibt Alterungsprozesse voran.",
      },
      {
        id: "kollagensynthese",
        slug: "kollagensynthese",
        type: "biological_process",
        canonical_name: "Kollagensynthese",
        aliases: ["Collagen Synthesis", "Kollagenproduktion", "Fibroblastenaktivierung"],
        short_description: "Produktion von Kollagen durch Fibroblasten. Fundamental für Hautstruktur, Wundheilung und Bindegewebe. Wird durch GHK-Cu stimuliert.",
        categories: ["Biologischer Prozess", "Haut", "Wundheilung", "Bindegewebe"],
        tags: ["kollagen", "synthese", "fibroblasten", "haut", "ghk-cu", "wundheilung", "bindegewebe"],
        seo_title: "Kollagensynthese — Hautstruktur & Wundheilung",
        seo_description: "Kollagensynthese durch Fibroblasten ist fundamental für Hautstruktur und Wundheilung. GHK-Cu stimuliert diesen Prozess.",
      },
      {
        id: "apoptose",
        slug: "apoptose",
        type: "biological_process",
        canonical_name: "Apoptose",
        aliases: ["Programmierter Zelltod", "Apoptosis", "Zellsuizid"],
        short_description: "Programmierter Zelltod. Eliminiert beschädigte oder überflüssige Zellen. Dysregulation führt zu Krebs oder Neurodegeneration.",
        categories: ["Biologischer Prozess", "Zellbiologie", "Krebs", "Neurodegeneration"],
        tags: ["apoptose", "zelltod", "bcl-2", "caspase", "krebs", "neurodegeneration"],
        seo_title: "Apoptose — Programmierter Zelltod & Zellhomöostase",
        seo_description: "Apoptose ist der programmierte Zelltod und essentiell für die Zellhomöostase. Dysregulation ist mit Krebs assoziiert.",
      },
      {
        id: "neurogenese",
        slug: "neurogenese",
        type: "biological_process",
        canonical_name: "Neurogenese",
        aliases: ["Neuronal Regeneration", "Nervenzellneubildung", "Adult Neurogenesis"],
        short_description: "Neubildung von Nervenzellen. Findet im adulten Gehirn im Hippocampus statt. Relevant für kognitive Funktion und Neuroprotektion.",
        categories: ["Biologischer Prozess", "Neurologie", "Kognition"],
        tags: ["neurogenese", "nervenzellen", "hippocampus", "kognition", "neuroprotektion", "bdnf"],
        seo_title: "Neurogenese — Nervenzellneubildung & kognitive Funktion",
        seo_description: "Neurogenese ist die Neubildung von Nervenzellen und relevant für kognitive Funktion und Neuroprotektion.",
      },
    ];

    const startCount2 = inserted;
    for (const e of processes) {
      if (await upsertEntity(e)) inserted++;
    }
    console.log(`[Phase3 Base] Biological processes inserted: ${inserted - startCount2}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. ORGANE & GEWEBE (organ / tissue)
    // ═══════════════════════════════════════════════════════════════════════════
    const organs = [
      {
        id: "leber",
        slug: "leber",
        type: "organ",
        canonical_name: "Leber",
        aliases: ["Hepar", "Liver"],
        short_description: "Zentrales Stoffwechselorgan. Reguliert Glukose, Fette und Entgiftung. Relevant für Metabolic Compounds und GLP-1-Agonisten.",
        categories: ["Organ", "Stoffwechsel", "Entgiftung"],
        tags: ["leber", "stoffwechsel", "glukose", "entgiftung", "metabolismus", "glp-1"],
        seo_title: "Leber — Stoffwechselorgan & Entgiftung",
        seo_description: "Die Leber ist das zentrale Stoffwechselorgan und reguliert Glukose, Fette und Entgiftung.",
      },
      {
        id: "niere",
        slug: "niere",
        type: "organ",
        canonical_name: "Niere",
        aliases: ["Ren", "Kidney"],
        short_description: "Filtrationsorgan für Blut. Reguliert Elektrolyte, Blutdruck und Ausscheidung. Relevant für Biomarker und Nierenerkrankungen.",
        categories: ["Organ", "Filtration", "Elektrolyte"],
        tags: ["niere", "filtration", "elektrolyte", "blutdruck", "ausscheidung", "biomarker"],
        seo_title: "Niere — Filtrationsorgan & Elektrolytregulation",
        seo_description: "Die Niere filtert das Blut und reguliert Elektrolyte und Blutdruck.",
      },
      {
        id: "haut",
        slug: "haut",
        type: "organ",
        canonical_name: "Haut",
        aliases: ["Cutis", "Skin", "Integument"],
        short_description: "Größtes Organ des Körpers. Schutzbarriere, Temperaturregulation und Sinnesorgan. Zentrales Target für GHK-Cu und Kosmetik-Compounds.",
        categories: ["Organ", "Haut", "Kosmetik", "Schutzbarriere"],
        tags: ["haut", "kollagen", "ghk-cu", "kosmetik", "wundheilung", "anti-aging", "elastin"],
        seo_title: "Haut — Schutzbarriere & Target für Kosmetik-Compounds",
        seo_description: "Die Haut ist das größte Organ und zentrales Target für Kosmetik-Compounds wie GHK-Cu.",
      },
      {
        id: "skelettmuskel",
        slug: "skelettmuskel",
        type: "tissue",
        canonical_name: "Skelettmuskel",
        aliases: ["Skeletal Muscle", "Quergestreifter Muskel", "Muskelgewebe"],
        short_description: "Aktives Bewegungsgewebe. Wichtigster Glukosespeicher. Relevant für Muskelaufbau, GH-Achse und Regenerationspeptide.",
        categories: ["Gewebe", "Muskel", "Bewegung", "Stoffwechsel"],
        tags: ["skelettmuskel", "muskelaufbau", "gh-achse", "igf-1", "satellitenzellen", "regeneration"],
        seo_title: "Skelettmuskel — Muskelgewebe & Regeneration",
        seo_description: "Skelettmuskel ist das aktive Bewegungsgewebe und zentrales Target für Muskelaufbau und Regeneration.",
      },
      {
        id: "knochenmark",
        slug: "knochenmark",
        type: "tissue",
        canonical_name: "Knochenmark",
        aliases: ["Bone Marrow", "Medulla ossium"],
        short_description: "Blutbildendes Gewebe. Enthält hämatopoetische Stammzellen. Relevant für Immunsystem und Regeneration.",
        categories: ["Gewebe", "Blutbildung", "Stammzellen", "Immunsystem"],
        tags: ["knochenmark", "stammzellen", "blutbildung", "immunsystem", "hämatopoese"],
        seo_title: "Knochenmark — Blutbildung & Stammzellen",
        seo_description: "Das Knochenmark ist das blutbildende Gewebe und enthält hämatopoetische Stammzellen.",
      },
      {
        id: "darm",
        slug: "darm",
        type: "organ",
        canonical_name: "Darm",
        aliases: ["Intestinum", "Gut", "Gastrointestinaltrakt"],
        short_description: "Verdauungs- und Immunorgan. Enthält 70% der Immunzellen. Relevant für GLP-1-Agonisten, BPC-157 und das Mikrobiom.",
        categories: ["Organ", "Verdauung", "Immunsystem", "Mikrobiom"],
        tags: ["darm", "mikrobiom", "glp-1", "bpc-157", "immunsystem", "verdauung", "darmflora"],
        seo_title: "Darm — Verdauung, Immunsystem & Mikrobiom",
        seo_description: "Der Darm ist das zentrale Verdauungs- und Immunorgan mit 70% der Immunzellen.",
      },
    ];

    const startCount3 = inserted;
    for (const e of organs) {
      if (await upsertEntity(e)) inserted++;
    }
    console.log(`[Phase3 Base] Organs/Tissues inserted: ${inserted - startCount3}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. KRANKHEITEN (disease)
    // ═══════════════════════════════════════════════════════════════════════════
    const diseases = [
      {
        id: "herzinfarkt",
        slug: "herzinfarkt",
        type: "disease",
        canonical_name: "Herzinfarkt",
        aliases: ["Myokardinfarkt", "Akutes Koronarsyndrom", "MI", "Heart Attack"],
        short_description: "Absterben von Herzmuskelgewebe durch Sauerstoffmangel. Häufigste Todesursache weltweit. TB-500 zeigt in Tiermodellen kardioprotektive Effekte.",
        categories: ["Erkrankung", "Herz-Kreislauf", "Notfall"],
        tags: ["herzinfarkt", "myokardinfarkt", "herz", "tb-500", "kardiovaskulär", "ischämie"],
        seo_title: "Herzinfarkt — Ursachen, Mechanismen & Forschungsansätze",
        seo_description: "Herzinfarkt durch Sauerstoffmangel im Herzmuskel. TB-500 zeigt in Tiermodellen kardioprotektive Effekte.",
      },
      {
        id: "diabetes-typ-2",
        slug: "diabetes-typ-2",
        type: "disease",
        canonical_name: "Diabetes mellitus Typ 2",
        aliases: ["T2DM", "Typ-2-Diabetes", "Insulinresistenz", "Zuckerkrankheit"],
        short_description: "Metabolische Erkrankung mit Insulinresistenz und erhöhtem Blutzucker. Zentrales Target für GLP-1-Agonisten wie Retatrutide.",
        categories: ["Erkrankung", "Stoffwechsel", "Metabolisch"],
        tags: ["diabetes", "insulinresistenz", "blutzucker", "glp-1", "retatrutide", "metabolismus"],
        seo_title: "Diabetes Typ 2 — Insulinresistenz & GLP-1-Therapie",
        seo_description: "Diabetes Typ 2 ist eine metabolische Erkrankung mit Insulinresistenz. GLP-1-Agonisten wie Retatrutide sind zentrale Therapieansätze.",
      },
      {
        id: "adipositas",
        slug: "adipositas",
        type: "disease",
        canonical_name: "Adipositas",
        aliases: ["Fettleibigkeit", "Obesity", "BMI > 30"],
        short_description: "Chronische Erkrankung mit übermäßiger Fettansammlung. Zentrales Target für GLP-1-Agonisten und Metabolic Compounds.",
        categories: ["Erkrankung", "Stoffwechsel", "Metabolisch"],
        tags: ["adipositas", "übergewicht", "glp-1", "retatrutide", "fettverbrennung", "metabolismus"],
        seo_title: "Adipositas — Ursachen, Mechanismen & GLP-1-Therapie",
        seo_description: "Adipositas ist eine chronische Erkrankung mit übermäßiger Fettansammlung. GLP-1-Agonisten sind wirksame Therapieansätze.",
      },
      {
        id: "osteoporose",
        slug: "osteoporose",
        type: "disease",
        canonical_name: "Osteoporose",
        aliases: ["Knochenschwund", "Osteoporosis"],
        short_description: "Erkrankung mit verminderter Knochendichte und erhöhtem Frakturrisiko. Relevant für Wnt-Signalweg und Kollagensynthese.",
        categories: ["Erkrankung", "Knochen", "Alterung"],
        tags: ["osteoporose", "knochen", "knochendichte", "kollagen", "wnt", "fraktur", "alterung"],
        seo_title: "Osteoporose — Knochenschwund & Therapieansätze",
        seo_description: "Osteoporose ist eine Erkrankung mit verminderter Knochendichte und erhöhtem Frakturrisiko.",
      },
      {
        id: "chronische-entzuendung",
        slug: "chronische-entzuendung",
        type: "disease",
        canonical_name: "Chronische Entzündung",
        aliases: ["Chronic Inflammation", "Silent Inflammation", "Low-grade Inflammation"],
        short_description: "Anhaltende niedriggradige Entzündungsreaktion. Treiber von Alterung, Krebs und metabolischen Erkrankungen. Ziel vieler Longevity-Interventionen.",
        categories: ["Erkrankung", "Entzündung", "Alterung", "Longevity"],
        tags: ["chronische-entzündung", "inflammaging", "alterung", "longevity", "nf-kb", "zytokine"],
        seo_title: "Chronische Entzündung — Inflammaging & Longevity",
        seo_description: "Chronische Entzündung ist ein zentraler Treiber von Alterung und metabolischen Erkrankungen.",
      },
      {
        id: "sarcopenie",
        slug: "sarcopenie",
        type: "disease",
        canonical_name: "Sarkopenie",
        aliases: ["Sarcopenia", "Muskelschwund", "Altersatrophie"],
        short_description: "Altersbedingte Abnahme von Muskelmasse und -kraft. Zentrales Longevity-Problem. Relevant für GH-Achse, IGF-1 und Regenerationspeptide.",
        categories: ["Erkrankung", "Muskel", "Alterung", "Longevity"],
        tags: ["sarkopenie", "muskelschwund", "alterung", "gh-achse", "igf-1", "longevity", "muskelaufbau"],
        seo_title: "Sarkopenie — Muskelschwund im Alter & Gegenmaßnahmen",
        seo_description: "Sarkopenie ist der altersbedingte Muskelschwund und ein zentrales Longevity-Problem.",
      },
      {
        id: "neurodegenerative-erkrankungen",
        slug: "neurodegenerative-erkrankungen",
        type: "disease",
        canonical_name: "Neurodegenerative Erkrankungen",
        aliases: ["Neurodegeneration", "Alzheimer", "Parkinson", "ALS"],
        short_description: "Erkrankungen mit progressivem Nervenzellverlust. Relevant für Neuroprotektion, oxidativen Stress und Mitochondrienfunktion.",
        categories: ["Erkrankung", "Neurologie", "Neurodegeneration"],
        tags: ["neurodegeneration", "alzheimer", "parkinson", "neuroprotektion", "mitochondrien", "oxidativer-stress"],
        seo_title: "Neurodegenerative Erkrankungen — Neuroprotektion & Forschung",
        seo_description: "Neurodegenerative Erkrankungen sind durch progressiven Nervenzellverlust gekennzeichnet. Neuroprotektion ist ein zentrales Forschungsfeld.",
      },
    ];

    const startCount4 = inserted;
    for (const e of diseases) {
      if (await upsertEntity(e)) inserted++;
    }
    console.log(`[Phase3 Base] Diseases inserted: ${inserted - startCount4}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. BIOMARKER (biomarker)
    // ═══════════════════════════════════════════════════════════════════════════
    const biomarkers = [
      {
        id: "crp-biomarker",
        slug: "crp-biomarker",
        type: "biomarker",
        canonical_name: "C-reaktives Protein (CRP)",
        aliases: ["CRP", "C-Reactive Protein", "Entzündungsmarker"],
        short_description: "Wichtigster Entzündungsmarker im Blut. Erhöht bei akuter und chronischer Entzündung. Relevant für Monitoring von Anti-Inflammatoria.",
        categories: ["Biomarker", "Entzündung", "Laborparameter"],
        tags: ["crp", "entzündungsmarker", "blut", "laborparameter", "entzündung", "monitoring"],
        seo_title: "CRP — Entzündungsmarker & Laborparameter",
        seo_description: "CRP ist der wichtigste Entzündungsmarker im Blut und relevant für das Monitoring von Entzündungserkrankungen.",
      },
      {
        id: "il-6-biomarker",
        slug: "il-6-biomarker",
        type: "biomarker",
        canonical_name: "Interleukin-6 (IL-6)",
        aliases: ["IL-6", "Interleukin 6", "Zytokin"],
        short_description: "Proinflammatorisches Zytokin. Erhöht bei Entzündung und Muskelaktivität. Wird durch NF-κB-Hemmung reduziert.",
        categories: ["Biomarker", "Zytokin", "Entzündung"],
        tags: ["il-6", "zytokin", "entzündung", "nf-kb", "muskel", "immunsystem"],
        seo_title: "IL-6 — Proinflammatorisches Zytokin & Entzündungsmarker",
        seo_description: "IL-6 ist ein proinflammatorisches Zytokin und wichtiger Entzündungsmarker.",
      },
      {
        id: "hba1c-biomarker",
        slug: "hba1c-biomarker",
        type: "biomarker",
        canonical_name: "HbA1c",
        aliases: ["Glykohämoglobin", "Langzeitblutzucker", "Glycated Hemoglobin"],
        short_description: "Langzeitblutzuckermarker. Zeigt durchschnittlichen Blutzucker der letzten 3 Monate. Zentraler Marker für Diabetes-Monitoring.",
        categories: ["Biomarker", "Diabetes", "Blutzucker", "Laborparameter"],
        tags: ["hba1c", "blutzucker", "diabetes", "laborparameter", "glp-1", "monitoring"],
        seo_title: "HbA1c — Langzeitblutzucker & Diabetes-Monitoring",
        seo_description: "HbA1c ist der Langzeitblutzuckermarker und zentraler Parameter für das Diabetes-Monitoring.",
      },
      {
        id: "igf-1-biomarker",
        slug: "igf-1-biomarker",
        type: "biomarker",
        canonical_name: "IGF-1 (Labormarker)",
        aliases: ["IGF-1 Spiegel", "Somatomedin C Laborwert"],
        short_description: "Labormarker für GH-Achsen-Aktivität. Zeigt anabolen Status und Wachstumshormon-Wirkung. Relevant für GH-Achsen-Optimierung.",
        categories: ["Biomarker", "GH-Achse", "Laborparameter"],
        tags: ["igf-1", "gh-achse", "wachstumshormon", "laborparameter", "anabolismus"],
        seo_title: "IGF-1 Labormarker — GH-Achse & Anabolismus",
        seo_description: "IGF-1 als Labormarker zeigt die GH-Achsen-Aktivität und den anabolen Status.",
      },
    ];

    const startCount5 = inserted;
    for (const e of biomarkers) {
      if (await upsertEntity(e)) inserted++;
    }
    console.log(`[Phase3 Base] Biomarkers inserted: ${inserted - startCount5}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. REZEPTOREN (receptor)
    // ═══════════════════════════════════════════════════════════════════════════
    const receptors = [
      {
        id: "glp-1-rezeptor",
        slug: "glp-1-rezeptor",
        type: "receptor",
        canonical_name: "GLP-1-Rezeptor",
        aliases: ["GLP-1R", "Glucagon-like Peptide-1 Receptor"],
        short_description: "G-Protein-gekoppelter Rezeptor für GLP-1. Target von GLP-1-Agonisten wie Retatrutide. Reguliert Insulinsekretion und Sättigung.",
        categories: ["Rezeptor", "Stoffwechsel", "Diabetes", "GLP-1"],
        tags: ["glp-1-rezeptor", "glp-1", "retatrutide", "insulin", "sättigung", "diabetes"],
        seo_title: "GLP-1-Rezeptor — Target von GLP-1-Agonisten",
        seo_description: "Der GLP-1-Rezeptor ist das Target von GLP-1-Agonisten wie Retatrutide und reguliert Insulinsekretion und Sättigung.",
      },
      {
        id: "androgen-rezeptor",
        slug: "androgen-rezeptor",
        type: "receptor",
        canonical_name: "Androgen-Rezeptor",
        aliases: ["AR", "Testosteron-Rezeptor", "Androgen Receptor"],
        short_description: "Nukleärer Rezeptor für Androgene wie Testosteron. Reguliert Muskelaufbau, Knochendichte und Sexualfunktion.",
        categories: ["Rezeptor", "Hormone", "Muskelaufbau"],
        tags: ["androgen-rezeptor", "testosteron", "muskelaufbau", "knochen", "hormone"],
        seo_title: "Androgen-Rezeptor — Testosteron & Muskelaufbau",
        seo_description: "Der Androgen-Rezeptor vermittelt die Wirkung von Testosteron auf Muskelaufbau und Knochendichte.",
      },
      {
        id: "vegfr2-rezeptor",
        slug: "vegfr2-rezeptor",
        type: "receptor",
        canonical_name: "VEGFR2",
        aliases: ["VEGF-Rezeptor 2", "KDR", "Flk-1"],
        short_description: "Hauptrezeptor für VEGF. Mediiert Angiogenese-Signale. Primäres Target von BPC-157 für Gefäßneubildung.",
        categories: ["Rezeptor", "Angiogenese", "Gefäße"],
        tags: ["vegfr2", "vegf", "angiogenese", "bpc-157", "gefäße", "endothelzellen"],
        seo_title: "VEGFR2 — VEGF-Rezeptor & Angiogenese",
        seo_description: "VEGFR2 ist der Hauptrezeptor für VEGF und mediiert Angiogenese-Signale. Primäres Target von BPC-157.",
      },
    ];

    const startCount6 = inserted;
    for (const e of receptors) {
      if (await upsertEntity(e)) inserted++;
    }
    console.log(`[Phase3 Base] Receptors inserted: ${inserted - startCount6}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. GENE (gene)
    // ═══════════════════════════════════════════════════════════════════════════
    const genes = [
      {
        id: "tp53-gen",
        slug: "tp53-gen",
        type: "gene",
        canonical_name: "TP53 (p53)",
        aliases: ["p53", "Tumorsuppressor p53", "Hüter des Genoms"],
        short_description: "Wichtigstes Tumorsuppressor-Gen. Reguliert Zellzyklus, Apoptose und DNA-Reparatur. Mutiert in ~50% aller Krebserkrankungen.",
        categories: ["Gen", "Tumorsuppressor", "DNA-Reparatur"],
        tags: ["tp53", "p53", "tumorsuppressor", "apoptose", "krebs", "dna-reparatur"],
        seo_title: "TP53 (p53) — Tumorsuppressor & Hüter des Genoms",
        seo_description: "TP53 ist das wichtigste Tumorsuppressor-Gen und reguliert Apoptose und DNA-Reparatur.",
      },
      {
        id: "foxo3-gen",
        slug: "foxo3-gen",
        type: "gene",
        canonical_name: "FOXO3",
        aliases: ["FOXO3a", "Forkhead Box O3", "Longevity-Gen"],
        short_description: "Transkriptionsfaktor der Longevity. Reguliert Stressresistenz, Autophagie und Stammzellaktivierung. Assoziiert mit Langlebigkeit.",
        categories: ["Gen", "Longevity", "Transkriptionsfaktor"],
        tags: ["foxo3", "longevity", "autophagie", "stressresistenz", "stammzellen", "langlebigkeit"],
        seo_title: "FOXO3 — Longevity-Gen & Stressresistenz",
        seo_description: "FOXO3 ist ein zentrales Longevity-Gen und reguliert Stressresistenz und Autophagie.",
      },
    ];

    const startCount7 = inserted;
    for (const e of genes) {
      if (await upsertEntity(e)) inserted++;
    }
    console.log(`[Phase3 Base] Genes inserted: ${inserted - startCount7}`);

    const finalCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM entities`);
    const finalTotal = Number((finalCount as any)[0]?.cnt ?? 0);

    console.log(`[Phase3 Base] ✅ Complete — Total entities now: ${finalTotal} (inserted ${inserted} new)`);

  } catch (error) {
    console.error("[Phase3 Base] Error:", error);
    throw error;
  }
}
