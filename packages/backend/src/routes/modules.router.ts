/**
 * modules.router.ts
 *
 * Knowledge Modules Layer — zweite Wissensebene des 369 Knowledge OS
 *
 * Endpoints:
 *   GET  /api/entity/:slug/modules                    — alle agent_available Module für eine Entity
 *   GET  /api/entity/:slug/modules/:type              — einzelner Modul-Typ
 *   POST /api/entity/:slug/modules/generate           — LLM-Generierung (Admin)
 *   POST /api/entity/:slug/modules/:id/approve        — Modul freigeben (Admin)
 *   GET  /api/modules/admin/pending                   — alle pending Module (Admin)
 *
 * Contract:
 *   - Nur review_status = 'agent_available' wird an Agenten ausgegeben
 *   - Dosierungen nur als research_range, nie als direkte Empfehlung
 *   - Kein Agent schreibt in diese Tabelle
 */

import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { invokeLLM } from "../services/llm-provider.service.js";
import { randomUUID } from "crypto";

const router = Router();

// ─── Erlaubte Modul-Typen ─────────────────────────────────────────────────────

const VALID_MODULE_TYPES = [
  "protocol_reference",
  "dosage_reference",
  "decision_tree",
  "monitoring",
  "bloodwork",
  "interaction",
  "contraindication",
  "stack_logic",
  "coach_notes",
  "sales_notes",
  "support_notes",
  "risk_profile",
  "user_pattern",
  "beginner_mistakes",
  "comparison_logic",
  "escalation_rule",
] as const;

type ModuleType = typeof VALID_MODULE_TYPES[number];

// ─── Agenten-Zuordnung ────────────────────────────────────────────────────────

const AGENT_MODULE_MAP: Record<string, ModuleType[]> = {
  pepgpt: ["coach_notes", "decision_tree", "monitoring", "bloodwork", "interaction", "contraindication", "comparison_logic"],
  salesgpt: ["sales_notes", "stack_logic", "decision_tree", "comparison_logic", "contraindication", "escalation_rule"],
  supportgpt: ["support_notes", "monitoring", "bloodwork", "escalation_rule", "risk_profile", "contraindication"],
};

// ─── High-Risk Klassen ────────────────────────────────────────────────────────

const HIGH_RISK_CLASSES = ["aas", "hgh", "glp1", "thyroid", "insulin", "sarms", "stimulants", "unclear_human"];

const HIGH_RISK_REQUIRED_FIELDS = [
  "cardiovascular_risk", "blood_pressure_risk", "lipid_risk", "hematocrit_risk",
  "liver_risk", "kidney_risk", "glucose_insulin_risk", "fertility_risk",
  "psychiatric_risk", "female_specific_risk", "red_flags", "required_bloodwork", "escalation_rules",
];

// ─── LLM Prompt Templates ─────────────────────────────────────────────────────

