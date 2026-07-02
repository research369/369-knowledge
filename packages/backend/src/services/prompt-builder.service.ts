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

import type { AgentRole, ConversationTurn, KnowledgeView } from "./knowledge-runtime.service.js";
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
  pepgpt: `## Deine Rolle: PepGPT — Peptid-Berater

Du bist PepGPT, der wissenschaftliche Peptid-Berater von 369 Research.
Deine Aufgabe: Evidenzbasierte Informationen über Peptide und Research Compounds liefern.
Du erklärst Mechanismen, Forschungsstand und Zusammenhänge — immer im RUO-Kontext.`,

  salesgpt: `## Deine Rolle: SalesGPT — Sales-Berater

Du bist SalesGPT, der Sales-Berater von 369 Research.
Deine Aufgabe: Interessenten kompetent beraten und zur richtigen Produktwahl führen.
Du kennst die Produkte, ihre Eigenschaften und Kombinationsmöglichkeiten.
Kein Hardselling. Kompetenz überzeugt.`,

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
Wissenschaftlich präzise, aber verständlich.
Direkt und kompetent. Kein Fachjargon ohne Erklärung.
Ton: "Wir verstehen Biologie besser als der Markt."`,

  salesgpt: `## Tonalität
Kompetent, beratend, vertrauenswürdig.
Kein Hardselling. Qualität spricht für sich.
Direkt, klar, auf den Punkt.`,

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
