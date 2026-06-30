/**
 * Seed Script: 29 Topics + Topic Relations + Entity-Topic Links
 * Phase 2a — Topic Foundation
 * Run: npx tsx src/db/seed-topics.ts
 */

import "dotenv/config";
import { db } from "./index.js";
import { topics, topicRelations, entityTopics } from "./schema.js";
import { sql } from "drizzle-orm";

// ─── 29 Topics ────────────────────────────────────────────────────────────────

const TOPICS = [
  // ── Primary Navigation (navGroup: "primary") ──────────────────────────────
  {
    id: "longevity",
    slug: "longevity",
    name: "Longevity",
    nameEn: "Longevity",
    emoji: "⏳",
    description: "Wissenschaftliche Ansätze zur Verlängerung der gesunden Lebensspanne. Von Senolytika über Telomer-Biologie bis zu epigenetischen Uhren.",
    shortDescription: "Gesund älter werden — die Wissenschaft hinter Langlebigkeit.",
    color: "#6366f1",
    navGroup: "primary",
    sortOrder: 1,
    seoTitle: "Longevity — Wissenschaft der Langlebigkeit | 369 Research",
    seoDescription: "Evidenzbasiertes Wissen über Longevity: Senolytika, Telomere, Epigenetik, Mitochondrien und Anti-Aging-Strategien.",
  },
  {
    id: "mitochondrien",
    slug: "mitochondrien",
    name: "Mitochondrien",
    nameEn: "Mitochondria",
    emoji: "⚡",
    description: "Mitochondrien sind die Energiezentralen der Zelle. Ihre Funktion beeinflusst Energie, Alterung, Metabolismus und kognitive Leistung direkt.",
    shortDescription: "Zellenergie, ATP-Produktion und mitochondriale Gesundheit.",
    color: "#f59e0b",
    navGroup: "primary",
    sortOrder: 2,
    seoTitle: "Mitochondrien — Zellenergie & ATP | 369 Research",
    seoDescription: "Wissenschaftliches Wissen über Mitochondrien: ATP-Synthese, mitochondriale Dysfunktion, SS-31, MOTS-c, NAD+ und Urolithin A.",
  },
  {
    id: "fettverlust",
    slug: "fettverlust",
    name: "Fettverlust",
    nameEn: "Fat Loss",
    emoji: "🔥",
    description: "Mechanismen der Fettverbrennung: GLP-1-Agonisten, AMPK-Aktivierung, Lipolyse, Insulinsensitivität und metabolische Adaptation.",
    shortDescription: "Fettverbrennung — Mechanismen, Peptide und Strategien.",
    color: "#ef4444",
    navGroup: "primary",
    sortOrder: 3,
    seoTitle: "Fettverlust — GLP-1, AMPK & Metabolismus | 369 Research",
    seoDescription: "Wissenschaftliche Grundlagen des Fettverlusts: GLP-1-Agonisten, Retatrutide, AMPK, Insulinsensitivität und metabolische Adaptation.",
  },
  {
    id: "muskelaufbau",
    slug: "muskelaufbau",
    name: "Muskelaufbau",
    nameEn: "Muscle Building",
    emoji: "💪",
    description: "Muskelproteinsynthese, mTOR-Aktivierung, GH-Achse, IGF-1 und Myostatin-Inhibition — die Wissenschaft hinter Muskelhypertrophie.",
    shortDescription: "Muskelhypertrophie — Mechanismen und Research Compounds.",
    color: "#3b82f6",
    navGroup: "primary",
    sortOrder: 4,
    seoTitle: "Muskelaufbau — mTOR, GH-Achse & Hypertrophie | 369 Research",
    seoDescription: "Evidenzbasiertes Wissen über Muskelaufbau: mTOR, IGF-1, GH-Achse, Myostatin und Research Compounds für Hypertrophie.",
  },
  {
    id: "regeneration",
    slug: "regeneration",
    name: "Regeneration",
    nameEn: "Recovery & Repair",
    emoji: "🔄",
    description: "Gewebereparatur, Sehnen- und Bänderheilung, Entzündungsmodulation und zelluläre Regeneration durch BPC-157, TB-500 und verwandte Peptide.",
    shortDescription: "Gewebereparatur, Heilung und zelluläre Regeneration.",
    color: "#10b981",
    navGroup: "primary",
    sortOrder: 5,
    seoTitle: "Regeneration — BPC-157, TB-500 & Gewebereparatur | 369 Research",
    seoDescription: "Wissenschaftliche Grundlagen der Regeneration: BPC-157, TB-500, Sehnen- und Bänderheilung, Entzündungsmodulation.",
  },
  {
    id: "hormone",
    slug: "hormone",
    name: "Hormone & Achsen",
    nameEn: "Hormones & Axes",
    emoji: "⚗️",
    description: "GH-Achse, Insulinachse, Schilddrüse, Sexualhormone und ihre Wechselwirkungen mit Research Compounds.",
    shortDescription: "Hormonsystem, GH-Achse und endokrine Regulation.",
    color: "#8b5cf6",
    navGroup: "primary",
    sortOrder: 6,
    seoTitle: "Hormone & Achsen — GH, Insulin & Endokrinium | 369 Research",
    seoDescription: "Wissenschaftliches Wissen über Hormone: GH-Achse, Insulinachse, Schilddrüse und endokrine Wechselwirkungen.",
  },
  {
    id: "haut-kosmetik",
    slug: "haut-kosmetik",
    name: "Haut & Kosmetik",
    nameEn: "Skin & Cosmetics",
    emoji: "✨",
    description: "Kollagensynthese, Hautalterung, GHK-Cu, SNAP-8, Retinal und topische Wirkstoffe für Hautgesundheit und Anti-Aging.",
    shortDescription: "Hautalterung, Kollagen und topische Wirkstoffe.",
    color: "#f472b6",
    navGroup: "primary",
    sortOrder: 7,
    seoTitle: "Haut & Kosmetik — GHK-Cu, Kollagen & Anti-Aging | 369 Research",
    seoDescription: "Wissenschaftliche Grundlagen der Hautpflege: GHK-Cu, Kollagensynthese, SNAP-8, Retinal und topische Peptide.",
  },
  {
    id: "kognition",
    slug: "kognition",
    name: "Kognition & Gehirn",
    nameEn: "Cognition & Brain",
    emoji: "🧠",
    description: "Neuroplastizität, BDNF, Neuroprotection, kognitive Leistung und nootrope Wirkstoffe.",
    shortDescription: "Gehirnleistung, Neuroplastizität und Neuroprotection.",
    color: "#06b6d4",
    navGroup: "primary",
    sortOrder: 8,
    seoTitle: "Kognition & Gehirn — BDNF, Neuroplastizität | 369 Research",
    seoDescription: "Wissenschaftliches Wissen über Kognition: BDNF, Neuroplastizität, Neuroprotection und nootrope Wirkstoffe.",
  },
  // ── Secondary Navigation (navGroup: "secondary") ──────────────────────────
  {
    id: "immunsystem",
    slug: "immunsystem",
    name: "Immunsystem",
    nameEn: "Immune System",
    emoji: "🛡️",
    description: "Immunmodulation, Entzündungsregulation, Thymosin-Peptide und immunologische Mechanismen.",
    shortDescription: "Immunmodulation und Entzündungsregulation.",
    color: "#84cc16",
    navGroup: "secondary",
    sortOrder: 9,
    seoTitle: "Immunsystem — Immunmodulation & Entzündung | 369 Research",
    seoDescription: "Wissenschaftliche Grundlagen des Immunsystems: Immunmodulation, Thymosin, Entzündungsregulation.",
  },
  {
    id: "biomarker",
    slug: "biomarker",
    name: "Biomarker & Diagnostik",
    nameEn: "Biomarkers & Diagnostics",
    emoji: "🔬",
    description: "Laborwerte, Biomarker für Gesundheit und Alterung, Blutbild-Interpretation und diagnostische Marker.",
    shortDescription: "Laborwerte, Biomarker und diagnostische Marker.",
    color: "#64748b",
    navGroup: "secondary",
    sortOrder: 10,
    seoTitle: "Biomarker & Diagnostik — Laborwerte | 369 Research",
    seoDescription: "Wissenschaftliches Wissen über Biomarker: Laborwerte, Alterungsmarker, Blutbild-Interpretation.",
  },
  {
    id: "metabolismus",
    slug: "metabolismus",
    name: "Metabolismus",
    nameEn: "Metabolism",
    emoji: "🔋",
    description: "Stoffwechselregulation, Insulinsensitivität, AMPK, mTOR und metabolische Gesundheit.",
    shortDescription: "Stoffwechsel, Insulinsensitivität und metabolische Gesundheit.",
    color: "#f97316",
    navGroup: "secondary",
    sortOrder: 11,
    seoTitle: "Metabolismus — Stoffwechsel & Insulinsensitivität | 369 Research",
    seoDescription: "Wissenschaftliche Grundlagen des Metabolismus: AMPK, mTOR, Insulinsensitivität und metabolische Regulation.",
  },
  {
    id: "entzuendung",
    slug: "entzuendung",
    name: "Entzündung",
    nameEn: "Inflammation",
    emoji: "🌡️",
    description: "Chronische Entzündung als Treiber von Alterung und Erkrankungen. Entzündungsmarker, NF-κB, Zytokine und antiinflammatorische Strategien.",
    shortDescription: "Chronische Entzündung, NF-κB und antiinflammatorische Strategien.",
    color: "#dc2626",
    navGroup: "secondary",
    sortOrder: 12,
    seoTitle: "Entzündung — NF-κB, Zytokine & Inflammaging | 369 Research",
    seoDescription: "Wissenschaftliches Wissen über Entzündung: NF-κB, Zytokine, Inflammaging und antiinflammatorische Ansätze.",
  },
  {
    id: "oxidativer-stress",
    slug: "oxidativer-stress",
    name: "Oxidativer Stress",
    nameEn: "Oxidative Stress",
    emoji: "⚡",
    description: "Freie Radikale, ROS, antioxidative Systeme und oxidativer Stress als Alterungsfaktor.",
    shortDescription: "Freie Radikale, ROS und antioxidative Mechanismen.",
    color: "#a78bfa",
    navGroup: "secondary",
    sortOrder: 13,
    seoTitle: "Oxidativer Stress — ROS, Antioxidantien | 369 Research",
    seoDescription: "Wissenschaftliche Grundlagen des oxidativen Stresses: ROS, freie Radikale, antioxidative Systeme.",
  },
  {
    id: "autophagie",
    slug: "autophagie",
    name: "Autophagie",
    nameEn: "Autophagy",
    emoji: "♻️",
    description: "Zelluläre Selbstreinigung, mTOR-Inhibition, Fasten und Autophagie-Induktion als Anti-Aging-Strategie.",
    shortDescription: "Zelluläre Selbstreinigung und Autophagie-Induktion.",
    color: "#34d399",
    navGroup: "secondary",
    sortOrder: 14,
    seoTitle: "Autophagie — Zelluläre Selbstreinigung | 369 Research",
    seoDescription: "Wissenschaftliches Wissen über Autophagie: mTOR-Inhibition, Fasten, zelluläre Selbstreinigung.",
  },
  {
    id: "epigenetik",
    slug: "epigenetik",
    name: "Epigenetik",
    nameEn: "Epigenetics",
    emoji: "🧬",
    description: "Epigenetische Uhren, DNA-Methylierung, Histonmodifikation und epigenetisches Altern.",
    shortDescription: "Epigenetische Uhren, DNA-Methylierung und Altern.",
    color: "#818cf8",
    navGroup: "secondary",
    sortOrder: 15,
    seoTitle: "Epigenetik — DNA-Methylierung & Altern | 369 Research",
    seoDescription: "Wissenschaftliche Grundlagen der Epigenetik: epigenetische Uhren, DNA-Methylierung, Histonmodifikation.",
  },
  {
    id: "telomere",
    slug: "telomere",
    name: "Telomere",
    nameEn: "Telomeres",
    emoji: "🔗",
    description: "Telomerlänge als Alterungsmarker, Telomerase-Aktivität und telomerbezogene Interventionen.",
    shortDescription: "Telomerlänge, Telomerase und Alterungsmarker.",
    color: "#2dd4bf",
    navGroup: "secondary",
    sortOrder: 16,
    seoTitle: "Telomere — Telomerlänge & Telomerase | 369 Research",
    seoDescription: "Wissenschaftliches Wissen über Telomere: Telomerlänge, Telomerase-Aktivität und Alterungsmarker.",
  },
  {
    id: "seneszenz",
    slug: "seneszenz",
    name: "Seneszenz & Senolytika",
    nameEn: "Senescence & Senolytics",
    emoji: "🧹",
    description: "Zelluläre Seneszenz, SASP, Senolytika und die Entfernung seneszenter Zellen als Anti-Aging-Strategie.",
    shortDescription: "Seneszente Zellen, SASP und Senolytika.",
    color: "#fb923c",
    navGroup: "secondary",
    sortOrder: 17,
    seoTitle: "Seneszenz & Senolytika — SASP & Anti-Aging | 369 Research",
    seoDescription: "Wissenschaftliche Grundlagen der Seneszenz: SASP, Senolytika, zelluläre Alterung.",
  },
  {
    id: "nad-plus",
    slug: "nad-plus",
    name: "NAD+ & Sirtuine",
    nameEn: "NAD+ & Sirtuins",
    emoji: "🔑",
    description: "NAD+-Metabolismus, Sirtuine, NMN, NR und ihre Rolle in Energiestoffwechsel und Alterung.",
    shortDescription: "NAD+-Metabolismus, Sirtuine und Energiestoffwechsel.",
    color: "#fbbf24",
    navGroup: "secondary",
    sortOrder: 18,
    seoTitle: "NAD+ & Sirtuine — NMN, NR & Energiestoffwechsel | 369 Research",
    seoDescription: "Wissenschaftliches Wissen über NAD+: Sirtuine, NMN, NR, Energiestoffwechsel und Alterung.",
  },
  {
    id: "glp1",
    slug: "glp1",
    name: "GLP-1 & Inkretin-Achse",
    nameEn: "GLP-1 & Incretin Axis",
    emoji: "💉",
    description: "GLP-1-Agonisten, GIP, Inkretin-Achse, Sättigungsregulation und metabolische Effekte von Retatrutide, Tirzepatide und Semaglutide.",
    shortDescription: "GLP-1-Agonisten, Inkretin-Achse und metabolische Effekte.",
    color: "#e879f9",
    navGroup: "secondary",
    sortOrder: 19,
    seoTitle: "GLP-1 & Inkretin-Achse — Retatrutide, Tirzepatide | 369 Research",
    seoDescription: "Wissenschaftliche Grundlagen der GLP-1-Achse: Retatrutide, Tirzepatide, Semaglutide und metabolische Effekte.",
  },
  {
    id: "gh-achse",
    slug: "gh-achse",
    name: "GH-Achse & Peptide",
    nameEn: "GH Axis & Peptides",
    emoji: "📈",
    description: "Wachstumshormon-Achse, GHRH, GHRP, IGF-1 und GH-Sekretionspeptide.",
    shortDescription: "Wachstumshormon-Achse, GHRH und GH-Peptide.",
    color: "#38bdf8",
    navGroup: "secondary",
    sortOrder: 20,
    seoTitle: "GH-Achse & Peptide — GHRH, IGF-1 | 369 Research",
    seoDescription: "Wissenschaftliches Wissen über die GH-Achse: GHRH, GHRP, IGF-1 und GH-Sekretionspeptide.",
  },
  {
    id: "kollagen",
    slug: "kollagen",
    name: "Kollagen & Bindegewebe",
    nameEn: "Collagen & Connective Tissue",
    emoji: "🕸️",
    description: "Kollagensynthese, Kollagentypen, Sehnen- und Bänderstruktur sowie Wirkstoffe zur Kollagenunterstützung.",
    shortDescription: "Kollagensynthese, Sehnen und Bindegewebe.",
    color: "#a3e635",
    navGroup: "secondary",
    sortOrder: 21,
    seoTitle: "Kollagen & Bindegewebe — Synthese & Reparatur | 369 Research",
    seoDescription: "Wissenschaftliche Grundlagen von Kollagen: Kollagensynthese, Sehnen, Bänder und Bindegewebe.",
  },
  {
    id: "darm-mikrobiom",
    slug: "darm-mikrobiom",
    name: "Darm & Mikrobiom",
    nameEn: "Gut & Microbiome",
    emoji: "🦠",
    description: "Darm-Hirn-Achse, Mikrobiom-Zusammensetzung, Darmbarriere und gastrointestinale Gesundheit.",
    shortDescription: "Darm-Hirn-Achse, Mikrobiom und Darmgesundheit.",
    color: "#4ade80",
    navGroup: "secondary",
    sortOrder: 22,
    seoTitle: "Darm & Mikrobiom — Darm-Hirn-Achse | 369 Research",
    seoDescription: "Wissenschaftliches Wissen über Darm und Mikrobiom: Darm-Hirn-Achse, Darmbarriere, Mikrobiom-Zusammensetzung.",
  },
  {
    id: "schlaf",
    slug: "schlaf",
    name: "Schlaf & Erholung",
    nameEn: "Sleep & Recovery",
    emoji: "🌙",
    description: "Schlafarchitektur, Melatonin, zirkadiane Rhythmen und Schlafoptimierung.",
    shortDescription: "Schlafarchitektur, Melatonin und zirkadiane Rhythmen.",
    color: "#7c3aed",
    navGroup: "secondary",
    sortOrder: 23,
    seoTitle: "Schlaf & Erholung — Melatonin & Zirkadiane Rhythmen | 369 Research",
    seoDescription: "Wissenschaftliche Grundlagen des Schlafs: Schlafarchitektur, Melatonin, zirkadiane Rhythmen.",
  },
  {
    id: "stressachse",
    slug: "stressachse",
    name: "Stressachse & Cortisol",
    nameEn: "Stress Axis & Cortisol",
    emoji: "🌊",
    description: "HPA-Achse, Cortisol, Stressreaktion und Adaptogene.",
    shortDescription: "HPA-Achse, Cortisol und Stressregulation.",
    color: "#0ea5e9",
    navGroup: "secondary",
    sortOrder: 24,
    seoTitle: "Stressachse & Cortisol — HPA-Achse | 369 Research",
    seoDescription: "Wissenschaftliches Wissen über die Stressachse: HPA-Achse, Cortisol, Stressreaktion und Adaptogene.",
  },
  {
    id: "herzkreislauf",
    slug: "herzkreislauf",
    name: "Herzkreislauf",
    nameEn: "Cardiovascular",
    emoji: "❤️",
    description: "Kardiovaskuläre Gesundheit, Endothelfunktion, Blutdruck und kardioprotektive Wirkstoffe.",
    shortDescription: "Kardiovaskuläre Gesundheit und Endothelfunktion.",
    color: "#f43f5e",
    navGroup: "secondary",
    sortOrder: 25,
    seoTitle: "Herzkreislauf — Endothelfunktion & Kardioprotection | 369 Research",
    seoDescription: "Wissenschaftliche Grundlagen der Herzkreislaufgesundheit: Endothelfunktion, Blutdruck, kardioprotektive Wirkstoffe.",
  },
  {
    id: "knochen-gelenke",
    slug: "knochen-gelenke",
    name: "Knochen & Gelenke",
    nameEn: "Bone & Joints",
    emoji: "🦴",
    description: "Knochendichte, Osteoblasten, Chondrozyten, Gelenkgesundheit und Wirkstoffe zur Unterstützung.",
    shortDescription: "Knochendichte, Gelenkgesundheit und Osteoblasten.",
    color: "#d97706",
    navGroup: "secondary",
    sortOrder: 26,
    seoTitle: "Knochen & Gelenke — Knochendichte & Gelenkgesundheit | 369 Research",
    seoDescription: "Wissenschaftliches Wissen über Knochen und Gelenke: Knochendichte, Osteoblasten, Chondrozyten.",
  },
  {
    id: "niere-leber",
    slug: "niere-leber",
    name: "Niere & Leber",
    nameEn: "Kidney & Liver",
    emoji: "🫀",
    description: "Hepatoprotection, Nierengesundheit, Detoxifikation und organprotektive Wirkstoffe.",
    shortDescription: "Hepatoprotection, Nierengesundheit und Detoxifikation.",
    color: "#78716c",
    navGroup: "secondary",
    sortOrder: 27,
    seoTitle: "Niere & Leber — Hepatoprotection & Organgesundheit | 369 Research",
    seoDescription: "Wissenschaftliche Grundlagen von Niere und Leber: Hepatoprotection, Detoxifikation, organprotektive Wirkstoffe.",
  },
  {
    id: "peptide-grundlagen",
    slug: "peptide-grundlagen",
    name: "Peptide — Grundlagen",
    nameEn: "Peptides — Fundamentals",
    emoji: "🔬",
    description: "Was sind Peptide? Aminosäuresequenzen, Synthese, Bioverfügbarkeit, Stabilität und Anwendungsbereiche.",
    shortDescription: "Grundlagen der Peptidchemie und -biologie.",
    color: "#0891b2",
    navGroup: "secondary",
    sortOrder: 28,
    seoTitle: "Peptide Grundlagen — Aminosäuren, Synthese & Bioverfügbarkeit | 369 Research",
    seoDescription: "Wissenschaftliche Grundlagen der Peptide: Aminosäuresequenzen, Synthese, Bioverfügbarkeit und Stabilität.",
  },
  {
    id: "stacks-protokolle",
    slug: "stacks-protokolle",
    name: "Stacks & Protokolle",
    nameEn: "Stacks & Protocols",
    emoji: "📋",
    description: "Evidenzbasierte Kombinationen von Research Compounds für spezifische Ziele.",
    shortDescription: "Evidenzbasierte Compound-Kombinationen und Protokolle.",
    color: "#7c3aed",
    navGroup: "secondary",
    sortOrder: 29,
    seoTitle: "Stacks & Protokolle — Research Compound Kombinationen | 369 Research",
    seoDescription: "Evidenzbasierte Stacks und Protokolle: Kombinationen von Research Compounds für Fettverlust, Muskelaufbau, Anti-Aging.",
  },
];

