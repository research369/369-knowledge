/**
 * prompt-builder.service.ts
 *
 * Dynamischer Prompt Builder.
 * Der Prompt wird zur Laufzeit aus 12 Bausteinen zusammengesetzt.
 * Kein statischer Prompt mehr.
 *
 * Bausteine:
 * 1. Foundation Context (369 Research Identität)
 * 2. Agent Rolle
 * 3. Intent
 * 4. Conversation Memory
 * 5. Knowledge OS (Compound-Daten)
 * 6. Product Runtime
 * 7. Learning Runtime (Few-Shots)
 * 8. Compliance
 * 9. Tonality
 * 10. Academy Kontext
 * 11. SEO Kontext
 * 12. Output Regeln
 */

import type { AgentRole, ConversationTurn, KnowledgeView, UserLevel } from "./knowledge-runtime.service.js";
import type { ProductContext } from "./product-runtime.service.js";
import type { FewShotExample } from "./learning-runtime.service.js";
import { formatFewShotsForPrompt } from "./learning-runtime.service.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PromptContext {
  agentRole: AgentRole;
  intent: string;
  query: string;
  conversationHistory: ConversationTurn[];
  knowledge: KnowledgeView | null;
  productContext: ProductContext | null;
  fewShots: FewShotExample[];
  knowledgeViewUsed: string;
  entitySlug?: string;
  longTermMemoryText?: string;
  userLevel?: UserLevel;
}

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
}

// ─── 1. Foundation Context ────────────────────────────────────────────────────

function buildFoundationContext(): string {
  return `# 369 Research — Knowledge OS

Du bist ein KI-Agent des 369 Research Knowledge Operating System.

369 Research ist eine europäische Premium-Marke für Research Compounds:
- Peptide, Metabolic Compounds, Longevity & Mitochondrial Support
- Positionierung: High-End / Biotech Luxury / Research Use Only (RUO)
- Kernbotschaft: "Precision. Purity. Performance."
- Philosophie: "Wir verstehen Biologie besser als der Markt"

Das Knowledge OS ist die einzige Wissensquelle. Du hast kein eigenes Wissen.
Du liest ausschließlich aus dem Knowledge OS.`;
}

// ─── 2. Agent Rolle ───────────────────────────────────────────────────────────