function buildModulePrompt(moduleType: ModuleType, entityName: string, entityContext: string): string {
  const baseInstructions = `Du bist ein wissenschaftlicher Wissens-Assistent für das 369 Knowledge OS.
Du lieferst ausschließlich strukturierte Daten — keine fertigen Chatantworten, keine Verkaufstexte, keine Coachinglogik.
Alle Informationen sind Research Use Only (RUO). Keine direkten Einnahmeempfehlungen für Menschen.
Antworte ausschließlich mit validem JSON.

Entity: ${entityName}
Kontext: ${entityContext}

`;

  const prompts: Record<ModuleType, string> = {
    protocol_reference: `${baseInstructions}
Erstelle ein protocol_reference Modul für ${entityName}.
Liefere Literatur- und Research-Kontext zu bekannten Protokollmustern aus wissenschaftlichen Quellen.
KEINE direkten Einnahmeempfehlungen. Nur Research-Kontext.

JSON-Struktur:
{
  "summary": "Kurze Übersicht bekannter Protokollmuster in der Literatur",
  "research_protocols": [
    {
      "name": "Protokoll-Name aus Literatur",
      "source": "Studie/Quelle",
      "context": "Forschungskontext",
      "notes": "Wichtige Hinweise"
    }
  ],
  "administration_routes_studied": ["subcutaneous", "oral", ...],
  "timing_patterns_in_literature": "Beschreibung zeitlicher Muster aus Studien",
  "compliance_note": "Research Use Only — keine persönliche Anwendungsempfehlung"
}`,

    dosage_reference: `${baseInstructions}
Erstelle ein dosage_reference Modul für ${entityName}.
Liefere Studienbereiche und Research-Kontext. KEINE direkten Dosierungsempfehlungen für Menschen.
Nur research_range und clinical_range_if_approved.

JSON-Struktur:
{
  "research_range": "Bereich aus präklinischen/klinischen Studien (z.B. '1-10 mg/kg in Tiermodellen')",
  "clinical_range_if_approved": null,
  "animal_data": "Zusammenfassung Tierstudien-Dosierungen",
  "human_data": "Zusammenfassung Humanstudien falls vorhanden, sonst null",
  "approved_medical_context": null,
  "research_only_context": "Nur für Forschungszwecke",
  "confidence_score": 0.0,
  "source_quality": "preclinical|pilot_human|clinical",
  "legal_scope": "Research Use Only — EU",
  "agent_allowed_scope": "Darf nur als Studienbereich kommuniziert werden, nie als persönliche Empfehlung",
  "forbidden_scope": "Direkte Dosierungsempfehlung für Menschen",
  "compliance_note": "In Studien/Literatur wurden Bereiche X beschrieben. Das ist keine persönliche Anwendungsempfehlung."
}`,

    decision_tree: `${baseInstructions}
Erstelle ein decision_tree Modul für ${entityName}.
Entscheidungslogik für Agenten: Wann dieses Compound empfehlen, wann nicht, welche Alternativen.

JSON-Struktur:
{
  "primary_use_case": "Hauptanwendungsfall in der Forschung",
  "decision_nodes": [
    {
      "condition": "Wenn Nutzer nach X fragt",
      "recommendation": "Dann ${entityName} relevant weil...",
      "alternatives": ["Alternative A", "Alternative B"],
      "priority": "high|medium|low"
    }
  ],
  "vs_alternatives": [
    {
      "compound": "Vergleichs-Compound",
      "prefer_this_when": "Wann ${entityName} bevorzugen",
      "prefer_alternative_when": "Wann Alternative bevorzugen"
    }
  ],
  "contraindication_flags": ["Flag 1", "Flag 2"],
  "escalation_triggers": ["Trigger 1", "Trigger 2"]
}`,

    monitoring: `${baseInstructions}
Erstelle ein monitoring Modul für ${entityName}.
Was sollte im Forschungskontext beobachtet werden? Symptome, Verträglichkeit, Verlauf.

JSON-Struktur:
{
  "parameters_to_monitor": [
    {
      "parameter": "Parameter-Name",
      "frequency": "täglich|wöchentlich|monatlich",
      "reason": "Warum relevant",
      "normal_range": "Normalbereich falls bekannt"
    }
  ],
  "subjective_indicators": ["Indikator 1", "Indikator 2"],
  "objective_markers": ["Marker 1", "Marker 2"],
  "timeline_checkpoints": [
    { "timepoint": "Woche 1", "expected_changes": "Erwartete Veränderungen" }
  ],
  "warning_signs": ["Warnsignal 1", "Warnsignal 2"],
  "discontinuation_criteria": ["Kriterium 1", "Kriterium 2"]
}`,

    bloodwork: `${baseInstructions}
Erstelle ein bloodwork Modul für ${entityName}.
Welche Blutwerte sind relevant? Besonders wichtig bei HGH, GLP-1, AAS, Schilddrüse, Insulin.

JSON-Struktur:
{
  "relevant_markers": [
    {
      "marker": "Marker-Name",
      "relevance": "Warum relevant für ${entityName}",
      "expected_change": "Erwartete Veränderung",
      "monitoring_frequency": "Empfohlene Häufigkeit aus Literatur",
      "reference_range": "Referenzbereich"
    }
  ],
  "baseline_recommended": true,
  "panels_recommended": ["Blutbild", "Leberwerte", ...],
  "high_risk_markers": ["Marker 1", "Marker 2"],
  "compliance_note": "Blutwert-Empfehlungen basieren auf Forschungsliteratur, nicht auf medizinischer Beratung"
}`,

    interaction: `${baseInstructions}
Erstelle ein interaction Modul für ${entityName}.
Mögliche Wechselwirkungen und Kombinationsrisiken aus der Literatur.

JSON-Struktur:
{
  "known_interactions": [
    {
      "compound": "Compound-Name",
      "interaction_type": "synergistic|antagonistic|additive|unknown",
      "mechanism": "Mechanismus der Wechselwirkung",
      "risk_level": "low|medium|high|unknown",
      "source": "Quellenangabe"
    }
  ],
  "drug_interactions": [
    {
      "drug_class": "Medikamentenklasse",
      "interaction": "Art der Wechselwirkung",
      "recommendation": "Vorsicht/Kontraindikation/Monitoring"
    }
  ],
  "food_interactions": [],
  "general_notes": "Allgemeine Hinweise zu Wechselwirkungen"
}`,

    contraindication: `${baseInstructions}
Erstelle ein contraindication Modul für ${entityName}.
Wann nicht empfehlen, wann eskalieren, wann ärztliche Abklärung nötig.

JSON-Struktur:
{
  "absolute_contraindications": [
    {
      "condition": "Kontraindikation",
      "reason": "Begründung",
      "source": "Quellenangabe"
    }
  ],
  "relative_contraindications": [
    {
      "condition": "Relative Kontraindikation",
      "reason": "Begründung",
      "monitoring_required": true
    }
  ],
  "population_warnings": {
    "pregnancy": "Warnung/Kontraindikation",
    "breastfeeding": "Warnung/Kontraindikation",
    "children": "Warnung/Kontraindikation",
    "elderly": "Hinweis",
    "renal_impairment": "Hinweis",
    "hepatic_impairment": "Hinweis"
  },
  "escalation_required_when": ["Situation 1", "Situation 2"],
  "physician_consultation_required": ["Situation 1", "Situation 2"]
}`,

    stack_logic: `${baseInstructions}
Erstelle ein stack_logic Modul für ${entityName}.
Welche Kombinationen sind logisch, welche nicht, welche Reihenfolge ist sinnvoll.

JSON-Struktur:
{
  "synergistic_stacks": [
    {
      "compounds": ["${entityName}", "Compound B"],
      "rationale": "Warum diese Kombination sinnvoll",
      "mechanism": "Mechanistischer Hintergrund",
      "research_support": "Evidenzlage"
    }
  ],
  "sequential_protocols": [
    {
      "phase": "Phase 1",
      "compounds": ["Compound A"],
      "rationale": "Warum diese Reihenfolge"
    }
  ],
  "avoid_combinations": [
    {
      "compounds": ["${entityName}", "Compound X"],
      "reason": "Warum vermeiden"
    }
  ],
  "optimal_timing_relative_to_others": "Timing-Empfehlung aus Literatur",
  "stack_categories": ["Anti-Aging", "Performance", "Recovery", ...]
}`,

    coach_notes: `${baseInstructions}
Erstelle coach_notes für ${entityName}.
Praktisches Erklärwissen für PepGPT — wie erklärt man dieses Compound verständlich?

JSON-Struktur:
{
  "simple_explanation": "Erklärung in einfachen Worten (Beginner-Level)",
  "intermediate_explanation": "Erklärung für Fortgeschrittene",
  "expert_explanation": "Wissenschaftliche Erklärung",
  "key_talking_points": ["Punkt 1", "Punkt 2", "Punkt 3"],
  "common_questions": [
    {
      "question": "Häufige Frage",
      "answer": "Strukturierte Antwort",
      "level": "beginner|intermediate|expert"
    }
  ],
  "analogies": ["Analogie 1 für besseres Verständnis"],
  "misconceptions_to_address": ["Missverständnis 1", "Missverständnis 2"]
}`,

    sales_notes: `${baseInstructions}
Erstelle sales_notes für ${entityName}.
Qualifizierung, Produktlogik, Einwandmuster für SalesGPT. Keine direkten Verkaufsaussagen.

JSON-Struktur:
{
  "target_customer_profiles": [
    {
      "profile": "Kundenprofil",
      "primary_interest": "Hauptinteresse",
      "key_benefits_for_this_profile": ["Benefit 1", "Benefit 2"]
    }
  ],
  "qualification_questions": ["Frage 1", "Frage 2"],
  "objection_handling": [
    {
      "objection": "Einwand",
      "response_framework": "Antwort-Framework (keine direkte Aussage, nur Struktur)"
    }
  ],
  "upsell_opportunities": ["Upsell 1", "Upsell 2"],
  "bundle_suggestions": ["Bundle 1", "Bundle 2"],
  "price_justification_points": ["Punkt 1", "Punkt 2"],
  "compliance_note": "Alle Aussagen müssen RUO-konform sein"
}`,

    support_notes: `${baseInstructions}
Erstelle support_notes für ${entityName}.
Problembaum, bekannte Fehler, Lagerung, Nebenwirkungen, Eskalation für SupportGPT.

JSON-Struktur:
{
  "common_issues": [
    {
      "issue": "Problem-Beschreibung",
      "likely_cause": "Wahrscheinliche Ursache",
      "resolution": "Lösungsansatz",
      "escalation_required": false
    }
  ],
  "storage_instructions": {
    "temperature": "Lagertemperatur",
    "light_sensitivity": true,
    "shelf_life": "Haltbarkeit",
    "reconstitution_notes": "Hinweise zur Rekonstitution falls relevant"
  },
  "side_effects_from_literature": [
    {
      "effect": "Nebenwirkung",
      "frequency": "häufig|gelegentlich|selten|sehr selten",
      "severity": "mild|moderate|severe",
      "management": "Umgang"
    }
  ],
  "escalation_triggers": ["Trigger 1", "Trigger 2"],
  "faq_support": [
    { "q": "Support-Frage", "a": "Support-Antwort" }
  ]
}`,

    risk_profile: `${baseInstructions}
Erstelle ein risk_profile für ${entityName}.
Risikobewertung je Substanzklasse und Anwendungskontext.

JSON-Struktur:
{
  "overall_risk_level": "low|moderate|high|very_high",
  "risk_class": "peptide|small_molecule|steroid|hormone|glp1|sarm|stimulant|supplement",
  "cardiovascular_risk": "none|low|moderate|high",
  "blood_pressure_risk": "none|low|moderate|high",
  "lipid_risk": "none|low|moderate|high",
  "hematocrit_risk": "none|low|moderate|high",
  "liver_risk": "none|low|moderate|high",
  "kidney_risk": "none|low|moderate|high",
  "glucose_insulin_risk": "none|low|moderate|high",
  "fertility_risk": "none|low|moderate|high",
  "psychiatric_risk": "none|low|moderate|high",
  "female_specific_risk": "none|low|moderate|high",
  "red_flags": ["Red Flag 1", "Red Flag 2"],
  "required_bloodwork": ["Blutwert 1", "Blutwert 2"],
  "escalation_rules": ["Regel 1", "Regel 2"],
  "risk_notes": "Zusätzliche Risikohinweise"
}`,

    user_pattern: `${baseInstructions}
Erstelle ein user_pattern Modul für ${entityName}.
Typische Nutzerfragen, Anfängerfehler, Missverständnisse.

JSON-Struktur:
{
  "typical_user_questions": [
    {
      "question": "Typische Frage",
      "user_type": "beginner|intermediate|expert",
      "frequency": "sehr häufig|häufig|gelegentlich"
    }
  ],
  "beginner_misconceptions": [
    {
      "misconception": "Missverständnis",
      "reality": "Korrekte Information",
      "how_to_address": "Wie ansprechen"
    }
  ],
  "common_use_cases_reported": ["Use Case 1", "Use Case 2"],
  "user_segments": [
    {
      "segment": "Nutzersegment",
      "primary_interest": "Hauptinteresse",
      "typical_questions": ["Frage 1", "Frage 2"]
    }
  ]
}`,

    beginner_mistakes: `${baseInstructions}
Erstelle ein beginner_mistakes Modul für ${entityName}.
Häufige Fehler von Anfängern und wie man sie vermeidet.

JSON-Struktur:
{
  "mistakes": [
    {
      "mistake": "Fehler-Beschreibung",
      "consequence": "Mögliche Folge",
      "prevention": "Wie vermeiden",
      "severity": "minor|moderate|serious"
    }
  ],
  "knowledge_gaps": ["Wissenslücke 1", "Wissenslücke 2"],
  "recommended_prerequisites": ["Vorwissen 1", "Vorwissen 2"],
  "first_steps_guidance": "Empfohlene Vorgehensweise für Einsteiger (Research-Kontext)"
}`,

    comparison_logic: `${baseInstructions}
Erstelle ein comparison_logic Modul für ${entityName}.
Vergleich mit ähnlichen Compounds mit Entscheidungskriterien.

JSON-Struktur:
{
  "primary_comparisons": [
    {
      "vs_compound": "Vergleichs-Compound",
      "similarity": "Ähnlichkeit",
      "key_differences": ["Unterschied 1", "Unterschied 2"],
      "prefer_this_when": "Wann ${entityName} bevorzugen",
      "prefer_alternative_when": "Wann Alternative bevorzugen",
      "evidence_comparison": "Evidenzlage im Vergleich"
    }
  ],
  "unique_advantages": ["Vorteil 1", "Vorteil 2"],
  "limitations_vs_alternatives": ["Limitation 1", "Limitation 2"],
  "decision_matrix": [
    {
      "criterion": "Entscheidungskriterium",
      "this_compound": "Bewertung",
      "alternatives": "Vergleich"
    }
  ]
}`,

    escalation_rule: `${baseInstructions}
Erstelle escalation_rules für ${entityName}.
Wann muss der Agent sofort aus Beratung/Sales raus und auf Safety/Support/Arzt wechseln?

JSON-Struktur:
{
  "immediate_escalation_triggers": [
    {
      "trigger": "Auslöser",
      "reason": "Warum sofortige Eskalation",
      "action": "Welche Aktion",
      "message_template": "Empfohlene Nachricht an Nutzer"
    }
  ],
  "safety_keywords": ["Keyword 1", "Keyword 2"],
  "medical_emergency_indicators": ["Indikator 1", "Indikator 2"],
  "physician_referral_required_when": ["Situation 1", "Situation 2"],
  "support_escalation_when": ["Situation 1", "Situation 2"],
  "never_answer_topics": ["Thema 1", "Thema 2"],
  "compliance_boundary": "Wo endet die Beratungskompetenz des Agenten"
}`,
  };

  return prompts[moduleType] || `${baseInstructions}Erstelle ein ${moduleType} Modul für ${entityName} als strukturiertes JSON.`;
}