// ─── Topic Relations (semantische Verbindungen) ───────────────────────────────

const TOPIC_RELATIONS = [
  // Longevity ist übergeordnet
  { from: "longevity", to: "mitochondrien", type: "parent", strength: 0.9 },
  { from: "longevity", to: "seneszenz", type: "parent", strength: 0.9 },
  { from: "longevity", to: "epigenetik", type: "parent", strength: 0.85 },
  { from: "longevity", to: "telomere", type: "parent", strength: 0.85 },
  { from: "longevity", to: "autophagie", type: "parent", strength: 0.8 },
  { from: "longevity", to: "nad-plus", type: "parent", strength: 0.8 },
  { from: "longevity", to: "entzuendung", type: "related", strength: 0.75 },
  { from: "longevity", to: "oxidativer-stress", type: "related", strength: 0.75 },
  // Metabolismus-Cluster
  { from: "fettverlust", to: "glp1", type: "parent", strength: 0.95 },
  { from: "fettverlust", to: "metabolismus", type: "related", strength: 0.9 },
  { from: "fettverlust", to: "mitochondrien", type: "related", strength: 0.7 },
  { from: "fettverlust", to: "hormone", type: "related", strength: 0.7 },
  { from: "glp1", to: "metabolismus", type: "related", strength: 0.85 },
  { from: "glp1", to: "hormone", type: "related", strength: 0.7 },
  // Muskelaufbau-Cluster
  { from: "muskelaufbau", to: "gh-achse", type: "parent", strength: 0.9 },
  { from: "muskelaufbau", to: "hormone", type: "related", strength: 0.85 },
  { from: "muskelaufbau", to: "regeneration", type: "related", strength: 0.8 },
  { from: "muskelaufbau", to: "kollagen", type: "related", strength: 0.6 },
  { from: "gh-achse", to: "hormone", type: "related", strength: 0.9 },
  // Regeneration-Cluster
  { from: "regeneration", to: "kollagen", type: "related", strength: 0.85 },
  { from: "regeneration", to: "entzuendung", type: "related", strength: 0.8 },
  { from: "regeneration", to: "knochen-gelenke", type: "related", strength: 0.75 },
  { from: "regeneration", to: "darm-mikrobiom", type: "related", strength: 0.5 },
  // Haut-Cluster
  { from: "haut-kosmetik", to: "kollagen", type: "parent", strength: 0.9 },
  { from: "haut-kosmetik", to: "oxidativer-stress", type: "related", strength: 0.7 },
  { from: "haut-kosmetik", to: "entzuendung", type: "related", strength: 0.65 },
  { from: "haut-kosmetik", to: "longevity", type: "related", strength: 0.6 },
  // Kognition-Cluster
  { from: "kognition", to: "mitochondrien", type: "related", strength: 0.8 },
  { from: "kognition", to: "entzuendung", type: "related", strength: 0.75 },
  { from: "kognition", to: "schlaf", type: "related", strength: 0.7 },
  { from: "kognition", to: "stressachse", type: "related", strength: 0.65 },
  // Mitochondrien-Cluster
  { from: "mitochondrien", to: "nad-plus", type: "related", strength: 0.9 },
  { from: "mitochondrien", to: "oxidativer-stress", type: "related", strength: 0.85 },
  { from: "mitochondrien", to: "autophagie", type: "related", strength: 0.75 },
  { from: "mitochondrien", to: "entzuendung", type: "related", strength: 0.7 },
  // Entzündung ist übergreifend
  { from: "entzuendung", to: "immunsystem", type: "related", strength: 0.9 },
  { from: "entzuendung", to: "oxidativer-stress", type: "related", strength: 0.85 },
  { from: "entzuendung", to: "darm-mikrobiom", type: "related", strength: 0.7 },
  // Peptide Grundlagen als Basis
  { from: "peptide-grundlagen", to: "regeneration", type: "related", strength: 0.8 },
  { from: "peptide-grundlagen", to: "gh-achse", type: "related", strength: 0.8 },
  { from: "peptide-grundlagen", to: "haut-kosmetik", type: "related", strength: 0.75 },
  { from: "stacks-protokolle", to: "fettverlust", type: "related", strength: 0.8 },
  { from: "stacks-protokolle", to: "muskelaufbau", type: "related", strength: 0.8 },
  { from: "stacks-protokolle", to: "longevity", type: "related", strength: 0.75 },
  { from: "stacks-protokolle", to: "regeneration", type: "related", strength: 0.75 },
];