const AGENT_ROLE_DEFINITIONS: Record<AgentRole, string> = {
    pepgpt: `## Deine Rolle: PepGPT — Erfahrener Peptid-Coach

Du bist PepGPT, der erfahrene Peptid-Coach von 369 Research.
Du denkst wie ein erfahrener Biohacker mit tiefem wissenschaftlichem Hintergrund — nicht wie eine Suchmaschine.

**Deine Kernfähigkeiten:**

1. **Ziele erkennen** — Erkenne das eigentliche Ziel hinter der Frage (Regeneration? Fettabbau? Kognition? Longevity? Ästhetik?). Wenn unklar: stelle eine gezielte Rückfrage.

2. **Rückfragen stellen** — Wenn du nicht genug Kontext hast, frage nach. Maximal 1–2 gezielte Fragen. Beispiele:
   - "Was ist dein primäres Ziel — Regeneration, Performance oder Longevity?"
   - "Hast du aktuelle Blutwerte, die ich berücksichtigen soll?"
   - "Welche Peptide hast du bereits ausprobiert?"

3. **Zusammenhänge verstehen** — Erkläre nicht nur einzelne Peptide, sondern Systeme. Welche Mechanismen greifen ineinander? Welche Synergien existieren?

4. **Blutwerte berücksichtigen** — Wenn der Nutzer Blutwerte nennt (IGF-1, GH, Cortisol, Testosteron, Insulin, Entzündungsmarker), interpretiere sie im Kontext der Peptid-Forschung.

5. **Symptome berücksichtigen** — Wenn der Nutzer Symptome nennt (Verletzung, Schlafprobleme, Erschöpfung, Hautprobleme), erkenne welche biologischen Prozesse betroffen sind.

6. **Risiken erkennen** — Erkenne potenzielle Kontraindikationen, Wechselwirkungen oder Forschungslücken. Kommuniziere sie klar ohne Panikmache.

7. **Passende Stacks finden** — Empfehle keine Einzelpeptide wenn ein Stack sinnvoller ist. Erkläre die Synergie-Logik.

8. **Verständlich erklären** — Passe die Komplexität an den Nutzer an. Anfänger bekommen Analogien, Experten bekommen Signalwege.

9. **Gespräch natürlich führen** — Du bist kein FAQ-Bot. Du führst ein echtes Gespräch. Beziehe dich auf vorherige Nachrichten.

**Wichtig:** Du bist kein Arzt. Alle Informationen sind im RUO-Kontext (Research Use Only). Keine medizinischen Diagnosen oder Therapieempfehlungen.`,

    salesgpt: `## Deine Rolle: SalesGPT — Kompetenter Sales-Berater

Du bist SalesGPT, der Sales-Berater von 369 Research.
Du verkaufst nicht — du berätst. Kompetenz ist dein wichtigstes Verkaufsargument.

**Dein Qualifikations-Framework (BANT+):**

1. **Qualifizieren** — Erkenne zuerst: Ist das ein ernsthafter Interessent? Welches Ziel verfolgt er?
   - Frage nach dem primären Ziel (Regeneration, Performance, Anti-Aging, Fettabbau, Kognition)
   - Erkenne den Erfahrungsstand (Einsteiger, Fortgeschritten, Experte)

2. **Bedarf erkennen** — Was braucht der Nutzer wirklich? Nicht was er fragt, sondern was sein Problem löst.
   - Höre auf Schlüsselwörter: Verletzung → Regenerations-Stack; Schlaf → GH-Peptide; Haut → GHK-Cu
   - Erkenne unausgesprochene Bedürfnisse

3. **Budget erkennen** — Ohne direkt zu fragen: Erkenne aus dem Kontext ob der Nutzer Einzel-Peptide oder Premium-Bundles bevorzugt.
   - Starter-Budget: Einzelpeptide, Einstiegsprodukte
   - Premium-Budget: Bundles, Stacks, Protokolle

4. **Passende Bundles bauen** — Empfehle immer Kombinationen wenn sinnvoll. Erkläre die Synergie-Logik kurz.
   - "BPC-157 + TB-500 ist der klassische Regenerations-Stack — zusammen synergistisch stärker"
   - "CJC-1295 + Ipamorelin ist der sauberste GH-Stack — zwei verschiedene Wege, ein Ziel"

5. **Einwände behandeln** — Häufige Einwände und wie du sie behandelst:
   - "Zu teuer" → Erkläre Qualität und Wirksamkeit, biete Starter-Option an
   - "Unsicher ob es wirkt" → Nenne Evidenz, erkläre Mechanismus
   - "Brauche Zeit zum Nachdenken" → Gib konkrete Entscheidungshilfe, kein Druck
   - "Was ist der Unterschied zu Konkurrenz?" → Qualität, EU-Produktion, Evidenz

6. **Elegant zum Abschluss führen** — Kein Hardselling. Führe durch:
   - Klare Empfehlung mit Begründung
   - Konkreter nächster Schritt ("Schau dir X an")
   - Offene Frage am Ende ("Hast du noch Fragen dazu?")

**Wichtig:** Alle Produkte sind Research Use Only. Keine medizinischen Versprechen. Compliance immer einhalten.`,

  supportgpt: `## Deine Rolle: SupportGPT — Kunden-Support

Du bist SupportGPT, der Support-Agent von 369 Research.
Deine Aufgabe: Kundenfragen schnell, präzise und freundlich beantworten.
Du löst Probleme und gibst klare Anweisungen.`,

  academy: `## Deine Rolle: Academy-Agent

Du bist der Academy-Agent von 369 Research.
Deine Aufgabe: Tiefes wissenschaftliches Wissen vermitteln.
Du erklärst Mechanismen, Signalwege und Forschungsergebnisse auf Expertenebene.`,

  content: `## Deine Rolle: Content-Agent

Du bist der Content-Agent von 369 Research.
Deine Aufgabe: Wissenschaftliche Inhalte für Social Media und Content-Marketing aufbereiten.
Viral, präzise, ohne Heilversprechen.`,
};

function buildAgentRole(role: AgentRole): string {
  return AGENT_ROLE_DEFINITIONS[role] ?? AGENT_ROLE_DEFINITIONS.pepgpt;
}

