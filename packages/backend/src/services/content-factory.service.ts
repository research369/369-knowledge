/**
 * content-factory.service.ts
 *
 * Phase 3 — Content entsteht aus Wissen
 *
 * Erzeugt automatisch alle 16 Output-Typen aus der Wissensbasis.
 * Kein Content wird separat geschrieben — alles kommt aus dem Knowledge Graph.
 *
 * Output-Typen:
 *   1.  shop_description     — Produktbeschreibung für Shop
 *   2.  academy_module       — Academy-Modul mit Lernzielen
 *   3.  seo_page             — SEO-optimierte Seite
 *   4.  faq_set              — FAQ-Set (5 Fragen + Antworten)
 *   5.  newsletter           — Newsletter-Abschnitt
 *   6.  social_tiktok        — TikTok-Script (60s)
 *   7.  social_instagram     — Instagram-Caption + Hashtags
 *   8.  pdf_summary          — PDF-Zusammenfassung
 *   9.  video_script         — Video-Script (3–5 Minuten)
 *   10. sales_arguments      — Sales-Argumente für Agent
 *   11. support_answers      — Support-Antworten für häufige Fragen
 *   12. agent_context        — Vollständiger Agenten-Kontext
 *   13. comparison_page      — Vergleichsseite mit ähnlichen Compounds
 *   14. landing_page         — Landing Page Copy
 *   15. bundle_description   — Bundle/Stack-Beschreibung
 *   16. glossary_entry       — Glossar-Eintrag
 *
 * ADDITIV — verändert keine bestehenden Funktionen.
 */

import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { invokeLLM } from "./llm-provider.service.js";

// ─── Typen ────────────────────────────────────────────────────────────────────

export type OutputType =
  | "shop_description"
  | "academy_module"
  | "seo_page"
  | "faq_set"
  | "newsletter"
  | "social_tiktok"
  | "social_instagram"
  | "pdf_summary"
  | "video_script"
  | "sales_arguments"
  | "support_answers"
  | "agent_context"
  | "comparison_page"
  | "landing_page"
  | "bundle_description"
  | "glossary_entry";

export interface ContentFactoryResult {
  entityId: string;
  entitySlug: string;
  outputType: OutputType;
  content: Record<string, any>;
  generatedAt: string;
  status: "generated" | "error";
  error?: string;
}

// ─── System-Prompt (Compliance-konform) ──────────────────────────────────────

const BASE_SYSTEM_PROMPT = `Du bist der Content-Generator für 369 Research, eine europäische Premium-Marke für Research Compounds.

COMPLIANCE-REGELN (KRITISCH — niemals verletzen):
- Alle Inhalte auf Deutsch
- IMMER "Research Use Only" / "Nur für Forschungszwecke" Framing
- NIEMALS: Heilversprechen, medizinische Empfehlungen, Dosierungsangaben für Menschen
- NIEMALS: "heilt", "behandelt", "therapiert", "garantiert", "wirkt bei"
- NIEMALS: Konkrete Dosierungen für Menschen (auch nicht implizit)
- Ton: wissenschaftlich präzise, Premium, evidenzbasiert
- Quellenangaben nur wenn real (PMID oder DOI bekannt)

BRAND VOICE:
- "Precision. Purity. Performance."
- "Wir verstehen Biologie besser als der Markt"
- Systemisches Denken: Stacks, Mechanismen, Synergien
- Zielgruppe: Biohacker, High Performer, Bodybuilder, Anti-Aging

AUSGABE: Immer als valides JSON.`;

// ─── Haupt-Funktion ───────────────────────────────────────────────────────────

/**
 * Generiert einen spezifischen Output-Typ für eine Entity.
 * Lädt alle relevanten Daten aus dem Knowledge Graph.
 */