// ─── GET /api/entity/:slug/modules — alle agent_available Module ──────────────

router.get("/:slug/modules", async (req, res) => {
  try {
    const { slug } = req.params;
    const { agent, type } = req.query;

    // Entity-ID aus Slug auflösen
    const entityRows = await db.execute(sql`
      SELECT id, canonical_name FROM entities WHERE slug = ${slug} LIMIT 1
    `);

    const entityArr = entityRows as any as any[];
    if (!entityArr.length) {
      return res.status(404).json({ error: "Entity not found", slug });
    }

    const entity = entityArr[0] as { id: string; canonical_name: string };

    // Module laden — nur agent_available
    let query = sql`
      SELECT * FROM knowledge_modules
      WHERE entity_id = ${entity.id}
        AND review_status = 'agent_available'
    `;

    if (type) {
      query = sql`
        SELECT * FROM knowledge_modules
        WHERE entity_id = ${entity.id}
          AND review_status = 'agent_available'
          AND module_type = ${type as string}
      `;
    }

    const modulesResult = await db.execute(query);
    let modules = modulesResult as any as any[];

    // Agenten-Filter: nur Module die für diesen Agenten erlaubt sind
    if (agent && AGENT_MODULE_MAP[agent as string]) {
      const allowedTypes = AGENT_MODULE_MAP[agent as string];
      modules = modules.filter((m: any) => allowedTypes.includes(m.module_type));
    }

    // Strukturierte Ausgabe
    const modulesByType: Record<string, any> = {};
    for (const mod of modules) {
      const m = mod as any;
      modulesByType[m.module_type] = {
        id: m.id,
        moduleType: m.module_type,
        content: m.content,
        evidenceLevel: m.evidence_level,
        confidenceScore: m.confidence_score,
        lastReviewed: m.last_reviewed,
        reviewStatus: m.review_status,
        allowedAgents: m.allowed_agents,
        isHighRisk: m.is_high_risk,
        riskClass: m.risk_class,
        version: m.version,
        updatedAt: m.updated_at,
      };
    }

    return res.json({
      entitySlug: slug,
      entityName: entity.canonical_name,
      modulesCount: modules.length,
      availableTypes: Object.keys(modulesByType),
      modules: modulesByType,
      meta: {
        agentFilter: agent || null,
        typeFilter: type || null,
        contractNote: "Knowledge OS liefert strukturierte Daten. Agenten entscheiden selbst über Kommunikation.",
      },
    });
  } catch (err) {
    console.error("[modules] GET /:slug/modules error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/entity/:slug/modules/:type — einzelner Modul-Typ ───────────────

router.get("/:slug/modules/:type", async (req, res) => {
  try {
    const { slug, type } = req.params;

    if (!VALID_MODULE_TYPES.includes(type as ModuleType)) {
      return res.status(400).json({
        error: "Invalid module type",
        validTypes: VALID_MODULE_TYPES,
      });
    }

    const result = await db.execute(sql`
      SELECT km.* FROM knowledge_modules km
      JOIN entities e ON e.id = km.entity_id
      WHERE e.slug = ${slug}
        AND km.module_type = ${type}
        AND km.review_status = 'agent_available'
      ORDER BY km.version DESC
      LIMIT 1
    `);

    const resultArr = result as any as any[];
    if (!resultArr.length) {
      return res.status(404).json({
        error: "Module not found or not yet approved",
        slug,
        moduleType: type,
        hint: "Module may exist in draft/review status. Use admin endpoint to check.",
      });
    }

    const mod = resultArr[0] as any;
    return res.json({
      entitySlug: slug,
      moduleType: mod.module_type,
      content: mod.content,
      evidenceLevel: mod.evidence_level,
      confidenceScore: mod.confidence_score,
      lastReviewed: mod.last_reviewed,
      reviewStatus: mod.review_status,
      isHighRisk: mod.is_high_risk,
      riskClass: mod.risk_class,
      version: mod.version,
      updatedAt: mod.updated_at,
    });
  } catch (err) {
    console.error("[modules] GET /:slug/modules/:type error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/entity/:slug/modules/generate — LLM-Generierung (Admin) ───────

router.post("/:slug/modules/generate", requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;
    const { moduleTypes, autoApprove = false } = req.body as {
      moduleTypes?: ModuleType[];
      autoApprove?: boolean;
    };

    // Entity laden
    const entityRows = await db.execute(sql`
      SELECT id, canonical_name, type, short_description FROM entities
      WHERE slug = ${slug} LIMIT 1
    `);

    const entityRowsArr = entityRows as any as any[];
    if (!entityRowsArr.length) {
      return res.status(404).json({ error: "Entity not found", slug });
    }

    const entity = entityRowsArr[0] as any;

    // Kontext für LLM aus bestehenden Blocks laden
    const blocksResult = await db.execute(sql`
      SELECT block_type, body FROM content_blocks
      WHERE entity_id = ${entity.id}
        AND block_type IN ('definition', 'mechanism', 'research_summary', 'clinical_evidence')
      ORDER BY sort_order
      LIMIT 5
    `);

    const entityContext = (blocksResult as any as any[])
      .map((b: any) => `[${b.block_type}]: ${(b.body as string).substring(0, 500)}`)
      .join("\n\n") || entity.short_description || "Kein Kontext verfügbar";

    const typesToGenerate = moduleTypes || [...VALID_MODULE_TYPES];
    const results: Array<{ moduleType: string; status: string; id?: string; error?: string }> = [];

    for (const moduleType of typesToGenerate) {
      if (!VALID_MODULE_TYPES.includes(moduleType)) {
        results.push({ moduleType, status: "skipped", error: "Invalid module type" });
        continue;
      }

      try {
        const prompt = buildModulePrompt(moduleType, entity.canonical_name, entityContext);

        const llmResponse = await invokeLLM([
          { role: "system", content: "Du bist ein wissenschaftlicher Assistent. Antworte ausschließlich mit validem JSON." },
          { role: "user", content: prompt },
        ]);

        const rawContent = llmResponse.content || "{}";

        // JSON parsen
        let parsedContent: any;
        try {
          // JSON aus Markdown-Codeblock extrahieren falls nötig
          const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
          parsedContent = JSON.parse(jsonMatch ? jsonMatch[1] : rawContent);
        } catch {
          parsedContent = { raw: rawContent, parse_error: true };
        }

        // Risiko-Klasse bestimmen
        const isHighRisk = HIGH_RISK_CLASSES.some(rc =>
          entity.canonical_name.toLowerCase().includes(rc) ||
          entity.type === "steroid" || entity.type === "hormone"
        );

        // In DB speichern
        const moduleId = randomUUID();
        const reviewStatus = autoApprove ? "agent_available" : "review";

        await db.execute(sql`
          INSERT INTO knowledge_modules (
            id, entity_id, entity_slug, module_type, content,
            evidence_level, confidence_score, review_status,
            is_high_risk, generated_by_ai, version, created_at, updated_at
          ) VALUES (
            ${moduleId}, ${entity.id}, ${slug}, ${moduleType},
            ${JSON.stringify(parsedContent)}::jsonb,
            'preclinical', 0.6, ${reviewStatus},
            ${isHighRisk}, true, 1, NOW(), NOW()
          )
          ON CONFLICT DO NOTHING
        `);

        results.push({ moduleType, status: "generated", id: moduleId });
      } catch (err: any) {
        results.push({ moduleType, status: "error", error: err.message });
      }
    }

    return res.json({
      entitySlug: slug,
      entityName: entity.canonical_name,
      generated: results.filter(r => r.status === "generated").length,
      errors: results.filter(r => r.status === "error").length,
      results,
      nextStep: autoApprove
        ? "Module sind sofort verfügbar (agent_available)"
        : "Module sind im Review-Status. Approve via POST /api/entity/:slug/modules/:id/approve",
    });
  } catch (err) {
    console.error("[modules] POST /:slug/modules/generate error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/entity/:slug/modules/:id/approve — Modul freigeben (Admin) ────

router.post("/:slug/modules/:id/approve", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(sql`
      UPDATE knowledge_modules
      SET review_status = 'agent_available',
          approved_at = NOW(),
          updated_at = NOW()
      WHERE id = ${id}
    `);

    return res.json({ success: true, id, reviewStatus: "agent_available" });
  } catch (err) {
    console.error("[modules] POST approve error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/modules/admin/pending — alle pending Module (Admin) ─────────────

router.get("/admin/pending", requireAdmin, async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT km.id, km.entity_slug, km.module_type, km.review_status,
             km.confidence_score, km.is_high_risk, km.created_at
      FROM knowledge_modules km
      WHERE km.review_status IN ('draft', 'review')
      ORDER BY km.is_high_risk DESC, km.created_at DESC
      LIMIT 100
    `);

    const pendingArr = result as any as any[];
    return res.json({
      count: pendingArr.length,
      modules: pendingArr,
    });
  } catch (err) {
    console.error("[modules] GET admin/pending error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