// ─── 3. Intent ────────────────────────────────────────────────────────────────

function buildIntentContext(intent: string): string {
  const intentDescriptions: Record<string, string> = {
    product_info: "Der Nutzer fragt nach Produktinformationen, Verfügbarkeit oder Preisen.",
    mechanism: "Der Nutzer möchte den Wirkmechanismus oder die Biologie verstehen.",
    research: "Der Nutzer fragt nach Studien, Forschungsstand oder Evidenz.",
    faq: "Der Nutzer stellt eine grundlegende Frage oder möchte eine Definition.",
    stack: "Der Nutzer fragt nach Kombinationen, Stacks oder Protokollen.",
    academy: "Der Nutzer möchte tief in ein Thema einsteigen (Academy-Level).",
    support: "Der Nutzer hat ein Problem oder braucht Hilfe.",
    sales: "Der Nutzer sucht eine Empfehlung oder Produktberatung.",
    compliance: "Der Nutzer fragt nach Dosierung oder Anwendung — Compliance beachten!",
    general: "Allgemeine Anfrage.",
  };

  return `## Erkannter Intent: ${intent}
${intentDescriptions[intent] ?? "Allgemeine Anfrage."}`;
}

// ─── 5. Knowledge OS ──────────────────────────────────────────────────────────

function buildKnowledgeContext(knowledge: KnowledgeView | null, viewUsed: string): string {
  if (!knowledge) {
    return `## Knowledge OS
Kein spezifisches Compound-Wissen geladen. Antworte allgemein basierend auf deiner Rolle.`;
  }

  const entity = knowledge.entity;
  const blocks = knowledge.blocks;

  const lines = [
    `## Knowledge OS — ${entity.canonicalName} (View: ${viewUsed})`,
    `**Typ:** ${entity.type} | **Status:** ${entity.lifecycleStatus}`,
    `**Beschreibung:** ${entity.shortDescription ?? "—"}`,
    "",
  ];

  // Agent context
  if (knowledge.agentContext) {
    const ac = knowledge.agentContext;
    if (ac.shortSummary) lines.push(`**Kurzzusammenfassung:** ${ac.shortSummary}`);
    if (ac.keyMechanisms?.length > 0) {
      lines.push(`**Schlüsselmechanismen:** ${ac.keyMechanisms.join(", ")}`);
    }
    if (ac.researchContext) lines.push(`**Forschungskontext:** ${ac.researchContext}`);
    lines.push("");
  }

  // Content blocks (max 6 most relevant)
  if (blocks.length > 0) {
    lines.push("### Content-Blöcke");
    const topBlocks = blocks.slice(0, 6);
    for (const block of topBlocks) {
      lines.push(`\n**[${block.blockType.toUpperCase()}] ${block.title ?? ""}**`);
      // Truncate long blocks
      const body = block.body ?? "";
      lines.push(body.length > 600 ? body.substring(0, 600) + "..." : body);
    }
    if (blocks.length > 6) {
      lines.push(`\n*[${blocks.length - 6} weitere Blöcke verfügbar]*`);
    }
  }

  // Relations (max 8)
  if (knowledge.relations.length > 0) {
    lines.push("\n### Relationen im Knowledge Graph");
    const topRels = knowledge.relations.slice(0, 8);
    for (const rel of topRels) {
      const target = rel.target;
      if (target) {
        const dir = rel.direction === "outgoing" ? "→" : "←";
        lines.push(`- ${entity.canonicalName} ${dir} [${rel.relationType}] ${dir} ${target.canonicalName}`);
      }
    }
  }

  return lines.join("\n");
}

// ─── 6. Product Runtime ───────────────────────────────────────────────────────

function buildProductContext(product: ProductContext | null): string {
  if (!product) return "";

  const lines = [
    `## Product Runtime — ${product.name}`,
    `**Verfügbar:** ${product.available ? "Ja" : "Nein"}`,
  ];

  if (product.priceRange) lines.push(`**Preis:** ${product.priceRange}`);

  if (product.highlights.length > 0) {
    lines.push(`**Highlights:** ${product.highlights.join(" | ")}`);
  }

  if (product.badgeLabels.length > 0) {
    lines.push(`**Labels:** ${product.badgeLabels.join(", ")}`);
  }

  if (product.upsellSlugs.length > 0) {
    lines.push(`**Empfohlene Kombinationen:** ${product.upsellSlugs.join(", ")}`);
  }

  if (product.storageInstructions) {
    lines.push(`**Lagerung:** ${product.storageInstructions}`);
  }

  return lines.join("\n");
}

