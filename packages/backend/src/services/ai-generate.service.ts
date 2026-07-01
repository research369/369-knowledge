/**
 * ai-generate.service.ts
 *
 * Content-Generierung für das 369 Knowledge OS.
 * Nutzt die LLM-Provider-Abstraktion — kein direkter OpenAI-Import mehr.
 * Provider-Konfiguration über Environment Variables (siehe llm-provider.service.ts).
 */

import { invokeLLM, getLLMProviderConfig } from "./llm-provider.service.js";

export interface GeneratedContent {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  metrics: { label: string; value: string }[];
  blocks: {
    layer: string;
    scope: string[];
    blockType: string;
    title: string;
    body: string;
    sources: string[];
    sortOrder: number;
  }[];
  suggestedRelations: {
    relationType: string;
    toEntityId: string;
    toEntityName: string;
    description: string;
  }[];
}

const SYSTEM_PROMPT = `Du bist ein wissenschaftlicher Redakteur für 369 Research, eine europäische Premium-Marke für Research Compounds.

WICHTIGE REGELN:
- Alle Inhalte auf Deutsch
- Ausschließlich evidenzbasiert — keine Bro-Science
- IMMER "Research Use Only" Framing
- NIEMALS: Heilversprechen, medizinische Empfehlungen, Dosierungsangaben für Menschen
- NIEMALS: "heilt", "behandelt", "therapiert", "garantiert"
- Ton: wissenschaftlich präzise, aber verständlich — "Wir verstehen Biologie besser als der Markt"
- Quellenangaben: Echte PubMed-IDs (PMID:XXXXXXXX) oder DOI — keine erfundenen Quellen
- Wenn keine echte Quelle bekannt: Feld leer lassen, nicht erfinden

LAYER-DEFINITION:
- L1: Grundlagen (Definition, Geschichte, Begriffe) — öffentlich
- L2: Biologie (Signalwege, Rezeptoren, Mechanismen) — öffentlich  
- L3: Forschung (Studien, Evidenz, Meta-Analysen) — öffentlich
- L4: Interpretation (Einordnung, Bewertung) — Academy
- L5: Praxis (Kombinationen, Fehler) — Academy Pro
- L6: Expertenwissen (Deep Dives) — Academy Pro

SCOPE:
- portal: L1, L2, L3
- academy: L1-L6
- bedo: L1-L7`;

export async function generateEntityContent(
  entityName: string,
  entityType: string,
  additionalContext?: string
): Promise<GeneratedContent> {
  const config = getLLMProviderConfig();
  if (!config.enabled) {
    throw new Error(
      `Knowledge Factory LLM nicht verfügbar: ${config.reason ?? "Kein API Key"}. ` +
      `Bitte OPENAI_API_KEY in Railway Variables setzen.`
    );
  }

  const userPrompt = buildPrompt(entityName, entityType, additionalContext);

  const response = await invokeLLM(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.3, responseFormat: "json" }
  );

  if (!response.content) throw new Error("No content generated");

  return JSON.parse(response.content) as GeneratedContent;
}

function buildPrompt(name: string, type: string, context?: string): string {
  const typeInstructions: Record<string, string> = {
    compound: `Erstelle vollständigen wissenschaftlichen Content für das Compound/Peptid "${name}".
Erstelle folgende Content-Blöcke:
- L1/definition: "Was ist ${name}?" (2-3 Absätze, Grundlagen)
- L1/simple_explanation: "Einfach erklärt" (1 Absatz, Laiensprache)
- L2/mechanisms: Bis zu 5 Wirkmechanismen (je Titel + Erklärung)
- L3/research: Bis zu 4 Forschungsergebnisse mit echten PMID-Quellen
- L3/evidence_summary: Zusammenfassung der Evidenzlage
- L1/faq: 5 häufige Fragen mit Antworten (Research Use Only Framing)`,

    guide: `Erstelle vollständigen Content für den Praxis-Guide "${name}".
Erstelle folgende Content-Blöcke:
- L1/introduction: Einführung (Was, Warum, Wer braucht das)
- L1/materials: Benötigte Materialien (falls relevant)
- L2/steps: Schritt-für-Schritt Anleitung
- L2/common_mistakes: Häufige Fehler und wie man sie vermeidet
- L3/background: Wissenschaftlicher Hintergrund
- L1/faq: 5 häufige Fragen`,

    stack: `Erstelle wissenschaftlichen Content für den Research-Stack "${name}".
Erstelle folgende Content-Blöcke:
- L1/definition: Was ist dieser Stack / welches Forschungsziel
- L2/compounds: Beteiligte Compounds und ihre Rollen (NUR Mechanismus-Ebene, KEINE Dosierungen)
- L2/synergies: Wissenschaftliche Synergie-Logik
- L3/research: Relevante Forschung
- L1/disclaimer: Research Use Only Hinweis`,
  };

  const instruction = typeInstructions[type] ?? typeInstructions.compound;

  return `${instruction}

${context ? `Zusätzlicher Kontext: ${context}` : ""}

Antworte ausschließlich als JSON mit dieser Struktur:
{
  "seoTitle": "string (max 60 Zeichen)",
  "seoDescription": "string (max 160 Zeichen)",
  "seoKeywords": ["keyword1", "keyword2", ...],
  "metrics": [
    {"label": "Kategorie", "value": "Peptid"},
    {"label": "Forschungsstand", "value": "Präklinisch"},
    {"label": "Evidenzlevel", "value": "Tier/In-vitro"},
    {"label": "Forschungsjahre", "value": "seit 1990"}
  ],
  "blocks": [
    {
      "layer": "L1",
      "scope": ["portal", "academy", "bedo"],
      "blockType": "definition",
      "title": "Was ist ${name}?",
      "body": "...",
      "sources": ["PMID:12345678"],
      "sortOrder": 1
    }
  ],
  "suggestedRelations": [
    {
      "relationType": "activates",
      "toEntityId": "vegf",
      "toEntityName": "VEGF",
      "description": "${name} aktiviert VEGF-Expression"
    }
  ]
}`;
}