export async function generateContent(
  entityId: string,
  outputType: OutputType
): Promise<ContentFactoryResult> {
  try {
    // 1. Entity-Daten aus Knowledge Graph laden
    const context = await buildEntityContext(entityId);
    if (!context) {
      throw new Error(`Entity ${entityId} not found or not published`);
    }

    // 2. Output-spezifischen Prompt bauen
    const prompt = buildOutputPrompt(outputType, context);

    // 3. LLM aufrufen
    const response = await invokeLLM(
      [
        { role: "system", content: BASE_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      { temperature: 0.4, responseFormat: "json" }
    );

    const rawContent = response.content ?? "{}";
    let content: Record<string, any>;
    try {
      content = JSON.parse(rawContent);
    } catch {
      content = { raw: rawContent };
    }

    // 4. In generated_content_store speichern
    await saveGeneratedContent(entityId, outputType, content, context.knowledgeScore);

    return {
      entityId,
      entitySlug: context.slug,
      outputType,
      content,
      generatedAt: new Date().toISOString(),
      status: "generated",
    };
  } catch (err: any) {
    console.error(`[content-factory] Error generating ${outputType} for ${entityId}:`, err?.message);
    return {
      entityId,
      entitySlug: entityId,
      outputType,
      content: {},
      generatedAt: new Date().toISOString(),
      status: "error",
      error: err?.message,
    };
  }
}

/**
 * Generiert alle 16 Output-Typen für eine Entity.
 */
export async function generateAllContent(
  entityId: string
): Promise<{ generated: number; errors: number; results: ContentFactoryResult[] }> {
  const outputTypes: OutputType[] = [
    "shop_description", "academy_module", "seo_page", "faq_set",
    "newsletter", "social_tiktok", "social_instagram", "pdf_summary",
    "video_script", "sales_arguments", "support_answers", "agent_context",
    "comparison_page", "landing_page", "bundle_description", "glossary_entry",
  ];

  const results: ContentFactoryResult[] = [];
  let generated = 0;
  let errors = 0;

  for (const outputType of outputTypes) {
    const result = await generateContent(entityId, outputType);
    results.push(result);
    if (result.status === "generated") generated++;
    else errors++;
    // Kurze Pause zwischen LLM-Calls
    await new Promise(r => setTimeout(r, 200));
  }

  return { generated, errors, results };
}

// ─── Context Builder ──────────────────────────────────────────────────────────

async function buildEntityContext(entityId: string): Promise<any | null> {
  // Entity-Grunddaten
  const entityRows = await db.execute(sql`
    SELECT e.id, e.slug, e.type, e.canonical_name, e.lifecycle_status,
           e.agent_summary, e.agent_confidence_score,
           e.shop_headline, e.shop_bullet_points,
           e.academy_learning_goals, e.academy_difficulty,
           kes.knowledge_score, kes.research_score, kes.evidence_score,
           kes.completeness_score, kes.missing_block_types
    FROM entities e
    LEFT JOIN knowledge_evolution_scores kes ON kes.entity_id = e.id
    WHERE e.id = ${entityId}
    LIMIT 1
  `) as any[];

  if (!entityRows || entityRows.length === 0) return null;
  const entity = entityRows[0];

  // Content Blocks (alle Layer)
  const blocks = await db.execute(sql`
    SELECT block_type, layer, scope, title, body
    FROM content_blocks
    WHERE entity_id = ${entityId}
    ORDER BY sort_order ASC
  `) as any[];

  // Quellen
  const sources = await db.execute(sql`
    SELECT title, authors, year, study_type, evidence_level, doi, pmid
    FROM sources
    WHERE linked_entity_ids::text LIKE ${'%' + entityId + '%'}
    LIMIT 10
  `) as any[];

  // Relations (direkte Verbindungen)
  const relations = await db.execute(sql`
    SELECT r.relation_type, r.description,
           e2.canonical_name as related_name, e2.type as related_type, e2.slug as related_slug
    FROM relations r
    JOIN entities e2 ON e2.id = r.to_entity_id
    WHERE r.from_entity_id = ${entityId}
    LIMIT 20
  `) as any[];

  // Knowledge Score
  const knowledgeScore = entity.knowledge_score ?? 0.5;

  return {
    id: entity.id,
    slug: entity.slug,
    type: entity.type,
    name: entity.canonical_name,
    agentSummary: entity.agent_summary,
    shopHeadline: entity.shop_headline,
    shopBulletPoints: entity.shop_bullet_points ?? [],
    academyLearningGoals: entity.academy_learning_goals ?? [],
    academyDifficulty: entity.academy_difficulty ?? "intermediate",
    knowledgeScore,
    blocks: blocks.map((b: any) => ({
      type: b.block_type,
      layer: b.layer,
      title: b.title,
      body: b.body,
    })),
    sources: sources.map((s: any) => ({
      title: s.title,
      year: s.year,
      studyType: s.study_type,
      evidenceLevel: s.evidence_level,
      doi: s.doi,
      pmid: s.pmid,
    })),
    relations: relations.map((r: any) => ({
      type: r.relation_type,
      relatedName: r.related_name,
      relatedType: r.related_type,
      relatedSlug: r.related_slug,
      description: r.description,
    })),
  };
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildOutputPrompt(outputType: OutputType, ctx: any): string {
  const baseContext = `
ENTITY: ${ctx.name} (${ctx.type})
SLUG: ${ctx.slug}
KNOWLEDGE SCORE: ${(ctx.knowledgeScore * 100).toFixed(0)}/100

AGENT SUMMARY: ${ctx.agentSummary ?? "Nicht verfügbar"}

CONTENT BLOCKS (${ctx.blocks.length}):
${ctx.blocks.map((b: any) => `[${b.type}/${b.layer}] ${b.title}: ${b.body?.substring(0, 300)}...`).join("\n")}

QUELLEN (${ctx.sources.length}):
${ctx.sources.map((s: any) => `- ${s.title} (${s.year}, ${s.studyType}, ${s.evidenceLevel})`).join("\n")}

RELATIONS (${ctx.relations.length}):
${ctx.relations.map((r: any) => `- ${r.type}: ${r.relatedName} (${r.relatedType})`).join("\n")}
`;

  const prompts: Record<OutputType, string> = {
    shop_description: `${baseContext}

Erstelle eine Premium-Produktbeschreibung für den 369 Research Shop.

JSON-Format:
{
  "headline": "Kurze, prägnante Überschrift (max. 80 Zeichen)",
  "subheadline": "Ergänzende Unterzeile (max. 120 Zeichen)",
  "description": "Hauptbeschreibung (200–300 Wörter, Research Use Only)",
  "bullet_points": ["Punkt 1", "Punkt 2", "Punkt 3", "Punkt 4", "Punkt 5"],
  "target_audience": ["Zielgruppe 1", "Zielgruppe 2"],
  "research_context": "Wissenschaftlicher Kontext (2–3 Sätze)",
  "disclaimer": "Research Use Only Disclaimer",
  "badge_labels": ["Label 1", "Label 2"],
  "cross_sell_hints": ["Synergistisches Produkt 1", "Synergistisches Produkt 2"]
}`,

    academy_module: `${baseContext}

Erstelle ein strukturiertes Academy-Modul für 369 Research Academy.

JSON-Format:
{
  "title": "Modulname",
  "subtitle": "Untertitel",
  "difficulty": "beginner|intermediate|advanced",
  "estimated_time_minutes": 30,
  "learning_goals": ["Lernziel 1", "Lernziel 2", "Lernziel 3"],
  "prerequisites": ["Voraussetzung 1"],
  "chapters": [
    {"title": "Kapitel 1", "content": "Inhalt...", "key_points": ["Punkt 1"]},
    {"title": "Kapitel 2", "content": "Inhalt...", "key_points": ["Punkt 1"]}
  ],
  "quiz_questions": [
    {"question": "Frage?", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "..."}
  ],
  "further_reading": ["Empfehlung 1", "Empfehlung 2"],
  "related_compounds": ["Compound 1", "Compound 2"]
}`,

    seo_page: `${baseContext}

Erstelle SEO-optimierten Content für eine Knowledge Page.

JSON-Format:
{
  "meta_title": "SEO-Titel (max. 60 Zeichen)",
  "meta_description": "Meta-Beschreibung (max. 160 Zeichen)",
  "h1": "Haupt-Überschrift",
  "h2_sections": [
    {"heading": "H2 Überschrift", "content": "Abschnitt..."}
  ],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "schema_type": "MedicalWebPage|Drug|ChemicalSubstance",
  "faq_schema": [
    {"question": "Frage?", "answer": "Antwort..."}
  ],
  "internal_links": ["related-slug-1", "related-slug-2"],
  "canonical_url": "/knowledge/${ctx.slug}"
}`,

    faq_set: `${baseContext}

Erstelle 8 häufig gestellte Fragen mit Antworten.

JSON-Format:
{
  "faqs": [
    {
      "question": "Frage?",
      "answer": "Antwort (2–4 Sätze, Research Use Only)",
      "category": "mechanism|research|safety|storage|comparison",
      "user_level": "beginner|advanced|expert"
    }
  ]
}`,

    newsletter: `${baseContext}

Erstelle einen Newsletter-Abschnitt für 369 Research.

JSON-Format:
{
  "subject_line": "Betreffzeile",
  "preview_text": "Vorschautext (max. 90 Zeichen)",
  "headline": "Newsletter-Überschrift",
  "body": "Haupttext (150–200 Wörter)",
  "cta_text": "Call-to-Action Text",
  "cta_url": "/knowledge/${ctx.slug}",
  "key_insight": "Wichtigste Erkenntnis (1 Satz)",
  "research_highlight": "Forschungs-Highlight"
}`,

    social_tiktok: `${baseContext}

Erstelle ein TikTok-Video-Script (60 Sekunden).

JSON-Format:
{
  "hook": "Erster Satz (0–3 Sekunden, maximaler Aufmerksamkeitsfang)",
  "problem": "Problem/Frage (3–10 Sekunden)",
  "mechanism": "Biologischer Mechanismus einfach erklärt (10–35 Sekunden)",
  "evidence": "Kurze Studienreferenz (35–50 Sekunden)",
  "cta": "Call-to-Action (50–60 Sekunden)",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "on_screen_text": ["Text 1", "Text 2", "Text 3"],
  "tone": "educational|scientific|storytelling"
}`,

    social_instagram: `${baseContext}

Erstelle Instagram-Content.

JSON-Format:
{
  "caption": "Instagram-Caption (max. 300 Zeichen)",
  "hashtags": ["#tag1", "#tag2"],
  "carousel_slides": [
    {"slide_number": 1, "headline": "Überschrift", "body": "Text"},
    {"slide_number": 2, "headline": "Überschrift", "body": "Text"},
    {"slide_number": 3, "headline": "Überschrift", "body": "Text"}
  ],
  "story_text": "Story-Text (max. 100 Zeichen)",
  "visual_suggestion": "Beschreibung des Bildkonzepts"
}`,

    pdf_summary: `${baseContext}

Erstelle eine strukturierte PDF-Zusammenfassung.

JSON-Format:
{
  "title": "PDF-Titel",
  "subtitle": "Untertitel",
  "executive_summary": "Zusammenfassung (100–150 Wörter)",
  "key_mechanisms": ["Mechanismus 1", "Mechanismus 2"],
  "evidence_table": [
    {"study_type": "Studientyp", "finding": "Ergebnis", "evidence_level": "Level"}
  ],
  "research_context": "Forschungskontext (100 Wörter)",
  "related_compounds": ["Compound 1"],
  "disclaimer": "Research Use Only Disclaimer",
  "version": "1.0",
  "date": "${new Date().toISOString().split('T')[0]}"
}`,

    video_script: `${baseContext}

Erstelle ein ausführliches Video-Script (3–5 Minuten).

JSON-Format:
{
  "title": "Video-Titel",
  "duration_minutes": 4,
  "intro": "Einleitung (30 Sekunden)",
  "sections": [
    {"title": "Abschnitt 1", "duration_seconds": 60, "script": "Text...", "b_roll": "Visuelle Beschreibung"}
  ],
  "outro": "Abschluss mit CTA",
  "key_messages": ["Botschaft 1", "Botschaft 2"],
  "thumbnail_concept": "Thumbnail-Beschreibung"
}`,

    sales_arguments: `${baseContext}

Erstelle Sales-Argumente für den 369 Research Sales-Agenten.

JSON-Format:
{
  "primary_value_proposition": "Hauptnutzen (1 Satz)",
  "key_arguments": [
    {"argument": "Argument", "evidence": "Evidenz", "objection_handler": "Einwandbehandlung"}
  ],
  "target_personas": [
    {"persona": "Persona-Name", "pain_point": "Problem", "solution": "Lösung"}
  ],
  "comparison_advantages": ["Vorteil gegenüber Alternativen 1"],
  "stack_suggestions": ["Stack-Empfehlung 1"],
  "price_justification": "Preisbegründung",
  "urgency_triggers": ["Trigger 1"],
  "compliance_note": "Immer Research Use Only betonen"
}`,

    support_answers: `${baseContext}

Erstelle Support-Antworten für häufige Kundenfragen.

JSON-Format:
{
  "answers": [
    {
      "question_pattern": "Frage-Muster",
      "answer": "Antwort (2–4 Sätze)",
      "category": "storage|shipping|research|mechanism|safety",
      "escalate_if": "Bedingung für Eskalation",
      "compliance_check": "Research Use Only Hinweis wenn nötig"
    }
  ]
}`,

    agent_context: `${baseContext}

Erstelle den vollständigen Agenten-Kontext für PepGPT, SalesGPT und SupportGPT.

JSON-Format:
{
  "summary": "Kurze Zusammenfassung für Agenten (max. 200 Zeichen)",
  "mechanisms": ["Mechanismus 1", "Mechanismus 2"],
  "evidence_level": "high|medium|low",
  "key_studies": ["Studie 1 (Jahr, Typ)"],
  "synergies": ["Synergistisches Compound 1"],
  "contraindications": ["Kontraindikation 1"],
  "common_questions": ["Häufige Frage 1"],
  "sales_hooks": ["Sales-Hook 1"],
  "support_notes": ["Support-Hinweis 1"],
  "compliance_flags": ["Flag 1"],
  "user_level_adaptations": {
    "beginner": "Einfache Erklärung",
    "advanced": "Mittlere Erklärung",
    "expert": "Wissenschaftliche Erklärung"
  }
}`,

    comparison_page: `${baseContext}

Erstelle eine Vergleichsseite mit ähnlichen Compounds.

JSON-Format:
{
  "title": "Vergleichstitel",
  "intro": "Einleitung (50–80 Wörter)",
  "comparison_table": [
    {
      "compound": "Compound-Name",
      "mechanism": "Mechanismus",
      "evidence_level": "Level",
      "best_for": "Anwendungsbereich",
      "synergy_with_main": "Synergie"
    }
  ],
  "recommendation": "Empfehlung (Research Use Only)",
  "stack_suggestion": "Stack-Empfehlung"
}`,

    landing_page: `${baseContext}

Erstelle Landing Page Copy.

JSON-Format:
{
  "hero_headline": "Hero-Überschrift",
  "hero_subheadline": "Hero-Unterzeile",
  "hero_cta": "CTA-Text",
  "sections": [
    {"type": "problem|solution|mechanism|evidence|cta", "headline": "Überschrift", "body": "Text"}
  ],
  "social_proof_placeholder": "Platzhalter für Testimonials",
  "final_cta_headline": "Abschluss-CTA Überschrift",
  "final_cta_text": "CTA-Text",
  "disclaimer": "Research Use Only"
}`,

    bundle_description: `${baseContext}

Erstelle Bundle/Stack-Beschreibungen für Produkt-Kombinationen.

JSON-Format:
{
  "stack_name": "Stack-Name",
  "stack_rationale": "Begründung der Kombination (50–80 Wörter)",
  "synergy_explanation": "Synergie-Erklärung (wissenschaftlich, Research Use Only)",
  "components": [
    {"compound": "Compound-Name", "role_in_stack": "Rolle", "mechanism_contribution": "Beitrag"}
  ],
  "target_use_case": "Anwendungsbereich",
  "research_context": "Forschungskontext",
  "disclaimer": "Research Use Only"
}`,

    glossary_entry: `${baseContext}

Erstelle einen Glossar-Eintrag.

JSON-Format:
{
  "term": "${ctx.name}",
  "short_definition": "Kurzdefinition (max. 50 Wörter)",
  "full_definition": "Vollständige Definition (100–150 Wörter)",
  "synonyms": ["Synonym 1"],
  "related_terms": ["Verwandter Begriff 1"],
  "category": "peptide|mechanism|pathway|receptor|compound",
  "difficulty_level": "beginner|intermediate|expert",
  "example_sentence": "Beispielsatz"
}`,
  };

  return prompts[outputType] ?? `Erstelle Content vom Typ "${outputType}" für ${ctx.name}. Ausgabe als JSON.`;
}

// ─── Speichern ────────────────────────────────────────────────────────────────

async function saveGeneratedContent(
  entityId: string,
  outputType: OutputType,
  content: Record<string, any>,
  knowledgeScore: number
): Promise<void> {
  await db.execute(sql`
    INSERT INTO generated_content_store
      (id, entity_id, output_type, content_json, knowledge_score_at_generation,
       generation_model, status, created_at, updated_at)
    VALUES
      (${uuidv4()}, ${entityId}, ${outputType}, ${JSON.stringify(content)}::jsonb,
       ${knowledgeScore}, 'gpt-4o-mini', 'draft', NOW(), NOW())
    ON CONFLICT (entity_id, output_type)
    DO UPDATE SET
      content_json = EXCLUDED.content_json,
      knowledge_score_at_generation = EXCLUDED.knowledge_score_at_generation,
      status = 'draft',
      updated_at = NOW()
  `);
}

// ─── Abruf ────────────────────────────────────────────────────────────────────

/**
 * Gespeicherten generierten Content abrufen.
 */
export async function getGeneratedContent(
  entityId: string,
  outputType: OutputType
): Promise<Record<string, any> | null> {
  const result = await db.execute(sql`
    SELECT content_json, status, updated_at
    FROM generated_content_store
    WHERE entity_id = ${entityId} AND output_type = ${outputType}
    LIMIT 1
  `) as any[];

  if (!result || result.length === 0) return null;
  return {
    content: result[0].content_json,
    status: result[0].status,
    updatedAt: result[0].updated_at,
  };
}