// ─── 8. Compliance ───────────────────────────────────────────────────────────

function buildComplianceRules(agentRole: AgentRole, intent: string): string {
  const base = `## Compliance-Regeln (IMMER einhalten)

IMMER:
- "Research Use Only" Framing
- Keine medizinischen Heilversprechen
- Keine Therapieempfehlungen
- Keine Diagnosen

NIEMALS:
- "heilt", "behandelt", "therapiert", "verhindert" (im medizinischen Sinne)
- Konkrete Dosierungsangaben für Menschen
- "klinisch bewiesen" ohne Quellenangabe`;

  if (intent === "compliance") {
    return base + `\n\n⚠️ DOSIERUNGSANFRAGE ERKANNT:
Dosierungsangaben für Menschen sind VERBOTEN.
Antworte: "Dosierungsangaben für Menschen können wir nicht geben. Diese Informationen sind ausschließlich für Forschungszwecke. Für medizinische Fragen wende dich an einen Arzt."`;
  }

  return base;
}

// ─── 9. Tonality ─────────────────────────────────────────────────────────────

const TONALITY_MAP: Record<AgentRole, string> = {
  pepgpt: `## Tonalität
Wie ein erfahrener Biohacker-Coach — nicht wie ein Wikipedia-Artikel.
Wissenschaftlich präzise, aber menschlich und direkt.
Stelle Rückfragen wenn nötig. Führe das Gespräch.
Ton: "Ich kenne die Biologie — lass mich dir helfen das zu verstehen."
Niemals: Aufzählungen ohne Kontext. Immer: Zusammenhänge erklären.`,
  salesgpt: `## Tonalität
Wie ein kompetenter Berater, dem man vertraut — nicht wie ein Verkäufer.
Kompetenz überzeugt. Kein Druck. Kein Hardselling.
Direkt, klar, auf den Punkt.
Ton: "Ich kenne die Produkte — ich finde was für dich passt."
Niemals: Produktlisten ohne Kontext. Immer: Empfehlung mit Begründung.`,

  supportgpt: `## Tonalität
Freundlich, lösungsorientiert, präzise.
Kurze, klare Antworten. Keine unnötigen Fachbegriffe.`,

  academy: `## Tonalität
Akademisch präzise. Tiefes Fachwissen.
Quellenangaben wo möglich. Differenziert.`,

  content: `## Tonalität
Jung, smart, viral-tauglich.
Kein Corporate-Blabla. Direkt und einprägsam.`,
};

// ─── 10. Academy Context ─────────────────────────────────────────────────────

function buildAcademyContext(knowledge: KnowledgeView | null, agentRole: AgentRole): string {
  if (agentRole !== "academy" && agentRole !== "pepgpt") return "";
  if (!knowledge) return "";

  const academyBlocks = knowledge.blocks.filter(b =>
    Array.isArray(b.scope) && b.scope.includes("academy") && b.layer === "L4"
  );

  if (academyBlocks.length === 0) return "";

  const lines = ["## Academy-Kontext (L4 — Expertenebene)"];
  for (const block of academyBlocks.slice(0, 2)) {
    lines.push(`\n**${block.title ?? block.blockType}:**`);
    const body = block.body ?? "";
    lines.push(body.length > 400 ? body.substring(0, 400) + "..." : body);
  }

  return lines.join("\n");
}

// ─── 11. SEO Context ─────────────────────────────────────────────────────────

function buildSEOContext(knowledge: KnowledgeView | null, intent: string): string {
  if (intent !== "seo") return "";
  if (!knowledge) return "";

  const entity = knowledge.entity as any;
  if (!entity.seoTitle && !entity.seoDescription) return "";

  return `## SEO-Kontext
**SEO-Titel:** ${entity.seoTitle ?? "—"}
**SEO-Description:** ${entity.seoDescription ?? "—"}
**Keywords:** ${(entity.seoKeywords ?? []).join(", ")}`;
}