// ─── Entity-Topic Links ───────────────────────────────────────────────────────

const ENTITY_TOPIC_LINKS = [
  // BPC-157
  { entityId: "bpc-157", topicId: "regeneration", isPrimary: true },
  { entityId: "bpc-157", topicId: "darm-mikrobiom", isPrimary: false },
  { entityId: "bpc-157", topicId: "entzuendung", isPrimary: false },
  { entityId: "bpc-157", topicId: "knochen-gelenke", isPrimary: false },
  { entityId: "bpc-157", topicId: "peptide-grundlagen", isPrimary: false },
  // TB-500
  { entityId: "tb-500", topicId: "regeneration", isPrimary: true },
  { entityId: "tb-500", topicId: "muskelaufbau", isPrimary: false },
  { entityId: "tb-500", topicId: "entzuendung", isPrimary: false },
  { entityId: "tb-500", topicId: "peptide-grundlagen", isPrimary: false },
  // SS-31
  { entityId: "ss-31", topicId: "mitochondrien", isPrimary: true },
  { entityId: "ss-31", topicId: "longevity", isPrimary: false },
  { entityId: "ss-31", topicId: "oxidativer-stress", isPrimary: false },
  { entityId: "ss-31", topicId: "herzkreislauf", isPrimary: false },
  { entityId: "ss-31", topicId: "peptide-grundlagen", isPrimary: false },
  // GHK-Cu
  { entityId: "ghk-cu", topicId: "haut-kosmetik", isPrimary: true },
  { entityId: "ghk-cu", topicId: "regeneration", isPrimary: false },
  { entityId: "ghk-cu", topicId: "kollagen", isPrimary: false },
  { entityId: "ghk-cu", topicId: "longevity", isPrimary: false },
  { entityId: "ghk-cu", topicId: "peptide-grundlagen", isPrimary: false },
  // Retatrutide
  { entityId: "retatrutide", topicId: "fettverlust", isPrimary: true },
  { entityId: "retatrutide", topicId: "glp1", isPrimary: true },
  { entityId: "retatrutide", topicId: "metabolismus", isPrimary: false },
  { entityId: "retatrutide", topicId: "hormone", isPrimary: false },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Seeding 29 Topics...");

  // Upsert topics
  for (const topic of TOPICS) {
    await db.execute(sql`
      INSERT INTO topics (id, slug, name, name_en, emoji, description, short_description, color, nav_group, sort_order, active, seo_title, seo_description, created_at, updated_at)
      VALUES (
        ${topic.id}, ${topic.slug}, ${topic.name}, ${topic.nameEn}, ${topic.emoji},
        ${topic.description}, ${topic.shortDescription}, ${topic.color}, ${topic.navGroup},
        ${topic.sortOrder}, true, ${topic.seoTitle}, ${topic.seoDescription},
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        emoji = EXCLUDED.emoji,
        description = EXCLUDED.description,
        short_description = EXCLUDED.short_description,
        color = EXCLUDED.color,
        nav_group = EXCLUDED.nav_group,
        sort_order = EXCLUDED.sort_order,
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        updated_at = NOW()
    `);
  }
  console.log(`✅ ${TOPICS.length} Topics upserted`);

  // Seed topic relations
  console.log("🔗 Seeding Topic Relations...");
  for (const rel of TOPIC_RELATIONS) {
    const id = `${rel.from}--${rel.type}--${rel.to}`;
    await db.execute(sql`
      INSERT INTO topic_relations (id, from_topic_id, to_topic_id, relation_type, strength, created_at)
      VALUES (${id}, ${rel.from}, ${rel.to}, ${rel.type}, ${rel.strength}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        relation_type = EXCLUDED.relation_type,
        strength = EXCLUDED.strength
    `);
  }
  console.log(`✅ ${TOPIC_RELATIONS.length} Topic Relations upserted`);

  // Seed entity-topic links
  console.log("🔗 Seeding Entity-Topic Links...");
  for (const link of ENTITY_TOPIC_LINKS) {
    await db.execute(sql`
      INSERT INTO entity_topics (entity_id, topic_id, is_primary, sort_order, created_at)
      VALUES (${link.entityId}, ${link.topicId}, ${link.isPrimary}, 0, NOW())
      ON CONFLICT (entity_id, topic_id) DO UPDATE SET
        is_primary = EXCLUDED.is_primary
    `);
  }
  console.log(`✅ ${ENTITY_TOPIC_LINKS.length} Entity-Topic Links upserted`);

  console.log("\n✅ Topic Foundation complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