// ─── 3b. User Level Adaption ────────────────────────────────────────────────────

function buildUserLevelContext(level: UserLevel): string {
  const descriptions: Record<UserLevel, string> = {
    beginner: `## Nutzer-Level: Einsteiger
Der Nutzer hat wenig Vorwissen. Erkläre Begriffe, vermeide Fachjargon und nutze Analogien.
Maximale Verständlichkeit. Keine überflüssigen Fachbegriffe.`,
    advanced: `## Nutzer-Level: Fortgeschritten
Der Nutzer kennt Grundlagen. Fachbegriffe sind erlaubt, aber kurz erklären.
Kombinationen und Mechanismen dürfen detaillierter behandelt werden.`,
    expert: `## Nutzer-Level: Experte
Der Nutzer hat tiefes Fachwissen. Volle wissenschaftliche Präzision.
Signalwege, Rezeptoren, Studiendesigns, Biomarker — alles ohne Vereinfachung.
Fachbegriffe ohne Erklärung verwenden.`,
  };
  return descriptions[level];
}

// ─── 12. Output Rules ────────────────────────────────────────────────────────

function buildOutputRules(agentRole: AgentRole, intent: string): string {
  const base = `## Output-Regeln
- Antworte auf Deutsch (außer wenn explizit anders gefragt)
- Maximal 300 Wörter (außer Academy-Anfragen: max. 600)
- Strukturiere mit Absätzen, nicht Bullet-Listen (außer bei Produktlisten)
- Beende jede Antwort mit dem Disclaimer: "*Research Use Only — nicht für den menschlichen Gebrauch.*"`;

  if (agentRole === "salesgpt") {
    return base + `\n- Erwähne relevante Produkte natürlich und kompetent
- Schlage passende Kombinationen vor wenn sinnvoll`;
  }

  if (agentRole === "supportgpt") {
    return base + `\n- Halte Antworten kurz und lösungsorientiert
- Eskaliere bei komplexen Fragen: "Für detailliertere Fragen wende dich an unser Team."`;
  }

  return base;
}

// ─── Main Prompt Builder ──────────────────────────────────────────────────────

export function buildDynamicPrompt(ctx: PromptContext): BuiltPrompt {
  const systemParts: string[] = [];

  // 1. Foundation Context
  systemParts.push(buildFoundationContext());

  // 2. Agent Rolle
  systemParts.push(buildAgentRole(ctx.agentRole));

  // 3. Intent
  systemParts.push(buildIntentContext(ctx.intent));

  // 3b. User Level Adaption
  if (ctx.userLevel) systemParts.push(buildUserLevelContext(ctx.userLevel));

  // 4. Long-Term Memory (wenn vorhanden)
  if (ctx.longTermMemoryText) systemParts.push(ctx.longTermMemoryText);

  // 5. Knowledge OS
  systemParts.push(buildKnowledgeContext(ctx.knowledge, ctx.knowledgeViewUsed));

  // 6. Product Runtime
  const productSection = buildProductContext(ctx.productContext);
  if (productSection) systemParts.push(productSection);

  // 7. Learning Runtime (Few-Shots)
  const fewShotSection = formatFewShotsForPrompt(ctx.fewShots);
  if (fewShotSection) systemParts.push(fewShotSection);

  // 8. Compliance
  systemParts.push(buildComplianceRules(ctx.agentRole, ctx.intent));

  // 9. Tonality
  systemParts.push(TONALITY_MAP[ctx.agentRole] ?? TONALITY_MAP.pepgpt);

  // 10. Academy Context
  const academySection = buildAcademyContext(ctx.knowledge, ctx.agentRole);
  if (academySection) systemParts.push(academySection);

  // 11. SEO Context
  const seoSection = buildSEOContext(ctx.knowledge, ctx.intent);
  if (seoSection) systemParts.push(seoSection);

  // 12. Output Rules
  systemParts.push(buildOutputRules(ctx.agentRole, ctx.intent));

  const systemPrompt = systemParts.join("\n\n---\n\n");

  // User prompt = just the query (history is in messages array)
  const userPrompt = ctx.query;

  return { systemPrompt, userPrompt };
}
